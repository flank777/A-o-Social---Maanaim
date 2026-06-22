/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  DoaVida — js/form.js                                               ║
  ║  Lógica completa do formulário de doação em 3 passos                ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║  DEPENDE DE (carregado antes em form.html):                        ║
  ║    js/api.js  → DoaVidaAPI.addDoacao(), getWaConfig(), getAlimentos()║
  ║    js/app.js  → showToast(), escHtml(), gerarId(), mascaraTelefone() ║
  ║                                                                      ║
  ║  RESPONSABILIDADES:                                                  ║
  ║    1. Carregar alimentos (passo 1): doaRenderGrid()                 ║
  ║    2. Controlar o carrinho: doaCP(), doaCM(), doaAtualizarCarrinho()║
  ║    3. Navegar entre passos: doaIrPasso()                            ║
  ║    4. Validar campos (passo 2): doaValNome(), doaValTel()           ║
  ║    5. Submeter a doação: doaSubmit()                                ║
  ║    6. Gerar protocolo único: gerarProtocolo()                       ║
  ║    7. Construir o recibo (passo 3): doaBuildRecibo()                ║
  ║    8. Reiniciar o formulário: reiniciarForm()                       ║
  ║                                                                      ║
  ║  PARA ALTERAR:                                                      ║
  ║    Validação de campos → funções doaValNome() e doaValTel()         ║
  ║    Dados salvos → objeto doacao em doaSubmit()                      ║
  ║    Texto do recibo → função doaBuildRecibo()                        ║
  ║    Alimentos padrão → função alimentosPadrao()                      ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/

/* ══════════════════════════════════════════════════════════════════════
   UTILITÁRIO — FORMATAÇÃO DE UNIDADES (kg, g, L, mL)

   Converte valores decimais para a unidade mais legível:
   0.125 kg → "125 g" | 1.5 kg → "1,5 kg" | 0.5 L → "500 mL" ══════════════════════════════════════════════════════════════════════ */
function fmtUnidade(valor, unidade) {
  var v = parseFloat(valor) || 0;
  var u = (unidade || 'kg').trim().toLowerCase();

  function numBR(n) {
    return n % 1 === 0
      ? String(Math.round(n))
      : n.toFixed(1).replace('.', ',');
  }

  if (u === 'l' || u === 'litro' || u === 'litros') {
    if (v < 1) return Math.round(v * 1000) + ' mL';
    return numBR(v) + ' L';
  }
  /* kg / g e qualquer outra unidade de massa */
  if (v > 0 && v < 1) return Math.round(v * 1000) + ' g';
  return numBR(v) + ' kg';
}

/* Formata o total geral do carrinho (sempre em kg ou g) */
function fmtTotal(totalKg) {
  if (totalKg > 0 && totalKg < 1) return Math.round(totalKg * 1000) + ' g';
  return (totalKg > 0 ? totalKg.toFixed(1) : '0').replace('.', ',') + ' kg';
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 1 — ESTADO DO FORMULÁRIO
   Variáveis que guardam o estado enquanto o usuário preenche
   ══════════════════════════════════════════════════════════════════════ */

/*
  FormState = objeto com o estado atual do formulário.
  Usando um objeto centralizado é mais fácil de resetar tudo de uma vez.
*/
var FormState = {
  qtds:          {},    /* {id: quantidade} — quantidades por alimento */
  entrega:       null,  /* 'igreja' ou 'retirada' — forma de entrega */
  enviando:      false, /* true = está processando, evita duplo envio */
  passoAtual:    1,     /* 1, 2 ou 3 */
  /*
    true quando o doador escolheu "Cesta Completa". As quantidades em
    `qtds` continuam sendo preenchidas (1 unidade de cada alimento) para
    que o cálculo de peso total e a baixa de estoque por alimento
    continuem corretos — mas a grade/carrinho exibem só 1 item
    ("Cesta básica completa"), nunca a lista de alimentos marcados.
    Ver atualizarCard(), doaItensExibicao() e doaSelecionarCestaCompleta().
  */
  cestaCompleta: false,
};

/* Mapa de texto para cada forma de entrega */
var ENTREGA_LABELS = {
  'igreja':   'Entrega na Igreja',
  'retirada': 'Buscar em Casa',
};

/* Cache local dos alimentos carregados do Supabase (preenchido por doaRenderGrid) */
var _alimentosCache = [];

/*
  Envolve uma Promise com um timeout — se não resolver em `ms` ms, resolve com `fallback`.
  Evita que o await em doaRenderGrid fique preso para sempre quando o Supabase não responde.
*/
function comTimeout(promise, ms, fallback) {
  return new Promise(function (resolve) {
    var done = false;
    var id = setTimeout(function () {
      if (!done) { done = true; resolve(fallback !== undefined ? fallback : []); }
    }, ms);
    promise.then(function (v) {
      if (!done) { done = true; clearTimeout(id); resolve(v); }
    }).catch(function () {
      if (!done) { done = true; clearTimeout(id); resolve(fallback !== undefined ? fallback : []); }
    });
  });
}


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 2 — INICIALIZAÇÃO
   Roda quando o DOM está pronto (DOMContentLoaded em app.js já rodou)
   ══════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  /* Só executa se estivermos em form.html */
  if (!document.getElementById('form-modal')) return;

  /* Carrega e renderiza os alimentos no passo 1 */
  doaRenderGrid();

  /* Conecta os botões de navegação do formulário */
  conectarEventos();

  /* Atualiza dados quando o usuário volta para a aba (Page Visibility API)
     Captura metas atingidas ou estoques alterados pelo admin em tempo real */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && FormState.passoAtual === 1) {
      doaRenderGrid();
    }
  });

  /* Refresh periódico de 60s como fallback (caso a aba nunca seja ocultada) */
  setInterval(function () {
    if (FormState.passoAtual === 1) {
      doaRenderGrid();
    }
  }, 60000);
});


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 3 — CONECTAR EVENTOS
   Liga todos os botões e inputs às suas funções
   ══════════════════════════════════════════════════════════════════════ */

function conectarEventos() {
  /* ── Passo 1: botão Continuar ── */
  var btnNext1 = document.getElementById('btn-next-1');
  if (btnNext1) {
    btnNext1.addEventListener('click', function () {
      /* Verifica se há pelo menos 1 item no carrinho */
      if (carrinhoVazio()) {
        showToast(' Selecione ao menos 1 alimento!', 'warning');
        return;
      }
      /* Preenche o resumo do passo 2 e avança */
      preencherResumo();
      doaIrPasso(2);
    });
  }

  /* ── Passo 2: botão Voltar (vai para passo 1) ── */
  var btnBack2 = document.getElementById('btn-back-2');
  if (btnBack2) {
    btnBack2.addEventListener('click', function () { doaIrPasso(1); });
  }

  /* ── Passo 2: botão Confirmar Doação ── */
  var btnSubmit = document.getElementById('btn-submit');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', doaSubmit);
  }

  /* ── Botão "← Voltar" do topo ── */
  /* Comportamento muda dependendo do passo */
  var formBackBtn = document.getElementById('form-back-btn');
  if (formBackBtn) {
    formBackBtn.addEventListener('click', voltarOuSair);
  }

  /* ── Passo 3: botões do recibo ── */
  var btnFechar = document.getElementById('btn-fechar');
  if (btnFechar) {
    btnFechar.addEventListener('click', function () {
      window.location.href = 'index.html';
    });
  }
  var btnNova = document.getElementById('btn-nova-doacao');
  if (btnNova) {
    btnNova.addEventListener('click', reiniciarForm);
  }

  /* ── Cards de entrega (Igreja / Buscar em casa) ── */
  document.querySelectorAll('.delivery-card').forEach(function (card) {
    card.addEventListener('click', function () { selecionarEntrega(this); });
    /* Acessibilidade: Enter e Espaço também selecionam */
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selecionarEntrega(this);
      }
    });
  });

  /* ── Máscara de telefone (formata enquanto digita) ── */
  var telInput = document.getElementById('inp-tel');
  if (telInput) {
    telInput.addEventListener('input', function () {
      /* Usa mascaraTelefone() de app.js se disponível */
      if (window.mascaraTelefone) {
        mascaraTelefone(this);
      } else {
        /* Fallback inline */
        var v = this.value.replace(/\D/g, '');
        var r = '';
        if (v.length > 0)  r = '(' + v.substring(0, 2);
        if (v.length >= 2) r += ') ';
        if (v.length <= 10) {
          if (v.length > 2) r += v.substring(2, 6);
          if (v.length > 6) r += '-' + v.substring(6, 10);
        } else {
          if (v.length > 2) r += v.substring(2, 7);
          if (v.length > 7) r += '-' + v.substring(7, 11);
        }
        this.value = r;
      }
      /* Valida em tempo real quando já tem dígitos suficientes */
      var digits = this.value.replace(/\D/g,'').length;
      if (digits >= 10) {
        var res = doaValTel();
        setFieldState('field-tel', 'msg-tel', res.ok ? 'ok' : 'err', res.msg);
      } else {
        setFieldState('field-tel', 'msg-tel', '', '');
      }
    });
    /* Valida ao sair do campo */
    telInput.addEventListener('blur', function () {
      if (this.value.trim()) {
        var res = doaValTel();
        setFieldState('field-tel', 'msg-tel', res.ok ? 'ok' : 'err', res.msg);
      }
    });
  }

  /* ── Validação do nome em tempo real ── */
  var nomeInput = document.getElementById('inp-nome');
  if (nomeInput) {
    nomeInput.addEventListener('input', function () {
      if (this.value.trim().length >= 3) {
        var res = doaValNome();
        setFieldState('field-nome', 'msg-nome', res.ok ? 'ok' : 'err', res.msg);
      }
    });
    nomeInput.addEventListener('blur', function () {
      if (this.value.trim()) {
        var res = doaValNome();
        setFieldState('field-nome', 'msg-nome', res.ok ? 'ok' : 'err', res.msg);
      }
    });
  }

  /* ── Contador de caracteres do textarea de oração ── */
  var prayerInput = document.getElementById('inp-prayer');
  var charCount   = document.getElementById('char-count');
  if (prayerInput && charCount) {
    prayerInput.addEventListener('input', function () {
      var len = this.value.length;
      var max = parseInt(this.getAttribute('maxlength')) || 400;
      charCount.textContent = len + '/' + max;
      charCount.className = 'char-count' +
        (len >= max ? ' full' : len >= max * 0.8 ? ' near' : '');
    });
  }

  /* ── Smart Cart: barra fixa e gaveta ── */

  /* Clique no resumo da barra abre a gaveta */
  var barResumo = document.getElementById('cart-bar-resumo');
  if (barResumo) {
    barResumo.addEventListener('click', function () {
      abrirGaveta();
    });
  }

  /* Fechar gaveta pelo × do cabeçalho */
  var drawerClose = document.getElementById('cart-drawer-close');
  if (drawerClose) {
    drawerClose.addEventListener('click', fecharGaveta);
  }

  /* Fechar gaveta clicando no overlay */
  var overlay = document.getElementById('cart-overlay');
  if (overlay) {
    overlay.addEventListener('click', fecharGaveta);
  }

  /* Limpar carrinho pelo botão da gaveta */
  var drawerLimpar = document.getElementById('cart-drawer-limpar');
  if (drawerLimpar) {
    drawerLimpar.addEventListener('click', function () {
      FormState.qtds = {};
      FormState.cestaCompleta = false;
      doaRenderGrid();
      fecharGaveta();
      atualizarBotaoContinuar();
    });
  }

  /* "Adicionar mais" fecha a gaveta (volta para os cards) */
  var drawerMais = document.getElementById('cart-drawer-mais');
  if (drawerMais) {
    drawerMais.addEventListener('click', fecharGaveta);
  }

  /* Botão Continuar dentro da gaveta */
  var drawerContinuar = document.getElementById('cart-drawer-continuar');
  if (drawerContinuar) {
    drawerContinuar.addEventListener('click', function () {
      if (carrinhoVazio()) {
        showToast(' Selecione ao menos 1 alimento!', 'warning');
        return;
      }
      fecharGaveta();
      preencherResumo();
      doaIrPasso(2);
    });
  }

  /* Botão Continuar na barra fixa do mobile */
  var barContinuar = document.getElementById('cart-bar-continuar');
  if (barContinuar) {
    barContinuar.addEventListener('click', function () {
      if (carrinhoVazio()) {
        showToast(' Selecione ao menos 1 alimento!', 'warning');
        return;
      }
      preencherResumo();
      doaIrPasso(2);
    });
  }

  /* ── Busca de alimentos (novo campo na sidebar esquerda) ── */
  var searchInput = document.getElementById('doa-search');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var q = this.value.toLowerCase().trim();
      document.querySelectorAll('.fcard').forEach(function (card) {
        var name = (card.querySelector('.fcard-name') || {}).textContent || '';
        card.style.display = (!q || name.toLowerCase().includes(q)) ? '' : 'none';
      });
    });
  }
}


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 4 — PASSO 1: GRADE DE ALIMENTOS
   ══════════════════════════════════════════════════════════════════════ */

/*
  Renderiza os cards de alimentos na grade do passo 1.
  Chamada na inicialização e ao reiniciar o formulário.
*/
async function doaRenderGrid() {
  var grid = document.getElementById('foods-grid');
  if (!grid) return;

  /* Carrega alimentos e modelo da cesta em paralelo.
     comTimeout(5000) garante que um Supabase travado não congele a tela —
     depois de 5s cai no fallback alimentosPadrao() via alimentos.length === 0 abaixo. */
  var resultados = await Promise.all([
    comTimeout(DoaVidaSync.getAlimentos(), 15000),
    comTimeout(DoaVidaSync.getModeloCestaItens(), 15000, []),
  ]);

  var alimentos   = resultados[0];
  var modeloCesta = resultados[1] || [];

  /* Se Firestore retornou vazio, tenta 1× mais após 3 segundos */
  if ((!alimentos || alimentos.length === 0) && window._doaVidaFirestoreOk) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:32px 0;color:var(--text2)">' +
      '<div style="font-size:1.5rem;margin-bottom:8px"></div>' +
      '<p style="font-size:.9rem">Carregando alimentos...</p></div>';
    await new Promise(function (r) { setTimeout(r, 3000); });
    var retry = await comTimeout(DoaVidaSync.getAlimentos(), 10000);
    if (retry && retry.length > 0) alimentos = retry;
  }

  if (!alimentos || alimentos.length === 0) {
    alimentos = alimentosPadrao();
  }

  /*
    Mescla o peso_unitario_kg do modelo da cesta em cada alimento.
    Isso garante que a página de doação use o mesmo peso que o sistema
    de cestas usa para calcular o estoque — mantendo tudo sincronizado.
  */
  alimentos = alimentos.map(function (food) {
    var cestaItem = modeloCesta.find(function (m) {
      return m.alimento_id === food.id;
    });
    if (cestaItem && cestaItem.peso_unitario_kg > 0) {
      return Object.assign({}, food, { peso: cestaItem.peso_unitario_kg });
    }
    return food;
  });

  /* Guarda no cache para uso síncrono em doaItens() e doaAtualizarCarrinho() */
  _alimentosCache = alimentos;

  /* Limpa a grade */
  grid.innerHTML = '';

  /* ── Card especial: Cesta Completa ── */
  var cestaCard = document.createElement('div');
  cestaCard.className = 'fcard fcard--cesta';
  cestaCard.id = 'fcard-cesta-completa';
  var cestaAtiva = !!FormState.cestaCompleta;
  var cestaImgSalva = localStorage.getItem('doavida_cesta_img') || 'img/cesta-basica.jpg';
  cestaCard.innerHTML =
    '<div class="fcard-img-wrap">' +
      '<img class="fcard-img" src="' + cestaImgSalva + '" alt="Cesta Completa" ' +
        'onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">' +
      '<div class="fcard-emoji-fb" style="display:none;"></div>' +
    '</div>' +
    '<div class="fcard-body">' +
      '<p class="fcard-name">Cesta Completa</p>' +
      '<p class="fcard-price-txt">1 unidade de cada item disponível</p>' +
      '<div class="fcard-footer">' +
        '<button class="fcard-order-btn" id="btn-cesta-completa" type="button" ' +
          'onclick="doaSelecionarCestaCompleta()" ' +
          'style="background:' + (cestaAtiva ? '#e8c96a;color:#1a1a1a' : '#1a1a1a') + '">' +
          (cestaAtiva ? ' Cesta Selecionada' : 'Selecionar Tudo') +
        '</button>' +
      '</div>' +
    '</div>';
  grid.appendChild(cestaCard);

  /* Cria um card para cada alimento */
  alimentos.forEach(function (food) {
    var q       = FormState.qtds[food.id] || 0;
    var kg      = parseFloat(food.kg)   || 0;
    var meta    = parseFloat(food.goal) || 0;
    var metaBat = meta > 0 && kg >= meta;
    var pct     = meta > 0 ? Math.min(100, Math.round((kg / meta) * 100)) : 0;

    /* ── Food Order Card — novo estilo ── */
    var foodId   = window.escHtml ? escHtml(food.id) : food.id;
    var foodName = window.escHtml ? escHtml(food.name) : food.name;
    var unidade  = food.unidade || 'kg';
    var pesoTxt  = fmtUnidade(food.peso || 1, unidade);
    var emoji    = food.emoji || '';

    /* Imagem ou emoji fallback (posicionados absolutamente dentro do padding-top wrap) */
    var imgHtml = food.img
      ? '<img class="fcard-img" src="' + escHtml(food.img) + '" alt="' + foodName + '" loading="lazy" ' +
          'onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">' +
        '<div class="fcard-emoji-fb" style="display:none;">' + emoji + '</div>' : '<div class="fcard-emoji-fb">' + emoji + '</div>';

    /* Controles de quantidade (contador inline) */
    var ctrlHtml = metaBat ? '' :
      '<div class="fcard-ctrl" id="fcard-ctrl-' + foodId + '" style="' + (q > 0 ? '' : 'display:none') + '">' +
        '<button class="fcard-btn-minus" type="button" onclick="doaCM(\'' + foodId + '\')" aria-label="Diminuir">−</button>' +
        '<span class="fcard-qty-num" id="qval-' + foodId + '">' + q + '</span>' +
        '<button class="fcard-btn-plus" type="button" onclick="doaCP(\'' + foodId + '\')" aria-label="Aumentar">+</button>' +
      '</div>';

    /* Botão "Adicionar" inicial (quando q=0) */
    var addBtnHtml = metaBat ? '' :
      '<button class="fcard-order-btn" id="qbtn-plus-' + foodId + '" type="button" ' +
        'onclick="doaCP(\'' + foodId + '\')" ' +
        (q > 0 ? 'style="display:none" ' : '') +
        'aria-label="Adicionar ' + foodName + '">Adicionar</button>';

    var card = document.createElement('div');
    card.className = 'fcard' + (q > 0 ? ' fcard--ativo' : '') + (metaBat ? ' fcard--meta' : '');
    card.id        = 'fcard-' + food.id;

    card.innerHTML =
      /* Área da imagem (square-ish via padding-top) */
      '<div class="fcard-img-wrap">' +
        imgHtml +
        '<span class="fcard-avail-badge">' + pesoTxt + '</span>' +
        (pct > 0 && !metaBat ? '<span class="fcard-pct-badge">' + pct + '%</span>' : '') +
      '</div>' +
      /* Faixa meta atingida */
      (metaBat ? '<div class="fcard-meta-strip">&#10003; Meta atingida</div>' : '') +
      /* Corpo do card */
      '<div class="fcard-body">' +
        '<p class="fcard-name">' + foodName + '</p>' +
        '<p class="fcard-price-txt">' + (metaBat ? '&#9940; Indisponível' : pesoTxt + ' por unidade') + '</p>' +
        '<div class="fcard-footer">' +
          '<span class="fcard-qty-display" id="qlabel-' + foodId + '">' + (q > 0 ? q + ' un.' : '') + '</span>' +
          (metaBat ? '' : ctrlHtml + addBtnHtml) +
        '</div>' +
      '</div>';

    grid.appendChild(card);
  });

  /* Atualiza o botão Continuar */
  atualizarBotaoContinuar();
}

/*
  Retorna true se o alimento com o dado id atingiu a meta (bloqueado).
  @param {string} id - ID do alimento
*/
function _alimentoBloqueado(id) {
  var food = _alimentosCache.find(function (f) { return f.id === id; });
  if (!food) return false;
  var kg   = parseFloat(food.kg)   || 0;
  var meta = parseFloat(food.goal) || 0;
  return meta > 0 && kg >= meta;
}

/*
  Incrementa a quantidade de um alimento em +1.
  Chamada pelo botão "+" de cada card.
  @param {string} id - ID do alimento
*/
function doaCP(id) {
  if (_alimentoBloqueado(id)) {
    showToast(' Este alimento já atingiu a meta de arrecadação.', 'warning');
    return;
  }
  /* Escolher um item manualmente sai do modo "Cesta Completa" */
  if (FormState.cestaCompleta) {
    var alimentosAtuais = _alimentosCache.length ? _alimentosCache : alimentosPadrao();
    FormState.cestaCompleta = false;
    alimentosAtuais.forEach(function (f) { FormState.qtds[f.id] = 0; });
    var btnCesta = document.getElementById('btn-cesta-completa');
    if (btnCesta) { btnCesta.textContent = 'Selecionar Tudo'; btnCesta.style.background = '#1a1a1a'; btnCesta.style.color = '#fff'; }
    doaRenderGrid();
    showToast(' Cesta completa removida — escolha os itens manualmente.', 'info');
  }
  FormState.qtds[id] = (FormState.qtds[id] || 0) + 1;
  atualizarCard(id);
  doaAtualizarCarrinho();
  atualizarBotaoContinuar();
}

/*
  Decrementa a quantidade de um alimento em -1 (mínimo 0).
  Chamada pelo botão "−" de cada card.
  @param {string} id - ID do alimento
*/
function doaCM(id) {
  FormState.qtds[id] = Math.max(0, (FormState.qtds[id] || 0) - 1);
  atualizarCard(id);
  doaAtualizarCarrinho();
  atualizarBotaoContinuar();
}

/*
  Atualiza o visual de um card específico sem re-renderizar toda a grade.
  @param {string} id - ID do alimento
*/
function atualizarCard(id) {
  var bloqueado = _alimentoBloqueado(id);
  var card      = document.getElementById('fcard-' + id);
  if (!card) { doaRenderGrid(); return; }

  /* Garante/remove a faixa "Meta atingida" dinamicamente */
  var stripExistente = card.querySelector('.fcard-meta-strip');
  if (bloqueado && !stripExistente) {
    /* Injeta a faixa logo após o img-wrap */
    var imgWrap = card.querySelector('.fcard-img-wrap');
    var strip   = document.createElement('div');
    strip.className   = 'fcard-meta-strip';
    strip.textContent = ' Meta atingida';
    if (imgWrap && imgWrap.nextSibling) {
      card.insertBefore(strip, imgWrap.nextSibling);
    } else {
      card.appendChild(strip);
    }
    /* Atualiza o texto de unidade para "Não disponível" */
    var unitEl = card.querySelector('.fcard-unit');
    if (unitEl) unitEl.textContent = ' Não disponível';
  } else if (!bloqueado && stripExistente) {
    stripExistente.remove();
  }

  /* Se bloqueado: zera qty e esconde controles */
  if (bloqueado) {
    FormState.qtds[id] = 0;
    card.classList.remove('fcard--ativo');
    card.classList.add('fcard--meta');
    var ctrl   = document.getElementById('fcard-ctrl-' + id);
    var addBtn = document.getElementById('qbtn-plus-' + id);
    if (ctrl)   ctrl.style.display   = 'none';
    if (addBtn) addBtn.style.display = 'none';
    return;
  }

  /*
    Enquanto a Cesta Completa estiver ativa, os cards individuais ficam
    visualmente neutros (não "selecionados"), mesmo que FormState.qtds
    tenha 1 unidade de cada — esse valor é usado só para calcular o peso
    total e dar baixa no estoque por alimento, nunca para a exibição.
  */
  var q = FormState.cestaCompleta ? 0 : (FormState.qtds[id] || 0);
  card.classList.toggle('fcard--ativo', q > 0);
  card.classList.remove('fcard--meta');

  /* Contador no ctrl */
  var qval = document.getElementById('qval-' + id);
  if (qval) qval.textContent = q;

  /* Label de quantidade no footer */
  var qlabel = document.getElementById('qlabel-' + id);
  if (qlabel) qlabel.textContent = q + ' un.';

  /* Ctrl e add-btn */
  var ctrl   = document.getElementById('fcard-ctrl-' + id);
  var addBtn = document.getElementById('qbtn-plus-' + id);
  if (ctrl)   ctrl.style.display   = q > 0 ? 'flex' : 'none';
  if (addBtn) addBtn.style.display = q > 0 ? 'none' : '';
}


/*
  Atualiza o carrinho lateral com os itens atuais.
  Chamada sempre que a quantidade de algum item muda.
*/
function doaAtualizarCarrinho() {
  var cartEl    = document.getElementById('cart-items');
  var emptyEl   = document.getElementById('cart-empty');
  var totalEl   = document.getElementById('cart-total');
  var countEl   = document.getElementById('cart-items-count');
  var itens     = doaItensExibicao();
  var totalKg   = kgTotal();

  /* Atualiza o total */
  if (totalEl) totalEl.textContent = fmtTotal(totalKg);

  /* Atualiza contador de itens */
  if (countEl) countEl.textContent = itens.length;

  /* Atualiza sempre a gaveta inteligente (independente do carrinho lateral) */
  _atualizarGaveta();
  /* Sincroniza o estado do botão "Cesta Completa" */
  _sincronizarBotaoCesta();
  /* Atualiza o display do passo 2 quando o usuário ajusta itens nele */
  if (FormState.passoAtual === 2) { _atualizarStep2Display(); }

  if (!cartEl) return;

  /* Remove linhas antigas (preserva o #cart-empty) */
  cartEl.querySelectorAll('.doa-cart-item').forEach(function (el) { el.remove(); });

  if (!itens.length) {
    if (emptyEl) emptyEl.style.display = '';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  /* Adiciona uma linha para cada item com novo estilo restaurante */
  itens.forEach(function (item) {
    var row = document.createElement('div');
    row.className = 'doa-cart-item';
    var imgPart = item.img
      ? '<img class="doa-cart-item-img" src="' + item.img + '" alt="' + item.nome +
        '" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">' +
        '<span class="doa-cart-item-img" style="display:none;align-items:center;justify-content:center;font-size:1.4rem;background:#f0f0f0;">' + (item.emoji || '') + '</span>' : '<span class="doa-cart-item-img" style="display:flex;align-items:center;justify-content:center;font-size:1.4rem;background:#f0f0f0;">' + (item.emoji || '') + '</span>';
    var ctrlPart = item.id === 'cesta-completa'
      ? '<div class="doa-cart-item-ctrl"><button class="doa-cart-item-btn" type="button" onclick="doaSelecionarCestaCompleta()" aria-label="Remover cesta completa" title="Remover">✕</button></div>'
      : '<div class="doa-cart-item-ctrl">' +
          '<button class="doa-cart-item-btn" type="button" onclick="doaCM(\'' + item.id + '\')" aria-label="Diminuir">−</button>' +
          '<span class="doa-cart-item-num">' + item.qty + '</span>' +
          '<button class="doa-cart-item-btn" type="button" onclick="doaCP(\'' + item.id + '\')" aria-label="Aumentar">+</button>' +
        '</div>';
    row.innerHTML =
      imgPart +
      '<div class="doa-cart-item-info">' +
        '<div class="doa-cart-item-name">' + item.nome + '</div>' +
        '<div class="doa-cart-item-qty">' + fmtUnidade(item.totalKg, item.unidade || 'kg') + '</div>' +
      '</div>' +
      ctrlPart;
    cartEl.insertBefore(row, emptyEl);
  });
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 4B — GAVETA (SACOLA) INTELIGENTE
   ══════════════════════════════════════════════════════════════════════ */

/*
  Abre a gaveta-sacola com animação.
*/
function abrirGaveta() {
  var drawer   = document.getElementById('cart-drawer');
  var overlay  = document.getElementById('cart-overlay');
  var chevron  = document.getElementById('cart-bar-chevron');
  _atualizarGaveta();
  if (drawer)  drawer.classList.add('open');
  if (overlay) overlay.classList.add('visible');
  if (chevron) chevron.style.transform = 'rotate(180deg)';
  document.body.style.overflow = 'hidden'; /* impede scroll por baixo */
}

/*
  Fecha a gaveta-sacola com animação.
*/
function fecharGaveta() {
  var drawer   = document.getElementById('cart-drawer');
  var overlay  = document.getElementById('cart-overlay');
  var chevron  = document.getElementById('cart-bar-chevron');
  if (drawer)  drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');
  if (chevron) chevron.style.transform = '';
  document.body.style.overflow = '';
}

/*
  Renderiza os itens dentro da gaveta.
  Chamada sempre que o carrinho muda E quando a gaveta abre.
*/
function _atualizarGaveta() {
  var itemsEl    = document.getElementById('cart-drawer-items');
  var vazioEl    = document.getElementById('cart-drawer-vazio');
  var totalEl    = document.getElementById('cart-drawer-total');
  var continuarEl = document.getElementById('cart-drawer-continuar');
  var barTotal   = document.getElementById('cart-bar-total');
  var barItens   = document.getElementById('cart-bar-itens');

  var itens   = doaItensExibicao();
  var totalKg = kgTotal();
  var vazio   = itens.length === 0;

  /* Totais na barra fixa */
  if (barTotal) barTotal.textContent = fmtTotal(totalKg);
  if (barItens) barItens.textContent = vazio
    ? 'Nenhum item' : itens.length + (itens.length === 1 ? ' item' : ' itens');

  /* Total no rodapé da gaveta */
  if (totalEl) totalEl.textContent = fmtTotal(totalKg);

  /* Botão continuar da gaveta */
  if (continuarEl) continuarEl.disabled = vazio;

  /* Botão continuar da barra fixa */
  var barContinuarEl = document.getElementById('cart-bar-continuar');
  if (barContinuarEl) barContinuarEl.disabled = vazio;

  if (!itemsEl) return;

  /* Limpa itens antigos */
  itemsEl.innerHTML = '';

  if (vazio) {
    if (vazioEl) vazioEl.style.display = 'block';
    return;
  }
  if (vazioEl) vazioEl.style.display = 'none';

  /* Renderiza cada item */
  itens.forEach(function (item) {
    var row = document.createElement('div');
    row.className = 'cart-drawer-item';

    var imgPart = item.img
      ? '<img class="cart-drawer-item-img" src="' + item.img + '" alt="' + item.nome +
        '" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">' +
        '<span class="cart-drawer-item-emoji" style="display:none;">' + (item.emoji || '') + '</span>' : '<span class="cart-drawer-item-emoji">' + (item.emoji || '') + '</span>';

    var ctrlPart = item.id === 'cesta-completa'
      ? '<div class="cart-drawer-item-ctrl"><button type="button" onclick="doaSelecionarCestaCompleta()" aria-label="Remover cesta completa" title="Remover">✕</button></div>'
      : '<div class="cart-drawer-item-ctrl">' +
          '<button type="button" onclick="doaCM(\'' + item.id + '\')">−</button>' +
          '<span id="gdraw-qty-' + item.id + '">' + item.qty + '</span>' +
          '<button type="button" onclick="doaCP(\'' + item.id + '\')">+</button>' +
        '</div>';
    row.innerHTML =
      imgPart +
      '<span class="cart-drawer-item-nome">' +
        item.nome +
        '<small style="display:block;font-weight:400;color:var(--text2);margin-top:2px;">' +
          fmtUnidade(item.totalKg, item.unidade || 'kg') +
        '</small>' +
      '</span>' +
      ctrlPart;

    itemsEl.appendChild(row);
  });
}

/* Expõe funções de gaveta para uso inline */
window.abrirGaveta  = abrirGaveta;
window.fecharGaveta = fecharGaveta;

/*
  Habilita ou desabilita o botão "Continuar" do passo 1.
  Só habilita se o carrinho não estiver vazio.
*/
function atualizarBotaoContinuar() {
  var vazio   = carrinhoVazio();
  var itens   = doaItensExibicao();
  var totalKg = kgTotal();

  /* Botão dentro do modal (desktop sem etapa1) */
  var btn = document.getElementById('btn-next-1');
  if (btn) btn.disabled = vazio;

  /* Barra fixa de rodapé (mobile/tablet no passo 1) */
  var barBtn   = document.getElementById('cart-bar-btn');
  var barTotal = document.getElementById('cart-bar-total');
  var barItens = document.getElementById('cart-bar-itens');
  if (barBtn)   barBtn.disabled   = vazio;
  if (barTotal) barTotal.textContent = fmtTotal(totalKg);
  if (barItens) barItens.textContent = vazio
    ? 'Nenhum item' : itens.length + (itens.length === 1 ? ' item' : ' itens');

  /* Botão Continuar dentro do cart-panel (sidebar desktop) */
  var panelBtn = document.getElementById('cart-panel-continuar');
  if (panelBtn) panelBtn.disabled = vazio;
}

/* Retorna true se nenhum item válido (sem meta atingida) foi adicionado */
function carrinhoVazio() {
  return doaItens().length === 0;
}

/*
  Retorna os alimentos com quantidade > 0, enriquecidos com totalKg.
  @returns {Array} lista de itens [{id, nome, img, emoji, qty, totalKg}]
*/
function doaItens() {
  var alimentos = _alimentosCache.length ? _alimentosCache : alimentosPadrao();

  return alimentos
    .filter(function (f) {
      return (FormState.qtds[f.id] || 0) > 0 && !_alimentoBloqueado(f.id);
    })
    .map(function (f) {
      return {
        id:      f.id,
        nome:    f.name,
        img:     f.img  || '',
        emoji:   f.emoji || '',
        qty:     FormState.qtds[f.id],
        peso:    f.peso || 1,
        totalKg: (FormState.qtds[f.id] || 0) * (f.peso || 1),
      };
    });
}

/* Calcula o total em kg de todos os itens no carrinho */
function kgTotal() {
  return doaItens().reduce(function (s, i) { return s + i.totalKg; }, 0);
}


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 5 — NAVEGAÇÃO ENTRE PASSOS
   ══════════════════════════════════════════════════════════════════════ */

/*
  Navega para um passo específico (1, 2 ou 3).
  Atualiza: visibilidade dos passos, barra de progresso, botão voltar.
  @param {number} n - Número do passo (1, 2 ou 3)
*/
function doaIrPasso(n) {
  FormState.passoAtual = n;

  var main = document.getElementById('doa-main');
  var fs2  = document.getElementById('fs2');
  var fs3  = document.getElementById('fs3');

  if (main) main.style.display = 'none';
  if (fs2)  fs2.style.display  = 'none';
  if (fs3)  fs3.classList.remove('active');

  if (n === 1) {
    if (main) main.style.display = '';
    doaRenderGrid();
  } else if (n === 2) {
    if (fs2) {
      fs2.style.display = 'flex';
      _atualizarStep2Display();
    }
  } else if (n === 3) {
    if (fs3) fs3.classList.add('active');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Atualiza todo o display do passo 2 (itens, totais, barra inferior, impacto) */
function _atualizarStep2Display() {
  var itens   = doaItensExibicao();
  var totalKg = itens.reduce(function(s, i) { return s + i.totalKg; }, 0);
  var count   = itens.length;

  /* Lista de itens com controles +/- */
  var listEl = document.getElementById('s2-items-list');
  if (listEl) {
    listEl.innerHTML = itens.map(function(i) {
      var nome = window.escHtml ? escHtml(i.nome) : i.nome;
      var id   = i.id;
      var imgHtml = i.img
        ? '<img class="rs2-item-img" src="' + (window.escHtml ? escHtml(i.img) : i.img) + '" alt="' + nome +
          '" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">' +
          '<span class="rs2-item-emoji" style="display:none">' + (i.emoji || '') + '</span>'
        : '<span class="rs2-item-emoji">' + (i.emoji || '') + '</span>';
      var ctrlPart = id === 'cesta-completa'
        ? '<div class="rs2-item-ctrl"><button class="rs2-item-btn" type="button" onclick="doaSelecionarCestaCompleta()" aria-label="Remover cesta completa" title="Remover">✕</button></div>'
        : '<div class="rs2-item-ctrl">' +
            '<button class="rs2-item-btn" type="button" onclick="doaCM(\'' + id + '\')" aria-label="Diminuir">&#8722;</button>' +
            '<span class="rs2-item-num">' + i.qty + '</span>' +
            '<button class="rs2-item-btn" type="button" onclick="doaCP(\'' + id + '\')" aria-label="Aumentar">+</button>' +
          '</div>';
      return '<div class="rs2-item-row">' +
        imgHtml +
        '<div class="rs2-item-info">' +
          '<div class="rs2-item-name">' + nome + '</div>' +
          '<div class="rs2-item-unit">' + fmtUnidade(i.peso || 1, i.unidade || 'kg') + '</div>' +
        '</div>' +
        ctrlPart +
        '<span class="rs2-item-weight">' + fmtUnidade(i.totalKg, i.unidade || 'kg') + '</span>' +
      '</div>';
    }).join('');
  }

  /* Total estimado */
  var totalEl = document.getElementById('s2-total-kg');
  if (totalEl) totalEl.textContent = fmtTotal(totalKg);

  /* Card de impacto: famílias e progresso (cesta ~15 kg) */
  var familias   = totalKg > 0 ? Math.max(1, Math.floor(totalKg / 15)) : 0;
  var familiasEl = document.getElementById('s2-familias');
  if (familiasEl) familiasEl.textContent = familias + (familias === 1 ? ' família' : ' famílias');

  var subEl = document.getElementById('s2-impact-sub');
  if (subEl) subEl.textContent = count + (count === 1 ? ' item' : ' itens') + ' • ' + fmtTotal(totalKg);

  var pct    = Math.min(100, Math.round((totalKg / 15) * 100));
  var progEl = document.getElementById('s2-progress');
  if (progEl) progEl.style.width = pct + '%';

  /* Barra inferior */
  var barEl = document.getElementById('s2-bar-count');
  if (barEl) barEl.innerHTML = count + (count === 1 ? ' item' : ' itens') + ' &bull; ' + fmtTotal(totalKg);

  /* Resumo final */
  var finalItensEl = document.getElementById('s2-final-itens');
  if (finalItensEl) finalItensEl.textContent = count + (count === 1 ? ' item' : ' itens');
  var finalKgEl = document.getElementById('s2-final-kg');
  if (finalKgEl) finalKgEl.textContent = fmtTotal(totalKg);
}

/*
  Função do botão "← Voltar" no topo do modal.
  Comportamento depende do passo atual:
  - Passo 1 → vai para index.html
  - Passo 2 → volta para passo 1
  - Passo 3 → vai para index.html (fechar)
*/
function voltarOuSair() {
  if (FormState.passoAtual === 2) {
    doaIrPasso(1);
  } else {
    window.location.href = 'index.html';
  }
}
/* Exporta para o onclick inline no HTML */
window.voltarOuSair = voltarOuSair;

/*
  Preenche o resumo compacto no topo do passo 2.
  Mostra: "Feijão 2.0kg  2.0 kg"
*/
function preencherResumo() {
  var itemsEl = document.getElementById('resume-items');
  var kgEl    = document.getElementById('resume-kg');
  var itens   = doaItens();
  var total   = kgTotal();

  if (itemsEl) {
    itemsEl.innerHTML = itens.map(function (i) {
      return '<span style="margin-right:10px;">' +
        i.nome + ' <strong style="color:var(--gold);">' +
        fmtUnidade(i.totalKg, i.unidade || 'kg') + '</strong>' +
        '</span>';
    }).join('');
  }
  if (kgEl) kgEl.textContent = fmtTotal(total);
}


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 6 — PASSO 2: SELEÇÃO DE ENTREGA
   ══════════════════════════════════════════════════════════════════════ */

/*
  Seleciona uma forma de entrega (Igreja ou Buscar em casa).
  @param {HTMLElement} card - O elemento .delivery-card clicado
*/
function selecionarEntrega(card) {
  /* Remove seleção anterior */
  document.querySelectorAll('.delivery-card').forEach(function (c) {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });

  /* Aplica a seleção no card clicado */
  card.classList.add('selected');
  card.setAttribute('aria-checked', 'true');
  FormState.entrega = card.dataset.val; /* 'igreja' ou 'retirada' */

  /* Limpa mensagem de erro de entrega */
  setFieldState('field-entrega', 'msg-entrega', 'ok', ' Forma de entrega selecionada');

  /* Mostra seção de endereço apenas para retirada em casa */
  var endSection = document.getElementById('endereco-section');
  if (endSection) {
    var mostrar = FormState.entrega === 'retirada';
    endSection.style.display = mostrar ? '' : 'none';
    if (mostrar) {
      /* Scroll suave até a seção e foca no primeiro campo */
      setTimeout(function () {
        endSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        var primeiroInput = document.getElementById('inp-rua');
        if (primeiroInput) primeiroInput.focus();
      }, 350);
    } else {
      /* Limpa os campos quando outra forma é selecionada */
      ['inp-rua','inp-numero','inp-complemento','inp-bairro-end','inp-referencia']
        .forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.value = '';
        });
      var msgEnd = document.getElementById('msg-endereco');
      if (msgEnd) msgEnd.textContent = '';
    }
  }
}


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 7 — VALIDAÇÃO DOS CAMPOS
   ══════════════════════════════════════════════════════════════════════ */

/*
  Valida o campo de nome.
  @returns {{ok: boolean, msg: string}}
*/
function doaValNome() {
  var nome = (document.getElementById('inp-nome') ?
    document.getElementById('inp-nome').value : '').trim();
  if (!nome)        return { ok: false, msg: 'Por favor, informe seu nome.' };
  if (nome.length < 3) return { ok: false, msg: 'Nome muito curto (mínimo 3 letras).' };
  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nome)) return { ok: false, msg: 'Use apenas letras no nome.' };
  return { ok: true, msg: ' Nome válido' };
}

/*
  Valida o campo de telefone.
  Aceita 8–11 dígitos (com ou sem DDD).
  @returns {{ok: boolean, msg: string}}
*/
function doaValTel() {
  var el  = document.getElementById('inp-tel');
  var raw = (el ? el.value : '').replace(/\D/g, ''); /* Remove não-dígitos */
  if (!raw)           return { ok: false, msg: 'Por favor, informe seu WhatsApp.' };
  if (raw.length < 8) return { ok: false, msg: 'Telefone incompleto. Use DDD + número.' };
  if (raw.length > 11)return { ok: false, msg: 'Telefone muito longo.' };
  return { ok: true, msg: ' WhatsApp válido' };
}

/*
  Define o estado visual de um campo (ok, err ou '').
  @param {string} fieldId  - ID do .form-field
  @param {string} msgId    - ID da .field-msg
  @param {string} estado   - 'ok', 'err' ou '' @param {string} mensagem - Texto de feedback
*/
function setFieldState(fieldId, msgId, estado, mensagem) {
  var fieldEl = document.getElementById(fieldId);
  var msgEl   = document.getElementById(msgId);
  if (fieldEl) {
    fieldEl.classList.remove('ok', 'err');
    if (estado) fieldEl.classList.add(estado);
  }
  if (msgEl) msgEl.textContent = mensagem || '';
}


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 8 — SUBMISSÃO DA DOAÇÃO
   Esta é a função mais importante do formulário!
   ══════════════════════════════════════════════════════════════════════ */

/*
  Valida todos os campos, salva a doação e envia WhatsApp ao admin.

  FLUXO INTERNO:
  1. Valida nome e telefone
  2. Valida que a entrega foi selecionada
  3. Bloqueia o botão (evita envio duplo)
  4. Monta o objeto da doação
  5. Salva via DoaVidaAPI.addDoacao() → que também envia WhatsApp
  6. Gera o recibo e vai para o passo 3
*/
function doaSubmit() {
  /* Verifica se há pelo menos 1 item no carrinho */
  if (carrinhoVazio()) {
    showToast(' Selecione ao menos 1 alimento!', 'warning');
    return;
  }

  /* Evita envio duplo */
  if (FormState.enviando) return;

  /* Coleta valores dos campos */
  var nome   = document.getElementById('inp-nome') ?
    document.getElementById('inp-nome').value.trim() : '';
  var tel    = document.getElementById('inp-tel') ?
    document.getElementById('inp-tel').value : '';
  var prayer = document.getElementById('inp-prayer') ?
    document.getElementById('inp-prayer').value.trim() : '';

  /* ── Validação ── */
  var nomeOk = doaValNome();
  var telOk  = doaValTel();

  setFieldState('field-nome', 'msg-nome', nomeOk.ok ? 'ok' : 'err', nomeOk.msg);
  setFieldState('field-tel',  'msg-tel',  telOk.ok  ? 'ok' : 'err', telOk.msg);

  if (!nomeOk.ok) {
    document.getElementById('inp-nome').focus();
    return;
  }
  if (!telOk.ok) {
    document.getElementById('inp-tel').focus();
    return;
  }
  if (!FormState.entrega) {
    setFieldState('field-entrega', 'msg-entrega', 'err',
      'Por favor, selecione uma forma de entrega.');
    /* Anima os cards para chamar atenção */
    document.querySelectorAll('.delivery-card').forEach(function (c) {
      c.style.animation = 'none';
      c.offsetHeight; /* Force reflow */
      c.style.animation = 'fieldShake .4s ease';
    });
    return;
  }

  /* ── Valida e coleta endereço (obrigatório quando retirada em casa) ── */
  var enderecoObj = null;
  if (FormState.entrega === 'retirada') {
    var _rua    = (document.getElementById('inp-rua')        || {value:''}).value.trim();
    var _bairro = (document.getElementById('inp-bairro-end') || {value:''}).value.trim();
    var msgEnd  = document.getElementById('msg-endereco');

    if (!_rua) {
      if (msgEnd) { msgEnd.style.color = '#c0392b'; msgEnd.textContent = 'Informe o nome da sua rua.'; }
      var elRua = document.getElementById('inp-rua');
      if (elRua) { elRua.style.borderColor = '#c0392b'; elRua.focus(); }
      return;
    }
    if (!_bairro) {
      if (msgEnd) { msgEnd.style.color = '#c0392b'; msgEnd.textContent = 'Informe seu bairro.'; }
      var elBairro = document.getElementById('inp-bairro-end');
      if (elBairro) { elBairro.style.borderColor = '#c0392b'; elBairro.focus(); }
      return;
    }

    if (msgEnd) { msgEnd.style.color = '#2d6e1f'; msgEnd.textContent = ' Endereço confirmado'; }
    enderecoObj = {
      rua:         _rua,
      numero:      (document.getElementById('inp-numero')      || {value:''}).value.trim(),
      complemento: (document.getElementById('inp-complemento') || {value:''}).value.trim(),
      bairro:      _bairro,
      referencia:  (document.getElementById('inp-referencia')  || {value:''}).value.trim(),
    };
  }

  /* ── Bloqueia o botão e mostra loading ── */
  FormState.enviando = true;
  var btn = document.getElementById('btn-submit');
  if (btn) { btn.classList.add('loading'); btn.disabled = true; }

  /* Pequeno delay para o usuário ver o spinner */
  setTimeout(async function () {
    try {
      var itens      = doaItens();   /* itens reais — usados também para atualizar o estoque abaixo */
      var totalKg    = kgTotal();
      var protocolo  = gerarProtocolo();
      var now        = new Date();

      /*
        Quando o doador seleciona a cesta básica completa (todos os alimentos
        disponíveis), a doação é registrada como 1 único item — "Cesta básica
        completa" — em vez da lista individual de alimentos. Isso é só para
        o que é SALVO/exibido (recibo, WhatsApp, admin); o estoque de cada
        alimento continua sendo atualizado item a item via `itens` abaixo.
      */
      var ehCestaCompleta = _ehDoacaoDeCestaCompleta();
      var itensParaSalvar = ehCestaCompleta
        ? [{ id: 'cesta-completa', nome: 'Cesta básica completa', qty: 1, totalKg: totalKg }]
        : itens.map(function (i) { return { id: i.id, nome: i.nome, qty: i.qty, totalKg: i.totalKg }; });
      var foodLabel = ehCestaCompleta
        ? 'Cesta básica completa'
        : itens.map(function (i) { return i.nome; }).join(', ');

      /*
        Objeto da doação — salvo no Supabase via DoaVidaSync.addDoacao().
        CAMPOS OBRIGATÓRIOS: name, food, amount.
        Os demais são opcionais mas importantes para o recibo e WhatsApp.
      */
      var doacao = {
        protocolo: protocolo,
        /* name e food são obrigatórios */
        name:      nome,
        food:      foodLabel,
        amount:    ehCestaCompleta ? 1 : (itens.reduce(function(s,i){ return s + (i.qty||0); }, 0) || 1),
        /* Campos extras para o recibo e WhatsApp */
        nome:      nome,
        phone:     tel.replace(/\D/g, ''),     /* Só dígitos */
        telefone:  tel,                          /* Com máscara */
        delivery:  FormState.entrega,
        observacao: prayer,
        itens:     itensParaSalvar,
        tipo_doacao: ehCestaCompleta ? 'cesta_completa' : 'itens',
        totalKg:   totalKg,
        total_kg:  totalKg,
        status:    'pendente',
        createdAt: now.toISOString(),
        endereco:  enderecoObj,
        endereco_texto: enderecoObj
          ? [enderecoObj.rua, enderecoObj.numero, enderecoObj.complemento,
             enderecoObj.bairro ? 'Bairro: ' + enderecoObj.bairro : '',
             enderecoObj.referencia ? 'Ref: ' + enderecoObj.referencia : '']
              .filter(Boolean).join(', ')
          : '',
      };

      /*
        Salva via DoaVidaSync (Supabase).
        Mescla o retorno do Supabase com o objeto local para garantir
        que protocolo, telefone formatado e outros campos extras
        estejam disponíveis para o recibo e WhatsApp.
      */
      var doaSalva = await DoaVidaSync.addDoacao(doacao);
      doaSalva = Object.assign({}, doacao, doaSalva);

      /*
        ── Atualiza estoque dos alimentos doados ──────────────────────
        Incrementa o campo `kg` de cada alimento com o total doado.
        Isso mantém o sistema de cestas sincronizado em tempo real.
      */
      try {
        await Promise.all(itens.map(async function (item) {
          var alimento = _alimentosCache.find(function (a) { return a.id === item.id; });
          if (!alimento) return;
          var novoKg = (parseFloat(alimento.kg) || 0) + (item.totalKg || 0);
          /* Atualiza o cache local para consistência imediata */
          alimento.kg = novoKg;
          await DoaVidaSync.updateAlimento(item.id, { kg: novoKg });
          /* Atualiza o card visual — bloqueia se a meta foi atingida */
          atualizarCard(item.id);
        }));
        /* Atualiza carrinho para remover itens que foram bloqueados */
        doaAtualizarCarrinho();
        atualizarBotaoContinuar();
      } catch (e) {
        /* Não bloqueia o recibo se a atualização de estoque falhar */
        console.warn('[DoaVida] Estoque não atualizado:', e);
      }

      /* Notifica o admin por WhatsApp (assíncrono — não trava a interface) */
      try { DoaVidaAPI.notificarAdminWA(doaSalva); } catch(e) { /* ignora */ }

      /* Notifica o admin por e-mail via EmailJS (assíncrono) */
      if (window.DoaVidaSync && typeof DoaVidaSync.notificarEmail === 'function') {
        DoaVidaSync.notificarEmail(doaSalva).catch(function() {});
      }

      /* Constrói e exibe o recibo (passo 3) */
      doaBuildRecibo(doaSalva, now);
      doaIrPasso(3);

      showToast(' Doação registrada com sucesso!', 'success');

    } catch (erro) {
      console.error('[DoaVida] Erro ao salvar doação:', erro);
      var msg = erro && erro.message ? erro.message : 'Tente novamente.';
      /* Supabase paused → 503. Traduz para mensagem amigável */
      if (msg.toLowerCase().includes('fetch') || msg.includes('503') || msg.includes('network')) {
        msg = 'Servidor indisponível. Verifique sua conexão e tente novamente.';
      }
      showToast(' Erro: ' + msg, 'error');
    } finally {
      /* Sempre libera o botão, mesmo em caso de erro */
      FormState.enviando = false;
      if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
    }
  }, 700); /* 700ms = tempo do spinner */
}


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 9 — PASSO 3: RECIBO TÉRMICO
   ══════════════════════════════════════════════════════════════════════ */

/*
  Preenche o recibo estilo "cupom de supermercado" com os dados da doação.
  Estilo visual: papel térmico, fonte mono, itens listados como recibo real.
  Inclui ações de compartilhamento inteligente (WhatsApp, download, copiar).

  @param {Object} d   - Objeto da doação salva (retornado por DoaVidaAPI.addDoacao)
  @param {Date}   now - Data/hora do envio
*/
function doaBuildRecibo(d, now) {
  /* Função auxiliar: preenche um campo pelo ID */
  function _s(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = v || '—';
  }

  var nomeDisplay = (d.nome || d.name || '').split(' ')[0] || 'Doador';
  var dataFormatada = now.toLocaleDateString('pt-BR');
  var horaFormatada = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  /* Preenche campos básicos do recibo */
  _s('r-proto',   d.protocolo || '—');
  _s('r-nome',    (d.nome || d.name || '').toUpperCase());
  _s('r-tel',     d.telefone || d.phone || '—');
  _s('r-entrega', ENTREGA_LABELS[d.delivery] || d.delivery || '—');
  _s('r-data',    dataFormatada);
  _s('r-hora',    horaFormatada);

  /* Endereço — só mostra se retirada em casa */
  var endRowEl = document.getElementById('r-endereco-row');
  var endEl    = document.getElementById('r-endereco');
  if (endRowEl && endEl) {
    var endTexto = d.endereco_texto || '';
    if (!endTexto && d.endereco) {
      var e = d.endereco;
      endTexto = [e.rua, e.numero, e.complemento,
        e.bairro ? 'Bairro: ' + e.bairro : '',
        e.referencia ? 'Ref: ' + e.referencia : ''].filter(Boolean).join(', ');
    }
    if (endTexto) {
      endEl.textContent = endTexto;
      endRowEl.style.display = '';
    } else {
      endRowEl.style.display = 'none';
    }
  }

  /* Atualiza o título de sucesso */
  _s('success-title', 'Obrigado, ' + nomeDisplay + '! ');
  _s('success-msg',   'Sua doação foi registrada com sucesso.');

  /* Preenche os itens do comprovante (estilo cupom fiscal) */
  var itemsEl = document.getElementById('r-items');
  if (itemsEl) {
    itemsEl.innerHTML = '';
    var totalKg = 0;
    (d.itens || []).forEach(function (i) {
      var nome = window.escHtml ? escHtml(i.nome) : i.nome;
      var row = document.createElement('div');
      row.className = 'rcpt-item-row';
      row.innerHTML =
        '<span class="rcpt-item-desc">' + nome.toUpperCase() + '</span>' +
        '<span class="rcpt-item-qty">' + i.qty + ' un</span>' +
        '<span class="rcpt-item-total">' + fmtUnidade(i.totalKg || 0, i.unidade || 'kg') + '</span>';
      itemsEl.appendChild(row);
      totalKg += (i.totalKg || 0);
    });
    var elTotalKg = document.getElementById('r-total-kg');
    if (elTotalKg) elTotalKg.textContent = fmtTotal(totalKg);
    /* Atualiza número no barcode */
    var barEl = document.getElementById('r-barcode-num');
    if (barEl && d.protocolo) barEl.textContent = '* ' + d.protocolo + ' *';
  }

  /* Exibe a mensagem de oração se foi informada */
  var msgRow = document.getElementById('r-msg-row');
  var msgTxt = document.getElementById('r-msg-text');
  if (d.observacao && msgRow && msgTxt) {
    msgTxt.textContent = '"' + d.observacao + '"';
    msgRow.style.display = '';
  } else if (msgRow) {
    msgRow.style.display = 'none';
  }

  /* Exibe o badge do WhatsApp se o WA estiver configurado e ativo */
  var waBadge = document.getElementById('wa-badge');
  if (waBadge) {
    try {
      var cfg = DoaVidaAPI.getWaConfig();
      waBadge.style.display = (cfg.ativo && cfg.apikey) ? 'flex' : 'none';
    } catch (e) {
      waBadge.style.display = 'none';
    }
  }

  /*
    ══════════════════════════════════════════════════════════════
    COMPARTILHAMENTO INTELIGENTE
    Substitui a impressão por ações modernas:
    1. Compartilhar via WhatsApp
    2. Download do comprovante como imagem
    3. Copiar texto para a área de transferência
    ══════════════════════════════════════════════════════════════
  */

  /* Monta o texto do comprovante (fallback caso a imagem não funcione) */
  var textoComprovante = montarTextoComprovante(d, dataFormatada, horaFormatada);

  /*
    Captura o #receipt-paper como imagem PNG.
    Clona o elemento fora da tela para garantir que html2canvas consiga
    renderizar mesmo que o pai (#fs3) esteja com display:none.
    @returns {Promise<Blob>}
  */
  function capturarReciboBlob() {
    var recibo = document.getElementById('receipt-paper');
    if (!recibo) return Promise.reject(new Error('receipt-paper não encontrado'));

    if (typeof html2canvas !== 'undefined') {
      /* Cria um container temporário fora da área visível */
      var wrapper = document.createElement('div');
      wrapper.style.cssText = [
        'position:fixed',
        'top:0',
        'left:-9999px',
        'z-index:-1',
        'background:#fff',
        'width:' + (recibo.offsetWidth || 400) + 'px',
        'padding:0',
        'margin:0',
      ].join(';');

      /* Clona o recibo com todos os estilos computados */
      var clone = recibo.cloneNode(true);
      clone.style.display  = 'block';
      clone.style.position = 'relative';
      clone.style.width    = '100%';
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      return html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
      }).then(function (canvas) {
        document.body.removeChild(wrapper);
        return new Promise(function (resolve, reject) {
          canvas.toBlob(function (blob) {
            if (blob) resolve(blob);
            else reject(new Error('toBlob retornou nulo'));
          }, 'image/png');
        });
      }).catch(function (err) {
        if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
        throw err;
      });
    }

    /* Fallback: gerador canvas próprio (js/comprovante-canvas.js) */
    if (typeof window.gerarImagemRecibo === 'function') {
      return new Promise(function (resolve, reject) {
        window.gerarImagemRecibo(function (err, blob) {
          if (err || !blob) reject(err || new Error('Blob vazio'));
          else resolve(blob);
        });
      });
    }

    return Promise.reject(new Error('Nenhum gerador de imagem disponível'));
  }

  /* ─── Botão Compartilhar WhatsApp (imagem) ─── */
  var btnShare = document.getElementById('btn-share-wa');
  if (btnShare) {
    btnShare.onclick = function () {
      var nomeArquivo = 'comprovante-' + (d.protocolo || 'doavida') + '.png';

      capturarReciboBlob().then(function (blob) {
        var file = new File([blob], nomeArquivo, { type: 'image/png' });

        /* Web Share API com arquivo — funciona no celular (Chrome/Safari mobile) */
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          return navigator.share({
            title: 'Comprovante de Doação — DoaVida',
            files: [file],
          }).then(function () {
            showToast(' Comprovante compartilhado!', 'success');
          });
        }

        /* Fallback desktop: baixa a imagem + abre WhatsApp Web com texto */
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = nomeArquivo;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        abrirWhatsApp('whatsapp://send?text=' + encodeURIComponent(textoComprovante));
        showToast(' Imagem baixada! Anexe-a no WhatsApp.', 'success');

      }).catch(function () {
        /* Fallback final: só texto */
        abrirWhatsApp('whatsapp://send?text=' + encodeURIComponent(textoComprovante));
        showToast(' WhatsApp aberto! Escolha para quem enviar.', 'success');
      });
    };
  }

  /* ─── Botão Download como imagem ─── */
  var btnDownload = document.getElementById('btn-download-recibo');
  if (btnDownload) {
    btnDownload.onclick = function () {
      var nomeArquivo = 'comprovante-' + (d.protocolo || 'recibo') + '.png';
      capturarReciboBlob().then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = nomeArquivo;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(' Comprovante baixado!', 'success');
      }).catch(function () {
        /* Fallback: baixa como texto */
        downloadReciboComoImagem(d.protocolo || 'recibo');
      });
    };
  }

  /* ─── Botão Copiar texto ─── */
  var btnCopy = document.getElementById('btn-copy-recibo');
  if (btnCopy) {
    btnCopy.onclick = function () {
      /*
        navigator.clipboard.writeText() copia texto para a área de transferência.
        É assíncrono e retorna uma Promise.
        O .then() roda quando a cópia foi bem-sucedida.
        O .catch() roda se o navegador não permitir (ex: HTTP sem HTTPS).
      */
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textoComprovante).then(function () {
          showToast(' Comprovante copiado!', 'success');
        }).catch(function () {
          /* Fallback: seleciona texto manual */
          copiarTextoFallback(textoComprovante);
        });
      } else {
        copiarTextoFallback(textoComprovante);
      }
    };
  }
}

/*
  Monta o texto do comprovante no formato de recibo para compartilhar.
  Estilo: recibo de supermercado com linhas pontilhadas.

  @param {Object} d     - Dados da doação
  @param {string} data  - Data formatada (DD/MM/YYYY)
  @param {string} hora  - Hora formatada (HH:MM)
  @returns {string}       Texto formatado do comprovante
*/
function montarTextoComprovante(d, data, hora) {
  /* Alinha texto à esquerda numa largura fixa */
  function pad(str, len) {
    str = String(str || '');
    while (str.length < len) str += ' ';
    return str.substring(0, len);
  }
  function padL(str, len) {
    str = String(str || '');
    while (str.length < len) str = ' ' + str;
    return str.substring(str.length - len);
  }

  var sep  = '================================';
  var sep2 = '--------------------------------';
  var proto = (d.protocolo || '—').toUpperCase();
  var totalKg = d.total_kg || d.totalKg ||
    (d.itens || []).reduce(function(s,i){ return s + (i.totalKg||0); }, 0);

  var linhas = [];
  linhas.push(sep);
  linhas.push(' AÇÃO SOCIAL SEMEAR');
  linhas.push(' Comunidade Maanaim');
  linhas.push(' Belém, PA');
  linhas.push(sep);
  linhas.push('');
  linhas.push(' COMPROVANTE DE DOAÇÃO');
  linhas.push(sep2);
  linhas.push('Protocolo: ' + proto);
  linhas.push('Data:      ' + data + ' às ' + hora);
  linhas.push('Doador:    ' + (d.nome || d.name || 'Anônimo').toUpperCase());
  linhas.push('WhatsApp:  ' + (d.phone || d.telefone || '—'));
  linhas.push('Entrega:   ' + (ENTREGA_LABELS[d.delivery] || d.delivery || '—').toUpperCase());
  var _endTxt = d.endereco_texto || '';
  if (!_endTxt && d.endereco) {
    var _e = d.endereco;
    _endTxt = [_e.rua, _e.numero, _e.complemento,
      _e.bairro ? 'Bairro: ' + _e.bairro : '',
      _e.referencia ? 'Ref: ' + _e.referencia : ''].filter(Boolean).join(', ');
  }
  if (_endTxt) linhas.push('Endereço:  ' + _endTxt);
  linhas.push(sep2);
  linhas.push('');
  linhas.push(pad('ITEM', 16) + pad('QTD', 5) + padL('TOTAL', 9));
  linhas.push(sep2);

  /* Lista cada item com colunas alinhadas */
  (d.itens || []).forEach(function (item) {
    var nome  = pad(item.nome || '?', 16);
    var qty   = pad('x' + (item.qty || 1), 5);
    var total = padL(fmtUnidade(item.totalKg || 0, item.unidade || 'kg'), 9);
    linhas.push(nome + qty + total);
  });

  linhas.push(sep2);
  linhas.push(pad('TOTAL', 21) + padL(fmtTotal(totalKg), 9));
  linhas.push('');
  linhas.push(sep);
  linhas.push('');
  linhas.push('Que Deus abençoe sua generosidade!');
  linhas.push('Ação Social Semear + Maanaim — Belém, PA');

  return linhas.join('\n');
}

/*
  Gera uma "screenshot" do recibo e faz download como PNG.
  Usa a API Canvas do navegador para converter HTML → imagem.

  @param {string} nomeArquivo - Nome do arquivo sem extensão
*/
function downloadReciboComoImagem(nomeArquivo) {
  if (typeof window.gerarImagemRecibo !== 'function') {
    showToast(' Gerador de imagem não disponível.', 'warning');
    return;
  }

  showToast(' Gerando imagem...', 'info');

  try {
    window.gerarImagemRecibo(function (err, blob) {
      if (err || !blob) {
        showToast(' Erro ao gerar imagem.', 'warning');
        return;
      }
      var url = URL.createObjectURL(blob);
      var a   = document.createElement('a');
      a.href     = url;
      a.download = 'comprovante-' + (nomeArquivo || 'doavida') + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(' Comprovante baixado!', 'success');
    });
  } catch (e) {
    showToast(' Erro ao gerar comprovante.', 'warning');
  }
}

/*
  Fallback para copiar texto quando navigator.clipboard não está disponível.
  Cria um textarea invisível, seleciona o texto e executa o comando de cópia.

  @param {string} texto - Texto a ser copiado
*/
function copiarTextoFallback(texto) {
  var ta = document.createElement('textarea');
  ta.value = texto;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(' Comprovante copiado!', 'success');
  } catch (e) {
    showToast(' Não foi possível copiar.', 'warning');
  }
  document.body.removeChild(ta);
}

/* Exporta funções de compartilhamento para o escopo global */
window.montarTextoComprovante = montarTextoComprovante;
window.downloadReciboComoImagem = downloadReciboComoImagem;


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 10 — UTILITÁRIOS
   ══════════════════════════════════════════════════════════════════════ */

/*
  Gera um protocolo único para a doação.
  Formato: DOA-YYYYMMDD-XXXXX (ex: DOA-20260322-9R546)
  Chamada por doaSubmit() antes de salvar.
*/
function gerarProtocolo() {
  var now  = new Date();
  /* Data no formato YYYYMMDD */
  var data = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  /* Código aleatório de 5 caracteres (letras + números) */
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var codigo = '';
  for (var i = 0; i < 5; i++) {
    codigo += chars[Math.floor(Math.random() * chars.length)];
  }
  return 'DOA-' + data + '-' + codigo;
}
window.gerarProtocolo = gerarProtocolo;

/*
  Reinicia o formulário do zero (usado pelo botão "Nova Doação").
  Limpa o estado, reseta os campos e volta para o passo 1.
*/
function reiniciarForm() {
  /* Zera o estado */
  FormState.qtds          = {};
  FormState.entrega       = null;
  FormState.enviando      = false;
  FormState.passoAtual    = 1;
  FormState.cestaCompleta = false;

  /* Limpa os campos de texto */
  ['inp-nome', 'inp-tel', 'inp-prayer',
   'inp-cep', 'inp-rua', 'inp-numero', 'inp-complemento', 'inp-bairro-end', 'inp-referencia']
    .forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.value = ''; el.style.borderColor = ''; }
    });

  /* Esconde seção de endereço */
  var endSection = document.getElementById('endereco-section');
  if (endSection) endSection.style.display = 'none';
  var msgEnd = document.getElementById('msg-endereco');
  if (msgEnd) msgEnd.textContent = '';

  /* Remove seleção das formas de entrega */
  document.querySelectorAll('.delivery-card').forEach(function (c) {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });

  /* Reseta estados de validação */
  [['field-nome','msg-nome'],['field-tel','msg-tel'],['field-entrega','msg-entrega']]
    .forEach(function (pair) { setFieldState(pair[0], pair[1], '', ''); });

  /* Reseta contador de caracteres */
  var charCount = document.getElementById('char-count');
  if (charCount) charCount.textContent = '0/400';

  /* Re-renderiza a grade de alimentos */
  doaRenderGrid();
  doaAtualizarCarrinho();

  /* Volta para o passo 1 */
  doaIrPasso(1);
}
window.reiniciarForm = reiniciarForm;

/*
  Alimentos padrão usados quando o localStorage está vazio.
  FONTE ÚNICA DE VERDADE: agora usa DoaVidaAPI.ALIMENTOS_PADRAO (definido em api.js).
  Isso garante que admin e formulário sempre mostrem os mesmos alimentos.
  Para alterar os alimentos padrão, edite DoaVidaAPI.ALIMENTOS_PADRAO em api.js.
*/
function alimentosPadrao() {
  /*
    Usa os padrões definidos em api.js (fonte única de verdade).
    Fallback local caso api.js não esteja carregado (improvável).
  */
  if (window.DoaVidaAPI && DoaVidaAPI.ALIMENTOS_PADRAO) {
    return DoaVidaAPI.ALIMENTOS_PADRAO;
  }
  /* Fallback de emergência (igual ao api.js) */
  return [
    { id:'arroz',    name:'Arroz 5kg',       peso:5,   img:'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&q=70',  goal:2000, kg:0, emoji:'' },
    { id:'feijao',   name:'Feijão 1kg',       peso:1,   img:'https://images.unsplash.com/photo-1612257999756-3b9d3acd5e66?w=300&q=70',  goal:800,  kg:0, emoji:'' },
    { id:'macarrao', name:'Macarrão 500g',    peso:0.5, img:'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=300&q=70',  goal:500,  kg:0, emoji:'' },
    { id:'oleo',     name:'Óleo de Soja 1L',  peso:1,   img:'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&q=70',  goal:400,  kg:0, emoji:'' },
    { id:'acucar',   name:'Açúcar 1kg',       peso:1,   img:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=70',  goal:400,  kg:0, emoji:'' },
    { id:'sal',      name:'Sal 1kg',           peso:1,   img:'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300&q=70',  goal:200,  kg:0, emoji:'' },
  ];
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 11 — CESTA COMPLETA
   Seleciona automaticamente 1 unidade de cada alimento disponível
   ══════════════════════════════════════════════════════════════════════ */

/*
  Indica se o doador escolheu a Cesta Completa (FormState.cestaCompleta).
  Usado para sincronizar o botão "Selecionar Tudo" (toggle) e, no envio,
  para decidir se a doação deve ser salva como 1 cesta completa em vez
  da lista individual de alimentos.
*/
function _cestaCompletaSelecionada() {
  return !!FormState.cestaCompleta;
}

/*
  Mais estrito que _cestaCompletaSelecionada(): só considera "cesta completa"
  quando há pelo menos 2 alimentos no catálogo. Com 1 único item disponível,
  selecioná-lo é só aquele item, não uma cesta — usado na decisão do envio.
*/
function _ehDoacaoDeCestaCompleta() {
  var alimentos = _alimentosCache.length ? _alimentosCache : alimentosPadrao();
  var disponiveis = alimentos.filter(function (f) { return !_alimentoBloqueado(f.id); });
  return disponiveis.length >= 2 && _cestaCompletaSelecionada();
}

/*
  Retorna os itens "para exibição" no carrinho/gaveta/resumo do passo 2.
  Quando a Cesta Completa está ativa, mostra só 1 linha ("Cesta básica
  completa") em vez de marcar/listar cada alimento individualmente —
  mas o cálculo de peso e a baixa de estoque continuam usando doaItens()
  (a lista real, alimento por alimento), sem nenhuma mudança ali.
*/
function doaItensExibicao() {
  if (FormState.cestaCompleta) {
    var cestaImgSalva = (typeof localStorage !== 'undefined' && localStorage.getItem('doavida_cesta_img')) || 'img/cesta-basica.jpg';
    return [{
      id:      'cesta-completa',
      nome:    'Cesta básica completa',
      img:     cestaImgSalva,
      emoji:   '',
      qty:     1,
      peso:    1,
      totalKg: kgTotal(),
    }];
  }
  return doaItens();
}

/*
  Ativa/desativa o modo "Cesta Completa" (toggle).
  Ao ativar: marca 1 unidade de cada alimento disponível internamente
  (necessário para o cálculo de peso total e baixa de estoque por
  alimento), mas os cards individuais permanecem visualmente neutros —
  ver atualizarCard(). Na tela, só o card "Cesta Completa" fica marcado
  e o carrinho mostra 1 único item.
*/
function doaSelecionarCestaCompleta() {
  var alimentos = _alimentosCache.length ? _alimentosCache : alimentosPadrao();
  var disponiveis = alimentos.filter(function (f) { return !_alimentoBloqueado(f.id); });

  if (!disponiveis.length) {
    showToast(' Nenhum item disponível no momento.', 'warning');
    return;
  }

  var btn = document.getElementById('btn-cesta-completa');

  if (FormState.cestaCompleta) {
    /* Desativa: remove a cesta completa e zera as quantidades */
    FormState.cestaCompleta = false;
    disponiveis.forEach(function (f) {
      FormState.qtds[f.id] = 0;
      atualizarCard(f.id);
    });
    if (btn) { btn.textContent = 'Selecionar Tudo'; btn.style.background = '#1a1a1a'; btn.style.color = '#fff'; }
    showToast(' Cesta removida do carrinho.', 'info');
  } else {
    /* Ativa: marca 1 unidade de cada item (cálculo interno), sem
       selecionar visualmente os cards individuais */
    FormState.cestaCompleta = true;
    disponiveis.forEach(function (f) {
      FormState.qtds[f.id] = 1;
      atualizarCard(f.id);
    });
    if (btn) { btn.textContent = ' Cesta Selecionada'; btn.style.background = '#e8c96a'; btn.style.color = '#1a1a1a'; }
    showToast(' Cesta completa adicionada!', 'success');
  }

  doaAtualizarCarrinho();
  atualizarBotaoContinuar();
}
window.doaSelecionarCestaCompleta = doaSelecionarCestaCompleta;

/*
  Sincroniza o estado visual do botão da cesta sempre que o carrinho muda.
  Chamada por doaAtualizarCarrinho() para manter o botão atualizado.
*/
function _sincronizarBotaoCesta() {
  var btn = document.getElementById('btn-cesta-completa');
  if (!btn) return;
  var alimentos = _alimentosCache.length ? _alimentosCache : alimentosPadrao();
  var disponiveis = alimentos.filter(function (f) { return !_alimentoBloqueado(f.id); });
  if (!disponiveis.length) return;
  if (_cestaCompletaSelecionada()) {
    btn.textContent = ' Cesta Selecionada';
    btn.style.background = '#e8c96a';
    btn.style.color = '#1a1a1a';
  } else {
    btn.textContent = 'Selecionar Tudo';
    btn.style.background = '#1a1a1a';
    btn.style.color = '#fff';
  }
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 12 — PREENCHIMENTO AUTOMÁTICO DE ENDEREÇO
   Método 1 (principal): CEP → ViaCEP (Correios) — funciona em todo o Brasil
   Método 2 (alternativa): GPS → Nominatim reverse geocoding
   ══════════════════════════════════════════════════════════════════════ */

/* Máscara do campo CEP: digita "66085460" → exibe "66085-460" */
function _mascaraCEP(el) {
  var v = el.value.replace(/\D/g, '').slice(0, 8);
  el.value = v.length > 5 ? v.slice(0, 5) + '-' + v.slice(5) : v;
  /* Dispara a busca automaticamente quando os 8 dígitos estão completos */
  if (v.length === 8) buscarEnderecoPorCEP();
}

/* Liga a máscara ao campo CEP quando o DOM estiver pronto */
document.addEventListener('DOMContentLoaded', function () {
  var cepInput = document.getElementById('inp-cep');
  if (cepInput) {
    cepInput.addEventListener('input', function () { _mascaraCEP(this); });
    cepInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); buscarEnderecoPorCEP(); }
    });
  }
});

/*
  buscarEnderecoPorCEP()
  Consulta a API ViaCEP (gratuita, oficial dos Correios) e preenche
  automaticamente Rua e Bairro. O usuário só precisa digitar Número e Referência.
*/
function buscarEnderecoPorCEP() {
  var cepInput = document.getElementById('inp-cep');
  var btnBuscar = document.getElementById('btn-buscar-cep');
  var cep = (cepInput ? cepInput.value : '').replace(/\D/g, '');

  if (cep.length !== 8) {
    showToast('Digite o CEP completo (8 números).', 'warning');
    if (cepInput) cepInput.focus();
    return;
  }

  /* Estado de carregamento */
  if (btnBuscar) { btnBuscar.disabled = true; btnBuscar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...'; }

  fetch('https://viacep.com.br/ws/' + cep + '/json/')
    .then(function (r) {
      if (!r.ok) throw new Error('viacep-error');
      return r.json();
    })
    .then(function (d) {
      if (d.erro) {
        showToast('CEP não encontrado. Verifique o número e tente novamente.', 'warning');
        if (cepInput) { cepInput.style.borderColor = '#d97706'; cepInput.focus(); }
        return;
      }

      /* Preenche os campos */
      var elRua    = document.getElementById('inp-rua');
      var elBairro = document.getElementById('inp-bairro-end');
      var elNum    = document.getElementById('inp-numero');

      if (elRua)    { elRua.value    = d.logradouro || ''; elRua.style.borderColor    = d.logradouro ? '' : '#d97706'; }
      if (elBairro) { elBairro.value = d.bairro     || ''; elBairro.style.borderColor = d.bairro     ? '' : '#d97706'; }

      /* Limpa mensagem de erro e mostra confirmação */
      var msgEnd = document.getElementById('msg-endereco');
      if (msgEnd) {
        msgEnd.style.color = '#2d6e1f';
        msgEnd.textContent = '✓ Endereço encontrado! Confirme o número da sua casa.';
      }
      if (cepInput) cepInput.style.borderColor = '#2d6e1f';

      /* Foca no número (único campo que o CEP não preenche) */
      setTimeout(function () {
        if (elNum) elNum.focus();
      }, 250);

      showToast('Endereço preenchido pelo CEP!', 'success');
    })
    .catch(function () {
      showToast('Erro ao buscar o CEP. Verifique sua conexão ou preencha manualmente.', 'warning');
    })
    .finally(function () {
      if (btnBuscar) { btnBuscar.disabled = false; btnBuscar.innerHTML = '<i class="fas fa-magnifying-glass"></i> Buscar'; }
    });
}
window.buscarEnderecoPorCEP = buscarEnderecoPorCEP;

/* ══════════════════════════════════════════════════════════════════════
   GEOLOCALIZAÇÃO (alternativa ao CEP)
   Usa a Geolocation API do browser + Nominatim (OpenStreetMap) para
   reverse geocoding — gratuito, sem chave de API.
   ══════════════════════════════════════════════════════════════════════ */

function usarLocalizacaoGPS() {
  var btn = document.getElementById('btn-usar-localizacao');

  if (!navigator.geolocation) {
    showToast('Seu dispositivo não suporta localização automática.', 'warning');
    return;
  }

  function setBtnCarregando(ativo) {
    if (!btn) return;
    btn.disabled = ativo;
    btn.classList.remove('btn-geo--ok');
    btn.innerHTML = ativo
      ? '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Buscando sua localização...'
      : '<i class="fas fa-location-crosshairs" aria-hidden="true"></i> Usar minha localização';
  }

  /* Extrai logradouro do display_name como último recurso.
     Ex: "Travessa das Palmeiras, Agulha, Belém, PA, Brasil" → "Travessa das Palmeiras" */
  function extrairRuaDoDisplayName(displayName, bairroJaEncontrado) {
    if (!displayName) return '';
    var partes = displayName.split(',').map(function (p) { return p.trim(); });
    var candidato = partes[0] || '';
    if (/^(rua|av\.?|avenida|trav\.?|travessa|alameda|estrada|rodovia|beco|passagem|via |setor|quadra|qd\b|qn\b|qi\b)/i.test(candidato)) {
      return candidato;
    }
    /* Aceita qualquer primeira parte se não for o bairro, cidade ou estado */
    if (candidato &&
        candidato.toLowerCase() !== (bairroJaEncontrado || '').toLowerCase() &&
        !/^(belém|belem|pará|para|brasil|região|regiao|municipio|município)/i.test(candidato)) {
      return candidato;
    }
    return '';
  }

  function bairroValidoGPS(valor) {
    var v = String(valor || '').trim();
    if (!v) return '';
    if (/^(bel[eé]m|par[aá]|brasil|regi[aã]o|regiao|munic[ií]pio|municipio|state of par[aá]|regi[aã]o metropolitana)$/i.test(v)) {
      return '';
    }
    return v;
  }

  function extrairBairroNominatim(address) {
    var candidatos = [
      address.neighbourhood,
      address.quarter,
      address.suburb,
      address.city_district,
      address.district,
      address.borough
    ];
    for (var i = 0; i < candidatos.length; i++) {
      var bairro = bairroValidoGPS(candidatos[i]);
      if (bairro) return bairro;
    }
    return '';
  }

  /* Preenche os campos do DOM e exibe o feedback final */
  function aplicarEndereco(rua, numero, bairro) {
    var elRua    = document.getElementById('inp-rua');
    var elNum    = document.getElementById('inp-numero');
    var elBairro = document.getElementById('inp-bairro-end');

    if (elRua)    { elRua.value    = rua;    elRua.style.borderColor    = ''; }
    if (elNum)    { elNum.value    = numero; }
    if (elBairro) { elBairro.value = bairro; elBairro.style.borderColor = ''; }

    var faltando = [];
    if (!rua)    faltando.push('rua');
    if (!bairro) faltando.push('bairro');

    var msgEnd = document.getElementById('msg-endereco');
    if (msgEnd) {
      if (!faltando.length) {
        msgEnd.style.color   = '#2d6e1f';
        msgEnd.textContent   = '✓ Endereço detectado! Confira e ajuste se precisar.';
      } else {
        msgEnd.style.color   = '#92400e';
        msgEnd.textContent   = 'Não conseguimos detectar: ' + faltando.join(' e ') + '. Digite abaixo.';
      }
    }

    if (btn) {
      btn.disabled  = false;
      btn.innerHTML = !faltando.length
        ? '<i class="fas fa-circle-check" aria-hidden="true"></i> Localização preenchida!'
        : '<i class="fas fa-triangle-exclamation" aria-hidden="true"></i> Complete os campos em laranja';
      btn.classList.add('btn-geo--ok');
      setTimeout(function () {
        btn.innerHTML = '<i class="fas fa-location-crosshairs" aria-hidden="true"></i> Usar minha localização';
        btn.classList.remove('btn-geo--ok');
        btn.disabled  = false;
      }, 4000);
    }

    /* Destaca em laranja os campos que faltam */
    if (!rua    && elRua)    elRua.style.borderColor    = '#d97706';
    if (!bairro && elBairro) elBairro.style.borderColor = '#d97706';

    /* Foca no primeiro campo vazio */
    setTimeout(function () {
      if (!rua && elRua)          { elRua.focus(); return; }
      if (!bairro && elBairro)    { elBairro.focus(); return; }
      var elRef = document.getElementById('inp-referencia');
      if (elRef) elRef.focus();
    }, 350);

    showToast(
      !faltando.length
        ? 'Endereço preenchido! Confira os dados.'
        : 'Quase lá! Preencha: ' + faltando.join(' e ') + '.',
      !faltando.length ? 'success' : 'warning'
    );
  }

  function avisarGPSImpreciso() {
    var elBairro = document.getElementById('inp-bairro-end');
    var msgEnd = document.getElementById('msg-endereco');
    if (elBairro) {
      elBairro.value = '';
      elBairro.style.borderColor = '#d97706';
    }
    if (msgEnd) {
      msgEnd.style.color = '#92400e';
      msgEnd.textContent = 'GPS impreciso para definir o bairro. Digite o CEP ou informe o bairro manualmente.';
    }
  }

  setBtnCarregando(true);

  navigator.geolocation.getCurrentPosition(
    function (pos) {
      var lat = pos.coords.latitude;
      var lon = pos.coords.longitude;
      var precisao = Number(pos.coords.accuracy || 9999);
      var gpsPreciso = precisao <= 120;

      /* ── Passo 1: Nominatim — converte coordenadas em endereço ── */
      fetch(
        'https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&zoom=18&lat=' +
        lat + '&lon=' + lon + '&accept-language=pt-BR'
      )
      .then(function (r) {
        if (!r.ok) throw new Error('nominatim-error');
        return r.json();
      })
      .then(function (data) {
        var a      = data.address || {};
        var bairroSugerido = extrairBairroNominatim(a);
        var bairro = '';
        var numero = a.house_number || '';
        var cep    = (a.postcode || '').replace(/\D/g, '');
        var elCep  = document.getElementById('inp-cep');

        /* Tenta extrair rua de vários campos do Nominatim */
        var rua = a.road || a.pedestrian || a.footway || a.path ||
                  a.cycleway || a.residential || a.hamlet || '';

        /* Fallback no display_name se Nominatim não retornou campo de rua */
        if (!rua) rua = extrairRuaDoDisplayName(data.display_name, bairroSugerido);

        /* ── Passo 2: se temos CEP → consulta ViaCEP ──
           ViaCEP é a API oficial brasileira de endereços por CEP.
           Em Belém, o bairro do OSM pode vir como região/bairro vizinho.
           O bairro só é preenchido se o GPS estiver preciso; se a localização
           vier aproximada por IP/Wi-Fi, deixamos o usuário confirmar pelo CEP. */
        if (cep.length === 8) {
          if (elCep) elCep.value = cep.slice(0, 5) + '-' + cep.slice(5);
          fetch('https://viacep.com.br/ws/' + cep + '/json/')
            .then(function (r2) { return r2.json(); })
            .then(function (vd) {
              if (!vd.erro) {
                rua    = vd.logradouro || rua;
                bairro = gpsPreciso ? (vd.bairro || '') : '';
              }
              aplicarEndereco(rua, numero, bairro);
              if (!gpsPreciso) avisarGPSImpreciso();
            })
            .catch(function () {
              /* ViaCEP falhou — usa o que temos */
              aplicarEndereco(rua, numero, '');
              if (!gpsPreciso) avisarGPSImpreciso();
            });
          return; /* ViaCEP assume o controle do fluxo */
        }

        aplicarEndereco(rua, numero, '');
        if (!gpsPreciso || bairroSugerido) avisarGPSImpreciso();
      })
      .catch(function () {
        setBtnCarregando(false);
        showToast('Não foi possível traduzir sua localização. Preencha o endereço manualmente.', 'warning');
      });
    },

    function (err) {
      setBtnCarregando(false);
      var msgs = {
        1: 'Permissão negada. Permita o acesso à localização nas configurações do navegador.',
        2: 'Localização indisponível no momento. Preencha o endereço manualmente.',
        3: 'A busca demorou muito. Verifique sua conexão e tente novamente.',
      };
      showToast(msgs[err.code] || 'Não foi possível obter a localização.', 'warning');
    },

    { timeout: 12000, maximumAge: 60000, enableHighAccuracy: true }
  );
}
window.usarLocalizacaoGPS = usarLocalizacaoGPS;

console.log('[DoaVida] form.js  carregado');
