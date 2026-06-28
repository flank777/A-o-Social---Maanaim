/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  DoaVida — js/app.js                                                ║
  ║  Motor central: funções compartilhadas por TODAS as páginas         ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║  📚 O QUE É ESTE ARQUIVO?                                           ║
  ║                                                                      ║
  ║  app.js é carregado em TODAS as páginas do projeto.                 ║
  ║  Contém funções que qualquer página pode precisar:                  ║
  ║                                                                      ║
  ║  ✅ Inicializar o loader (tela de carregamento)                     ║
  ║  ✅ Controlar a navbar (scroll + hamburguer)                        ║
  ║  ✅ Mostrar/esconder o toast (notificações)                         ║
  ║  ✅ Botão "voltar ao topo"                                          ║
  ║  ✅ Funções utilitárias (formatar data, escapar HTML, etc.)         ║
  ║  ✅ Intersection Observer para animações no scroll                  ║
  ║                                                                      ║
  ║  ORDEM DE CARREGAMENTO NOS HTMLs:                                   ║
  ║  1. api.js   (dados — não depende de nada)                         ║
  ║  2. app.js   (este arquivo — depende do DOM)                        ║
  ║  3. form.js / admin.js (específicos — dependem dos dois acima)     ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 1 — INICIALIZAÇÃO PRINCIPAL
   
   DOMContentLoaded = evento que dispara quando o HTML foi
   completamente carregado e analisado pelo navegador.
   É o momento certo para começar a manipular o DOM.
   ══════════════════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", function () {
  /* Inicializa cada componente compartilhado */
  inicializarLoader();
  inicializarTransicaoPagina();
  inicializarNavbarInjecao();
  inicializarNavbar();
  inicializarHamburguer();
  inicializarJelloNav();
  inicializarBotaoTopo();
  inicializarAnimacoesScroll();
  inicializarFooterAno();
  inicializarFundoOndas();
  inicializarRipplesBotoes();
  registrarServiceWorker();
  inicializarInstalarApp();
  inicializarTecladoMobile();
}); /* Fim do DOMContentLoaded */

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 2 — LOADER (Tela de Carregamento)

   O loader aparece imediatamente quando a página começa a carregar.
   Após a página estar pronta, ele desaparece suavemente.
   ══════════════════════════════════════════════════════════════════════ */
function inicializarLoader() {
  var loader = document.getElementById("loader");
  if (!loader) return; /* Se não houver loader na página, sai da função */

  /*
    No mobile, window.load pode demorar muito (ex: hero-banner de 2MB).
    Por isso usamos um limite máximo de 1200ms a partir do DOM pronto,
    ou window.load, o que vier PRIMEIRO.
  */
  var loaderJaEscondido = false;

  function esconderLoader() {
    if (loaderJaEscondido) return;
    loaderJaEscondido = true;
    setTimeout(function () {
      loader.classList.add("hidden");
    }, 250);
  }

  window.addEventListener("load", esconderLoader);

  /* Teto de 1200ms: mobile nunca espera além disso */
  setTimeout(esconderLoader, 1200);

  /*
    BUG: voltar pela página travava no loader.

    Ao clicar num link, inicializarTransicaoPagina() remove "hidden"
    do loader ANTES de navegar (linha ~137). Se o usuário volta pelo
    botão "voltar" do navegador (ou gesto de voltar no mobile), o
    Chrome/Firefox podem restaurar a página via bfcache: o DOM volta
    exatamente como foi congelado — loader visível — e nem
    "DOMContentLoaded" nem "load" disparam de novo, então nada nunca
    esconde o loader. Resultado: tela de carregamento presa "para sempre".

    "pageshow" dispara sempre que a página fica visível, incluindo
    restauração via bfcache. event.persisted = true identifica esse caso.
  */
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      loaderJaEscondido = false;
      loader.classList.add("hidden");
      loaderJaEscondido = true;
    }
  });
} /* Fim de inicializarLoader */

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 2.1 — TRANSIÇÃO ENTRE PÁGINAS

   Quando o usuário clica em um link interno (mesma origem), mostramos
   o loader antes de navegar. Assim o usuário vê a tela de carregamento
   em vez de uma tela branca em branco durante a troca de página.

   Regras do filtro:
   - href vazio, "#ancora" ou "javascript:" → ignora
   - target="_blank" → ignora (abre em nova aba)
   - link externo (outro domínio) → ignora
   ══════════════════════════════════════════════════════════════════════ */
function inicializarTransicaoPagina() {
  var loader = document.getElementById("loader");
  if (!loader) return;

  /*
    "click" com captura (true) = pega o evento antes do elemento filho.
    Usamos document inteiro para capturar qualquer <a> dinamicamente
    inserido (como os da navbar injetada pelo app.js).
  */
  document.addEventListener("click", function (e) {
    /* Sobe pelo DOM até encontrar um <a> (ou desiste) */
    var alvo = e.target;
    while (alvo && alvo.tagName !== "A") {
      alvo = alvo.parentElement;
    }
    if (!alvo) return;

    var href = alvo.getAttribute("href") || "";

    /* Ignora: vazio, âncora pura, javascript:, nova aba, outro domínio */
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("javascript") ||
      alvo.target === "_blank" ||
      (href.startsWith("http") && !href.startsWith(location.origin))
    ) {
      return;
    }

    /*
      Ignora links que apontam para âncoras DA MESMA PÁGINA.
      Ex: "index.html#how" quando já estamos em index.html → não carrega nova página.
      Sem esse filtro, o loader aparecia e a página "travava" ao rolar para seções.
    */
    try {
      var destino = new URL(alvo.href, location.href);
      if (destino.pathname === location.pathname && destino.hash) {
        return;
      }
    } catch (err) { /* segurança: se URL inválida, ignora */ }

    /*
      Remove "hidden" para mostrar o loader.
      O navegador vai carregar a nova página e seu próprio loader
      ficará visível até o window.load da nova página.
    */
    loader.classList.remove("hidden");
  }, true); /* true = fase de captura, antes do bubbling */
} /* Fim de inicializarTransicaoPagina */

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 2.1 — INJEÇÃO DO NAVBAR

   Injeta o navbar.html se não estiver presente na página.
   Garante consistência em todas as páginas.
   ══════════════════════════════════════════════════════════════════════ */
function inicializarNavbarInjecao() {
  var nav = document.getElementById("nav");
  if (nav) return; /* Já existe, não injeta */

  /* Busca o navbar.html */
  fetch("components/navbar.html")
    .then(function (response) {
      if (!response.ok) throw new Error("Erro ao carregar navbar.html");
      return response.text();
    })
    .then(function (html) {
      /* Injeta no início do body */
      var body = document.body;
      body.insertAdjacentHTML("afterbegin", html);
      inicializarNavbar();      // reinicializa apos injecao
      inicializarHamburguer();  // reinicializa apos injecao
      inicializarJelloNav();    // ativa jello nav apos injecao
      inicializarInstalarApp(); // botão "Instalar App" só existe após a injeção
    })
    .catch(function (error) {
      console.error("Erro ao injetar navbar:", error);
    });
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 3 — NAVBAR (Menu de Navegação)
   ══════════════════════════════════════════════════════════════════════ */
function inicializarNavbar() {
  var nav = document.getElementById("nav");
  if (!nav) return;

  /*
    Função que verifica o scroll e adiciona/remove a classe 'scrolled'.
    Chamamos imediatamente para o caso da página já estar scrollada
    quando for carregada (ex: ao recarregar a página).
  */
  function verificarScroll() {
    if (window.scrollY > 50) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  }

  /* Executa imediatamente */
  verificarScroll();

  /*
    Executa a cada scroll.
    
    OTIMIZAÇÃO com requestAnimationFrame:
    'scroll' pode disparar dezenas de vezes por segundo.
    Sem otimização, isso consome muito processamento.
    
    Usamos um "throttle" simples com requestAnimationFrame:
    só processamos um evento de scroll por frame de animação
    (~60 vezes por segundo), não centenas.
  */
  var scrollPendente = false;
  window.addEventListener(
    "scroll",
    function () {
      if (!scrollPendente) {
        scrollPendente = true;
        requestAnimationFrame(function () {
          verificarScroll();
          scrollPendente = false;
        });
      }
    },
    { passive: true },
  );
  /*
    { passive: true } = diz ao navegador que nunca vamos chamar
    event.preventDefault() neste listener.
    Isso permite ao navegador otimizar o scroll (mais fluido).
  */
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 4 — MENU HAMBURGUER (Mobile)
   ══════════════════════════════════════════════════════════════════════ */
function inicializarHamburguer() {
  var hBtn = document.getElementById("hamburger-btn");
  var drawer = document.getElementById("nav-drawer");
  if (!hBtn || !drawer) return;

  /* Botão X de fechar dentro do drawer (presente em gallery.html e outros) */
  var closeBtn = document.getElementById("nav-drawer-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      fecharDrawer();
    });
  }

  /* Abre/fecha o drawer ao clicar no hamburguer */
  hBtn.addEventListener("click", function (e) {
    /* stopPropagation impede que o clique no hamburger
       suba até o document e dispare o "fechar ao clicar fora" */
    e.stopPropagation();

    var estaAberto = drawer.classList.contains("open");

    if (estaAberto) {
      fecharDrawer();
    } else {
      abrirDrawer();
    }
  });

  /*
    Fecha o drawer ao clicar em qualquer link dentro dele.
    Usamos delegação de eventos: um único listener no drawer
    captura cliques em todos os links filhos.
    
    DELEGAÇÃO DE EVENTOS:
    Em vez de adicionar um listener em cada link (ineficiente),
    adicionamos UM listener no container pai.
    Quando um filho é clicado, o evento "sobe" (bubble) até o pai.
  */
  drawer.addEventListener("click", function (e) {
    /*
      e.target = o elemento que foi realmente clicado.
      .closest('a') = procura o ancestral <a> mais próximo.
      Se o clique foi num ícone dentro do link, .closest('a')
      encontra o link pai.
    */
    if (e.target.closest("a")) {
      fecharDrawer();
    }
  });

  /*
    Fecha o drawer ao pressionar ESC.
    Boa prática de acessibilidade.
  */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer.classList.contains("open")) {
      fecharDrawer();
      hBtn.focus(); /* Devolve o foco ao botão que abriu o drawer */
    }
  });

  /* Fecha o drawer ao clicar fora (no fundo da página) */
  document.addEventListener("click", function (e) {
    if (
      drawer.classList.contains("open") &&
      !drawer.contains(e.target) /* Clique fora do drawer */ &&
      !hBtn.contains(e.target) /* E fora do botão hamburguer */
    ) {
      fecharDrawer();
    }
  });
}

/* Abre o menu mobile */
function abrirDrawer() {
  var hBtn = document.getElementById("hamburger-btn");
  var drawer = document.getElementById("nav-drawer");
  if (!hBtn || !drawer) return;

  hBtn.classList.add("open");
  drawer.classList.add("open");
  hBtn.setAttribute("aria-expanded", "true");
  hBtn.setAttribute("aria-label", "Fechar menu");
  drawer.setAttribute("aria-hidden", "false");

  /* Impede scroll da página enquanto o menu está aberto */
  document.body.style.overflow = "hidden";
}

/* Fecha o menu mobile */
function fecharDrawer() {
  var hBtn = document.getElementById("hamburger-btn");
  var drawer = document.getElementById("nav-drawer");
  if (!hBtn || !drawer) return;

  hBtn.classList.remove("open");
  drawer.classList.remove("open");
  hBtn.setAttribute("aria-expanded", "false");
  hBtn.setAttribute("aria-label", "Abrir menu");
  drawer.setAttribute("aria-hidden", "true");

  /* Restaura scroll */
  document.body.style.overflow = "";
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 5 — BOTÃO "VOLTAR AO TOPO"
   ══════════════════════════════════════════════════════════════════════ */
function inicializarBotaoTopo() {
  var btn = document.getElementById("btn-back-top");
  if (!btn) return;

  /* Mostra/esconde baseado no scroll */
  var scrollPendente = false;
  window.addEventListener(
    "scroll",
    function () {
      if (!scrollPendente) {
        scrollPendente = true;
        requestAnimationFrame(function () {
          if (window.scrollY > 400) {
            btn.classList.add("visible");
          } else {
            btn.classList.remove("visible");
          }
          scrollPendente = false;
        });
      }
    },
    { passive: true },
  );

  /* Ação ao clicar: rola suavemente ao topo */
  btn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 6 — ANO DO FOOTER
   ══════════════════════════════════════════════════════════════════════ */
function inicializarFooterAno() {
  var el = document.getElementById("footer-year");
  if (el) {
    el.textContent = new Date().getFullYear();
    /*
      new Date() = cria objeto com data/hora atual.
      .getFullYear() = retorna apenas o ano (ex: 2025).
      Atualiza automaticamente a cada ano — sem editar o HTML!
    */
  }
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 7 — ANIMAÇÕES NO SCROLL (Intersection Observer)

   Elementos com a classe 'animate-in' aparecem suavemente
   quando entram na área visível da tela.
   
   SEM Intersection Observer: precisaríamos checar no evento 'scroll'
   a posição de cada elemento — muito lento!
   
   COM Intersection Observer: o browser notifica automaticamente
   quando um elemento entra/sai da área visível — muito eficiente!
   ══════════════════════════════════════════════════════════════════════ */
function inicializarAnimacoesScroll() {
  /* Força todos os elementos visíveis após 2.5s — segurança contra travamentos */
  var fallback = setTimeout(function () {
    document.querySelectorAll(".animate-in").forEach(function (el) {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
      el.style.transitionDelay = "0ms";
    });
  }, 2500);

  /* Sem suporte: mostra tudo imediatamente */
  if (!("IntersectionObserver" in window)) {
    clearTimeout(fallback);
    document.querySelectorAll(".animate-in").forEach(function (el) {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.05,
      rootMargin: "0px 0px 0px 0px"
    }
  );

  document.querySelectorAll(".animate-in").forEach(function (el) {
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    if (el.dataset.delay) {
      el.style.transitionDelay = el.dataset.delay + "ms";
    }
    observer.observe(el);
  });
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 8 — SISTEMA DE TOAST (Notificações)

   showToast(mensagem, tipo, duracao)
   
   Parâmetros:
   - mensagem : string  — o texto a exibir
   - tipo     : string  — 'success' | 'error' | 'info' | 'warning'
   - duracao  : number  — milissegundos (padrão: 4000)
   
   Exemplos de uso:
   showToast('✅ Doação registrada!', 'success');
   showToast('❌ Campo obrigatório', 'error');
   showToast('ℹ️ Aguarde...', 'info', 2000);
   ══════════════════════════════════════════════════════════════════════ */

/* Guarda referência ao timeout para poder cancelar se necessário */
var _toastTimeout = null;

function showToast(mensagem, tipo, duracao) {
  var toast = document.getElementById("toast");
  var msgSpan = document.getElementById("toast-message");
  if (!toast || !msgSpan) return;

  /* Limpa timeout anterior (evita toasts se sobrepondo) */
  if (_toastTimeout) {
    clearTimeout(_toastTimeout);
    _toastTimeout = null;
  }

  /* Define o conteúdo */
  msgSpan.textContent = mensagem;

  /*
    Remove todas as classes de tipo antes de adicionar a nova.
    Assim não acumula classes de toasts anteriores.
  */
  toast.className = "toast"; /* Reseta para a classe base */
  toast.classList.add(tipo || "info");
  toast.classList.add("visible");
  toast.setAttribute("aria-hidden", "false");

  /* Esconde após a duração */
  _toastTimeout = setTimeout(function () {
    esconderToast();
  }, duracao || 4000);
}

function esconderToast() {
  var toast = document.getElementById("toast");
  if (!toast) return;
  toast.classList.remove("visible");
  toast.setAttribute("aria-hidden", "true");
}

/*
  Exporta showToast para o escopo global.
  Outros arquivos JS (form.js, admin.js) podem chamar showToast()
  sem precisar importar nada.
  
  window.showToast = a função é adicionada ao objeto window,
  tornando-a acessível globalmente.
*/
window.showToast = showToast;

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 9 — UTILITÁRIOS GLOBAIS
   Funções auxiliares usadas em vários arquivos.
   Todas exportadas para o escopo global (window.nomeFuncao).
   ══════════════════════════════════════════════════════════════════════ */

/*
  Escapa caracteres HTML para prevenir XSS (Cross-Site Scripting).
  
  XSS = quando um atacante injeta código malicioso via dados do usuário.
  
  Exemplo de ataque SEM escape:
  nome = '<img src=x onerror="roubarSenhas()">'
  innerHTML = nome → executa o script malicioso!
  
  COM escHtml:
  nome → '&lt;img src=x onerror="roubarSenhas()"&gt;'
  innerHTML = exibe o texto literal, não executa nada.
  
  Sempre use escHtml() antes de inserir dados do usuário no DOM!
*/
function escHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;") /* & → &amp;  (DEVE ser primeiro!) */
    .replace(/</g, "&lt;") /* < → &lt; */
    .replace(/>/g, "&gt;") /* > → &gt; */
    .replace(/"/g, "&quot;") /* " → &quot; */
    .replace(/'/g, "&#039;"); /* ' → &#039; */
}
window.escHtml = escHtml;

/*
  Formata uma data ISO 8601 para exibição em pt-BR.
  
  Parâmetros:
  - isoString : string — ex: "2025-03-15T14:30:00.000Z"
  - incluirHora: boolean — se true, inclui horário
  
  Retorna: "15/03/2025 14:30" ou "15/03/2025"
*/
function formatarData(isoString, incluirHora) {
  if (!isoString) return "—";
  try {
    var data = new Date(isoString);

    /* Verifica se a data é válida */
    if (isNaN(data.getTime())) return "—";
    /*
      isNaN() = "Is Not a Number"
      Se a data é inválida, getTime() retorna NaN.
    */

    var parteData = data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }); /* Resultado: "15/03/2025" */

    if (!incluirHora) return parteData;

    var parteHora = data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }); /* Resultado: "14:30" */

    return parteData + " " + parteHora;
  } catch (e) {
    return "—";
  }
}
window.formatarData = formatarData;

/*
  Calcula há quanto tempo algo aconteceu.
  
  Retorna strings como:
  "agora" (menos de 1 minuto)
  "há 5min"
  "há 2h"
  "há 3 dias"
  "15/03/2025" (mais de 30 dias)
*/
function tempoAtras(isoString) {
  if (!isoString) return "—";
  try {
    var diff = Date.now() - new Date(isoString).getTime();
    /* diff em milissegundos */

    var segundos = Math.floor(diff / 1000);
    var minutos = Math.floor(segundos / 60);
    var horas = Math.floor(minutos / 60);
    var dias = Math.floor(horas / 24);

    if (segundos < 60) return "agora";
    if (minutos < 60) return "há " + minutos + "min";
    if (horas < 24) return "há " + horas + "h";
    if (dias < 30) return "há " + dias + (dias === 1 ? " dia" : " dias");
    return formatarData(isoString, false);
  } catch (e) {
    return "—";
  }
}
window.tempoAtras = tempoAtras;

/*
  Formata um número com separador de milhar brasileiro.
  
  Exemplos:
  formatarNumero(1500)    → "1.500"
  formatarNumero(1500.5)  → "1.500,5"
  formatarNumero(42)      → "42"
*/
function formatarNumero(numero) {
  if (numero === null || numero === undefined || isNaN(numero)) return "0";
  return Number(numero).toLocaleString("pt-BR");
}
window.formatarNumero = formatarNumero;

/*
  Aplica máscara de telefone brasileiro em um input.
  
  Converte: "91999999999" → "(91) 99999-9999"
  
  Como usar:
  <input id="meuTel" oninput="mascaraTelefone(this)" />
  OU
  input.addEventListener('input', () => mascaraTelefone(input));
*/
function mascaraTelefone(input) {
  if (!input) return;

  /* Remove tudo que não for dígito */
  var v = input.value.replace(/\D/g, "");
  /*
    /\D/g = expressão regular: \D = qualquer não-dígito, g = global (todos)
    .replace() com regex = substitui todos os não-dígitos por ''
  */

  /* Aplica a máscara progressivamente */
  var resultado = "";
  if (v.length > 0) resultado = "(" + v.substring(0, 2);
  if (v.length >= 2) resultado += ") ";

  /* Celular: 9 dígitos no número (11 dígitos total com DDD) */
  if (v.length <= 10) {
    /* Telefone fixo: XXXX-XXXX */
    if (v.length > 2) resultado += v.substring(2, 6);
    if (v.length > 6) resultado += "-" + v.substring(6, 10);
  } else {
    /* Celular: XXXXX-XXXX */
    if (v.length > 2) resultado += v.substring(2, 7);
    if (v.length > 7) resultado += "-" + v.substring(7, 11);
  }

  input.value = resultado;
}
window.mascaraTelefone = mascaraTelefone;

/*
  Valida se um e-mail tem formato válido.
  
  Usa expressão regular básica.
  Retorna: true (válido) ou false (inválido)
*/
function validarEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
  /*
    ^[^\s@]+   = começa com 1+ caracteres que não são espaço ou @
    @          = o símbolo @ obrigatório
    [^\s@]+    = mais caracteres sem espaço ou @
    \.         = um ponto (\ escapa o . que normalmente significa "qualquer char")
    [^\s@]+$   = termina com mais caracteres sem espaço ou @
    .test()    = retorna true se a string combina com o padrão
  */
}
window.validarEmail = validarEmail;

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 10 — JELLO SLIDING TAB NAVIGATION

   Controla a navegação com indicador deslizante e efeito jello:
   - Mobile: .jello-nav fixada no rodapé, .jello-pill desliza entre itens
   - Desktop: .nav-links-pill desliza sob os links do topo

   O efeito "jello" é a animação CSS jelloSquish no pill ao mover.

   Chamada em duas situações:
   1. DOMContentLoaded (navbar já está no HTML da página)
   2. Após injeção fetch do components/navbar.html
   ══════════════════════════════════════════════════════════════════════ */
function inicializarJelloNav() {

  /* ── Detecta página atual ────────────────────────────────────── */
  var paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
  var mapa = {
    'index.html':      0,
    '':                0,
    'voluntario.html': 3,
    'form.html':       2,
    'admin.html':      4,
    'dashboard.html':  4,
    'gallery.html':    1
  };
  var indiceAtivo = mapa[paginaAtual];

  /* ════════════════════════════════════════════════════════════
     MOBILE — .jello-nav
  ════════════════════════════════════════════════════════════ */
  var jelloNav  = document.getElementById('jello-nav');
  var jelloPill = document.getElementById('jello-pill');
  var jelloItens = document.querySelectorAll('.jello-item');

  if (jelloNav && jelloPill && jelloItens.length) {

    /* Marca item ativo */
    var itemAtivo = null;
    jelloItens.forEach(function (item) {
      var idx = parseInt(item.getAttribute('data-jello-index'), 10);
      if (idx === indiceAtivo) {
        item.classList.add('is-active');
        itemAtivo = item;
      }
    });

    /* Aguarda o browser finalizar o layout antes de medir posições.
       setTimeout 0 garante execução após o paint inicial. */
    setTimeout(function () {
      if (itemAtivo) moverPillMobile(itemAtivo, false);
    }, 0);

    /* Move o pill para o elemento alvo */
    function moverPillMobile(alvo, animar) {
      var isCta = alvo.classList.contains('is-cta');
      var track     = document.getElementById('jello-track');
      var trackRect = track.getBoundingClientRect();
      var alvoRect  = alvo.getBoundingClientRect();
      var novoLeft  = (alvoRect.left - trackRect.left) + 'px';
      var novoWidth = alvoRect.width + 'px';

      jelloPill.classList.toggle('cta-pill', isCta);

      if (animar) {
        /* Posiciona com transição + jello */
        jelloPill.style.left  = novoLeft;
        jelloPill.style.width = novoWidth;
        jelloPill.classList.remove('jello-go');
        void jelloPill.offsetWidth; /* força reflow para reiniciar animação */
        jelloPill.classList.add('jello-go');
      } else {
        /* Posicionamento instantâneo: desativa transição, move, restaura */
        jelloPill.style.transition = 'none';
        void jelloPill.offsetWidth;
        jelloPill.style.left  = novoLeft;
        jelloPill.style.width = novoWidth;
        void jelloPill.offsetWidth;
        jelloPill.style.transition = '';
      }
    }

    /* Clique/tap em item */
    jelloItens.forEach(function (item) {
      function ativar() {
        /* Remove ativo anterior */
        jelloItens.forEach(function (i) { i.classList.remove('is-active'); });
        item.classList.add('is-active');
        moverPillMobile(item, true);
      }
      item.addEventListener('touchstart', ativar, { passive: true });
      item.addEventListener('click',      ativar);
    });

    /* Reposiciona o pill ao redimensionar */
    window.addEventListener('resize', function () {
      var ativo = document.querySelector('.jello-item.is-active');
      if (ativo) moverPillMobile(ativo, false);
    }, { passive: true });
  }

  /* ════════════════════════════════════════════════════════════
     DESKTOP — .nav-links-pill
  ════════════════════════════════════════════════════════════ */
  var navLinks    = document.querySelector('.nav-links');
  var desktopPill = document.getElementById('nav-links-pill');
  if (!navLinks || !desktopPill) return;

  var liItems = navLinks.querySelectorAll('li');
  var sairTimer = null;

  /* Marca link da página atual e posiciona pill.
     Compara href sem hash para evitar falsos positivos em
     links de âncora (ex: index.html#mission). */
  var linkAtivado = null;
  navLinks.querySelectorAll('a').forEach(function (a) {
    var href      = a.getAttribute('href') || '';
    var paginaHref = href.split('#')[0].split('/').pop() || 'index.html';
    var temHash    = href.indexOf('#') !== -1;
    /* Só marca ativo se for a mesma página E não tiver hash */
    if (paginaHref === paginaAtual && !temHash && !linkAtivado) {
      linkAtivado = a;
      a.style.color      = '#1A3312';
      a.style.fontWeight = '700';
      setTimeout(function () {
        posicionarPillDesktop(a.parentElement, false);
      }, 80);
    }
  });

  function posicionarPillDesktop(li, animar) {
    var wrap = document.querySelector('.nav-links-wrap');
    if (!wrap) return;
    var wrapRect  = wrap.getBoundingClientRect();
    var liRect    = li.getBoundingClientRect();
    var novoLeft  = (liRect.left - wrapRect.left) + 'px';
    var novoWidth = liRect.width + 'px';

    if (animar) {
      desktopPill.style.left    = novoLeft;
      desktopPill.style.width   = novoWidth;
      desktopPill.style.opacity = '1';
      desktopPill.classList.remove('jello-go');
      void desktopPill.offsetWidth;
      desktopPill.classList.add('jello-go');
    } else {
      /* Posicionamento instantâneo: sem transição */
      desktopPill.style.transition = 'none';
      void desktopPill.offsetWidth;
      desktopPill.style.left    = novoLeft;
      desktopPill.style.width   = novoWidth;
      desktopPill.style.opacity = '1';
      void desktopPill.offsetWidth;
      desktopPill.style.transition = '';
    }
  }

  liItems.forEach(function (li) {
    li.addEventListener('mouseenter', function () {
      clearTimeout(sairTimer);
      posicionarPillDesktop(li, true);
      /* Cor do link */
      var a = li.querySelector('a');
      if (a) a.style.color = '#1A3312';
    });

    li.addEventListener('mouseleave', function () {
      var a = li.querySelector('a');
      var href = a ? (a.getAttribute('href') || '').split('/').pop().split('#')[0] : '';
      /* Restaura cor se não for a página ativa */
      if (a && href !== paginaAtual) a.style.color = '';
    });
  });

  navLinks.addEventListener('mouseleave', function () {
    sairTimer = setTimeout(function () {
      /* Volta pill para o item ativo, ou oculta se não houver */
      if (linkAtivado) {
        posicionarPillDesktop(linkAtivado.parentElement, true);
      } else {
        desktopPill.style.opacity = '0';
      }
    }, 200);
  });

  /* ════════════════════════════════════════════════════════════
     SINCRONIZAÇÃO POR SCROLL

     Ao rolar a página, detecta qual seção está mais próxima
     do topo visível e atualiza AMBAS as navs simultaneamente:
     - Desktop: pill jello desliza para o link correspondente
     - Mobile:  link no drawer recebe destaque visual

     Funciona sem reload — as duas navs se comunicam em tempo real.
  ════════════════════════════════════════════════════════════ */

  /* Só ativa na index.html (única página com seções internas) */
  if (paginaAtual !== 'index.html' && paginaAtual !== '') return;

  /* Injeção do estilo do drawer ativo (uma única vez) */
  if (!document.getElementById('drawer-active-style')) {
    var st = document.createElement('style');
    st.id  = 'drawer-active-style';
    st.textContent =
      '.nav-drawer-link.drawer-active{' +
        'color:#1A3312!important;' +
        'font-weight:700!important;' +
        'background:rgba(26,51,18,0.06)!important;' +
      '}';
    document.head.appendChild(st);
  }

  /* Mapa: id da seção → href exato do link no desktop/drawer */
  var secaoParaHref = {
    'hero':    'index.html',
    'mission': 'index.html#mission',
    'how':     'index.html#how'
  };
  var secaoIds  = ['hero', 'mission', 'how'];
  var secaoAtiva = '';

  /* Detecta qual seção está mais próxima do centro superior da viewport */
  function detectarSecaoAtiva() {
    var alturaNav  = 80; /* altura aprox. da navbar fixa */
    var referencia = alturaNav + window.innerHeight * 0.25;
    var melhorId   = '';
    var melhorDist = Infinity;

    secaoIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var rect = el.getBoundingClientRect();
      /* Considera seções que já passaram do topo ou estão próximas */
      var dist = Math.abs(rect.top - referencia);
      if (rect.top <= referencia + el.offsetHeight && dist < melhorDist) {
        melhorDist = dist;
        melhorId   = id;
      }
    });
    return melhorId;
  }

  /* Atualiza desktop (pill) e mobile (drawer) simultaneamente */
  function sincronizarNavs(hrefAtivo) {
    /* Desktop — move o pill para o li correspondente */
    var liAlvo = null;
    liItems.forEach(function (li) {
      var a    = li.querySelector('a');
      var href = a ? (a.getAttribute('href') || '') : '';
      if (href === hrefAtivo) {
        liAlvo = li;
        if (a) { a.style.color = '#1A3312'; a.style.fontWeight = '700'; }
      } else {
        if (a) { a.style.color = ''; a.style.fontWeight = ''; }
      }
    });
    if (liAlvo) posicionarPillDesktop(liAlvo, true);

    /* Mobile — drawer links */
    document.querySelectorAll('.nav-drawer-link').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href === hrefAtivo) {
        a.classList.add('drawer-active');
      } else {
        a.classList.remove('drawer-active');
      }
    });
  }

  /* Listener de scroll com throttle via requestAnimationFrame.
     Registrado em window, document E documentElement para cobrir
     diferentes comportamentos de scroll entre browsers/ambientes. */
  var scrollPendente = false;
  function aoRolar() {
    if (scrollPendente) return;
    scrollPendente = true;
    requestAnimationFrame(function () {
      scrollPendente = false;
      var novaSecao = detectarSecaoAtiva();
      if (novaSecao && novaSecao !== secaoAtiva && secaoParaHref[novaSecao]) {
        secaoAtiva = novaSecao;
        sincronizarNavs(secaoParaHref[novaSecao]);
      }
    });
  }

  window.addEventListener('scroll',                  aoRolar, { passive: true });
  document.addEventListener('scroll',                aoRolar, { passive: true });
  document.documentElement.addEventListener('scroll', aoRolar, { passive: true });

  /* Dispara uma vez ao carregar para posição inicial correta */
  setTimeout(function () {
    var secaoInicial = detectarSecaoAtiva();
    if (secaoInicial && secaoParaHref[secaoInicial]) {
      secaoAtiva = secaoInicial;
      sincronizarNavs(secaoParaHref[secaoInicial]);
    }
  }, 150);
}

/*
  Gera um ID único baseado no timestamp + número aleatório.
  
  Exemplo de retorno: "1710516000000-a3f7"
  
  Usado para criar IDs de doações, famílias, etc.
*/
function gerarId() {
  return (
    Date.now().toString() + "-" + Math.random().toString(36).substring(2, 6)
  );
  /*
    Date.now() = timestamp atual (ex: 1710516000000)
    Math.random() = número aleatório entre 0 e 1
    .toString(36) = converte para base 36 (0-9 + a-z)
    .substring(2, 6) = pega 4 caracteres aleatórios (ex: "a3f7")
    Combinação: praticamente impossível de colidir!
  */
}
window.gerarId = gerarId;

/*
  Trunca um texto para um comprimento máximo, adicionando "..." no final.
  
  Exemplos:
  truncar("Texto muito longo aqui", 15) → "Texto muito lon..."
  truncar("Curto", 20) → "Curto"
*/
function truncar(texto, maxChars) {
  if (!texto) return "";
  if (texto.length <= maxChars) return texto;
  return texto.substring(0, maxChars) + "...";
}
window.truncar = truncar;

/*
  Debounce: adia a execução de uma função até que o usuário
  pare de chamar ela por X milissegundos.
  
  Muito útil para campos de busca:
  sem debounce → procura a cada tecla digitada (caro!)
  com debounce  → procura só quando o usuário parar de digitar
  
  Exemplo de uso:
  var buscaComDebounce = debounce(buscarDados, 300);
  input.addEventListener('input', buscaComDebounce);
*/
function debounce(funcao, espera) {
  var timeout;
  return function () {
    var contexto = this;
    var args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      funcao.apply(contexto, args);
      /*
        .apply(contexto, args) = chama a função com o 'this' correto
        e os argumentos originais.
      */
    }, espera);
  };
}
window.debounce = debounce;

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 10 — ANIMAÇÃO DE CONTAGEM (Counter Animation)
   
   Anima um número de 0 até o valor final suavemente.
   Muito usado em dashboards e páginas de estatísticas.
   ══════════════════════════════════════════════════════════════════════ */

/*
  animarContador(idElemento, valorFinal, sufixo, duracao)
  
  Parâmetros:
  - idElemento : string  — ID do elemento HTML
  - valorFinal : number  — número até onde animar
  - sufixo     : string  — texto após o número (ex: 'kg', '%')
  - duracao    : number  — duração em ms (padrão: 1200)
*/
function animarContador(idElemento, valorFinal, sufixo, duracao) {
  var el = document.getElementById(idElemento);
  if (!el) return;

  var suf = sufixo || "";
  var dur = duracao || 1200;
  var inicio = performance.now();

  function frame(agora) {
    /* Progresso: de 0 (início) a 1 (fim) */
    var progresso = Math.min((agora - inicio) / dur, 1);

    /*
      Easing cúbico "ease out":
      f(t) = 1 - (1-t)³
      
      t = 0 → f(0) = 0    (começa do zero)
      t = 0.5 → f(0.5) = 0.875  (já está 87.5% na metade do tempo)
      t = 1 → f(1) = 1    (termina em 1)
      
      O número cresce rápido no início e desacelera no final.
      Parece muito mais natural do que crescimento linear.
    */
    var easedProgress = 1 - Math.pow(1 - progresso, 3);

    /* Valor atual baseado no progresso */
    var valorAtual = Math.round(easedProgress * valorFinal);

    /* Formata com separador de milhar se necessário */
    el.innerHTML =
      (valorAtual >= 1000 ? valorAtual.toLocaleString("pt-BR") : valorAtual) +
      (suf ? "<small>" + suf + "</small>" : "");

    /* Continua animando se não chegou ao fim */
    if (progresso < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}
window.animarContador = animarContador;

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 11 — MODAL GENÉRICO
   
   Funções para abrir e fechar modais de qualquer página.
   ══════════════════════════════════════════════════════════════════════ */

function abrirModal(idModal) {
  var modal = document.getElementById(idModal);
  if (!modal) return;

  modal.classList.add("open");
  document.body.style.overflow = "hidden"; /* Impede scroll da página */

  /*
    Foca no primeiro campo interativo dentro do modal.
    Boa prática de acessibilidade: usuários de teclado/leitor de tela
    são levados diretamente ao conteúdo do modal.
  */
  setTimeout(function () {
    var primeiroInterativo = modal.querySelector(
      'input:not([type="hidden"]), select, textarea, button:not(.modal-close)',
    );
    if (primeiroInterativo) primeiroInterativo.focus();
  }, 100);
}

function fecharModal(idModal) {
  var modal = document.getElementById(idModal);
  if (!modal) return;

  modal.classList.remove("open");
  document.body.style.overflow = ""; /* Restaura scroll */
}

/* Fecha modal ao pressionar ESC */
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    var modalAberto = document.querySelector(".modal-overlay.open");
    if (modalAberto) fecharModal(modalAberto.id);
  }
});

/* Fecha modal ao clicar no fundo (overlay) */
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("modal-overlay")) {
    fecharModal(e.target.id);
  }
});

window.abrirModal = abrirModal;
window.fecharModal = fecharModal;

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 12 — SCROLL SUAVE PARA ÂNCORAS

   Links como href="#section" rolam suavemente para a seção.
   O CSS já tem scroll-behavior: smooth, mas esta função
   adiciona um offset para compensar a navbar fixa.
   ══════════════════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var alvo = document.querySelector(this.getAttribute("href"));
      if (!alvo) return;

      e.preventDefault(); /* Impede o comportamento padrão */

      var navAltura = 80; /* Altura aproximada da navbar */
      var posicaoAlvo =
        alvo.getBoundingClientRect().top + window.scrollY - navAltura;
      /*
        getBoundingClientRect().top = posição do elemento
        relativa à janela visível (não à página inteira).
        window.scrollY = quanto já foi rolado.
        Soma dos dois = posição absoluta na página.
        Subtraímos a altura da navbar para não ficar escondido.
      */

      window.scrollTo({ top: posicaoAlvo, behavior: "smooth" });

      /* Fecha o drawer mobile se estiver aberto */
      fecharDrawer();
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 13 — DETECÇÃO DE PREFERÊNCIAS DO USUÁRIO
   ══════════════════════════════════════════════════════════════════════ */

/*
  Verifica se o usuário prefere tema escuro.
  Retorna: true ou false
*/
function prefereEscuro() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/*
  Verifica se o usuário prefere menos animações.
  Retorna: true ou false
*/
function prefereReduzirMovimento() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

window.prefereEscuro = prefereEscuro;
window.prefereReduzirMovimento = prefereReduzirMovimento;

/* ══════════════════════════════════════════════════════════════════════
   FUNDO DE ONDAS — Padrão geométrico abstrato com linhas verdes
   Inspirado no estilo "Abstract Geometric Landing Page".
   Desenhado em <canvas> para performance e escalabilidade.
   Só é ativado nas páginas públicas (não no admin).
   ══════════════════════════════════════════════════════════════════════ */
function inicializarFundoOndas() {
  /* Pula a execução no painel admin */
  if (document.querySelector('link[href*="admin.css"]')) return;

  /* Cria o canvas e posiciona como camada de fundo */
  var canvas = document.createElement("canvas");
  canvas.id = "wave-bg";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.zIndex = "0";
  canvas.style.pointerEvents = "none";
  document.body.insertBefore(canvas, document.body.firstChild);

  function render() {
    var W = (canvas.width = window.innerWidth);
    var H = (canvas.height = window.innerHeight);
    var ctx = canvas.getContext("2d");

    /* Fundo creme — o canvas substitui o background do body */
    ctx.fillStyle = "#faf9f5";
    ctx.fillRect(0, 0, W, H);

    var N = 42; /* número de linhas de onda */

    for (var i = 0; i < N; i++) {
      var t = i / (N - 1); /* 0 → 1 */
      var yBase = t * H; /* posição vertical da linha */
      var phase = t * Math.PI * 2.8; /* fase da onda varia por linha */
      var amp = H * 0.025 + t * H * 0.055; /* amplitude cresce para baixo */
      var freq = 0.006 + t * 0.003; /* frequência da onda */
      var alpha = 0.03 + t * 0.11; /* mais visível na parte inferior */

      ctx.beginPath();
      ctx.strokeStyle = "rgba(74,138,57," + alpha + ")";
      ctx.lineWidth = 0.75;

      for (var x = 0; x <= W; x += 3) {
        /* Envelope: onda mais intensa no centro-direita (como na imagem) */
        var envX = Math.sin((x / W) * Math.PI * 0.85 + 0.15);
        var envY = 1 + Math.sin((x / W) * Math.PI * 1.5) * 0.4;
        var y =
          yBase +
          Math.sin(x * freq + phase) * amp * envX +
          Math.sin(x * freq * 0.5 + phase * 0.7) * amp * 0.35 * envY;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  }

  render();

  /* Redesenha ao redimensionar a janela (debounce de 150ms) */
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO — EFEITO RIPPLE NOS BOTÕES
   Cria uma onda que se expande a partir do ponto de clique.
   ══════════════════════════════════════════════════════════════════════ */
function inicializarRipplesBotoes() {
  var SELETORES = [
    '.btn', '.doa-confirm-btn', '.doa-back-btn',
    '.fcard-order-btn', '.fcard-add-btn',
    '.fcard-btn-minus', '.fcard-btn-plus',
    '.vf-btn', '.orac-btn',
    '.receipt-act-btn', '.cart-bar-btn'
  ].join(', ');

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest(SELETORES) : null;
    if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;

    var r    = btn.getBoundingClientRect();
    var size = Math.max(r.width, r.height) * 2;
    var x    = e.clientX - r.left - size * 0.5;
    var y    = e.clientY - r.top  - size * 0.5;
    /* Ripple branco para fundos escuros/coloridos, verde suave para outline */
    var cor  = btn.classList.contains('btn-outline')
               ? 'rgba(90,138,74,0.20)'
               : 'rgba(255,255,255,0.30)';

    var ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.cssText =
      'width:'  + size + 'px;' +
      'height:' + size + 'px;' +
      'left:'   + x    + 'px;' +
      'top:'    + y    + 'px;' +
      'background:' + cor + ';';

    /* Garante position:relative e overflow:hidden caso o botão não herde do .btn */
    var cs = window.getComputedStyle(btn);
    if (cs.position === 'static') btn.style.position = 'relative';
    if (cs.overflow !== 'hidden') btn.style.overflow = 'hidden';

    btn.appendChild(ripple);
    setTimeout(function () {
      if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }, 600);
  });
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 14 — PWA (Instalar no Celular)

   registrarServiceWorker() : ativa o sw.js — pré-requisito do Chrome/
     Edge/Android para considerar o site "instalável".
   inicializarInstalarApp() : controla os botões ".btn-install-app"
     (um no menu desktop, outro no drawer mobile — ver navbar.html).

   Chamada duas vezes de propósito: uma no DOMContentLoaded (cobre
   páginas com #nav já no HTML) e outra após a injeção do navbar.html
   via fetch (cobre todas as outras, onde os botões só existem depois
   da injeção assíncrona).
   ══════════════════════════════════════════════════════════════════════ */
function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () {
    /*
      Caminho RELATIVO (sem "/" no início) de propósito: o site roda em
      GitHub Pages dentro de uma subpasta (ex: usuario.github.io/repo/).
      Um caminho absoluto "/sw.js" resolveria para a raiz do domínio
      (404) e o navegador nunca registraria o Service Worker — sem ele,
      o Chrome não oferece "Instalar app", só "Criar atalho" (sem ícone).
    */
    navigator.serviceWorker.register("sw.js").catch(function (erro) {
      console.error("[DoaVida] Falha ao registrar Service Worker:", erro);
    });
  });
}

/* Guarda o evento beforeinstallprompt para disparar depois, no clique do botão */
var _deferredInstallPrompt = null;

function inicializarInstalarApp() {
  var botoes = document.querySelectorAll(".btn-install-app");
  if (!botoes.length) return;

  /* App já instalado (aberto em modo standalone) → nunca mostra o botão */
  var jaInstalado =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (jaInstalado) return;

  var ehIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  /* Botão sempre visível (em vez de esperar o "beforeinstallprompt",
     que o Chrome só dispara quando critérios estritos de instalabilidade
     são atendidos — e nunca dispara em Firefox/Safari/abertura local).
     Os botões já são <a href> para o site publicado: funcionam como
     link de download/instalação mesmo quando não há prompt nativo. */
  botoes.forEach(function (b) { b.hidden = false; });

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); /* impede o mini-infobar automático do Chrome */
    _deferredInstallPrompt = e;
  });

  botoes.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      if (_deferredInstallPrompt) {
        e.preventDefault(); /* usa o prompt nativo em vez de navegar pelo href */
        _deferredInstallPrompt.prompt();
        _deferredInstallPrompt.userChoice.then(function () {
          _deferredInstallPrompt = null;
        });
      } else if (ehIOS) {
        e.preventDefault(); /* Safari não tem prompt nem instala via link */
        abrirModal("modal-instalar-ios"); /* guia visual — ver #modal-instalar-ios em navbar.html */
      }
      /* Sem prompt nativo disponível (ex: Firefox/desktop, navegador
         sem suporte, ou esta página aberta fora do domínio HTTPS de
         produção) → deixa o link seguir normalmente até o site
         publicado, onde o Service Worker e o manifest garantem que a
         instalação funciona de fato. */
    });
  });

  window.addEventListener("appinstalled", function () {
    botoes.forEach(function (b) { b.hidden = true; });
    _deferredInstallPrompt = null;
  });
}

/* ══════════════════════════════════════════════════════════════════════
   TECLADO MOBILE — evita que barras fixas (ex: "Continuar"/"Confirmar
   doação") cubram o campo em foco quando o teclado virtual abre.

   PROBLEMA: barras com position:fixed; bottom:0 são ancoradas na
   viewport de LAYOUT, que em vários Android/iOS não encolhe junto com
   o teclado (só a viewport VISUAL encolhe). Resultado: a barra fica
   flutuando sobre o teclado ou "no meio da tela", cobrindo o campo
   que o usuário está preenchendo.

   SOLUÇÃO: ao focar um campo de texto no mobile, escondemos essas
   barras (translateY + opacity, sem alterar o design — elas voltam
   exatamente iguais ao perder o foco) e rolamos o campo focado para
   o centro da área visível. window.visualViewport é a única API que
   informa corretamente a altura realmente visível em Chrome e Safari.
   ══════════════════════════════════════════════════════════════════════ */
function inicializarTecladoMobile() {
  var SELETOR_BARRAS_FIXAS =
    ".cart-bar-fixa, .rs2-bottom-bar, .cf-bottom-bar, .vfc-actions-bar";
  var LIMIAR_TECLADO_PX = 120; /* diferença mínima p/ considerar o teclado aberto */
  var campoComFoco = null;

  function ehCampoDeTexto(el) {
    if (!el) return false;
    if (el.tagName === "TEXTAREA") return true;
    if (el.tagName === "INPUT") {
      var tipo = (el.getAttribute("type") || "text").toLowerCase();
      return (
        ["text", "tel", "email", "number", "search", "password", "url", "date"].indexOf(tipo) !== -1
      );
    }
    return false;
  }

  function tecladoProvavelmenteAberto() {
    /* Sem suporte à API: assume o pior caso (esconde a barra por segurança) */
    if (!window.visualViewport) return true;
    return window.innerHeight - window.visualViewport.height > LIMIAR_TECLADO_PX;
  }

  function atualizarBarrasFixas() {
    var esconder = !!campoComFoco && tecladoProvavelmenteAberto();
    var barras = document.querySelectorAll(SELETOR_BARRAS_FIXAS);
    for (var i = 0; i < barras.length; i++) {
      barras[i].classList.toggle("kb-hidden", esconder);
    }
  }

  document.addEventListener("focusin", function (e) {
    if (!ehCampoDeTexto(e.target)) return;
    campoComFoco = e.target;
    atualizarBarrasFixas();
    /* Aguarda a animação do teclado abrir antes de rolar até o campo */
    setTimeout(function () {
      if (document.activeElement === e.target && e.target.scrollIntoView) {
        e.target.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 320);
  });

  document.addEventListener("focusout", function (e) {
    if (e.target !== campoComFoco) return;
    /* Pequeno atraso: ao trocar de campo com Tab/Próximo, o focusin do
       novo campo já deve ter disparado antes de decidirmos restaurar
       a barra, evitando o "flash" de ela reaparecer e desaparecer. */
    setTimeout(function () {
      if (!ehCampoDeTexto(document.activeElement)) {
        campoComFoco = null;
        atualizarBarrasFixas();
      }
    }, 60);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", atualizarBarrasFixas);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   LOG FINAL
   ══════════════════════════════════════════════════════════════════════ */
console.log("[DoaVida] app.js ✅ carregado");
