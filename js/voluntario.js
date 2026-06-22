/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  DoaVida — js/voluntario.js  v4.0                                   ║
  ║  Lógica da página voluntario.html                                   ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  FLUXO GUIADO POR 3 PASSOS:                                         ║
  ║                                                                      ║
  ║  PASSO 1 — Apresentação                                             ║
  ║    Botão "Quero Ajudar" → avança para o Passo 2                    ║
  ║                                                                      ║
  ║  PASSO 2 — Escolha do tipo de ajuda                                 ║
  ║    4 cards clicáveis:                                               ║
  ║    • Intercessão   → formulário com dias e frequência de oração    ║
  ║    • Voluntariado  → formulário com disponibilidade de horário     ║
  ║    • Doação        → formulário com disponibilidade de horário     ║
  ║    • Logística     → formulário com disponibilidade de horário     ║
  ║                                                                      ║
  ║  PASSO 3 — Formulário específico por tipo                           ║
  ║    Campos comuns:   Nome + Telefone                                 ║
  ║    Intercessão:     Dias (Seg/Qua/Sex) + Frequência (1x/2x/3x)    ║
  ║    Outros tipos:    Disponibilidade (Manhã/Tarde/Noite/Fim semana) ║
  ║    Após envio:      Modal com nome + versículo personalizado        ║
  ║                                                                      ║
  ║  DEPENDE DE (carregados antes no HTML):                             ║
  ║    js/api.js  → DoaVidaAPI.addVoluntario()                          ║
  ║    js/app.js  → showToast(), abrirModal(), mascaraTelefone()       ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 1 — ESTADO E CONSTANTES
   ══════════════════════════════════════════════════════════════════════ */

/*
  EstadoWizard = estado do formulário por passos.
  Guarda as escolhas do usuário ao navegar entre os passos.
*/
var EstadoWizard = {
  passoAtual: 1,          /* passo atual: 1, 2 ou 3                    */
  tipoEscolhido: '',      /* 'intercessao' | 'voluntario' | 'doacao' | 'logistica' */
};

/*
  Configuração de cada tipo de ajuda.
  Cada tipo tem: label (texto), emoji, cor, e descrição resumida.
*/
var TIPOS_AJUDA = {
  intercessao: {
    label:    'Intercessão',
    emoji:    '🙏',
    cor:      '#ce93d8',            /* roxo/lilás                       */
    desc:     'Ore pelas famílias e pela missão',
    versiculo:  '"A oração do justo é poderosa e eficaz."',
    referencia: 'Tiago 5:16',
  },
  voluntario: {
    label:    'Trabalho Voluntário',
    emoji:    '🛠️',
    cor:      '#7dc063',            /* verde                            */
    desc:     'Ajude na triagem, montagem e entrega',
    versiculo:  '"Cada um exerça o dom que recebeu para servir aos outros."',
    referencia: '1 Pedro 4:10',
  },
  doacao: {
    label:    'Doação de Alimentos',
    emoji:    '🎁',
    cor:      '#e8c96a',            /* dourado                          */
    desc:     'Contribua com alimentos para as famílias',
    versiculo:  '"Compartilha o teu pão com o faminto."',
    referencia: 'Isaías 58:7',
  },
  logistica: {
    label:    'Apoio Logístico',
    emoji:    '🚚',
    cor:      '#64b5f6',            /* azul                             */
    desc:     'Ajude no transporte e entrega',
    versiculo:  '"Quem dá ao pobre, empresta ao Senhor."',
    referencia: 'Provérbios 19:17',
  },
};

/*
  Dias de oração disponíveis para o tipo "intercessão".
  value = valor salvo no banco, label = texto exibido.
*/
var DIAS_ORACAO = [
  { value: 'segunda', label: 'Segunda-feira' },
  { value: 'quarta',  label: 'Quarta-feira'  },
  { value: 'sexta',   label: 'Sexta-feira'   },
];

/*
  Frequências de oração disponíveis para intercessão.
*/
var FREQUENCIAS_ORACAO = [
  { value: '1x',    label: '1x por semana'  },
  { value: '2x',    label: '2x por semana'  },
  { value: '3x',    label: '3x por semana'  },
];

/*
  Disponibilidade de horário para voluntários, doadores e logística.
*/
var DISPONIBILIDADES = [
  { value: 'manha',     label: '☀️ Manhã'         },
  { value: 'tarde',     label: '🌤️ Tarde'          },
  { value: 'noite',     label: '🌙 Noite'          },
  { value: 'fim-semana',label: '🗓️ Fim de Semana'  },
];


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 2 — INICIALIZAÇÃO
   ══════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  /* Inicializa todos os módulos da página */
  inicializarWizard();          /* controla os 3 passos               */
  inicializarMascaraTelefone(); /* máscara (91) 99999-9999            */
  atualizarEstatisticas();      /* números no hero                    */
  /* Nota: formulário de oração removido — funcionalidade no admin */

  console.log('[DoaVida] voluntario.js v4.0 ✅ — wizard 3 passos');

});


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 3 — WIZARD (FLUXO POR PASSOS)
   ══════════════════════════════════════════════════════════════════════ */

/*
  Inicializa o wizard:
  - Configura o botão "Quero Ajudar" do Passo 1
  - Configura os cards de tipo do Passo 2
  - Configura o botão "Voltar" do Passo 3
*/
function inicializarWizard() {

  /* ─── PASSO 1: Botão "Quero Ajudar" ─── */
  var btnQueroAjudar = document.getElementById('btn-quero-ajudar');
  if (btnQueroAjudar) {
    btnQueroAjudar.addEventListener('click', function () {
      irParaPasso(2);
      /*
        Rola suavemente para o wizard após clicar.
        O offset de 80px compensa a navbar fixa.
      */
      var wizardEl = document.getElementById('wizard-container');
      if (wizardEl) {
        var topo = wizardEl.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: topo, behavior: 'smooth' });
      }
    });
  }

  /* ─── PASSO 2: Cards de tipo de ajuda ─── */
  /*
    Seleciona todos os cards com data-tipo="intercessao" etc.
    Ao clicar, salva o tipo e avança para o Passo 3.
  */
  document.querySelectorAll('[data-tipo-ajuda]').forEach(function (card) {

    /*
      Função de ativação do card — chamada no clique ou no teclado.
      Separa a lógica para não duplicar código.
    */
    function ativarCard() {
      var tipo = card.getAttribute('data-tipo-ajuda');
      if (!tipo) return;

      /* Guarda a escolha no estado */
      EstadoWizard.tipoEscolhido = tipo;

      /* Monta o formulário específico para o tipo */
      montarFormularioPasso3(tipo);

      /* Avança para o Passo 3 */
      irParaPasso(3);

      /* Rola para o formulário */
      var passoEl = document.getElementById('passo-3');
      if (passoEl) {
        var topo = passoEl.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: topo, behavior: 'smooth' });
      }
    }

    /* Clique do mouse */
    card.addEventListener('click', ativarCard);

    /*
      Suporte a teclado: Enter ou Space ativam o card.
      Necessário porque o card é uma <div> com tabindex=0,
      não um <button> — divs não respondem a Enter por padrão.

      Isso é uma prática de acessibilidade (WCAG 2.1 - SC 2.1.1):
      qualquer elemento interativo deve ser operável pelo teclado.
    */
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); /* evita scroll da página no Space */
        ativarCard();
      }
    });

  });

  /* ─── PASSO 3: Botão "Voltar" ─── */
  var btnVoltar = document.getElementById('wizard-btn-voltar');
  if (btnVoltar) {
    btnVoltar.addEventListener('click', function () {
      irParaPasso(2);
    });
  }

  /* ─── Formulário Passo 3: evento de submit ─── */
  /*
    Usamos delegação de eventos: um único listener no container
    captura o submit do formulário que será criado dinamicamente.
  */
  var container = document.getElementById('passo-3-form-container');
  if (container) {
    container.addEventListener('submit', function (e) {
      e.preventDefault(); /* impede recarregar a página */
      processarEnvioWizard();
    });
  }
}

/*
  Navega para um passo específico:
  - Esconde todos os painéis de passo
  - Mostra o painel do passo escolhido
  - Atualiza os indicadores visuais de progresso

  @param {number} numeroPasso → 1, 2 ou 3
*/
function irParaPasso(numeroPasso) {
  EstadoWizard.passoAtual = numeroPasso;

  /* Esconde todos os painéis */
  [1, 2, 3].forEach(function (n) {
    var el = document.getElementById('passo-' + n);
    if (el) {
      el.style.display = n === numeroPasso ? 'block' : 'none';
      el.setAttribute('aria-hidden', n !== numeroPasso ? 'true' : 'false');
    }
  });

  /* Atualiza os indicadores de progresso (bolinhas no topo) */
  [1, 2, 3].forEach(function (n) {
    var indicador = document.getElementById('step-indicator-' + n);
    if (!indicador) return;

    if (n < numeroPasso) {
      /* Passos concluídos: verde com check */
      indicador.className = 'step-indicator done';
      indicador.setAttribute('aria-label', 'Passo ' + n + ' concluído');
    } else if (n === numeroPasso) {
      /* Passo atual: dourado */
      indicador.className = 'step-indicator active';
      indicador.setAttribute('aria-current', 'step');
      indicador.setAttribute('aria-label', 'Passo ' + n + ' atual');
    } else {
      /* Passos futuros: cinza */
      indicador.className = 'step-indicator';
      indicador.removeAttribute('aria-current');
      indicador.setAttribute('aria-label', 'Passo ' + n + ' pendente');
    }
  });
}

/*
  Monta dinamicamente o formulário do Passo 3
  baseado no tipo escolhido no Passo 2.

  @param {string} tipo → 'intercessao' | 'voluntario' | 'doacao' | 'logistica'
*/
function montarFormularioPasso3(tipo) {
  var container = document.getElementById('passo-3-form-container');
  if (!container) return;

  var cfg = TIPOS_AJUDA[tipo];
  if (!cfg) return;

  /* ─── Monta o título do Passo 3 ─── */
  var titulo = document.getElementById('passo-3-titulo');
  if (titulo) {
    titulo.innerHTML =
      '<span style="margin-right:8px;">' + cfg.emoji + '</span>' +
      cfg.label;
  }
  var subtitulo = document.getElementById('passo-3-subtitulo');
  if (subtitulo) {
    subtitulo.textContent = cfg.desc;
  }

  /* ─── Monta o formulário HTML dinâmico ─── */
  var camposExtras = '';

  if (tipo === 'intercessao') {
    /*
      Formulário de Intercessão:
      - Dias disponíveis (checkboxes)
      - Frequência (radio buttons)
      - Campo bônus: oração do meio-dia
    */
    camposExtras =
      /* Dias disponíveis */
      '<div class="wf-field">' +
        '<label class="wf-label">Dias disponíveis para orar</label>' +
        '<div class="wf-check-group" role="group" aria-label="Dias disponíveis">' +
          DIAS_ORACAO.map(function (dia) {
            return '<label class="wf-check-item">' +
              '<input type="checkbox" name="dias" value="' + dia.value + '" ' +
              'class="wf-checkbox" aria-label="' + dia.label + '" />' +
              '<span class="wf-check-label">' + dia.label + '</span>' +
            '</label>';
          }).join('') +
        '</div>' +
      '</div>' +
      /* Frequência de oração */
      '<div class="wf-field">' +
        '<label class="wf-label">Frequência semanal</label>' +
        '<div class="wf-radio-group" role="group" aria-label="Frequência">' +
          FREQUENCIAS_ORACAO.map(function (f, i) {
            return '<label class="wf-radio-item">' +
              '<input type="radio" name="frequencia" value="' + f.value + '" ' +
              'class="wf-radio"' + (i === 0 ? ' checked' : '') + ' ' +
              'aria-label="' + f.label + '" />' +
              '<span class="wf-radio-label">' + f.label + '</span>' +
            '</label>';
          }).join('') +
        '</div>' +
      '</div>' +
      /* Oração do meio-dia */
      '<div class="wf-field">' +
        '<label class="wf-check-item" style="gap:10px;cursor:pointer;">' +
          '<input type="checkbox" id="oracao-meio-dia" name="meiodia" value="sim" ' +
          'class="wf-checkbox" aria-label="Participar da oração do meio-dia" />' +
          '<div>' +
            '<span class="wf-label" style="margin:0;cursor:pointer;">Oração do meio-dia 🕛</span>' +
            '<p style="font-size:.78rem;color:var(--text2);margin:2px 0 0;">1 minuto ao meio-dia orando pelas famílias</p>' +
          '</div>' +
        '</label>' +
      '</div>';

  } else {
    /*
      Formulário padrão para Voluntariado, Doação e Logística:
      - Disponibilidade de horário (checkboxes múltiplos)
    */
    camposExtras =
      '<div class="wf-field">' +
        '<label class="wf-label">Disponibilidade de horário</label>' +
        '<div class="wf-check-group" role="group" aria-label="Disponibilidade">' +
          DISPONIBILIDADES.map(function (d) {
            return '<label class="wf-check-item">' +
              '<input type="checkbox" name="disponibilidade" value="' + d.value + '" ' +
              'class="wf-checkbox" aria-label="' + d.label + '" />' +
              '<span class="wf-check-label">' + d.label + '</span>' +
            '</label>';
          }).join('') +
        '</div>' +
      '</div>';
  }

  /*
    Monta o formulário completo:
    Campos comuns (nome + telefone) + campos específicos do tipo
  */
  container.innerHTML =
    '<form id="form-wizard" novalidate>' +

      /* Campo oculto: guarda o tipo escolhido */
      '<input type="hidden" id="wf-tipo" value="' + tipo + '" />' +

      /* ── Nome ── */
      '<div class="wf-field" id="wff-nome">' +
        '<label class="wf-label" for="wf-nome">' +
          'Nome completo <span style="color:#e55a5a;" aria-hidden="true">*</span>' +
        '</label>' +
        '<div class="wf-input-wrap">' +
          '<i class="fas fa-user wf-prefix" aria-hidden="true"></i>' +
          '<input type="text" id="wf-nome" name="nome" class="wf-input" ' +
          'placeholder="Seu nome completo" maxlength="80" ' +
          'autocomplete="name" required aria-required="true" />' +
        '</div>' +
        '<span id="wff-nome-msg" class="wf-msg" role="alert"></span>' +
      '</div>' +

      /* ── Telefone ── */
      '<div class="wf-field" id="wff-tel">' +
        '<label class="wf-label" for="wf-telefone">' +
          'WhatsApp <span style="color:#e55a5a;" aria-hidden="true">*</span>' +
        '</label>' +
        '<div class="wf-input-wrap">' +
          '<i class="fab fa-whatsapp wf-prefix" style="color:#25d366;" aria-hidden="true"></i>' +
          '<input type="tel" id="wf-telefone" name="telefone" class="wf-input" ' +
          'placeholder="(91) 99999-9999" maxlength="15" ' +
          'inputmode="numeric" required aria-required="true" />' +
        '</div>' +
        '<span id="wff-tel-msg" class="wf-msg" role="alert"></span>' +
      '</div>' +

      /* ── Campos extras específicos do tipo ── */
      camposExtras +

      /* ── Botão de envio ── */
      '<button type="submit" class="wf-btn" id="wf-btn-submit" ' +
      'style="margin-top:8px;">' +
        '<span class="wf-spinner" aria-hidden="true"></span>' +
        '<span class="wf-btn-lbl">' +
          cfg.emoji + ' Confirmar participação' +
        '</span>' +
      '</button>' +

      '<p style="text-align:center;font-size:.72rem;color:var(--text2);margin-top:10px;">' +
        '<i class="fas fa-lock" aria-hidden="true" ' +
        'style="color:var(--gold);margin-right:4px;"></i>' +
        'Seus dados são usados apenas para contato.' +
      '</p>' +

    '</form>';

  /* Ativa a máscara de telefone no campo recém-criado */
  var inputTel = document.getElementById('wf-telefone');
  if (inputTel) {
    inputTel.addEventListener('input', function () {
      window.mascaraTelefone(inputTel);
    });
    inputTel.addEventListener('paste', function () {
      setTimeout(function () { window.mascaraTelefone(inputTel); }, 0);
    });
  }
}


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 4 — PROCESSAMENTO DO ENVIO (WIZARD)
   ══════════════════════════════════════════════════════════════════════ */

/*
  Processa o envio do formulário do Passo 3.
  Fluxo: ler → validar → loading → salvar → modal de sucesso → limpar
*/
function processarEnvioWizard() {

  var tipo     = getValWizard('wf-tipo');
  var nome     = getValWizard('wf-nome');
  var telefone = getValWizard('wf-telefone');

  /* Remove estados de erro anteriores */
  limparErrosWizard();
  var erros = [];

  /* Valida nome */
  if (nome.length < 3) {
    marcarErroWizard('wff-nome', 'wff-nome-msg', 'Informe seu nome completo.');
    erros.push('nome');
  }

  /* Valida telefone */
  if (!validarTelefone(telefone)) {
    marcarErroWizard('wff-tel', 'wff-tel-msg', 'Informe um telefone com DDD válido.');
    erros.push('telefone');
  }

  if (erros.length > 0) {
    window.showToast('⚠️ Preencha os campos obrigatórios.', 'warning', 3000);
    focarPrimeiroErroWizard();
    return;
  }

  /* Ativa loading */
  setLoadingWizard(true);

  setTimeout(async function () {
    try {

      /* ─── Coleta campos extras por tipo ─── */
      var dadosExtras = {};

      if (tipo === 'intercessao') {
        /* Coleta os checkboxes de dias marcados */
        var diasMarcados = [];
        document.querySelectorAll('input[name="dias"]:checked').forEach(function (cb) {
          diasMarcados.push(cb.value);
        });
        dadosExtras.dias = diasMarcados;

        /* Coleta o radio de frequência */
        var freqEl = document.querySelector('input[name="frequencia"]:checked');
        dadosExtras.frequencia = freqEl ? freqEl.value : '1x';

        /* Oração do meio-dia */
        var meiodia = document.getElementById('oracao-meio-dia');
        dadosExtras.meiodia = meiodia ? meiodia.checked : false;

      } else {
        /* Coleta checkboxes de disponibilidade */
        var disponibilidades = [];
        document.querySelectorAll('input[name="disponibilidade"]:checked').forEach(function (cb) {
          disponibilidades.push(cb.value);
        });
        dadosExtras.disponibilidade = disponibilidades;
      }

      /* ─── Salva via DoaVidaSync (Supabase) ─── */
      var cfg = TIPOS_AJUDA[tipo] || {};
      var payload = {
        nome:       capitalizar(nome),
        telefone:   telefone,
        tipo:       tipo,
        tipo_label: cfg.label || tipo,
        dados:      dadosExtras,
      };

      var voluntario = await DoaVidaSync.addVoluntario(payload);

      /*
        Mescla os dados extras de volta no objeto retornado pelo Supabase
        para que exibirModalSucessoWizard() possa exibir disponibilidade/dias.
      */
      voluntario = Object.assign({ dados: dadosExtras }, voluntario);

      /* ─── Modal de sucesso personalizado ─── */
      exibirModalSucessoWizard(voluntario);

      /* ─── Notifica admins via WhatsApp ─── */
      try { notificarAdminNovoVoluntario(voluntario); } catch(e) {}

      /* ─── Limpa e volta ao Passo 2 ─── */
      irParaPasso(2);
      atualizarEstatisticas();

    } catch (err) {
      console.error('[DoaVida] Erro ao salvar voluntário:', err.message);
      window.showToast('❌ Erro ao registrar. Tente novamente.', 'error', 4000);
    }

    setLoadingWizard(false);

  }, 800); /* delay para sensação de processamento */
}


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 5 — MODAL DE SUCESSO PERSONALIZADO
   ══════════════════════════════════════════════════════════════════════ */

/*
  Exibe o modal #modal-sucesso com conteúdo personalizado.

  Para INTERCESSÃO:
    Mensagem espiritual + Filipenses 4:6
    Confirma os dias e frequência escolhidos

  Para os demais tipos:
    Mensagem de boas-vindas + versículo do tipo
    Confirma a disponibilidade escolhida

  @param {Object} voluntario → retornado por DoaVidaAPI.addVoluntario()
*/
function exibirModalSucessoWizard(voluntario) {
  var nome = capitalizar(voluntario.nome);
  var tipo = voluntario.tipo;
  var cfg  = TIPOS_AJUDA[tipo] || TIPOS_AJUDA.voluntario;
  var dados = voluntario.dados || {};

  /* ─── Monta a mensagem de confirmação ─── */
  var detalheConfirmacao = '';

  if (tipo === 'intercessao') {
    /* Mostra os dias e frequência escolhidos */
    var diasLabel = (dados.dias || []).map(function (d) {
      var found = DIAS_ORACAO.filter(function (x) { return x.value === d; })[0];
      return found ? found.label : d;
    });
    if (diasLabel.length > 0) {
      detalheConfirmacao = '🗓️ Dias: ' + diasLabel.join(', ');
    }
    var freqFound = FREQUENCIAS_ORACAO.filter(function (x) {
      return x.value === dados.frequencia;
    })[0];
    if (freqFound) {
      detalheConfirmacao += (detalheConfirmacao ? ' · ' : '') +
        '🔄 ' + freqFound.label;
    }
    if (dados.meiodia) {
      detalheConfirmacao += ' · 🕛 Oração do meio-dia';
    }
  } else {
    /* Mostra as disponibilidades escolhidas */
    var dispLabel = (dados.disponibilidade || []).map(function (d) {
      var found = DISPONIBILIDADES.filter(function (x) { return x.value === d; })[0];
      return found ? found.label : d;
    });
    if (dispLabel.length > 0) {
      detalheConfirmacao = '⏰ Disponível: ' + dispLabel.join(', ');
    }
  }

  /* ─── Preenche os elementos do modal ─── */

  var elEmoji = document.getElementById('success-emoji');
  if (elEmoji) elEmoji.textContent = cfg.emoji;

  /* Título com nome em destaque */
  var elTitulo = document.getElementById('success-titulo');
  if (elTitulo) {
    /*
      innerHTML é seguro aqui pois escHtml() foi aplicado ao nome,
      então não há risco de injeção de código malicioso.
    */
    elTitulo.innerHTML =
      '<span class="nome-destaque">' + escHtml(nome) + '</span>,' +
      ' obrigado por se juntar à missão!';
  }

  /* Corpo da mensagem */
  var elCorpo = document.getElementById('success-corpo');
  if (elCorpo) {
    var corpo = '';
    if (tipo === 'intercessao') {
      corpo = 'Sua oração é a base de tudo que fazemos. ' +
        'Nossa equipe entrará em contato para alinhar os detalhes.';
    } else {
      corpo = 'Recebemos seu interesse e em breve entraremos em contato ' +
        'para combinar tudo com você.';
    }
    if (detalheConfirmacao) {
      corpo += '\n\n' + detalheConfirmacao;
    }
    elCorpo.textContent = corpo;
  }

  /* Versículo específico do tipo */
  var elVers = document.getElementById('success-versiculo');
  if (elVers) elVers.textContent = cfg.versiculo;

  var elRef = document.getElementById('success-referencia');
  if (elRef) elRef.textContent = cfg.referencia;

  /* Link de compartilhamento WhatsApp */
  var elWA = document.getElementById('success-whatsapp');
  if (elWA) {
    var msgWA =
      'Acabei de me cadastrar como ' + cfg.label + ' no DoaVida! ' + cfg.emoji +
      '\nAção Social Semear + Maanaim — Belém, PA 🌱';
    elWA.href = 'whatsapp://send?text=' + encodeURIComponent(msgWA);
  }

  /* Abre o modal */
  window.abrirModal('modal-sucesso');
  window.showToast('✅ Cadastro realizado com sucesso!', 'success', 4000);
}


/* ══════════════════════════════════════════════════════════════════════
   NOTIFICAÇÃO DE ADMIN — Novo voluntário cadastrado
   Envia WhatsApp para todos os números de admin configurados.
   ══════════════════════════════════════════════════════════════════════ */
function notificarAdminNovoVoluntario(voluntario) {
  try {
    var cfg = window.DoaVidaAPI && DoaVidaAPI.getWaConfig ? DoaVidaAPI.getWaConfig() : null;
    var numeros = (cfg && cfg.adminNumbers) ? cfg.adminNumbers : [];
    if (!numeros.length) return; /* sem números configurados */

    var tipoLabel = voluntario.tipoLabel || voluntario.tipo || 'Voluntário';
    var msg = '🔔 *Novo Cadastro de Voluntário*\n\n' +
      '👤 Nome: ' + (voluntario.nome || '—') + '\n' +
      '📱 Telefone: ' + (voluntario.telefone || '—') + '\n' +
      '🤝 Tipo: ' + tipoLabel + '\n' +
      '📅 ' + new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) + '\n\n' +
      '_Acesse o painel admin para gerenciar._';

    /* Abre WA para o primeiro número admin disponível */
    var fone = numeros[0].replace(/\D/g, '');
    if (fone) {
      abrirWhatsApp('whatsapp://send?phone=55' + fone + '&text=' + encodeURIComponent(msg));
    }
  } catch(e) { /* silencioso — não bloqueia o fluxo */ }
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 7 — ESTATÍSTICAS DO HERO
   ══════════════════════════════════════════════════════════════════════ */

function atualizarEstatisticas() {
  /* Lê do Supabase — assíncrono e silencioso */
  DoaVidaSync.getVoluntarios().then(function (lista) {
    var elTotal = document.getElementById('vol-stat-total');
    if (elTotal) elTotal.textContent = lista.length || 0;
    var ativos = lista.filter(function (v) {
      return v.status === 'confirmado' || v.status === 'participando';
    }).length;
    var elConf = document.getElementById('vol-stat-confirmados');
    if (elConf) elConf.textContent = ativos;
  }).catch(function () { /* silencioso */ });
}


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 8 — MÁSCARA DE TELEFONE
   ══════════════════════════════════════════════════════════════════════ */

function inicializarMascaraTelefone() {
  /*
    O campo de telefone do wizard é criado dinamicamente
    em montarFormularioPasso3(). Por isso, a máscara é
    aplicada lá, não aqui.
    Esta função fica para o campo do form de oração, se existir.
  */
  var inputOrac = document.getElementById('orac-tel');
  if (inputOrac) {
    inputOrac.addEventListener('input', function () {
      window.mascaraTelefone(inputOrac);
    });
  }
}


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 9 — VALIDAÇÃO DOS CAMPOS
   ══════════════════════════════════════════════════════════════════════ */

/*
  Valida o telefone: deve ter 10 ou 11 dígitos.
  @param  {string}  tel → com ou sem máscara
  @returns {boolean}
*/
function validarTelefone(tel) {
  if (!tel) return false;
  var numeros = tel.replace(/\D/g, ''); /* remove tudo que não é dígito */
  return numeros.length >= 10 && numeros.length <= 11;
}

/*
  Marca um campo de formulário como inválido.
  @param {string} idCampo → id do div container (ex: 'wff-nome')
  @param {string} idMsg   → id do span de mensagem (ex: 'wff-nome-msg')
  @param {string} texto   → texto do erro
*/
function marcarErroWizard(idCampo, idMsg, texto) {
  var campo = document.getElementById(idCampo);
  var msgEl = document.getElementById(idMsg);
  if (campo) { campo.classList.add('err'); campo.classList.remove('ok'); }
  if (msgEl) msgEl.textContent = texto;
}

/* Remove todas as marcações de erro dos campos do wizard */
function limparErrosWizard() {
  document.querySelectorAll('.wf-field').forEach(function (el) {
    el.classList.remove('err', 'ok');
  });
}

/* Foca no primeiro campo com erro para melhorar UX */
function focarPrimeiroErroWizard() {
  var primeiro = document.querySelector('.wf-field.err');
  if (!primeiro) return;
  primeiro.scrollIntoView({ behavior: 'smooth', block: 'center' });
  var input = primeiro.querySelector('input, select, textarea');
  if (input) setTimeout(function () { input.focus(); }, 300);
}


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 10 — ESTADO DO BOTÃO (LOADING)
   ══════════════════════════════════════════════════════════════════════ */

/*
  Ativa/desativa o loading no botão de envio do wizard.
  Quando ativo: mostra spinner, esconde texto, desabilita cliques.
*/
function setLoadingWizard(ativo) {
  var btn = document.getElementById('wf-btn-submit');
  if (!btn) return;
  if (ativo) {
    btn.disabled = true;
    btn.classList.add('loading');
  } else {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
}


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 11 — UTILITÁRIOS LOCAIS
   ══════════════════════════════════════════════════════════════════════ */

/*
  Lê o valor de um campo por ID, removendo espaços extras.
  Retorna '' se o elemento não existir (evita erros).
*/
function getValWizard(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/*
  Capitaliza a primeira letra de cada palavra.
  'maria da silva' → 'Maria Da Silva'
*/
function capitalizar(texto) {
  if (!texto) return '';
  return String(texto).toLowerCase().split(' ').map(function (p) {
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(' ');
}

/*
  Escapa caracteres HTML para prevenir XSS.
  Sempre use antes de inserir dados do usuário em innerHTML.
*/
function escHtml(str) {
  if (typeof window.escHtml === 'function') return window.escHtml(str);
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/* ══════════════════════════════════════════════════════════════════════
   LOG FINAL
   ══════════════════════════════════════════════════════════════════════ */
console.log('[DoaVida] voluntario.js ✅ v4.0 — wizard 3 passos · intercessão · voluntariado · oração');
