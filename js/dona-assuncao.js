/*
  Chat Dona Assuncao
  Assistente publica da Acao Social Semear.
*/
(function () {
  "use strict";

  var DONA_DEFAULTS = {
    active: true,
    displayName: "Dona Assunção",
    subtitle: "Ação Social Semear",
    avatarUrl: "img/dona-fab.jpeg",
    greeting:
      "Olá! Eu sou a Dona Assunção, da Ação Social Semear. Estou aqui para te ajudar com doações, cesta básica, voluntariado e informações da nossa missão.\nComo posso te ajudar hoje?",
    fallback:
      "Ainda não tenho essa resposta certinha. Posso te ajudar com cesta básica, doações, voluntariado, horário, endereço ou contato pelo WhatsApp.",
    humanHandoff:
      "Se for urgente, fale diretamente com nossa equipe pelo WhatsApp.",
  };

  var state = {
    config: Object.assign({}, DONA_DEFAULTS),
    opened: false,
    name: localStorage.getItem("dona_assuncao_nome") || "",
    userId: getOrCreateUserId(),
    lastIntent: "",
    remoteKnowledge: [],
    whatsappPhone: "",
    backendUrl: "",
  };

  var QUICK_DEFAULT = [
    ["Como receber cesta básica", "Como receber cesta básica"],
    ["Quero fazer uma doação", "Quero fazer uma doação"],
    ["Quero ser voluntário", "Quero ser voluntário"],
    ["Horário de atendimento", "Horário de atendimento"],
    ["Outras dúvidas", "Outras dúvidas"],
  ];

  var QUICK_BY_INTENT = {
    cesta_basica: [
      ["Preencher cadastro", "Quero preencher o cadastro da cesta"],
      ["Quem pode receber?", "Quem pode receber cesta básica?"],
      ["Documentos", "Quais documentos preciso para cesta básica?"],
      ["Falar com equipe", "Quero falar com a equipe"],
    ],
    doacao: [
      ["Doar alimentos", "Quero doar alimentos"],
      ["Como entregar?", "Como posso entregar minha doação?"],
      ["Comprovante", "Recebo comprovante da doação?"],
      ["Ser voluntário", "Quero ser voluntário"],
    ],
    voluntario: [
      ["Cadastrar", "Quero me cadastrar como voluntário"],
      ["Tipos de ajuda", "Quais formas de voluntariado existem?"],
      ["Horários", "Quais horários posso ajudar?"],
      ["Doar alimentos", "Quero fazer uma doação"],
    ],
    contato: [
      ["WhatsApp", "Quero falar no WhatsApp"],
      ["Endereço", "Onde fica a sede?"],
      ["Horário", "Horário de atendimento"],
      ["Missão", "O que é a Ação Social Semear?"],
    ],
  };

  // Atalhos de sugestão (QUICK_BY_INTENT) mandam um texto fixo e conhecido —
  // por isso respondem por correspondência exata aqui, sem depender do
  // matching difuso de LOCAL_TOPICS (que pode escolher um tópico mais
  // genérico concorrente, como "cesta_basica", para essa mesma frase).
  // "menu" mantém o submenu de sugestões aberto após a resposta.
  var QUICK_REPLY_OVERRIDES = {
    "Quem pode receber cesta básica?": { topic: "quem_pode_receber", menu: "cesta_basica" },
    "Quais documentos preciso para cesta básica?": { topic: "documentos_cesta", menu: "cesta_basica" },
    "Quero falar com a equipe": { topic: "contato", menu: "contato" },
  };

  var LOCAL_TOPICS = {
    recusa: {
      priority: 100,
      keywords: [
        "codigo",
        "programacao",
        "javascript",
        "html",
        "css",
        "admin",
        "senha",
        "login",
        "banco de dados",
        "database",
        "api",
        "cpf",
        "dados pessoais",
      ],
      answer:
        "Essa parte técnica e administrativa fica com a equipe responsável. Eu posso te orientar sobre doações, cesta básica, voluntariado, horários, endereço e contato com a Ação Social Semear.",
    },
    cesta_basica: {
      priority: 90,
      keywords: [
        "cesta",
        "cesta basica",
        "receber cesta",
        "quero cesta",
        "preciso de cesta",
        "solicitar cesta",
        "ganhar cesta",
        "receber alimento",
        "receber alimentos",
        "vulnerabilidade",
        "familia precisa",
      ],
      answer:
        "Para solicitar uma cesta básica, a família precisa fazer um cadastro social simples. Em geral, verificamos:\n\n- situação de vulnerabilidade\n- residência em Belém/PA ou região atendida\n- telefone para contato\n- dados da família e endereço\n\nDepois do cadastro, a equipe analisa a solicitação e entra em contato conforme a disponibilidade das cestas.",
      ctas: [{ label: "Preencher formulário", href: "cesta-form.html", icon: "fa-regular fa-pen-to-square" }],
    },
    quem_pode_receber: {
      priority: 88,
      keywords: [
        "quem pode receber",
        "quem tem direito",
        "quem pode pedir",
        "quem pode solicitar",
        "criterio",
        "critério",
        "criterios",
        "critérios",
        "quem se qualifica",
      ],
      answer:
        "Damos prioridade a famílias em situação de vulnerabilidade social, moradoras de Belém/PA ou região atendida. Não há uma lista fechada e rígida — cada caso é avaliado pela equipe no cadastro, com carinho e atenção à realidade de cada família.",
      ctas: [{ label: "Preencher formulário", href: "cesta-form.html", icon: "fa-regular fa-pen-to-square" }],
    },
    documentos_cesta: {
      priority: 88,
      keywords: [
        "documento",
        "documentos",
        "documentacao",
        "documentação",
        "preciso de documento",
        "que documentos",
        "quais documentos",
      ],
      answer:
        "No cadastro pedimos dados básicos: nome completo, endereço, contato e informações da família. Documentos específicos (se forem necessários) a equipe confirma durante a análise, conforme a situação de cada família — não exigimos nada complicado de cara.",
      ctas: [{ label: "Preencher formulário", href: "cesta-form.html", icon: "fa-regular fa-pen-to-square" }],
    },
    doacao: {
      priority: 85,
      keywords: [
        "doar",
        "doacao",
        "doação",
        "alimento",
        "alimentos",
        "contribuir",
        "arroz",
        "feijao",
        "feijão",
        "leite",
        "macarrao",
        "macarrão",
        "oleo",
        "óleo",
        "quero doar",
      ],
      answer:
        "Que gesto importante. Para doar, você pode registrar os alimentos no formulário do site. Isso ajuda nossa equipe a organizar estoque, retirada, entrega e comprovante.\n\nVocê escolhe os itens, informa a quantidade e deixa um contato para combinarmos os próximos passos.",
      ctas: [{ label: "Quero doar", href: "form.html", icon: "fa-solid fa-heart" }],
    },
    voluntario: {
      priority: 82,
      keywords: [
        "voluntario",
        "voluntário",
        "voluntaria",
        "voluntária",
        "ajudar",
        "participar",
        "servir",
        "trabalho voluntario",
        "me cadastrar",
        "cadastro voluntario",
      ],
      answer:
        "Você pode ajudar de várias formas: triagem de alimentos, montagem de cestas, entrega, logística, divulgação e apoio espiritual.\n\nO cadastro informa sua disponibilidade e o tipo de ajuda que você consegue oferecer. A equipe entra em contato quando houver uma ação compatível.",
      ctas: [{ label: "Cadastro de voluntário", href: "voluntario-form.html", icon: "fa-solid fa-hands-helping" }],
    },
    horario: {
      priority: 70,
      keywords: [
        "horario",
        "horário",
        "que horas",
        "quando abre",
        "quando fecha",
        "funcionamento",
        "atendimento",
        "dias",
      ],
      answer:
        "O atendimento costuma acontecer de segunda a sexta, das 8h às 17h, e aos sábados pela manhã quando há ações programadas.\n\nAs doações e cadastros pelo site podem ser feitos a qualquer hora. Para visita presencial, é melhor confirmar antes com a equipe.",
    },
    localizacao: {
      priority: 70,
      keywords: [
        "onde fica",
        "endereco",
        "endereço",
        "localizacao",
        "localização",
        "como chegar",
        "belem",
        "belém",
        "sede",
        "maanaim",
      ],
      answer:
        "Estamos em Belém, PA, com apoio da Comunidade Evangélica Maanaim. Para evitar desencontro, confirme o endereço e o melhor horário antes de ir presencialmente.",
    },
    contato: {
      priority: 70,
      keywords: [
        "contato",
        "whatsapp",
        "telefone",
        "falar com",
        "fale conosco",
        "ligar",
        "mensagem",
        "instagram",
      ],
      answer:
        "O caminho mais rápido é falar com a equipe pelo WhatsApp. Se o contato estiver configurado no painel, deixo o botão aqui embaixo para abrir a conversa com uma mensagem pronta.",
    },
    missao: {
      priority: 65,
      keywords: [
        "missao",
        "missão",
        "quem sao",
        "quem são",
        "sobre voces",
        "sobre vocês",
        "semear",
        "acao social",
        "ação social",
        "o que fazem",
        "historia",
        "história",
      ],
      answer:
        "A Ação Social Semear trabalha para levar alimento, cuidado e esperança a famílias em situação de vulnerabilidade em Belém, PA.\n\nCada doação vira organização de estoque, montagem de cesta e atendimento feito com respeito. A missão é simples: servir pessoas com dignidade e amor ao próximo.",
    },
    como_funciona: {
      priority: 62,
      keywords: [
        "como funciona",
        "sistema",
        "passo a passo",
        "processo",
        "etapas",
        "explica",
        "como faz",
        "comprovante",
      ],
      answer:
        "Funciona assim:\n\n1. A pessoa registra uma doação, pedido de cesta ou cadastro de voluntário.\n2. A equipe recebe as informações e organiza o atendimento.\n3. Os voluntários separam, montam e acompanham as ações.\n4. As famílias são atendidas conforme análise e disponibilidade.\n\nO sistema ajuda a manter tudo registrado e mais organizado.",
    },
    galeria: {
      priority: 55,
      keywords: ["galeria", "foto", "fotos", "imagem", "imagens", "video", "vídeo", "registros"],
      answer:
        "Na galeria ficam os registros das ações: voluntários, doações, entregas e momentos da comunidade. É uma forma de acompanhar o impacto do trabalho.",
      ctas: [{ label: "Ver galeria", href: "gallery.html", icon: "fa-regular fa-images" }],
    },
    oracao: {
      priority: 52,
      keywords: [
        "oracao",
        "oração",
        "orar",
        "interceder",
        "pedido de oracao",
        "pedido de oração",
        "fe",
        "fé",
        "deus",
        "jesus",
      ],
      answer:
        "A oração também faz parte da missão. Você pode deixar um pedido ou se cadastrar para apoiar espiritualmente as famílias, os voluntários e as ações.",
      ctas: [{ label: "Apoio espiritual", href: "voluntario-form.html?tipo=intercessao", icon: "fa-solid fa-hands-praying" }],
    },
    saudacao: {
      priority: 30,
      keywords: ["oi", "ola", "olá", "bom dia", "boa tarde", "boa noite", "tudo bem", "salve"],
      answer:
        "Olá! Que bom te receber por aqui. Posso te ajudar com cesta básica, doações, voluntariado, horário de atendimento, endereço ou contato com a equipe.",
    },
    agradecimento: {
      priority: 30,
      keywords: ["obrigado", "obrigada", "valeu", "agradeco", "agradeço", "muito obrigado"],
      answer:
        "Eu que agradeço pela visita. Que Deus abençoe você e sua família. Quando precisar, é só chamar por aqui.",
    },
    despedida: {
      priority: 30,
      keywords: ["tchau", "ate mais", "até mais", "ate logo", "até logo", "falou", "bye"],
      answer:
        "Até mais. Que Deus te guarde. Volte sempre que precisar falar com a Ação Social Semear.",
    },
  };

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getOrCreateUserId() {
    try {
      var key = "dona_assuncao_user_id";
      var saved = localStorage.getItem(key);
      if (saved) return saved;
      var id =
        "web_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 10);
      localStorage.setItem(key, id);
      return id;
    } catch (e) {
      return "web_" + Date.now().toString(36);
    }
  }

  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderMarkdown(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  function nowTime() {
    return new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function detectName(text) {
    var patterns = [
      /meu nome (?:é|e) ([a-záàâãéêíóôõúüçñ]{3,})/i,
      /me chamo ([a-záàâãéêíóôõúüçñ]{3,})/i,
      /pode me chamar de ([a-záàâãéêíóôõúüçñ]{3,})/i,
      /sou (?:o|a)?\s*([a-záàâãéêíóôõúüçñ]{3,})$/i,
    ];
    for (var i = 0; i < patterns.length; i++) {
      var match = String(text || "").trim().match(patterns[i]);
      if (match && match[1]) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      }
    }
    return "";
  }

  function scoreTopic(query, topic) {
    var q = normalize(query);
    var score = 0;
    (topic.keywords || []).forEach(function (kw) {
      var k = normalize(kw);
      if (!k) return;
      if (q === k) score += 10;
      else if (q.indexOf(k) >= 0) score += k.indexOf(" ") >= 0 ? 7 : 4;
    });
    return score + (topic.priority || 0) / 100;
  }

  function matchLocal(query) {
    var bestKey = "fallback";
    var bestScore = 0;
    Object.keys(LOCAL_TOPICS).forEach(function (key) {
      var score = scoreTopic(query, LOCAL_TOPICS[key]);
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    });
    if (bestScore < 4) return null;
    var topic = LOCAL_TOPICS[bestKey];
    return {
      intent: bestKey,
      answer: topic.answer,
      ctas: topic.ctas || [],
      source: "local",
    };
  }

  function matchRemote(query) {
    if (!state.remoteKnowledge.length) return null;
    var q = normalize(query);
    var qTokens = q.split(/\s+/).filter(function (token) {
      return token.length >= 3;
    });
    var best = null;
    var bestScore = 0;

    state.remoteKnowledge.forEach(function (item) {
      var score = 0;
      var keywords = Array.isArray(item.keywords)
        ? item.keywords
        : String(item.keywords || "").split(",");
      keywords.forEach(function (kw) {
        var k = normalize(kw);
        if (k && q.indexOf(k) >= 0) score += 8;
      });

      var title = normalize(item.title);
      var content = normalize(item.content);
      qTokens.forEach(function (token) {
        if (title.indexOf(token) >= 0) score += 3;
        if (content.indexOf(token) >= 0) score += 1;
      });

      score = score * ((Number(item.priority) || 50) / 100 + 0.5);
      if (score > bestScore) {
        best = item;
        bestScore = score;
      }
    });

    if (!best || bestScore < 4) return null;
    return {
      intent: best.category_key || "conhecimento",
      answer: best.content,
      ctas: [],
      source: "remote",
    };
  }

  function whatsappHref(message) {
    var phone = String(state.whatsappPhone || "").replace(/\D/g, "");
    if (!phone || /999999999/.test(phone)) return "";
    if (phone.length <= 11) phone = "55" + phone;
    return "whatsapp://send?phone=" + phone + "&text=" + encodeURIComponent(message || "");
  }

  function buildWhatsAppCta(label, message) {
    var href = whatsappHref(message);
    if (!href) return null;
    return { label: label || "Falar no WhatsApp", href: href, icon: "fa-brands fa-whatsapp", external: true };
  }

  function resolveAnswer(query) {
    var normalized = normalize(query);

    if (normalized === "outras duvidas" || normalized === "outra duvida") {
      return {
        intent: "ajuda",
        answer:
          "Pode me perguntar sobre cesta básica, doações, voluntariado, horário, endereço, galeria, pedidos de oração ou como funciona a ação social.",
        ctas: [],
      };
    }

    var remote = matchRemote(query);
    if (remote) return remote;

    var local = matchLocal(query);
    if (local) {
      var ctas = local.ctas ? local.ctas.slice() : [];
      if (local.intent === "contato" || local.intent === "localizacao" || local.intent === "horario") {
        var wa = buildWhatsAppCta(
          "Falar no WhatsApp",
          "Olá! Vim pelo site da Ação Social Semear e gostaria de tirar uma dúvida."
        );
        if (wa) ctas.push(wa);
      }
      return Object.assign({}, local, { ctas: ctas });
    }

    return {
      intent: "fallback",
      answer: state.config.fallback,
      ctas: [
        buildWhatsAppCta(
          "Falar com a equipe",
          "Olá! Vim pelo site da Ação Social Semear e preciso de ajuda."
        ),
      ].filter(Boolean),
    };
  }

  function createInterface() {
    if (document.getElementById("dona-fab") || state.config.active === false) return;

    var fab = document.createElement("button");
    fab.id = "dona-fab";
    fab.className = "dona-fab";
    fab.type = "button";
    fab.setAttribute("aria-label", "Conversar com Dona Assunção");
    fab.innerHTML =
      '<img class="dona-fab__photo" src="' +
      escapeHtml(state.config.avatarUrl) +
      '" alt="Dona Assunção">' +
      '<span class="dona-fab__status" aria-hidden="true"></span>' +
      '<span class="dona-fab__hint">Precisa de ajuda?</span>';

    var chat = document.createElement("div");
    chat.id = "dona-chat";
    chat.className = "dona-chat";
    chat.setAttribute("role", "dialog");
    chat.setAttribute("aria-label", "Chat com Dona Assunção");
    chat.setAttribute("aria-modal", "false");
    chat.innerHTML =
      '<div class="dona-chat-header">' +
      '<div class="dona-avatar"><img id="dona-avatar-img" src="' +
      escapeHtml(state.config.avatarUrl) +
      '" alt=""></div>' +
      '<div class="dona-info">' +
      '<strong id="dona-display-name">' +
      escapeHtml(state.config.displayName) +
      "</strong>" +
      '<small id="dona-subtitle">' +
      escapeHtml(state.config.subtitle) +
      "</small>" +
      '<span class="dona-presence">Online agora</span>' +
      "</div>" +
      '<button id="dona-close" class="dona-close" type="button" aria-label="Fechar chat">' +
      '<i class="fa-solid fa-xmark" aria-hidden="true"></i>' +
      "</button>" +
      "</div>" +
      '<div id="dona-messages" class="dona-messages" aria-live="polite"></div>' +
      '<div id="dona-sugestoes" class="dona-sugestoes"></div>' +
      '<form id="dona-form" class="dona-input-bar">' +
      '<span class="dona-input-icon" aria-hidden="true"><i class="fa-regular fa-face-smile"></i></span>' +
      '<input id="dona-input" class="dona-input" type="text" placeholder="Digite sua mensagem..." autocomplete="off">' +
      '<button id="dona-send" class="dona-send" type="submit" aria-label="Enviar">' +
      '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i>' +
      "</button>" +
      "</form>";

    document.body.appendChild(fab);
    document.body.appendChild(chat);
    renderSuggestions(QUICK_DEFAULT);
    bindEvents();
  }

  function refreshIdentity() {
    var fabImg = document.querySelector(".dona-fab__photo");
    var avatarImg = document.getElementById("dona-avatar-img");
    var name = document.getElementById("dona-display-name");
    var subtitle = document.getElementById("dona-subtitle");

    if (fabImg) fabImg.src = state.config.avatarUrl || DONA_DEFAULTS.avatarUrl;
    if (avatarImg) avatarImg.src = state.config.avatarUrl || DONA_DEFAULTS.avatarUrl;
    if (name) name.textContent = state.config.displayName || DONA_DEFAULTS.displayName;
    if (subtitle) subtitle.textContent = state.config.subtitle || DONA_DEFAULTS.subtitle;

    if (state.config.active === false) {
      var fab = document.getElementById("dona-fab");
      var chat = document.getElementById("dona-chat");
      if (fab) fab.remove();
      if (chat) chat.remove();
    }
  }

  function bindEvents() {
    var fab = document.getElementById("dona-fab");
    var chat = document.getElementById("dona-chat");
    var form = document.getElementById("dona-form");

    if (fab && chat) {
      fab.addEventListener("click", openChat);
    }

    document.addEventListener("click", function (event) {
      if (event.target.closest("#dona-close")) closeChat();
      var quick = event.target.closest(".dona-sug-btn");
      if (quick) processQuickReply(quick.getAttribute("data-msg") || quick.textContent || "");
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && chat && chat.classList.contains("active")) closeChat();
    });

    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var input = document.getElementById("dona-input");
        if (!input || !input.value.trim()) return;
        var text = input.value.trim();
        input.value = "";
        processMessage(text);
      });
    }
  }

  function openChat() {
    var fab = document.getElementById("dona-fab");
    var chat = document.getElementById("dona-chat");
    var input = document.getElementById("dona-input");
    if (!chat) return;

    if (fab) fab.classList.add("hidden");
    chat.classList.add("active");

    if (!state.opened) {
      state.opened = true;
      var greeting = state.config.greeting;
      if (state.name) {
        greeting = greeting.replace("Olá!", "Olá, **" + state.name + "**!");
      }
      addMessage(greeting, "bot");
    }

    setTimeout(function () {
      if (input) input.focus();
    }, 120);
  }

  function closeChat() {
    var fab = document.getElementById("dona-fab");
    var chat = document.getElementById("dona-chat");
    if (chat) chat.classList.remove("active");
    if (fab) fab.classList.remove("hidden");
  }

  function addMessage(text, type) {
    var container = document.getElementById("dona-messages");
    if (!container) return null;

    var msg = document.createElement("div");
    msg.className = "dona-msg " + (type === "user" ? "user" : "bot");

    var bubble = document.createElement("div");
    bubble.className = "dona-msg__bubble";
    if (type === "user") bubble.textContent = text;
    else bubble.innerHTML = renderMarkdown(text);

    var time = document.createElement("span");
    time.className = "dona-msg__time";
    time.textContent = nowTime();

    msg.appendChild(bubble);
    msg.appendChild(time);
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return msg;
  }

  function addCtas(ctas) {
    var filtered = (ctas || []).filter(Boolean);
    if (!filtered.length) return;

    var container = document.getElementById("dona-messages");
    if (!container) return;

    var actions = document.createElement("div");
    actions.className = "dona-actions";

    filtered.forEach(function (cta) {
      var link = document.createElement("a");
      link.className = "dona-cta";
      link.href = cta.href || "#";
      if (cta.external) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      if (cta.icon) {
        var icon = document.createElement("i");
        icon.className = cta.icon;
        icon.setAttribute("aria-hidden", "true");
        link.appendChild(icon);
      }
      link.appendChild(document.createTextNode(cta.label || "Abrir"));
      actions.appendChild(link);
    });

    container.appendChild(actions);
    container.scrollTop = container.scrollHeight;
  }

  function showTyping() {
    var container = document.getElementById("dona-messages");
    if (!container || document.getElementById("dona-typing")) return;
    var typing = document.createElement("div");
    typing.id = "dona-typing";
    typing.className = "dona-typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
  }

  function hideTyping() {
    var typing = document.getElementById("dona-typing");
    if (typing) typing.remove();
  }

  function setInputBusy(isBusy) {
    var input = document.getElementById("dona-input");
    var send = document.getElementById("dona-send");
    if (input) input.disabled = !!isBusy;
    if (send) send.disabled = !!isBusy;
  }

  function renderSuggestions(items) {
    var box = document.getElementById("dona-sugestoes");
    if (!box) return;
    box.innerHTML = "";
    (items || QUICK_DEFAULT).forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dona-sug-btn";
      btn.textContent = item[0];
      btn.setAttribute("data-msg", item[1]);
      box.appendChild(btn);
    });
  }

  function backendWebhookUrl() {
    var base = String(state.backendUrl || "").trim();
    if (!base) return "";
    return base + "/webhook";
  }

  async function fetchBackendAnswer(text) {
    var url = backendWebhookUrl();
    if (!url) return null;

    var hasAbort = typeof AbortController !== "undefined";
    var controller = hasAbort ? new AbortController() : null;
    var timeoutId = controller
      ? setTimeout(function () {
          controller.abort();
        }, 20000)
      : null;

    try {
      var resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canal: "web",
          user_id: state.userId,
          nome: state.name || "",
          texto: text,
        }),
        signal: controller ? controller.signal : undefined,
      });
      if (!resp.ok) return null;
      var data = await resp.json();
      if (!data || typeof data.resposta !== "string" || !data.resposta.trim()) return null;
      return { answer: data.resposta.trim(), urgente: !!data.urgente };
    } catch (e) {
      return null;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async function processMessage(text) {
    text = String(text || "").trim();
    if (!text) return;

    addMessage(text, "user");
    showTyping();
    setInputBusy(true);

    var detectedName = detectName(text);
    if (detectedName) {
      state.name = detectedName;
      localStorage.setItem("dona_assuncao_nome", detectedName);
    }

    var startedAt = Date.now();
    var remote = await fetchBackendAnswer(text);
    var result;

    if (remote) {
      var hint = matchLocal(text);
      result = {
        intent: (hint && hint.intent) || "ajuda",
        answer: remote.answer,
        ctas: hint ? hint.ctas || [] : [],
      };
      if (remote.urgente) {
        if (state.config.humanHandoff) {
          result.answer += "\n\n" + state.config.humanHandoff;
        }
        var waUrgente = buildWhatsAppCta(
          "Falar agora com a equipe",
          "Olá! Preciso de ajuda urgente, vim pelo chat do site da Ação Social Semear."
        );
        if (waUrgente) result.ctas = result.ctas.concat([waUrgente]);
      }
    } else {
      result = resolveAnswer(text);
    }

    if (detectedName) {
      result.answer = "Prazer em te conhecer, **" + detectedName + "**. " + result.answer;
    }

    // Pausa mínima para a digitação não parecer instantânea quando a resposta local é imediata
    var elapsed = Date.now() - startedAt;
    var minDelay = Math.max(0, 480 - elapsed);

    setTimeout(function () {
      state.lastIntent = result.intent || "";
      hideTyping();
      addMessage(result.answer, "bot");
      addCtas(result.ctas);
      renderSuggestions(QUICK_BY_INTENT[result.intent] || QUICK_DEFAULT);
      setInputBusy(false);

      var input = document.getElementById("dona-input");
      if (input) input.focus();

      if (!remote && result.intent === "fallback") logUnanswered(text);
    }, minDelay);
  }

  function processQuickReply(text) {
    text = String(text || "").trim();
    if (!text) return;

    addMessage(text, "user");

    // Sugestões rápidas são perguntas fixas (FAQ) — responde na hora, sem
    // esperar o backend de IA, que é mais lento.
    var override = QUICK_REPLY_OVERRIDES[text];
    var topic = override && LOCAL_TOPICS[override.topic];
    var result;

    if (topic) {
      var ctas = topic.ctas ? topic.ctas.slice() : [];
      if (override.topic === "contato") {
        var wa = buildWhatsAppCta(
          "Falar no WhatsApp",
          "Olá! Vim pelo site da Ação Social Semear e gostaria de tirar uma dúvida."
        );
        if (wa) ctas.push(wa);
      }
      result = { intent: override.menu, answer: topic.answer, ctas: ctas };
    } else {
      result = resolveAnswer(text);
    }

    state.lastIntent = result.intent || "";
    addMessage(result.answer, "bot");
    addCtas(result.ctas);
    renderSuggestions(QUICK_BY_INTENT[result.intent] || QUICK_DEFAULT);

    if (result.intent === "fallback") logUnanswered(text);
  }

  function parseStoredWaConfig() {
    try {
      var raw = localStorage.getItem("doavida_wa_config");
      if (!raw) return "";
      var cfg = JSON.parse(raw);
      var phones = cfg.adminPhone || cfg.adminPhones || cfg.whatsapp_phones || "";
      if (Array.isArray(phones)) return phones[0] || "";
      return String(phones).split(",")[0] || "";
    } catch (e) {
      return "";
    }
  }

  async function hydrateWhatsApp() {
    state.whatsappPhone = parseStoredWaConfig();
    if (window.DoaVidaSync && typeof window.DoaVidaSync.getWAConfig === "function") {
      try {
        var cfg = await window.DoaVidaSync.getWAConfig();
        var phones = cfg && cfg.adminPhone;
        if (Array.isArray(phones) && phones[0]) state.whatsappPhone = phones[0];
        else if (phones) state.whatsappPhone = String(phones).split(",")[0];
      } catch (e) {}
    }
  }

  async function hydrateRemoteAgent() {
    if (!window.supabaseClient || typeof window.supabaseClient.from !== "function") return;

    try {
      var settingsResult = await window.supabaseClient
        .from("agent_settings")
        .select("*")
        .eq("internal_key", "default")
        .single();

      if (!settingsResult.error && settingsResult.data) {
        var s = settingsResult.data;
        state.config = Object.assign({}, state.config, {
          active: s.active !== false,
          displayName: s.display_name || state.config.displayName,
          avatarUrl: s.avatar_url || state.config.avatarUrl,
          greeting: s.greeting || state.config.greeting,
          fallback: s.fallback_message || state.config.fallback,
          humanHandoff: s.human_handoff || state.config.humanHandoff,
        });
        refreshIdentity();
      }
    } catch (e) {}

    try {
      var knowledgeResult = await window.supabaseClient
        .from("agent_knowledge")
        .select("title,content,keywords,priority,category_key,status")
        .eq("status", "active")
        .is("deleted_at", null)
        .limit(150);

      if (!knowledgeResult.error && Array.isArray(knowledgeResult.data)) {
        state.remoteKnowledge = knowledgeResult.data.filter(function (item) {
          return item && item.content;
        });
      }
    } catch (e) {}
  }

  async function hydrateBackendUrl() {
    if (!window.DoaVidaSync || typeof window.DoaVidaSync.getDonaBackendUrl !== "function") return;
    try {
      var url = await window.DoaVidaSync.getDonaBackendUrl();
      if (url) state.backendUrl = url;
    } catch (e) {}
  }

  async function logUnanswered(question) {
    if (!window.supabaseClient || typeof window.supabaseClient.from !== "function") return;
    try {
      await window.supabaseClient.from("agent_unanswered").insert([
        {
          question: String(question || "").slice(0, 500),
          context: state.lastIntent || "",
          source: "site_publico",
        },
      ]);
    } catch (e) {}
  }

  function init() {
    createInterface();
    hydrateWhatsApp();
    hydrateRemoteAgent();
    hydrateBackendUrl();

    window.addEventListener(
      "DoaVidaSyncPronto",
      function () {
        hydrateWhatsApp();
        hydrateBackendUrl();
      },
      { once: true }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
