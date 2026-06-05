/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  DoaVida — js/admin.js  v4.0                                        ║
  ║  Painel Administrativo — lógica completa                            ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  📚 O QUE É ESTE ARQUIVO?                                           ║
  ║                                                                      ║
  ║  admin.js controla TUDO que acontece no painel administrativo.      ║
  ║  É o "cérebro" do admin: lê dados do api.js, monta as telas,       ║
  ║  responde a cliques, valida formulários, abre modais...             ║
  ║                                                                      ║
  ║  DEPENDE DE (devem ser carregados ANTES deste arquivo):             ║
  ║    js/api.js  → DoaVidaAPI, lerArray(), salvar(), gerarId()         ║
  ║    js/app.js  → showToast(), escHtml(), abrirModal(), fecharModal() ║
  ║                                                                      ║
  ║  BUGS CORRIGIDOS NESTA VERSÃO (v4.0):                               ║
  ║  ✅ BUG 1 — renderAlimentos: 'foods-grid' → 'foods-admin-grid'     ║
  ║  ✅ BUG 2 — renderGraficoBarras: 'food-chart' → 'foods-chart'      ║
  ║  ✅ BUG 3 — configurarUploadFoto: IDs corretos do HTML             ║
  ║             'photo-upload-input' → 'photo-file-input'              ║
  ║             'photo-upload-preview' → 'photo-preview'               ║
  ║  ✅ BUG 4 — configurarFotoToggle: IDs corretos                     ║
  ║             'btn-foto-upload' → 'btn-photo-upload'                 ║
  ║             'btn-foto-url'    → 'btn-photo-url'                    ║
  ║             'photo-area-upload' → 'photo-upload-area'              ║
  ║             'photo-area-url'    → 'photo-url-area'                 ║
  ║  ✅ BUG 5 — salvarFoto: 'photo-url' → 'photo-url-input'           ║
  ║  ✅ BUG 6 — configurarWhatsApp: IDs corretos                       ║
  ║             'wa-template-select' → 'wa-template'                   ║
  ║             'wa-preview' → 'wa-preview-text'                       ║
  ║  ✅ BUG 7 — adicionarDestinatario: 'wa-recipient-input' → 'wa-phone-input'
  ║  ✅ BUG 8 — renderWALogs: 'wa-logs-tbody' → 'wa-logs-list'        ║
  ║                                                                      ║
  ║  NOVIDADES:                                                          ║
  ║  🆕 Sistema de Tarefas completo (aba Tarefas)                       ║
  ║  🆕 Envio de tarefa por WhatsApp com 1 clique                       ║
  ║  🆕 Filtros por status, tipo e responsável                          ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 1 — ESTADO GLOBAL E CONSTANTES
   ══════════════════════════════════════════════════════════════════════ */

/*
  AdminState = estado interno do painel.
  Armazena dados temporários que só existem enquanto a página está aberta.
  São perdidos ao recarregar a página (não ficam no localStorage).
*/
var AdminState = {
  waRecipients: [] /* números WhatsApp dos destinatários da aba WA */,
  pendingPhotos: [] /* arquivos de foto aguardando upload            */,
  photoMode: "upload" /* modo atual: 'upload' (arquivo) ou 'url'      */,
  chartInstance: null /* instância do gráfico Chart.js (evita recriar)*/,
};

/*
  Templates de mensagem prontos para envio em massa via WhatsApp.
  O usuário seleciona um e edita se quiser antes de enviar.
*/
var WA_TEMPLATES = {
  agradecimento:
    "Olá! 🌱\n\nEm nome da Ação Social Semear, agradecemos sua doação de alimentos.\n\nSua generosidade transforma vidas em Belém, PA!\n\nQue Deus abençoe você! 💛",
  confirmacao:
    "Olá! ✅\n\nSua doação foi confirmada. Nossa equipe passará em breve.\n\nObrigado pela solidariedade! 🙏",
  campanha:
    "Olá! 🙏\n\nA Ação Social Semear está arrecadando alimentos para famílias em Belém.\n\nQualquer quantidade ajuda: arroz, feijão, óleo...\n\nAcesse e doe: [link]\n\nGratos! 💛",
  lembrete:
    "Olá! 🌱\n\nPassando para lembrar da sua doação prometida. Qualquer quantidade é muito bem-vinda!\n\nObrigado 🙏",
};

/* Mapa de status dos voluntários com cores para os badges */
var STATUS_VOL = {
  novo: { label: "Novo", cor: "#e8c96a" },
  "em-contato": { label: "Em Contato", cor: "#64b5f6" },
  confirmado: { label: "Confirmado", cor: "#81c784" },
  participando: { label: "Participando", cor: "#4db6ac" },
  finalizado: { label: "Finalizado", cor: "#90a4ae" },
};

/* Mapa de categorias dos pedidos de oração */
var CAT_ORACAO = {
  familia: { label: "Família", emoji: "👨‍👩‍👧", cor: "#f48fb1" },
  espiritual: { label: "Espiritual", emoji: "🕊️", cor: "#ce93d8" },
  saude: { label: "Saúde", emoji: "💚", cor: "#80cbc4" },
  outros: { label: "Outros", emoji: "💛", cor: "#e8c96a" },
};

/* Mapa de tipos e status de tarefas */
var TIPOS_TAREFA = {
  organizacao: { label: "Organização", emoji: "📦", cor: "#e8c96a" },
  entrega: { label: "Entrega", emoji: "🚚", cor: "#64b5f6" },
  atendimento: { label: "Atendimento", emoji: "🤝", cor: "#81c784" },
  espiritual: { label: "Espiritual", emoji: "🙏", cor: "#ce93d8" },
};

var STATUS_TAREFA = {
  pendente: { label: "Pendente", cor: "#e8c96a" },
  "em-andamento": { label: "Em Andamento", cor: "#64b5f6" },
  concluida: { label: "Concluída", cor: "#81c784" },
};

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 2 — INICIALIZAÇÃO
   ══════════════════════════════════════════════════════════════════════ */

/*
  DOMContentLoaded = dispara quando o HTML foi completamente carregado.
  É o ponto de entrada do admin.js — tudo começa aqui.
*/
document.addEventListener("DOMContentLoaded", function () {
  /* Verifica se está na página do admin (se não, sai sem erro) */
  if (!document.getElementById("login-screen")) return;

  /* Garante que o cliente Supabase esteja inicializado */
  if (typeof inicializarSupabase === 'function') inicializarSupabase();

  /* Configura todos os componentes do painel */
  configurarLogin();
  configurarLogout();
  configurarAbas();
  configurarModais();
  configurarWhatsApp();
  configurarUploadFoto();
  configurarFotoToggle();
  configurarBuscaFiltros();
  configurarBotoesModal();
  configurarConfiguracoes();

  /* Verifica se já existe sessão válida — abre o painel direto se admin */
  _adminVerificarSessaoAtiva();
  /* Escuta mudanças de sessão (logout em outra aba, token expirado) */
  _adminWatchAuth();
  /* Encerra sessão ao sair para o site público */
  _adminConfigurarSaidaParaSite();
}); /* fim DOMContentLoaded */

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 3 — AUTENTICAÇÃO (Firebase Authentication real)
   ══════════════════════════════════════════════════════════════════════ */

/* true enquanto o fluxo de login está em andamento — impede que o
   listener de sessão abra o painel antes da animação terminar */
var _loginEmAndamento = false;

function _adminTraduzErro(codigo) {
  var m = String(codigo || '').toLowerCase();
  if (m.indexOf('invalid-credential') >= 0 || m.indexOf('wrong-password') >= 0 || m.indexOf('invalid-email') >= 0)
    return 'E-mail ou senha inválidos. Verifique e tente novamente.';
  if (m.indexOf('user-not-found') >= 0)
    return 'Usuário não encontrado. Verifique o e-mail.';
  if (m.indexOf('too-many-requests') >= 0)
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (m.indexOf('network-request-failed') >= 0 || m.indexOf('offline') >= 0)
    return 'Sem conexão com a internet. Verifique sua rede.';
  return 'Não foi possível validar suas credenciais. Tente novamente.';
}

/*
  Listener único de Auth — cuida de dois casos:
  1. Sessão restaurada ao recarregar a página → abre painel direto
  2. Logout detectado (outra aba) → recarrega a página
*/
function _adminVerificarSessaoAtiva() {
  if (typeof firebase === 'undefined' || !firebase.auth) return;

  firebase.auth().onAuthStateChanged(function (user) {
    var panel      = document.getElementById('admin-panel');
    var painelAberto = panel && panel.classList.contains('visible');

    if (user && !_loginEmAndamento && !painelAberto) {
      /* Sessão restaurada ao recarregar — abre o painel direto */
      abrirPainel();
    } else if (!user && painelAberto) {
      /* Logout em outra aba ou token expirado */
      location.reload();
    }
  });
}

/* Mantido por compatibilidade — o listener já está em _adminVerificarSessaoAtiva */
function _adminWatchAuth() {}

/*
  Intercepta cliques em qualquer link que leve de volta ao site público
  enquanto o painel admin estiver aberto — faz signOut antes de navegar,
  garantindo que o admin precise fazer login novamente ao retornar.
*/
function _adminConfigurarSaidaParaSite() {
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href="index.html"]');
    if (!link) return;

    var panel = document.getElementById('admin-panel');
    if (!panel || !panel.classList.contains('visible')) return;

    e.preventDefault();
    DoaVidaSync.logout().then(function () {
      window.location.href = 'index.html';
    }).catch(function () {
      window.location.href = 'index.html';
    });
  });
}

/* ── Helpers do overlay biométrico fullscreen ────────────────────── */

var _bioMsgInterval = null;

function _bioMostrarOverlay() {
  var ov = document.getElementById('bio-overlay');
  if (!ov) return;
  ov.classList.remove('bio-ov--ok', 'bio-ov--error');
  ov.style.display = 'flex';
  setTimeout(function () { ov.classList.add('bio-ov--visible'); }, 10);

  var prog  = document.getElementById('bio-ov-progress');
  var msg   = document.getElementById('bio-ov-msg');
  var badge = document.getElementById('bio-ov-badge-txt');
  var dot   = document.getElementById('bio-ov-dot');
  if (prog)  { prog.style.transition = 'none'; prog.style.width = '0%'; }
  if (msg)   msg.textContent = 'Iniciando verificação segura…';
  if (badge) badge.textContent = 'VERIFICANDO';
  if (dot)   dot.style.animationPlayState = 'running';

  var msgs = [
    'Iniciando verificação segura…',
    'Validando credenciais…',
    'Consultando permissões…',
    'Confirmando acesso administrativo…',
    'Protegendo sessão…'
  ];
  var idx = 0;
  var pct = 0;

  function tick() {
    if (!msg || !prog) return;
    idx = (idx + 1) % msgs.length;
    pct = Math.min(pct + 16, 82);
    msg.style.opacity = '0';
    setTimeout(function () { msg.textContent = msgs[idx]; msg.style.opacity = '1'; }, 180);
    prog.style.transition = 'width 0.45s ease';
    prog.style.width = pct + '%';
  }

  clearInterval(_bioMsgInterval);
  _bioMsgInterval = setInterval(tick, 480);
}

/* Atualiza a mensagem do overlay sem interromper a animação do progresso */
function _bioAtualizarMensagem(texto) {
  var msg = document.getElementById('bio-ov-msg');
  if (!msg) return;
  msg.style.opacity = '0';
  setTimeout(function () { msg.textContent = texto; msg.style.opacity = '1'; }, 150);
}

function _bioOverlaySucesso(cb) {
  clearInterval(_bioMsgInterval);
  var ov    = document.getElementById('bio-overlay');
  var msg   = document.getElementById('bio-ov-msg');
  var badge = document.getElementById('bio-ov-badge-txt');
  var prog  = document.getElementById('bio-ov-progress');
  var dot   = document.getElementById('bio-ov-dot');

  if (ov)    ov.classList.add('bio-ov--ok');
  if (msg)   { msg.style.opacity = '0'; setTimeout(function () { msg.textContent = 'Acesso autorizado.'; msg.style.opacity = '1'; }, 200); }
  if (badge) badge.textContent = 'AUTORIZADO';
  if (prog)  { prog.style.transition = 'width 0.5s ease'; prog.style.width = '100%'; }
  if (dot)   dot.style.animationPlayState = 'paused';

  setTimeout(function () { cb(); }, 1300);
}

function _bioOverlayErro(cb) {
  clearInterval(_bioMsgInterval);
  var ov    = document.getElementById('bio-overlay');
  var msg   = document.getElementById('bio-ov-msg');
  var badge = document.getElementById('bio-ov-badge-txt');

  if (ov)    ov.classList.add('bio-ov--error');
  if (msg)   { msg.style.opacity = '0'; setTimeout(function () { msg.textContent = 'Acesso negado.'; msg.style.opacity = '1'; }, 200); }
  if (badge) badge.textContent = 'ACESSO NEGADO';

  setTimeout(function () { _bioFecharOverlay(); setTimeout(cb, 350); }, 1600);
}

function _bioFecharOverlay() {
  var ov = document.getElementById('bio-overlay');
  if (!ov) return;
  ov.classList.remove('bio-ov--visible');
  setTimeout(function () { ov.style.display = 'none'; }, 420);
}

/* ── Configuração dos eventos do formulário de login ─────────────── */
function configurarLogin() {
  var btn    = document.getElementById("login-btn");
  var pwEl   = document.getElementById("login-password");
  var emEl   = document.getElementById("login-email");
  var toggle = document.getElementById("toggle-password");

  if (btn)  btn.addEventListener("click", tentarLogin);

  /* Enter em qualquer campo dispara o login */
  [emEl, pwEl].forEach(function (el) {
    if (el) el.addEventListener("keydown", function (e) {
      if (e.key === "Enter") tentarLogin();
    });
  });

  /* Botão olho — mostra/oculta senha */
  if (toggle && pwEl) {
    toggle.addEventListener("click", function () {
      var icone = document.getElementById("eye-icon");
      if (pwEl.type === "password") {
        pwEl.type = "text";
        if (icone) icone.className = "fas fa-eye-slash";
        toggle.setAttribute("aria-label", "Ocultar senha");
      } else {
        pwEl.type = "password";
        if (icone) icone.className = "fas fa-eye";
        toggle.setAttribute("aria-label", "Mostrar senha");
      }
    });
  }
}

/* ── tentarLogin — Firebase Authentication real ─────────────────── */
function tentarLogin() {
  var emEl   = document.getElementById("login-email");
  var pwEl   = document.getElementById("login-password");
  var errEl  = document.getElementById("login-error");
  var errTxt = document.getElementById("login-error-txt");
  var btn    = document.getElementById("login-btn");

  var email = emEl ? emEl.value.trim() : "";
  var senha  = pwEl ? pwEl.value        : "";

  function _mostrarErro(msg) {
    if (errTxt) errTxt.textContent = msg;
    if (errEl)  errEl.classList.add("visible");
  }

  if (!email) { if (emEl) emEl.focus(); return; }
  if (!senha)  { if (pwEl) pwEl.focus(); return; }

  /* Bloqueia múltiplos cliques e impede listener de abrir painel antes da hora */
  _loginEmAndamento = true;
  if (btn) { btn.disabled = true; btn.classList.add("bio-btn--scanning"); }
  if (errEl) errEl.classList.remove("visible");

  _bioMostrarOverlay();

  (async function () {
    try {
      _bioAtualizarMensagem('Autenticando no Firebase…');

      /* Login real via Firebase Authentication */
      await DoaVidaSync.login(email, senha);

      _bioAtualizarMensagem('Abrindo painel…');

      /* ✅ Sucesso — abre painel após a animação */
      _bioOverlaySucesso(function () {
        _loginEmAndamento = false;
        _bioFecharOverlay();
        if (btn) { btn.classList.remove("bio-btn--scanning"); btn.classList.add("bio-btn--ok"); }
        abrirPainel();
      });

    } catch (e) {
      _loginEmAndamento = false;
      var mensagem = _adminTraduzErro(e.message);
      _bioOverlayErro(function () {
        _mostrarErro(mensagem);
        if (pwEl) { pwEl.value = ""; pwEl.focus(); }
        if (btn) {
          btn.disabled = false;
          btn.classList.remove("bio-btn--scanning", "bio-btn--ok");
          btn.classList.add("bio-btn--error");
          setTimeout(function () { btn.classList.remove("bio-btn--error"); }, 1500);
        }
      });
    }
  })();
}
window.tentarLogin = tentarLogin;

/*
  Abre o painel administrativo depois do login:
  - Esconde a tela de login
  - Mostra a navbar
  - Mostra o painel
  - Carrega todos os dados
*/
function abrirPainel() {
  var loginScreen = document.getElementById("login-screen");
  var nav = document.getElementById("nav");
  var panel = document.getElementById("admin-panel");

  if (loginScreen) loginScreen.classList.add("hidden");
  if (nav) nav.style.display = "block";
  if (panel) panel.classList.add("visible");

  /* Banner de status de conexão com Firebase */
  _mostrarStatusFirebase();

  carregarTodosDados();

  /* Inicia sincronização em tempo real via Supabase Realtime (WebSocket) */
  iniciarSincronizacaoRealtime();

  /* Adiciona efeito de sombra na navbar ao rolar */
  window.addEventListener(
    "scroll",
    function () {
      var n = document.getElementById("nav");
      if (n) n.classList.toggle("scrolled", window.scrollY > 50);
    },
    { passive: true },
  );
}

/* Mostra um banner informando se está conectado ao Firebase ou em modo local */
function _mostrarStatusFirebase() {
  var ok = window._doaVidaFirestoreOk;
  var bannerId = 'adm-firebase-banner';
  var existente = document.getElementById(bannerId);
  if (existente) existente.remove();

  var banner = document.createElement('div');
  banner.id = bannerId;
  banner.style.cssText = [
    'position:fixed', 'bottom:72px', 'left:50%', 'transform:translateX(-50%)',
    'z-index:9999', 'padding:10px 18px', 'border-radius:10px', 'font-size:.82rem',
    'font-family:var(--font-mono,monospace)', 'display:flex', 'align-items:center',
    'gap:10px', 'box-shadow:0 4px 16px rgba(0,0,0,.18)',
    'background:' + (ok ? '#1A3312' : '#8A1818'),
    'color:#F4F0E6', 'max-width:92vw'
  ].join(';');

  if (ok) {
    banner.innerHTML = '☁️ <strong>Firebase ativo</strong> — dados sincronizados entre dispositivos' +
      '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:#F4F0E6;cursor:pointer;font-size:.9rem;margin-left:6px">✕</button>';
    setTimeout(function () { if (banner.parentElement) banner.remove(); }, 6000);
  } else {
    banner.innerHTML = '⚠️ <strong>Modo local</strong> — dados NÃO sincronizados. ' +
      '<button id="btn-migrar-firebase" style="background:#E8C96A;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:.78rem;color:#1A1A18;font-weight:600;margin-left:8px">' +
      'Enviar para o Firebase</button>' +
      '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:#F4F0E6;cursor:pointer;font-size:.9rem;margin-left:4px">✕</button>';
    setTimeout(function () {
      var btn = document.getElementById('btn-migrar-firebase');
      if (!btn) return;
      btn.addEventListener('click', function () {
        btn.textContent = 'Enviando...';
        btn.disabled = true;
        DoaVidaSync.migrarLocalParaFirestore().then(function (r) {
          if (r.ok) {
            showToast('✅ ' + r.migrados + ' alimento(s) enviado(s) ao Firebase!', 'success');
            banner.remove();
            renderAlimentos();
          } else {
            showToast('❌ ' + (r.msg || 'Falha na migração'), 'error');
            btn.textContent = 'Tentar novamente';
            btn.disabled = false;
          }
        });
      });
    }, 100);
  }

  document.body.appendChild(banner);
}

/* Configura o botão de logout — encerra sessão Firebase e recarrega */
function configurarLogout() {
  var btn = document.getElementById("logout-btn");
  if (!btn) return;
  btn.addEventListener("click", function () {
    if (!confirm("Deseja sair do painel?")) return;
    DoaVidaSync.logout().then(function () { location.reload(); }).catch(function () { location.reload(); });
  });
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 4 — SISTEMA DE ABAS
   Controla qual aba do painel está ativa.
   ══════════════════════════════════════════════════════════════════════ */

/*
  Move e redimensiona o indicador de âncora deslizante para o botão ativo.

  O indicador (#admin-tab-indicator) é um <span> absolutamente posicionado
  dentro de .admin-tabs (position:relative). Ao ler btn.offsetLeft e
  btn.offsetWidth obtemos a posição e largura exatas do botão dentro do
  contêiner scrollável — independente do scroll atual — e aplicamos ao
  indicador via style.left / style.width. A transição CSS cubic-bezier
  cria o efeito de "deslizamento e redimensionamento elástico".

  @param {HTMLElement} btn — o botão .admin-tab-btn que ficou ativo
*/
function moveTabIndicator(btn) {
  var indicator = document.getElementById("admin-tab-indicator");
  if (!indicator || !btn) return;
  indicator.style.left  = btn.offsetLeft  + "px";
  indicator.style.width = btn.offsetWidth + "px";
}

/*
  Adiciona listeners nos botões de aba.
  Cada botão tem data-tab="nome" — usamos para saber qual ativar.
*/
function configurarAbas() {
  document.querySelectorAll(".admin-tab-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      ativarAba(btn.dataset.tab);
    });
  });

  /* Inicializa o indicador na aba ativa padrão.
     requestAnimationFrame aguarda o primeiro paint para que as
     dimensões reais dos botões já tenham sido calculadas pelo browser. */
  requestAnimationFrame(function () {
    var initBtn = document.querySelector(".admin-tab-btn.active");
    moveTabIndicator(initBtn);
  });

  /* Reposiciona o indicador se a janela mudar de tamanho
     (ex.: rotação de tela no mobile, zoom, snap de janela). */
  window.addEventListener("resize", function () {
    var activeBtn = document.querySelector(".admin-tab-btn.active");
    moveTabIndicator(activeBtn);
  });
}

/*
  Ativa uma aba pelo nome:
  1. Remove 'active' de TODOS os botões e painéis
  2. Adiciona 'active' no botão e painel correspondentes
  3. Rola o botão para ficar visível no menu (em mobile)

  @param {string} nome → ex: 'overview', 'voluntarios', 'tarefas'
*/
function ativarAba(nome) {
  /* Desativa todos */
  document.querySelectorAll(".admin-tab-btn").forEach(function (b) {
    b.classList.remove("active");
    b.setAttribute("aria-selected", "false");
  });
  document.querySelectorAll(".admin-tab-panel").forEach(function (p) {
    p.classList.remove("active");
  });

  /* Ativa o escolhido */
  var btn = document.getElementById("btn-tab-" + nome);
  var panel = document.getElementById("tab-" + nome);

  if (btn) {
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    /* Move o indicador de âncora deslizante para este botão.
       Chamado antes do scrollIntoView para que a transição CSS
       do indicador e o scroll do container comecem juntos. */
    moveTabIndicator(btn);
    /* scrollIntoView = rola o elemento para ficar visível na tela */
    btn.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }
  if (panel) panel.classList.add("active");

  /*
    Ao abrir a aba Dashboard, renderiza os dados diretamente (sem iframe).
    renderDashboard() é leve — só atualiza o DOM, não faz requisições.
  */
  if (nome === "dashboard-panel") renderDashboard();
  if (nome === "gallery") {
    renderGaleriaAdmin();
    renderVideoAcao();
    renderFotosMissao();
    renderFotosPillars();
    renderFotosWhy();
    renderFotosContrib();
    renderFotosVoluntario();
    /* Injeta botões de upload após o DOM das seções estar pronto */
    setTimeout(_injetarBotoesUploadSecoes, 120);
  }

  /* Novos gráficos e painéis */
  if (nome === "overview") {
    renderOvDoacoesList();
    renderOvMiniLists();
    renderFoodsAreaChart();
    renderOvExtras();
  }
  if (nome === "donations") { renderDoacoes(); }
  if (nome === "families") {
    renderFamilias();
    /* invalidateSize depois que o tab está visível — corrige área branca */
    setTimeout(function() {
      if (window._belemMapInstance) {
        window._belemMapInstance.invalidateSize();
      }
    }, 250);
  }
  if (nome === "voluntarios") { renderVoluntarios(); }
  if (nome === "oracoes") { renderPrayersCharts(); }
  if (nome === "tarefas") { renderTarefas(); }
}
window.ativarAba = ativarAba;

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 5 — CARREGAR TODOS OS DADOS
   Chamada após login e após qualquer alteração de dados.
   ══════════════════════════════════════════════════════════════════════ */

function carregarTodosDados() {
  /* Supabase é a fonte de verdade — não recalcular a partir do localStorage */

  renderVisaoGeral(); /* aba Visão Geral  */
  /* renderDashboard() removido — aba Dashboard removida do Admin */
  renderDashboard(); /* aba Dashboard    */
  renderAlimentos(); /* aba Alimentos    */
  renderDoacoes(); /* aba Doações      */
  renderFamilias(); /* aba Famílias     */
  renderGaleriaAdmin(); /* aba Galeria      */
  renderVoluntarios(); /* aba Voluntários  */
  renderOracoes(); /* aba Oração       */
  renderTarefas(); /* aba Tarefas      */
  renderWALogs(); /* aba WhatsApp     */
  renderNumerosAdmin(); /* aba Config       */
  renderFotosHero();        /* banner pág. principal */
  renderVolBanner();        /* banner voluntário     */
  renderFotosMissao();      /* fotos da missão      */
  renderFotosPillars();     /* pilares index.html   */
  renderFotosWhy();         /* por que voluntário   */
  renderFotosContrib();     /* como contribuir      */
  renderFotosVoluntario();  /* capa + cards vol     */
  renderCestas();    /* aba Cestas       */
  atualizarBadges(); /* números no menu  */

  /* Novos painéis e gráficos do dashboard */
  try { renderOvDoacoesList(); } catch(e) {}
  try { renderOvMiniLists(); } catch(e) {}
  try { renderFoodsAreaChart(); } catch(e) {}
  try { renderOvExtras(); } catch(e) {}
  try { renderFamiliesChartAndMap(); } catch(e) {}
  /* renderDonationsStatusChart, renderVolunteersChart, renderVolTipoChart e renderPrayersCharts
     agora são chamados pelas funções render* com dados reais do Supabase */
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 6 — VISÃO GERAL (aba 1)
   Cards de estatísticas + tabela de doações recentes + gráfico
   ══════════════════════════════════════════════════════════════════════ */

async function renderVisaoGeral() {
  await _db2Render();
}

/*
  Atualiza os cards circulares do painel dba-stats-row.
  ─ dba-pct-kg, dba-val-kg, dba-arc-kg   → KG Arrecadados
  ─ dba-pct-doa, dba-val-doa, dba-arc-doa → Doações Recebidas
  ─ dba-pct-fam, dba-val-fam, dba-arc-fam → Famílias Atendidas
  ─ dba-pct-ali, dba-val-ali, dba-arc-ali → Tipos de Alimento
  A circunferência do arco é 2π×24 ≈ 151 px.
*/
function _atualizarDbaStats(stats, doacoes) {
  var CIRC = 151; /* circunferência do círculo SVG */

  /* Metas para calcular %. Usa metaKg para kg; demais são estimativas */
  var metaKg   = stats.totalMetaKg  || 500;  /* meta total em kg */
  var metaDoa  = Math.max(100, (doacoes || []).length * 2 || 100); /* meta doações */
  var metaFam  = Math.max(50, stats.totalFamilias * 2 || 50);    /* meta famílias */
  var metaAli  = Math.max(10, stats.totalAlimentos * 1.5 || 10); /* meta alimentos */

  var pctKg  = Math.min(100, Math.round((stats.totalKg  || 0) / metaKg  * 100));
  var pctDoa = Math.min(100, Math.round((stats.totalDoacoes  || 0) / metaDoa * 100));
  var pctFam = Math.min(100, Math.round((stats.totalFamilias || 0) / metaFam * 100));
  var pctAli = Math.min(100, Math.round((stats.totalAlimentos|| 0) / metaAli * 100));

  /* Helper: atualiza um bloco dba */
  function _setDba(chave, pct, val) {
    var elPct = document.getElementById('dba-pct-' + chave);
    var elVal = document.getElementById('dba-val-' + chave);
    var elArc = document.getElementById('dba-arc-' + chave);
    if (elPct) elPct.textContent = pct + '%';
    if (elVal) elVal.textContent = val;
    if (elArc) {
      var dash = Math.round(pct / 100 * CIRC);
      elArc.setAttribute('stroke-dasharray', dash + ' ' + CIRC);
    }
  }

  _setDba('kg',  pctKg,  (stats.totalKg  || 0).toFixed(1) + 'kg');
  _setDba('doa', pctDoa, (stats.totalDoacoes  || 0).toString());
  _setDba('fam', pctFam, (stats.totalFamilias || 0).toString());
  _setDba('ali', pctAli, (stats.totalAlimentos|| 0).toString());
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD 2.0 — renderização do novo Visão Geral
═══════════════════════════════════════════════════════ */
var _db2Periodo = '30d';

function db2SwitchPeriod(p, btn) {
  _db2Periodo = p;
  var pills = document.querySelectorAll('#tab-overview .db2-pill');
  pills.forEach(function(el) { el.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  /* Busca doacoes do Supabase e re-renderiza o gráfico */
  DoaVidaSync.getDoacoes().then(function(doacoes) {
    _db2RenderTimeline(doacoes);
  }).catch(function() {
    _db2RenderTimeline([]);
  });
}
window.db2SwitchPeriod = db2SwitchPeriod;

/* Atualiza os 4 stat cards circulares */
function _db2RenderStats(stats, vols, doacoes, oracoes) {
  vols    = vols    || [];
  doacoes = doacoes || [];
  oracoes = oracoes || [];

  var CIRC   = 138; /* 2 * π * 22 */
  var metaKg = stats.totalMetaKg || 500;
  var pctDoa = Math.min(100, Math.round((stats.totalDoacoes || 0) / Math.max(100, stats.totalDoacoes * 2 || 100) * 100));
  var pctKg  = Math.min(100, Math.round((stats.totalKg || 0) / metaKg * 100));
  var pctFam = Math.min(100, Math.round((stats.totalFamilias || 0) / Math.max(50, stats.totalFamilias * 2 || 50) * 100));
  var pctVol = Math.min(100, Math.round((vols.length || 0) / Math.max(20, vols.length * 2 || 20) * 100));

  /* IDs no HTML: db2-n-X (long), db2-pct-X (short), db2-arc-X (short) */
  function setCard(idN, idPct, idArc, num, pct) {
    var elN   = document.getElementById(idN);
    var elPct = document.getElementById(idPct);
    var elArc = document.getElementById(idArc);
    if (elN)   _db2AnimNum(elN, num);
    if (elPct) elPct.textContent = pct + '%';
    if (elArc) elArc.setAttribute('stroke-dasharray', Math.round(pct / 100 * CIRC) + ' ' + CIRC);
  }
  setCard('db2-n-doacoes',  'db2-pct-doa', 'db2-arc-doa', stats.totalDoacoes || 0,                       pctDoa);
  setCard('db2-n-kg',       'db2-pct-kg',  'db2-arc-kg',  parseFloat(stats.totalKg || 0).toFixed(1),     pctKg);
  setCard('db2-n-familias', 'db2-pct-fam', 'db2-arc-fam', stats.totalFamilias || 0,                      pctFam);
  setCard('db2-n-vols',     'db2-pct-vol', 'db2-arc-vol', vols.length || 0,                              pctVol);

  /* Compatibilidade hidden elements */
  var el;
  el = document.getElementById('ov-total-donations');  if(el) el.textContent = stats.totalDoacoes||0;
  el = document.getElementById('ov-total-families');   if(el) el.textContent = stats.totalFamilias||0;
  el = document.getElementById('ov-total-volunteers'); if(el) el.textContent = vols.length||0;

  /* Quick access — usa dados Supabase recebidos como parâmetro */
  el = document.getElementById('db2-q-familias');
  if(el) el.textContent = stats.totalFamilias || 0;

  el = document.getElementById('db2-q-vols-ativos');
  if(el) {
    var ativos = vols.filter(function(v){ return v.status==='confirmado'||v.status==='participando'; }).length;
    el.textContent = ativos;
  }

  el = document.getElementById('db2-q-oracoes');
  if(el) el.textContent = oracoes.length;

  el = document.getElementById('db2-q-tarefas');
  if(el) {
    /* Tarefas não têm endpoint Supabase ainda — usa localStorage como fallback */
    var tpend = (DoaVidaAPI.getTarefas ? DoaVidaAPI.getTarefas() : []).filter(function(t){ return t.status==='pendente'; }).length;
    el.textContent = tpend;
  }

  el = document.getElementById('db2-q-doa-pendente');
  if(el) {
    var dpend = doacoes.filter(function(d){ return (d.status||'pendente')==='pendente'; }).length;
    el.textContent = dpend;
  }

  el = document.getElementById('adm3-q-alimentos');
  if(el) el.textContent = stats.totalAlimentos || 0;
}

/* Anima número de 0 ao valor — seta imediatamente como fallback */
function _db2AnimNum(el, valorFinal) {
  var num = parseFloat(valorFinal);
  if (isNaN(num) || num === 0) { el.textContent = valorFinal; return; }
  /* Exibe o valor final imediatamente — garante visibilidade mesmo sem rAF */
  el.textContent = valorFinal;
  var start = performance.now();
  var dur = 900;
  var isFloat = String(valorFinal).indexOf('.') !== -1;
  function tick(now) {
    var p = Math.min((now - start) / dur, 1);
    var ease = 1 - Math.pow(1 - p, 3);
    var v = ease * num;
    el.textContent = isFloat ? v.toFixed(1) : Math.round(v);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* Renderiza feed de atividade recente */
function _db2RenderActivity(doacoes) {
  var el = document.getElementById('db2-activity-list');
  if (!el) return;
  var statusColor = { pendente:'#f9a825', confirmado:'#81c784', entregue:'#4db6ac', cancelado:'#e57373', coleta:'#64b5f6' };
  var gradients = [
    'linear-gradient(135deg,#e8c96a,#b5973e)',
    'linear-gradient(135deg,#64b5f6,#1565c0)',
    'linear-gradient(135deg,#81c784,#2e7d32)',
    'linear-gradient(135deg,#ce93d8,#7b1fa2)',
    'linear-gradient(135deg,#f48fb1,#c62828)',
    'linear-gradient(135deg,#f9a825,#e65100)'
  ];
  var ultimas = (doacoes || []).slice(0, 7);
  if (ultimas.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:32px 0;color:var(--text2);font-size:.8rem"><i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:8px;opacity:.3"></i>Nenhuma doação registrada</div>';
    return;
  }
  el.innerHTML = ultimas.map(function(d, i) {
    var nome = d.name || d.nome || 'Anônimo';
    var inicial = nome.charAt(0).toUpperCase();
    var status = (d.status || 'pendente').toLowerCase();
    var cor = statusColor[status] || '#888';
    var kg = parseFloat(d.total_kg || d.amount || 0);
    var alimento = d.food || d.alimento || '';
    var data = d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}) : '';
    var gi = nome.charCodeAt(0) % gradients.length;
    var statusLabel = { pendente:'⏳', confirmado:'✅', entregue:'📦', cancelado:'❌', coleta:'🚚' };
    return '<div class="db2-act-item">' +
      '<div class="db2-act-avatar" style="background:' + gradients[gi] + '">' + inicial + '</div>' +
      '<div class="db2-act-info">' +
        '<div class="db2-act-name">' + escHtml(nome) + '</div>' +
        '<div class="db2-act-meta">' + escHtml(alimento) + (kg > 0 ? ' · ' + kg + 'kg' : '') + (data ? ' · ' + data : '') + '</div>' +
      '</div>' +
      '<span class="db2-act-badge" style="background:' + cor + '20;color:' + cor + '">' + (statusLabel[status]||'') + ' ' + status + '</span>' +
    '</div>';
  }).join('');
}

/* Renderiza barras de progresso por alimento com avatar (img ou emoji) */
function _db2RenderFoodsProgress(alimentos) {
  var el = document.getElementById('db2-foods-progress');
  if (!el) return;
  var itens = (alimentos || []).slice(0, 5);
  if (itens.length === 0) { el.innerHTML = '<div style="color:var(--text2);font-size:.8rem;padding:12px 0">Nenhum alimento cadastrado</div>'; return; }
  var cores = ['#e8c96a','#81c784','#64b5f6','#ce93d8','#f9a825'];
  el.innerHTML = itens.map(function(a, i) {
    var nome = a.name || a.nome || '';
    var kg   = parseFloat(a.kg || a.estoque || 0);
    var meta = parseFloat(a.goal || a.meta || 1);
    var pct  = meta > 0 ? Math.min(100, Math.round(kg / meta * 100)) : 0;
    var cor  = cores[i % cores.length];

    /* Avatar: usa imagem do banco (campo img) ou emoji como fallback */
    var avatarHtml = a.img
      ? '<img src="' + escHtml(a.img) + '" alt="' + escHtml(nome) + '" ' +
        'style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;" ' +
        'onerror="this.style.display=\'none\';this.nextSibling.style.display=\'inline\'">' +
        '<span style="display:none;font-size:1.1rem;">' + (a.emoji||'🥫') + '</span>'
      : '<span style="font-size:1.1rem;">' + (a.emoji||'🥫') + '</span>';

    return '<div class="db2-food-row">' +
      '<div class="db2-food-row-hd" style="display:flex;align-items:center;gap:8px;">' +
        avatarHtml +
        '<span class="db2-food-name">' + escHtml(nome) + '</span>' +
        '<span class="db2-food-pct" style="margin-left:auto;">' + kg + '/' + meta + 'kg · ' + pct + '%</span>' +
      '</div>' +
      '<div class="db2-food-bar"><div class="db2-food-fill" style="width:' + pct + '%;background:' + cor + '"></div></div>' +
    '</div>';
  }).join('');
}

/* Gráfico de linha / área — timeline de doações por período */
function _db2RenderTimeline(doacoes) {
  _destroyChart('db2Timeline');
  var canvas = document.getElementById('db2-timeline-chart');
  if (!canvas || !window.Chart) return;
  try {
    doacoes = doacoes || (DoaVidaAPI.getDoacoes ? DoaVidaAPI.getDoacoes() : []);
    var agora = new Date();
    var dias = _db2Periodo === '7d' ? 7 : _db2Periodo === '30d' ? 30 : 90;
    var buckets = {};
    for (var d = 0; d < dias; d++) {
      var dt = new Date(agora); dt.setDate(dt.getDate() - (dias - 1 - d));
      var key = dt.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
      buckets[key] = { count: 0, kg: 0 };
    }
    doacoes.forEach(function(d) {
      if (!d.created_at) return;
      var dt = new Date(d.created_at);
      var diff = Math.floor((agora - dt) / 86400000);
      if (diff >= 0 && diff < dias) {
        var key = dt.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
        if (buckets[key]) { buckets[key].count++; buckets[key].kg += parseFloat(d.total_kg || d.amount || 0); }
      }
    });
    var labels = Object.keys(buckets);
    var counts = labels.map(function(k) { return buckets[k].count; });
    var kgs    = labels.map(function(k) { return buckets[k].kg; });
    /* Mostra apenas N labels para não poluir */
    var step = dias > 30 ? 7 : dias > 14 ? 3 : 1;
    var visibleLabels = labels.map(function(l, i) { return i % step === 0 ? l : ''; });

    /* Mini KPIs */
    var totalP = counts.reduce(function(a,b){return a+b;},0);
    var totalKgP = kgs.reduce(function(a,b){return a+b;},0);
    var entP = doacoes.filter(function(d){
      if(!d.created_at) return false;
      return Math.floor((agora-new Date(d.created_at))/86400000) < dias && d.status==='entregue';
    }).length;
    var elT = document.getElementById('db2-kpi-total-periodo'); if(elT) elT.textContent = totalP;
    var elK = document.getElementById('db2-kpi-kg-periodo'); if(elK) elK.textContent = totalKgP.toFixed(1)+'kg';
    var elE = document.getElementById('db2-kpi-entregue-periodo'); if(elE) elE.textContent = entP;

    _charts['db2Timeline'] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: visibleLabels,
        datasets: [
          {
            label: 'Doações',
            data: counts,
            borderColor: '#e8c96a',
            backgroundColor: 'rgba(232,201,106,0.12)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#e8c96a'
          },
          {
            label: 'KG',
            data: kgs,
            borderColor: '#81c784',
            backgroundColor: 'rgba(129,199,132,0.08)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#81c784',
            yAxisID: 'y2'
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(20,20,16,.95)',
            borderColor: 'rgba(232,201,106,.3)', borderWidth: 1,
            titleColor: '#e8c96a', bodyColor: 'rgba(255,255,255,.7)',
            padding: 10, cornerRadius: 8
          }
        },
        scales: {
          x: { ticks: { color: 'rgba(255,255,255,.35)', font:{size:10} }, grid: { color: 'rgba(255,255,255,.04)' } },
          y: { beginAtZero:true, ticks:{color:'rgba(255,255,255,.35)',font:{size:10},stepSize:1}, grid:{color:'rgba(255,255,255,.05)'} },
          y2: { beginAtZero:true, position:'right', display:false }
        }
      }
    });
    /* Força redimensionamento após criar — corrige canvas 300×150 padrão */
    (function(ch){ setTimeout(function(){ try{ ch.resize(); } catch(e){} }, 80); })(_charts['db2Timeline']);
  } catch(e) {}
}

/* Função principal — substitui renderVisaoGeral internamente */
async function _db2Render() {
  /* Busca todos os dados do Supabase em paralelo */
  var resultados = await Promise.allSettled([
    DoaVidaSync.getDoacoes(),
    DoaVidaSync.getAlimentos(),
    DoaVidaSync.getVoluntarios ? DoaVidaSync.getVoluntarios() : Promise.resolve([]),
    DoaVidaSync.getFamilias   ? DoaVidaSync.getFamilias()    : Promise.resolve([]),
    DoaVidaSync.getOracoes    ? DoaVidaSync.getOracoes()     : Promise.resolve([])
  ]);

  var doacoes   = resultados[0].status === 'fulfilled' ? resultados[0].value : [];
  var alimentos = resultados[1].status === 'fulfilled' ? resultados[1].value : [];
  var vols      = resultados[2].status === 'fulfilled' ? resultados[2].value : [];
  var familias  = resultados[3].status === 'fulfilled' ? resultados[3].value : [];
  var oracoes   = resultados[4].status === 'fulfilled' ? resultados[4].value : [];

  /* Calcula stats a partir dos dados reais do Supabase */
  var totalKg = doacoes.reduce(function(acc, d) { return acc + parseFloat(d.total_kg || d.amount || 0); }, 0);
  var stats = {
    totalDoacoes:  doacoes.length,
    totalKg:       totalKg,
    totalFamilias: familias.length,
    totalAlimentos: alimentos.length,
    totalMetaKg:   DoaVidaAPI.getEstatisticas ? (DoaVidaAPI.getEstatisticas().totalMetaKg || 500) : 500
  };

  _db2RenderStats(stats, vols, doacoes, oracoes);
  _db2RenderActivity(doacoes);
  _db2RenderFoodsProgress(alimentos);
  _db2RenderTimeline(doacoes);
  _atualizarDbaStats(stats, doacoes);
  try { _renderOvDoacoesChart(); } catch(e) {}
  try { _renderOvVolChart(vols); } catch(e) {}
  renderGraficoBarras(alimentos);
  _carregarFotosSite();
  try { _adm3InitTilt(); } catch(e) {}
}

/* Popula a barra de stats rápidos (ADM3 — adm3-strip) */
function _adm3PopulateStrip(stats, doacoes, vols) {
  var el;
  /* Entregues */
  el = document.getElementById('ov-cnt-doacoes-entregues');
  if (el) el.textContent = (doacoes||[]).filter(function(d){ return (d.status||'').toLowerCase()==='entregue'; }).length;
  /* Doadores únicos (por nome) */
  el = document.getElementById('ov-cnt-doadores');
  if (el) {
    var nomes = {};
    (doacoes||[]).forEach(function(d){ var n = d.name||d.nome||''; if (n) nomes[n] = 1; });
    el.textContent = Object.keys(nomes).length;
  }
  /* Total de voluntários */
  el = document.getElementById('ov-cnt-voluntarios');
  if (el) el.textContent = (vols||[]).length;
  /* Orações */
  el = document.getElementById('ov-cnt-oracoes');
  if (el) el.textContent = DoaVidaAPI.getOracoes ? DoaVidaAPI.getOracoes().length : 0;
  /* Famílias atendidas */
  el = document.getElementById('ov-cnt-familias');
  if (el) el.textContent = stats.totalFamilias || 0;
}
window._adm3PopulateStrip = _adm3PopulateStrip;

/* Efeito 3D tilt nos cards KPI (apenas desktop, sem afetar mobile) */
function _adm3InitTilt() {
  /* Sem efeito em dispositivos touch */
  if (window.matchMedia('(hover: none)').matches) return;
  document.querySelectorAll('[data-adm3-tilt]').forEach(function(card) {
    /* Evita duplicar listeners */
    if (card._adm3TiltInit) return;
    card._adm3TiltInit = true;

    card.addEventListener('mousemove', function(e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var cx = rect.width / 2;
      var cy = rect.height / 2;
      var rotX = -((y - cy) / cy) * 7;
      var rotY = ((x - cx) / cx) * 7;
      card.style.transform = 'perspective(800px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) translateZ(6px)';
      card.style.transition = 'box-shadow .3s ease';
      /* Spotlight */
      var shine = card.querySelector('.adm3-kpi-shine');
      if (shine) {
        shine.style.setProperty('--mx', ((x / rect.width) * 100).toFixed(1) + '%');
        shine.style.setProperty('--my', ((y / rect.height) * 100).toFixed(1) + '%');
      }
    });

    card.addEventListener('mouseleave', function() {
      card.style.transition = 'transform .5s ease, box-shadow .3s ease';
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0)';
      setTimeout(function() { if (card) card.style.transition = ''; }, 500);
    });
  });
}
window._adm3InitTilt = _adm3InitTilt;

/* ── Controle de Fotos do Site ───────────────────────────────────────
   Salva/carrega URLs das fotos da seção Missão no localStorage.
   A chave 'doavida_missao_fotos' já é lida pelo index.html ao carregar.
*/
var FOTOS_PADRAO = {
  foto1:
    "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=700&q=80",
  foto2:
    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80",
};

function _carregarFotosSite() {
  var fotos = FOTOS_PADRAO;
  try {
    var raw = localStorage.getItem("doavida_missao_fotos");
    if (raw) fotos = Object.assign({}, FOTOS_PADRAO, JSON.parse(raw));
  } catch (e) {
    /* silencioso */
  }

  var i1 = document.getElementById("admin-prev-foto1");
  var i2 = document.getElementById("admin-prev-foto2");
  var f1 = document.getElementById("input-foto1");
  var f2 = document.getElementById("input-foto2");
  if (i1) i1.src = fotos.foto1;
  if (i2) i2.src = fotos.foto2;
  if (f1) f1.value = fotos.foto1;
  if (f2) f2.value = fotos.foto2;
}

function previewFotoSite(num) {
  var input = document.getElementById("input-foto" + num);
  var prev = document.getElementById("admin-prev-foto" + num);
  if (input && prev && input.value.trim()) {
    prev.src = input.value.trim();
  }
}
window.previewFotoSite = previewFotoSite;

function salvarFotoSite(num) {
  var input = document.getElementById("input-foto" + num);
  if (!input || !input.value.trim()) {
    showToast("⚠️ Cole uma URL de imagem válida.", "error");
    return;
  }
  var fotos = FOTOS_PADRAO;
  try {
    var raw = localStorage.getItem("doavida_missao_fotos");
    if (raw) fotos = Object.assign({}, FOTOS_PADRAO, JSON.parse(raw));
  } catch (e) {
    /* silencioso */
  }

  fotos["foto" + num] = input.value.trim();
  var json = JSON.stringify(fotos);
  localStorage.setItem("doavida_missao_fotos", json);
  /* Sincroniza com Supabase para refletir em outros dispositivos */
  if (window.DoaVidaSync && typeof DoaVidaSync.setConfig === 'function') {
    DoaVidaSync.setConfig('doavida_missao_fotos', json).catch(function(){});
  }
  showToast("✅ Foto " + num + " salva! Reflete em todos os dispositivos.", "success");
}
window.salvarFotoSite = salvarFotoSite;

/*
  Renderiza o gráfico de barras comparando meta × arrecadado por alimento.
  Usa Chart.js — biblioteca carregada via CDN no admin.html.

  ✅ BUG 2 CORRIGIDO: 'food-chart' → 'foods-chart' (ID correto do HTML)
*/
function renderGraficoBarras(alimentos) {
  var canvas = document.getElementById("foods-chart"); /* ✅ ID correto */
  if (!canvas || !window.Chart || alimentos.length === 0) return;

  /* Destrói instância anterior para evitar erro "Canvas is already in use" */
  if (AdminState.chartInstance) {
    AdminState.chartInstance.destroy();
    AdminState.chartInstance = null;
  }
  /* Destrói também a instância criada por renderFoodsAreaChart no mesmo canvas */
  _destroyChart('foods');

  AdminState.chartInstance = _charts['foods'] = new Chart(canvas, {
    type: "bar",
    data: {
      labels: alimentos.map(function (a) {
        return a.name;
      }),
      datasets: [
        {
          label: "Arrecadado (kg)",
          data: alimentos.map(function (a) {
            return a.kg || 0;
          }),
          backgroundColor: "rgba(232,201,106,0.7)",
          borderColor: "#e8c96a",
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: "Meta (kg)",
          data: alimentos.map(function (a) {
            return a.goal || 0;
          }),
          backgroundColor: "rgba(255,255,255,0.06)",
          borderColor: "rgba(255,255,255,0.2)",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#c8c4b8" } },
      },
      scales: {
        x: {
          ticks: { color: "#7a7670" },
          grid: { color: "rgba(255,255,255,.05)" },
        },
        y: {
          ticks: { color: "#7a7670" },
          grid: { color: "rgba(255,255,255,.05)" },
        },
      },
    },
  });
  /* Força redimensionamento — corrige canvas 300×150 padrão */
  (function(ch){ setTimeout(function(){ try{ ch.resize(); } catch(e){} }, 80); })(AdminState.chartInstance);
}


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 6.5 — DASHBOARD (aba Dashboard)

   Renderizado DIRETAMENTE no admin — sem iframe, sem página separada.
   Todos os dados vêm de DoaVidaAPI (mesmo source do restante do admin).

   COMPONENTES:
   • Métricas    → 4 cards animados (kg, famílias, doações, alimentos)
   • Meta global → barra de progresso da campanha
   • Gráfico linha → doações por período (7/30/90 dias)
   • Gráfico rosca → distribuição por alimento
   • Progresso por alimento → barras por item
   • Ranking de doadores
   • Timeline de atividade recente
   ══════════════════════════════════════════════════════════════════════ */

/* Referências das instâncias Chart.js — necessário para destruí-las
   antes de recriar (evita erro "Canvas already in use") */
var _dbChartLinha  = null;
var _dbChartRosca  = null;
var _dbChartCestas = null;
var _dbPeriodoAtual = 7; /* período padrão do gráfico de linha */

/*
  Função principal. Chamada por ativarAba('dashboard-panel') e
  por carregarTodosDados() quando a aba já está visível.
*/
async function renderDashboard() {
  var resultados = await Promise.allSettled([
    DoaVidaSync.getAlimentos(),
    DoaVidaSync.getDoacoes(),
    DoaVidaSync.getFamilias ? DoaVidaSync.getFamilias() : Promise.resolve([]),
    DoaVidaSync.getCestasFormadas ? DoaVidaSync.getCestasFormadas() : Promise.resolve([]),
    DoaVidaSync.getModeloCestaItens ? DoaVidaSync.getModeloCestaItens() : Promise.resolve([])
  ]);
  var alimentos = resultados[0].status === 'fulfilled' ? resultados[0].value : [];
  var doacoes   = resultados[1].status === 'fulfilled' ? resultados[1].value : [];
  var familias  = resultados[2].status === 'fulfilled' ? resultados[2].value : [];
  var formadas  = resultados[3].status === 'fulfilled' ? resultados[3].value : [];
  var modelo    = resultados[4].status === 'fulfilled' ? resultados[4].value : [];

  /* Calcula cestas possíveis a partir do estoque real + modelo configurado */
  var calcCestas = _calcularCestas(modelo, alimentos);

  /* Computa stats a partir dos dados reais do Supabase */
  var totalKg = doacoes.reduce(function(acc, d) { return acc + parseFloat(d.total_kg || d.amount || 0); }, 0);
  var statsBase = DoaVidaAPI.getEstatisticas ? DoaVidaAPI.getEstatisticas() : {};
  var stats = {
    totalKg:       totalKg,
    totalDoacoes:  doacoes.length,
    totalFamilias: familias.length,
    totalAlimentos: alimentos.length,
    totalMetaKg:   statsBase.totalMetaKg || 500,
    metaTotal:     statsBase.metaTotal   || 4700
  };

  _dbRenderMetricas(stats);
  _dbRenderMeta(stats);
  _dbRenderGraficoLinha(doacoes, _dbPeriodoAtual);
  _dbRenderGraficoRosca(alimentos);
  _dbRenderProgresso(alimentos);
  _dbRenderRanking(doacoes);
  _dbRenderTimeline(doacoes);
  _dbRenderRecentTable(doacoes);
  _dbRenderCestasFormadas(formadas, calcCestas, modelo.length === 0);

  /* Atualiza os cards circulares do painel dba-stats-row */
  _atualizarDbaStats(stats, doacoes);
}
window.renderDashboard = renderDashboard;

/* ── Métricas ──────────────────────────────────────────────────── */
function _dbRenderMetricas(stats) {
  var el = document.getElementById("db-metrics-grid");
  if (!el) return;

  var cards = [
    {
      icon: "fa-weight-hanging",
      valor: stats.totalKg,
      suf: "kg",
      label: "Kg Arrecadados",
      cor: "#e8c96a",
      delta: "up",
    },
    {
      icon: "fa-hand-holding-heart",
      valor: stats.totalDoacoes,
      suf: "",
      label: "Doações Recebidas",
      cor: "#4CAF50",
      delta: "up",
    },
    {
      icon: "fa-users",
      valor: stats.totalFamilias,
      suf: "",
      label: "Famílias Atendidas",
      cor: "#2196F3",
      delta: "neutral",
    },
    {
      icon: "fa-carrot",
      valor: stats.totalAlimentos,
      suf: "",
      label: "Tipos de Alimento",
      cor: "#FF9800",
      delta: "neutral",
    },
  ];

  el.innerHTML = cards
    .map(function (c) {
      return (
        '<div class="metric-card" style="--accent:' +
        c.cor +
        ';">' +
        '<div class="metric-delta ' +
        c.delta +
        '" aria-hidden="true">' +
        (c.delta === "up" ? "▲ ativo" : "● estável") +
        "</div>" +
        '<div class="metric-icon" aria-hidden="true"><i class="fas ' +
        c.icon +
        '"></i></div>' +
        '<div class="metric-value">' +
        c.valor +
        (c.suf ? "<small>" + c.suf + "</small>" : "") +
        "</div>" +
        '<div class="metric-label">' +
        c.label +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  /* Anima os números de 0 ao valor real */
  cards.forEach(function (c, i) {
    var valEl = el.children[i] && el.children[i].querySelector(".metric-value");
    if (!valEl) return;
    _dbAnimarContador(valEl, c.valor, c.suf);
  });
}

/* ── Meta global ────────────────────────────────────────────────── */
function _dbRenderMeta(stats) {
  /* Atualiza o percentual no centro do donut (dba-meta-pct) */
  var metaTotal = stats.metaTotal || stats.totalMetaKg || 500;
  var pct = metaTotal > 0 ? Math.min(100, Math.round((stats.totalKg || 0) / metaTotal * 100)) : 0;
  var elPct = document.getElementById("dba-meta-pct");
  if (elPct) elPct.textContent = pct + "%";
}

/* ── Gráfico de linha: doações por período ─────────────────────── */
function _dbRenderGraficoLinha(doacoes, dias) {
  var canvas = document.getElementById("dba-line-chart");
  if (!canvas || typeof Chart === "undefined") return;

  /* Destrói instância anterior para evitar erro "Canvas is already in use" */
  if (_dbChartLinha) {
    _dbChartLinha.destroy();
    _dbChartLinha = null;
  }

  /* Monta array de datas e conta doações por dia */
  var labels = [];
  var dataMap = {};
  for (var i = dias - 1; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var label =
      String(d.getDate()).padStart(2, "0") +
      "/" +
      String(d.getMonth() + 1).padStart(2, "0");
    labels.push(label);
    dataMap[d.toDateString()] = 0;
  }
  doacoes.forEach(function (d) {
    var chave = new Date(d.created_at || 0).toDateString();
    if (Object.prototype.hasOwnProperty.call(dataMap, chave)) dataMap[chave]++;
  });
  var valores = Object.keys(dataMap).map(function (k) {
    return dataMap[k];
  });

  _dbChartLinha = new Chart(canvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Doações",
          data: valores,
          borderColor: "rgba(232,201,106,1)",
          borderWidth: 2,
          fill: true,
          backgroundColor: function (ctx) {
            var h = ctx.chart.height || 250;
            var g = ctx.chart.ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, "rgba(232,201,106,0.22)");
            g.addColorStop(1, "rgba(232,201,106,0)");
            return g;
          },
          pointBackgroundColor: "rgba(232,201,106,1)",
          pointBorderColor: "#0d0d0b",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: "easeInOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(13,13,11,.9)",
          borderColor: "rgba(232,201,106,.3)",
          borderWidth: 1,
          callbacks: {
            label: function (ctx) {
              return " " + ctx.parsed.y + " doação(ões)";
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "rgba(255,255,255,.4)",
            font: { size: 11 },
            maxTicksLimit: dias > 30 ? 10 : dias,
          },
          grid: { color: "rgba(255,255,255,.04)" },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "rgba(255,255,255,.4)",
            font: { size: 11 },
            callback: function (v) {
              return Number.isInteger(v) ? v : null;
            },
          },
          grid: { color: "rgba(255,255,255,.04)" },
        },
      },
    },
  });
  (function(ch){ setTimeout(function(){ try{ ch.resize(); }catch(e){} }, 80); })(_dbChartLinha);
}

/* ── Gráfico de rosca: por alimento ────────────────────────────── */
function _dbRenderGraficoRosca(alimentos) {
  var canvas = document.getElementById("dba-donut-chart");
  if (!canvas || typeof Chart === "undefined") return;
  if (_dbChartRosca) {
    _dbChartRosca.destroy();
    _dbChartRosca = null;
  }

  var comDados = alimentos.filter(function (a) {
    return (parseFloat(a.kg) || 0) > 0;
  });
  if (comDados.length === 0) {
    /* Estado vazio elegante */
    canvas.parentElement.innerHTML =
      '<div class="empty-state" style="padding:40px 20px;">' +
      '<i class="fas fa-chart-pie"></i>' +
      "<p>Nenhum kg registrado ainda.</p>" +
      "</div>";
    return;
  }

  var cores = [
    "#e8c96a",
    "#4CAF50",
    "#2196F3",
    "#FF9800",
    "#E91E63",
    "#9C27B0",
    "#00BCD4",
    "#FF5722",
  ];
  _dbChartRosca = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: comDados.map(function (a) {
        return a.name;
      }),
      datasets: [
        {
          data: comDados.map(function (a) {
            return parseFloat(a.kg) || 0;
          }),
          backgroundColor: cores.slice(0, comDados.length),
          borderColor: "#0d0d0b",
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      animation: { duration: 700 },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "rgba(255,255,255,.6)",
            font: { size: 11 },
            padding: 12,
            usePointStyle: true,
            pointStyleWidth: 8,
          },
        },
        tooltip: {
          backgroundColor: "rgba(13,13,11,.9)",
          borderColor: "rgba(232,201,106,.3)",
          borderWidth: 1,
          callbacks: {
            label: function (ctx) {
              var total = ctx.dataset.data.reduce(function (s, v) {
                return s + v;
              }, 0);
              return (
                " " +
                ctx.parsed +
                "kg (" +
                Math.round((ctx.parsed / total) * 100) +
                "%)"
              );
            },
          },
        },
      },
    },
  });

  /* Popula a legenda lateral */
  var legend = document.getElementById("dba-donut-legend");
  if (legend) {
    var cores = ["#e8c96a","#4CAF50","#2196F3","#FF9800","#E91E63","#9C27B0","#00BCD4","#FF5722"];
    var totalKgRosca = comDados.reduce(function(s,a){ return s + (parseFloat(a.kg)||0); }, 0);
    legend.innerHTML = comDados.slice(0, 8).map(function(a, i) {
      var pct = totalKgRosca > 0 ? Math.round((parseFloat(a.kg)||0) / totalKgRosca * 100) : 0;
      return '<div class="dba-legend-item">' +
        '<span class="dba-legend-dot" style="background:' + cores[i % cores.length] + ';"></span>' +
        '<span class="dba-legend-name">' + escHtml(a.name) + '</span>' +
        '<span class="dba-legend-pct">' + pct + '%</span>' +
        '</div>';
    }).join('');
  }

  /* Resize após mount */
  (function(ch){ setTimeout(function(){ try{ ch.resize(); }catch(e){} }, 80); })(_dbChartRosca);
}

/* ── Progresso por alimento ─────────────────────────────────────── */
function _dbRenderProgresso(alimentos) {
  var el = document.getElementById("dba-foods-list");
  if (!el) return;

  if (alimentos.length === 0) {
    el.innerHTML =
      '<div class="empty-state"><i class="fas fa-seedling"></i><p>Nenhum alimento cadastrado.</p></div>';
    return;
  }

  el.innerHTML = alimentos
    .map(function (a) {
      var kg = parseFloat(a.kg) || 0;
      var meta = parseFloat(a.goal) || 0;
      var pct = meta > 0 ? Math.min(Math.round((kg / meta) * 100), 100) : 0;
      var cor = pct >= 100 ? "#4CAF50" : "#e8c96a";
      return (
        '<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">' +
        '<span style="font-size:.8rem;font-weight:600;color:rgba(255,255,255,.85);">' +
        escHtml(a.emoji || "📦") + " " + escHtml(a.name) +
        '</span>' +
        '<span style="font-size:.72rem;font-weight:700;color:' + cor + ';">' + pct + '%</span>' +
        '</div>' +
        '<div style="background:rgba(255,255,255,.08);border-radius:4px;height:5px;">' +
        '<div data-target="' + pct + '" style="height:100%;border-radius:4px;width:0%;background:' + cor + ';transition:width .5s ease;"></div>' +
        '</div>' +
        '<div style="font-size:.65rem;color:rgba(255,255,255,.35);margin-top:3px;">' +
        kg + 'kg / ' + meta + 'kg' +
        '</div>' +
        '</div>'
      );
    })
    .join("");

  /* Anima as barras com pequeno delay */
  setTimeout(function () {
    el.querySelectorAll(".food-progress-fill[data-target]").forEach(
      function (bar) {
        bar.style.width = bar.getAttribute("data-target") + "%";
      },
    );
  }, 200);
}

/* ── Ranking dos maiores doadores ──────────────────────────────── */
function _dbRenderRanking(doacoes) {
  var el = document.getElementById("dba-donors-list");
  if (!el) return;

  if (doacoes.length === 0) {
    el.innerHTML =
      '<div class="empty-state" style="padding:32px 16px;"><i class="fas fa-trophy"></i><p>Nenhuma doação registrada.</p></div>';
    return;
  }

  /* Agrupa por nome de doador */
  var mapa = {};
  doacoes.forEach(function (d) {
    var nome = d.name || "Anônimo";
    if (!mapa[nome]) mapa[nome] = { nome: nome, totalKg: 0, qtd: 0 };
    mapa[nome].totalKg += parseFloat(d.total_kg || d.amount) || 0;
    mapa[nome].qtd++;
  });

  var ranking = Object.values(mapa)
    .sort(function (a, b) {
      return b.totalKg - a.totalKg;
    })
    .slice(0, 8);

  el.innerHTML = ranking
    .map(function (d, i) {
      return (
        '<div class="dba-donor-row">' +
        '<div class="dba-donor-rank">' + (i + 1) + '</div>' +
        '<div class="dba-donor-name">' + escHtml(d.nome) +
          '<div style="font-size:.65rem;font-weight:400;color:rgba(255,255,255,.4);">' + d.qtd + ' doação(ões)</div>' +
        '</div>' +
        '<div class="dba-donor-kg">' + d.totalKg.toFixed(1) + 'kg</div>' +
        '</div>'
      );
    })
    .join("");
}

/* ── Timeline de atividade recente ─────────────────────────────── */
function _dbRenderTimeline(doacoes) {
  var el = document.getElementById("dba-activity-list");
  if (!el) return;

  if (doacoes.length === 0) {
    el.innerHTML =
      '<div class="empty-state" style="padding:32px 16px;"><i class="fas fa-history"></i><p>Nenhuma atividade ainda.</p></div>';
    return;
  }

  el.innerHTML = doacoes
    .slice(0, 8)
    .map(function (d) {
      var kg = parseFloat(d.total_kg || d.amount || 0).toFixed(1);
      return (
        '<div class="dba-activity-item">' +
        '<div class="dba-activity-dot" aria-hidden="true"></div>' +
        '<div>' +
        '<div class="dba-activity-text"><strong>' + escHtml(d.name || "Anônimo") + '</strong>' +
          ' doou ' + kg + 'kg de ' + escHtml(d.food || "alimentos") +
        '</div>' +
        '<div class="dba-activity-time">' + _dbTempoRelativo(d.created_at) + '</div>' +
        '</div>' +
        '</div>'
      );
    })
    .join("");
}

/* ── Cestas básicas formadas: KPIs + gráfico de barras + tabela ── */
function _dbRenderCestasFormadas(formadas, calcCestas, semModelo) {
  var totalLotes  = formadas.length;
  var totalCestas = formadas.reduce(function(s, f) { return s + (parseInt(f.quantidade) || 0); }, 0);
  var totalKg     = formadas.reduce(function(s, f) { return s + (parseFloat(f.total_kg)  || 0); }, 0);
  var possíveis   = (calcCestas && calcCestas.total > 0) ? calcCestas.total : 0;

  var elLotes     = document.getElementById('dba-cestas-lotes');
  var elTotal     = document.getElementById('dba-cestas-total');
  var elKg        = document.getElementById('dba-cestas-kg');
  var elPossiveis = document.getElementById('dba-cestas-possiveis');
  if (elLotes)     elLotes.textContent     = totalLotes;
  if (elTotal)     elTotal.textContent     = totalCestas;
  if (elKg)        elKg.textContent        = totalKg > 0 ? totalKg.toFixed(1) + ' kg' : '0 kg';
  if (elPossiveis) {
    elPossiveis.textContent = semModelo ? '—' : possíveis;
    elPossiveis.title = semModelo
      ? 'Configure o modelo de cesta na aba Cestas para ver este dado'
      : possíveis + ' cestas montáveis com o estoque atual';
  }

  /* Gráfico de barras: cestas formadas nos últimos 6 meses */
  var agora  = new Date();
  var labels = [];
  var vals   = [];
  for (var i = 5; i >= 0; i--) {
    var ref = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    labels.push(ref.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
    var soma = formadas
      .filter(function(f) {
        var dt = new Date(f.created_at);
        return dt.getFullYear() === ref.getFullYear() && dt.getMonth() === ref.getMonth();
      })
      .reduce(function(s, f) { return s + (parseInt(f.quantidade) || 0); }, 0);
    vals.push(soma);
  }

  var canvas = document.getElementById('dba-cestas-bar-chart');
  if (canvas && window.Chart) {
    if (_dbChartCestas) { _dbChartCestas.destroy(); _dbChartCestas = null; }
    _dbChartCestas = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cestas formadas',
          data: vals,
          backgroundColor: 'rgba(16,185,129,0.65)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx) { return ctx.raw + ' cesta(s)'; }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 11 }, precision: 0 }
          }
        }
      }
    });
  }

  /* Tabela */
  var tbody = document.getElementById('dba-cestas-tbody');
  if (!tbody) return;

  if (totalLotes === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:28px 16px;">' +
      '<div style="color:rgba(255,255,255,.35);font-size:0.85rem;line-height:1.7;">' +
      '<i class="fas fa-box-open" style="font-size:1.6rem;display:block;margin-bottom:10px;opacity:.4;"></i>' +
      'Nenhum lote de cestas registrado ainda.<br>' +
      '<span style="font-size:0.78rem;opacity:.7;">Para registrar, vá em <strong style="color:rgba(255,255,255,.55);">Cestas</strong> no menu lateral, configure o modelo e clique em <strong style="color:rgba(255,255,255,.55);">Formar Cestas</strong>.</span>' +
      '</div></td></tr>';
    return;
  }

  var sorted = formadas.slice().sort(function(a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  tbody.innerHTML = sorted.map(function(f) {
    var dt   = new Date(f.created_at);
    var data = dt.toLocaleDateString('pt-BR');
    var hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    var itens = (f.itens_snapshot || [])
      .map(function(i) { return (i.emoji || '🥫') + ' ' + escHtml(i.nome) + ' ×' + i.qtd; })
      .join(' · ');
    var kg = f.total_kg ? parseFloat(f.total_kg).toFixed(1) + ' kg' : '—';
    return '<tr>' +
      '<td><span style="font-weight:600;color:#fff;">' + data + '</span>' +
          '<br><span style="font-size:0.68rem;color:rgba(255,255,255,.38);">' + hora + '</span></td>' +
      '<td><span class="dba-badge dba-badge-ok">' + (f.quantidade || 0) + ' cesta(s)</span></td>' +
      '<td style="font-weight:700;color:#10b981;">' + kg + '</td>' +
      '<td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escHtml(itens) + '">' +
        (itens || '<span style="color:rgba(255,255,255,.3)">—</span>') + '</td>' +
      '<td style="color:rgba(255,255,255,.45);font-style:italic;">' + escHtml(f.observacao || '—') + '</td>' +
    '</tr>';
  }).join('');
}

/* ── Filtro de período do gráfico de linha ─────────────────────── */
async function dbMudarPeriodo(dias, btnEl) {
  _dbPeriodoAtual = dias;
  /* Atualiza estado dos botões (dentro do painel de dashboard) */
  var painel = document.getElementById("tab-dashboard-panel");
  if (painel) {
    painel.querySelectorAll(".period-btn").forEach(function (b) {
      b.classList.remove("active");
      b.setAttribute("aria-pressed", "false");
    });
  }
  if (btnEl) {
    btnEl.classList.add("active");
    btnEl.setAttribute("aria-pressed", "true");
  }
  _dbRenderGraficoLinha(await DoaVidaSync.getDoacoes(), dias);
}
window.dbMudarPeriodo = dbMudarPeriodo;

/* ── Animação de contador (0 → valor) ──────────────────────────── */
function _dbAnimarContador(el, valorFinal, sufixo) {
  var duracao = 900;
  var inicio = performance.now();
  function step(agora) {
    var p = Math.min((agora - inicio) / duracao, 1);
    var ease = 1 - Math.pow(1 - p, 3);
    var valor = Math.round(valorFinal * ease);
    if (sufixo === "kg") {
      el.innerHTML = valor + "<small>kg</small>";
    } else {
      el.textContent = valor;
    }
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ── Tabela de últimas doações (dba-recent-body) ───────────────── */
function _dbRenderRecentTable(doacoes) {
  var tbody = document.getElementById("dba-recent-body");
  if (!tbody) return;
  if (!doacoes || doacoes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:rgba(255,255,255,.3);padding:20px;">Sem doações registradas</td></tr>';
    return;
  }
  var STATUS_COR = { pendente: "#e8c96a", confirmado: "#4CAF50", entregue: "#64b5f6", cancelado: "#ef5350" };
  tbody.innerHTML = doacoes.slice(0, 8).map(function(d) {
    var status = d.status || "pendente";
    var cor = STATUS_COR[status] || "#e8c96a";
    var kg = parseFloat(d.total_kg || d.amount || 0).toFixed(1);
    var entrega = d.delivery_type === "pickup" ? "Retirada" : (d.delivery_type || "—");
    return '<tr>' +
      '<td>' + escHtml(d.name || "Anônimo") + '</td>' +
      '<td>' + kg + 'kg</td>' +
      '<td>' + escHtml(entrega) + '</td>' +
      '<td><span style="color:' + cor + ';font-size:.75rem;font-weight:600;text-transform:capitalize;">' + escHtml(status) + '</span></td>' +
      '</tr>';
  }).join('');
}

/* ── Switch de período do gráfico de linha (chamado pelo HTML) ──── */
/* HTML chama dbaSwitchPeriod('7d'|'30d'|'12m', btn) */
function dbaSwitchPeriod(periodo, btnEl) {
  var mapa = { '7d': 7, '30d': 30, '12m': 365 };
  var dias = mapa[periodo] || 7;
  _dbPeriodoAtual = dias;
  /* Atualiza estado dos botões */
  document.querySelectorAll('#tab-dashboard-panel .dba-tab-pill').forEach(function(b) {
    b.classList.remove('active');
  });
  if (btnEl) btnEl.classList.add('active');
  DoaVidaSync.getDoacoes().then(function(doacoes) {
    _dbRenderGraficoLinha(doacoes, dias);
  }).catch(function() { _dbRenderGraficoLinha([], dias); });
}
window.dbaSwitchPeriod = dbaSwitchPeriod;

/* ── Tempo relativo (ex: "há 3h") ──────────────────────────────── */
function _dbTempoRelativo(iso) {
  if (!iso) return "data desconhecida";
  var diff = Date.now() - new Date(iso).getTime();
  var min = Math.floor(diff / 60000);
  var h = Math.floor(diff / 3600000);
  var dias = Math.floor(diff / 86400000);
  if (diff < 60000) return "agora mesmo";
  if (min < 60) return "há " + min + " min";
  if (h < 24) return "há " + h + "h";
  if (dias < 30) return "há " + dias + " dia" + (dias !== 1 ? "s" : "");
  return new Date(iso).toLocaleDateString("pt-BR");
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 7 — ALIMENTOS (aba 2)
   ✅ BUG 1 CORRIGIDO: 'foods-grid' → 'foods-admin-grid'
   ══════════════════════════════════════════════════════════════════════ */

/* Cache local dos alimentos do Supabase (para uso síncrono em abrirModalAlimento) */
var _alimentosAdminCache = [];

async function renderAlimentos() {
  var grid = document.getElementById("foods-admin-grid");
  if (!grid) return;

  /* Spinner enquanto carrega */
  grid.innerHTML =
    '<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text2);">' +
    '<i class="fas fa-spinner fa-spin"></i> Carregando alimentos…</div>';

  var alimentos = await DoaVidaSync.getAlimentos();

  /* Retry automático uma vez se retornar vazio (Supabase pode estar lento) */
  if (!alimentos || alimentos.length === 0) {
    await new Promise(function(r) { setTimeout(r, 2500); });
    alimentos = await DoaVidaSync.getAlimentos();
  }

  _alimentosAdminCache = alimentos || [];

  if (!alimentos || alimentos.length === 0) {
    grid.innerHTML =
      '<div class="empty-state" style="grid-column:1/-1;">' +
      '<i class="fas fa-carrot"></i>' +
      '<p>Nenhum alimento encontrado.</p>' +
      '<button class="btn btn-primary btn-sm" onclick="renderAlimentos()" style="margin-bottom:8px">' +
      '<i class="fas fa-sync-alt"></i> Recarregar</button><br>' +
      '<button class="btn btn-outline btn-sm" onclick="abrirModalAlimento(null)">Cadastrar alimento</button>' +
      '</div>';
    return;
  }

  grid.innerHTML = alimentos
    .map(function (food) {
      var id = escHtml(food.id || food.name || "");
      /* Calcula a porcentagem da meta atingida */
      var pct =
        food.goal > 0
          ? Math.min(Math.round((food.kg / food.goal) * 100), 100)
          : 0;

      return (
        '<div class="food-admin-card">' +
        /* Imagem ou emoji do alimento */
        '<div class="food-admin-img">' +
        (food.img
          ? '<img src="' +
            escHtml(food.img) +
            '" alt="' +
            escHtml(food.name) +
            '" />'
          : '<span aria-hidden="true">' + (food.emoji || "🥫") + "</span>") +
        /* Botões de ação sobrepostos na imagem */
        '<div class="food-admin-img-actions">' +
        '<button class="btn-icon" onclick="abrirModalAlimento(\'' +
        id +
        "')\" " +
        'title="Editar" aria-label="Editar ' +
        escHtml(food.name) +
        '">' +
        '<i class="fas fa-pen"></i></button>' +
        '<button class="btn-icon danger" onclick="confirmarExclusaoAlimento(\'' +
        id +
        "')\" " +
        'title="Excluir" aria-label="Excluir ' +
        escHtml(food.name) +
        '">' +
        '<i class="fas fa-trash"></i></button>' +
        "</div>" +
        "</div>" +
        /* Corpo do card */
        '<div class="food-admin-body">' +
        '<div class="food-admin-name">' +
        escHtml(food.name) +
        "</div>" +
        '<div class="food-admin-stats">' +
        '<span><i class="fas fa-bullseye"></i> Meta: ' +
        (food.goal || 0) +
        " kg</span>" +
        '<span><i class="fas fa-check"></i> ' +
        (food.kg || 0) +
        " kg</span>" +
        (food.families
          ? '<span><i class="fas fa-users"></i> ' +
            food.families +
            " famílias</span>"
          : "") +
        "</div>" +
        /* Barra de progresso */
        '<div class="food-admin-progress">' +
        '<div class="food-admin-progress-fill" style="width:' +
        pct +
        '%" ' +
        'role="progressbar" aria-valuenow="' +
        pct +
        '" ' +
        'aria-valuemin="0" aria-valuemax="100"></div>' +
        "</div>" +
        '<p style="font-size:.72rem;color:var(--text2);margin-top:6px;">' +
        pct +
        "% da meta atingida</p>" +
        "</div>" +
        "</div>"
      );
    })
    .join("");
}

/*
  Abre o modal para adicionar ou editar um alimento.
  @param {string|null} id → null = novo, string = editar existente
*/
function abrirModalAlimento(id) {
  /* Limpa todos os campos do formulário */
  [
    "food-name",
    "food-goal",
    "food-kg",
    "food-peso",
    "food-img",
  ].forEach(function (campo) {
    var el = document.getElementById(campo);
    if (el) el.value = "";
  });

  /* Reseta área de upload de imagem */
  _foodImgRemover();

  /* Esconde alerta de meta */
  var metaAlerta = document.getElementById("food-meta-alerta");
  if (metaAlerta) metaAlerta.style.display = "none";

  var editId = document.getElementById("food-edit-id");
  var titulo = document.getElementById("modal-food-title");

  if (id) {
    /* Modo edição: usa cache carregado pelo renderAlimentos() */
    var food = _alimentosAdminCache.find(function (a) {
      return (a.id || a.name) === id;
    });
    if (food) {
      if (titulo) titulo.textContent = "Editar Alimento";
      if (editId) editId.value = id;
      setVal("food-name", food.name || "");
      setVal("food-goal", food.goal || "");
      setVal("food-kg",   food.kg   || "");
      setVal("food-img",  food.img  || "");

      /* Mostra preview da imagem existente */
      if (food.img) {
        var _prev    = document.getElementById('food-img-preview');
        var _prevImg = document.getElementById('food-img-preview-img');
        var _area    = document.getElementById('food-img-upload-area');
        if (_prevImg) _prevImg.src = food.img;
        if (_prev)    _prev.style.display = 'block';
        if (_area)    _area.style.display = 'none';
      }

      /* Seleciona a unidade correta */
      var unidadeVal = food.unidade || "kg";

      /* Reverte a conversão g→kg para exibir ao usuário no campo correto */
      var pesoParaExibir = (unidadeVal === "g")
        ? (parseFloat(food.peso || 0) * 1000)
        : (food.peso || "");
      setVal("food-peso", pesoParaExibir || "");
      var radKg = document.getElementById("food-unidade-kg");
      var radL  = document.getElementById("food-unidade-l");
      var radG  = document.getElementById("food-unidade-g");
      if (radKg) radKg.checked = (unidadeVal === "kg");
      if (radL)  radL.checked  = (unidadeVal === "L");
      if (radG)  radG.checked  = (unidadeVal === "g");
      _atualizarLabelsUnidade(unidadeVal);

      /* Alerta de meta atingida */
      var kg   = parseFloat(food.kg)   || 0;
      var meta = parseFloat(food.goal) || 0;
      if (metaAlerta) {
        if (meta > 0 && kg >= meta) {
          metaAlerta.textContent = "⛔ Meta atingida — arrecadação bloqueada automaticamente.";
          metaAlerta.style.display = "block";
        } else {
          metaAlerta.style.display = "none";
        }
      }

      /* Carrega dados da cesta (modelo_cesta_itens) */
      var cestaItem = (_cestasCache.modelo || []).find(function (m) {
        return m.alimento_id === id;
      });
      if (cestaItem) {
        setVal("food-cesta-qtd",     cestaItem.quantidade_por_cesta || "");
        setVal("food-cesta-item-id", cestaItem.id || "");
      } else {
        setVal("food-cesta-qtd",     "");
        setVal("food-cesta-item-id", "");
      }
    }
  } else {
    /* Modo criação — reseta unidade para kg */
    if (titulo) titulo.textContent = "Novo Alimento";
    if (editId) editId.value = "";
    var radKg = document.getElementById("food-unidade-kg");
    if (radKg) radKg.checked = true;
    _atualizarLabelsUnidade("kg");
  }

  /* Atualiza painel de info da cesta */
  atualizarInfoCestaModal();
  abrirModal("modal-food");
}
window.abrirModalAlimento = abrirModalAlimento;

/* Salva o alimento (novo ou editado) no Supabase */
async function salvarAlimento() {
  var nome = getVal("food-name");
  var meta = parseFloat(getVal("food-goal"));

  if (!nome) {
    showToast("⚠️ Nome é obrigatório.", "error");
    return;
  }
  if (isNaN(meta) || meta <= 0) {
    showToast("⚠️ Meta deve ser maior que 0.", "error");
    return;
  }

  var unidadeEl  = document.querySelector('input[name="food-unidade"]:checked');
  var unidadeVal = unidadeEl ? unidadeEl.value : "kg";
  var pesoRaw    = parseFloat(getVal("food-peso")) || 1;
  /* Gramas: o usuário digita em g, mas internamente sempre armazenamos em kg */
  var pesoEmKg   = (unidadeVal === "g") ? pesoRaw / 1000 : pesoRaw;

  var dados = {
    name:    nome,
    goal:    meta,
    kg:      parseFloat(getVal("food-kg")) || 0,
    img:     getVal("food-img")            || "",
    peso:    pesoEmKg,
    unidade: unidadeVal,
  };

  /* Configuração da cesta */
  var cestaQtd    = parseInt(getVal("food-cesta-qtd"))     || 0;
  var cestaItemId = getVal("food-cesta-item-id")           || "";

  var editId = getVal("food-edit-id");

  /* Função auxiliar: tenta salvar, se falhar por schema remove 'unidade' e tenta de novo */
  async function _salvarComFallback(dadosP, idP) {
    try {
      if (idP) {
        await DoaVidaSync.updateAlimento(idP, dadosP);
      } else {
        return await DoaVidaSync.addAlimento(dadosP);
      }
    } catch (e) {
      if (e.message && e.message.includes("unidade")) {
        /* Coluna ainda não existe no Supabase — salva sem ela */
        var dadosSemUnidade = Object.assign({}, dadosP);
        delete dadosSemUnidade.unidade;
        if (idP) {
          await DoaVidaSync.updateAlimento(idP, dadosSemUnidade);
        } else {
          return await DoaVidaSync.addAlimento(dadosSemUnidade);
        }
      } else {
        throw e;
      }
    }
  }

  try {
    var alimentoId;
    if (editId) {
      await _salvarComFallback(dados, editId);
      alimentoId = editId;
      showToast("✅ Alimento atualizado!", "success");
    } else {
      var novo = await _salvarComFallback(dados, null);
      alimentoId = novo && novo.id ? novo.id : null;
      showToast("✅ Alimento cadastrado!", "success");
    }

    /* Sincroniza item no modelo da cesta */
    if (alimentoId) {
      if (cestaQtd > 0 && cestaItemId) {
        /* Atualiza item existente */
        await DoaVidaSync.updateModeloCestaItem(cestaItemId, {
          alimento_nome:        dados.name,
          quantidade_por_cesta: cestaQtd,
          peso_unitario_kg:     dados.peso,
        });
      } else if (cestaQtd > 0 && !cestaItemId) {
        /* Adiciona novo item ao modelo */
        await DoaVidaSync.addModeloCestaItem({
          alimento_id:          alimentoId,
          alimento_nome:        dados.name,
          quantidade_por_cesta: cestaQtd,
          peso_unitario_kg:     dados.peso,
        });
      } else if (cestaQtd === 0 && cestaItemId) {
        /* Remove da cesta */
        await DoaVidaSync.deleteModeloCestaItem(cestaItemId);
      }
    }

  } catch (e) {
    showToast("❌ Erro ao salvar: " + e.message, "error");
    return;
  }

  fecharModal("modal-food");
  renderAlimentos();
  renderVisaoGeral();
  /* Atualiza aba de cestas se dados mudaram */
  if (typeof renderCestas === "function") renderCestas();
}
window.salvarAlimento = salvarAlimento;

/* ── Upload de imagem do alimento via Cloudinary ─────────────────── */
function _foodImgHandleFiles(files) {
  if (!files || files.length === 0) return;
  var arquivo = files[0];

  if (!window.DoaVidaCloudinary) {
    showToast('❌ Cloudinary não carregado.', 'error');
    return;
  }

  var validacao = DoaVidaCloudinary.validar(arquivo);
  if (!validacao.ok) {
    showToast('⚠️ ' + validacao.erro, 'error');
    return;
  }

  /* Mostra barra de progresso */
  var wrap = document.getElementById('food-img-progress-wrap');
  var bar  = document.getElementById('food-img-progress-bar');
  var txt  = document.getElementById('food-img-progress-txt');
  var area = document.getElementById('food-img-upload-area');
  if (wrap) wrap.style.display = 'block';
  if (area) area.style.display = 'none';

  DoaVidaCloudinary.upload(arquivo, 'image', function (pct) {
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = 'Enviando ' + pct + '%…';
  }).then(function (resultado) {
    /* Salva URL no campo oculto */
    var input = document.getElementById('food-img');
    if (input) input.value = resultado.url;

    /* Mostra preview */
    var prev    = document.getElementById('food-img-preview');
    var prevImg = document.getElementById('food-img-preview-img');
    if (prev)    prev.style.display = 'block';
    if (prevImg) prevImg.src = resultado.url;
    if (wrap)    wrap.style.display = 'none';

    showToast('✅ Imagem enviada!', 'success');
  }).catch(function (e) {
    if (wrap) wrap.style.display = 'none';
    if (area) area.style.display = 'block';
    showToast('❌ Falha no upload: ' + (e.message || e), 'error');
  });
}
window._foodImgHandleFiles = _foodImgHandleFiles;

function _foodImgRemover() {
  var input   = document.getElementById('food-img');
  var prev    = document.getElementById('food-img-preview');
  var prevImg = document.getElementById('food-img-preview-img');
  var area    = document.getElementById('food-img-upload-area');
  var fileEl  = document.getElementById('food-img-file');
  if (input)   input.value = '';
  if (prevImg) prevImg.src = '';
  if (prev)    prev.style.display = 'none';
  if (area)    area.style.display = 'block';
  if (fileEl)  fileEl.value = '';
}
window._foodImgRemover = _foodImgRemover;

/*
  Atualiza o painel de informações da cesta no modal de alimento.
  Lê os campos atuais do modal e recalcula a prévia em tempo real.
*/
/* Atualiza os labels "(kg)" / "(L)" nos campos de estoque */
function _atualizarLabelsUnidade(unidade) {
  var u = unidade || "kg";

  /* Label "Já Arrecadado" */
  var kgLabel = document.getElementById("food-kg-label-unit");
  if (kgLabel) kgLabel.textContent = "(" + u + ")";

  /* Label, placeholder e hint do campo "Peso por Unidade" */
  var pesoLabelUnit = document.getElementById("food-peso-label-unit");
  var pesoHint      = document.getElementById("food-peso-hint");
  var pesoInput     = document.getElementById("food-peso");

  if (u === "kg") {
    if (pesoLabelUnit) pesoLabelUnit.textContent = "kg";
    if (pesoInput) {
      pesoInput.step        = "0.001";
      pesoInput.placeholder = "Ex: 5 para saco de 5kg, 1 para pacote de 1kg";
    }
    if (pesoHint) pesoHint.innerHTML = '📌 Peso de <strong>uma unidade</strong> do pacote (ex: 5 para "Arroz 5kg").';
  } else if (u === "L") {
    if (pesoLabelUnit) pesoLabelUnit.textContent = "L";
    if (pesoInput) {
      pesoInput.step        = "0.001";
      pesoInput.placeholder = "Ex: 1 para garrafa de 1L, 0.5 para 500mL";
    }
    if (pesoHint) pesoHint.innerHTML = '📌 Volume de <strong>uma unidade</strong> (ex: 1 para garrafa de 1L).';
  } else if (u === "g") {
    if (pesoLabelUnit) pesoLabelUnit.textContent = "g";
    if (pesoInput) {
      pesoInput.step        = "1";
      pesoInput.placeholder = "Ex: 200 para pacote de 200g, 500 para pacote de 500g";
    }
    if (pesoHint) pesoHint.innerHTML = '📌 Peso de <strong>uma unidade</strong> em gramas (ex: 200 para pacote de 200g). O sistema converte automaticamente para kg.';
  }
}
window._atualizarLabelsUnidade = _atualizarLabelsUnidade;

function atualizarInfoCestaModal() {
  /* Atualiza labels de unidade */
  var unidadeChecked = document.querySelector('input[name="food-unidade"]:checked');
  _atualizarLabelsUnidade(unidadeChecked ? unidadeChecked.value : "kg");
  var infoPanel = document.getElementById("food-modal-cesta-info");
  if (!infoPanel) return;

  /* Lê dados do alimento atualmente sendo editado */
  var alimentoId   = getVal("food-edit-id")             || null;
  var cestaQtd     = parseInt(getVal("food-cesta-qtd")) || 0;
  var pesoRawModal = parseFloat(getVal("food-peso"))    || 0;
  var unidadeModal = (document.querySelector('input[name="food-unidade"]:checked') || {}).value || "kg";
  /* Sempre em kg para o cálculo — gramas precisam ser convertidas */
  var peso         = (unidadeModal === "g") ? pesoRawModal / 1000 : pesoRawModal;
  var kg           = parseFloat(getVal("food-kg"))      || 0;
  var meta         = parseFloat(getVal("food-goal"))    || 0;
  var nome        = getVal("food-name")                         || "este alimento";

  /* Atualiza alerta de meta */
  var metaAlerta = document.getElementById("food-meta-alerta");
  if (metaAlerta) {
    if (meta > 0 && kg >= meta) {
      metaAlerta.textContent = "⛔ Meta atingida — arrecadação bloqueada automaticamente.";
      metaAlerta.style.display = "block";
    } else {
      metaAlerta.style.display = "none";
    }
  }

  /* Se não participa da cesta, mostra mensagem simples */
  if (cestaQtd === 0) {
    infoPanel.innerHTML =
      '<div class="food-modal-cesta-info-row">' +
      '<i class="fas fa-info-circle" style="color:var(--text2)"></i>' +
      '<span style="color:var(--text2);font-size:0.82rem">Este alimento não está configurado para a cesta básica. ' +
      'Defina a quantidade por cesta acima para ativá-lo.</span>' +
      '</div>';
    return;
  }

  /* Cálculo de participação */
  var unidadesDisp   = peso > 0 ? Math.floor(kg / peso)         : 0;
  var cestasPossiveis = cestaQtd > 0 ? Math.floor(unidadesDisp / cestaQtd) : 0;

  /* Total possível de cestas com o estoque GLOBAL (usa cache se disponível) */
  var calc = _cestasCache && _cestasCache.calculo ? _cestasCache.calculo : null;
  var totalCestas = calc ? calc.total : cestasPossiveis;
  var ehLimitante = calc && calc.limitante && calc.limitante.alimento_id === alimentoId;

  /* Porcentagem de consumo da meta */
  var pctMeta = meta > 0 ? Math.min(100, (kg / meta) * 100).toFixed(1) : 0;

  /* Monta HTML do painel */
  var html = "";

  /* Linha 1 — Participação */
  html +=
    '<div class="food-modal-cesta-info-row">' +
    '<span class="food-modal-cesta-info-label">📦 Participação na Cesta</span>' +
    '<span class="food-modal-cesta-info-value">' +
    '<strong>' + cestaQtd + '</strong> unidade(s) de ' +
    escHtml(nome) + ' por cesta' +
    (ehLimitante ? ' <span class="badge-limitante">⚠️ item limitante</span>' : '') +
    '</span>' +
    '</div>';

  /* Linha 2 — Cálculo Automático */
  html +=
    '<div class="food-modal-cesta-info-row">' +
    '<span class="food-modal-cesta-info-label">📊 Cálculo Automático</span>' +
    '<div class="food-modal-cesta-info-value">' +
    '<div class="food-modal-calculo-step">' +
    '<span>' + kg.toFixed(2) + ' kg ÷ ' + peso.toFixed(3) + ' kg/un = ' +
    '<strong>' + unidadesDisp + ' unidades</strong></span>' +
    '</div>' +
    '<div class="food-modal-calculo-step">' +
    '<span>' + unidadesDisp + ' un ÷ ' + cestaQtd + ' por cesta = ' +
    '<strong>' + cestasPossiveis + ' cestas possíveis</strong> com este item</span>' +
    '</div>' +
    '</div>' +
    '</div>';

  /* Linha 3 — Meta */
  html +=
    '<div class="food-modal-cesta-info-row">' +
    '<span class="food-modal-cesta-info-label">🎯 Meta de Arrecadação</span>' +
    '<div class="food-modal-cesta-info-value">' +
    '<div style="display:flex;align-items:center;gap:8px;">' +
    '<div class="food-modal-meta-bar-wrap">' +
    '<div class="food-modal-meta-bar-fill" style="width:' + pctMeta + '%"></div>' +
    '</div>' +
    '<span><strong>' + pctMeta + '%</strong> (' + kg.toFixed(1) + ' / ' + meta.toFixed(1) + ' kg)</span>' +
    '</div>' +
    (meta > 0 && kg >= meta
      ? '<div style="color:#e55a5a;font-size:0.78rem;margin-top:4px">⛔ Meta atingida — doação bloqueada</div>'
      : '') +
    '</div>' +
    '</div>';

  infoPanel.innerHTML = html;
}
window.atualizarInfoCestaModal = atualizarInfoCestaModal;

async function confirmarExclusaoAlimento(id) {
  if (!confirm("Excluir este alimento? Ele será removido da página de doação e da configuração da cesta.")) return;
  try {
    /* Remove da cesta (modelo_cesta_itens) se existir — evita registro órfão */
    var cestaItem = (_cestasCache.modelo || []).find(function (m) {
      return m.alimento_id === id;
    });
    if (cestaItem) {
      try { await DoaVidaSync.deleteModeloCestaItem(cestaItem.id); } catch (e) { /* ignora */ }
    }
    /* Remove o alimento */
    await DoaVidaSync.deleteAlimento(id);
    showToast("🗑️ Alimento excluído.", "info");
  } catch (e) {
    showToast("❌ Erro ao excluir: " + e.message, "error");
    return;
  }
  renderAlimentos();
  renderVisaoGeral();
  if (typeof renderCestas === "function") renderCestas();
}
window.confirmarExclusaoAlimento = confirmarExclusaoAlimento;

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 8 — DOAÇÕES (aba 3)
   Tabela com busca e filtro por status
   ══════════════════════════════════════════════════════════════════════ */

/*
  _montarCardDoacao(d, simples)
  ─────────────────────────────────────────────────────────────────────
  Retorna o HTML de um card de doação para a versão MOBILE.

  No mobile (≤ 768px) a tabela horizontal fica oculta (CSS) e estes
  cards empilhados são exibidos no lugar — sem nenhum scroll horizontal.

  Cada card é clicável: abre o drawer full-screen #modal-doacao-detalhe
  via abrirDetalheDoacao(id).

  PARÂMETROS:
  • d       {object}  → objeto de doação vindo do localStorage (api.js)
  • simples {boolean} → true = versão compacta para "Visão Geral"
                        false = versão completa para aba "Doações"

  CAMPOS RENDERIZADOS (versão completa):
  • Nome (header bold)
  • Badge de status (header direita)
  • Telefone clicável → WhatsApp
  • Alimento | Quantidade (dupla coluna)
  • Entrega
  • Data / Horário
  • Observações (visível só se houver conteúdo)
  • Indicador visual de clicável (chevron)
*/
function _montarCardDoacao(d, simples) {
  var id = escHtml(d.id || "");
  var fone = (d.phone || "").replace(/\D/g, ""); /* apenas dígitos para a URL */

  /* ── Link de WhatsApp (telefone clicável) ── */
  var foneHtml = fone
    ? '<a href="https://wa.me/55' +
      fone +
      '" target="_blank" rel="noopener" ' +
      'class="card-mob-link" onclick="event.stopPropagation();" ' +
      'aria-label="Abrir WhatsApp para ' +
      escHtml(d.phone) +
      '">' +
      '<i class="fab fa-whatsapp" aria-hidden="true"></i> ' +
      escHtml(d.phone) +
      "</a>"
    : '<span style="color:var(--text2);">—</span>';

  /* ── Texto da forma de entrega (código → label legível) ── */
  var labelEntrega = DoaVidaAPI._labelEntrega
    ? DoaVidaAPI._labelEntrega(d.delivery)
    : d.delivery || "—";

  /* ── Observações: só renderiza se tiver conteúdo ── */
  var obsHtml = "";
  if (!simples && d.obs && d.obs.trim()) {
    obsHtml =
      '<div class="card-mob-row">' +
      '<span class="card-mob-label">' +
      '<i class="fas fa-comment-alt" aria-hidden="true"></i> OBSERVAÇÕES' +
      "</span>" +
      '<span class="card-mob-valor card-mob-obs">' +
      escHtml(d.obs) +
      "</span>" +
      "</div>";
  }

  /* ── Entrega: só na versão completa ── */
  var entregaHtml = simples
    ? ""
    : '<div class="card-mob-row">' +
      '<span class="card-mob-label">' +
      '<i class="fas fa-truck" aria-hidden="true"></i> ENTREGA' +
      "</span>" +
      '<span class="card-mob-valor">' +
      escHtml(labelEntrega) +
      "</span>" +
      "</div>";

  /* ── Monta o HTML do card ── */
  return (
    '<div class="doacao-card-mob" ' +
    "onclick=\"abrirDetalheDoacao('" +
    id +
    "')\" " +
    'role="button" tabindex="0" ' +
    'title="Toque para ver detalhes" ' +
    "onkeypress=\"if(event.key==='Enter')abrirDetalheDoacao('" +
    id +
    "')\" " +
    'aria-label="Doação de ' +
    escHtml(d.name || "") +
    ", status " +
    escHtml(d.status || "") +
    '">' +
    /* ─── Cabeçalho: nome + badge de status ─────────────── */
    '<div class="card-mob-header">' +
    '<span class="card-mob-nome">' +
    escHtml(d.name || "—") +
    "</span>" +
    '<span class="card-mob-status">' +
    badgeStatus(d.status) +
    "</span>" +
    "</div>" +
    /* ─── Telefone (link WhatsApp) ───────────────────────── */
    '<div class="card-mob-row">' +
    '<span class="card-mob-label">' +
    '<i class="fas fa-phone" aria-hidden="true"></i> TELEFONE' +
    "</span>" +
    '<span class="card-mob-valor">' +
    foneHtml +
    "</span>" +
    "</div>" +
    /* ─── Alimento + Quantidade lado a lado ─────────────── */
    '<div class="card-mob-duplo">' +
    "<div>" +
    '<div class="card-mob-label">' +
    '<i class="fas fa-box" aria-hidden="true"></i> ALIMENTO' +
    "</div>" +
    '<div class="card-mob-valor">' +
    escHtml(d.food || "—") +
    "</div>" +
    "</div>" +
    "<div>" +
    '<div class="card-mob-label">' +
    '<i class="fas fa-weight-hanging" aria-hidden="true"></i> QUANTIDADE' +
    "</div>" +
    '<div class="card-mob-valor">' +
    parseFloat(d.total_kg || d.amount || 0).toFixed(1) +
    " kg</div>" +
    "</div>" +
    "</div>" +
    /* ─── Entrega (versão completa) ──────────────────────── */
    entregaHtml +
    /* ─── Data e Horário (separados) ────────────────────────── */
    (function() {
      var _dataApenas = "—", _horaApenas = "—";
      if (d.created_at) {
        try {
          var _dt = new Date(d.created_at);
          _dataApenas = _dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
          _horaApenas = _dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        } catch(e) {}
      }
      return (
        '<div class="card-mob-row">' +
        '<span class="card-mob-label"><i class="fas fa-calendar-alt" aria-hidden="true"></i> DATA</span>' +
        '<span class="card-mob-valor">' + _dataApenas + '</span>' +
        '</div>' +
        '<div class="card-mob-row">' +
        '<span class="card-mob-label"><i class="fas fa-clock" aria-hidden="true"></i> HORÁRIO</span>' +
        '<span class="card-mob-valor">' + _horaApenas + '</span>' +
        '</div>'
      );
    })() +
    /* ─── Observações (condicional) ──────────────────────── */
    obsHtml +
    /* ─── Indicador de ação: chevron direita ─────────────── */
    '<div class="card-mob-action-hint" aria-hidden="true">' +
    '<i class="fas fa-chevron-right"></i> Ver detalhes' +
    "</div>" +
    "</div>" /* fim .doacao-card-mob */
  );
}

async function renderDoacoes() {
  var tbody = document.getElementById("donations-tbody");
  var doacoes = await DoaVidaSync.getDoacoes();
  var busca = (getVal("donations-search") || "").toLowerCase();
  var filtro = getVal("donations-filter") || "";
  if (!tbody) return;

  /* Aplica filtros de busca e status */
  var filtradas = doacoes.filter(function (d) {
    var matchBusca =
      !busca ||
      (d.name || "").toLowerCase().includes(busca) ||
      (d.food || "").toLowerCase().includes(busca) ||
      (d.protocolo || "").toLowerCase().includes(busca);
    var matchFiltro = !filtro || d.status === filtro;
    return matchBusca && matchFiltro;
  });

  /* ── Estado vazio: mesma mensagem na tabela E nos cards mobile ── */
  var msgVazia =
    busca || filtro
      ? "Nenhuma doação encontrada."
      : "Nenhuma doação registrada.";

  if (filtradas.length === 0) {
    /* Tabela (desktop) */
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:var(--text2);padding:40px;">' +
      msgVazia +
      "</td></tr>";

    /* Cards mobile */
    var mobileVazio = document.getElementById("donations-cards-mobile");
    if (mobileVazio) {
      mobileVazio.innerHTML =
        '<div class="empty-state">' +
        '<i class="fas fa-inbox"></i>' +
        "<p>" +
        msgVazia +
        "</p>" +
        "</div>";
    }
    return;
  }

  /* ── Tabela desktop: linhas clicáveis ─────────────────────────── */
  tbody.innerHTML = filtradas
    .map(function (d) {
      var idEsc = escHtml(d.id || "");
      var fone = (d.phone || "").replace(/\D/g, ""); /* remove não-dígitos */

      /*
      Linha inteira clicável → abrirDetalheDoacao(id).
      Botões de ação com stopPropagation para não abrir o detalhe ao clicar.
    */
      return (
        '<tr style="cursor:pointer;" onclick="abrirDetalheDoacao(\'' +
        idEsc +
        '\')" title="Ver detalhes da doação">' +
        "<td><strong>" +
        escHtml(d.name || "—") +
        "</strong></td>" +
        /* Link WhatsApp clicável se tiver telefone */
        "<td>" +
        (fone
          ? '<a href="https://wa.me/55' +
            fone +
            '" target="_blank" rel="noopener" style="color:var(--gold);" onclick="event.stopPropagation();">' +
            escHtml(d.phone) +
            "</a>"
          : "—") +
        "</td>" +
        "<td>" +
        escHtml(d.food || "—") +
        "</td>" +
        "<td>" +
        parseFloat(d.total_kg || d.amount || 0).toFixed(1) +
        " kg</td>" +
        "<td>" +
        badgeStatus(d.status) +
        "</td>" +
        '<td style="font-size:.78rem;color:var(--text2);">' +
        formatarDataCurta(d.created_at) +
        "</td>" +
        '<td><div class="table-actions">' +
        '<button class="btn-icon" onclick="event.stopPropagation();abrirEdicaoStatus(\'' +
        idEsc +
        '\')" title="Editar status">' +
        '<i class="fas fa-pen"></i></button>' +
        '<button class="btn-icon danger" onclick="event.stopPropagation();confirmarExclusaoDoacao(\'' +
        idEsc +
        '\')" title="Excluir">' +
        '<i class="fas fa-trash"></i></button>' +
        "</div></td>" +
        "</tr>"
      );
    })
    .join("");

  /* ── Cards mobile: substitui a tabela em telas ≤ 768px ─────────── */
  var mobileList = document.getElementById("donations-cards-mobile");
  if (mobileList) {
    mobileList.innerHTML = filtradas
      .map(function (d) {
        return _montarCardDoacao(d, false);
      })
      .join("");
  }

  /* ── Atualiza stats e gráfico de status com os dados do Supabase ── */
  renderDonationsStatusChart(doacoes);
}

async function abrirEdicaoStatus(id) {
  var lista = await DoaVidaSync.getDoacoes();
  var d = lista.find(function (x) {
    return x.id === id;
  });
  if (!d) return;
  setVal("donation-edit-id", id);
  setVal("donation-new-status", d.status || "pendente");
  setVal("donation-obs", d.obs || "");
  abrirModal("modal-donation-status");
}
window.abrirEdicaoStatus = abrirEdicaoStatus;

/*
  abrirDetalheDoacao(id)
  ──────────────────────
  Abre o modal #modal-doacao-detalhe com a ficha completa do doador.

  COMPORTAMENTO:
  • No mobile  → drawer full-screen sobe da parte inferior da tela
  • No desktop → modal centralizado padrão

  CAMPOS POPULADOS:
  • det-nome      → nome do doador
  • det-telefone  → telefone clicável (link WhatsApp)
  • det-alimento  → nome do alimento
  • det-quantidade → quantidade em kg
  • det-entrega   → forma de entrega (texto legível via _labelEntrega)
  • det-data      → data formatada (dd/mm/aa - hh:mm)
  • det-status    → badge colorido de status
  • det-obs       → observações (visível só se houver conteúdo)

  O botão "Editar Status" no rodapé chama abrirEdicaoStatus(id)
  para abrir o modal de edição sem fechar o detalhe.

  @param {string} id → ID da doação (gerado pelo api.js)
*/
async function abrirDetalheDoacao(id) {
  var _listaDoacoes = await DoaVidaSync.getDoacoes();
  var d = _listaDoacoes.find(function (x) {
    return x.id === id;
  });
  if (!d) return;

  /* ── Monta lista de itens ───────────────────────────────────────── */
  /*
    Usa d.itens (JSONB salvo pelo formulário) para mostrar qty e kg corretos por item.
    Fallback para d.food (lista de nomes) + d.total_kg caso d.itens esteja vazio.
  */
  var itensHtml;
  var itensArray = Array.isArray(d.itens) && d.itens.length > 0 ? d.itens : null;

  if (itensArray) {
    /* Caminho correto: usa os dados detalhados por item */
    itensHtml = itensArray
      .map(function (item) {
        var nomeItem  = escHtml(item.nome || item.name || "—");
        var qtyItem   = item.qty || 0;
        var kgItem    = (item.totalKg || 0).toFixed(1);
        return (
          '<div class="comp-linha">' +
          '<span class="comp-val" style="font-weight:500;">' + nomeItem + '</span>' +
          /* Exibe "2 un · 2.0 kg" para indicar quantidade e peso corretamente */
          '<span class="comp-val">' + qtyItem + ' un · ' + kgItem + ' kg</span>' +
          '</div>'
        );
      })
      .join("");
  } else {
    /* Fallback legado: d.itens não disponível, usa nomes de d.food */
    var nomesBrutos = (d.food || "")
      .split(",")
      .map(function (s) { return s.trim(); })
      .filter(Boolean);

    if (nomesBrutos.length === 0) {
      itensHtml = '<div class="comp-linha"><span class="comp-label">—</span></div>';
    } else {
      /* Distribui o total_kg igualmente entre os itens quando não há detalhe */
      var kgPorItem = nomesBrutos.length > 0
        ? ((d.total_kg || 0) / nomesBrutos.length).toFixed(1)
        : "—";
      itensHtml = nomesBrutos
        .map(function (nome) {
          return (
            '<div class="comp-linha">' +
            '<span class="comp-val" style="font-weight:500;">' + escHtml(nome) + '</span>' +
            '<span class="comp-val">' + kgPorItem + ' kg</span>' +
            '</div>'
          );
        })
        .join("");
    }
  }

  /* ── Entrega ── */
  var entregaLabel = DoaVidaAPI._labelEntrega
    ? DoaVidaAPI._labelEntrega(d.delivery)
    : d.delivery || "—";

  /* ── Data ── */
  var dataFmt = formatarDataCurta(d.created_at);

  /* ── Fone ── */
  var fone = (d.phone || "").replace(/\D/g, "");
  var foneHtml = fone
    ? '<a href="https://wa.me/55' +
      fone +
      '" target="_blank" rel="noopener" ' +
      'style="color:var(--gold);text-decoration:none;">' +
      '<i class="fab fa-whatsapp"></i> ' +
      escHtml(d.phone) +
      "</a>"
    : "—";

  /* ── Data e Hora separadas ── */
  var dataApenas = "—";
  var horaApenas = "—";
  if (d.created_at) {
    try {
      var _dt = new Date(d.created_at);
      dataApenas = _dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
      horaApenas = _dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch (e) { /* mantém —  */ }
  }

  /* ── Monta o HTML com campos editáveis (Click to Edit) ── */
  var corpo = document.getElementById("detalhe-corpo");
  if (corpo) {
    /*
      Estilos inline para os campos editáveis dentro do comprovante.
      Usamos select e textarea para status, delivery e observações.
    */
    var selectStyle = 'style="width:100%;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);color:var(--cream);font-size:.85rem;cursor:pointer;"';
    var textareaStyle = 'style="width:100%;min-height:64px;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);color:var(--cream);font-size:.82rem;resize:vertical;box-sizing:border-box;"';

    /* ── Calcula total kg ── */
    var totalKg = 0;
    if (itensArray) {
      itensArray.forEach(function(item){ totalKg += (item.totalKg || 0); });
    } else {
      totalKg = d.total_kg || 0;
    }

    /* ── Monta linhas da tabela de itens no estilo cupom ── */
    var itensRecibo;
    if (itensArray) {
      itensRecibo = itensArray.map(function(item){
        var nome = escHtml((item.nome || item.name || "—").toUpperCase());
        var qty  = item.qty || 0;
        var kg   = (item.totalKg || 0).toFixed(1);
        return (
          '<tr>' +
          '<td style="font-weight:700;letter-spacing:.04em;">' + nome + '</td>' +
          '<td style="text-align:center;">' + qty + ' un</td>' +
          '<td style="text-align:right;font-weight:700;">' + kg + ' kg</td>' +
          '</tr>'
        );
      }).join('');
    } else {
      var nomesFb = (d.food || "").split(",").map(function(s){ return s.trim(); }).filter(Boolean);
      var kgFb = nomesFb.length > 0 ? (totalKg / nomesFb.length).toFixed(1) : "—";
      itensRecibo = nomesFb.map(function(n){
        return '<tr><td style="font-weight:700;">' + escHtml(n.toUpperCase()) + '</td><td style="text-align:center;">1 un</td><td style="text-align:right;font-weight:700;">' + kgFb + ' kg</td></tr>';
      }).join('');
    }

    var protocolo = escHtml(d.protocolo || ('DOA-' + (d.created_at || '').substring(0,10).replace(/-/g,'') + '-' + (d.id || '').substring(0,5).toUpperCase()));

    corpo.innerHTML =
      '<input type="hidden" id="det-doacao-id" value="' + escHtml(id) + '">' +

      /* ══════════════ RECIBO ESTILO CUPOM FISCAL ══════════════ */
      '<div style="' +
        'background:#fff;color:#111;font-family:\'Courier New\',monospace;' +
        'border:1px dashed #ccc;border-radius:4px;padding:20px 18px;' +
        'font-size:0.78rem;line-height:1.6;max-width:420px;margin:0 auto 20px;' +
      '">' +

        /* Logos */
        '<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:12px;">' +
          '<div style="text-align:center;">' +
            '<img src="logo-semear.jpeg" style="height:64px;width:auto;border-radius:8px;object-fit:contain;" alt="Semear"/>' +
            '<div style="font-size:.62rem;margin-top:4px;">Ação Social<br>Semear</div>' +
          '</div>' +
          '<span style="font-size:1.2rem;color:#888;">✦</span>' +
          '<div style="text-align:center;">' +
            '<img src="logo-maanaim.jpeg" style="height:64px;border-radius:50%;object-fit:cover;" alt="Maanaim"/>' +
            '<div style="font-size:.62rem;margin-top:4px;">Comunidade<br>Maanaim</div>' +
          '</div>' +
        '</div>' +

        '<div style="text-align:center;font-size:.68rem;color:#555;margin-bottom:10px;">Belém, Pará — Brasil</div>' +

        /* Separador */
        '<div style="border-top:1px dashed #bbb;margin:8px 0;"></div>' +
        '<div style="text-align:center;font-weight:700;letter-spacing:.08em;font-size:.75rem;margin:6px 0;">COMPROVANTE DE DOAÇÃO DE ALIMENTOS</div>' +
        '<div style="border-top:1px dashed #bbb;margin:8px 0;"></div>' +

        /* Protocolo, data, hora */
        '<div>PROTOCOLO : <strong>' + protocolo + '</strong></div>' +
        '<div style="display:flex;gap:20px;">' +
          '<span>DATA : <strong>' + dataApenas + '</strong></span>' +
          '<span>HORA: <strong>' + horaApenas + '</strong></span>' +
        '</div>' +
        '<div style="border-top:1px dashed #bbb;margin:8px 0;"></div>' +

        /* Doador */
        '<div>DOADOR : <strong>' + escHtml((d.name || '—').toUpperCase()) + '</strong></div>' +
        '<div>WHATSAPP : <strong>' + escHtml(d.phone || '—') + '</strong></div>' +
        '<div>ENTREGA : <strong>' + escHtml(entregaLabel) + '</strong></div>' +
        '<div>STATUS : <strong>' + escHtml((d.status || 'pendente').toUpperCase()) + '</strong></div>' +
        '<div style="border-top:1px dashed #bbb;margin:8px 0;"></div>' +

        /* Tabela de itens */
        '<div style="font-weight:700;letter-spacing:.06em;margin-bottom:4px;">ITENS DOADOS</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:.76rem;">' +
          '<thead>' +
            '<tr style="border-bottom:1px dashed #bbb;">' +
              '<th style="text-align:left;font-weight:700;letter-spacing:.04em;">DESCRIÇÃO</th>' +
              '<th style="text-align:center;font-weight:700;">QTD</th>' +
              '<th style="text-align:right;font-weight:700;">TOTAL</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' + itensRecibo + '</tbody>' +
        '</table>' +
        '<div style="border-top:1px dashed #bbb;margin:8px 0;"></div>' +

        /* Total */
        '<div style="display:flex;justify-content:space-between;font-weight:700;font-size:.88rem;">' +
          '<span>&gt;&gt;&gt; TOTAL DOADO</span>' +
          '<span>' + totalKg.toFixed(1) + ' kg</span>' +
        '</div>' +
        '<div style="border-top:1px dashed #bbb;margin:8px 0;"></div>' +

        /* Versículo */
        '<div style="text-align:center;font-style:italic;font-size:.70rem;color:#555;margin:8px 0;">' +
          '"Pois tive fome e me destes de comer;<br>tive sede e me destes de beber..."<br>' +
          '<span style="font-style:normal;">— Mateus 25:35</span>' +
        '</div>' +
        '<div style="text-align:center;font-weight:700;letter-spacing:.06em;font-size:.72rem;margin-top:6px;">*** OBRIGADO PELA SUA DOAÇÃO! ***</div>' +
        '<div style="border-top:1px dashed #bbb;margin:8px 0;"></div>' +
        '<div style="text-align:center;font-size:.65rem;color:#999;">* ' + protocolo + ' *</div>' +

      '</div>' +
      /* ══════════════ FIM DO CUPOM ══════════════ */

      /* ══════════════ CAMPOS EDITÁVEIS DO ADMIN ══════════════ */
      '<div class="comp-recibo">' +
        '<div class="comp-bloco">' +
          '<div class="comp-bloco-title">✏️ Editar Doação</div>' +

          '<div class="comp-linha" style="flex-direction:column;align-items:flex-start;gap:6px;">' +
            '<span class="comp-label">Forma de Entrega</span>' +
            '<select id="det-delivery" ' + selectStyle + '>' +
              '<option value="retirada"' + (d.delivery === "retirada"  ? " selected" : "") + '>🏛️ Retirada na Igreja</option>' +
              '<option value="coleta"'  + (d.delivery === "coleta"    ? " selected" : "") + '>🚗 Coleta em Casa</option>' +
              '<option value="evento"'  + (d.delivery === "evento"    ? " selected" : "") + '>🎉 Evento</option>' +
            '</select>' +
          '</div>' +

          '<div class="comp-linha" style="flex-direction:column;align-items:flex-start;gap:6px;margin-top:10px;">' +
            '<span class="comp-label">Status</span>' +
            '<select id="det-status" ' + selectStyle + '>' +
              '<option value="pendente"'   + (d.status === "pendente"   ? " selected" : "") + '>⏳ Pendente</option>' +
              '<option value="confirmado"' + (d.status === "confirmado" ? " selected" : "") + '>✅ Confirmado</option>' +
              '<option value="entregue"'   + (d.status === "entregue"   ? " selected" : "") + '>📦 Entregue</option>' +
              '<option value="cancelado"'  + (d.status === "cancelado"  ? " selected" : "") + '>❌ Cancelado</option>' +
            '</select>' +
          '</div>' +

          '<div class="comp-linha" style="flex-direction:column;align-items:flex-start;gap:6px;margin-top:10px;">' +
            '<span class="comp-label">Observações</span>' +
            '<textarea id="det-obs" ' + textareaStyle + ' placeholder="Observações ou pedido de oração…">' +
              escHtml(d.observacao || d.obs || "") +
            '</textarea>' +
          '</div>' +

        '</div>' +
      '</div>'; /* fim campos editáveis */
  }

  /* ── Botão WhatsApp do doador ── */
  var btnDetWa = document.getElementById("btn-detalhe-wa");
  if (btnDetWa) {
    var foneDetWa = (d.phone || "").replace(/\D/g, "");
    var statusMapa = { pendente: "⏳ Pendente", confirmado: "✅ Confirmado", entregue: "📦 Entregue", cancelado: "❌ Cancelado" };
    var linhasDet = [
      "🌾 *Ação Social Semear*",
      "*Comprovante de Doação*",
      "",
      "👤 *Doador*",
      "Nome: " + (d.name || "—"),
      "Telefone: " + (d.phone || "—"),
      "",
      "🧺 *Alimentos*",
    ];

    /* Usa d.itens (JSONB) para montar o texto com qty e kg corretos por item */
    var itensDetArray = Array.isArray(d.itens) && d.itens.length > 0 ? d.itens : null;
    if (itensDetArray) {
      itensDetArray.forEach(function(item) {
        linhasDet.push("• " + (item.nome || item.name || "—") + " — " + (item.qty || 0) + " un · " + (item.totalKg || 0).toFixed(1) + " kg");
      });
    } else {
      /* Fallback legado: usa nomes de d.food e total_kg dividido igualmente */
      var nomesBrutosDet = (d.food || "").split(",").map(function(s){ return s.trim(); }).filter(Boolean);
      if (nomesBrutosDet.length > 0) {
        var kgDetPorItem = nomesBrutosDet.length > 0
          ? ((d.total_kg || 0) / nomesBrutosDet.length).toFixed(1)
          : "—";
        nomesBrutosDet.forEach(function(n) {
          linhasDet.push("• " + n + " — " + kgDetPorItem + " kg");
        });
      } else {
        linhasDet.push("—");
      }
    }
    linhasDet.push("");
    linhasDet.push("🚚 *Entrega*");
    linhasDet.push("Forma: " + entregaLabel);
    linhasDet.push("Data: " + dataApenas);
    linhasDet.push("Horário: " + horaApenas);
    linhasDet.push("Status: " + (statusMapa[d.status] || d.status || "—"));
    if (d.obs && d.obs.trim()) {
      linhasDet.push("Obs.: " + d.obs.trim());
    }
    var textoDet = linhasDet.join("\n");
    btnDetWa.href = "https://wa.me/?text=" + encodeURIComponent(textoDet);
  }

  /* ── Botão "Salvar" — substitui "Editar Status" ── */
  var btnEditar = document.getElementById("btn-detalhe-editar");
  if (btnEditar) {
    /* Clona para remover listeners antigos e evitar duplo-bind */
    var novoBtn = btnEditar.cloneNode(true);
    novoBtn.innerHTML = '<i class="fas fa-save" aria-hidden="true"></i> Salvar';
    btnEditar.parentNode.replaceChild(novoBtn, btnEditar);
    novoBtn.addEventListener("click", salvarEdicaoDoacao);
  }

  abrirModal("modal-doacao-detalhe");
}
window.abrirDetalheDoacao = abrirDetalheDoacao;

/*
  Salva as alterações feitas no modal de detalhe de doação (Click to Edit).
  Lê delivery, status e observações dos campos editáveis e salva no Supabase.
*/
async function salvarEdicaoDoacao() {
  var id       = (document.getElementById("det-doacao-id") || {}).value;
  var delivery = (document.getElementById("det-delivery")  || {}).value;
  var status   = (document.getElementById("det-status")    || {}).value;
  var obs      = (document.getElementById("det-obs")       || {}).value || "";

  if (!id) { showToast("⚠️ ID da doação não encontrado.", "error"); return; }

  try {
    /* Salva os campos editáveis no Supabase */
    await DoaVidaSync.updateDoacao(id, {
      delivery:   delivery,
      status:     status,
      observacao: obs,
    });
    fecharModal("modal-doacao-detalhe");
    showToast("✅ Doação atualizada!", "success");
    /* O canal Realtime atualiza a tabela automaticamente */
  } catch (e) {
    showToast("❌ Erro ao salvar: " + (e.message || e), "error");
  }
}
window.salvarEdicaoDoacao = salvarEdicaoDoacao;

async function salvarStatusDoacao() {
  var id = getVal("donation-edit-id");
  var status = getVal("donation-new-status");
  var obs = getVal("donation-obs");
  if (!id || !status) return;
  await DoaVidaSync.updateDoacaoStatus(id, status);
  fecharModal("modal-donation-status");
  renderDoacoes();
  atualizarBadges();
  showToast("✅ Status atualizado!", "success");
}
window.salvarStatusDoacao = salvarStatusDoacao;

async function confirmarExclusaoDoacao(id) {
  if (!confirm("Excluir esta doação?")) return;
  await DoaVidaSync.deleteDoacao(id);
  renderDoacoes();
  renderVisaoGeral(); /* atualiza "Kg Arrecadados" e "Tipos de Alimento" */
  renderDashboard(); /* atualiza gráficos e métricas do dashboard */
  atualizarBadges();
  showToast("🗑️ Doação excluída.", "info");
}
window.confirmarExclusaoDoacao = confirmarExclusaoDoacao;

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 9 — FAMÍLIAS (aba 4)
   ══════════════════════════════════════════════════════════════════════ */

/* ── Card mobile de família ──────────────────────────────────────── */
function _montarCardFamilia(f) {
  var id = escHtml(f.id || "");
  var fone = (f.phone || "").replace(/\D/g, "");
  var foneHtml = fone
    ? '<a href="https://wa.me/55' +
      fone +
      '" target="_blank" rel="noopener" class="card-mob-link">' +
      '<i class="fab fa-whatsapp"></i> ' +
      escHtml(f.phone) +
      "</a>"
    : "—";
  var _famDt = f.created_at ? new Date(f.created_at) : null;
  var _famDataApenas = _famDt ? _famDt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "";
  var _famHoraApenas = _famDt ? _famDt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
  var pessoasHtml = f.pessoas
    ? '<span style="font-family:var(--ff-mono);font-size:.65rem;color:var(--text2);white-space:nowrap;">' +
      f.pessoas +
      " pessoa" +
      (f.pessoas != 1 ? "s" : "") +
      "</span>"
    : "";

  return (
    '<div class="doacao-card-mob" style="cursor:default;">' +
    '<div class="card-mob-header">' +
    '<span class="card-mob-nome">' +
    escHtml(f.name || "—") +
    "</span>" +
    pessoasHtml +
    "</div>" +
    '<div class="card-mob-row">' +
    '<span class="card-mob-label"><i class="fab fa-whatsapp"></i> WhatsApp</span>' +
    '<span class="card-mob-valor">' +
    foneHtml +
    "</span>" +
    "</div>" +
    (f.endereco
      ? '<div class="card-mob-row"><span class="card-mob-label"><i class="fas fa-map-marker-alt"></i> Endereço</span>' +
        '<span class="card-mob-valor" style="font-size:.82rem;">' +
        escHtml(f.endereco) +
        "</span></div>"
      : "") +
    (f.obs
      ? '<div class="card-mob-row"><span class="card-mob-label"><i class="fas fa-sticky-note"></i> Obs.</span>' +
        '<span class="card-mob-valor card-mob-obs">' +
        escHtml(f.obs) +
        "</span></div>"
      : "") +
    (_famDataApenas
      ? '<div class="card-mob-row"><span class="card-mob-label"><i class="fas fa-calendar-alt"></i> DATA</span>' +
        '<span class="card-mob-valor">' + _famDataApenas + "</span></div>" +
        '<div class="card-mob-row"><span class="card-mob-label"><i class="fas fa-clock"></i> HORÁRIO</span>' +
        '<span class="card-mob-valor">' + _famHoraApenas + "</span></div>"
      : "") +
    '<div class="card-mob-actions">' +
    '<button class="card-mob-btn" onclick="gerarComprovante(\'' +
    id +
    "')\">" +
    '<i class="fas fa-receipt"></i> Comprovante</button>' +
    '<button class="card-mob-btn" onclick="abrirModalFamilia(\'' +
    id +
    "')\">" +
    '<i class="fas fa-pen"></i> Editar</button>' +
    '<button class="card-mob-btn danger" onclick="confirmarExclusaoFamilia(\'' +
    id +
    "')\">" +
    '<i class="fas fa-trash"></i> Excluir</button>' +
    "</div>" +
    "</div>"
  );
}

async function renderFamilias() {
  var tbody = document.getElementById("families-tbody");
  var familias = await DoaVidaSync.getFamilias();
  var busca = (getVal("families-search") || "").toLowerCase();
  if (!tbody) return;

  var filtradas = familias.filter(function (f) {
    return (
      !busca ||
      (f.name || "").toLowerCase().includes(busca) ||
      (f.endereco || "").toLowerCase().includes(busca)
    );
  });

  if (filtradas.length === 0) {
    var msgFamVazia = busca
      ? "Nenhuma encontrada."
      : "Nenhuma família cadastrada.";
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:40px;">' +
      msgFamVazia +
      "</td></tr>";
    var elMobFam = document.getElementById("families-cards-mobile");
    if (elMobFam)
      elMobFam.innerHTML =
        '<p style="text-align:center;color:var(--text2);padding:32px 16px;">' +
        msgFamVazia +
        "</p>";
    return;
  }

  tbody.innerHTML = filtradas
    .map(function (f) {
      var idEsc = escHtml(f.id || "");
      var fone = (f.phone || "").replace(/\D/g, "");
      return (
        /* Linha clicável: abre o modal de edição completa da família */
        '<tr style="cursor:pointer;" onclick="abrirModalFamilia(\'' + idEsc + '\')" title="Clique para editar">' +
        "<td><strong>" +
        escHtml(f.name || "—") +
        "</strong></td>" +
        "<td>" +
        (fone
          ? '<a href="https://wa.me/55' +
            fone +
            '" target="_blank" rel="noopener" style="color:var(--gold);" onclick="event.stopPropagation()">' +
            escHtml(f.phone) +
            "</a>"
          : "—") +
        "</td>" +
        '<td style="font-size:.8rem;">' +
        escHtml(f.endereco || "—") +
        "</td>" +
        '<td style="text-align:center;">' +
        (f.pessoas || "—") +
        "</td>" +
        "<td>" +
        (function() {
          var sk = f.status || "pendente";
          var si = STATUS_ENTREGA[sk] || STATUS_ENTREGA["pendente"];
          return '<span style="display:inline-block;font-size:.7rem;font-weight:700;padding:2px 10px;border-radius:100px;color:#fff;background:' + si.cor + ';">' + si.label + '</span>';
        })() +
        "</td>" +
        '<td><div class="table-actions" onclick="event.stopPropagation()">' +
        '<button class="btn-icon" onclick="gerarComprovante(\'' +
        idEsc +
        '\')" title="Comprovante">' +
        '<i class="fas fa-receipt"></i></button>' +
        '<button class="btn-icon" onclick="abrirModalFamilia(\'' +
        idEsc +
        '\')" title="Editar">' +
        '<i class="fas fa-pen"></i></button>' +
        '<button class="btn-icon danger" onclick="confirmarExclusaoFamilia(\'' +
        idEsc +
        '\')" title="Excluir">' +
        '<i class="fas fa-trash"></i></button>' +
        "</div></td>" +
        "</tr>"
      );
    })
    .join("");

  /* ── Cards mobile ── */
  var mobileList = document.getElementById("families-cards-mobile");
  if (mobileList) {
    if (filtradas.length === 0) {
      mobileList.innerHTML =
        '<p style="text-align:center;color:var(--text2);padding:32px 16px;">' +
        (busca ? "Nenhuma encontrada." : "Nenhuma família cadastrada.") +
        "</p>";
    } else {
      mobileList.innerHTML = filtradas
        .map(function (f) {
          return _montarCardFamilia(f);
        })
        .join("");
    }
  }

  /* ── Atualiza stats + mapa ── */
  try {
    var total = familias.length;
    var receberam = familias.filter(function(f) { return f.status === 'entregue'; }).length;
    var aguardando = total - receberam;
    var pessoas = familias.reduce(function(s, f) { return s + parseInt(f.pessoas || 1); }, 0);
    var elT = document.getElementById('fam-total'); if (elT) elT.textContent = total;
    var elR = document.getElementById('fam-receberam'); if (elR) elR.textContent = receberam;
    var elA = document.getElementById('fam-aguardando'); if (elA) elA.textContent = aguardando;
    var elP = document.getElementById('fam-pessoas'); if (elP) elP.textContent = pessoas;
    /* Rosca doughnut */
    _destroyChart('families');
    var canvas = document.getElementById('families-chart');
    if (canvas) {
      _charts['families'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: ['Receberam','Aguardando'],
          datasets: [{ data: [receberam, aguardando], backgroundColor: ['rgba(129,199,132,.8)','rgba(249,168,37,.8)'], borderWidth: 0, borderRadius: 4 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '70%',
          plugins: { legend: { position: 'bottom', labels: { color: '#888876', font: { size: 10 }, boxWidth: 10 } } }
        }
      });
    }
  } catch(e) {}
  /* ── Mapa Leaflet ── */
  try {
    var mapEl = document.getElementById('belem-map');
    if (!mapEl || !window.L) return;
    if (mapEl._leaflet_id) {
      /* Mapa já existe - limpa marcadores e re-adiciona */
      if (window._belemMapInstance) {
        window._belemMapInstance.eachLayer(function(layer) {
          if (layer instanceof L.Marker) window._belemMapInstance.removeLayer(layer);
        });
        _adicionarMarcadoresMapa(window._belemMapInstance, familias);
      }
      return;
    }
    var map = L.map('belem-map', {
      zoomControl: false,      /* controle personalizado abaixo */
      scrollWheelZoom: false,
      attributionControl: true
    }).setView([-1.4558, -48.4902], 12);
    window._belemMapInstance = map;

    /* Zoom control reposicionado (canto inferior direito) */
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">Carto</a>',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(map);

    _adicionarMarcadoresMapa(map, familias);

    /* invalidateSize após renderização inicial — corrige área branca */
    setTimeout(function() { map.invalidateSize(); }, 300);
  } catch(e) { console.error('Mapa erro:', e); }
}

function _adicionarMarcadoresMapa(map, familias) {
  /* Ícone circular grande — estilo igual ao screenshot */
  function makeIcon(color, pulso) {
    var pulse = pulso
      ? '<div style="position:absolute;top:-4px;left:-4px;width:26px;height:26px;border-radius:50%;background:' + color + '44;animation:mapPulse 2s infinite"></div>'
      : '';
    return L.divIcon({
      className: '',
      html: '<div style="position:relative;width:18px;height:18px">' +
            pulse +
            '<div style="width:18px;height:18px;border-radius:50%;background:' + color +
            ';border:2.5px solid rgba(255,255,255,.65);box-shadow:0 2px 10px ' + color + 'bb,0 0 0 3px ' + color + '33;position:relative;z-index:1"></div>' +
            '</div>',
      iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -12]
    });
  }

  /* Pontos reais dos principais bairros de Belém */
  var bairros = [
    [-1.4548,-48.4827], /* Marco */
    [-1.4612,-48.4901], /* Batista Campos */
    [-1.4489,-48.4950], /* Umarizal */
    [-1.4700,-48.4800], /* Guamá */
    [-1.4400,-48.4870], /* Sacramenta */
    [-1.4560,-48.5000], /* Pedreira */
    [-1.4650,-48.4750], /* Jurunas */
    [-1.4480,-48.4800], /* Nazaré */
    [-1.4720,-48.4850], /* Terra Firme */
    [-1.4380,-48.4920], /* Cremação */
    [-1.4590,-48.4690], /* Cidade Velha */
    [-1.4820,-48.4870], /* Tapanã */
    [-1.4350,-48.4830], /* São Brás */
    [-1.4680,-48.5050], /* Coqueiro */
    [-1.4530,-48.5100]  /* Telégrafo */
  ];

  if (familias.length === 0) {
    /* Demo: 5 pontos cinzas quando sem dados */
    bairros.slice(0, 5).forEach(function(pos) {
      L.marker(pos, { icon: makeIcon('#888876', false) })
        .bindPopup('<div style="font-size:12px;color:#333"><strong>Sem famílias</strong><br><small>Cadastre famílias para ver no mapa</small></div>')
        .addTo(map);
    });
    return;
  }

  familias.forEach(function(f, i) {
    /* Usa coordenadas reais se disponíveis, senão usa posição do bairro */
    var lat, lng;
    if (f.lat && f.lng) {
      lat = parseFloat(f.lat);
      lng = parseFloat(f.lng);
    } else {
      var pos = bairros[i % bairros.length];
      /* Pequeno deslocamento para não sobrepor marcadores no mesmo bairro */
      lat = pos[0] + (Math.sin(i * 2.1) * 0.006);
      lng = pos[1] + (Math.cos(i * 1.7) * 0.006);
    }
    var recebeu = f.status === 'entregue';
    var cor = recebeu ? '#81c784' : '#f9a825';
    var st  = recebeu ? '✅ Recebeu cesta' : '⏳ Aguardando';
    var nome = f.name || f.nome || 'Família';
    var pessoas = parseInt(f.pessoas || 1);

    L.marker([lat, lng], { icon: makeIcon(cor, !recebeu) })
      .bindPopup(
        '<div style="font-family:\'DM Sans\',sans-serif;font-size:12px;color:#1a1a14;min-width:170px;line-height:1.5">' +
        '<div style="font-weight:700;font-size:13px;margin-bottom:4px">' + nome + '</div>' +
        (f.endereco ? '<div style="color:#555;font-size:11px;margin-bottom:4px">📍 ' + f.endereco + '</div>' : '') +
        '<div style="color:' + cor + ';font-weight:600">' + st + '</div>' +
        '<div style="color:#777;font-size:11px;margin-top:2px">👥 ' + pessoas + ' pessoa' + (pessoas > 1 ? 's' : '') + '</div>' +
        '</div>',
        { maxWidth: 220 }
      )
      .addTo(map);
  });
}
window._adicionarMarcadoresMapa = _adicionarMarcadoresMapa;

/* ══════════════════════════════════════════════════════════════════════
   GEOCODIFICAÇÃO DE FAMÍLIAS
   Usa ViaCEP (busca de endereço por CEP) + Nominatim (lat/lng).
   Ambas são APIs gratuitas, sem necessidade de chave.
   ══════════════════════════════════════════════════════════════════════ */

/* Máscara de CEP: 00000-000 */
function familyCepMask(input) {
  var v = input.value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
  input.value = v;
}
window.familyCepMask = familyCepMask;

/* Feedback visual no modal */
function _familyGeoFeedback(tipo, msg) {
  var el = document.getElementById('family-geo-feedback');
  if (!el) return;
  if (!msg) { el.style.display = 'none'; return; }
  var estilos = {
    loading: 'background:rgba(100,181,246,.12);border:1px solid rgba(100,181,246,.3);color:#64b5f6;',
    ok:      'background:rgba(129,199,132,.12);border:1px solid rgba(129,199,132,.3);color:#81c784;',
    warn:    'background:rgba(249,168,37,.12);border:1px solid rgba(249,168,37,.3);color:#f9a825;',
    erro:    'background:rgba(229,115,115,.12);border:1px solid rgba(229,115,115,.3);color:#e57373;'
  };
  el.style.cssText = 'display:block;margin-top:-8px;margin-bottom:10px;padding:8px 12px;border-radius:8px;font-size:.78rem;line-height:1.4;' + (estilos[tipo] || estilos.warn);
  el.innerHTML = msg;
}

/* Busca coordenadas via Nominatim (OpenStreetMap) — sem API key */
async function _nominatimGeocode(query) {
  try {
    var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
              encodeURIComponent(query + ', Belém, Pará, Brasil');
    var resp = await fetch(url, {
      headers: { 'Accept-Language': 'pt-BR,pt', 'User-Agent': 'DoaVida/1.0 (Acao Social Semear Belem PA)' }
    });
    if (!resp.ok) return null;
    var data = await resp.json();
    if (!data || !data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
  } catch (e) { return null; }
}

/* Busca via ViaCEP e depois geocodifica */
async function familyBuscarCep() {
  var cepEl = document.getElementById('family-cep');
  if (!cepEl) return;
  var cep = cepEl.value.replace(/\D/g, '');
  if (cep.length !== 8) return;

  _familyGeoFeedback('loading', '<i class="fas fa-spinner fa-spin"></i> Buscando CEP ' + cepEl.value + '…');

  try {
    var resp = await fetch('https://viacep.com.br/ws/' + cep + '/json/');
    var data = await resp.json();

    if (data.erro) {
      _familyGeoFeedback('erro', '❌ CEP não encontrado. Verifique e tente novamente.');
      return;
    }

    /* Monta endereço completo e preenche o campo */
    var endereco = [data.logradouro, data.bairro, data.localidade + ' – ' + data.uf]
      .filter(Boolean).join(', ');
    setVal('family-endereco', endereco);

    /* Geocodifica o endereço encontrado */
    _familyGeoFeedback('loading', '<i class="fas fa-spinner fa-spin"></i> Localizando no mapa…');
    var geo = await _nominatimGeocode(data.logradouro + ', ' + data.bairro);

    if (geo) {
      setVal('family-lat', geo.lat);
      setVal('family-lng', geo.lng);
      _familyGeoFeedback('ok',
        '📍 <strong>' + escHtml(data.bairro || data.localidade) + '</strong> — ' +
        'Lat ' + geo.lat.toFixed(5) + ', Lng ' + geo.lng.toFixed(5) +
        ' <span style="opacity:.6;font-size:.7rem;">via OpenStreetMap</span>');
    } else {
      _familyGeoFeedback('warn',
        '⚠️ Endereço encontrado pelo CEP, mas sem coordenadas precisas. ' +
        'O marcador usará o bairro aproximado.');
    }
  } catch (e) {
    _familyGeoFeedback('erro', '❌ Erro ao consultar CEP. Verifique sua conexão.');
  }
}
window.familyBuscarCep = familyBuscarCep;

/* Geocodifica diretamente pelo campo de endereço (botão 📍 ou onblur) */
async function familyGeocodificarEndereco() {
  var endereco = getVal('family-endereco');
  if (!endereco || endereco.length < 5) return;
  /* Não regeocodifica se já temos coordenadas para este endereço */
  var jaTemLat = getVal('family-lat');
  if (jaTemLat) return;

  _familyGeoFeedback('loading', '<i class="fas fa-spinner fa-spin"></i> Localizando "' + escHtml(endereco.slice(0, 40)) + '"…');
  var geo = await _nominatimGeocode(endereco);
  if (geo) {
    setVal('family-lat', geo.lat);
    setVal('family-lng', geo.lng);
    /* Extrai bairro/cidade do display_name */
    var partes = geo.display.split(',');
    var local = (partes[1] || partes[0] || '').trim();
    _familyGeoFeedback('ok',
      '📍 <strong>' + escHtml(local) + '</strong> — ' +
      'Lat ' + geo.lat.toFixed(5) + ', Lng ' + geo.lng.toFixed(5) +
      ' <span style="opacity:.6;font-size:.7rem;">via OpenStreetMap</span>');
  } else {
    _familyGeoFeedback('warn',
      '⚠️ Endereço não encontrado no mapa. ' +
      'Você pode salvar assim — o marcador usará o bairro aproximado.');
  }
}
window.familyGeocodificarEndereco = familyGeocodificarEndereco;

/* ── Modal de família ──────────────────────────────────────────────── */
async function abrirModalFamilia(id) {
  ['family-name','family-phone','family-pessoas','family-endereco',
   'family-obs','family-cep','family-lat','family-lng'].forEach(function(c) {
    var el = document.getElementById(c);
    if (el) el.value = '';
  });
  _familyGeoFeedback('', '');

  var elStatus = document.getElementById('family-status');
  if (elStatus) elStatus.value = 'pendente';
  var editId = document.getElementById('family-edit-id');
  var titulo = document.getElementById('modal-family-title');

  if (id) {
    var _listaFamilias = await DoaVidaSync.getFamilias();
    var fam = _listaFamilias.find(function (f) { return f.id === id; });
    if (fam) {
      if (titulo) titulo.textContent = 'Editar Família';
      if (editId) editId.value = id;
      setVal('family-name',     fam.name     || '');
      setVal('family-phone',    fam.phone    || '');
      setVal('family-pessoas',  fam.pessoas  || '');
      setVal('family-endereco', fam.endereco || '');
      setVal('family-cep',      fam.cep      || '');
      setVal('family-obs',      fam.obs      || '');
      setVal('family-lat',      fam.lat      || '');
      setVal('family-lng',      fam.lng      || '');
      if (elStatus) elStatus.value = fam.status || 'pendente';
      /* Mostra coordenadas existentes */
      if (fam.lat && fam.lng) {
        _familyGeoFeedback('ok',
          '📍 Coordenadas salvas — Lat ' + parseFloat(fam.lat).toFixed(5) +
          ', Lng ' + parseFloat(fam.lng).toFixed(5));
      }
    }
  } else {
    if (titulo) titulo.textContent = 'Cadastrar Família';
    if (editId) editId.value = '';
  }
  abrirModal('modal-family');
}
window.abrirModalFamilia = abrirModalFamilia;

async function salvarFamilia() {
  var nome     = getVal('family-name');
  var fone     = getVal('family-phone');
  var endereco = getVal('family-endereco');
  if (!nome || !fone || !endereco) {
    showToast('⚠️ Nome, WhatsApp e endereço são obrigatórios.', 'error');
    return;
  }

  var latVal = parseFloat(getVal('family-lat'));
  var lngVal = parseFloat(getVal('family-lng'));

  var item = {
    name:     nome,
    phone:    fone,
    endereco: endereco,
    cep:      getVal('family-cep') || '',
    pessoas:  parseInt(getVal('family-pessoas')) || 1,
    obs:      getVal('family-obs'),
    status:   getVal('family-status') || 'pendente',
    lat:      isNaN(latVal) ? null : latVal,
    lng:      isNaN(lngVal) ? null : lngVal,
  };

  /* Se não tem coordenadas, tenta geocodificar antes de salvar */
  if (!item.lat && item.endereco) {
    showToast('🗺️ Localizando endereço…', 'info', 2000);
    var geo = await _nominatimGeocode(item.endereco);
    if (geo) { item.lat = geo.lat; item.lng = geo.lng; }
  }

  try {
    var editId = getVal('family-edit-id');
    if (editId) {
      await DoaVidaSync.updateFamilia(editId, item);
      showToast('✅ Família atualizada!', 'success');
    } else {
      await DoaVidaSync.addFamilia(item);
      showToast('✅ Família cadastrada!', 'success');
    }
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
    return;
  }
  fecharModal('modal-family');
  renderFamilias();
  atualizarBadges();
}
window.salvarFamilia = salvarFamilia;

async function confirmarExclusaoFamilia(id) {
  if (!confirm("Excluir esta família?")) return;
  await DoaVidaSync.deleteFamilia(id);
  renderFamilias();
  atualizarBadges();
  showToast("🗑️ Família excluída.", "info");
}
window.confirmarExclusaoFamilia = confirmarExclusaoFamilia;

/* ── Comprovante de entrega ──────────────────────────────────────────
   Abre um modal com o comprovante formatado da família.
*/

/* Mapa de labels e cores para cada status da entrega */
var STATUS_ENTREGA = {
  pendente:       { label: "⏳ Pendente",       cor: "#e8a838" },
  em_separacao:   { label: "📦 Em separação",   cor: "#5b8dee" },
  entregue:       { label: "✅ Entregue",        cor: "#4caf50" },
  nao_encontrada: { label: "❌ Não encontrada",  cor: "#e55a5a" },
};

async function gerarComprovante(familiaId) {
  var familia = null;
  var familias = await DoaVidaSync.getFamilias();
  if (familiaId) {
    familia = familias.find(function (f) { return f.id === familiaId; }) || null;
  }

  var agora = new Date();
  var dia  = String(agora.getDate()).padStart(2, "0");
  var mes  = String(agora.getMonth() + 1).padStart(2, "0");
  var ano  = String(agora.getFullYear()).slice(-2);
  var hora = String(agora.getHours()).padStart(2, "0");
  var min  = String(agora.getMinutes()).padStart(2, "0");
  var dataStr = dia + "/" + mes + "/" + ano;
  var horaStr = hora + ":" + min;

  /* Status da entrega */
  var statusKey   = (familia && familia.status) ? familia.status : "pendente";
  var statusInfo  = STATUS_ENTREGA[statusKey] || STATUS_ENTREGA["pendente"];

  var body = document.getElementById("comprovante-body");
  if (!body) return;

  body.innerHTML =
    '<div class="comp-recibo">' +

    /* ── Cabeçalho ── */
    '<div class="comp-org">' +
      '<i class="fas fa-heart comp-org-icon"></i>' +
      '<div>' +
        '<div class="comp-org-nome">Ação Social Semear</div>' +
        '<div class="comp-org-sub">Comprovante de Entrega de Cesta</div>' +
      '</div>' +
    '</div>' +
    '<div class="comp-divisor"></div>' +

    /* ── Dados da família ── */
    '<div class="comp-bloco">' +
      '<div class="comp-bloco-title">👤 Dados da Família</div>' +
      '<div class="comp-linha">' +
        '<span class="comp-label">Nome</span>' +
        '<span class="comp-val">' + escHtml((familia && familia.name) || "—") + '</span>' +
      '</div>' +
      '<div class="comp-linha">' +
        '<span class="comp-label">Telefone</span>' +
        '<span class="comp-val">' + escHtml((familia && familia.phone) || "—") + '</span>' +
      '</div>' +
      ((familia && familia.pessoas)
        ? '<div class="comp-linha">' +
            '<span class="comp-label">Nº de Pessoas</span>' +
            '<span class="comp-val">' + familia.pessoas + ' pessoa' + (familia.pessoas != 1 ? 's' : '') + '</span>' +
          '</div>'
        : '') +
      ((familia && familia.obs && familia.obs.trim())
        ? '<div class="comp-linha" style="align-items:flex-start;">' +
            '<span class="comp-label">Observações</span>' +
            '<span class="comp-val" style="font-size:.78rem;text-align:right;">' + escHtml(familia.obs) + '</span>' +
          '</div>'
        : '') +
    '</div>' +
    '<div class="comp-divisor"></div>' +

    /* ── Entrega ── */
    '<div class="comp-bloco">' +
      '<div class="comp-bloco-title">🚚 Entrega</div>' +
      (familia && familia.endereco
        ? '<div class="comp-linha">' +
            '<span class="comp-label">Endereço</span>' +
            '<span class="comp-val">' + escHtml(familia.endereco) + '</span>' +
          '</div>'
        : '') +
      '<div class="comp-linha">' +
        '<span class="comp-label">Status</span>' +
        '<span class="comp-status-badge" style="background:' + statusInfo.cor + ';">' +
          statusInfo.label +
        '</span>' +
      '</div>' +
    '</div>' +

    '</div>'; /* fim .comp-recibo */

  /* ── Monta link WhatsApp com o comprovante em texto ── */
  var btnWa = document.getElementById("btn-comp-wa");
  if (btnWa) {
    var foneWa = (familia && familia.phone ? familia.phone : "").replace(/\D/g, "");
    var linhas = [
      "🌾 *Ação Social Semear*",
      "*Comprovante de Entrega de Cesta*",
      "",
      "👤 *Dados da Família*",
      "Nome: " + ((familia && familia.name) || "—"),
      "Telefone: " + ((familia && familia.phone) || "—"),
    ];
    if (familia && familia.pessoas) {
      linhas.push("Nº de Pessoas: " + familia.pessoas + " pessoa" + (familia.pessoas != 1 ? "s" : ""));
    }
    if (familia && familia.obs && familia.obs.trim()) {
      linhas.push("Observações: " + familia.obs.trim());
    }
    linhas.push("");
    linhas.push("🚚 *Entrega*");
    if (familia && familia.endereco) {
      linhas.push("Endereço: " + familia.endereco);
    }
    linhas.push("Status: " + statusInfo.label);

    var texto = linhas.join("\n");
    btnWa.href = "https://wa.me/?text=" + encodeURIComponent(texto);
  }

  abrirModal("modal-comprovante");
}
window.gerarComprovante = gerarComprovante;

function imprimirComprovante() {
  // Pega os dados do comprovante exibido
  var nome = (document.getElementById('comp-nome') || {}).textContent || '';
  var alimento = (document.getElementById('comp-alimento') || {}).textContent || '';
  var kg = (document.getElementById('comp-kg') || {}).textContent || '';
  var status = (document.getElementById('comp-status') || {}).textContent || '';
  var data = (document.getElementById('comp-data') || {}).textContent || '';
  var msg = encodeURIComponent(
    '✅ *Comprovante de Doação — Ação Social Semear*\n\n' +
    '👤 Doador: ' + nome + '\n' +
    '🌾 Alimento: ' + alimento + ' (' + kg + 'kg)\n' +
    '📦 Status: ' + status + '\n' +
    '📅 Data: ' + data + '\n\n' +
    '_Ação Social Semear · Belém, PA_'
  );
  window.open('https://wa.me/?text=' + msg, '_blank');
}
window.imprimirComprovante = imprimirComprovante;

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 10 — GALERIA
   ══════════════════════════════════════════════════════════════════════ */

var GALERIA_KEY = "doavida_gallery";

function galeriaLer() {
  try {
    return JSON.parse(localStorage.getItem(GALERIA_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function galeriaSalvar(arr) {
  localStorage.setItem(GALERIA_KEY, JSON.stringify(arr));
}

/*
  Renderiza a grade de mídias da galeria no painel admin.
  Lê diretamente do Supabase (tabela galeria) — não usa localStorage.
  Suporta imagens E vídeos, com badges de tipo/ativo/categoria.
*/
async function renderGaleriaAdmin() {
  var grid = document.getElementById("gallery-admin-grid");
  if (!grid) return;

  /* Indica carregamento enquanto busca do banco */
  grid.innerHTML =
    '<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text2);">' +
    '<i class="fas fa-spinner fa-spin"></i> Carregando galeria…</div>';

  /* Busca só metadados (sem url) — resposta rápida, sem base64 */
  var fotos = await DoaVidaSync.getGaleriaMetadata();
  _galeriaCache = fotos || [];

  if (!fotos || fotos.length === 0) {
    grid.innerHTML =
      '<div class="empty-state" style="grid-column:1/-1;">' +
      '<i class="fas fa-images"></i>' +
      '<p>Nenhuma mídia ainda.</p>' +
      '<button class="btn btn-primary btn-sm" onclick="abrirModal(\'modal-photo\')">Adicionar primeiro item</button>' +
      '</div>';
    return;
  }

  /* Renderiza um card para cada mídia usando o UUID como identificador */
  /* IMPORTANTE: URLs base64 NÃO vão no HTML — carregadas depois via IntersectionObserver */
  grid.innerHTML = fotos.map(function (foto) {
    var id      = escHtml(foto.id || '');
    var leg     = escHtml(foto.titulo || foto.legenda || '');
    var tipo    = (foto.tipo === 'video') ? 'video' : 'imagem';
    var ativo   = foto.ativo !== false;
    var pub     = foto.visibilidade !== 'privada';
    var cat     = escHtml(foto.categoria || 'geral');
    var ehHero  = cat === 'hero';

    /* Placeholder cinza enquanto a mídia não carrega */
    var placeholderStyle = 'width:100%;height:160px;object-fit:cover;display:block;' +
      'background:linear-gradient(135deg,#e8e8e8 0%,#d0d0d0 100%);';

    /* data-lazy-id: o src/src real é injetado pelo IntersectionObserver abaixo */
    var midia;
    if (tipo === 'video') {
      midia =
        '<video data-lazy-id="' + id + '" muted autoplay loop playsinline preload="none" ' +
        'style="' + placeholderStyle + '" ' +
        'onerror="this.style.display=\'none\'"></video>' +
        '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'background:rgba(0,0,0,.5);border-radius:50%;width:40px;height:40px;' +
        'display:flex;align-items:center;justify-content:center;pointer-events:none;">' +
        '<i class="fas fa-play" style="color:#fff;font-size:14px;margin-left:3px;"></i></div>';
    } else {
      midia =
        '<img data-lazy-id="' + id + '" alt="' + leg + '" ' +
        'style="' + placeholderStyle + '" ' +
        'onerror="this.style.background=\'#ddd\';this.style.display=\'block\'" />';
    }

    /* Badge de tipo */
    var badgeTipo =
      '<span style="position:absolute;top:6px;left:6px;padding:2px 6px;font-size:.65rem;' +
      'font-weight:700;border-radius:4px;letter-spacing:.03em;' +
      (tipo === 'video'
        ? 'background:#1A3312;color:#E8C96A;'
        : 'background:rgba(255,255,255,.85);color:#1A3312;') +
      '">' + (tipo === 'video' ? '▶ VÍDEO' : '🖼 IMG') + '</span>';

    /* Badge ativo/inativo */
    var badgeAtivo =
      '<span style="position:absolute;top:6px;right:6px;padding:2px 6px;font-size:.65rem;' +
      'font-weight:700;border-radius:4px;' +
      (ativo
        ? 'background:#5A8A4A;color:#fff;'
        : 'background:#771717;color:#fff;') +
      '">' + (ativo ? 'ATIVO' : 'INATIVO') + '</span>';

    /* Badge categoria capa (hero) */
    var badgeHero = ehHero
      ? '<span style="position:absolute;bottom:6px;left:6px;padding:2px 6px;font-size:.65rem;' +
        'font-weight:700;border-radius:4px;background:#E8C96A;color:#1A3312;">★ CAPA</span>'
      : '';

    /* Legenda */
    var legEl = leg
      ? '<div style="padding:4px 8px;font-size:.72rem;color:var(--text2);text-align:left;' +
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + leg + '">' + leg + '</div>'
      : '<div style="padding:4px 8px;font-size:.72rem;color:var(--text3);font-style:italic;">' + cat + '</div>';

    /* Botões de ação */
    var acoes =
      /* Toggle ativo */
      '<button class="btn-icon" title="' + (ativo ? 'Desativar' : 'Ativar') + '" ' +
      'onclick="galeriaToggleAtivo(\'' + id + '\',' + ativo + ')">' +
      '<i class="fas ' + (ativo ? 'fa-toggle-on' : 'fa-toggle-off') + '"></i></button>' +
      /* Selecionar para capa */
      '<button class="btn-icon" title="Definir como capa da página" ' +
      'onclick="galeriaSelecionarParaCapa(\'' + id + '\')">' +
      '<i class="fas fa-star' + (ehHero ? '' : '-half-alt') + '"></i></button>' +
      /* Editar */
      '<button class="btn-icon" title="Editar metadados" ' +
      'onclick="galeriaEditar(\'' + id + '\')">' +
      '<i class="fas fa-edit"></i></button>' +
      /* Copiar URL */
      '<button class="btn-icon" title="Copiar URL" ' +
      'onclick="galeriaCopiarUrl(_galeriaGetUrl(\'' + id + '\'))">' +
      '<i class="fas fa-copy"></i></button>' +
      /* Excluir */
      '<button class="btn-icon danger" title="Excluir" ' +
      'onclick="galeriaExcluir(\'' + id + '\')">' +
      '<i class="fas fa-trash"></i></button>';

    /* Botão de excluir sempre visível — sem precisar de hover */
    var btnExcluirFixo =
      '<button onclick="galeriaExcluir(\'' + id + '\')" ' +
      'style="position:absolute;bottom:6px;right:6px;z-index:10;' +
      'width:30px;height:30px;border-radius:50%;border:none;' +
      'background:rgba(180,30,30,0.88);color:#fff;cursor:pointer;' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.35);' +
      'backdrop-filter:blur(4px);" title="Excluir mídia">' +
      '<i class="fas fa-trash"></i></button>';

    return (
      '<div class="gallery-admin-item" style="position:relative;' +
      (!ativo ? 'opacity:.55;' : '') + '">' +
      '<div style="position:relative;">' + midia + badgeTipo + badgeAtivo + badgeHero + '</div>' +
      legEl +
      '<div class="gallery-admin-overlay">' + acoes + '</div>' +
      btnExcluirFixo +
      '</div>'
    );
  }).join('');

  /* Injeta src real quando o card entra no viewport — carrega URL individualmente do banco */
  function _carregarMidia(el, fid) {
    if (!el.getAttribute('data-lazy-id')) return; /* já carregado */
    el.removeAttribute('data-lazy-id');
    /* Verifica se URL já está no cache de URLs */
    if (_galeriaUrlCache[fid]) {
      el.src = _galeriaUrlCache[fid];
      return;
    }
    /* Busca do banco individualmente (pode ser base64 grande — mas só 1 item) */
    DoaVidaSync.getGaleriaItemUrl(fid).then(function (url) {
      if (url) {
        _galeriaUrlCache[fid] = url;
        el.src = url;
      }
    });
  }

  var observer = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el  = entry.target;
          var fid = el.getAttribute('data-lazy-id');
          if (fid) { _carregarMidia(el, fid); obs.unobserve(el); }
        });
      }, { rootMargin: '200px' })
    : null;

  grid.querySelectorAll('[data-lazy-id]').forEach(function (el) {
    if (observer) {
      observer.observe(el);
    } else {
      _carregarMidia(el, el.getAttribute('data-lazy-id'));
    }
  });
}
window.renderGaleriaAdmin = renderGaleriaAdmin;

/*
  Alterna ativo/inativo de uma mídia da galeria.
  @param {string}  id        — UUID na tabela galeria
  @param {boolean} atualAtivo — estado atual
*/
async function galeriaToggleAtivo(id, atualAtivo) {
  var novoAtivo = !atualAtivo;
  try {
    await DoaVidaSync.updateFotoGaleria(id, { ativo: novoAtivo });
    _galeriaCache = []; _galeriaUrlCache = {};
    renderGaleriaAdmin();
    showToast(novoAtivo ? '✅ Item ativado.' : '🔒 Item desativado.', 'info');
  } catch (e) {
    showToast('❌ Erro ao alterar status.', 'error');
  }
}
window.galeriaToggleAtivo = galeriaToggleAtivo;

/*
  Define uma mídia como item da capa (categoria=hero, ativo=true).
  Todos os demais itens da categoria hero são mantidos — o novo é adicionado.
  @param {string} id  — UUID da mídia
  @param {string} url — URL da mídia (para atualizar o HeroCarousel imediatamente)
*/
async function galeriaSelecionarParaCapa(id) {
  if (!confirm('Definir esta mídia como parte da capa da página inicial?')) return;
  try {
    await DoaVidaSync.updateFotoGaleria(id, { categoria: 'hero', ativo: true });
    if (window.HeroCarousel && typeof HeroCarousel.reload === 'function') {
      HeroCarousel.reload();
    }
    renderGaleriaAdmin();
    showToast('★ Item definido como capa!', 'success');
  } catch (e) {
    showToast('❌ Erro ao definir capa.', 'error');
  }
}
window.galeriaSelecionarParaCapa = galeriaSelecionarParaCapa;

/*
  Copia a URL de uma mídia para a área de transferência.
  @param {string} url — URL a copiar
*/
function galeriaCopiarUrl(url) {
  if (!url) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function () {
      showToast('📋 URL copiada!', 'info');
    }).catch(function () {
      _galeriaCopiarFallback(url);
    });
  } else {
    _galeriaCopiarFallback(url);
  }
}
window.galeriaCopiarUrl = galeriaCopiarUrl;

function _galeriaCopiarFallback(url) {
  var ta = document.createElement('textarea');
  ta.value = url;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); showToast('📋 URL copiada!', 'info'); }
  catch (e) { showToast('⚠️ Não foi possível copiar.', 'warning'); }
  document.body.removeChild(ta);
}

/*
  Abre o modal de edição de uma mídia, pré-preenchendo todos os campos.
  Busca os dados da galeria em cache (_galeriaCache) ou refaz a busca se necessário.
  @param {string} id — UUID da mídia
*/
var _galeriaCache    = []; /* metadados sem url */
var _galeriaUrlCache = {}; /* id → url, preenchido ao carregar cada imagem */

function _galeriaGetUrl(id) {
  /* Verifica cache de URLs primeiro; fallback para o campo url no cache de metadados */
  if (_galeriaUrlCache[id]) return _galeriaUrlCache[id];
  var item = _galeriaCache.find(function (f) { return f.id === id; });
  return item ? (item.url || '') : '';
}
window._galeriaGetUrl = _galeriaGetUrl;

async function galeriaEditar(id) {
  /* Se o cache estiver vazio, busca do Supabase */
  if (!_galeriaCache.length) {
    _galeriaCache = await DoaVidaSync.getGaleria() || [];
  }
  var foto = null;
  for (var i = 0; i < _galeriaCache.length; i++) {
    if (_galeriaCache[i].id === id) { foto = _galeriaCache[i]; break; }
  }
  if (!foto) { showToast('⚠️ Item não encontrado.', 'error'); return; }

  /* Preenche os campos do modal */
  var set = function (elId, val) {
    var el = document.getElementById(elId);
    if (el) {
      if (el.type === 'checkbox') el.checked = !!val;
      else el.value = (val !== null && val !== undefined) ? val : '';
    }
  };
  set('photo-title',      foto.titulo || foto.legenda || '');
  set('photo-alt',        foto.alt    || '');
  set('photo-url-input',  foto.url    || '');
  set('photo-categoria',  foto.categoria || 'geral');
  set('photo-tipo',       foto.tipo   || 'imagem');
  set('photo-poster',     foto.poster_url || '');
  set('photo-order',      foto.order_index != null ? foto.order_index : 0);
  set('photo-ativo',      foto.ativo !== false);
  set('photo-public',     foto.visibilidade !== 'privada');

  /* Guarda o ID no modal para uso no salvar */
  var modal = document.getElementById('modal-photo');
  if (modal) modal.dataset.editId = id;

  /* Muda o modo para URL (já que temos a URL) e abre o modal */
  AdminState.photoMode = 'url';
  var tabUrl = document.querySelector('[data-photo-tab="url"]');
  var tabUp  = document.querySelector('[data-photo-tab="upload"]');
  var paneUrl = document.getElementById('photo-url-pane');
  var paneUp  = document.getElementById('photo-upload-pane');
  if (tabUrl)  { tabUrl.classList.add('active');    if (tabUp)  tabUp.classList.remove('active'); }
  if (paneUrl) { paneUrl.style.display = '';         if (paneUp) paneUp.style.display = 'none'; }

  abrirModal('modal-photo');
}
window.galeriaEditar = galeriaEditar;

/*
  Alterna a visibilidade de uma foto entre pública e privada.
  Salva diretamente no Supabase via UUID — sem índice de array.
  @param {string}  id        — UUID da foto na tabela galeria
  @param {boolean} atualPub  — visibilidade atual (true = pública)
*/
async function galeriaTogglePublico(id, atualPub) {
  var novaVis = atualPub ? 'privada' : 'publica';
  try {
    await DoaVidaSync.updateFotoGaleria(id, { visibilidade: novaVis });
    _galeriaCache = []; _galeriaUrlCache = {};
    renderGaleriaAdmin();
    showToast(novaVis === 'publica' ? '👁️ Item público.' : '🔒 Item privado.', 'info');
  } catch (e) {
    showToast('❌ Erro ao alterar visibilidade.', 'error');
  }
}
window.galeriaTogglePublico = galeriaTogglePublico;

/*
  Exclui uma foto do Supabase pelo UUID.
  @param {string} id — UUID da foto
*/
async function galeriaExcluir(id) {
  if (!confirm('Excluir esta mídia permanentemente?')) return;
  try {
    await DoaVidaSync.deleteFotoGaleria(id);
    _galeriaCache = []; _galeriaUrlCache = {};
    renderGaleriaAdmin();
    showToast('🗑️ Item excluído.', 'info');
  } catch (e) {
    showToast('❌ Erro ao excluir item.', 'error');
  }
}
window.galeriaExcluir = galeriaExcluir;

/*
  Salva uma ou mais fotos na galeria.
  Dois modos:
    1. URL  — salva o link diretamente na tabela galeria do Supabase
    2. Upload — faz upload do arquivo para o Supabase Storage (bucket "galeria"),
                obtém a URL pública e salva na tabela galeria
*/
/* Coleta todos os metadados do modal de galeria */
function _coletarMetadados() {
  return {
    titulo:      ((document.getElementById("photo-title") || {}).value || '').trim(),
    alt:         ((document.getElementById("photo-alt") || {}).value || '').trim(),
    categoria:   ((document.getElementById("photo-categoria") || {}).value || 'geral').trim(),
    tipo:        ((document.getElementById("photo-tipo") || {}).value || 'imagem').trim(),
    poster_url:  ((document.getElementById("photo-poster") || {}).value || '').trim(),
    order_index: parseInt((document.getElementById("photo-order") || {}).value || '0', 10) || 0,
    ativo:       document.getElementById("photo-ativo") ? document.getElementById("photo-ativo").checked : true,
    publica:     document.getElementById("photo-public") ? document.getElementById("photo-public").checked : true
  };
}

async function salvarFoto() {
  var meta = _coletarMetadados();

  /* Bloqueia duplo clique */
  var btnSalvar = document.getElementById("btn-salvar-foto");
  if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = 'Salvando…'; }

  /* Verifica se é modo edição (modal tem data-edit-id) */
  var modal  = document.getElementById('modal-photo');
  var editId = modal ? (modal.dataset.editId || '') : '';

  try {
    if (AdminState.photoMode === "url") {
      /* ── Modo URL: salva links diretamente na tabela ── */
      var urlInput = document.getElementById("photo-url-input");
      var raw = urlInput ? urlInput.value : "";
      var urls = raw.split("\n").map(function(u){ return u.trim(); }).filter(Boolean);

      if (urls.length === 0) {
        showToast("⚠️ Informe ao menos uma URL.", "error");
        return;
      }

      if (editId) {
        /* ── Modo edição: atualiza o item existente ── */
        await DoaVidaSync.updateFotoGaleria(editId, {
          url:         urls[0],
          legenda:     meta.titulo,
          titulo:      meta.titulo,
          alt:         meta.alt,
          categoria:   meta.categoria,
          tipo:        meta.tipo,
          poster_url:  meta.poster_url,
          order_index: meta.order_index,
          ativo:       meta.ativo,
          visibilidade: meta.publica ? 'publica' : 'privada'
        });
        _galeriaConcluir(1, true);
      } else {
        /* ── Modo criação: insere novos itens ── */
        await Promise.all(urls.map(function(u) {
          return DoaVidaSync.addFotoGaleria({
            url:         u,
            legenda:     meta.titulo,
            titulo:      meta.titulo,
            alt:         meta.alt,
            categoria:   meta.categoria,
            tipo:        meta.tipo,
            poster_url:  meta.poster_url,
            order_index: meta.order_index,
            ativo:       meta.ativo,
            publica:     meta.publica
          });
        }));
        _galeriaConcluir(urls.length);
      }

    } else {
      /* ── Modo Upload: arquivo → Cloudinary → URL → tabela ── */
      if (AdminState.pendingPhotos.length === 0) {
        showToast("⚠️ Selecione ao menos uma mídia.", "error");
        return;
      }

      var feitos = 0;
      var erros  = 0;

      /* Processa cada arquivo sequencialmente para não sobrecarregar */
      for (var i = 0; i < AdminState.pendingPhotos.length; i++) {
        var arquivo = AdminState.pendingPhotos[i];
        try {
          var ehVideo = arquivo.type.startsWith('video/');

          showToast('⬆️ Enviando ' + arquivo.name + '…', 'info');

          /* Upload para o Cloudinary (gratuito, sem pausar) */
          var resultado = await DoaVidaCloudinary.upload(arquivo, ehVideo ? 'video' : 'image', function(pct) {
            if (btnSalvar) btnSalvar.textContent = 'Enviando ' + pct + '%…';
          });

          var urlPublica = resultado.url;
          var publicId   = resultado.public_id;

          /* Salva a URL na galeria via DoaVidaSync */
          await DoaVidaSync.addFotoGaleria({
            url:         urlPublica,
            storage_path: publicId,
            legenda:     meta.titulo || arquivo.name,
            titulo:      meta.titulo || arquivo.name,
            alt:         meta.alt,
            categoria:   meta.categoria,
            tipo:        ehVideo ? 'video' : 'imagem',
            poster_url:  ehVideo ? DoaVidaCloudinary.thumbnailVideo(publicId) : '',
            order_index: meta.order_index,
            ativo:       meta.ativo,
            publica:     meta.publica
          });
          feitos++;
        } catch (e) {
          var msgErro = e.message || String(e);
          console.error('[Ação Social] Erro ao fazer upload de', arquivo.name, ':', msgErro);
          showToast('❌ Erro em ' + arquivo.name + ': ' + msgErro, 'error');
          erros++;
        }
      }

      if (feitos > 0) _galeriaConcluir(feitos);
      if (erros > 0)  showToast('⚠️ ' + erros + ' arquivo(s) falharam no upload.', 'warning');
    }
  } catch (e) {
    showToast('❌ Erro ao salvar: ' + (e.message || e), 'error');
    console.error('[Ação Social] salvarFoto:', e);
  } finally {
    if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = 'Salvar'; }
  }
}
window.salvarFoto = salvarFoto;

/* galeriaPublicar = alias para salvarFoto() no modo URL */
async function galeriaPublicar() {
  AdminState.photoMode = 'url';
  await salvarFoto();
}
window.galeriaPublicar = galeriaPublicar;

function _galeriaConcluir(qtd, editando) {
  qtd = qtd || 1;
  _galeriaCache    = [];
  _galeriaUrlCache = {};
  AdminState.pendingPhotos = [];
  var prev = document.getElementById("photo-preview");
  if (prev) prev.innerHTML = "";
  /* Limpa campos do modal */
  ["photo-title", "photo-url-input", "photo-alt", "photo-poster"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = "";
  });
  var carEl = document.getElementById("photo-carousel");
  if (carEl) carEl.checked = false;
  /* Remove editId do modal */
  var modal = document.getElementById('modal-photo');
  if (modal) delete modal.dataset.editId;
  fecharModal("modal-photo");
  ativarAba("gallery");
  renderGaleriaAdmin();
  showToast(
    editando
      ? '✅ Item atualizado com sucesso!'
      : '✅ ' + qtd + ' item(ns) adicionado(s)!',
    'success'
  );
}

/*
  Configura a área de drag-and-drop e seleção de arquivos.
  ✅ BUGS 3 E 4 CORRIGIDOS: todos os IDs ajustados para o HTML correto
*/
function configurarUploadFoto() {
  var area = document.getElementById("photo-upload-area"); /* ✅ correto */
  var fileInput = document.getElementById("photo-file-input"); /* ✅ correto */
  var preview = document.getElementById("photo-preview"); /* ✅ correto */
  if (!area || !fileInput) return;

  /* Clicar na área → abre o seletor de arquivos */
  area.addEventListener("click", function () {
    fileInput.click();
  });

  /* Selecionar arquivo pelo input */
  fileInput.addEventListener("change", function (e) {
    processarArquivos(e.target.files);
  });

  /* Arrastar arquivo para cima da área */
  area.addEventListener("dragover", function (e) {
    e.preventDefault(); /* necessário para aceitar o drop */
    area.classList.add("dragover");
  });
  area.addEventListener("dragleave", function () {
    area.classList.remove("dragover");
  });
  area.addEventListener("drop", function (e) {
    e.preventDefault();
    area.classList.remove("dragover");
    processarArquivos(e.dataTransfer.files);
  });

  /* Tipos MIME aceitos */
  var TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  var TAMANHO_MAX_IMG   = 10 * 1024 * 1024; /* 10MB para imagens */
  var TAMANHO_MAX_VIDEO = 100 * 1024 * 1024; /* 100MB para vídeos */

  /* Processa os arquivos selecionados ou arrastados (imagens E vídeos) */
  function processarArquivos(files) {
    AdminState.pendingPhotos = [];
    if (preview) preview.innerHTML = "";

    Array.from(files).forEach(function (file) {
      /* Detecta tipo por prefixo MIME (suporta qualquer video/* e image/*) */
      var ehImagem = file.type.startsWith('image/');
      var ehVideo  = file.type.startsWith('video/');

      if (!ehImagem && !ehVideo) {
        showToast("⚠️ " + file.name + " não é imagem nem vídeo aceito.", "warning");
        return;
      }
      /* Valida tamanho */
      var limite = ehVideo ? TAMANHO_MAX_VIDEO : TAMANHO_MAX_IMG;
      if (file.size > limite) {
        showToast("⚠️ " + file.name + " excede " + (limite / 1024 / 1024) + "MB.", "error");
        return;
      }

      AdminState.pendingPhotos.push(file);

      /* Atualiza o campo de tipo automaticamente */
      var tipoEl = document.getElementById("photo-tipo");
      if (tipoEl) tipoEl.value = ehVideo ? "video" : "imagem";

      /* Preview: imagem usa FileReader, vídeo usa URL temporário */
      if (preview) {
        var div = document.createElement("div");
        div.className = "upload-preview-item";
        if (ehVideo) {
          var objUrl = URL.createObjectURL(file);
          div.innerHTML = '<video src="' + objUrl + '" muted playsinline preload="metadata" style="width:100%;max-height:120px;object-fit:cover;"></video>' +
                          '<span style="font-size:0.7rem;color:var(--text2);">🎬 ' + escHtml(file.name) + '</span>';
        } else {
          var reader = new FileReader();
          reader.onload = (function(d){ return function(ev) {
            d.innerHTML = '<img src="' + ev.target.result + '" alt="Preview" />';
          }; })(div);
          reader.readAsDataURL(file);
        }
        preview.appendChild(div);
      }
    });
  }
}

/*
  Alterna entre as abas "Upload" e "URL" no modal de foto.
  ✅ BUG 4 CORRIGIDO: IDs ajustados para o HTML
*/
function configurarFotoToggle() {
  var btnUpload = document.getElementById("btn-photo-upload"); /* ✅ correto */
  var btnUrl = document.getElementById("btn-photo-url"); /* ✅ correto */
  var areaUpload =
    document.getElementById("photo-upload-area"); /* ✅ correto */
  var areaUrl = document.getElementById("photo-url-area"); /* ✅ correto */
  if (!btnUpload || !btnUrl) return;

  btnUpload.addEventListener("click", function () {
    AdminState.photoMode = "upload";
    if (areaUpload) areaUpload.style.display = "block";
    if (areaUrl) areaUrl.style.display = "none";
    btnUpload.setAttribute("aria-pressed", "true");
    btnUrl.setAttribute("aria-pressed", "false");
  });

  btnUrl.addEventListener("click", function () {
    AdminState.photoMode = "url";
    if (areaUpload) areaUpload.style.display = "none";
    if (areaUrl) areaUrl.style.display = "block";
    btnUrl.setAttribute("aria-pressed", "true");
    btnUpload.setAttribute("aria-pressed", "false");
  });
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 11 — VOLUNTÁRIOS (aba 6)
   Usa DoaVidaAPI diretamente — sem dependência de voluntario.js
   ══════════════════════════════════════════════════════════════════════ */

/* ── Card mobile de voluntário ───────────────────────────────────── */
function _montarCardVoluntario(v) {
  var id = escHtml(v.id || "");
  var fone = (v.telefone || "").replace(/\D/g, "");
  var status = v.status || "novo";
  var tipo = escHtml(v.tipo_label || v.tipoLabel || v.tipo || "—");
  var data = formatarDataCurta(v.created_at);
  var foneHtml = fone
    ? '<a href="https://wa.me/55' +
      fone +
      '" target="_blank" rel="noopener" class="card-mob-link">' +
      '<i class="fab fa-whatsapp"></i> ' +
      escHtml(v.telefone) +
      "</a>"
    : escHtml(v.telefone || "—");

  /* Botões condicionais por status */
  var botoes = "";
  if (status === "novo") {
    botoes +=
      '<button class="card-mob-btn" style="color:#64b5f6;border-color:#64b5f644;" ' +
      "onclick=\"volMarcarEmContato('" +
      id +
      "')\">" +
      '<i class="fas fa-phone-alt"></i> Em Contato</button>';
  }
  if (status === "novo" || status === "em-contato") {
    botoes +=
      '<button class="card-mob-btn" style="color:#81c784;border-color:#81c78444;" ' +
      "onclick=\"volConfirmar('" +
      id +
      "')\">" +
      '<i class="fas fa-check"></i> Confirmar</button>';
  }
  if (status === "confirmado" || status === "participando") {
    botoes +=
      '<button class="card-mob-btn" style="color:#90a4ae;border-color:#90a4ae44;" ' +
      "onclick=\"volFinalizar('" +
      id +
      "')\">" +
      '<i class="fas fa-flag-checkered"></i> Finalizar</button>';
  }
  /* Abre o modal de edição completa (nome, telefone, tipo, status) */
  botoes +=
    '<button class="card-mob-btn" onclick="abrirModalVoluntario(\'' +
    id +
    "')\">" +
    '<i class="fas fa-pen"></i> Editar</button>';
  botoes +=
    '<button class="card-mob-btn danger" onclick="volExcluir(\'' +
    id +
    "')\">" +
    '<i class="fas fa-trash"></i> Excluir</button>';

  return (
    '<div class="doacao-card-mob" style="cursor:default;">' +
    '<div class="card-mob-header">' +
    '<span class="card-mob-nome">' +
    escHtml(v.nome || "—") +
    "</span>" +
    badgeStatusVol(status) +
    "</div>" +
    '<div class="card-mob-row">' +
    '<span class="card-mob-label"><i class="fab fa-whatsapp"></i> WhatsApp</span>' +
    '<span class="card-mob-valor">' +
    foneHtml +
    "</span>" +
    "</div>" +
    '<div class="card-mob-row">' +
    '<span class="card-mob-label"><i class="fas fa-hands-helping"></i> Como ajuda</span>' +
    '<span class="card-mob-valor">' +
    tipo +
    "</span>" +
    "</div>" +
    '<div class="card-mob-row">' +
    '<span class="card-mob-label"><i class="fas fa-calendar-alt"></i> Cadastro</span>' +
    '<span class="card-mob-valor">' +
    data +
    "</span>" +
    "</div>" +
    '<div class="card-mob-actions">' +
    botoes +
    "</div>" +
    "</div>"
  );
}

async function renderVoluntarios() {
  var tbody = document.getElementById("voluntarios-tbody");
  if (!tbody) return;

  var todos = await DoaVidaSync.getVoluntarios();
  var filtroTipo = getVal("vol-filtro-tipo") || "";
  var filtroStatus = getVal("vol-filtro-status") || "";
  var filtrados = todos.filter(function (v) {
    var matchTipo = !filtroTipo || v.tipo === filtroTipo;
    var matchStatus = !filtroStatus || v.status === filtroStatus;
    return matchTipo && matchStatus;
  });

  /* Atualiza o contador de resultados */
  var elContador = document.getElementById("vol-contador");
  if (elContador) {
    elContador.textContent =
      filtrados.length +
      " voluntário" +
      (filtrados.length !== 1 ? "s" : "") +
      (filtroTipo || filtroStatus ? " (filtrado)" : "");
  }

  if (filtrados.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:48px 24px;">' +
      (filtroTipo || filtroStatus
        ? "Nenhum voluntário com estes filtros."
        : "Nenhum voluntário. Cadastros chegam via " +
          '<a href="voluntario.html" style="color:var(--gold);">voluntario.html</a>.') +
      "</td></tr>";
    var elR = document.getElementById("vol-resumo-status");
    if (elR) elR.innerHTML = "";
    return;
  }

  tbody.innerHTML = filtrados
    .map(function (v) {
      var idEsc = escHtml(v.id || "");
      var nome = escHtml(v.nome || "—");
      var tel = escHtml(v.telefone || "—");
      var tipo = escHtml(v.tipo_label || v.tipoLabel || v.tipo || "—");
      var status = v.status || "novo";
      var fone = (v.telefone || "").replace(/\D/g, "");

      /* Link WhatsApp clicável */
      var linkWA = fone
        ? '<a href="https://wa.me/55' +
          fone +
          '" target="_blank" rel="noopener" ' +
          'style="color:#25d366;"><i class="fab fa-whatsapp"></i> ' +
          tel +
          "</a>"
        : tel;

      /* Botões de ação rápida baseados no status atual */
      var botoes = "";
      if (status === "novo") {
        botoes +=
          '<button class="btn-icon" style="color:#64b5f6;" ' +
          "onclick=\"volMarcarEmContato('" +
          idEsc +
          '\')" title="Em Contato">' +
          '<i class="fas fa-phone-alt"></i></button>';
      }
      if (status === "novo" || status === "em-contato") {
        botoes +=
          '<button class="btn-icon" style="color:#81c784;" ' +
          "onclick=\"volConfirmar('" +
          idEsc +
          '\')" title="Confirmar">' +
          '<i class="fas fa-check"></i></button>';
      }
      if (status === "confirmado" || status === "participando") {
        botoes +=
          '<button class="btn-icon" style="color:#90a4ae;" ' +
          "onclick=\"volFinalizar('" +
          idEsc +
          '\')" title="Finalizar">' +
          '<i class="fas fa-flag-checkered"></i></button>';
      }
      /* Abre o modal de edição completa (nome, telefone, tipo, status) */
      botoes +=
        '<button class="btn-icon" onclick="abrirModalVoluntario(\'' +
        idEsc +
        '\')" title="Editar voluntário">' +
        '<i class="fas fa-pen"></i></button>';
      botoes +=
        '<button class="btn-icon danger" onclick="volExcluir(\'' +
        idEsc +
        '\')" title="Excluir">' +
        '<i class="fas fa-trash"></i></button>';

      return (
        "<tr>" +
        '<td><strong style="color:var(--cream);">' +
        nome +
        "</strong></td>" +
        "<td>" +
        linkWA +
        "</td>" +
        '<td style="font-size:.82rem;">' +
        tipo +
        "</td>" +
        "<td>" +
        badgeStatusVol(status) +
        "</td>" +
        '<td style="font-size:.78rem;color:var(--text2);">' +
        formatarDataCurta(v.created_at) +
        "</td>" +
        '<td><div class="table-actions">' +
        botoes +
        "</div></td>" +
        "</tr>"
      );
    })
    .join("");

  /* ── Cards mobile ── */
  var mobileListVol = document.getElementById("voluntarios-cards-mobile");
  if (mobileListVol) {
    mobileListVol.innerHTML =
      filtrados.length === 0
        ? '<p style="text-align:center;color:var(--text2);padding:32px 16px;">Nenhum voluntário com estes filtros.</p>'
        : filtrados
            .map(function (v) {
              return _montarCardVoluntario(v);
            })
            .join("");
  }

  /* Mini-painel de resumo por status (clicável para filtrar) */
  var elResumo = document.getElementById("vol-resumo-status");
  if (elResumo) {
    var contagem = todos.reduce(function (acc, v) {
      var st = v.status || "novo";
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {});

    elResumo.innerHTML = Object.keys(STATUS_VOL)
      .map(function (chave) {
        var cfg = STATUS_VOL[chave];
        var count = contagem[chave] || 0;
        return (
          '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;' +
          "padding:12px 20px;background:" +
          cfg.cor +
          "0d;border:1px solid " +
          cfg.cor +
          "33;" +
          'border-radius:var(--r-md);min-width:80px;cursor:pointer;" ' +
          "onclick=\"document.getElementById('vol-filtro-status').value='" +
          chave +
          "';filtrarVoluntarios();\" " +
          'role="button" tabindex="0">' +
          '<span style="font-family:var(--ff-display);font-size:1.4rem;font-weight:900;color:' +
          cfg.cor +
          ';">' +
          count +
          "</span>" +
          '<span style="font-family:var(--ff-mono);font-size:.6rem;letter-spacing:.1em;' +
          "text-transform:uppercase;color:" +
          cfg.cor +
          ';opacity:.8;">' +
          cfg.label +
          "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  /* Atualiza gráficos de voluntários com os dados já carregados do Supabase */
  try { renderVolunteersChart(todos); } catch(e) {}
  try { renderVolTipoChart(todos); } catch(e) {}
}
window.renderVoluntarios = renderVoluntarios;

/* Badge colorido de status do voluntário */
function badgeStatusVol(status) {
  var cfg = STATUS_VOL[status] || { label: status, cor: "#e8c96a" };
  return (
    '<span style="display:inline-flex;align-items:center;font-family:var(--ff-mono);' +
    "font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;color:" +
    cfg.cor +
    ";" +
    "border:1px solid " +
    cfg.cor +
    "33;background:" +
    cfg.cor +
    "11;" +
    'border-radius:100px;padding:3px 10px;">' +
    cfg.label +
    "</span>"
  );
}

/* Ações rápidas */
/* Atalhos de status rápido — agora passam objeto ao invés de string */
async function volMarcarEmContato(id) {
  await DoaVidaSync.updateVoluntario(id, { status: "em-contato" });
  showToast("📞 Marcado como Em Contato.", "info", 3000);
}
window.volMarcarEmContato = volMarcarEmContato;

async function volConfirmar(id) {
  await DoaVidaSync.updateVoluntario(id, { status: "confirmado" });
  showToast("✅ Voluntário confirmado!", "success", 3000);
}
window.volConfirmar = volConfirmar;

async function volFinalizar(id) {
  if (!confirm("Finalizar este voluntário?")) return;
  await DoaVidaSync.updateVoluntario(id, { status: "finalizado" });
  showToast("🏁 Finalizado.", "info", 3000);
}
window.volFinalizar = volFinalizar;

/*
  Abre o modal de edição completa do voluntário (Click to Edit).
  Preenche todos os campos: nome, telefone, tipo de ajuda e status.
  @param {string} id — UUID do voluntário
*/
async function abrirModalVoluntario(id) {
  var lista = await DoaVidaSync.getVoluntarios();
  var v = lista.find(function (x) { return x.id === id; });
  if (!v) { showToast("❌ Voluntário não encontrado.", "error"); return; }

  /* Preenche os campos do modal com os dados atuais */
  setVal("vol-edit-id",     id);
  setVal("vol-edit-nome",   v.nome     || v.name  || "");
  setVal("vol-edit-phone",  v.telefone || v.phone || "");
  setVal("vol-edit-help",   v.tipo_label || v.tipoLabel || v.tipo || "");
  setVal("vol-edit-status", v.status   || "novo");

  abrirModal("modal-voluntario-status");
}
window.abrirModalVoluntario = abrirModalVoluntario;

/* Mantém alias para retrocompatibilidade com chamadas existentes no HTML */
window.volEditarStatus = abrirModalVoluntario;

/*
  Salva todos os campos do voluntário diretamente no Supabase.
  Chamado pelo botão "Salvar" do modal-voluntario-status.
*/
async function salvarVoluntarioCompleto() {
  var id     = getVal("vol-edit-id");
  var nome   = (getVal("vol-edit-nome")   || "").trim();
  var phone  = (getVal("vol-edit-phone")  || "").trim();
  var help   = (getVal("vol-edit-help")   || "").trim();
  var status = getVal("vol-edit-status");

  if (!id)   { showToast("⚠️ ID inválido.", "error"); return; }
  if (!nome) { showToast("⚠️ Informe o nome.", "error"); return; }

  try {
    /* Salva os campos atualizados no Supabase */
    await DoaVidaSync.updateVoluntario(id, {
      nome:       nome,
      telefone:   phone,
      tipo:       help,
      tipo_label: help,
      status:     status,
    });
    fecharModal("modal-voluntario-status");
    showToast("✅ Voluntário atualizado!", "success");
    /* O Realtime atualiza a tabela automaticamente */
  } catch (e) {
    showToast("❌ Erro ao salvar: " + (e.message || e), "error");
  }
}
window.salvarVoluntarioCompleto = salvarVoluntarioCompleto;

/* Alias para o botão antigo que chamava salvarStatusVoluntarioModal */
window.salvarStatusVoluntarioModal = salvarVoluntarioCompleto;

async function volExcluir(id) {
  if (!confirm("Excluir permanentemente?")) return;
  await DoaVidaSync.deleteVoluntario(id);
  renderVoluntarios();
  atualizarBadges();
  showToast("🗑️ Excluído.", "info");
}
window.volExcluir = volExcluir;

function filtrarVoluntarios() {
  renderVoluntarios();
}
window.filtrarVoluntarios = filtrarVoluntarios;

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 12 — PEDIDOS DE ORAÇÃO (aba 7)
   ══════════════════════════════════════════════════════════════════════ */

/* ── Card mobile de oração ───────────────────────────────────────── */
function _montarCardOracao(o) {
  var id = escHtml(o.id || "");
  var status = o.status || "precisa-oracao";
  var ePrecisa = status === "precisa-oracao";
  var catCfg =
    typeof CAT_ORACAO !== "undefined" && CAT_ORACAO[o.categoria]
      ? CAT_ORACAO[o.categoria]
      : { label: o.categoria || "—", emoji: "🙏", cor: "#e8c96a" };
  var corSt = ePrecisa ? "#f48fb1" : "#81c784";
  var data = formatarDataCurta(o.created_at);

  var badgeCat =
    '<span style="display:inline-flex;align-items:center;gap:4px;' +
    "font-family:var(--ff-mono);font-size:.6rem;text-transform:uppercase;" +
    "color:" +
    catCfg.cor +
    ";border:1px solid " +
    catCfg.cor +
    "33;" +
    "background:" +
    catCfg.cor +
    '0d;border-radius:100px;padding:2px 8px;">' +
    catCfg.emoji +
    " " +
    catCfg.label +
    "</span>";

  var badgeSt =
    '<span style="display:inline-flex;align-items:center;' +
    "font-family:var(--ff-mono);font-size:.6rem;text-transform:uppercase;" +
    "color:" +
    corSt +
    ";border:1px solid " +
    corSt +
    "33;" +
    "background:" +
    corSt +
    '0d;border-radius:100px;padding:2px 8px;">' +
    (ePrecisa ? "🙏 Precisa de Oração" : "✅ Orando") +
    "</span>";

  var btnOracao = ePrecisa
    ? '<button class="card-mob-btn" style="color:#81c784;border-color:#81c78444;" ' +
      "onclick=\"oracaoMarcarOrando('" +
      id +
      "')\">" +
      '<i class="fas fa-hands-praying"></i> Marcar Orando</button>'
    : '<button class="card-mob-btn" style="color:#f48fb1;border-color:#f48fb144;" ' +
      "onclick=\"oracaoMarcarPrecisa('" +
      id +
      "')\">" +
      '<i class="fas fa-undo"></i> Voltar</button>';

  return (
    '<div class="doacao-card-mob" style="cursor:default;">' +
    '<div class="card-mob-header">' +
    '<span class="card-mob-nome">' +
    escHtml(o.nome || "Anônimo") +
    "</span>" +
    badgeSt +
    "</div>" +
    '<div class="card-mob-row">' +
    '<span class="card-mob-label"><i class="fas fa-tag"></i> Categoria</span>' +
    '<span class="card-mob-valor">' +
    badgeCat +
    "</span>" +
    "</div>" +
    '<div class="card-mob-row">' +
    '<span class="card-mob-label"><i class="fas fa-comment"></i> Pedido</span>' +
    '<span class="card-mob-valor card-mob-obs">' +
    escHtml(o.mensagem || "—") +
    "</span>" +
    "</div>" +
    '<div class="card-mob-row">' +
    '<span class="card-mob-label"><i class="fas fa-calendar-alt"></i> Data</span>' +
    '<span class="card-mob-valor">' +
    data +
    "</span>" +
    "</div>" +
    '<div class="card-mob-actions">' +
    btnOracao +
    '<button class="card-mob-btn danger" onclick="oracaoExcluir(\'' +
    id +
    "')\">" +
    '<i class="fas fa-trash"></i> Excluir</button>' +
    "</div>" +
    "</div>"
  );
}

async function renderOracoes() {
  var tbody = document.getElementById("oracoes-tbody");
  if (!tbody) return;

  var filtroCat = getVal("oracoes-filtro-cat") || "";
  var filtroStatus = getVal("oracoes-filtro-status") || "";
  var todos = await DoaVidaSync.getOracoes();
  var filtrados = todos.filter(function (o) {
    var matchCat = !filtroCat || o.categoria === filtroCat;
    var matchStatus = !filtroStatus || o.status === filtroStatus;
    return matchCat && matchStatus;
  });

  var elContador = document.getElementById("oracoes-contador");
  if (elContador) {
    elContador.textContent =
      filtrados.length +
      " pedido" +
      (filtrados.length !== 1 ? "s" : "") +
      (filtroCat || filtroStatus ? " (filtrado)" : "");
  }

  if (filtrados.length === 0) {
    var msgVazia =
      filtroCat || filtroStatus
        ? "Nenhum pedido com estes filtros."
        : "🙏 Nenhum pedido ainda.";
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--text2);padding:48px;">' +
      msgVazia +
      "</td></tr>";
    var elR = document.getElementById("oracoes-resumo");
    if (elR) elR.innerHTML = "";
    var elMobOr = document.getElementById("oracoes-cards-mobile");
    if (elMobOr)
      elMobOr.innerHTML =
        '<p style="text-align:center;color:var(--text2);padding:32px 16px;">' +
        msgVazia +
        "</p>";
    return;
  }

  tbody.innerHTML = filtrados
    .map(function (o) {
      var idEsc = escHtml(o.id || "");
      var nome = escHtml(o.nome || "Anônimo");
      var mensagem = escHtml(o.mensagem || "—");
      var data = formatarDataCurta(o.created_at);
      var status = o.status || "precisa-oracao";
      var catCfg = CAT_ORACAO[o.categoria] || {
        label: o.categoria || "—",
        emoji: "🙏",
        cor: "#e8c96a",
      };
      var ePrecisa = status === "precisa-oracao";
      var corSt = ePrecisa ? "#f48fb1" : "#81c784";

      var badgeCat =
        '<span style="display:inline-flex;align-items:center;gap:4px;' +
        "font-family:var(--ff-mono);font-size:.62rem;text-transform:uppercase;" +
        "color:" +
        catCfg.cor +
        ";border:1px solid " +
        catCfg.cor +
        "33;" +
        "background:" +
        catCfg.cor +
        '0d;border-radius:100px;padding:3px 9px;">' +
        catCfg.emoji +
        " " +
        catCfg.label +
        "</span>";

      var badgeSt =
        '<span style="display:inline-flex;align-items:center;' +
        "font-family:var(--ff-mono);font-size:.62rem;text-transform:uppercase;" +
        "color:" +
        corSt +
        ";border:1px solid " +
        corSt +
        "33;" +
        "background:" +
        corSt +
        '0d;border-radius:100px;padding:3px 9px;">' +
        (ePrecisa ? "🙏 Precisa de Oração" : "✅ Orando") +
        "</span>";

      var botoes = ePrecisa
        ? '<button class="btn-icon" style="color:#81c784;" ' +
          "onclick=\"oracaoMarcarOrando('" +
          idEsc +
          '\')" title="Marcar como Orando">' +
          '<i class="fas fa-hands-praying"></i></button>'
        : '<button class="btn-icon" style="color:#f48fb1;" ' +
          "onclick=\"oracaoMarcarPrecisa('" +
          idEsc +
          '\')" title="Voltar para Precisa">' +
          '<i class="fas fa-undo"></i></button>';
      botoes +=
        '<button class="btn-icon danger" onclick="oracaoExcluir(\'' +
        idEsc +
        '\')" title="Excluir">' +
        '<i class="fas fa-trash"></i></button>';

      return (
        "<tr>" +
        '<td><strong style="color:var(--cream);">' +
        nome +
        "</strong></td>" +
        "<td>" +
        badgeCat +
        "</td>" +
        '<td style="font-size:.83rem;max-width:260px;">' +
        mensagem +
        "</td>" +
        "<td>" +
        badgeSt +
        "</td>" +
        '<td style="font-size:.78rem;color:var(--text2);">' +
        data +
        '<div class="table-actions" style="margin-top:6px;">' +
        botoes +
        "</div>" +
        "</td>" +
        "</tr>"
      );
    })
    .join("");

  /* ── Cards mobile ── */
  var mobileListOr = document.getElementById("oracoes-cards-mobile");
  if (mobileListOr) {
    mobileListOr.innerHTML =
      filtrados.length === 0
        ? '<p style="text-align:center;color:var(--text2);padding:32px 16px;">' +
          (filtroCat || filtroStatus
            ? "Nenhum pedido com estes filtros."
            : "🙏 Nenhum pedido ainda.") +
          "</p>"
        : filtrados
            .map(function (o) {
              return _montarCardOracao(o);
            })
            .join("");
  }

  /* Mini-painel de resumo */
  var elResumo = document.getElementById("oracoes-resumo");
  if (elResumo) elResumo.innerHTML = '';

  /* Atualiza contadores e gráficos com os dados reais do Supabase */
  renderPrayersCharts(todos);
}
window.renderOracoes = renderOracoes;

/* Helper: card de resumo clicável */
function _cardResumo(count, label, cor, onclick) {
  return (
    '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;' +
    "padding:12px 20px;background:" +
    cor +
    "0d;border:1px solid " +
    cor +
    "33;" +
    'border-radius:var(--r-md);min-width:90px;cursor:pointer;" onclick="' +
    onclick +
    '" ' +
    'role="button" tabindex="0">' +
    '<span style="font-family:var(--ff-display);font-size:1.4rem;font-weight:900;color:' +
    cor +
    ';">' +
    count +
    "</span>" +
    '<span style="font-family:var(--ff-mono);font-size:.6rem;letter-spacing:.1em;' +
    "text-transform:uppercase;color:" +
    cor +
    ';opacity:.8;">' +
    label +
    "</span>" +
    "</div>"
  );
}

async function oracaoMarcarOrando(id) {
  await DoaVidaSync.updateOracao(id, "orando");
  renderOracoes();
  atualizarBadges();
  showToast("🙏 Orando por este pedido!", "success", 3000);
}
window.oracaoMarcarOrando = oracaoMarcarOrando;

async function oracaoMarcarPrecisa(id) {
  await DoaVidaSync.updateOracao(id, "precisa-oracao");
  renderOracoes();
  atualizarBadges();
  showToast('🔄 Voltou para "Precisa de oração".', "info", 3000);
}
window.oracaoMarcarPrecisa = oracaoMarcarPrecisa;

async function oracaoExcluir(id) {
  if (!confirm("Excluir este pedido?")) return;
  await DoaVidaSync.deleteOracao(id);
  renderOracoes();
  atualizarBadges();
  showToast("🗑️ Pedido excluído.", "info");
}
window.oracaoExcluir = oracaoExcluir;

function filtrarOracoes() {
  renderOracoes();
}
window.filtrarOracoes = filtrarOracoes;

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 13 — TAREFAS (aba 8) — NOVO
   Gestão completa de tarefas com envio por WhatsApp
   ══════════════════════════════════════════════════════════════════════ */

/*
  Renderiza a lista de tarefas na aba de Tarefas.
  Aplica filtros de status, tipo e responsável se selecionados.
*/
async function renderTarefas() {
  var container = document.getElementById("tarefas-lista");
  if (!container) return;

  /* Lê os filtros ativos */
  var filtroStatus = getVal("tarefas-filtro-status") || "";
  var filtroTipo = getVal("tarefas-filtro-tipo") || "";
  var filtroResponsavel = getVal("tarefas-filtro-responsavel") || "";

  /* Busca as tarefas com os filtros */
  var tarefas = DoaVidaAPI.getTarefasFiltradas(
    filtroStatus,
    filtroTipo,
    filtroResponsavel,
  );

  /* Atualiza o contador */
  var elContador = document.getElementById("tarefas-contador");
  if (elContador) {
    elContador.textContent =
      tarefas.length +
      " tarefa" +
      (tarefas.length !== 1 ? "s" : "") +
      (filtroStatus || filtroTipo || filtroResponsavel ? " (filtrado)" : "");
  }

  /* Atualiza o select de responsável com os voluntários cadastrados */
  await _atualizarSelectResponsavel("tarefas-filtro-responsavel");
  await _atualizarSelectResponsavel("tarefa-responsavel-id");

  /* Estado vazio */
  if (tarefas.length === 0) {
    container.innerHTML =
      '<div style="text-align:center;color:var(--text2);padding:60px 24px;">' +
      '<i class="fas fa-tasks" style="font-size:2.5rem;opacity:.3;display:block;margin-bottom:16px;"></i>' +
      (filtroStatus || filtroTipo || filtroResponsavel
        ? "Nenhuma tarefa com estes filtros."
        : "Nenhuma tarefa cadastrada ainda.<br>" +
          '<small style="font-size:.8rem;">Clique em "Nova Tarefa" para começar.</small>') +
      "</div>";

    /* Atualiza resumo zerado */
    _renderResumoTarefas(DoaVidaAPI.getTarefas());
    return;
  }

  /* Monta os cards de tarefas */
  container.innerHTML = tarefas
    .map(function (t) {
      return _montarCardTarefa(t);
    })
    .join("");

  /* Atualiza o mini-painel de resumo com o total geral */
  _renderResumoTarefas(DoaVidaAPI.getTarefas());
}
window.renderTarefas = renderTarefas;

/*
  Monta o HTML de um card de tarefa.
  @param {Object} t → objeto da tarefa
  @returns {string}   HTML do card
*/
function _montarCardTarefa(t) {
  var idEsc = escHtml(t.id || "");
  var titulo = escHtml(t.titulo || "—");
  var descricao = escHtml(t.descricao || "");
  var local = escHtml(t.local || "");
  var obs = escHtml(t.obs || "");
  var status = t.status || "pendente";
  var tipo = t.tipo || "organizacao";

  var cfgStatus = STATUS_TAREFA[status] || { label: status, cor: "#e8c96a" };
  var cfgTipo = TIPOS_TAREFA[tipo] || {
    label: tipo,
    emoji: "📋",
    cor: "#e8c96a",
  };

  /* Badge de status */
  var badgeSt =
    '<span style="display:inline-flex;align-items:center;' +
    "font-family:var(--ff-mono);font-size:.6rem;letter-spacing:.08em;text-transform:uppercase;" +
    "color:" +
    cfgStatus.cor +
    ";border:1px solid " +
    cfgStatus.cor +
    "33;" +
    "background:" +
    cfgStatus.cor +
    '11;border-radius:100px;padding:2px 8px;">' +
    cfgStatus.label +
    "</span>";

  /* Badge de tipo */
  var badgeTipo =
    '<span style="display:inline-flex;align-items:center;gap:4px;' +
    "font-family:var(--ff-mono);font-size:.6rem;text-transform:uppercase;" +
    "color:" +
    cfgTipo.cor +
    ';opacity:.8;">' +
    cfgTipo.emoji +
    " " +
    cfgTipo.label +
    "</span>";

  /* Botões de ação */
  var botoes = "";

  /* Botão "Iniciar" — só aparece quando pendente */
  if (status === "pendente") {
    botoes +=
      '<button class="btn btn-outline btn-sm" ' +
      "onclick=\"tarefaIniciar('" +
      idEsc +
      '\')" title="Iniciar tarefa">' +
      '<i class="fas fa-play"></i> Iniciar</button>';
  }

  /* Botão "Concluir" — só aparece quando em andamento */
  if (status === "em-andamento") {
    botoes +=
      '<button class="btn btn-sm" style="background:var(--sage2);color:#0d0d0b;" ' +
      "onclick=\"tarefaConcluir('" +
      idEsc +
      '\')" title="Concluir tarefa">' +
      '<i class="fas fa-check"></i> Concluir</button>';
  }

  /* Botão WhatsApp — sempre visível se tiver responsável com telefone */
  /* Nota: voluntários são buscados de forma síncrona do cache local aqui */
  var voluntario =
    t.responsavelId && window._voluntariosCache
      ? window._voluntariosCache.find(function (v) {
          return v.id === t.responsavelId;
        })
      : null;
  var temFone = voluntario && voluntario.telefone;

  if (temFone) {
    /* Gera o link de WhatsApp com a mensagem da tarefa */
    var linkWA = DoaVidaAPI.gerarLinkWATarefa(t, voluntario.telefone);
    botoes +=
      '<a href="' +
      escHtml(linkWA) +
      '" target="_blank" rel="noopener" ' +
      'class="btn btn-sm" style="background:#25d366;color:#fff;" ' +
      'title="Enviar tarefa por WhatsApp">' +
      '<i class="fab fa-whatsapp"></i> WhatsApp</a>';
  }

  /* Botões de editar e excluir */
  botoes +=
    '<button class="btn-icon" onclick="tarefaEditar(\'' +
    idEsc +
    '\')" title="Editar">' +
    '<i class="fas fa-pen"></i></button>';
  botoes +=
    '<button class="btn-icon danger" onclick="tarefaExcluir(\'' +
    idEsc +
    '\')" title="Excluir">' +
    '<i class="fas fa-trash"></i></button>';

  /* Linha de data/horário/local */
  var infoLinha = [];
  if (t.data)
    infoLinha.push(
      '<i class="fas fa-calendar"></i> ' + _formatarDataBR(t.data),
    );
  if (t.horario)
    infoLinha.push('<i class="fas fa-clock"></i> ' + escHtml(t.horario));
  if (local) infoLinha.push('<i class="fas fa-map-marker-alt"></i> ' + local);
  var infoHtml = infoLinha.length
    ? '<div style="font-size:.78rem;color:var(--text2);display:flex;flex-wrap:wrap;gap:12px;margin:8px 0;">' +
      infoLinha.join("") +
      "</div>"
    : "";

  return (
    '<div style="' +
    "background:var(--surface);border:1px solid var(--border);" +
    "border-left:3px solid " +
    cfgStatus.cor +
    ";" /* linha colorida no lado esquerdo */ +
    "border-radius:var(--r-md);padding:16px 18px;" +
    "display:flex;flex-direction:column;gap:8px;" +
    '">' +
    /* Linha 1: badges */
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
    badgeSt +
    badgeTipo +
    '<span style="font-family:var(--ff-mono);font-size:.65rem;color:var(--text2);margin-left:auto;">' +
    formatarDataCurta(t.created_at) +
    "</span>" +
    "</div>" +
    /* Linha 2: título */
    '<strong style="font-size:.95rem;color:var(--cream);">' +
    titulo +
    "</strong>" +
    /* Linha 3: descrição (se tiver) */
    (descricao
      ? '<p style="font-size:.83rem;color:var(--text2);margin:0;">' +
        descricao +
        "</p>"
      : "") +
    /* Linha 4: data, horário, local */
    infoHtml +
    /* Linha 5: responsável */
    '<div style="font-size:.8rem;color:var(--text2);">' +
    '<i class="fas fa-user"></i> ' +
    escHtml(t.responsavel || "Não atribuído") +
    "</div>" +
    /* Linha 6: observações */
    (obs
      ? '<div style="font-size:.78rem;color:var(--text2);font-style:italic;">💬 ' +
        obs +
        "</div>"
      : "") +
    /* Linha 7: botões de ação */
    '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;">' +
    botoes +
    "</div>" +
    "</div>"
  );
}

/*
  Atualiza o painel de resumo de tarefas com layout premium + gráficos.
  @param {Array} todas → lista completa (sem filtros)
*/
function _renderResumoTarefas(todas) {
  var el = document.getElementById("tarefas-resumo");
  if (!el) return;

  /* Conta por status */
  var cont = { pendente: 0, "em-andamento": 0, concluida: 0 };
  /* Conta por tipo */
  var tipos = {};
  todas.forEach(function (t) {
    var st = t.status || "pendente";
    if (cont[st] !== undefined) cont[st]++;
    var tipo = t.tipo || "geral";
    tipos[tipo] = (tipos[tipo] || 0) + 1;
  });

  var total = todas.length;

  /* ── KPI cards premium — 3 status clicáveis ── */
  var kpiHtml =
    '<div class="prem-kpi-grid prem-kpi-3" style="margin-bottom:16px;">' +

    '<div class="prem-kpi-card" style="--kpi-c:#e8c96a;cursor:pointer;" ' +
    'onclick="document.getElementById(\'tarefas-filtro-status\').value=\'pendente\';filtrarTarefas();" ' +
    'role="button" tabindex="0" title="Filtrar por Pendentes">' +
    '<i class="fas fa-hourglass-half prem-kpi-icon"></i>' +
    '<span class="prem-kpi-num">' + cont["pendente"] + '</span>' +
    '<span class="prem-kpi-label">Pendentes</span>' +
    '</div>' +

    '<div class="prem-kpi-card" style="--kpi-c:#64b5f6;cursor:pointer;" ' +
    'onclick="document.getElementById(\'tarefas-filtro-status\').value=\'em-andamento\';filtrarTarefas();" ' +
    'role="button" tabindex="0" title="Filtrar por Em Andamento">' +
    '<i class="fas fa-play-circle prem-kpi-icon"></i>' +
    '<span class="prem-kpi-num">' + cont["em-andamento"] + '</span>' +
    '<span class="prem-kpi-label">Em Andamento</span>' +
    '</div>' +

    '<div class="prem-kpi-card" style="--kpi-c:#81c784;cursor:pointer;" ' +
    'onclick="document.getElementById(\'tarefas-filtro-status\').value=\'concluida\';filtrarTarefas();" ' +
    'role="button" tabindex="0" title="Filtrar por Concluídas">' +
    '<i class="fas fa-check-circle prem-kpi-icon"></i>' +
    '<span class="prem-kpi-num">' + cont["concluida"] + '</span>' +
    '<span class="prem-kpi-label">Concluídas</span>' +
    '</div>' +
    '</div>';

  /* ── 2 gráficos side-by-side (só se houver tarefas) ── */
  var chartsHtml = "";
  if (total > 0) {
    chartsHtml =
      '<div class="prem-charts-2col">' +
      /* Rosca - por status */
      '<div class="prem-chart-card">' +
      '<div class="prem-chart-card-hdr"><div>' +
      '<div class="prem-chart-title"><i class="fas fa-chart-pie" style="color:var(--gold)"></i> Status das Tarefas</div>' +
      '<div class="prem-chart-sub">Distribuição por etapa de execução</div>' +
      '</div></div>' +
      '<div class="prem-chart-wrap" style="height:180px"><canvas id="tarefas-status-chart"></canvas></div>' +
      '</div>' +
      /* Barras horizontais - por tipo */
      '<div class="prem-chart-card">' +
      '<div class="prem-chart-card-hdr"><div>' +
      '<div class="prem-chart-title"><i class="fas fa-chart-bar" style="color:var(--gold)"></i> Tarefas por Tipo</div>' +
      '<div class="prem-chart-sub">Volume de atividades por categoria</div>' +
      '</div></div>' +
      '<div class="prem-chart-wrap" style="height:180px"><canvas id="tarefas-tipo-chart"></canvas></div>' +
      '</div>' +
      '</div>';
  }

  el.innerHTML = kpiHtml + chartsHtml;

  /* Renderiza os gráficos após injetar o HTML */
  if (total > 0) {
    _renderTarefasStatusChart(cont);
    _renderTarefasTipoChart(tipos);
  }
}

/* Gráfico premium — donut por status de tarefas */
function _renderTarefasStatusChart(cont) {
  _destroyChart("tarefasStatus");
  var canvas = document.getElementById("tarefas-status-chart");
  if (!canvas || !window.Chart) return;
  var total = cont["pendente"] + cont["em-andamento"] + cont["concluida"];
  _charts["tarefasStatus"] = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Pendentes", "Em Andamento", "Concluídas"],
      datasets: [{
        data: [cont["pendente"], cont["em-andamento"], cont["concluida"]],
        backgroundColor: ["rgba(232,201,106,.70)","rgba(100,181,246,.70)","rgba(129,199,132,.70)"],
        borderColor:     ["#e8c96a","#64b5f6","#81c784"],
        borderWidth: 2,
        hoverOffset: 8,
        hoverBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "64%",
      animation: { duration: 600, easing: "easeOutQuart" },
      plugins: {
        legend: {
          position: "right",
          labels: { color: "#b0aa96", font: { size: 11 }, boxWidth: 10, padding: 12 }
        },
        tooltip: {
          backgroundColor: "rgba(18,18,14,.96)",
          titleColor: "#e8e0c8",
          bodyColor: "#a0998a",
          borderColor: "rgba(255,255,255,.1)",
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: function(ctx) {
              var pct = total > 0 ? Math.round(ctx.parsed / total * 100) : 0;
              return "  " + ctx.parsed + " tarefa(s)  ·  " + pct + "%";
            }
          }
        }
      }
    }
  });
}

/* Gráfico premium — barras horizontais por tipo de tarefa */
function _renderTarefasTipoChart(tipos) {
  _destroyChart("tarefasTipo");
  var canvas = document.getElementById("tarefas-tipo-chart");
  if (!canvas || !window.Chart) return;

  var labelMap = {
    organizacao: "Organização", entrega: "Entrega",
    acolhimento: "Acolhimento", atendimento: "Atendimento",
    logistica:   "Logística",   comunicacao: "Comunicação",
    espiritual:  "Espiritual",  financeiro:  "Financeiro",
    geral:       "Geral"
  };
  var keys    = Object.keys(tipos);
  var labels  = keys.map(function(k) { return labelMap[k] || k; });
  var valores = keys.map(function(k) { return tipos[k]; });
  var total   = valores.reduce(function(a, b) { return a + b; }, 0);

  _charts["tarefasTipo"] = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Tarefas",
        data: valores,
        backgroundColor: "rgba(232,201,106,.15)",
        borderColor: "#e8c96a",
        hoverBackgroundColor: "rgba(232,201,106,.80)",
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      animation: { duration: 600, easing: "easeOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(18,18,14,.96)",
          titleColor: "#e8e0c8",
          bodyColor: "#a0998a",
          borderColor: "rgba(255,255,255,.1)",
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: function(ctx) {
              var pct = total > 0 ? Math.round(ctx.parsed.x / total * 100) : 0;
              return "  " + ctx.parsed.x + " tarefa(s)  ·  " + pct + "%";
            }
          }
        }
      },
      scales: {
        x: { beginAtZero: true, ticks: { color: "#888876", stepSize: 1, font: { size: 10 } }, grid: { color: "rgba(255,255,255,.04)" } },
        y: { ticks: { color: "#c4b99a", font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

/*
  Preenche um select com os voluntários cadastrados.
  Usado nos filtros e no formulário de criação de tarefa.
  @param {string} idSelect → id do elemento <select>
*/
async function _atualizarSelectResponsavel(idSelect) {
  var sel = document.getElementById(idSelect);
  if (!sel) return;

  var voluntarios = await DoaVidaSync.getVoluntarios();
  /* Mantém cache global para uso em _montarCardTarefa (síncrono) */
  window._voluntariosCache = voluntarios;

  /* Preserva a opção atual selecionada */
  var valorAtual = sel.value;

  /* Mantém apenas a primeira opção (padrão) */
  while (sel.options.length > 1) sel.remove(1);

  /* Adiciona uma opção para cada voluntário */
  voluntarios
    .filter(function (v) {
      return v.status !== "finalizado";
    }) /* exclui finalizados */
    .forEach(function (v) {
      var opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = v.nome + (v.telefone ? " — " + v.telefone : "");
      sel.appendChild(opt);
    });

  /* Restaura a seleção anterior */
  if (valorAtual) sel.value = valorAtual;
}

/* Abre modal para criar nova tarefa */
async function abrirModalNovaTarefa() {
  /* Limpa todos os campos */
  [
    "tarefa-titulo",
    "tarefa-descricao",
    "tarefa-data",
    "tarefa-horario",
    "tarefa-local",
    "tarefa-tipo",
    "tarefa-responsavel-id",
    "tarefa-obs",
    "tarefa-edit-id",
  ].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = "";
  });

  var titulo = document.getElementById("modal-tarefa-title");
  if (titulo) titulo.textContent = "Nova Tarefa";

  await _atualizarSelectResponsavel("tarefa-responsavel-id");
  abrirModal("modal-tarefa");
}
window.abrirModalNovaTarefa = abrirModalNovaTarefa;

/* Abre modal para editar tarefa existente */
async function tarefaEditar(id) {
  var t = DoaVidaAPI.getTarefas().find(function (x) {
    return x.id === id;
  });
  if (!t) {
    showToast("❌ Tarefa não encontrada.", "error");
    return;
  }

  await _atualizarSelectResponsavel("tarefa-responsavel-id");

  setVal("tarefa-edit-id", id);
  setVal("tarefa-titulo", t.titulo || "");
  setVal("tarefa-descricao", t.descricao || "");
  setVal("tarefa-data", t.data || "");
  setVal("tarefa-horario", t.horario || "");
  setVal("tarefa-local", t.local || "");
  setVal("tarefa-tipo", t.tipo || "organizacao");
  setVal("tarefa-responsavel-id", t.responsavelId || "");
  setVal("tarefa-obs", t.obs || "");

  var titulo = document.getElementById("modal-tarefa-title");
  if (titulo) titulo.textContent = "Editar Tarefa";

  abrirModal("modal-tarefa");
}
window.tarefaEditar = tarefaEditar;

/* Salva tarefa nova ou editada */
async function salvarTarefa() {
  var tituloVal = getVal("tarefa-titulo");
  if (!tituloVal) {
    showToast("⚠️ O título é obrigatório.", "error");
    return;
  }

  /* Descobre qual voluntário foi selecionado (para pegar o nome) */
  var responsavelId = getVal("tarefa-responsavel-id");
  var responsavelNome = "Não atribuído";
  if (responsavelId) {
    var _vols =
      window._voluntariosCache || (await DoaVidaSync.getVoluntarios());
    var vol = _vols.find(function (v) {
      return v.id === responsavelId;
    });
    if (vol) responsavelNome = vol.nome;
  }

  var dados = {
    titulo: tituloVal,
    descricao: getVal("tarefa-descricao"),
    data: getVal("tarefa-data"),
    horario: getVal("tarefa-horario"),
    local: getVal("tarefa-local"),
    tipo: getVal("tarefa-tipo") || "organizacao",
    responsavelId: responsavelId,
    responsavel: responsavelNome,
    obs: getVal("tarefa-obs"),
  };

  try {
    var editId = getVal("tarefa-edit-id");
    if (editId) {
      DoaVidaAPI.updateTarefa(editId, dados);
      showToast("✅ Tarefa atualizada!", "success");
    } else {
      DoaVidaAPI.addTarefa(dados);
      showToast("✅ Tarefa criada!", "success");
    }
  } catch (e) {
    showToast("❌ " + e.message, "error");
    return;
  }

  fecharModal("modal-tarefa");
  renderTarefas();
  atualizarBadges();
}
window.salvarTarefa = salvarTarefa;

/* Ação rápida: muda status para "em andamento" */
function tarefaIniciar(id) {
  if (DoaVidaAPI.updateStatusTarefa(id, "em-andamento")) {
    renderTarefas();
    atualizarBadges();
    showToast("▶️ Tarefa iniciada!", "info", 3000);
  }
}
window.tarefaIniciar = tarefaIniciar;

/* Ação rápida: muda status para "concluída" */
function tarefaConcluir(id) {
  if (!confirm("Marcar esta tarefa como concluída?")) return;
  if (DoaVidaAPI.updateStatusTarefa(id, "concluida")) {
    renderTarefas();
    atualizarBadges();
    showToast("✅ Tarefa concluída!", "success", 3000);
  }
}
window.tarefaConcluir = tarefaConcluir;

/* Exclui uma tarefa */
function tarefaExcluir(id) {
  if (!confirm("Excluir esta tarefa?")) return;
  if (DoaVidaAPI.deleteTarefa(id)) {
    renderTarefas();
    atualizarBadges();
    showToast("🗑️ Tarefa excluída.", "info");
  }
}
window.tarefaExcluir = tarefaExcluir;

/* Re-renderiza ao mudar filtros */
function filtrarTarefas() {
  renderTarefas();
}
window.filtrarTarefas = filtrarTarefas;

/* Formata data YYYY-MM-DD → DD/MM/YYYY para exibição */
function _formatarDataBR(dataISO) {
  if (!dataISO) return "—";
  var p = dataISO.split("-");
  return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : dataISO;
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 14 — WHATSAPP (aba 9)
   ✅ BUGS 6, 7 e 8 CORRIGIDOS: todos os IDs ajustados para o HTML
   ══════════════════════════════════════════════════════════════════════ */

/*
  Configura os eventos da aba de WhatsApp.
  ✅ BUG 6 CORRIGIDO: 'wa-template-select' → 'wa-template'
*/
function configurarWhatsApp() {
  var sel = document.getElementById("wa-template"); /* ✅ ID correto */
  var textarea = document.getElementById("wa-message");
  if (sel) sel.addEventListener("change", atualizarPreviewWA);
  if (textarea) textarea.addEventListener("input", atualizarPreviewWA);
}

/*
  Atualiza o preview visual da mensagem.
  ✅ BUG 6 CORRIGIDO: 'wa-preview' → 'wa-preview-text'
*/
function atualizarPreviewWA() {
  var sel = document.getElementById("wa-template"); /* ✅ ID correto */
  var textarea = document.getElementById("wa-message");
  var preview = document.getElementById("wa-preview-text"); /* ✅ ID correto */
  if (!textarea || !preview) return;

  /* Se selecionou um template, preenche o textarea com ele */
  if (sel && sel.value && WA_TEMPLATES[sel.value]) {
    textarea.value = WA_TEMPLATES[sel.value];
  }

  /* Atualiza o preview com quebras de linha preservadas */
  preview.textContent = textarea.value || "Digite uma mensagem acima...";
}
window.atualizarPreviewWA = atualizarPreviewWA;

/*
  Adiciona um número à lista de destinatários.
  ✅ BUG 7 CORRIGIDO: 'wa-recipient-input' → 'wa-phone-input'
*/
function adicionarDestinatario() {
  var inp = document.getElementById("wa-phone-input"); /* ✅ ID correto */
  var fone = (inp ? inp.value.replace(/\D/g, "") : "").trim();

  if (!fone || fone.length < 10) {
    showToast("⚠️ Número inválido. Use o formato com DDD.", "error");
    return;
  }
  if (AdminState.waRecipients.includes(fone)) {
    showToast("⚠️ Número já adicionado.", "warning");
    return;
  }
  AdminState.waRecipients.push(fone);
  if (inp) inp.value = "";
  renderDestinatarios();
}
window.adicionarDestinatario = adicionarDestinatario;

/* Renderiza a lista de destinatários com botão de remover */
function renderDestinatarios() {
  var lista = document.getElementById("wa-recipients-list");
  if (!lista) return;
  if (AdminState.waRecipients.length === 0) {
    lista.innerHTML =
      '<span style="color:var(--text2);font-size:.8rem;">Nenhum destinatário adicionado.</span>';
    return;
  }
  lista.innerHTML = AdminState.waRecipients
    .map(function (fone, i) {
      return (
        '<span style="display:inline-flex;align-items:center;gap:6px;' +
        "background:var(--surface2);border:1px solid var(--border);" +
        'border-radius:100px;padding:4px 12px;font-size:.8rem;">' +
        fone +
        '<button onclick="removerDestinatario(' +
        i +
        ')" ' +
        'style="background:none;border:none;color:var(--text2);cursor:pointer;padding:0;">' +
        '<i class="fas fa-times"></i></button></span>'
      );
    })
    .join("");
}

function removerDestinatario(i) {
  AdminState.waRecipients.splice(i, 1);
  renderDestinatarios();
}
window.removerDestinatario = removerDestinatario;

/* Envia a mensagem para todos os destinatários */
function enviarMensagem() {
  var textarea = document.getElementById("wa-message");
  var msg = textarea ? textarea.value.trim() : "";
  if (!msg) {
    showToast("⚠️ Digite uma mensagem.", "error");
    return;
  }
  if (AdminState.waRecipients.length === 0) {
    showToast("⚠️ Adicione pelo menos um destinatário.", "error");
    return;
  }
  AdminState.waRecipients.forEach(function (fone) {
    /* Abre o WhatsApp com a mensagem pré-preenchida */
    window.open(
      "https://wa.me/55" + fone + "?text=" + encodeURIComponent(msg),
      "_blank",
    );
    DoaVidaAPI.addLog({
      tipo: "manual",
      para: fone,
      status: "aberto",
      preview: msg.substring(0, 80),
    });
  });
  showToast(
    "✅ WhatsApp aberto para " +
      AdminState.waRecipients.length +
      " contato(s)!",
    "success",
  );
  renderWALogs();
}
window.enviarMensagem = enviarMensagem;

/*
  Renderiza o histórico de mensagens enviadas.
  ✅ BUG 8 CORRIGIDO: 'wa-logs-tbody' → 'wa-logs-list'
*/
function renderWALogs() {
  var lista = document.getElementById("wa-logs-list"); /* ✅ ID correto */
  var logs = DoaVidaAPI.getLogs();
  if (!lista) return;

  if (logs.length === 0) {
    lista.innerHTML =
      '<div style="text-align:center;color:var(--text2);padding:24px;font-size:.85rem;">' +
      "Nenhuma mensagem enviada ainda.</div>";
    return;
  }

  /* Exibe os 30 mais recentes */
  lista.innerHTML = logs
    .slice(0, 30)
    .map(function (l) {
      var ok = l.status === "enviado" || l.status === "aberto";
      return (
        '<div class="log-item">' +
        '<div class="log-item-header">' +
        '<span class="log-tipo">' +
        escHtml(l.tipo || "—") +
        "</span>" +
        '<span class="log-para">' +
        escHtml(l.para || "—") +
        "</span>" +
        '<span style="color:' +
        (ok ? "#81c784" : "#f48fb1") +
        ';font-size:.75rem;">' +
        escHtml(l.status || "—") +
        "</span>" +
        '<span style="font-size:.72rem;color:var(--text2);">' +
        formatarDataCurta(l.created_at) +
        "</span>" +
        "</div>" +
        (l.preview
          ? '<div class="log-preview">' + escHtml(l.preview) + "</div>"
          : "") +
        "</div>"
      );
    })
    .join("");
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 15 — CONFIGURAÇÕES (aba 10)
   ══════════════════════════════════════════════════════════════════════ */

function configurarConfiguracoes() {
  var apiInput = document.getElementById("wa-apikey");
  if (apiInput) {
    apiInput.addEventListener("blur", function () {
      var cfg = DoaVidaAPI.getWaConfig();
      DoaVidaAPI.updateWaConfig(
        Object.assign(cfg, { apikey: apiInput.value.trim() }),
      );
      showToast("✅ APIKEY salva!", "success", 2000);
    });
  }

  var toggle = document.getElementById("wa-notif-toggle");
  if (toggle) {
    toggle.addEventListener("change", function () {
      var cfg = DoaVidaAPI.getWaConfig();
      DoaVidaAPI.updateWaConfig(Object.assign(cfg, { ativo: toggle.checked }));
      showToast(
        toggle.checked ? "✅ Notificações ativas!" : "ℹ️ Desativadas.",
        "info",
        2000,
      );
    });
  }

  carregarConfigWA();
}

function carregarConfigWA() {
  var cfg = DoaVidaAPI.getWaConfig();
  var apiInput = document.getElementById("wa-apikey");
  var toggle = document.getElementById("wa-notif-toggle");
  if (apiInput) apiInput.value = cfg.apikey || "";
  if (toggle) toggle.checked = cfg.ativo || false;
  renderNumerosAdmin();
}

function alterarSenha() {
  var atual = getVal("current-password");
  var nova = getVal("new-password");
  var confirma = getVal("confirm-password");
  if (!atual || !nova || !confirma) {
    showToast("⚠️ Preencha todos os campos.", "error");
    return;
  }
  if (nova !== confirma) {
    showToast("⚠️ As senhas não conferem.", "error");
    return;
  }
  try {
    DoaVidaAPI.alterarSenha(atual, nova);
    ["current-password", "new-password", "confirm-password"].forEach(function (id) { setVal(id, ""); });
    /* Sincroniza nova senha no Supabase — disponível em qualquer dispositivo */
    if (window.DoaVidaSync && DoaVidaSync.setSenha) {
      DoaVidaSync.setSenha(nova).catch(function(){});
    }
    showToast("✅ Senha alterada em todos os dispositivos!", "success");
  } catch (e) {
    showToast("❌ " + e.message, "error");
  }
}
window.alterarSenha = alterarSenha;

function adicionarNumeroAdmin() {
  var inp = document.getElementById("admin-phone-input");
  var fone = (inp ? inp.value.replace(/\D/g, "") : "").trim();
  if (!fone || fone.length < 10) {
    showToast("⚠️ Número inválido.", "error");
    return;
  }
  var cfg = DoaVidaAPI.getWaConfig();
  var phones = Array.isArray(cfg.adminPhone) ? cfg.adminPhone : [];
  if (phones.includes("+55" + fone)) {
    showToast("⚠️ Já cadastrado.", "warning");
    return;
  }
  phones.push("+55" + fone);
  DoaVidaAPI.updateWaConfig(Object.assign(cfg, { adminPhone: phones }));
  if (inp) inp.value = "";
  renderNumerosAdmin();
  showToast("✅ Número adicionado!", "success");
}
window.adicionarNumeroAdmin = adicionarNumeroAdmin;

function renderNumerosAdmin() {
  var lista = document.getElementById("admin-phones-list");
  if (!lista) return;
  var cfg = DoaVidaAPI.getWaConfig();
  var phones = Array.isArray(cfg.adminPhone) ? cfg.adminPhone : [];
  if (phones.length === 0) {
    lista.innerHTML =
      '<span style="color:var(--text2);font-size:.8rem;">Nenhum número cadastrado.</span>';
    return;
  }
  lista.innerHTML = phones
    .map(function (p, i) {
      return (
        '<span style="display:inline-flex;align-items:center;gap:6px;' +
        "background:var(--surface2);border:1px solid var(--border);" +
        'border-radius:100px;padding:4px 12px;font-size:.8rem;color:var(--text);">' +
        escHtml(p) +
        '<button onclick="removerNumeroAdmin(' +
        i +
        ')" ' +
        'style="background:none;border:none;color:var(--text2);cursor:pointer;">' +
        '<i class="fas fa-times"></i></button></span>'
      );
    })
    .join("");
}

function removerNumeroAdmin(i) {
  var cfg = DoaVidaAPI.getWaConfig();
  var phones = Array.isArray(cfg.adminPhone) ? cfg.adminPhone : [];
  phones.splice(i, 1);
  DoaVidaAPI.updateWaConfig(Object.assign(cfg, { adminPhone: phones }));
  renderNumerosAdmin();
  showToast("🗑️ Número removido.", "info");
}
window.removerNumeroAdmin = removerNumeroAdmin;

function exportarDados() {
  DoaVidaAPI.baixarExportacao();
  showToast("📥 Backup gerado!", "success");
}
window.exportarDados = exportarDados;

function confirmarLimpeza() {
  if (
    !confirm(
      "⚠️ Isso apagará TODOS os dados.\nSenha e sessão serão preservadas.\n\nContinuar?",
    )
  )
    return;
  DoaVidaAPI.limparTudo();
  carregarTodosDados();
  showToast("🗑️ Dados apagados.", "warning", 5000);
}
window.confirmarLimpeza = confirmarLimpeza;

/* ─── Fotos do Hero ────────────────────────────────────────────────── */

var HERO_FOTOS_PADRAO = {
  foto1: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=700&q=80",
  foto2: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=400&q=80",
  foto3: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400&q=80",
};

/*
  Renderiza a seção de fotos/vídeos da capa (categoria=hero) no painel de config.
  Fonte autoritativa: Supabase (tabela galeria, categoria=hero, ativo=true).
  Fallback para localStorage se Supabase ainda não estiver pronto.
*/
async function renderFotosHero() {
  var container = document.getElementById("hero-fotos-lista");

  /* Fallback imediato via localStorage enquanto o Supabase carrega */
  try {
    var raw = localStorage.getItem("doavida_hero_fotos");
    if (raw) {
      var ls = typeof raw === 'string' ? JSON.parse(raw) : raw;
      _renderHeroListaLocal(ls);
    }
  } catch (e) { /* silencioso */ }

  /* Busca autoritativa no Supabase */
  if (!window.supabaseClient && !window.DoaVidaSync) return;

  try {
    var todas = await DoaVidaSync.getGaleria();
    var heroItems = (todas || []).filter(function (f) {
      return f.categoria === 'hero' && f.ativo !== false;
    });
    heroItems.sort(function(a,b){ return (a.order_index||0) - (b.order_index||0); });

    /* Atualiza o localStorage com os dados reais */
    if (heroItems.length) {
      localStorage.setItem("doavida_hero_fotos", JSON.stringify(heroItems));
    }

    _renderHeroListaSupabase(heroItems, container);

    /* Preenche os campos legados foto1/foto2/foto3 (compatibilidade com salvarFotosHero) */
    var el1 = document.getElementById("hero-foto1-url");
    var el2 = document.getElementById("hero-foto2-url");
    var el3 = document.getElementById("hero-foto3-url");
    if (el1) el1.value = (heroItems[0] && heroItems[0].url) || '';
    if (el2) el2.value = (heroItems[1] && heroItems[1].url) || '';
    if (el3) el3.value = (heroItems[2] && heroItems[2].url) || '';
  } catch (e) {
    /* silencioso — mantém o que foi exibido via localStorage */
  }
}
window.renderFotosHero = renderFotosHero;

/* Renderiza lista de itens hero a partir do localStorage (rascunho rápido) */
function _renderHeroListaLocal(fotos) {
  var el1 = document.getElementById("hero-foto1-url");
  var el2 = document.getElementById("hero-foto2-url");
  var el3 = document.getElementById("hero-foto3-url");
  if (Array.isArray(fotos)) {
    if (el1) el1.value = (fotos[0] && fotos[0].url) || fotos[0] || '';
    if (el2) el2.value = (fotos[1] && fotos[1].url) || fotos[1] || '';
    if (el3) el3.value = (fotos[2] && fotos[2].url) || fotos[2] || '';
  } else if (fotos && typeof fotos === 'object') {
    if (el1) el1.value = fotos.foto1 || '';
    if (el2) el2.value = fotos.foto2 || '';
    if (el3) el3.value = fotos.foto3 || '';
  }
}

/* Renderiza lista detalhada de itens hero vindos do Supabase */
function _renderHeroListaSupabase(items, container) {
  if (!container) return;
  if (!items || items.length === 0) {
    container.innerHTML =
      '<p style="color:var(--text2);font-size:.85rem;">Nenhuma mídia definida para a capa.' +
      ' Adicione itens na galeria com categoria <strong>hero</strong>.</p>';
    return;
  }
  container.innerHTML = items.map(function (f) {
    var url  = escHtml(f.url || '');
    var leg  = escHtml(f.titulo || f.legenda || '');
    var tipo = f.tipo === 'video' ? 'video' : 'imagem';
    var preview = tipo === 'video'
      ? '<video src="' + url + '" muted playsinline preload="none" ' +
        'style="width:64px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0;"></video>'
      : '<img src="' + url + '" alt="' + leg + '" ' +
        'style="width:64px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0;" loading="lazy" />';
    return (
      '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;' +
      'border-bottom:1px solid var(--border);">' +
      preview +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-size:.8rem;font-weight:600;color:var(--text1);' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (leg || '(sem título)') + '</div>' +
      '<div style="font-size:.72rem;color:var(--text2);">' +
      (tipo === 'video' ? '▶ Vídeo' : '🖼 Imagem') +
      ' · ordem ' + (f.order_index || 0) + '</div>' +
      '</div>' +
      '<button class="btn-icon danger" title="Remover da capa" ' +
      'onclick="galeriaRemoverDaCapa(\'' + escHtml(f.id || '') + '\')" ' +
      'style="flex-shrink:0;"><i class="fas fa-times"></i></button>' +
      '</div>'
    );
  }).join('');
}

/*
  Remove um item da capa (muda categoria para 'geral').
  @param {string} id — UUID do item
*/
async function galeriaRemoverDaCapa(id) {
  if (!confirm('Remover este item da capa da página inicial?')) return;
  try {
    await DoaVidaSync.updateFotoGaleria(id, { categoria: 'geral' });
    _galeriaCache = []; _galeriaUrlCache = {};
    renderFotosHero();
    renderGaleriaAdmin();
    if (window.HeroCarousel && typeof HeroCarousel.reload === 'function') HeroCarousel.reload();
    showToast('↩️ Item removido da capa.', 'info');
  } catch (e) {
    showToast('❌ Erro ao remover da capa.', 'error');
  }
}
window.galeriaRemoverDaCapa = galeriaRemoverDaCapa;

function previewFotoHero(num) {
  var url = (document.getElementById("hero-foto" + num + "-url") || {}).value || "";
  var wrap = document.getElementById("hero-foto" + num + "-preview");
  var img = document.getElementById("hero-foto" + num + "-img");
  if (!wrap || !img || !url.trim()) return;
  img.src = url.trim();
  wrap.style.display = "block";
}
window.previewFotoHero = previewFotoHero;

function salvarFotosHero() {
  var url1 = ((document.getElementById("hero-foto1-url") || {}).value || "").trim();
  if (!url1) { showToast("⚠️ Cole a URL da foto do banner.", "error"); return; }
  var atual = {};
  try { atual = JSON.parse(localStorage.getItem("doavida_hero_fotos") || "{}"); } catch (e) {}
  var json = JSON.stringify({ foto1: url1, foto2: atual.foto2 || HERO_FOTOS_PADRAO.foto2, foto3: atual.foto3 || HERO_FOTOS_PADRAO.foto3 });
  localStorage.setItem("doavida_hero_fotos", json);
  /* Salva no Supabase com a mesma chave que o index.html lê */
  if (window.DoaVidaSync && typeof DoaVidaSync.setConfig === 'function') {
    var tarefas = [DoaVidaSync.setConfig('doavida_hero_fotos', json)];
    if (typeof DoaVidaSync.setBannerHero === 'function') {
      tarefas.push(DoaVidaSync.setBannerHero(url1));
    }
    Promise.all(tarefas).then(function() {
      gerarBannerConfigJs();
      showToast("✅ Banner salvo em todos os dispositivos!", "success");
    }).catch(function() {
      gerarBannerConfigJs();
      showToast("✅ Banner salvo localmente. (Supabase offline)", "success");
    });
  } else {
    gerarBannerConfigJs();
    showToast("✅ Banner salvo!", "success");
  }
}
window.salvarFotosHero = salvarFotosHero;

function restaurarFotosHeroPadrao() {
  localStorage.removeItem("doavida_hero_fotos");
  var el1 = document.getElementById("hero-foto1-url");
  if (el1) el1.value = HERO_FOTOS_PADRAO.foto1;
  var prev = document.getElementById("hero-foto1-preview");
  if (prev) prev.style.display = "none";
  showToast("↩️ Foto original restaurada.", "success");
}
window.restaurarFotosHeroPadrao = restaurarFotosHeroPadrao;

/* ─── Gera e baixa o banner-config.js atualizado ────────────────────── */
function gerarBannerConfigJs() {
  try {
    var heroBannerUrl = HERO_FOTOS_PADRAO.foto1;
    var volBannerUrl  = VOL_BANNER_PADRAO;
    try {
      var h = JSON.parse(localStorage.getItem("doavida_hero_fotos") || "{}");
      if (h.foto1) heroBannerUrl = h.foto1;
    } catch (e) {}
    try {
      var v = JSON.parse(localStorage.getItem("doavida_vol_banner") || "{}");
      if (v.foto1) volBannerUrl = v.foto1;
    } catch (e) {}
    var conteudo = [
      "/* banner-config.js — gerado pelo Admin DoaVida em " + new Date().toLocaleString("pt-BR") + " */",
      "var BANNER_CONFIG = {",
      "  heroBanner: " + JSON.stringify(heroBannerUrl) + ",",
      "  volBanner:  " + JSON.stringify(volBannerUrl),
      "};"
    ].join("\n");
    var blob = new Blob([conteudo], { type: "text/javascript" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "banner-config.js";
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    /* silencioso se download falhar */
  }
}
window.gerarBannerConfigJs = gerarBannerConfigJs;

/* ─── Banner da página Voluntário ───────────────────────────────────── */
var VOL_BANNER_PADRAO = "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1600&h=900&fit=crop&auto=format";

function renderVolBanner() {
  try {
    var raw = localStorage.getItem("doavida_vol_banner");
    var dados = raw ? JSON.parse(raw) : { foto1: VOL_BANNER_PADRAO };
    var el = document.getElementById("vol-banner-url");
    if (el) el.value = dados.foto1 || VOL_BANNER_PADRAO;
  } catch (e) {}
}
window.renderVolBanner = renderVolBanner;

function previewVolBanner() {
  var url = ((document.getElementById("vol-banner-url") || {}).value || "").trim();
  var wrap = document.getElementById("vol-banner-preview");
  var img  = document.getElementById("vol-banner-img");
  if (!wrap || !img || !url) return;
  img.src = url;
  wrap.style.display = "block";
}
window.previewVolBanner = previewVolBanner;

function salvarVolBanner() {
  var url = ((document.getElementById("vol-banner-url") || {}).value || "").trim();
  if (!url) { showToast("⚠️ Cole a URL da foto do banner.", "error"); return; }
  localStorage.setItem("doavida_vol_banner", JSON.stringify({ foto1: url }));
  if (window.DoaVidaSync && DoaVidaSync.setBannerVoluntario) {
    DoaVidaSync.setBannerVoluntario(url).then(function() {
      gerarBannerConfigJs();
      showToast("✅ Banner salvo em todos os dispositivos!", "success");
    }).catch(function() {
      gerarBannerConfigJs();
      showToast("✅ Banner salvo localmente. (Supabase offline)", "success");
    });
  } else {
    gerarBannerConfigJs();
    showToast("✅ Banner salvo!", "success");
  }
}
window.salvarVolBanner = salvarVolBanner;

function restaurarVolBanner() {
  localStorage.removeItem("doavida_vol_banner");
  var el = document.getElementById("vol-banner-url");
  if (el) el.value = VOL_BANNER_PADRAO;
  var prev = document.getElementById("vol-banner-preview");
  if (prev) prev.style.display = "none";
  showToast("↩️ Banner original restaurado.", "success");
}
window.restaurarVolBanner = restaurarVolBanner;

/* ─── Fotos da Missão ──────────────────────────────────────────────── */

var MISSAO_FOTOS_PADRAO = {
  foto1:
    "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=700&q=80",
  foto2:
    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80",
};

/* Preenche os campos com os valores salvos ao carregar a aba Config */
function renderFotosMissao() {
  try {
    var raw = localStorage.getItem("doavida_missao_fotos");
    var fotos = raw ? JSON.parse(raw) : MISSAO_FOTOS_PADRAO;
    var el1 = document.getElementById("missao-foto1-url");
    var el2 = document.getElementById("missao-foto2-url");
    if (el1) el1.value = fotos.foto1 || "";
    if (el2) el2.value = fotos.foto2 || "";
  } catch (e) {
    /* silencioso */
  }
}
window.renderFotosMissao = renderFotosMissao;

/* Mostra pré-visualização sem sair do admin */
function previewFotoMissao(num) {
  var url =
    (document.getElementById("missao-foto" + num + "-url") || {}).value || "";
  var wrap = document.getElementById("missao-foto" + num + "-preview");
  var img = document.getElementById("missao-foto" + num + "-img");
  if (!wrap || !img || !url.trim()) return;
  img.src = url.trim();
  wrap.style.display = "block";
}
window.previewFotoMissao = previewFotoMissao;

/* Salva as URLs no localStorage */
function salvarFotosMissao() {
  var url1 = (
    (document.getElementById("missao-foto1-url") || {}).value || ""
  ).trim();
  var url2 = (
    (document.getElementById("missao-foto2-url") || {}).value || ""
  ).trim();
  if (!url1 && !url2) {
    showToast("⚠️ Preencha ao menos uma URL.", "error");
    return;
  }
  var atual = {};
  try {
    atual = JSON.parse(localStorage.getItem("doavida_missao_fotos") || "{}");
  } catch (e) {}
  var novas = {
    foto1: url1 || atual.foto1 || MISSAO_FOTOS_PADRAO.foto1,
    foto2: url2 || atual.foto2 || MISSAO_FOTOS_PADRAO.foto2,
  };
  var json = JSON.stringify(novas);
  localStorage.setItem("doavida_missao_fotos", json);
  if (window.DoaVidaSync && typeof DoaVidaSync.setConfig === 'function') {
    showToast("⏳ Salvando no servidor…", "info");
    DoaVidaSync.setConfig('doavida_missao_fotos', json)
      .then(function () { showToast("✅ Fotos da Missão salvas! Recarregue o site.", "success"); })
      .catch(function (e) { showToast("❌ Erro ao salvar no servidor: " + (e && e.message ? e.message : "verifique a conexão."), "error"); });
  } else {
    showToast("⚠️ Salvo localmente (Supabase offline — não refletirá em outros dispositivos).", "warn");
  }
}
window.salvarFotosMissao = salvarFotosMissao;

/* Restaura as fotos originais */
function restaurarFotosMissaoPadrao() {
  localStorage.removeItem("doavida_missao_fotos");
  var el1 = document.getElementById("missao-foto1-url");
  var el2 = document.getElementById("missao-foto2-url");
  if (el1) el1.value = MISSAO_FOTOS_PADRAO.foto1;
  if (el2) el2.value = MISSAO_FOTOS_PADRAO.foto2;
  ["missao-foto1-preview", "missao-foto2-preview"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  showToast("↩️ Fotos originais restauradas.", "success");
}
window.restaurarFotosMissaoPadrao = restaurarFotosMissaoPadrao;

/* ─── Pilares da Missão (index.html) ─────────────────────────────── */
var PILLARS_PADRAO = {
  p1: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80",
  p2: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&q=80",
  p3: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&q=80",
  p4: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80"
};
function renderFotosPillars() {
  try {
    var d = JSON.parse(localStorage.getItem("doavida_pillars") || "{}");
    [1,2,3,4].forEach(function(n) {
      var el = document.getElementById("pillar" + n + "-url");
      if (el) el.value = d["p" + n] || PILLARS_PADRAO["p" + n];
    });
  } catch(e) {}
}
window.renderFotosPillars = renderFotosPillars;
function previewFotoPillar(n) {
  var url = ((document.getElementById("pillar" + n + "-url") || {}).value || "").trim();
  var wrap = document.getElementById("pillar" + n + "-preview");
  var img  = document.getElementById("pillar" + n + "-img");
  if (!wrap || !img || !url) return;
  img.src = url; wrap.style.display = "block";
}
window.previewFotoPillar = previewFotoPillar;
function salvarFotosPillars() {
  var atual = {}; try { atual = JSON.parse(localStorage.getItem("doavida_pillars") || "{}"); } catch(e) {}
  var novas = {};
  [1,2,3,4].forEach(function(n) {
    var v = ((document.getElementById("pillar" + n + "-url") || {}).value || "").trim();
    novas["p" + n] = v || atual["p" + n] || PILLARS_PADRAO["p" + n];
  });
  var json = JSON.stringify(novas);
  localStorage.setItem("doavida_pillars", json);
  if (window.DoaVidaSync && typeof DoaVidaSync.setConfig === 'function') {
    showToast("⏳ Salvando no servidor…", "info");
    DoaVidaSync.setConfig('doavida_pillars', json)
      .then(function () { showToast("✅ Pilares salvos! Recarregue o site.", "success"); })
      .catch(function (e) { showToast("❌ Erro ao salvar no servidor: " + (e && e.message ? e.message : "verifique a conexão."), "error"); });
  } else {
    showToast("⚠️ Salvo localmente (Supabase offline).", "warn");
  }
}
window.salvarFotosPillars = salvarFotosPillars;
function restaurarFotosPillarsPadrao() {
  localStorage.removeItem("doavida_pillars");
  [1,2,3,4].forEach(function(n) {
    var el = document.getElementById("pillar" + n + "-url");
    if (el) el.value = PILLARS_PADRAO["p" + n];
    var w = document.getElementById("pillar" + n + "-preview");
    if (w) w.style.display = "none";
  });
  showToast("↩️ Fotos originais restauradas.", "success");
}
window.restaurarFotosPillarsPadrao = restaurarFotosPillarsPadrao;

/* ─── Por que ser Voluntário (voluntario.html) ────────────────────── */
var WHY_PADRAO = {
  w1: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=700&q=80",
  w2: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=700&q=80",
  w3: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=700&q=80"
};
function _aplicarCamposWhy(d) {
  [1,2,3].forEach(function(n) {
    var el = document.getElementById("why" + n + "-url");
    if (el) el.value = (d && d["w" + n]) ? d["w" + n] : WHY_PADRAO["w" + n];
  });
}
async function renderFotosWhy() {
  try {
    /* 1º: localStorage (rápido) */
    var d = {};
    try { d = JSON.parse(localStorage.getItem("doavida_vol_why") || "{}"); } catch(e) {}
    _aplicarCamposWhy(d);
    /* 2º: Supabase (autoritativo) */
    if (window.DoaVidaSync && typeof DoaVidaSync.getConfig === 'function') {
      var raw = await DoaVidaSync.getConfig('doavida_vol_why');
      if (raw) {
        try {
          var s = JSON.parse(raw);
          localStorage.setItem("doavida_vol_why", raw);
          _aplicarCamposWhy(s);
        } catch(e) {}
      }
    }
  } catch(e) {}
}
window.renderFotosWhy = renderFotosWhy;
function previewFotoWhy(n) {
  var url = ((document.getElementById("why" + n + "-url") || {}).value || "").trim();
  var wrap = document.getElementById("why" + n + "-preview");
  var img  = document.getElementById("why" + n + "-img");
  if (!wrap || !img || !url) return;
  img.src = url; wrap.style.display = "block";
}
window.previewFotoWhy = previewFotoWhy;
async function salvarFotosWhy() {
  var atual = {}; try { atual = JSON.parse(localStorage.getItem("doavida_vol_why") || "{}"); } catch(e) {}
  var novas = {};
  [1,2,3].forEach(function(n) {
    var v = ((document.getElementById("why" + n + "-url") || {}).value || "").trim();
    novas["w" + n] = v || atual["w" + n] || WHY_PADRAO["w" + n];
  });
  var payload = JSON.stringify(novas);
  try {
    if (!window.DoaVidaSync || typeof DoaVidaSync.setConfig !== 'function') {
      throw new Error("DoaVidaSync indisponível — verifique conexão com Supabase");
    }
    await DoaVidaSync.setConfig('doavida_vol_why', payload);
    localStorage.setItem("doavida_vol_why", payload);
    showToast("✅ Fotos 'Por que ser Voluntário' salvas no Supabase!", "success");
  } catch(e) {
    console.error("[salvarFotosWhy] Falha:", e);
    showToast("⚠️ Erro: " + (e && e.message ? e.message : "desconhecido"), "error");
  }
}
window.salvarFotosWhy = salvarFotosWhy;
function restaurarFotosWhyPadrao() {
  localStorage.removeItem("doavida_vol_why");
  [1,2,3].forEach(function(n) {
    var el = document.getElementById("why" + n + "-url");
    if (el) el.value = WHY_PADRAO["w" + n];
    var w = document.getElementById("why" + n + "-preview");
    if (w) w.style.display = "none";
  });
  showToast("↩️ Fotos originais restauradas.", "success");
}
window.restaurarFotosWhyPadrao = restaurarFotosWhyPadrao;

/* ─── Como Contribuir (voluntario.html) ──────────────────────────── */
var CONTRIB_PADRAO = {
  c1: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&q=80",
  c2: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&q=80",
  c3: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80",
  c4: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80"
};
function _aplicarCamposContrib(d) {
  [1,2,3,4].forEach(function(n) {
    var el = document.getElementById("contrib" + n + "-url");
    if (el) el.value = (d && d["c" + n]) ? d["c" + n] : CONTRIB_PADRAO["c" + n];
  });
}
async function renderFotosContrib() {
  try {
    /* 1º: localStorage (rápido) */
    var d = {};
    try { d = JSON.parse(localStorage.getItem("doavida_vol_contrib") || "{}"); } catch(e) {}
    _aplicarCamposContrib(d);
    /* 2º: Supabase (autoritativo) */
    if (window.DoaVidaSync && typeof DoaVidaSync.getConfig === 'function') {
      var raw = await DoaVidaSync.getConfig('doavida_vol_contrib');
      if (raw) {
        try {
          var s = JSON.parse(raw);
          localStorage.setItem("doavida_vol_contrib", raw);
          _aplicarCamposContrib(s);
        } catch(e) {}
      }
    }
  } catch(e) {}
}
window.renderFotosContrib = renderFotosContrib;
function previewFotoContrib(n) {
  var url = ((document.getElementById("contrib" + n + "-url") || {}).value || "").trim();
  var wrap = document.getElementById("contrib" + n + "-preview");
  var img  = document.getElementById("contrib" + n + "-img");
  if (!wrap || !img || !url) return;
  img.src = url; wrap.style.display = "block";
}
window.previewFotoContrib = previewFotoContrib;
async function salvarFotosContrib() {
  var atual = {}; try { atual = JSON.parse(localStorage.getItem("doavida_vol_contrib") || "{}"); } catch(e) {}
  var novas = {};
  [1,2,3,4].forEach(function(n) {
    var v = ((document.getElementById("contrib" + n + "-url") || {}).value || "").trim();
    novas["c" + n] = v || atual["c" + n] || CONTRIB_PADRAO["c" + n];
  });
  var payload = JSON.stringify(novas);
  try {
    if (!window.DoaVidaSync || typeof DoaVidaSync.setConfig !== 'function') {
      throw new Error("DoaVidaSync indisponível — verifique conexão com Supabase");
    }
    await DoaVidaSync.setConfig('doavida_vol_contrib', payload);
    localStorage.setItem("doavida_vol_contrib", payload);
    showToast("✅ Fotos 'Como Contribuir' salvas no Supabase!", "success");
  } catch(e) {
    console.error("[salvarFotosContrib] Falha:", e);
    showToast("⚠️ Erro: " + (e && e.message ? e.message : "desconhecido"), "error");
  }
}
window.salvarFotosContrib = salvarFotosContrib;
function restaurarFotosContribPadrao() {
  localStorage.removeItem("doavida_vol_contrib");
  [1,2,3,4].forEach(function(n) {
    var el = document.getElementById("contrib" + n + "-url");
    if (el) el.value = CONTRIB_PADRAO["c" + n];
    var w = document.getElementById("contrib" + n + "-preview");
    if (w) w.style.display = "none";
  });
  showToast("↩️ Fotos originais restauradas.", "success");
}
window.restaurarFotosContribPadrao = restaurarFotosContribPadrao;

/* ─── Fotos da Página Seja Voluntário + Cards ──────────────────────── */

var VOL_CAPA_PADRAO = "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1600&h=900&fit=crop&auto=format";

var VOL_CARDS_PADRAO = {
  card1: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&h=320&fit=crop&auto=format",
  card2: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&h=320&fit=crop&auto=format",
  card3: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600&h=320&fit=crop&auto=format",
  card4: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=320&fit=crop&auto=format"
};

/* Aplica os valores nos campos do formulário admin */
function _aplicarCamposVolFotosAdmin(capa, contrib) {
  var elCapa = document.getElementById("vol-capa-url");
  if (elCapa) elCapa.value = (capa && capa.capa) ? capa.capa : "";
  [1,2,3,4].forEach(function(n) {
    var el = document.getElementById("vol-card" + n + "-url");
    if (el) el.value = (contrib && contrib["c" + n]) ? contrib["c" + n] : "";
  });
}

/* Preenche os campos com os valores do Supabase (autoritativo) + localStorage (rápido) */
async function renderFotosVoluntario() {
  try {
    /* 1º: localStorage — carregamento imediato enquanto Supabase responde */
    var rawCapa  = localStorage.getItem("doavida_vol_capa");
    var rawContrib = localStorage.getItem("doavida_vol_contrib");
    var capa     = rawCapa  ? JSON.parse(rawCapa)  : { capa: VOL_CAPA_PADRAO };
    var contrib    = rawContrib ? JSON.parse(rawContrib)  : CONTRIB_PADRAO;
    _aplicarCamposVolFotosAdmin(capa, contrib);

    /* 2º: Supabase — autoritativo, sincroniza entre dispositivos */
    if (window.DoaVidaSync && typeof DoaVidaSync.getAllConfigs === 'function') {
      var cfg = await DoaVidaSync.getAllConfigs();
      if (cfg.doavida_vol_capa) {
        try {
          var supaCapa = JSON.parse(cfg.doavida_vol_capa);
          localStorage.setItem("doavida_vol_capa", cfg.doavida_vol_capa);
          capa = supaCapa;
        } catch(e) {}
      }
      if (cfg.doavida_vol_contrib) {
        try {
          var supaContrib = JSON.parse(cfg.doavida_vol_contrib);
          localStorage.setItem("doavida_vol_contrib", cfg.doavida_vol_contrib);
          contrib = supaContrib;
        } catch(e) {}
      }
      _aplicarCamposVolFotosAdmin(capa, contrib);
    }
  } catch(e) {}
}
window.renderFotosVoluntario = renderFotosVoluntario;

/* Pré-visualização */
function previewFotoVol(key) {
  var url = (document.getElementById("vol-" + key + "-url") || {}).value || "";
  var wrap = document.getElementById("vol-" + key + "-preview");
  var img  = document.getElementById("vol-" + key + "-img");
  if (!wrap || !img || !url.trim()) return;
  img.src = url.trim();
  wrap.style.display = "block";
}
window.previewFotoVol = previewFotoVol;

/* Salva capa */
async function salvarFotosVoluntario() {
  var url = ((document.getElementById("vol-capa-url") || {}).value || "").trim();
  if (!url) { showToast("⚠️ Preencha a URL da capa.", "error"); return; }
  var payload = JSON.stringify({ capa: url });
  try {
    if (window.DoaVidaSync && typeof DoaVidaSync.setConfig === 'function') {
      await DoaVidaSync.setConfig('doavida_vol_capa', payload);
    }
    localStorage.setItem("doavida_vol_capa", payload);
    showToast("✅ Capa salva! Abra a página Voluntário para ver.", "success");
  } catch(e) {
    showToast("⚠️ Erro ao salvar no servidor. Tente novamente.", "error");
  }
}
window.salvarFotosVoluntario = salvarFotosVoluntario;

/* Restaura capa */
function restaurarFotosVoluntarioPadrao() {
  localStorage.removeItem("doavida_vol_capa");
  var el = document.getElementById("vol-capa-url");
  if (el) el.value = VOL_CAPA_PADRAO;
  var wrap = document.getElementById("vol-capa-preview");
  if (wrap) wrap.style.display = "none";
  showToast("↩️ Capa restaurada.", "success");
}
window.restaurarFotosVoluntarioPadrao = restaurarFotosVoluntarioPadrao;

/* Salva cards "Formas de Ajudar" */
async function salvarFotosCards() {
  var atual = {};
  try { atual = JSON.parse(localStorage.getItem("doavida_vol_contrib") || "{}"); } catch(e) {}
  var novas = {};
  [1,2,3,4].forEach(function(n) {
    var url = ((document.getElementById("vol-card" + n + "-url") || {}).value || "").trim();
    novas["c" + n] = url || atual["c" + n] || CONTRIB_PADRAO["c" + n];
  });
  var payload = JSON.stringify(novas);
  try {
    if (!window.DoaVidaSync || typeof DoaVidaSync.setConfig !== 'function') {
      throw new Error("DoaVidaSync indisponível");
    }
    await DoaVidaSync.setConfig('doavida_vol_contrib', payload);
    localStorage.setItem("doavida_vol_contrib", payload);
    showToast("✅ Fotos 'Como Contribuir' salvas! Abra a página Voluntário para ver.", "success");
  } catch(e) {
    showToast("⚠️ Erro: " + (e && e.message ? e.message : "desconhecido"), "error");
  }
}
window.salvarFotosCards = salvarFotosCards;

/* Restaura cards */
function restaurarFotosCardsPadrao() {
  localStorage.removeItem("doavida_vol_contrib");
  [1,2,3,4].forEach(function(n) {
    var el = document.getElementById("vol-card" + n + "-url");
    if (el) el.value = CONTRIB_PADRAO["c" + n];
    var wrap = document.getElementById("vol-card" + n + "-preview");
    if (wrap) wrap.style.display = "none";
  });
  showToast("↩️ Fotos originais restauradas.", "success");
}
window.restaurarFotosCardsPadrao = restaurarFotosCardsPadrao;

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 16 — MODAIS, BUSCA, FILTROS E BOTÕES
   ══════════════════════════════════════════════════════════════════════ */

/* Fecha modais ao clicar no fundo (overlay) */
function configurarModais() {
  document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) fecharModal(overlay.id);
    });
  });
}

/* Conecta campos de busca/filtro aos renders */
function configurarBuscaFiltros() {
  var ds = document.getElementById("donations-search");
  var df = document.getElementById("donations-filter");
  var fs = document.getElementById("families-search");
  if (ds)
    ds.addEventListener("input", function () {
      renderDoacoes();
    });
  if (df)
    df.addEventListener("change", function () {
      renderDoacoes();
    });
  if (fs)
    fs.addEventListener("input", function () {
      renderFamilias();
    });
}

/* Mapeia IDs de botões para funções (evita onclick inline no HTML) */
function configurarBotoesModal() {
  var mapa = {
    "btn-add-food": function () {
      abrirModalAlimento(null);
    },
    "btn-add-family": function () {
      abrirModalFamilia(null);
    },
    "btn-add-photo": function () {
      abrirModal("modal-photo");
    },
    "btn-add-tarefa": function () {
      abrirModalNovaTarefa();
    },
    "btn-save-food": salvarAlimento,
    "btn-save-family": salvarFamilia,
    "btn-save-photo": salvarFoto,
    "btn-save-tarefa": salvarTarefa,
    "btn-save-donation-status": salvarStatusDoacao,
    "btn-add-admin-phone": adicionarNumeroAdmin,
    "btn-add-wa-recipient": adicionarDestinatario,
    "btn-wa-send": enviarMensagem,
  };
  Object.keys(mapa).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("click", mapa[id]);
  });
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 17 — UTILITÁRIOS
   ══════════════════════════════════════════════════════════════════════ */

/*
  Atualiza os badges numéricos no menu de abas.
  Chamada sempre que algum dado é alterado.
*/
async function atualizarBadges() {
  var _doacoes = await DoaVidaSync.getDoacoes();
  var _familias = await DoaVidaSync.getFamilias();
  var _voluntarios = await DoaVidaSync.getVoluntarios();
  var _oracoes = await DoaVidaSync.getOracoes();

  setInnerHTML("badge-donations", _doacoes.length);
  setInnerHTML("badge-families", _familias.length);
  setInnerHTML("badge-voluntarios", _voluntarios.length);

  /* Oração: mostra quantos AINDA precisam de oração */
  var precisam = _oracoes.filter(function (o) {
    return o.status === "precisa-oracao";
  }).length;
  setInnerHTML("badge-oracoes", precisam || _oracoes.length);

  /* Tarefas: mostra quantas estão pendentes ou em andamento */
  var tarefas = DoaVidaAPI.getTarefas();
  var tarefasAtiv = tarefas.filter(function (t) {
    return t.status === "pendente" || t.status === "em-andamento";
  }).length;
  setInnerHTML("badge-tarefas", tarefasAtiv || tarefas.length);
  /* badge-cestas é atualizado pelo próprio renderCestas() */
}

/* Badge colorido de status de doação */
function badgeStatus(status) {
  var mapa = {
    pendente: { cls: "badge-pending", emoji: "⏳", label: "Pendente" },
    confirmado: { cls: "badge-confirmed", emoji: "✅", label: "Confirmado" },
    entregue: { cls: "badge-delivered", emoji: "📦", label: "Entregue" },
    cancelado: { cls: "badge-cancelled", emoji: "❌", label: "Cancelado" },
  };
  var cfg = mapa[status] || {
    cls: "badge-pending",
    emoji: "⏳",
    label: status || "Pendente",
  };
  return (
    '<span class="badge ' +
    cfg.cls +
    '">' +
    cfg.emoji +
    " " +
    cfg.label +
    "</span>"
  );
}

/* Formata data ISO para dd/mm/aa HH:mm */
function formatarDataCurta(iso) {
  if (!iso) return "—";
  try {
    var d = new Date(iso);
    return (
      d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }) +
      " " +
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    );
  } catch (e) {
    return "—";
  }
}

/* Atalhos seguros para manipular o DOM */
function setInnerHTML(id, html) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
function getVal(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : "";
}
function setVal(id, v) {
  var el = document.getElementById(id);
  if (el) el.value = v;
}

/* ══════════════════════════════════════════════════════════════════════
   LOG FINAL
   ══════════════════════════════════════════════════════════════════════ */
console.log(
  "[DoaVida] admin.js ✅ v4.0 — 8 bugs corrigidos · Tarefas com WA · Galeria · WA funcionais",
);


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO — SISTEMA DE CESTAS BÁSICAS
   Gerenciamento completo: configuração, cálculo, formação e histórico.
   ══════════════════════════════════════════════════════════════════════ */

/* Cache em memória para evitar re-fetches desnecessários */
var _cestasCache = {
  modelo:    [],   /* itens configurados na cesta */
  alimentos: [],   /* todos os alimentos (com estoque) */
  formadas:  [],   /* histórico de cestas formadas */
  calculo:   null  /* resultado do último cálculo */
};

/* ── Engine de cálculo ──────────────────────────────────────────────── */
/*
  Calcula quantas cestas completas podem ser formadas com o estoque atual.
  Regra: limitado pelo alimento com menor capacidade relativa.
  @param {Array} modelo   - [{alimento_id, quantidade_por_cesta, ...}]
  @param {Array} alimentos - [{id, name, kg, peso, ...}]
  @returns {Object} { total, limitante, detalhes }
*/
function _calcularCestas(modelo, alimentos) {
  if (!modelo || modelo.length === 0) {
    return { total: 0, limitante: null, detalhes: [] };
  }

  var detalhes = modelo.map(function (item) {
    var alimento = alimentos.find(function (a) { return a.id === item.alimento_id; });
    var kgEstoque    = alimento ? (Number(alimento.kg)   || 0) : 0;
    var pesoUnitario = alimento ? (Number(alimento.peso) || 1) : 1;
    var unidadesDisp = Math.floor(kgEstoque / pesoUnitario);
    var qtdPorCesta  = Number(item.quantidade_por_cesta) || 1;
    var cestasPoss   = Math.floor(unidadesDisp / qtdPorCesta);
    var faltaParaProx = unidadesDisp < qtdPorCesta
      ? qtdPorCesta - unidadesDisp
      : qtdPorCesta - (unidadesDisp % qtdPorCesta === 0 ? qtdPorCesta : unidadesDisp % qtdPorCesta);

    return {
      id:              item.id,
      alimento_id:     item.alimento_id,
      nome:            item.alimento_nome,
      emoji:           item.alimento_emoji || '🥫',
      qtdPorCesta:     qtdPorCesta,
      kgEstoque:       kgEstoque,
      pesoUnitario:    pesoUnitario,
      unidadesDisp:    unidadesDisp,
      cestasPossíveis: cestasPoss,
      faltaParaProx:   faltaParaProx > 0 ? faltaParaProx : 0,
      pct:             cestasPoss > 0 ? 100 : 0
    };
  });

  /* Total = mínimo entre todos os itens */
  var total = detalhes.length > 0
    ? Math.min.apply(null, detalhes.map(function (d) { return d.cestasPossíveis; }))
    : 0;

  /* Recalcula pct com base no total máximo possível */
  var maxCestas = detalhes.length > 0
    ? Math.max.apply(null, detalhes.map(function (d) { return d.cestasPossíveis; }))
    : 0;
  detalhes.forEach(function (d) {
    d.pct = maxCestas > 0 ? Math.round((d.cestasPossíveis / maxCestas) * 100) : 0;
  });

  /* Limitante = item com menor cestasPossíveis */
  var limitante = detalhes.reduce(function (min, d) {
    return (!min || d.cestasPossíveis < min.cestasPossíveis) ? d : min;
  }, null);

  /* Se todos estão empatados no mínimo, não há "limitante real" */
  var haLimitanteReal = detalhes.some(function (d) {
    return d.cestasPossíveis > (limitante ? limitante.cestasPossíveis : 0);
  });

  return {
    total:    total,
    limitante: haLimitanteReal ? limitante : null,
    detalhes:  detalhes
  };
}

/* ── Helpers: detecção de tabela ausente ────────────────────────────── */
function _isTabelaMissing(errMsg) {
  var m = (errMsg || '').toLowerCase();
  return m.includes('schema cache') || m.includes('does not exist') ||
         m.includes('relation') || m.includes('not found');
}

function _mostrarBannerSetup(mostrar) {
  var banner   = document.getElementById('cestas-setup-banner');
  var conteudo = document.getElementById('cestas-conteudo-principal');
  if (banner)   banner.style.display   = mostrar ? 'flex' : 'none';
  if (conteudo) conteudo.style.display = mostrar ? 'none' : 'block';
}

async function _testarTabelaCestas(tabela) {
  try {
    var client = window.supabaseClient;
    if (!client) return false;
    var res = await client.from(tabela).select('id').limit(1);
    return !res.error || !_isTabelaMissing(res.error.message);
  } catch (e) { return false; }
}

function copiarSQLCestas() {
  var el = document.getElementById('cestas-setup-sql-code');
  if (!el) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(el.textContent).then(function () {
      showToast('📋 SQL copiado! Cole no Supabase → SQL Editor → Run.', 'success');
    });
  }
}
window.copiarSQLCestas = copiarSQLCestas;

async function verificarTabelasCestas() {
  var btn = document.querySelector('#cestas-setup-banner .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...'; }
  await renderCestas();
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> Já executei — Verificar novamente'; }
}
window.verificarTabelasCestas = verificarTabelasCestas;

/* ── Render principal ───────────────────────────────────────────────── */
async function renderCestas() {
  try {
    /* Verifica se as tabelas existem antes de qualquer operação */
    var tabelasOk = await Promise.all([
      _testarTabelaCestas('modelo_cesta_itens'),
      _testarTabelaCestas('cestas_formadas')
    ]);

    if (!tabelasOk[0] || !tabelasOk[1]) {
      _mostrarBannerSetup(true);
      var badge = document.getElementById('badge-cestas');
      if (badge) badge.textContent = '!';
      return;
    }

    _mostrarBannerSetup(false);

    /* Carrega dados em paralelo */
    var [modelo, alimentos, formadas] = await Promise.all([
      DoaVidaSync.getModeloCestaItens(),
      DoaVidaSync.getAlimentos(),
      DoaVidaSync.getCestasFormadas()
    ]);

    _cestasCache.modelo    = modelo;
    _cestasCache.alimentos = alimentos;
    _cestasCache.formadas  = formadas;
    _cestasCache.calculo   = _calcularCestas(modelo, alimentos);

    _renderCestasResumo();
    _renderCestasConfig();
    _renderCestasEstoque();
    _renderCestasHistorico();

    /* Atualiza badge da aba */
    var badge = document.getElementById('badge-cestas');
    if (badge) badge.textContent = _cestasCache.calculo.total;

  } catch (e) {
    console.error('[DoaVida] Erro ao carregar cestas:', e);
    if (_isTabelaMissing(e.message)) {
      _mostrarBannerSetup(true);
    } else {
      showToast('❌ Erro ao carregar cestas: ' + e.message, 'error');
    }
  }
}
window.renderCestas = renderCestas;

/* ── Resumo: cards de estatísticas ─────────────────────────────────── */
function _renderCestasResumo() {
  var calc    = _cestasCache.calculo;
  var formadas = _cestasCache.formadas;
  if (!calc) return;

  var totalFormadas = formadas.reduce(function (s, f) { return s + (f.quantidade || 0); }, 0);
  var restantes     = Math.max(0, calc.total);

  /* Cards */
  _setText('cestas-stat-possiveis', calc.total);
  _setText('cestas-stat-formadas',  totalFormadas);
  _setText('cestas-stat-restantes', restantes);

  if (calc.limitante) {
    _setText('cestas-stat-limitante', calc.limitante.emoji + ' ' + calc.limitante.nome);
    _setText('cestas-stat-limitante-sub', calc.limitante.unidadesDisp + ' un. disponíveis / ' + calc.limitante.qtdPorCesta + ' por cesta');
    _setText('cestas-stat-falta', calc.limitante.faltaParaProx + ' un.');
  } else if (calc.detalhes.length > 0) {
    _setText('cestas-stat-limitante', '✅ Equilibrado');
    _setText('cestas-stat-limitante-sub', 'todos os itens estão proporcionais');
    _setText('cestas-stat-falta', '—');
  } else {
    _setText('cestas-stat-limitante', '—');
    _setText('cestas-stat-limitante-sub', 'configure a cesta primeiro');
    _setText('cestas-stat-falta', '—');
  }

  /* Cor do card de possíveis */
  var cardPoss = document.getElementById('cesta-card-possiveis');
  if (cardPoss) {
    cardPoss.className = 'cesta-stat-card' + (calc.total === 0 ? ' cesta-card-zero' : calc.total < 5 ? ' cesta-card-warn' : ' cesta-card-ok');
  }

  /* Botão Formar Cestas: desabilita se não há cestas possíveis */
  var btnFormar = document.getElementById('btn-formar-cesta');
  if (btnFormar) {
    btnFormar.disabled = calc.total === 0 || calc.detalhes.length === 0;
  }
}

function _setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val !== undefined && val !== null ? val : '—';
}

/* ── Configuração: lista de itens da cesta ──────────────────────────── */
function _renderCestasConfig() {
  var modelo  = _cestasCache.modelo;
  var calc    = _cestasCache.calculo;
  var lista   = document.getElementById('cestas-config-lista');
  var empty   = document.getElementById('cestas-config-empty');
  if (!lista) return;

  if (!modelo || modelo.length === 0) {
    lista.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  var detalheMap = {};
  (calc && calc.detalhes || []).forEach(function (d) { detalheMap[d.alimento_id] = d; });

  lista.innerHTML = modelo.map(function (item) {
    var d = detalheMap[item.alimento_id] || {};
    var pct = d.pct || 0;
    var barColor = pct >= 80 ? 'var(--status-confirmed)' : pct >= 40 ? 'var(--status-pending)' : 'var(--status-cancelled)';
    return '<div class="cesta-config-item" data-id="' + item.id + '">' +
      '<div class="cesta-config-item-emoji">' + escHtml(item.alimento_emoji || '🥫') + '</div>' +
      '<div class="cesta-config-item-info">' +
        '<div class="cesta-config-item-nome">' + escHtml(item.alimento_nome) + '</div>' +
        '<div class="cesta-config-item-qtd">' + item.quantidade_por_cesta + ' unidade(s) por cesta</div>' +
        '<div class="cesta-config-item-pbar">' +
          '<div class="cesta-config-item-pbar-fill" style="width:' + pct + '%;background:' + barColor + '"></div>' +
        '</div>' +
        '<div class="cesta-config-item-pct">' + (d.cestasPossíveis !== undefined ? d.cestasPossíveis + ' cestas possíveis' : '—') + '</div>' +
      '</div>' +
      '<div class="cesta-config-item-actions">' +
        '<button type="button" class="btn-icon danger" onclick="removerCestaItem(\'' + item.id + '\')" title="Remover"><i class="fas fa-trash-alt"></i></button>' +
      '</div>' +
    '</div>';
  }).join('');
}

/* ── Estoque por item (coluna direita) ──────────────────────────────── */
function _renderCestasEstoque() {
  var calc  = _cestasCache.calculo;
  var lista = document.getElementById('cestas-estoque-lista');
  if (!lista) return;

  if (!calc || calc.detalhes.length === 0) {
    lista.innerHTML = '<div class="cesta-estoque-empty"><i class="fas fa-info-circle"></i> Configure os itens da cesta para ver o estoque.</div>';
    return;
  }

  /* Ordena: limitante primeiro */
  var sorted = calc.detalhes.slice().sort(function (a, b) { return a.cestasPossíveis - b.cestasPossíveis; });

  lista.innerHTML = sorted.map(function (d) {
    var isLim = calc.limitante && d.alimento_id === calc.limitante.alimento_id;
    var pct   = d.pct;
    var barColor = pct >= 80 ? '#4caf50' : pct >= 40 ? '#ffc107' : '#e57373';
    return '<div class="cesta-estoque-item' + (isLim ? ' cesta-estoque-limitante' : '') + '">' +
      '<div class="cesta-estoque-header">' +
        '<span class="cesta-estoque-nome">' + d.emoji + ' ' + escHtml(d.nome) + (isLim ? ' <span class="cesta-badge-limitante">⚠️ Limitante</span>' : '') + '</span>' +
        '<span class="cesta-estoque-cestas">' + d.cestasPossíveis + ' cestas</span>' +
      '</div>' +
      '<div class="cesta-estoque-stats">' +
        '<span class="cesta-estoque-stat"><label>Em estoque</label><strong>' + d.unidadesDisp + ' un.</strong></span>' +
        '<span class="cesta-estoque-stat"><label>Por cesta</label><strong>' + d.qtdPorCesta + ' un.</strong></span>' +
        '<span class="cesta-estoque-stat"><label>Peso unit.</label><strong>' + d.pesoUnitario + ' kg</strong></span>' +
        '<span class="cesta-estoque-stat"><label>Estoque (kg)</label><strong>' + d.kgEstoque.toFixed(1) + ' kg</strong></span>' +
      '</div>' +
      '<div class="cesta-estoque-pbar-wrap">' +
        '<div class="cesta-estoque-pbar-fill" style="width:' + pct + '%;background:' + barColor + '"></div>' +
      '</div>' +
      (d.faltaParaProx > 0 ? '<div class="cesta-estoque-falta">Faltam <strong>' + d.faltaParaProx + ' unidade(s)</strong> para mais 1 cesta</div>' : '') +
    '</div>';
  }).join('');
}

/* ── Histórico ──────────────────────────────────────────────────────── */
function _renderCestasHistorico() {
  var formadas = _cestasCache.formadas;
  var tbody    = document.getElementById('cestas-historico-tbody');
  var mobile   = document.getElementById('cestas-historico-mobile');
  var empty    = document.getElementById('cestas-historico-empty');
  var countEl  = document.getElementById('cestas-historico-count');

  if (countEl) countEl.textContent = formadas.length + ' registro(s)';

  if (!formadas || formadas.length === 0) {
    if (tbody)  tbody.innerHTML = '';
    if (mobile) mobile.innerHTML = '';
    if (empty)  empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  /* Desktop */
  if (tbody) {
    tbody.innerHTML = formadas.map(function (f) {
      var dt     = new Date(f.created_at);
      var data   = dt.toLocaleDateString('pt-BR');
      var hora   = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      var itens  = (f.itens_snapshot || []).map(function (i) { return (i.emoji||'🥫') + ' ' + i.nome + ' x' + i.qtd; }).join(', ');
      return '<tr>' +
        '<td><span class="cestas-hist-data">' + data + '</span><span class="cestas-hist-hora">' + hora + '</span></td>' +
        '<td><span class="cestas-hist-qtd">' + f.quantidade + '</span></td>' +
        '<td>' + (f.total_kg ? f.total_kg.toFixed(1) + ' kg' : '—') + '</td>' +
        '<td class="cestas-hist-itens" title="' + escHtml(itens) + '">' + escHtml(itens || '—') + '</td>' +
        '<td>' + escHtml(f.observacao || '—') + '</td>' +
        '<td><button type="button" class="btn-icon danger" onclick="excluirCestaFormada(\'' + f.id + '\')" title="Excluir"><i class="fas fa-trash-alt"></i></button></td>' +
      '</tr>';
    }).join('');
  }

  /* Mobile */
  if (mobile) {
    mobile.innerHTML = formadas.map(function (f) {
      var dt   = new Date(f.created_at);
      var data = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return '<div class="cesta-hist-card">' +
        '<div class="cesta-hist-card-header">' +
          '<span class="cesta-hist-card-qtd"><i class="fas fa-layer-group"></i> ' + f.quantidade + ' cesta(s)</span>' +
          '<span class="cesta-hist-card-data">' + data + '</span>' +
        '</div>' +
        (f.observacao ? '<div class="cesta-hist-card-obs">' + escHtml(f.observacao) + '</div>' : '') +
        '<div class="cesta-hist-card-kg">' + (f.total_kg ? f.total_kg.toFixed(1) + ' kg no total' : '') + '</div>' +
        '<button type="button" class="btn btn-outline btn-sm" style="margin-top:8px;color:#e57373;border-color:rgba(229,90,90,0.3)" onclick="excluirCestaFormada(\'' + f.id + '\')">' +
          '<i class="fas fa-trash-alt"></i> Excluir' +
        '</button>' +
      '</div>';
    }).join('');
  }
}

async function removerCestaItem(id) {
  if (!confirm('Remover este item da configuração da cesta?\n\nO alimento continuará disponível na página de doação.')) return;
  try {
    /* Remove APENAS de modelo_cesta_itens — não afeta a tabela alimentos */
    await DoaVidaSync.deleteModeloCestaItem(id);
    showToast('✅ Item removido da cesta. O alimento continua na página de doação.', 'success');
    await renderCestas();
  } catch (e) {
    showToast('❌ Erro: ' + e.message, 'error');
  }
}
window.removerCestaItem = removerCestaItem;

/* ── Modal: Formar Cestas ───────────────────────────────────────────── */
function abrirModalFormarCesta() {
  var calc = _cestasCache.calculo;
  if (!calc || calc.total === 0) {
    showToast('⚠️ Não há cestas possíveis com o estoque atual.', 'warning');
    return;
  }

  /* Info do modal */
  var info = document.getElementById('cesta-formar-info');
  if (info) {
    info.innerHTML =
      '<div class="cesta-formar-stat"><i class="fas fa-boxes" style="color:var(--gold)"></i> ' +
      'Cestas possíveis com estoque atual: <strong>' + calc.total + '</strong></div>' +
      (calc.limitante ? '<div class="cesta-formar-stat cesta-formar-warn"><i class="fas fa-exclamation-triangle"></i> ' +
      'Limitado por: <strong>' + calc.limitante.emoji + ' ' + calc.limitante.nome + '</strong> (' + calc.limitante.unidadesDisp + ' un. / ' + calc.limitante.qtdPorCesta + ' por cesta)</div>' : '');
  }

  /* Reset campos */
  var qtdEl = document.getElementById('cesta-formar-qtd');
  var obsEl = document.getElementById('cesta-formar-obs');
  if (qtdEl) { qtdEl.value = 1; qtdEl.max = calc.total; }
  if (obsEl)  obsEl.value = '';

  var prevEl  = document.getElementById('cesta-formar-preview');
  var alerta  = document.getElementById('cesta-formar-alerta');
  if (prevEl) prevEl.style.display = 'none';
  if (alerta) alerta.style.display = 'none';

  atualizarPreviewFormar();
  abrirModal('modal-formar-cesta');
}
window.abrirModalFormarCesta = abrirModalFormarCesta;

function atualizarPreviewFormar() {
  var calc  = _cestasCache.calculo;
  var qtdEl = document.getElementById('cesta-formar-qtd');
  var prev  = document.getElementById('cesta-formar-preview');
  var alert = document.getElementById('cesta-formar-alerta');
  var alertTx = document.getElementById('cesta-formar-alerta-texto');
  var btn   = document.getElementById('btn-confirmar-formar');
  if (!calc || !qtdEl) return;

  var qtd = parseInt(qtdEl.value) || 0;

  /* Alerta se excede possível */
  if (qtd > calc.total) {
    if (alert)   alert.style.display   = 'block';
    if (alertTx) alertTx.textContent   = 'Quantidade solicitada (' + qtd + ') excede o máximo possível (' + calc.total + ') com o estoque atual.';
    if (btn)     btn.disabled = true;
    if (prev)    prev.style.display = 'none';
    return;
  }
  if (alert) alert.style.display = 'none';
  if (btn)   btn.disabled = (qtd <= 0);

  if (!prev || qtd <= 0) return;

  /* Preview: mostra consumo de estoque */
  var linhas = calc.detalhes.map(function (d) {
    var consumo = qtd * d.qtdPorCesta;
    var restante = d.unidadesDisp - consumo;
    return '<div class="cesta-forming-row">' +
      '<span>' + d.emoji + ' ' + escHtml(d.nome) + '</span>' +
      '<span>−' + consumo + ' un. → restam <strong>' + restante + '</strong></span>' +
    '</div>';
  }).join('');

  var totalKgCesta = calc.detalhes.reduce(function (s, d) {
    return s + (d.qtdPorCesta * d.pesoUnitario);
  }, 0);

  prev.innerHTML =
    '<div class="cesta-forming-title"><i class="fas fa-layer-group" style="color:var(--gold)"></i> Consumo de estoque para <strong>' + qtd + '</strong> cesta(s):</div>' +
    linhas +
    '<div class="cesta-forming-total">Total: ' + (qtd * totalKgCesta).toFixed(1) + ' kg retirados do estoque</div>';
  prev.style.display = 'block';
}
window.atualizarPreviewFormar = atualizarPreviewFormar;

async function confirmarFormarCesta() {
  var calc  = _cestasCache.calculo;
  var qtdEl = document.getElementById('cesta-formar-qtd');
  var obsEl = document.getElementById('cesta-formar-obs');
  var btn   = document.getElementById('btn-confirmar-formar');
  if (!calc || !qtdEl) return;

  var qtd = parseInt(qtdEl.value) || 0;
  if (qtd <= 0 || qtd > calc.total) {
    showToast('⚠️ Quantidade inválida.', 'warning'); return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Formando...'; }

  try {
    /* Monta snapshot dos itens consumidos */
    var snapshot = calc.detalhes.map(function (d) {
      return {
        alimento_id: d.alimento_id,
        nome:        d.nome,
        emoji:       d.emoji,
        qtd:         qtd * d.qtdPorCesta,
        pesoUnit:    d.pesoUnitario,
        totalKg:     qtd * d.qtdPorCesta * d.pesoUnitario
      };
    });

    var totalKg = snapshot.reduce(function (s, i) { return s + i.totalKg; }, 0);

    /* Salva o registro */
    await DoaVidaSync.addCestaFormada({
      quantidade:     qtd,
      observacao:     obsEl ? obsEl.value.trim() : '',
      itens_snapshot: snapshot,
      total_kg:       totalKg,
      formado_por:    'admin'
    });

    /* Desconta o estoque de cada alimento —
       busca o kg ATUAL direto do Supabase para evitar usar cache desatualizado */
    await Promise.all(calc.detalhes.map(async function (d) {
      var kgConsumo = qtd * d.qtdPorCesta * d.pesoUnitario;
      /* Busca o valor atual do banco antes de subtrair */
      var alimentoAtual = await DoaVidaSync.getAlimentoById(d.alimento_id);
      var kgAtual  = alimentoAtual ? Number(alimentoAtual.kg || 0) : 0;
      var novoKg   = Math.max(0, kgAtual - kgConsumo);
      await DoaVidaSync.updateAlimento(d.alimento_id, { kg: novoKg });
    }));

    fecharModal('modal-formar-cesta');
    showToast('🎉 ' + qtd + ' cesta(s) formada(s) com sucesso!', 'success');
    await renderCestas();
    /* Atualiza aba de alimentos se estiver visível */
    renderAlimentos();

  } catch (e) {
    showToast('❌ Erro ao formar cesta: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-layer-group"></i> Confirmar Formação'; }
  }
}
window.confirmarFormarCesta = confirmarFormarCesta;

async function excluirCestaFormada(id) {
  if (!confirm('Excluir este registro do histórico? O estoque NÃO será restaurado.')) return;
  try {
    await DoaVidaSync.deleteCestaFormada(id);
    showToast('✅ Registro excluído.', 'success');
    await renderCestas();
  } catch (e) {
    showToast('❌ Erro: ' + e.message, 'error');
  }
}
window.excluirCestaFormada = excluirCestaFormada;

/* ══════════════════════════════════════════════════════════════════════
   NOVOS GRÁFICOS E PAINÉIS DO DASHBOARD
   ══════════════════════════════════════════════════════════════════════ */

/* Instâncias dos gráficos (para destruir antes de recriar) */
var _charts = {};

function _destroyChart(id) {
  if (_charts[id]) { try { _charts[id].destroy(); } catch(e) {} _charts[id] = null; }
}

/* Opções base do Chart.js para tema escuro */
function _chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#888876', font: { size: 11 } } },
      tooltip: {
        backgroundColor: '#1c1c17',
        titleColor: '#e8e0c8',
        bodyColor: '#888876',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: '#888876', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.05)' }
      },
      y: {
        ticks: { color: '#888876', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.05)' }
      }
    }
  };
}

/* ── Visão Geral: lista "Time Spent" de doações ── */
function renderOvDoacoesList() {
  var list = document.getElementById('ov-donations-list');
  var badge = document.getElementById('ov-donations-count');
  if (!list) return;
  try {
    var doacoes = DoaVidaAPI.getDoacoes ? DoaVidaAPI.getDoacoes() : [];
    var ultimas = doacoes.slice(0, 6);
    if (badge) badge.textContent = doacoes.length;
    if (ultimas.length === 0) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2);font-size:.82rem">Nenhuma doação registrada</div>';
      return;
    }
    var maxKg = Math.max.apply(null, ultimas.map(function(d) { return parseFloat(d.kg || d.quantidade || d.amount || 1); }));
    var statusColors = { pendente:'#f9a825', confirmado:'#81c784', entregue:'#4db6ac', cancelado:'#e57373', coleta:'#64b5f6' };
    list.innerHTML = ultimas.map(function(d) {
      var kg = parseFloat(d.kg || d.quantidade || d.amount || 0);
      var pct = maxKg > 0 ? Math.round((kg / maxKg) * 100) : 0;
      var nome = d.nome || d.doador || d.name || 'Anônimo';
      var inicial = nome.charAt(0).toUpperCase();
      var status = (d.status || 'pendente').toLowerCase();
      var cor = statusColors[status] || '#888876';
      var gradients = ['linear-gradient(135deg,#e8c96a,#b5973e)','linear-gradient(135deg,#e040fb,#ec407a)','linear-gradient(135deg,#64b5f6,#1565c0)','linear-gradient(135deg,#81c784,#2e7d32)','linear-gradient(135deg,#ce93d8,#7b1fa2)','linear-gradient(135deg,#f48fb1,#c62828)'];
      var gi = nome.charCodeAt(0) % gradients.length;
      var alimento = d.alimento || d.food || '';
      return '<div class="ov-list-item">' +
        '<div class="ov-list-avatar" style="background:' + gradients[gi] + '">' + inicial + '</div>' +
        '<div><div class="ov-list-name">' + escHtml(nome) + '</div>' +
        '<div class="ov-list-sub">' + escHtml(alimento) + '</div>' +
        '<div class="ov-list-bar"><div class="ov-list-bar-fill" style="width:' + pct + '%"></div></div></div>' +
        '<div class="ov-list-val">' + kg + '<small style="font-size:.65rem;color:var(--text2)">kg</small></div>' +
        '<div class="ov-list-status"><span style="font-size:.68rem;padding:2px 7px;border-radius:10px;background:' + cor + '22;color:' + cor + ';font-weight:700">' + status + '</span></div>' +
        '</div>';
    }).join('');
  } catch(e) { list.innerHTML = ''; }
}
window.renderOvDoacoesList = renderOvDoacoesList;

/* ── Visão Geral: mini listas voluntários / oração / famílias ── */
function renderOvMiniLists() {
  /* Voluntários */
  try {
    var vols = (typeof getVoluntarios === 'function' ? getVoluntarios() : []).slice(0, 4);
    var volList = document.getElementById('ov-vol-list');
    if (volList) {
      if (vols.length === 0) { volList.innerHTML = '<div style="padding:12px;color:var(--text2);font-size:.78rem;text-align:center">Nenhum voluntário</div>'; }
      else {
        var statusC = { novo:'#e8c96a', 'em-contato':'#64b5f6', confirmado:'#81c784', participando:'#ce93d8', finalizado:'#90a4ae' };
        volList.innerHTML = vols.map(function(v) {
          var ini = (v.nome || 'V').charAt(0).toUpperCase();
          var st = (v.status || 'novo');
          var cor = statusC[st] || '#888';
          return '<div class="ov-list-item"><div class="ov-list-avatar" style="background:' + cor + '33;color:' + cor + '">' + ini + '</div>' +
            '<div><div class="ov-list-name">' + escHtml(v.nome || '') + '</div><div class="ov-list-sub">' + escHtml(v.tipo || '') + '</div></div>' +
            '<div style="font-size:.68rem;padding:2px 6px;border-radius:8px;background:' + cor + '22;color:' + cor + ';font-weight:700;white-space:nowrap">' + st + '</div></div>';
        }).join('');
      }
    }
  } catch(e) {}

  /* Oração */
  try {
    var oracoes = DoaVidaAPI.getOracoes ? DoaVidaAPI.getOracoes() : [];
    var prayList = document.getElementById('ov-prayer-list');
    if (prayList) {
      if (oracoes.length === 0) { prayList.innerHTML = '<div style="padding:12px;color:var(--text2);font-size:.78rem;text-align:center">Nenhum pedido</div>'; }
      else {
        prayList.innerHTML = oracoes.slice(0,4).map(function(p) {
          var ini = (p.nome || 'A').charAt(0).toUpperCase();
          var cor = p.status === 'orando' ? '#81c784' : '#f9a825';
          var st = p.status === 'orando' ? '✅ Orando' : '🙏 Precisa';
          return '<div class="ov-list-item"><div class="ov-list-avatar" style="background:' + cor + '22;color:' + cor + '">' + ini + '</div>' +
            '<div><div class="ov-list-name">' + escHtml(p.nome || 'Anônimo') + '</div><div class="ov-list-sub">' + escHtml(p.categoria || '') + '</div></div>' +
            '<div style="font-size:.68rem;color:' + cor + ';font-weight:700;white-space:nowrap">' + st + '</div></div>';
        }).join('');
      }
    }
  } catch(e) {}

  /* Famílias */
  try {
    var familias = DoaVidaAPI.getFamilias ? DoaVidaAPI.getFamilias() : [];
    var famList = document.getElementById('ov-family-list');
    if (famList) {
      if (familias.length === 0) { famList.innerHTML = '<div style="padding:12px;color:var(--text2);font-size:.78rem;text-align:center">Nenhuma família</div>'; }
      else {
        famList.innerHTML = familias.slice(0,4).map(function(f) {
          var ini = (f.nome || 'F').charAt(0).toUpperCase();
          var recebeu = f.status === 'entregue';
          var cor = recebeu ? '#81c784' : '#f9a825';
          return '<div class="ov-list-item"><div class="ov-list-avatar" style="background:' + cor + '22;color:' + cor + '">' + ini + '</div>' +
            '<div><div class="ov-list-name">' + escHtml(f.name || f.nome || '') + '</div><div class="ov-list-sub">' + (f.pessoas || 0) + ' pessoas</div></div>' +
            '<div style="font-size:.68rem;color:' + cor + ';font-weight:700">' + (recebeu ? '✅' : '⏳') + '</div></div>';
        }).join('');
      }
    }
  } catch(e) {}
}
window.renderOvMiniLists = renderOvMiniLists;

/* ── Gráfico de área: Progresso por Alimento ── */
function renderFoodsAreaChart() {
  _destroyChart('foods');
  /* Também destrói instância criada por renderGraficoBarras no mesmo canvas */
  if (AdminState && AdminState.chartInstance) { AdminState.chartInstance.destroy(); AdminState.chartInstance = null; }
  var canvas = document.getElementById('foods-chart');
  if (!canvas) return;
  try {
    /* Usa cache Supabase se disponível, senão cai no localStorage */
    var alimentos = (_alimentosAdminCache && _alimentosAdminCache.length > 0)
      ? _alimentosAdminCache
      : (DoaVidaAPI.getAlimentos ? DoaVidaAPI.getAlimentos() : []);
    var labels = alimentos.map(function(a) { return a.nome || a.name || ''; });
    var dados = alimentos.map(function(a) { return parseFloat(a.kg || a.estoque || 0); });
    var metas = alimentos.map(function(a) { return parseFloat(a.goal || a.meta || a.objetivo || 0); });
    if (labels.length === 0) { labels = ['Arroz','Feijão','Óleo','Macarrão','Farinha']; dados = [0,0,0,0,0]; metas = [50,30,20,40,25]; }
    var opts = _chartDefaults();
    opts.scales.y.beginAtZero = true;
    _charts['foods'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Estoque (kg)',
            data: dados,
            backgroundColor: 'rgba(232,201,106,0.7)',
            borderColor: '#e8c96a',
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'Meta (kg)',
            data: metas,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderColor: 'rgba(255,255,255,0.2)',
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false,
            type: 'bar'
          }
        ]
      },
      options: opts
    });
  } catch(e) {}
}
window.renderFoodsAreaChart = renderFoodsAreaChart;

/* ── Gráfico premium — Doações por status ── */
function renderDonationsStatusChart(doacoesData) {
  if (!doacoesData) {
    DoaVidaSync.getDoacoes().then(function(data) { renderDonationsStatusChart(data); }).catch(function() {});
    return;
  }
  _destroyChart('donStatus');
  var canvas = document.getElementById('donations-status-chart');
  if (!canvas) return;
  try {
    var counts = { pendente:0, confirmado:0, entregue:0, coleta:0, cancelado:0 };
    doacoesData.forEach(function(d) {
      var s = (d.status || 'pendente').toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
    });
    /* Atualiza KPI cards */
    Object.keys(counts).forEach(function(s) {
      var el = document.getElementById('don-' + s);
      if (el) el.textContent = counts[s];
    });
    var total = doacoesData.length;

    /* Estado vazio */
    var wrap = canvas.parentNode;
    var emEl = wrap ? wrap.querySelector('.prem-chart-empty') : null;
    if (total === 0) {
      canvas.style.display = 'none';
      if (wrap && !emEl) {
        var em = document.createElement('div');
        em.className = 'prem-chart-empty';
        em.innerHTML = '<i class="fas fa-hand-holding-heart"></i><span>Nenhuma doação registrada ainda.</span>';
        wrap.appendChild(em);
      }
      return;
    }
    canvas.style.display = '';
    if (emEl) emEl.remove();

    var BORDA = ['#f9a825','#81c784','#4db6ac','#64b5f6','#e57373'];
    var FUNDO = ['rgba(249,168,37,.15)','rgba(129,199,132,.15)','rgba(77,182,172,.15)','rgba(100,181,246,.15)','rgba(229,115,115,.15)'];
    var HOVER = ['rgba(249,168,37,.82)','rgba(129,199,132,.82)','rgba(77,182,172,.82)','rgba(100,181,246,.82)','rgba(229,115,115,.82)'];
    var dados = [counts.pendente, counts.confirmado, counts.entregue, counts.coleta, counts.cancelado];
    var opts = _chartDefaults();
    opts.scales.y.beginAtZero = true;
    opts.scales.y.ticks.stepSize = 1;
    opts.scales.y.grid.color = 'rgba(255,255,255,.04)';
    opts.scales.x.grid.display = false;
    opts.plugins.legend = { display: false };
    opts.plugins.tooltip = {
      backgroundColor: 'rgba(18,18,14,.96)',
      titleColor: '#e8e0c8',
      bodyColor: '#a0998a',
      borderColor: 'rgba(255,255,255,.1)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 10,
      callbacks: {
        label: function(ctx) {
          var pct = total > 0 ? Math.round(ctx.parsed.y / total * 100) : 0;
          return '  ' + ctx.parsed.y + ' doação(ões)  ·  ' + pct + '%';
        }
      }
    };
    opts.animation = { duration: 600, easing: 'easeOutQuart' };
    _charts['donStatus'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Pendente','Confirmado','Entregue','Coleta','Cancelado'],
        datasets: [{
          data: dados,
          backgroundColor: FUNDO,
          borderColor: BORDA,
          hoverBackgroundColor: HOVER,
          borderWidth: 2,
          borderRadius: 10,
          borderSkipped: false
        }]
      },
      options: opts
    });
  } catch(e) {}
}
window.renderDonationsStatusChart = renderDonationsStatusChart;

/* ── Gráfico de famílias (rosca) + mapa de Belém ── */
function renderFamiliesChartAndMap() {
  /* Atualiza stats */
  try {
    var familias = DoaVidaAPI.getFamilias ? DoaVidaAPI.getFamilias() : [];
    var total = familias.length;
    var receberam = familias.filter(function(f) { return f.status === 'entregue'; }).length;
    var aguardando = total - receberam;
    var pessoas = familias.reduce(function(s, f) { return s + parseInt(f.pessoas || 1); }, 0);
    var elT = document.getElementById('fam-total'); if (elT) elT.textContent = total;
    var elR = document.getElementById('fam-receberam'); if (elR) elR.textContent = receberam;
    var elA = document.getElementById('fam-aguardando'); if (elA) elA.textContent = aguardando;
    var elP = document.getElementById('fam-pessoas'); if (elP) elP.textContent = pessoas;

    /* Rosca de famílias */
    _destroyChart('families');
    var canvas = document.getElementById('families-chart');
    if (canvas) {
      _charts['families'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: ['Receberam','Aguardando'],
          datasets: [{ data: [receberam || 0, aguardando || 0], backgroundColor: ['rgba(129,199,132,.8)','rgba(249,168,37,.8)'], borderWidth: 0, borderRadius: 4 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '70%',
          plugins: { legend: { position: 'bottom', labels: { color: '#888876', font: { size: 10 }, boxWidth: 10 } } }
        }
      });
    }
  } catch(e) {}

  /* Mapa Leaflet de Belém — usa a função centralizada */
  try {
    var mapEl = document.getElementById('belem-map');
    if (!mapEl || !window.L) return;

    if (mapEl._leaflet_id) {
      /* Mapa já existe — só atualiza os marcadores */
      if (window._belemMapInstance) {
        window._belemMapInstance.eachLayer(function(layer) {
          if (layer instanceof L.Marker) window._belemMapInstance.removeLayer(layer);
        });
        var fams2 = DoaVidaAPI.getFamilias ? DoaVidaAPI.getFamilias() : [];
        _adicionarMarcadoresMapa(window._belemMapInstance, fams2);
        setTimeout(function() { window._belemMapInstance.invalidateSize(); }, 200);
      }
      return;
    }

    var map = L.map('belem-map', {
      zoomControl: false, scrollWheelZoom: false, attributionControl: true
    }).setView([-1.4558, -48.4902], 12);
    window._belemMapInstance = map;

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; Carto',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(map);

    var fams3 = DoaVidaAPI.getFamilias ? DoaVidaAPI.getFamilias() : [];
    _adicionarMarcadoresMapa(map, fams3);
    setTimeout(function() { map.invalidateSize(); }, 300);
  } catch(e) {}
}
window.renderFamiliesChartAndMap = renderFamiliesChartAndMap;

/* ── Gráfico premium — Pipeline de Voluntários ── */
function renderVolunteersChart(volsData) {
  if (!volsData) {
    DoaVidaSync.getVoluntarios().then(function(data) { renderVolunteersChart(data); }).catch(function() {});
    return;
  }
  _destroyChart('volunteers');
  var canvas = document.getElementById('volunteers-chart');
  if (!canvas) return;
  try {
    var counts = { novo:0, 'em-contato':0, confirmado:0, participando:0, finalizado:0 };
    volsData.forEach(function(v) {
      var s = v.status || 'novo';
      if (counts[s] !== undefined) counts[s]++;
    });
    /* Atualiza KPI cards */
    var idMap = { novo:'vol-novo', 'em-contato':'vol-em-contato', confirmado:'vol-confirmado', participando:'vol-participando', finalizado:'vol-finalizado' };
    Object.keys(idMap).forEach(function(s) { var el = document.getElementById(idMap[s]); if (el) el.textContent = counts[s]; });

    var total = volsData.length;
    var wrap = canvas.parentNode;
    var emEl = wrap ? wrap.querySelector('.prem-chart-empty') : null;
    if (total === 0) {
      canvas.style.display = 'none';
      if (wrap && !emEl) {
        var em = document.createElement('div');
        em.className = 'prem-chart-empty';
        em.innerHTML = '<i class="fas fa-users"></i><span>Nenhum voluntário cadastrado ainda.</span>';
        wrap.appendChild(em);
      }
      return;
    }
    canvas.style.display = '';
    if (emEl) emEl.remove();

    var BORDA = ['#e8c96a','#64b5f6','#81c784','#ce93d8','#90a4ae'];
    var FUNDO = ['rgba(232,201,106,.14)','rgba(100,181,246,.14)','rgba(129,199,132,.14)','rgba(206,147,216,.14)','rgba(144,164,174,.14)'];
    var HOVER = ['rgba(232,201,106,.80)','rgba(100,181,246,.80)','rgba(129,199,132,.80)','rgba(206,147,216,.80)','rgba(144,164,174,.80)'];
    var dados = [counts.novo, counts['em-contato'], counts.confirmado, counts.participando, counts.finalizado];
    var opts = _chartDefaults();
    opts.indexAxis = 'y';
    opts.scales.x.beginAtZero = true;
    opts.scales.x.ticks.stepSize = 1;
    opts.scales.x.grid.color = 'rgba(255,255,255,.04)';
    opts.scales.y.grid.display = false;
    opts.scales.y.ticks.color = '#c4b99a';
    opts.scales.y.ticks.font = { size: 12 };
    opts.plugins.legend = { display: false };
    opts.plugins.tooltip = {
      backgroundColor: 'rgba(18,18,14,.96)',
      titleColor: '#e8e0c8',
      bodyColor: '#a0998a',
      borderColor: 'rgba(255,255,255,.1)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 10,
      callbacks: {
        label: function(ctx) {
          var pct = total > 0 ? Math.round(ctx.parsed.x / total * 100) : 0;
          return '  ' + ctx.parsed.x + ' voluntário(s)  ·  ' + pct + '%';
        }
      }
    };
    opts.animation = { duration: 600, easing: 'easeOutQuart' };
    _charts['volunteers'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Novo','Em Contato','Confirmado','Participando','Finalizado'],
        datasets: [{
          data: dados,
          backgroundColor: FUNDO,
          borderColor: BORDA,
          hoverBackgroundColor: HOVER,
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: opts
    });
  } catch(e) {}
}
window.renderVolunteersChart = renderVolunteersChart;

/* ── Gráfico premium — Voluntários por tipo de contribuição ── */
function renderVolTipoChart(volsData) {
  if (!volsData) {
    DoaVidaSync.getVoluntarios().then(function(data) { renderVolTipoChart(data); }).catch(function() {});
    return;
  }
  _destroyChart('volTipo');
  var canvas = document.getElementById('vol-tipo-chart');
  if (!canvas) return;
  try {
    var tipos = {
      doacao:             { label: 'Doação',           cor: '#e8c96a', count: 0 },
      voluntario:         { label: 'Trab. Voluntário', cor: '#81c784', count: 0 },
      'apoio-espiritual': { label: 'Apoio Espiritual', cor: '#ce93d8', count: 0 },
      logistica:          { label: 'Logística',        cor: '#64b5f6', count: 0 },
      outros:             { label: 'Outros',           cor: '#f48fb1', count: 0 }
    };
    volsData.forEach(function(v) {
      var t = (v.tipo || 'outros').toLowerCase();
      if (tipos[t]) tipos[t].count++;
      else tipos['outros'].count++;
    });
    var tiposArr = Object.values(tipos);
    var total = volsData.length;

    var wrap = canvas.parentNode;
    var emEl = wrap ? wrap.querySelector('.prem-chart-empty') : null;
    if (total === 0) {
      canvas.style.display = 'none';
      if (wrap && !emEl) {
        var em = document.createElement('div');
        em.className = 'prem-chart-empty';
        em.innerHTML = '<i class="fas fa-chart-pie"></i><span>Sem dados para exibir.</span>';
        wrap.appendChild(em);
      }
      return;
    }
    canvas.style.display = '';
    if (emEl) emEl.remove();

    var colors = tiposArr.map(function(t) { return t.cor; });
    var bgColors = tiposArr.map(function(t) { return t.cor + 'bb'; });
    _charts['volTipo'] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: tiposArr.map(function(t) { return t.label; }),
        datasets: [{
          data: tiposArr.map(function(t) { return t.count; }),
          backgroundColor: bgColors,
          borderColor: colors,
          borderWidth: 2,
          hoverOffset: 8,
          hoverBorderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(18,18,14,.96)',
            titleColor: '#e8e0c8',
            bodyColor: '#a0998a',
            borderColor: 'rgba(255,255,255,.1)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: function(ctx) {
                var pct = total > 0 ? Math.round(ctx.parsed / total * 100) : 0;
                return '  ' + ctx.parsed + ' voluntário(s)  ·  ' + pct + '%';
              }
            }
          }
        }
      }
    });

    /* Breakdown premium à direita */
    var breakdown = document.getElementById('vol-tipo-breakdown');
    if (breakdown) {
      breakdown.innerHTML = tiposArr.map(function(t) {
        var pct = total > 0 ? Math.round(t.count / total * 100) : 0;
        return '<div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)">' +
          '<div style="width:8px;height:8px;border-radius:50%;background:' + t.cor + ';flex-shrink:0;box-shadow:0 0 6px ' + t.cor + '88"></div>' +
          '<span style="flex:1;font-size:.8rem;color:var(--cream);font-family:var(--ff-body)">' + t.label + '</span>' +
          '<span style="font-size:.95rem;font-weight:800;color:' + t.cor + ';font-family:var(--ff-display)">' + t.count + '</span>' +
          '<span style="font-size:.68rem;color:var(--text2);min-width:30px;text-align:right;font-family:var(--ff-mono)">' + pct + '%</span>' +
          '</div>';
      }).join('');
    }
  } catch(e) {}
}
window.renderVolTipoChart = renderVolTipoChart;

/* ── Gráficos premium — Pedidos de Oração ── */
function renderPrayersCharts(oracoesData) {
  if (!oracoesData) {
    DoaVidaSync.getOracoes().then(function(data) { renderPrayersCharts(data); }).catch(function() {});
    return;
  }
  try {
    var oracoes = oracoesData;
    var total   = oracoes.length;
    var precisam = oracoes.filter(function(o) { return o.status !== 'orando'; }).length;
    var orando   = total - precisam;

    /* Atualiza KPI cards */
    var elT  = document.getElementById('prayer-total');    if (elT)  elT.textContent  = total;
    var elPr = document.getElementById('prayer-precisam'); if (elPr) elPr.textContent = precisam;
    var elOr = document.getElementById('prayer-orando');   if (elOr) elOr.textContent = orando;

    /* ── Donut: por status ── */
    _destroyChart('prayers');
    var c1 = document.getElementById('prayers-chart');
    if (c1) {
      var wrap1 = c1.parentNode;
      var em1   = wrap1 ? wrap1.querySelector('.prem-chart-empty') : null;
      if (total === 0) {
        c1.style.display = 'none';
        if (wrap1 && !em1) {
          var emD = document.createElement('div');
          emD.className = 'prem-chart-empty';
          emD.innerHTML = '<i class="fas fa-hands-praying"></i><span>Nenhum pedido registrado ainda.</span>';
          wrap1.appendChild(emD);
        }
      } else {
        c1.style.display = '';
        if (em1) em1.remove();
        _charts['prayers'] = new Chart(c1, {
          type: 'doughnut',
          data: {
            labels: ['Precisam de Oração','Sendo Orados'],
            datasets: [{
              data: [precisam, orando],
              backgroundColor: ['rgba(249,168,37,.75)','rgba(129,199,132,.75)'],
              borderColor: ['#f9a825','#81c784'],
              borderWidth: 2,
              hoverOffset: 8,
              hoverBorderWidth: 3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '66%',
            animation: { duration: 600, easing: 'easeOutQuart' },
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: '#b0aa96', font: { size: 11 }, boxWidth: 10, padding: 14 }
              },
              tooltip: {
                backgroundColor: 'rgba(18,18,14,.96)',
                titleColor: '#e8e0c8',
                bodyColor: '#a0998a',
                borderColor: 'rgba(255,255,255,.1)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 10,
                callbacks: {
                  label: function(ctx) {
                    var pct = total > 0 ? Math.round(ctx.parsed / total * 100) : 0;
                    return '  ' + ctx.parsed + ' pedido(s)  ·  ' + pct + '%';
                  }
                }
              }
            }
          }
        });
      }
    }

    /* ── Barras: por categoria ── */
    _destroyChart('prayersCat');
    var c2 = document.getElementById('prayers-cat-chart');
    if (c2) {
      var wrap2 = c2.parentNode;
      var em2   = wrap2 ? wrap2.querySelector('.prem-chart-empty') : null;
      if (total === 0) {
        c2.style.display = 'none';
        if (wrap2 && !em2) {
          var emB = document.createElement('div');
          emB.className = 'prem-chart-empty';
          emB.innerHTML = '<i class="fas fa-chart-bar"></i><span>Sem pedidos por categoria.</span>';
          wrap2.appendChild(emB);
        }
      } else {
        c2.style.display = '';
        if (em2) em2.remove();
        var cats = { familia:0, espiritual:0, saude:0, outros:0 };
        oracoes.forEach(function(o) {
          var c = (o.categoria || 'outros').toLowerCase();
          if (cats[c] !== undefined) cats[c]++;
          else cats['outros']++;
        });
        var BORDA_C = ['#64b5f6','#ce93d8','#81c784','#f9a825'];
        var FUNDO_C = ['rgba(100,181,246,.15)','rgba(206,147,216,.15)','rgba(129,199,132,.15)','rgba(249,168,37,.15)'];
        var HOVER_C = ['rgba(100,181,246,.80)','rgba(206,147,216,.80)','rgba(129,199,132,.80)','rgba(249,168,37,.80)'];
        var opts = _chartDefaults();
        opts.scales.y.beginAtZero = true;
        opts.scales.y.ticks.stepSize = 1;
        opts.scales.y.grid.color = 'rgba(255,255,255,.04)';
        opts.scales.x.grid.display = false;
        opts.plugins.legend = { display: false };
        opts.plugins.tooltip = {
          backgroundColor: 'rgba(18,18,14,.96)',
          titleColor: '#e8e0c8',
          bodyColor: '#a0998a',
          borderColor: 'rgba(255,255,255,.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: function(ctx) { return '  ' + ctx.parsed.y + ' pedido(s)'; }
          }
        };
        opts.animation = { duration: 600, easing: 'easeOutQuart' };
        _charts['prayersCat'] = new Chart(c2, {
          type: 'bar',
          data: {
            labels: ['Família','Espiritual','Saúde','Outros'],
            datasets: [{
              data: [cats.familia, cats.espiritual, cats.saude, cats.outros],
              backgroundColor: FUNDO_C,
              borderColor: BORDA_C,
              hoverBackgroundColor: HOVER_C,
              borderWidth: 2,
              borderRadius: 10,
              borderSkipped: false
            }]
          },
          options: opts
        });
      }
    }
  } catch(e) {}
}
window.renderPrayersCharts = renderPrayersCharts;

/* ── Overview: atualiza stats extras (voluntários, oração e novos gráficos) ── */
function renderOvExtras() {
  try {
    var vols = DoaVidaAPI.getVoluntarios ? DoaVidaAPI.getVoluntarios() : (typeof getVoluntarios === 'function' ? getVoluntarios() : []);
    var elV = document.getElementById('ov-total-volunteers'); if (elV) elV.textContent = vols.length;
    /* Gráfico rosca de voluntários por status */
    _renderOvVolChart(vols);
  } catch(e) {}
  try {
    var oracoes = DoaVidaAPI.getOracoes ? DoaVidaAPI.getOracoes() : [];
    var elP = document.getElementById('ov-total-prayers'); if (elP) elP.textContent = oracoes.length;
  } catch(e) {}
  /* Gráfico rosca de doações por status */
  try { _renderOvDoacoesChart(); } catch(e) {}
}
window.renderOvExtras = renderOvExtras;

/* ── Gráfico rosca: Doações por Status (na Visão Geral) ── */
function _renderOvDoacoesChart() {
  _destroyChart('ovDoacoesStatus');
  var canvas = document.getElementById('ov-doacoes-status-chart');
  if (!canvas || !window.Chart) return;
  var doacoes = DoaVidaAPI.getDoacoes ? DoaVidaAPI.getDoacoes() : [];
  var counts = { pendente: 0, confirmado: 0, entregue: 0, coleta: 0, cancelado: 0 };
  doacoes.forEach(function(d) {
    var s = (d.status || 'pendente').toLowerCase();
    if (counts[s] !== undefined) counts[s]++; else counts.pendente++;
  });
  /* Atualiza mini-badges */
  var elP = document.getElementById('ov-don-pendente'); if (elP) elP.textContent = counts.pendente;
  var elE = document.getElementById('ov-don-entregue'); if (elE) elE.textContent = counts.entregue;
  var elC = document.getElementById('ov-don-cancelado'); if (elC) elC.textContent = counts.cancelado;
  _charts['ovDoacoesStatus'] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['⏳ Pendente', '✅ Confirmado', '📦 Entregue', '🚚 Coleta', '❌ Cancelado'],
      datasets: [{
        data: [counts.pendente, counts.confirmado, counts.entregue, counts.coleta, counts.cancelado],
        backgroundColor: ['rgba(249,168,37,.8)','rgba(129,199,132,.8)','rgba(77,182,172,.8)','rgba(100,181,246,.8)','rgba(229,115,115,.8)'],
        borderColor: ['#f9a825','#81c784','#4db6ac','#64b5f6','#e57373'],
        borderWidth: 2, hoverOffset: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,.65)', font: { size: 10 }, boxWidth: 12, padding: 8 } }
      }
    }
  });
}

/* ── Gráfico rosca: Voluntários por Status (na Visão Geral) ── */
function _renderOvVolChart(vols) {
  _destroyChart('ovVolStatus');
  var canvas = document.getElementById('ov-voluntarios-status-chart');
  if (!canvas || !window.Chart) return;
  var counts = { novo: 0, 'em-contato': 0, confirmado: 0, participando: 0, finalizado: 0 };
  (vols || []).forEach(function(v) {
    var s = (v.status || 'novo').toLowerCase();
    if (counts[s] !== undefined) counts[s]++; else counts.novo++;
  });
  /* Atualiza mini-badges */
  var elN = document.getElementById('ov-vol-novo'); if (elN) elN.textContent = counts.novo;
  var elC = document.getElementById('ov-vol-confirmado'); if (elC) elC.textContent = counts.confirmado;
  var elP = document.getElementById('ov-vol-participando'); if (elP) elP.textContent = counts.participando;
  _charts['ovVolStatus'] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['🆕 Novo', '📞 Em contato', '✅ Confirmado', '🤝 Participando', '🏁 Finalizado'],
      datasets: [{
        data: [counts.novo, counts['em-contato'], counts.confirmado, counts.participando, counts.finalizado],
        backgroundColor: ['rgba(232,201,106,.8)','rgba(100,181,246,.8)','rgba(129,199,132,.8)','rgba(206,147,216,.8)','rgba(144,164,174,.8)'],
        borderColor: ['#e8c96a','#64b5f6','#81c784','#ce93d8','#90a4ae'],
        borderWidth: 2, hoverOffset: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,.65)', font: { size: 10 }, boxWidth: 12, padding: 8 } }
      }
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════
   REALTIME — Sincronização entre dispositivos via Supabase WebSocket
   O que muda no mobile aparece instantaneamente no PC (e vice-versa).
   ══════════════════════════════════════════════════════════════════════ */

/*
  Debounce: evita chamar a mesma função várias vezes em sequência rápida.
  Ex: 5 doações chegam ao mesmo tempo → renderDoacoes() é chamado só 1x.
  @param {Function} fn  - Função a chamar
  @param {number}   ms  - Milissegundos de espera antes de executar
*/
function _debounce(fn, ms) {
  var timer;
  return function() {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

/*
  Versões com debounce das funções de renderização (evita flicker).
  Todas chamam renderVisaoGeral() para manter os cards do overview
  sincronizados automaticamente quando chega um evento Realtime.
*/
var _debouncedRenderDoacoes    = _debounce(function() { renderDoacoes();    atualizarBadges(); renderVisaoGeral(); }, 800);
var _debouncedRenderAlimentos  = _debounce(function() { renderAlimentos();  renderDashboard(); renderVisaoGeral(); }, 800);
var _debouncedRenderVoluntarios= _debounce(function() { renderVoluntarios();atualizarBadges(); renderVisaoGeral(); }, 800);
var _debouncedRenderOracoes    = _debounce(function() { renderOracoes();    atualizarBadges(); renderVisaoGeral(); }, 800);
var _debouncedRenderFamilias   = _debounce(function() { renderFamilias();   atualizarBadges(); renderVisaoGeral(); }, 800);

/*
  Exibe uma notificação de alerta no topo do admin.
  Desaparece automaticamente após 8 segundos.
*/
function _mostrarNotifAdmin(tipo, msg) {
  var bar = document.getElementById('admin-notif-bar');
  if (!bar) return;
  bar.innerHTML = '<i class="fas fa-bell" style="color:#e8c96a"></i> ' + msg;
  bar.style.display = 'flex';
  setTimeout(function() { bar.style.display = 'none'; }, 8000);
}

/*
  Inicia a sincronização em tempo real com o Supabase.

  Como funciona:
  1. Criamos um "canal" (WebSocket persistente) com o Supabase
  2. Pedimos para ouvir mudanças nas tabelas principais do banco
  3. A cada INSERT/UPDATE/DELETE, a aba ativa do painel é atualizada
  4. Uma notificação toast aparece para informar o admin

  Requisito Supabase: as tabelas precisam estar na publicação realtime.
  Se não estiver, execute no SQL Editor do Supabase:
    ALTER PUBLICATION supabase_realtime ADD TABLE doacoes, alimentos, voluntarios, oracoes, familias;
*/
function iniciarSincronizacaoRealtime() {
  /* Verifica se o cliente Supabase está disponível */
  if (!supabaseClient) {
    console.warn('[DoaVida] Realtime: supabaseClient não disponível. Verifique a conexão com o Supabase.');
    return;
  }

  /* Cancela qualquer canal anterior antes de criar um novo */
  if (window._doaVidaRealtimeChannel) {
    supabaseClient.removeChannel(window._doaVidaRealtimeChannel);
  }

  /*
    Cria o canal único que ouve mudanças em todas as tabelas.
    event: '*' = captura INSERT, UPDATE e DELETE.
  */
  var canal = supabaseClient
    .channel('doavida-admin-sync')

    /* ── Doações: nova doação registrada pelo formulário público ── */
    .on('postgres_changes', { event: '*', schema: 'public', table: 'doacoes' }, function(payload) {
      if (payload.eventType === 'INSERT') {
        var nome = (payload.new && payload.new.name) ? payload.new.name : 'alguém';
        showToast('🎉 Nova doação de ' + nome + '!', 'success', 6000);
        _mostrarNotifAdmin('doacoes', 'Nova doação de ' + nome);
      }
      /* Atualiza a aba de doações e os badges numéricos do menu */
      _debouncedRenderDoacoes();
    })

    /* ── Alimentos: estoque atualizado após uma doação ou edição admin ── */
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alimentos' }, function(payload) {
      /* Atualiza a aba de alimentos e o dashboard de progresso */
      _debouncedRenderAlimentos();
    })

    /* ── Voluntários: novo cadastro pelo formulário público ── */
    .on('postgres_changes', { event: '*', schema: 'public', table: 'voluntarios' }, function(payload) {
      if (payload.eventType === 'INSERT') {
        var nomeVol = (payload.new && payload.new.name) ? payload.new.name : 'novo voluntário';
        showToast('🙌 Novo voluntário: ' + nomeVol + '!', 'success', 6000);
        _mostrarNotifAdmin('voluntarios', 'Novo voluntário: ' + nomeVol);
      }
      _debouncedRenderVoluntarios();
    })

    /* ── Orações: pedido registrado junto com a doação ── */
    .on('postgres_changes', { event: '*', schema: 'public', table: 'oracoes' }, function(payload) {
      if (payload.eventType === 'INSERT') {
        showToast('🙏 Novo pedido de oração recebido!', 'info', 6000);
      }
      _debouncedRenderOracoes();
    })

    /* ── Famílias: cadastro ou atualização de família beneficiada ── */
    .on('postgres_changes', { event: '*', schema: 'public', table: 'familias' }, function(payload) {
      _debouncedRenderFamilias();
    })

    /* Callback de status da conexão — atualiza indicador visual */
    .subscribe(function(status, err) {
      var badge = document.getElementById('db2-realtime-badge');
      var dot   = document.getElementById('db2-realtime-dot');
      var label = document.getElementById('db2-realtime-label');

      if (status === 'SUBSCRIBED') {
        console.log('[DoaVida] ✅ Realtime ativo — qualquer mudança no banco atualiza o painel automaticamente');
        if (badge) { badge.className = 'db2-rt-badge online'; }
        if (dot)   { dot.className   = 'db2-rt-dot pulse'; }
        if (label) { label.textContent = 'Ao vivo'; }

      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[DoaVida] ⚠️ Realtime com problema (' + status + '):', err);
        if (badge) { badge.className = 'db2-rt-badge offline'; }
        if (dot)   { dot.className   = 'db2-rt-dot'; }
        if (label) { label.textContent = 'Sem conexão'; }

      } else if (status === 'CLOSED') {
        console.log('[DoaVida] Canal Realtime encerrado.');
        if (badge) { badge.className = 'db2-rt-badge'; }
        if (dot)   { dot.className   = 'db2-rt-dot'; }
        if (label) { label.textContent = 'Desconectado'; }
      }
    });

  /* Salva referência global para poder cancelar no logout */
  window._doaVidaRealtimeChannel = canal;
}

/* ══════════════════════════════════════════════════════════════════════
   UPLOAD DE MÍDIA NAS SEÇÕES DO ADMIN
   Permite fazer upload direto de imagem/vídeo para Supabase Storage
   nos campos de URL das seções (Missão, Pilares, Voluntário, etc.)
   ══════════════════════════════════════════════════════════════════════ */

/*
  Faz upload de um arquivo para o Supabase Storage e preenche
  o input de URL correspondente com a URL pública retornada.

  @param {string} inputId  — ID do input de URL a preencher
  @param {string} aceitar  — tipos MIME aceitos (ex: 'image/*,video/mp4')
*/
function _uploadParaInput(inputId, aceitar) {
  var input = document.getElementById(inputId);
  if (!input) return;

  /* Cria file picker temporário — não polui o DOM */
  var fi = document.createElement('input');
  fi.type   = 'file';
  fi.accept = aceitar || 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm';

  fi.addEventListener('change', function () {
    var arquivo = fi.files[0];
    if (!arquivo) return;

    /* Limites: 20 MB para imagem, 200 MB para vídeo */
    var limite = arquivo.type.startsWith('video/') ? 200 * 1024 * 1024 : 20 * 1024 * 1024;
    if (arquivo.size > limite) {
      showToast('❌ Arquivo muito grande. Máx: ' +
        (arquivo.type.startsWith('video/') ? '200 MB (vídeo)' : '20 MB (imagem)'), 'error');
      return;
    }

    /* Gera nome único para evitar colisão no Storage */
    var ext       = arquivo.name.split('.').pop().toLowerCase();
    var nomeUnico = Date.now() + '_' + inputId.replace(/[^a-z0-9]/gi, '_') + '.' + ext;

    /* Feedback visual enquanto faz upload */
    var valorAnterior      = input.value;
    var placeholderAnterior = input.placeholder;
    input.value       = '';
    input.placeholder = '⏳ Fazendo upload…';
    input.disabled    = true;

    DoaVidaSync.uploadImagemGaleria(arquivo, nomeUnico)
      .then(function (urlPublica) {
        input.value       = urlPublica;
        input.placeholder = placeholderAnterior;
        input.disabled    = false;
        /* Dispara evento para preview automático reagir, se houver */
        input.dispatchEvent(new Event('input', { bubbles: true }));
        showToast('✅ Upload concluído! Cole para salvar.', 'success');
      })
      .catch(function (err) {
        input.value       = valorAnterior;
        input.placeholder = placeholderAnterior;
        input.disabled    = false;
        var msg = (err && err.message) ? err.message : 'Tente novamente.';
        showToast('❌ Falha no upload: ' + msg, 'error');
      });
  });

  fi.click();
}
window._uploadParaInput = _uploadParaInput;

/*
  Injeta botão de upload ao lado dos inputs de URL das seções do admin.
  Chamada automaticamente ao abrir a aba Galeria.
  Idempotente: não duplica botões se chamada mais de uma vez.
*/
function _injetarBotoesUploadSecoes() {
  /* Mapeamento completo: inputId → tipos de arquivo aceitos */
  var secoes = [
    /* ── Banner Voluntário ── */
    { id: 'vol-banner-url',  aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    /* ── Missão ── */
    { id: 'missao-foto1-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    { id: 'missao-foto2-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    /* ── Pilares ── */
    { id: 'pillar1-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    { id: 'pillar2-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    { id: 'pillar3-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    { id: 'pillar4-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    /* ── Por que Voluntário ── */
    { id: 'why1-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    { id: 'why2-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    { id: 'why3-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    /* ── Como Contribuir ── */
    { id: 'contrib1-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    { id: 'contrib2-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    { id: 'contrib3-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    { id: 'contrib4-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    /* ── Capa Voluntário ── */
    { id: 'vol-capa-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    /* ── Cards Voluntário ── */
    { id: 'vol-card1-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    { id: 'vol-card2-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    { id: 'vol-card3-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
    { id: 'vol-card4-url', aceitar: 'image/jpeg,image/png,image/webp,video/mp4,video/webm' },
  ];

  secoes.forEach(function (sec) {
    var input = document.getElementById(sec.id);
    if (!input || input.dataset.uploadInjetado) return;

    /* Cria o botão de upload */
    var btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'btn btn-outline';
    btn.title     = 'Fazer upload de imagem ou vídeo do computador';
    btn.innerHTML = '<i class="fas fa-upload" style="margin-right:5px;"></i>Upload';
    btn.style.cssText = 'white-space:nowrap;flex-shrink:0;font-size:.8rem;padding:8px 12px;';

    (function (inputId, aceitar) {
      btn.addEventListener('click', function () {
        _uploadParaInput(inputId, aceitar);
      });
    })(sec.id, sec.aceitar);

    /* Insere ANTES do primeiro botão existente (ex: Prévia) no mesmo container */
    var parent = input.parentNode;
    if (!parent) return;
    var primeiroBotao = parent.querySelector('button');
    if (primeiroBotao) {
      parent.insertBefore(btn, primeiroBotao);
    } else {
      parent.appendChild(btn);
    }

    /* Marca para não duplicar */
    input.dataset.uploadInjetado = '1';
  });
}
window._injetarBotoesUploadSecoes = _injetarBotoesUploadSecoes;

/* ══════════════════════════════════════════════════════════════════════
   VÍDEO DA AÇÃO SOCIAL — seção da página inicial
   ══════════════════════════════════════════════════════════════════════ */

/* Carrega URL salva no input */
function renderVideoAcao() {
  try {
    var ls = localStorage.getItem('doavida_video_acao');
    var el = document.getElementById('video-acao-url');
    if (el && ls) el.value = ls;
    var lsPoster = localStorage.getItem('doavida_video_acao_poster');
    var elP = document.getElementById('video-acao-poster-url');
    if (elP && lsPoster) elP.value = lsPoster;
  } catch(e) {}
  if (window.DoaVidaSync && typeof DoaVidaSync.getConfig === 'function') {
    DoaVidaSync.getConfig('doavida_video_acao').then(function(val) {
      var el = document.getElementById('video-acao-url');
      if (el && val) el.value = val;
    }).catch(function(){});
    DoaVidaSync.getConfig('doavida_video_acao_poster').then(function(val) {
      var elP = document.getElementById('video-acao-poster-url');
      if (elP && val) elP.value = val;
    }).catch(function(){});
  }
}
window.renderVideoAcao = renderVideoAcao;

/* Pré-visualiza o vídeo no admin */
function previewVideoAcao() {
  var url = ((document.getElementById('video-acao-url') || {}).value || '').trim();
  if (!url) return;

  var wrap   = document.getElementById('video-acao-preview');
  var iframe = document.getElementById('video-acao-preview-frame');
  if (!wrap || !iframe) return;

  /* YouTube → embed */
  var ytM = url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytM) {
    iframe.src = 'https://www.youtube.com/embed/' + ytM[1] + '?autoplay=0&rel=0';
    wrap.style.display = '';
    return;
  }

  /* Arquivo direto → preview simples */
  iframe.src = url;
  wrap.style.display = '';
}
window.previewVideoAcao = previewVideoAcao;

/* Pré-visualiza a capa/poster no admin */
function previewVideoAcaoPoster() {
  var url = ((document.getElementById('video-acao-poster-url') || {}).value || '').trim();
  if (!url) { showToast('⚠️ Cole a URL da imagem de capa.', 'warn'); return; }

  var wrap = document.getElementById('video-acao-poster-preview');
  var img  = document.getElementById('video-acao-poster-preview-img');
  if (!wrap || !img) return;

  img.src = url;
  img.onerror = function() { showToast('⚠️ Imagem não carregou — verifique a URL.', 'warn'); };
  wrap.style.display = '';
}
window.previewVideoAcaoPoster = previewVideoAcaoPoster;

/* Salva a URL do vídeo no Supabase */
function salvarVideoAcao() {
  var url = ((document.getElementById('video-acao-url') || {}).value || '').trim();
  if (!url) { showToast('⚠️ Cole a URL do vídeo.', 'error'); return; }

  localStorage.setItem('doavida_video_acao', url);

  if (window.DoaVidaSync && typeof DoaVidaSync.setConfig === 'function') {
    showToast('⏳ Salvando vídeo…', 'info');
    DoaVidaSync.setConfig('doavida_video_acao', url)
      .then(function() { showToast('✅ Vídeo salvo! Recarregue o site para ver.', 'success'); })
      .catch(function(e) { showToast('❌ Erro: ' + (e && e.message ? e.message : 'verifique a conexão.'), 'error'); });
  } else {
    showToast('⚠️ Salvo localmente (Supabase offline).', 'warn');
  }
}
window.salvarVideoAcao = salvarVideoAcao;

/* Salva a capa/poster do vídeo no Supabase */
function salvarVideoAcaoPoster() {
  var url = ((document.getElementById('video-acao-poster-url') || {}).value || '').trim();
  localStorage.setItem('doavida_video_acao_poster', url);

  if (window.DoaVidaSync && typeof DoaVidaSync.setConfig === 'function') {
    showToast('⏳ Salvando capa…', 'info');
    DoaVidaSync.setConfig('doavida_video_acao_poster', url || '')
      .then(function() { showToast('✅ Capa salva! Recarregue o site para ver.', 'success'); })
      .catch(function(e) { showToast('❌ Erro ao salvar capa: ' + (e && e.message ? e.message : 'verifique a conexão.'), 'error'); });
  } else {
    showToast('✅ Capa salva localmente.', 'success');
  }
}
window.salvarVideoAcaoPoster = salvarVideoAcaoPoster;

window.iniciarSincronizacaoRealtime = iniciarSincronizacaoRealtime;
