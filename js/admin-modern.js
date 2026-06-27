(function () {
  "use strict";

  var PAGES = [
    { id: "foods", label: "Alimentos", title: "Alimentos", sub: "Estoque e metas de arrecadação", icon: "fa-apple-whole" },
    { id: "donations", label: "Doações", title: "Relatórios e Analytics", sub: "Análise de doações, arrecadação e desempenho", icon: "fa-gift" },
    { id: "families", label: "Famílias", title: "Famílias e Solicitações", sub: "Cadastro, análise social e acompanhamento", icon: "fa-users" },
    { id: "requests", label: "Solicitacoes", title: "Solicitacoes de Cesta", sub: "Pedidos enviados pelo formulario publico", icon: "fa-basket-shopping" },
    { id: "volunteers", label: "Voluntários", title: "Voluntários", sub: "Equipe ativa e acompanhamento", icon: "fa-hands-holding" },
    { id: "spiritual", label: "Apoio Espiritual", title: "Apoio Espiritual", sub: "Intercessão em oração e visitas às famílias", icon: "fa-hands-praying" },
    { id: "gallery", label: "Galeria", title: "Galeria", sub: "Imagens públicas e privadas", icon: "fa-image" },
    { id: "tasks", label: "Tarefas", title: "Tarefas dos Voluntários", sub: "Planejamento, execução e acompanhamento", icon: "fa-clipboard-list" },
    { id: "whatsapp", label: "WhatsApp", title: "WhatsApp", sub: "Comunicação e notificações", icon: "fa-brands fa-whatsapp", brand: true },
    { id: "settings", label: "Configurações", title: "Configurações", sub: "Ajustes administrativos", icon: "fa-gear" },
  ];

  var state = {
    activePage: "requests",
    analyticsPeriod: 30,
    data: null,
    filters: {
      families:   { status: "todos", prioridade: "todos", bairro: "todos", periodo: "todos" },
      requests:   { status: "todos", bairro: "todos", periodo: "todos" },
      tasks:      { status: "todos", tipo: "todos", responsavel: "todos", prioridade: "todos" },
      foods:      { categoria: "todos", status: "todos" },
      gallery:    { categoria: "todos", tipo: "todos" },
      volunteers: { tipo: "todos", status: "todos" },
      spiritual:  { modalidade: "todos", status: "todos" },
      donations:  { status: "todos", tipo: "todos", periodo: "todos" },
    },
    charts: {},
  };

  var COLORS = {
    purple: "#8b5cf6",
    purple2: "#6d5dfc",
    blue: "#2f7cff",
    cyan: "#22d3ee",
    green: "#22c55e",
    yellow: "#f7b731",
    red: "#fb5d6b",
    muted: "rgba(218,229,255,.48)",
  };

  var WA_AVISO_OPCOES = [
    ["doacoes", "Novas doacoes"],
    ["familias", "Familias cadastradas"],
    ["tarefas", "Tarefas"],
    ["estoque", "Estoque baixo"],
  ];
  var WA_AVISO_LABELS = WA_AVISO_OPCOES.reduce(function (acc, o) { acc[o[0]] = o[1]; return acc; }, {});

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function number(value) {
    var n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }

  function fmtInt(value) {
    return Math.round(number(value)).toLocaleString("pt-BR");
  }

  function fmtKg(value) {
    return number(value).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " kg";
  }

  function fmtMoney(value) {
    return number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function fmtDate(value, withTime) {
    if (!value) return "-";
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return esc(value);
    return d.toLocaleDateString("pt-BR") + (withTime ? " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "");
  }

  function initials(name) {
    var parts = String(name || "AS").trim().split(/\s+/).filter(Boolean);
    return (parts[0] || "A").charAt(0).toUpperCase() + (parts[1] || "S").charAt(0).toUpperCase();
  }

  function whatsappUrl(phone) {
    var digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.indexOf("55") !== 0) digits = "55" + digits;
    return "https://wa.me/" + digits;
  }

  function contactLinkHtml(label, phone) {
    var value = phone || "-";
    var wa = whatsappUrl(value);
    return '<span><strong>' + esc(label) + ':</strong> ' +
      (wa ? '<a class="admin-contact-link" href="' + esc(wa) + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i>' + esc(value) + '</a>' : esc(value)) +
      '</span>';
  }

  function familyAvatarHtml() {
    return '<span class="admin-family-avatar" aria-hidden="true">' +
      '<i class="fa-solid fa-user"></i>' +
      '<i class="fa-solid fa-user"></i>' +
      '<i class="fa-solid fa-user"></i>' +
      '</span>';
  }

  function slug(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function searchQuery() {
    return slug(($("#admin-search") || {}).value || "");
  }

  function matchesSearch(row, fields) {
    var q = searchQuery();
    if (!q) return true;
    return fields.some(function (field) {
      return slug(row[field]).indexOf(q) >= 0;
    });
  }

  function debounce(fn, delay) {
    var timer;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay || 280);
    };
  }

  var renderDebounced = debounce(function () { renderActivePage(); }, 280);

  function notify(message) {
    var el = $("#admin-toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("visible");
    clearTimeout(notify._t);
    notify._t = setTimeout(function () { el.classList.remove("visible"); }, 3000);
  }

  function logoMark() {
    return '<span class="admin-logo-mark" aria-hidden="true">' +
      '<img src="img/logo-semear-oficial.jpeg" class="admin-logo-img" alt="Logo Ação Social Semear" />' +
      '</span>';
  }

  function badge(label, tone, icon) {
    return '<span class="admin-badge badge-' + (tone || "purple") + '">' + (icon ? '<i class="fa-solid ' + icon + '"></i>' : "") + esc(label) + "</span>";
  }

  function statusBadge(status) {
    var key = slug(status);
    var map = {
      "em-analise": ["Em analise", "blue", "fa-clipboard-check"],
      "aprovada": ["Aprovada", "green", "fa-circle-check"],
      "aprovado": ["Aprovado", "green", "fa-circle-check"],
      "aguardando-entrega": ["Aguardando receber", "yellow", "fa-hourglass-half"],
      "aguardando-documentos": ["Aguardando documentos", "yellow", "fa-file-circle-exclamation"],
      "nao-retirada": ["Não recebeu", "red", "fa-circle-xmark"],
      "nao-recebeu": ["Não recebeu", "red", "fa-circle-xmark"],
      "entregue": ["Entregue", "cyan", "fa-box"],
      "confirmado": ["Concluido", "green", "fa-circle-check"],
      "confirmada": ["Concluido", "green", "fa-circle-check"],
      "pendente": ["Pendente", "yellow", "fa-clock"],
      "em-andamento": ["Em andamento", "blue", "fa-wave-square"],
      "finalizado": ["Finalizado", "green", "fa-circle-check"],
      "a-fazer": ["A fazer", "purple", "fa-circle"],
      "aguardando": ["Aguardando", "yellow", "fa-hourglass-half"],
      "concluido": ["Concluido", "green", "fa-circle-check"],
      "ativo": ["Ativo", "green", "fa-circle-check"],
      "inativo": ["Inativo", "yellow", "fa-circle-pause"],
      "enviado": ["Enviado", "green", "fa-circle-check"],
      "erro": ["Erro", "red", "fa-circle-exclamation"],
      "falha": ["Falha", "red", "fa-circle-exclamation"],
    };
    var cfg = map[key] || [status || "Pendente", "purple", "fa-circle"];
    return badge(cfg[0], cfg[1], cfg[2]);
  }

  function priorityBadge(priority) {
    var key = slug(priority);
    var map = {
      alta: ["Alta", "red"],
      media: ["Media", "yellow"],
      baixa: ["Baixa", "green"],
    };
    var cfg = map[key] || [priority || "Media", "yellow"];
    return badge(cfg[0], cfg[1], "fa-star");
  }

  function parseKpiNumber(str) {
    var s = String(str || "").trim();
    var m = s.match(/^([+-]?\d[\d.]*(?:,\d+)?)(.*)/);
    if (!m) return { raw: 0, suffix: "" };
    var numStr = m[1].replace(/\./g, "").replace(",", ".");
    return { raw: parseFloat(numStr) || 0, suffix: m[2] || "" };
  }

  function kpiCard(opts) {
    var kn = parseKpiNumber(opts.value);
    var countAttrs = kn.raw ? ' data-count-to="' + kn.raw + '" data-count-suffix="' + esc(kn.suffix) + '"' : "";
    return '<article class="admin-kpi" style="--tone:' + opts.tone + ';--spark:' + opts.spark + '">' +
      '<div class="admin-kpi-head"><div class="admin-kpi-icon"><i class="fa-solid ' + opts.icon + '"></i></div>' +
      '<div class="admin-kpi-label">' + esc(opts.label) + '</div></div>' +
      '<div class="admin-kpi-value"' + countAttrs + '>' + esc(opts.value) + (opts.unit ? '<span class="admin-kpi-unit">' + esc(opts.unit) + '</span>' : '') + '</div>' +
      '<div class="admin-kpi-trend">' + esc(opts.trend || "Tempo real") + '<small>' + esc(opts.trendNote || "Firebase / Cloud") + '</small></div>' +
      '</article>';
  }

  function panel(title, body, opts) {
    opts = opts || {};
    return '<section class="admin-panel ' + (opts.pad ? "pad" : "") + ' ' + (opts.className || "") + '">' +
      (title ? '<div class="admin-panel-header"><div><h2>' + esc(title) + '</h2>' + (opts.sub ? '<p>' + esc(opts.sub) + '</p>' : '') + '</div>' + (opts.action || "") + '</div>' : "") +
      body +
      '</section>';
  }

  function chartPanel(title, id, opts) {
    opts = opts || {};
    return panel(title, '<div class="admin-chart-wrap ' + (opts.small ? "small" : "") + '"><canvas id="' + id + '"></canvas></div>', opts);
  }

  function getDonationKg(donation) {
    if (Array.isArray(donation.itens) && donation.itens.length) {
      return donation.itens.reduce(function (sum, item) { return sum + number(item.totalKg || item.quantidade || item.amount); }, 0);
    }
    return number(donation.totalKg || donation.amount || donation.kg || donation.quantidade);
  }

  function isBasketRequest(row) {
    var origem = slug(row && (row.origem || row.source || row.formulario));
    var protocolo = String(row && row.protocolo || "");
    return origem === "cesta-form" || origem === "admin-cesta-form" || /^SOL-/i.test(protocolo);
  }

  function monthKey(date) {
    var d = date === undefined ? new Date() : new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function monthLabelFromKey(key) {
    var parts = String(key || "").split("-");
    if (parts.length !== 2) return key || "-";
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    if (isNaN(d.getTime())) return key || "-";
    var month = d.toLocaleDateString("pt-BR", { month: "long" });
    return month.charAt(0).toUpperCase() + month.slice(1) + "/" + d.getFullYear();
  }

  function nextMonthKey(key) {
    var base = key ? new Date(parseInt(String(key).slice(0, 4), 10), parseInt(String(key).slice(5, 7), 10) - 1, 1) : new Date();
    if (isNaN(base.getTime())) base = new Date();
    base.setMonth(base.getMonth() + 1);
    return monthKey(base);
  }

  function normalizeBasketStatus(status) {
    var key = slug(status || "aguardando");
    var map = {
      "aguardando": "Aguardando",
      "agendada": "Agendada",
      "recebida": "Recebida",
      "nao-retirada": "Não retirada",
      "cancelada": "Cancelada",
      "bloqueada": "Bloqueada",
    };
    return map[key] || status || "Aguardando";
  }

  function basketStatusClass(status) {
    var key = slug(status || "");
    if (key === "aguardando" || key === "aguardando-entrega" || key === "aprovada" || key === "aprovado") return "waiting";
    if (key === "agendada") return "scheduled";
    if (key === "recebida" || key === "entregue") return "received";
    if (key === "nao-retirada" || key === "nao-recebeu" || key === "cancelada" || key === "bloqueada") return "danger";
    return "waiting";
  }

  function familyBasketHistory(f) {
    var rows = Array.isArray(f.entregas_cestas) ? f.entregas_cestas.slice() : [];
    var current = f.mes_referencia || monthKey(f.entregue_em || f.aprovado_em || new Date());
    if (!rows.length && (f.entregue_em || slug(f.status) === "entregue")) {
      rows.push({
        id: "legacy-" + current,
        mes_referencia: current,
        data_entrega: f.entregue_em || "",
        status: "Recebida",
        itens_doados: f.itens_doados || "Ainda não informado",
        observacao: f.observacao_entrega || "Entregue normalmente",
      });
    }
    if (!rows.some(function (r) { return r.mes_referencia === current; })) {
      rows.push({
        id: "current-" + current,
        mes_referencia: current,
        data_entrega: "",
        status: slug(f.status) === "entregue" ? "Recebida" : "Aguardando",
        itens_doados: f.itens_doados || "Ainda não informado",
        observacao: slug(f.status) === "entregue" ? "Entregue normalmente" : "Próxima cesta",
      });
    }
    return rows.sort(function (a, b) { return String(a.mes_referencia || "").localeCompare(String(b.mes_referencia || "")); });
  }

  function lastReceivedBasket(f) {
    var rows = familyBasketHistory(f).filter(function (r) { return slug(r.status) === "recebida"; });
    return rows.length ? rows[rows.length - 1] : null;
  }

  function nextBasket(f) {
    var rows = familyBasketHistory(f);
    var waiting = rows.find(function (r) { return ["aguardando", "agendada"].indexOf(slug(r.status)) >= 0; });
    if (waiting) return waiting;
    var last = lastReceivedBasket(f);
    var next = nextMonthKey(last ? last.mes_referencia : monthKey());
    return { mes_referencia: next, data_entrega: "", status: "Aguardando", itens_doados: "Ainda não informado", observacao: "Próxima cesta" };
  }

  function requestProtocol() {
    var now = new Date();
    var data = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");
    return "SOL-" + data + "-" + String(Math.floor(Math.random() * 9000) + 1000);
  }

  function currentMonthLabel() {
    return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

  function basketRequests() {
    return (state.data && state.data.families ? state.data.families : [])
      .filter(isBasketRequest)
      .slice()
      .sort(function (a, b) {
        return (donationDate(b) || 0) - (donationDate(a) || 0);
      });
  }

  function openBasketRequests() {
    return basketRequests().filter(function (row) {
      return ["em-analise", "pendente", "aguardando-documentos"].indexOf(slug(row.status || "em-analise")) >= 0;
    });
  }

  function monthlyBasketFamilies() {
    var current = monthKey();
    return (state.data && state.data.families ? state.data.families : [])
      .filter(function (row) {
        var status = slug(row.status || "");
        var hasCurrentHistory = familyBasketHistory(row).some(function (h) { return h.mes_referencia === current; });
        if (hasCurrentHistory) return true;
        if (["aprovada", "aprovado"].indexOf(status) >= 0 && isBasketRequest(row) && !row.mes_referencia && !row.aprovado_em) return true;
        return row.mes_referencia === current ||
          monthKey(row.aprovado_em) === current && ["aguardando-entrega", "aprovada", "aprovado"].indexOf(status) >= 0 ||
          monthKey(row.entregue_em) === current && status === "entregue";
      })
      .sort(function (a, b) {
        return (donationDate(b) || 0) - (donationDate(a) || 0);
      });
  }

  function requestIncome(row) {
    if (row.renda_texto) return row.renda_texto;
    if (row.renda) return fmtMoney(row.renda);
    return "-";
  }

  function peopleCount(value) {
    var m = String(value || "").match(/\d+/);
    return m ? parseInt(m[0], 10) : 1;
  }

  function fullAddress(data) {
    return [
      data.logradouro || "",
      data.numero ? "n " + data.numero : "",
      data.complemento || "",
      data.bairro || "",
      (data.cidade || "") + (data.uf ? " - " + data.uf : "")
    ].filter(Boolean).join(", ");
  }


  async function readRemote(remoteMethod) {
    try {
      if (window.DoaVidaSync && typeof DoaVidaSync[remoteMethod] === "function") {
        var remote = await DoaVidaSync[remoteMethod]();
        return Array.isArray(remote) ? remote : [];
      }
    } catch (e) {}
    return [];
  }

  async function readRemoteObject(remoteMethod) {
    try {
      if (window.DoaVidaSync && typeof DoaVidaSync[remoteMethod] === "function") {
        var remote = await DoaVidaSync[remoteMethod]();
        return remote && typeof remote === "object" && !Array.isArray(remote) ? remote : {};
      }
    } catch (e) {}
    return {};
  }

  async function loadData() {
    var data = {
      donations: await readRemote("getDoacoes"),
      foods: await readRemote("getAlimentos"),
      families: await readRemote("getFamilias"),
      volunteers: await readRemote("getVoluntarios"),
      tasks: await readRemote("getTarefas"),
      gallery: await readRemote("getGaleria"),
      whatsappAdmins: await readRemote("getWhatsappAdmins"),
      whatsappLogs: await readRemote("getWhatsappLogs"),
      waConfig: await readRemoteObject("getWAConfig"),
      settings: await readRemoteObject("getAllConfigs"),
    };

    state.data = data;
  }

  function initLayout() {
    $("#admin-sidebar").innerHTML =
      '<div class="admin-brand">' + logoMark() +
      '<span><span class="admin-brand-kicker">Ação Social</span><span class="admin-brand-name">Semear</span><span class="admin-brand-city">Belém • PA</span></span></div>' +
      '<button type="button" id="sidebar-back-site" class="admin-sidebar-back"><i class="fa-solid fa-arrow-left"></i>Voltar ao site</button>' +
      '<nav class="admin-nav" aria-label="Menu administrativo">' + PAGES.map(navButton).join("") + '</nav>' +
      '<div class="admin-sidebar-note"><i class="fa-solid fa-hands-holding-heart"></i><strong>Fazer o bem transforma vidas!</strong><span>Obrigado por fazer parte dessa corrente do bem.</span></div>';

    $("#admin-mobile-nav").innerHTML = PAGES.filter(function (p) {
      return ["requests", "donations", "families", "volunteers"].indexOf(p.id) >= 0;
    }).map(navButton).join("");

    $all("[data-page]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        navigate(btn.dataset.page);
        document.body.classList.remove("admin-menu-open");
      });
    });

    $("#admin-menu-button").addEventListener("click", function () {
      document.body.classList.toggle("admin-menu-open");
    });
    $("#sidebar-back-site").addEventListener("click", goToSite);
    var globalExport = $("#admin-export-button");
    var globalSite = $("#admin-site-button");
    if (globalExport) globalExport.addEventListener("click", exportReport);
    if (globalSite) globalSite.addEventListener("click", goToSite);
    $("#admin-search").addEventListener("input", renderDebounced);
  }

  function navButton(page) {
    var iconClass = page.brand ? page.icon : "fa-solid " + page.icon;
    return '<button type="button" class="admin-nav-link" data-page="' + page.id + '">' +
      '<i class="' + iconClass + '"></i><span>' + esc(page.label) + '</span></button>';
  }

  function navigate(pageId) {
    state.activePage = PAGES.some(function (p) { return p.id === pageId; }) ? pageId : "requests";
    location.hash = state.activePage;
    updateShell();
    renderActivePage();
    window.scrollTo(0, 0);
  }

  function updateShell() {
    var page = PAGES.find(function (p) { return p.id === state.activePage; }) || PAGES[0];
    $("#admin-page-heading").textContent = page.title;
    $("#admin-page-subheading").textContent = page.sub;
    $all("[data-page]").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.page === page.id);
    });
  }

  function renderActivePage() {
    if (!state.data) return;

    /* Salva foco se estava dentro da view (campos de busca inline) */
    var focused = document.activeElement;
    var root = $("#admin-view");
    var focusId   = (focused && root && root.contains(focused) && focused.id) ? focused.id : null;
    var focusSel  = focused && typeof focused.selectionStart === "number" ? focused.selectionStart : null;

    updateShell();
    var page = state.activePage;
    if (page === "overview")   root.innerHTML = renderOverview();
    else if (page === "donations")  root.innerHTML = renderAnalytics();
    else if (page === "families")   root.innerHTML = renderFamilies();
    else if (page === "requests")   root.innerHTML = renderBasketRequests();
    else if (page === "volunteers") root.innerHTML = renderVolunteers();
    else if (page === "spiritual")  root.innerHTML = renderSpiritual();
    else if (page === "tasks")      root.innerHTML = renderTasks();
    else if (page === "foods")      root.innerHTML = renderFoods();
    else if (page === "gallery")    root.innerHTML = renderGallery();
    else if (page === "whatsapp")   root.innerHTML = renderWhatsApp();
    else if (page === "settings")   root.innerHTML = renderSettings();
    else root.innerHTML = renderPreservedPage(page);

    bindViewEvents();
    drawCharts(page);
    animateKpiValues();

    /* Restaura foco e posição do cursor no campo de busca inline */
    if (focusId) {
      var toFocus = $("#" + focusId);
      if (toFocus) {
        toFocus.focus();
        if (typeof toFocus.selectionStart === "number") {
          var pos = focusSel !== null ? focusSel : toFocus.value.length;
          toFocus.selectionStart = toFocus.selectionEnd = pos;
        }
      }
    }
  }

  function metrics(days) {
    var data = state.data;
    var cutoff = days ? new Date(Date.now() - days * 86400000) : null;
    var donations = cutoff
      ? data.donations.filter(function (d) { var dt = donationDate(d); return dt && dt >= cutoff; })
      : data.donations;
    var kg = donations.reduce(function (sum, d) { return sum + getDonationKg(d); }, 0);
    var cestasCompletas = donations.filter(function (d) { return d.tipo_doacao === "cesta_completa"; }).length;
    var activeVols = data.volunteers.filter(function (v) {
      return ["ativo", "participando", "confirmado", "active"].indexOf(slug(v.status || "ativo")) >= 0;
    }).length || data.volunteers.length;
    return {
      donations: donations.length,
      kg: kg,
      avgKg: donations.length ? kg / donations.length : 0,
      cestasCompletas: cestasCompletas,
      families: data.families.length,
      volunteers: activeVols,
      growth: donationGrowthForPeriod(days || 30),
      familyGrowth: entityGrowth(data.families),
      volunteerGrowth: entityGrowth(data.volunteers),
    };
  }

  function realTrend(value, label) {
    var n = number(value);
    var sign = n > 0 ? "+" : "";
    return sign + n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "% (" + (label || "30d") + ")";
  }

  function periodLabel(days) {
    if (days <= 1) return "hoje";
    if (days === 7) return "7 dias";
    if (days === 30) return "30 dias";
    return "12 meses";
  }

  function donationDate(row) {
    var raw = row.created_at || row.createdAt || row.data || row.date;
    var date = raw ? new Date(raw) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  }

  function donationGrowthForPeriod(days) {
    days = days || 30;
    var now = new Date();
    var currentStart = new Date(now.getTime() - days * 86400000);
    var previousStart = new Date(now.getTime() - 2 * days * 86400000);
    var current = 0, previous = 0;
    state.data.donations.forEach(function (d) {
      var date = donationDate(d);
      var kg = getDonationKg(d);
      if (!date) return;
      if (date >= currentStart) current += kg;
      else if (date >= previousStart) previous += kg;
    });
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }

  function donationGrowth() { return donationGrowthForPeriod(30); }

  function entityGrowth(rows) {
    var now = new Date();
    var currentStart = new Date(now.getTime() - 30 * 86400000);
    var previousStart = new Date(now.getTime() - 60 * 86400000);
    var current = 0, previous = 0;
    rows.forEach(function (row) {
      var date = donationDate(row);
      if (!date) return;
      if (date >= currentStart) current++;
      else if (date >= previousStart) previous++;
    });
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }

  function computeKgByPeriod(numPeriods, daysEach) {
    var now = new Date();
    var labels = [], values = [];
    for (var i = numPeriods - 1; i >= 0; i--) {
      var end = new Date(now.getTime() - i * daysEach * 86400000);
      var start = new Date(end.getTime() - daysEach * 86400000);
      var kg = state.data.donations.reduce(function (sum, d) {
        var dt = donationDate(d);
        if (!dt || dt < start || dt >= end) return sum;
        return sum + getDonationKg(d);
      }, 0);
      labels.push(start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }));
      values.push(Math.round(kg * 10) / 10);
    }
    return { labels: labels, values: values };
  }

  function computeKgByPeriodForAnalytics(totalDays) {
    if (totalDays <= 1) {
      var now = new Date();
      var labels = [], values = [];
      for (var h = 0; h <= 22; h += 2) {
        var start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h);
        var end = new Date(start.getTime() + 7200000);
        var kg = state.data.donations.reduce(function (sum, d) {
          var dt = donationDate(d);
          if (!dt || dt < start || dt >= end) return sum;
          return sum + getDonationKg(d);
        }, 0);
        labels.push(String(h).padStart(2, "0") + "h");
        values.push(Math.round(kg * 10) / 10);
      }
      return { labels: labels, values: values };
    }
    if (totalDays <= 7) return computeKgByPeriod(totalDays, 1);
    if (totalDays <= 30) return computeKgByPeriod(6, 5);
    return computeKgByPeriod(12, 30);
  }

  function computeTasksProductivity() {
    var map = {};
    state.data.tasks.forEach(function (t) {
      var person = (t.responsavel || "Equipe").trim();
      map[person] = (map[person] || 0) + 1;
    });
    var sorted = Object.keys(map).sort(function (a, b) { return map[b] - map[a]; }).slice(0, 5);
    return { labels: sorted, values: sorted.map(function (p) { return map[p]; }) };
  }

  function renderOverview() {
    var m = metrics();
    return '<div class="admin-view active">' +
      '<div class="admin-action-row admin-overview-toolbar"><button class="admin-button" id="overview-site"><i class="fa-solid fa-arrow-up-right-from-square"></i>Voltar ao site</button><button class="admin-button primary js-export"><i class="fa-solid fa-download"></i>Exportar relatorio</button></div>' +
      '<div class="admin-grid admin-kpi-grid admin-kpi-grid-compact admin-kpi-grid-stacked admin-overview-kpis">' +
      kpiCard({ label: "Doações registradas", value: fmtInt(m.donations), icon: "fa-hand-holding-heart", tone: "linear-gradient(135deg,#a855f7,#7c3aed)", spark: "linear-gradient(90deg,transparent,#a855f7,transparent)", trend: realTrend(m.growth) }) +
      kpiCard({ label: "KG arrecadados", value: fmtKg(m.kg), icon: "fa-weight-hanging", tone: "linear-gradient(135deg,#3b82f6,#2563eb)", spark: "linear-gradient(90deg,transparent,#2f7cff,transparent)", trend: realTrend(m.growth) }) +
      kpiCard({ label: "Famílias cadastradas", value: fmtInt(m.families), icon: "fa-users", tone: "linear-gradient(135deg,#14b8a6,#10b981)", spark: "linear-gradient(90deg,transparent,#22d3ee,transparent)", trend: realTrend(m.familyGrowth) }) +
      kpiCard({ label: "Voluntários ativos", value: fmtInt(m.volunteers), icon: "fa-user-check", tone: "linear-gradient(135deg,#22c55e,#16a34a)", spark: "linear-gradient(90deg,transparent,#22c55e,transparent)", trend: realTrend(m.volunteerGrowth) }) +
      '</div>' +
      '<div class="admin-grid admin-dashboard-layout">' +
      chartPanel("Arrecadação mensal (kg)", "overview-line", { className: "admin-overview-chart" }) +
      chartPanel("Doações por categoria (kg)", "overview-bars", { className: "admin-overview-chart" }) +
      panel("Status das solicitações", '<div class="admin-donut-info"><div class="admin-donut-canvas-wrap"><canvas id="overview-status"></canvas><div class="admin-donut-center-label"><i class="fa-solid fa-chart-line" aria-hidden="true"></i><span>Resumo geral</span></div></div><div class="admin-legend" id="overview-status-legend"></div></div>', { className: "admin-overview-donut" }) +
      '</div>' +
      '<div class="admin-grid admin-dashboard-bottom" style="margin-top:16px">' +
      panel("Últimas atividades", renderActivities()) +
      panel("Metas da campanha", renderGoals(), { className: "admin-side-panel" }) +
      '</div>' +
      '</div>';
  }

  function renderAnalytics() {
    var p = state.analyticsPeriod;
    var pLabel = periodLabel(p);
    var m = metrics(p);
    function segBtn(label, days) {
      var active = days === p ? ' class="active"' : '';
      return '<button' + active + ' data-analytics-period="' + days + '">' + label + '</button>';
    }
    return '<div class="admin-view active">' +
      '<div class="admin-action-row">' +
      '<div class="admin-segmented" role="group" aria-label="Filtro por periodo">' +
      segBtn("Hoje", 1) + segBtn("7 dias", 7) + segBtn("30 dias", 30) + segBtn("12 meses", 365) +
      '</div>' +
      '<button class="admin-button primary js-export"><i class="fa-solid fa-download"></i>Exportar relatorio</button>' +
      '</div>' +
      '<div class="admin-grid admin-kpi-grid admin-kpi-grid-compact admin-kpi-grid-stacked">' +
      kpiCard({ label: "Total de doações · " + pLabel, value: fmtInt(m.donations), icon: "fa-hand-holding-heart", tone: "linear-gradient(135deg,#a855f7,#7c3aed)", spark: "linear-gradient(90deg,transparent,#a855f7,transparent)", trend: realTrend(m.growth, pLabel), trendNote: "vs período anterior" }) +
      kpiCard({ label: "Média de kg por doação", value: fmtKg(m.avgKg), icon: "fa-scale-balanced", tone: "linear-gradient(135deg,#3b82f6,#2563eb)", spark: "linear-gradient(90deg,transparent,#2f7cff,transparent)", trend: "Tempo real", trendNote: "Firebase" }) +
      kpiCard({ label: "KG arrecadados · " + pLabel, value: fmtKg(m.kg), icon: "fa-weight-hanging", tone: "linear-gradient(135deg,#14b8a6,#10b981)", spark: "linear-gradient(90deg,transparent,#22d3ee,transparent)", trend: realTrend(m.growth, pLabel) }) +
      kpiCard({ label: "Crescimento · " + pLabel, value: realTrend(m.growth, pLabel), icon: "fa-chart-line", tone: "linear-gradient(135deg,#22c55e,#16a34a)", spark: "linear-gradient(90deg,transparent,#22c55e,transparent)", trend: "vs período anterior · kg", trendNote: "Firebase" }) +
      '</div>' +
      '<div class="admin-grid admin-kpi-grid admin-kpi-grid-compact admin-kpi-grid-stacked" style="margin-top:16px">' +
      kpiCard({ label: "Pendentes", value: fmtInt(countWhere(state.data.donations, "status", ["pendente"])), icon: "fa-clock", tone: "linear-gradient(135deg,#f59e0b,#d97706)", spark: "linear-gradient(90deg,transparent,#f59e0b,transparent)", trend: "Tempo real", trendNote: "Firebase" }) +
      kpiCard({ label: "Confirmadas", value: fmtInt(countWhere(state.data.donations, "status", ["confirmado"])), icon: "fa-circle-check", tone: "linear-gradient(135deg,#3b82f6,#2563eb)", spark: "linear-gradient(90deg,transparent,#2f7cff,transparent)", trend: "Tempo real", trendNote: "Firebase" }) +
      kpiCard({ label: "Entregues", value: fmtInt(countWhere(state.data.donations, "status", ["entregue"])), icon: "fa-box", tone: "linear-gradient(135deg,#22c55e,#16a34a)", spark: "linear-gradient(90deg,transparent,#22c55e,transparent)", trend: "Tempo real", trendNote: "Firebase" }) +
      kpiCard({ label: "Canceladas", value: fmtInt(countWhere(state.data.donations, "status", ["cancelado"])), icon: "fa-circle-xmark", tone: "linear-gradient(135deg,#fb7185,#ef4444)", spark: "linear-gradient(90deg,transparent,#fb5d6b,transparent)", trend: "Tempo real", trendNote: "Firebase" }) +
      '</div>' +
      panel("Doações registradas · " + pLabel, renderDonationFilters() + renderDonationsTable(filteredDonations()), { className: "admin-full-panel" }) +
      '<div class="admin-grid admin-analytics-charts" style="margin-top:16px">' +
      chartPanel("Arrecadação · " + pLabel, "analytics-line") +
      chartPanel("Doações por canal · " + pLabel, "analytics-channel") +
      panel("Horários de maior arrecadação · " + pLabel, renderHourlyBars(p)) +
      '</div>' +
      '<div class="admin-grid admin-analytics-bottom" style="margin-top:16px">' +
      panel("Metas x Resultado", renderGoalsCompact(p)) +
      panel("Principais doadores · " + pLabel, renderTopDonors(p)) +
      '</div>' +
      '</div>';
  }

  function renderFamilies() {
    var rows = filteredFamilies();
    var monthRows = monthlyBasketFamilies();
    var total = monthRows.length;
    var waiting = countWhere(monthRows, "status", ["aguardando-entrega", "aprovada", "aprovado"]);
    var delivered = countWhere(monthRows, "status", ["entregue"]);
    var documents = countWhere(state.data.families, "status", ["aguardando-documentos"]);
    return '<div class="admin-view active">' +
      '<div class="admin-action-row"><button class="admin-button primary" id="new-family"><i class="fa-solid fa-plus"></i>Nova família</button><button class="admin-button js-export"><i class="fa-solid fa-download"></i>Exportar</button></div>' +
      '<div class="admin-grid admin-kpi-grid admin-kpi-grid-compact admin-kpi-grid-stacked">' +
      kpiCard({ label: "Recebem este mes", value: fmtInt(total), icon: "fa-users", tone: "linear-gradient(135deg,#a855f7,#7c3aed)", spark: "linear-gradient(90deg,transparent,#a855f7,transparent)", trend: currentMonthLabel() }) +
      kpiCard({ label: "Aguardando receber", value: fmtInt(waiting), icon: "fa-hourglass-half", tone: "linear-gradient(135deg,#f59e0b,#d97706)", spark: "linear-gradient(90deg,transparent,#f59e0b,transparent)", trend: "Ainda nao recebeu" }) +
      kpiCard({ label: "Ja receberam", value: fmtInt(delivered), icon: "fa-box", tone: "linear-gradient(135deg,#22d3ee,#14b8a6)", spark: "linear-gradient(90deg,transparent,#22d3ee,transparent)", trend: "Entrega confirmada" }) +
      kpiCard({ label: "Aguardando documentos", value: fmtInt(documents), icon: "fa-file-circle-exclamation", tone: "linear-gradient(135deg,#3b82f6,#2563eb)", spark: "linear-gradient(90deg,transparent,#2f7cff,transparent)", trend: "Volta para solicitacoes" }) +
      '</div>' +
      panel("Familias que recebem cesta em " + currentMonthLabel(), renderFamilyFilters() + renderFamiliesTable(rows), { sub: "Controle quem ja recebeu e quem ainda esta aguardando a cesta basica." }) +
      panel("Mapa de atendimento",
        '<div class="admin-map-toolbar">' +
          '<i class="fa-solid fa-magnifying-glass admin-map-search-icon"></i>' +
          '<input id="family-map-search" class="admin-input admin-map-search-input" type="search" placeholder="Buscar por nome, bairro, endereço ou telefone..." />' +
          '<span id="family-map-count" class="admin-map-count-badge"></span>' +
        '</div>' +
        '<div id="admin-family-map" class="admin-leaflet-map"></div>',
        { className: "admin-families-map" }
      ) +
      '</div>';
  }

  function renderBasketRequests() {
    var all = openBasketRequests();
    var rows = filteredBasketRequests();
    var pending = all.filter(function (f) { return ["em-analise", "pendente"].indexOf(slug(f.status || "em-analise")) >= 0; }).length;
    var documents = all.filter(function (f) { return slug(f.status) === "aguardando-documentos"; }).length;
    var monthApproved = monthlyBasketFamilies().length;
    var last7 = all.filter(function (f) {
      var dt = donationDate(f);
      return dt && dt >= new Date(Date.now() - 7 * 86400000);
    }).length;
    return '<div class="admin-view active">' +
      '<div class="admin-action-row"><button class="admin-button primary" id="new-request"><i class="fa-solid fa-plus"></i>Nova solicitacao</button><button class="admin-button" id="requests-refresh"><i class="fa-solid fa-rotate"></i>Atualizar</button><button class="admin-button js-export"><i class="fa-solid fa-download"></i>Exportar</button></div>' +
      '<div class="admin-grid admin-kpi-grid admin-kpi-grid-compact admin-kpi-grid-stacked">' +
      kpiCard({ label: "Pedidos recebidos", value: fmtInt(all.length), icon: "fa-basket-shopping", tone: "linear-gradient(135deg,#14b8a6,#16a34a)", spark: "linear-gradient(90deg,transparent,#22c55e,transparent)", trend: "Formulario publico" }) +
      kpiCard({ label: "Em analise", value: fmtInt(pending), icon: "fa-file-circle-question", tone: "linear-gradient(135deg,#3b82f6,#2563eb)", spark: "linear-gradient(90deg,transparent,#2f7cff,transparent)", trend: "Aguardando contato" }) +
      kpiCard({ label: "Documentos", value: fmtInt(documents), icon: "fa-file-circle-exclamation", tone: "linear-gradient(135deg,#f59e0b,#d97706)", spark: "linear-gradient(90deg,transparent,#f59e0b,transparent)", trend: "Aguardando retorno" }) +
      kpiCard({ label: "Aprovadas no mes", value: fmtInt(monthApproved), icon: "fa-circle-check", tone: "linear-gradient(135deg,#22c55e,#16a34a)", spark: "linear-gradient(90deg,transparent,#22c55e,transparent)", trend: "Na aba Familias" }) +
      '</div>' +
      panel("Pedidos de cesta basica", renderBasketRequestFilters() + renderBasketRequestsTable(rows), { className: "admin-full-panel", sub: "Dados enviados pela pagina Solicitar Cesta." }) +
      '</div>';
  }

  function renderTasks() {
    var tasks = filteredTasks();
    var all = state.data.tasks;
    var pending = countWhere(all, "status", ["a-fazer", "pendente"]);
    var doing = countWhere(all, "status", ["em-andamento"]);
    var done = countWhere(all, "status", ["concluido", "concluida"]);
    var late = all.filter(function (t) { return t.data && new Date(t.data) < new Date() && ["concluido", "concluida"].indexOf(slug(t.status)) < 0; }).length;
    return '<div class="admin-view active">' +
      '<div class="admin-action-row"><button class="admin-button" id="create-scale"><i class="fa-regular fa-calendar-check"></i>Criar escala</button><button class="admin-button js-export"><i class="fa-solid fa-download"></i>Exportar</button><button class="admin-button primary" id="new-task"><i class="fa-solid fa-plus"></i>Nova tarefa</button></div>' +
      '<div class="admin-grid admin-kpi-grid admin-kpi-grid-compact admin-kpi-grid-stacked">' +
      kpiCard({ label: "Pendentes", value: fmtInt(pending), unit: "tarefas", icon: "fa-clipboard-list", tone: "linear-gradient(135deg,#a855f7,#7c3aed)", spark: "linear-gradient(90deg,transparent,#a855f7,transparent)", trend: "Tempo real" }) +
      kpiCard({ label: "Em andamento", value: fmtInt(doing), unit: "tarefas", icon: "fa-circle-play", tone: "linear-gradient(135deg,#3b82f6,#2563eb)", spark: "linear-gradient(90deg,transparent,#2f7cff,transparent)", trend: "Tempo real" }) +
      kpiCard({ label: "Concluídas", value: fmtInt(done), unit: "tarefas", icon: "fa-circle-check", tone: "linear-gradient(135deg,#22c55e,#16a34a)", spark: "linear-gradient(90deg,transparent,#22c55e,transparent)", trend: "Tempo real" }) +
      kpiCard({ label: "Atrasadas", value: fmtInt(late), unit: "tarefas", icon: "fa-clock-rotate-left", tone: "linear-gradient(135deg,#fb7185,#ef4444)", spark: "linear-gradient(90deg,transparent,#fb5d6b,transparent)", trend: "Tempo real" }) +
      '</div>' +
      '<div class="admin-grid admin-tasks-layout">' +
      '<div>' + renderTaskFilters() + renderKanban(tasks) + '</div>' +
      '<aside class="admin-grid">' + panel("Resumo da equipe", '<div class="admin-donut-info"><canvas id="tasks-summary"></canvas><div class="admin-legend" id="tasks-summary-legend"></div></div>') + chartPanel("Produtividade por responsavel", "tasks-productivity", { small: true }) + panel("Proximos vencimentos", renderDeadlines()) + '</aside>' +
      '</div>' +
      '</div>';
  }

  /* Imagens padrão por nome de alimento (as mesmas usadas no formulário público) */
  var FOOD_IMG_DEFAULTS = {
    "arroz":     "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=75",
    "feijao":    "https://images.unsplash.com/photo-1612257999756-3b9d3acd5e66?w=400&q=75",
    "macarrao":  "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&q=75",
    "oleo":      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=75",
    "acucar":    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=75",
    "sal":       "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=75",
    "farinha":   "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=75",
    "sardinha":  "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&q=75",
    "leite":     "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=75",
    "carne":     "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&q=75",
    "frango":    "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=75",
    "batata":    "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=75",
    "tomate":    "https://images.unsplash.com/photo-1561136594-7f68413baa99?w=400&q=75",
    "cenoura":   "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&q=75",
    "biscoito":  "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=75",
    "cafe":      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=75",
  };

  function foodDefaultImg(f) {
    var n = slug(foodName(f));
    for (var key in FOOD_IMG_DEFAULTS) {
      if (n.indexOf(key) >= 0) return FOOD_IMG_DEFAULTS[key];
    }
    /* Fallback: API padrão se disponível */
    if (window.DoaVidaAPI && DoaVidaAPI.ALIMENTOS_PADRAO) {
      var match = DoaVidaAPI.ALIMENTOS_PADRAO.find(function (a) { return n.indexOf(slug(a.name || a.nome || "")) >= 0; });
      if (match && match.img) return match.img;
    }
    return "";
  }

  function foodName(f) { return f.name || f.nome || f.alimento || "Alimento"; }
  function foodCategory(f) { return f.categoria || f.category || "Sem categoria"; }
  function foodUnit(f) { return f.unidade || f.unit || "un"; }
  function foodQty(f) { return number(f.kg || f.quantidade || f.estoque || f.atual || f.quantidadeAtual); }
  function foodMin(f) { return number(f.minimo || f.estoqueMinimo || f.min || f.quantidadeMinima); }
  function foodGoal(f) { return number(f.meta || f.goal || f.metaKg); }
  function foodImage(f) { return f.imagem || f.image || f.img || f.foto || f.fotoUrl || f.imageUrl || f.url || foodDefaultImg(f); }
  function foodBasketQty(f) { return f.qtdPorCesta || f.quantidadePorCesta || f.porCesta || f.qtd_cesta || ""; }

  function foodStatus(f) {
    var qty = foodQty(f), min = foodMin(f), goal = foodGoal(f);
    if (goal && qty >= goal) return ["Meta atingida", "green"];
    if (min && qty <= min * 0.5) return ["Critico", "red"];
    if (min && qty < min) return ["Baixo", "yellow"];
    return ["Em dia", "green"];
  }

  function filteredFoods() {
    var f = state.filters.foods;
    return state.data.foods.filter(function (row) {
      var status = slug(foodStatus(row)[0]);
      return matchesSearch(row, ["name", "nome", "alimento", "categoria"]) &&
        (f.categoria === "todos" || slug(foodCategory(row)) === f.categoria) &&
        (f.status === "todos" || status === f.status);
    });
  }

  function renderFoods() {
    var foods = filteredFoods();
    var all = state.data.foods;
    var low = all.filter(function (f) { var s = slug(foodStatus(f)[0]); return s === "baixo" || s === "critico"; }).length;
    var active = all.filter(function (f) { return f.ativo !== false && slug(f.status || "ativo") !== "inativo"; }).length;
    var cats = unique(all.map(foodCategory)).filter(Boolean);
    var hasDefaults = window.DoaVidaAPI && Array.isArray(DoaVidaAPI.ALIMENTOS_PADRAO);
    var seedBtn = hasDefaults
      ? '<button class="admin-button" id="seed-foods"><i class="fa-solid fa-seedling"></i>Cadastrar alimentos padrão</button>'
      : "";
    return '<div class="admin-view active">' +
      '<div class="admin-action-row"><button class="admin-button success" id="open-food-form"><i class="fa-solid fa-plus"></i>Novo alimento</button>' + seedBtn + '<button class="admin-button js-export"><i class="fa-solid fa-download"></i>Exportar</button></div>' +
      '<div class="admin-grid admin-kpi-grid admin-kpi-grid-compact admin-kpi-grid-stacked">' +
      kpiCard({ label: "Total de alimentos", value: fmtInt(all.length), icon: "fa-box-open", tone: "linear-gradient(135deg,#a855f7,#7c3aed)", spark: "linear-gradient(90deg,transparent,#a855f7,transparent)", trend: "Firebase" }) +
      kpiCard({ label: "Alimentos ativos", value: fmtInt(active), icon: "fa-circle-check", tone: "linear-gradient(135deg,#10b981,#059669)", spark: "linear-gradient(90deg,transparent,#10b981,transparent)", trend: all.length ? Math.round((active / all.length) * 100) + "% do total" : "0% do total" }) +
      kpiCard({ label: "Estoque baixo", value: fmtInt(low), icon: "fa-triangle-exclamation", tone: "linear-gradient(135deg,#f59e0b,#d97706)", spark: "linear-gradient(90deg,transparent,#f59e0b,transparent)", trend: low ? "Requer atencao" : "Sem alertas" }) +
      kpiCard({ label: "Categorias", value: fmtInt(cats.length), icon: "fa-table-cells-large", tone: "linear-gradient(135deg,#3b82f6,#2563eb)", spark: "linear-gradient(90deg,transparent,#2f7cff,transparent)", trend: "Cadastradas" }) +
      '</div>' +
      panel("Alimentos cadastrados", renderFoodFilters(cats) + renderFoodCards(foods)) +
      '</div>';
  }

  function renderFoodModal() {
    return '<div id="food-modal-backdrop" class="admin-modal-backdrop" aria-hidden="true">' +
      '<div class="admin-modal" role="dialog" aria-modal="true" aria-label="Cadastrar alimento">' +
        '<div class="admin-modal-header">' +
          '<h2 id="food-modal-title"><i class="fa-solid fa-circle-plus" id="food-modal-icon"></i><span id="food-modal-title-text">Cadastro rápido</span></h2>' +
          '<button class="admin-icon-button" id="food-modal-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>' +
        '</div>' +
        '<div class="admin-modal-body">' +
          renderFoodQuickForm() +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderDonationModal() {
    return '<div id="donation-modal-backdrop" class="admin-modal-backdrop" aria-hidden="true">' +
      '<div class="admin-modal" role="dialog" aria-modal="true" aria-label="Comprovante da doação">' +
        '<div class="admin-modal-header">' +
          '<h2><i class="fa-solid fa-receipt"></i><span>Comprovante da doação</span></h2>' +
          '<button class="admin-icon-button" id="donation-modal-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>' +
        '</div>' +
        '<div class="admin-modal-body">' +
          '<div id="donation-modal-receipt" class="admin-detail"></div>' +
          '<form id="donation-status-form" class="admin-form-grid" style="margin-top:16px">' +
            '<input type="hidden" name="donation-id" value="">' +
            '<label>Status da doação<select name="status">' +
              '<option value="pendente">Pendente</option>' +
              '<option value="confirmado">Confirmado</option>' +
              '<option value="entregue">Entregue</option>' +
              '<option value="cancelado">Cancelado</option>' +
            '</select></label>' +
            '<button type="submit" class="admin-button primary block"><i class="fa-regular fa-floppy-disk"></i>Salvar status</button>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderCestaImgModal() {
    return '<div id="cesta-img-modal-backdrop" class="admin-modal-backdrop" aria-hidden="true">' +
      '<div class="admin-modal" role="dialog" aria-modal="true" aria-label="Editar imagem da cesta completa">' +
        '<div class="admin-modal-header">' +
          '<h2><i class="fa-solid fa-basket-shopping"></i><span>Imagem da cesta completa</span></h2>' +
          '<button class="admin-icon-button" id="cesta-img-modal-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>' +
        '</div>' +
        '<div class="admin-modal-body">' +
          '<div class="admin-food-form-preview" id="cesta-img-preview"><i class="fa-solid fa-image"></i><span>Prévia da imagem</span></div>' +
          '<label>URL da imagem (ou envie abaixo)' +
            '<input type="url" id="cesta-img-url-input" placeholder="https://...">' +
          '</label>' +
          '<label class="admin-upload-box" id="cesta-img-upload-box">' +
            '<input type="file" id="cesta-img-file" accept="image/*">' +
            '<i class="fa-solid fa-cloud-arrow-up"></i>' +
            '<span>Enviar imagem ao Cloud (R2 / Cloudinary)</span>' +
            '<small>Clique ou arraste · Preenche a URL automaticamente após o upload</small>' +
          '</label>' +
          '<button class="admin-button primary block" id="cesta-img-save"><i class="fa-regular fa-floppy-disk"></i>Salvar imagem</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderFoodFilters(cats) {
    return '<div class="admin-filter-bar">' +
      '<input class="admin-filter-input" id="foods-inline-search" placeholder="Buscar alimento..." value="' + esc(($("#admin-search") || {}).value || "") + '">' +
      selectFilter("foods", "categoria", [["todos", "Todas as categorias"]].concat(cats.map(function (c) { return [slug(c), c]; }))) +
      selectFilter("foods", "status", [["todos", "Todos os status"], ["em-dia", "Em dia"], ["baixo", "Baixo"], ["critico", "Critico"], ["meta-atingida", "Meta atingida"]]) +
      '<button class="admin-button" data-clear-filter="foods"><i class="fa-solid fa-filter-circle-xmark"></i><span class="admin-clearfilter-label">Limpar filtros</span></button>' +
      '</div>';
  }

  /*
    Card fixo "Cesta Básica Completa": mostra a foto usada no passo 1 do
    formulário público (form.js lê a mesma chave 'doavida_cesta_img') e
    permite trocá-la sem precisar editar nenhum alimento individual.
    Esse card existia no admin.js legado e foi perdido na migração para
    admin-modern.js — é o que tinha "sumido" da aba Alimentos.
  */
  function cestaImgUrl() {
    var remoto = state.data.settings && state.data.settings.doavida_cesta_img;
    return remoto || localStorage.getItem("doavida_cesta_img") || "img/cesta-basica.jpg";
  }

  function renderCestaCompletaCard() {
    var url = cestaImgUrl();
    return '<article class="admin-food-card admin-food-card-cesta">' +
      '<div class="admin-food-card-img">' +
        '<img src="' + esc(url) + '" alt="Cesta básica completa" loading="lazy" onerror="this.style.display=\'none\'">' +
        '<span class="admin-food-card-badge badge-cesta">Cesta</span>' +
      '</div>' +
      '<div class="admin-food-card-body">' +
        '<div class="admin-food-card-name">Cesta Básica Completa</div>' +
        '<div class="admin-food-card-meta"><span class="admin-food-card-unit">Imagem exibida no formulário de doação</span></div>' +
      '</div>' +
      '<div class="admin-food-card-actions">' +
        '<button class="admin-mini-action" id="edit-cesta-img" aria-label="Editar imagem da cesta"><i class="fa-regular fa-pen-to-square"></i></button>' +
      '</div>' +
    '</article>';
  }

  function renderFoodCards(rows) {
    if (!rows.length) {
      return '<div class="admin-food-grid">' + renderCestaCompletaCard() + '</div>' +
        '<div class="admin-empty"><i class="fa-solid fa-box-open"></i><p>Nenhum alimento encontrado no Firebase.</p>' +
        '<button class="admin-button primary" id="seed-foods-empty"><i class="fa-solid fa-seedling"></i>Cadastrar alimentos padrao agora</button></div>';
    }
    var cards = rows.map(function (f) {
      var img = foodImage(f);
      var s = foodStatus(f);
      var qty = foodQty(f);
      var goal = foodGoal(f);
      var pct = goal ? Math.min(100, Math.round((qty / goal) * 100)) : 0;
      return '<article class="admin-food-card">' +
        '<div class="admin-food-card-img">' +
          (img
            ? '<img src="' + esc(img) + '" alt="' + esc(foodName(f)) + '" loading="lazy">'
            : '<div class="admin-food-card-no-img"><i class="fa-solid fa-image"></i></div>') +
          '<span class="admin-food-card-badge badge-' + s[1] + '">' + esc(s[0]) + '</span>' +
        '</div>' +
        '<div class="admin-food-card-body">' +
          '<div class="admin-food-card-name">' + esc(foodName(f)) + '</div>' +
          '<div class="admin-food-card-meta">' +
            badge(foodCategory(f), "blue") +
            '<span class="admin-food-card-unit">' + esc(foodUnit(f)) + '</span>' +
          '</div>' +
          (goal
            ? '<div class="admin-food-card-progress">' +
                '<div class="admin-progress-track" style="margin:0"><div class="admin-progress-fill" style="--pct:' + pct + '%"></div></div>' +
                '<span>' + fmtInt(qty) + ' / ' + fmtInt(goal) + ' · ' + pct + '%</span>' +
              '</div>'
            : '<div class="admin-food-card-stock">Estoque: <strong>' + fmtInt(qty) + '</strong>' + (foodMin(f) ? ' · Mínimo: ' + fmtInt(foodMin(f)) : '') + '</div>') +
          (foodBasketQty(f) ? '<div class="admin-food-card-basket"><i class="fa-solid fa-basket-shopping"></i> ' + esc(foodBasketQty(f)) + ' por cesta</div>' : '') +
        '</div>' +
        '<div class="admin-food-card-actions">' +
          '<button class="admin-mini-action" data-food-edit="' + esc(f.id) + '" aria-label="Editar"><i class="fa-regular fa-pen-to-square"></i></button>' +
          '<button class="admin-mini-action danger" data-food-delete="' + esc(f.id) + '" aria-label="Excluir"><i class="fa-regular fa-trash-can"></i></button>' +
        '</div>' +
      '</article>';
    }).join("");
    return '<div class="admin-food-grid">' + renderCestaCompletaCard() + cards + '</div>' +
      '<p class="admin-table-foot">Mostrando ' + fmtInt(rows.length) + ' de ' + fmtInt(state.data.foods.length) + ' alimentos</p>';
  }

  var FOOD_UNIT_SUGGESTIONS = ["kg", "g", "un", "L", "ml", "cx", "pacote", "dz"];

  function renderFoodQuickForm() {
    return '<form id="food-quick-form" class="admin-form-grid">' +
      '<div class="admin-food-form-preview" id="food-img-preview"><i class="fa-solid fa-image"></i><span>Prévia da imagem</span></div>' +

      '<div class="admin-form-section-title"><i class="fa-solid fa-tag"></i>Informações básicas</div>' +
      '<label>Nome do alimento <span class="req">*</span>' +
        '<input name="nome" id="food-form-nome" required placeholder="Ex.: Arroz, Feijão, Macarrão...">' +
      '</label>' +
      '<div class="admin-form-row">' +
        '<label>Categoria <span class="req">*</span>' +
          '<input name="categoria" id="food-form-cat" required list="food-categories-list" autocomplete="off" placeholder="Ex.: Grãos">' +
          '<datalist id="food-categories-list"></datalist>' +
        '</label>' +
        '<label>Unidade <span class="req">*</span>' +
          '<input name="unidade" id="food-form-unit" required list="food-units-list" autocomplete="off" placeholder="kg, un, ml...">' +
          '<datalist id="food-units-list">' + FOOD_UNIT_SUGGESTIONS.map(function (u) { return '<option value="' + esc(u) + '"></option>'; }).join("") + '</datalist>' +
        '</label>' +
      '</div>' +
      '<label>Qtd. por cesta<input name="qtdPorCesta" placeholder="Ex.: 1 kg"></label>' +

      '<div class="admin-form-section-title"><i class="fa-solid fa-warehouse"></i>Estoque &amp; metas</div>' +
      '<div class="admin-form-row">' +
        '<label>Estoque atual <span class="req">*</span><input name="kg" id="food-form-kg" type="number" step="0.01" min="0" required placeholder="0"></label>' +
        '<label>Estoque mínimo<input name="minimo" id="food-form-min" type="number" step="0.01" min="0" placeholder="0"></label>' +
      '</div>' +
      '<label>Meta (kg)' +
        '<input name="meta" id="food-form-meta" type="number" step="1" min="0" placeholder="0">' +
        '<small class="admin-field-hint">Deixe em branco se este item não tiver meta de campanha.</small>' +
      '</label>' +

      '<div class="admin-form-section-title"><i class="fa-solid fa-image"></i>Imagem do alimento</div>' +
      '<label>URL da imagem (ou envie abaixo)' +
        '<input name="imagem" id="food-form-img" type="url" placeholder="https://...">' +
      '</label>' +
      '<label class="admin-upload-box" id="food-upload-box">' +
        '<input name="arquivo" id="food-form-file" type="file" accept="image/*">' +
        '<i class="fa-solid fa-cloud-arrow-up"></i>' +
        '<span>Enviar imagem ao Cloud (R2 / Cloudinary)</span>' +
        '<small>Clique ou arraste · Preenche a URL automaticamente após o upload</small>' +
      '</label>' +
      '<button class="admin-button primary block" type="submit" id="food-form-submit"><i class="fa-regular fa-floppy-disk"></i>Salvar alimento</button>' +
      '</form>';
  }

  function renderWhatsApp() {
    var admins = state.data.whatsappAdmins || [];
    var logs = state.data.whatsappLogs || [];
    var cfg = state.data.waConfig || {};
    var today = new Date().toISOString().slice(0, 10);
    var todayLogs = logs.filter(function (l) { return String(l.created_at || l.createdAt || "").slice(0, 10) === today; });
    var sent = todayLogs.filter(function (l) { return ["enviado", "sent", "ok"].indexOf(slug(l.status)) >= 0; }).length;
    var failed = todayLogs.filter(function (l) { return ["erro", "falha", "failed"].indexOf(slug(l.status)) >= 0; }).length;
    var active = admins.filter(function (a) { return slug(a.status || "ativo") === "ativo"; }).length;
    var groups = Array.isArray(cfg.grupos) ? cfg.grupos.length : 0;
    return '<div class="admin-view active">' +
      '<div class="admin-action-row"><button class="admin-button primary" id="wa-add-admin"><i class="fa-solid fa-plus"></i>Adicionar admin</button><button class="admin-button" id="wa-test-top"><i class="fa-brands fa-whatsapp"></i>Testar conexão</button></div>' +
      '<div class="admin-grid admin-kpi-grid admin-kpi-grid-compact admin-kpi-grid-stacked">' +
      kpiCard({ label: "Admins ativos", value: fmtInt(active), icon: "fa-users", tone: "linear-gradient(135deg,#a855f7,#7c3aed)", spark: "linear-gradient(90deg,transparent,#a855f7,transparent)", trend: "Firebase" }) +
      kpiCard({ label: "Grupos conectados", value: fmtInt(groups), icon: "fa-brands fa-whatsapp", tone: "linear-gradient(135deg,#10b981,#059669)", spark: "linear-gradient(90deg,transparent,#10b981,transparent)", trend: cfg.ativo ? "WhatsApp ativo" : "WhatsApp inativo" }) +
      kpiCard({ label: "Notificacoes hoje", value: fmtInt(sent), icon: "fa-paper-plane", tone: "linear-gradient(135deg,#3b82f6,#2563eb)", spark: "linear-gradient(90deg,transparent,#2f7cff,transparent)", trend: "Hoje" }) +
      kpiCard({ label: "Falhas hoje", value: fmtInt(failed), icon: "fa-triangle-exclamation", tone: "linear-gradient(135deg,#fb7185,#ef4444)", spark: "linear-gradient(90deg,transparent,#fb5d6b,transparent)", trend: "Hoje" }) +
      '</div>' +
      '<div class="admin-grid admin-two-column">' +
      panel("Administradores cadastrados", renderWhatsAppAdmins(admins)) +
      '<aside class="admin-grid">' + panel("Configuracoes de notificacao", renderWhatsAppSettings(cfg), { className: "admin-side-panel" }) + panel("Teste de conexao com WhatsApp", renderWhatsAppConnection(cfg), { className: "admin-side-panel" }) + '</aside>' +
      '</div>' +
      panel("Historico recente de mensagens automaticas enviadas", renderWhatsAppLogs(logs), { className: "admin-full-panel" }) +
      '</div>';
  }

  function renderWhatsAppAdmins(admins) {
    if (!admins.length) {
      return '<div class="admin-empty"><i class="fa-solid fa-users"></i><p>Nenhum administrador de WhatsApp cadastrado no Firebase.</p></div>';
    }
    return '<div class="admin-expand-list">' +
      admins.map(function (a) {
        var name = a.nome || a.name || "Administrador";
        var tags = Array.isArray(a.avisos) ? a.avisos : String(a.avisos || "").split(",").filter(Boolean);
        var phone = a.telefone || a.whatsapp || a.phone || "";
        return '<details class="admin-expand-row">' +
          '<summary class="admin-expand-summary">' +
            '<div class="admin-person-row"><span class="admin-person-avatar">' + esc(initials(name)) + '</span><span class="admin-expand-title">' + esc(name) + '</span></div>' +
            statusBadge(a.status || "ativo") +
            '<i class="fa-solid fa-chevron-down admin-expand-chevron" aria-hidden="true"></i>' +
          '</summary>' +
          '<div class="admin-expand-detail">' +
            contactLinkHtml("WhatsApp", phone) +
            '<span><strong>Função:</strong> ' + esc(a.funcao || a.role || "—") + '</span>' +
            '<span><strong>Tipo de aviso:</strong> ' + (tags.length ? tags.map(function (t) { return badge(WA_AVISO_LABELS[t] || t, "blue"); }).join(" ") : '<span class="admin-field-hint">Nenhum</span>') + '</span>' +
            '<div class="admin-row-actions">' +
              '<button class="admin-mini-action" data-wa-admin-edit="' + esc(a.id) + '" aria-label="Editar administrador"><i class="fa-regular fa-pen-to-square"></i></button>' +
              '<button class="admin-mini-action danger" data-wa-admin-delete="' + esc(a.id) + '" aria-label="Excluir administrador"><i class="fa-regular fa-trash-can"></i></button>' +
            '</div>' +
          '</div>' +
        '</details>';
      }).join("") +
      '</div>';
  }

  function renderWhatsAppSettings(cfg) {
    var rows = [
      ["Nova doacao", "Notificar quando uma nova doacao for registrada", "whatsapp_notify_donation"],
      ["Nova familia cadastrada", "Notificar quando uma familia for cadastrada", "whatsapp_notify_family"],
      ["Tarefa criada", "Notificar quando uma tarefa for criada", "whatsapp_notify_task"],
      ["Estoque baixo", "Notificar quando um item atingir estoque minimo", "whatsapp_notify_stock"],
    ];
    return '<div class="admin-toggle-list">' + rows.map(function (r) {
      var on = state.data.settings && state.data.settings[r[2]] === "true";
      return '<div class="admin-toggle-row"><span><strong>' + esc(r[0]) + '</strong><small>' + esc(r[1]) + '</small></span><button class="admin-toggle ' + (on ? "on" : "") + '" data-config-toggle="' + esc(r[2]) + '" aria-pressed="' + on + '"></button></div>' + (r[2] === "whatsapp_notify_donation" ? "" : '<small class="admin-field-hint">Envio automatico ainda nao implementado para este tipo.</small>');
    }).join("") + '</div>';
  }

  function renderWhatsAppConnection(cfg) {
    var on = !!cfg.ativo;
    return '<form id="wa-connection-form" class="admin-form-grid">' +
      '<label>Chave da API (CallMeBot)<input name="apikey" type="text" value="' + esc(cfg.apikey || "") + '" placeholder="Cole aqui a chave obtida no CallMeBot"></label>' +
      '<small class="admin-field-hint">Gere a chave gratuita no site do CallMeBot e cole aqui. Sem chave configurada, nenhuma mensagem e enviada.</small>' +
      '<div class="admin-toggle-row"><span><strong>Notificacoes ativas</strong><small>Liga/desliga o envio automatico de mensagens de doacao.</small></span><button type="button" class="admin-toggle ' + (on ? "on" : "") + '" data-config-toggle="whatsapp_ativo" aria-pressed="' + on + '"></button></div>' +
      '<div class="admin-form-actions">' +
      '<button type="submit" class="admin-button primary block" id="wa-connection-save"><i class="fa-regular fa-floppy-disk"></i>Salvar chave da API</button>' +
      '<button type="button" class="admin-button block" id="wa-test"><i class="fa-brands fa-whatsapp"></i>Testar agora</button>' +
      '</div>' +
      '</form>';
  }

  function renderWhatsAppLogs(logs) {
    if (!logs.length) {
      return '<div class="admin-empty"><i class="fa-solid fa-comment-slash"></i><p>Nenhum log de WhatsApp encontrado no Firebase.</p></div>';
    }
    return '<div class="admin-list">' +
      logs.slice(0, 8).map(function (l) {
        var destinatario = esc(l.destinatario || l.to || "—");
        var detalhes = l.detalhes || l.message || "";
        return '<div class="admin-list-item">' +
          '<div class="admin-list-icon"><i class="fa-solid fa-paper-plane"></i></div>' +
          '<div class="admin-list-body">' +
            '<div class="admin-list-title">' + badge(l.tipo || l.type || "Mensagem", "purple") + ' ' + statusBadge(l.status || "enviado") + '</div>' +
            '<div class="admin-list-sub">' + fmtDate(l.created_at || l.createdAt, true) + ' · ' + destinatario + (detalhes ? ' · ' + esc(detalhes) : '') + '</div>' +
          '</div>' +
        '</div>';
      }).join("") +
      '</div>';
  }

  function galleryUrl(item) { return item.url || item.src || item.image || item.imagem || ""; }
  function galleryType(item) { return slug(item.tipo || item.type || "").indexOf("video") >= 0 ? "video" : "imagem"; }

  function filteredGallery() {
    var f = state.filters.gallery;
    return (state.data.gallery || []).filter(function (row) {
      return matchesSearch(row, ["titulo", "legenda", "categoria", "tipo"]) &&
        (f.categoria === "todos" || slug(row.categoria) === f.categoria) &&
        (f.tipo === "todos" || galleryType(row) === f.tipo);
    });
  }

  /* Imagens existentes no projeto (pasta img/ e raiz) */
  var SITE_IMAGES = [
    { url: "img/hero-banner.jpg",             titulo: "Banner principal",             alt: "Banner principal do site",            categoria: "banners",      visibilidade: "publica"  },
    { url: "img/hero-banner-mobile.jpg",      titulo: "Banner principal mobile",       alt: "Banner principal mobile",             categoria: "banners",      visibilidade: "publica"  },
    { url: "img/capa-principal-desktop.jpg",  titulo: "Capa principal desktop",        alt: "Capa da página inicial desktop",      categoria: "banners",      visibilidade: "publica"  },
    { url: "img/capa-principal-mobile.jpg",   titulo: "Capa principal mobile",         alt: "Capa da página inicial mobile",       categoria: "banners",      visibilidade: "publica"  },
    { url: "img/cesta-basica.jpg",            titulo: "Cesta básica",                  alt: "Foto da cesta básica de alimentos",   categoria: "campanhas",    visibilidade: "publica"  },
    { url: "img/cesta-basica.png",            titulo: "Cesta básica (PNG)",             alt: "Foto da cesta básica de alimentos",   categoria: "campanhas",    visibilidade: "publica"  },
    { url: "img/card-doacao.jpg",             titulo: "Card Doação",                   alt: "Card de chamada para doação",         categoria: "cards",        visibilidade: "publica"  },
    { url: "img/card-doacao-desk.jpg",        titulo: "Card Doação desktop",           alt: "Card de doação versão desktop",       categoria: "cards",        visibilidade: "privada"  },
    { url: "img/card-espiritual.jpg",         titulo: "Card Espiritual",               alt: "Card voluntário espiritual",          categoria: "cards",        visibilidade: "publica"  },
    { url: "img/card-espiritual-desk.jpg",    titulo: "Card Espiritual desktop",       alt: "Card espiritual versão desktop",      categoria: "cards",        visibilidade: "privada"  },
    { url: "img/card-logistica.jpg",          titulo: "Card Logística",                alt: "Card voluntário logística",           categoria: "cards",        visibilidade: "publica"  },
    { url: "img/card-logistica-desk.jpg",     titulo: "Card Logística desktop",        alt: "Card logística versão desktop",       categoria: "cards",        visibilidade: "privada"  },
    { url: "img/card-voluntario.jpg",         titulo: "Card Voluntário",               alt: "Card de chamada para voluntários",    categoria: "voluntarios",  visibilidade: "publica"  },
    { url: "img/card-voluntario-desk.jpg",    titulo: "Card Voluntário desktop",       alt: "Card voluntário versão desktop",      categoria: "voluntarios",  visibilidade: "privada"  },
    { url: "img/hero-voluntario-desktop.jpg", titulo: "Banner Voluntários desktop",    alt: "Banner da página de voluntários",     categoria: "voluntarios",  visibilidade: "publica"  },
    { url: "img/hero-voluntario-mobile.jpg",  titulo: "Banner Voluntários mobile",     alt: "Banner voluntários mobile",           categoria: "voluntarios",  visibilidade: "publica"  },
    { url: "img/capa-voluntario-mobile.jpg",  titulo: "Capa Voluntários mobile",       alt: "Capa da página de voluntários mobile",categoria: "voluntarios",  visibilidade: "privada"  },
    { url: "img/mockup-voluntario.png",       titulo: "Mockup voluntário",             alt: "Mockup da área de voluntários",       categoria: "voluntarios",  visibilidade: "privada"  },
    { url: "img/folha-header.jpg",            titulo: "Folha header decorativa",       alt: "Elemento decorativo folha",           categoria: "decorativos",  visibilidade: "privada"  },
    { url: "img/dona-fab.jpeg",               titulo: "Dona Fábia",                    alt: "Foto da assistida Dona Fábia",        categoria: "pessoas",      visibilidade: "publica"  },
    { url: "logo-semear.jpeg",                titulo: "Logo Ação Social Semear",        alt: "Logomarca da Ação Social Semear",     categoria: "logos",        visibilidade: "privada"  },
    { url: "logo-maanaim.jpeg",              titulo: "Logo Comunidade Maanaim",        alt: "Logomarca da Comunidade Maanaim",     categoria: "logos",        visibilidade: "privada"  },
  ];

  function renderGallery() {
    var rows = filteredGallery();
    var all = state.data.gallery || [];
    var cfg = state.data.settings || {};
    var images = all.filter(function (g) { return galleryType(g) === "imagem"; }).length;
    var videos = all.filter(function (g) { return galleryType(g) === "video"; }).length;
    var views = all.reduce(function (s, g) { return s + number(g.visualizacoes || g.views); }, 0);
    var cats = unique(all.map(function (g) { return g.categoria; })).filter(Boolean);
    return '<div class="admin-view active">' +
      '<div class="admin-action-row"><button class="admin-button primary" id="gallery-add"><i class="fa-solid fa-plus"></i>Adicionar midia</button><button class="admin-button" id="gallery-import-site"><i class="fa-solid fa-file-import"></i>Importar imagens do site</button></div>' +
      '<div class="admin-grid admin-kpi-grid admin-kpi-grid-compact admin-kpi-grid-stacked">' +
      kpiCard({ label: "Total de midias", value: fmtInt(all.length), icon: "fa-camera", tone: "linear-gradient(135deg,#a855f7,#7c3aed)", spark: "linear-gradient(90deg,transparent,#a855f7,transparent)", trend: "Firebase" }) +
      kpiCard({ label: "Imagens", value: fmtInt(images), icon: "fa-images", tone: "linear-gradient(135deg,#14b8a6,#10b981)", spark: "linear-gradient(90deg,transparent,#22d3ee,transparent)", trend: "Cloud" }) +
      kpiCard({ label: "Videos", value: fmtInt(videos), icon: "fa-video", tone: "linear-gradient(135deg,#3b82f6,#2563eb)", spark: "linear-gradient(90deg,transparent,#2f7cff,transparent)", trend: "Cloud" }) +
      kpiCard({ label: "Visualizacoes", value: fmtInt(views), icon: "fa-eye", tone: "linear-gradient(135deg,#f59e0b,#d97706)", spark: "linear-gradient(90deg,transparent,#f59e0b,transparent)", trend: "Registros reais" }) +
      '</div>' +
      '<div class="admin-grid admin-gallery-layout">' +
      '<main>' + renderGalleryFilters(cats) + renderGalleryGrid(rows) + '</main>' +
      '<aside class="admin-grid">' + panel("Uploads recentes", renderRecentUploads(all), { className: "admin-side-panel" }) + panel("Armazenamento", renderStorageSummary(all), { className: "admin-side-panel" }) + '</aside>' +
      '</div>' +
      panel("Imagens dos cards de voluntario", renderVolunteerCardSettings(cfg)) +
      '</div>';
  }

  function renderGalleryFilters(cats) {
    return '<div class="admin-filter-bar">' +
      '<input class="admin-filter-input" id="gallery-inline-search" placeholder="Buscar midias..." value="' + esc(($("#admin-search") || {}).value || "") + '">' +
      selectFilter("gallery", "categoria", [["todos", "Todas as categorias"]].concat(cats.map(function (c) { return [slug(c), c]; }))) +
      selectFilter("gallery", "tipo", [["todos", "Todos os tipos"], ["imagem", "Imagens"], ["video", "Videos"]]) +
      '<button class="admin-button" data-clear-filter="gallery"><i class="fa-solid fa-filter-circle-xmark"></i><span class="admin-clearfilter-label">Limpar filtros</span></button>' +
      '</div>';
  }

  function renderGalleryGrid(rows) {
    if (!rows.length) {
      return '<div class="admin-empty"><i class="fa-solid fa-images"></i>' +
        '<p>Nenhuma mídia na galeria ainda.</p>' +
        '<button class="admin-button primary" id="gallery-import-site-empty"><i class="fa-solid fa-file-import"></i>Importar imagens do site agora</button>' +
        '</div>';
    }
    return '<div class="admin-media-grid">' + rows.map(function (g) {
      var url = galleryUrl(g);
      var title = g.titulo || g.legenda || "Midia";
      var isVideo = galleryType(g) === "video";
      var thumb = isVideo ? (g.poster_url || g.poster || url) : url;
      var pub = (g.visibilidade || "publica") === "publica";
      return '<article class="admin-media-card">' +
        '<div class="admin-media-thumb">' +
          (thumb ? '<img src="' + esc(thumb) + '" alt="' + esc(title) + '" loading="lazy">' : '<span class="admin-media-no-img"><i class="fa-solid fa-image"></i></span>') +
          '<span class="admin-media-kind"><i class="fa-solid ' + (isVideo ? "fa-play" : "fa-image") + '"></i></span>' +
          '<span class="admin-media-vis ' + (pub ? "pub" : "priv") + '">' + (pub ? "Pública" : "Privada") + '</span>' +
        '</div>' +
        '<div class="admin-media-body">' +
          '<strong title="' + esc(title) + '">' + esc(title) + '</strong>' +
          '<span>' + badge(g.categoria || "geral", "blue") + '</span>' +
          '<span class="admin-media-date">' + fmtDate(g.created_at || g.createdAt) + '</span>' +
        '</div>' +
        '<div class="admin-row-actions">' +
          '<a class="admin-mini-action" href="' + esc(url) + '" target="_blank" rel="noopener" aria-label="Ver"><i class="fa-regular fa-eye"></i></a>' +
          '<button class="admin-mini-action" data-gallery-edit="' + esc(g.id) + '" aria-label="Editar"><i class="fa-regular fa-pen-to-square"></i></button>' +
          '<button class="admin-mini-action danger" data-gallery-delete="' + esc(g.id) + '" aria-label="Excluir"><i class="fa-regular fa-trash-can"></i></button>' +
        '</div>' +
      '</article>';
    }).join("") +
    '</div><p class="admin-table-foot">Mostrando ' + fmtInt(rows.length) + ' de ' + fmtInt(state.data.gallery.length) + ' mídias</p>';
  }

  function renderGalleryEditModal() {
    var cats = ["banners", "campanhas", "cards", "voluntarios", "decorativos", "pessoas", "logos", "eventos", "geral"];
    return '<div id="gallery-edit-backdrop" class="admin-modal-backdrop" aria-hidden="true">' +
      '<div class="admin-modal" role="dialog" aria-modal="true" aria-label="Editar mídia">' +
        '<div class="admin-modal-header">' +
          '<h2>Editar mídia</h2>' +
          '<button class="admin-icon-button" id="gallery-edit-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>' +
        '</div>' +
        '<div class="admin-modal-body">' +
          '<form id="gallery-edit-form" class="admin-form-grid">' +
            '<input type="hidden" name="id">' +
            /* Preview da imagem atual */
            '<div class="admin-food-form-preview" id="gallery-edit-preview"><i class="fa-solid fa-image"></i><span>Prévia</span></div>' +
            '<label>Título' +
              '<input name="titulo" required placeholder="Ex.: Banner da campanha de Natal">' +
            '</label>' +
            '<label>Subtítulo / Descrição' +
              '<textarea name="legenda" rows="2" placeholder="Descrição curta da imagem (opcional)"></textarea>' +
            '</label>' +
            '<label>Texto alternativo (acessibilidade)' +
              '<input name="alt" placeholder="Descreva a imagem para leitores de tela">' +
            '</label>' +
            '<div class="admin-form-row">' +
              '<label>Categoria' +
                '<select name="categoria">' +
                cats.map(function (c) { return '<option value="' + c + '">' + c.charAt(0).toUpperCase() + c.slice(1) + '</option>'; }).join("") +
                '</select>' +
              '</label>' +
              '<label>Visibilidade' +
                '<select name="visibilidade">' +
                  '<option value="publica">Pública</option>' +
                  '<option value="privada">Privada</option>' +
                '</select>' +
              '</label>' +
            '</div>' +
            '<label>URL da imagem' +
              '<input name="url" type="url" placeholder="https://...">' +
            '</label>' +
            '<label class="admin-upload-box">' +
              '<input name="arquivo" type="file" accept="image/*,video/*" id="gallery-edit-file">' +
              '<i class="fa-solid fa-cloud-arrow-up"></i>' +
              '<span>Substituir imagem (R2 / Cloudinary)</span>' +
              '<small>Selecione um arquivo para fazer upload e substituir a imagem atual</small>' +
            '</label>' +
            '<div class="admin-form-row">' +
              '<button class="admin-button" type="button" id="gallery-edit-cancel">Cancelar</button>' +
              '<button class="admin-button primary" type="submit"><i class="fa-regular fa-floppy-disk"></i>Salvar alterações</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderRecentUploads(all) {
    if (!all.length) return '<div class="admin-empty">Nenhum upload registrado.</div>';
    return '<div class="admin-list">' + all.slice(0, 5).map(function (g) {
      var url = galleryUrl(g);
      return '<div class="admin-list-item">' + (url ? '<img class="admin-list-thumb" src="' + esc(g.poster_url || url) + '" alt="">' : '<div class="admin-list-icon"><i class="fa-regular fa-image"></i></div>') + '<div class="admin-list-body"><div class="admin-list-title">' + esc(g.titulo || g.legenda || "Midia") + '</div><div class="admin-list-sub">' + fmtDate(g.created_at || g.createdAt) + '</div></div>' + badge("OK", "green") + '</div>';
    }).join("") + '</div>';
  }

  function renderStorageSummary(all) {
    var bytes = all.reduce(function (s, g) { return s + number(g.bytes || g.size || g.tamanho); }, 0);
    var gb = bytes / 1024 / 1024 / 1024;
    return '<div class="admin-progress-group">' +
      progressItem("Uso registrado no Cloud", gb.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " GB", "0%", "Itens: " + fmtInt(all.length), "Bytes: " + fmtInt(bytes)) +
      '<div class="admin-list-item admin-insight"><div class="admin-list-body"><div class="admin-list-title">Sem estimativa inventada</div><div class="admin-list-sub">O painel mostra apenas tamanho salvo nos metadados da galeria.</div></div></div>' +
      '</div>';
  }

  function renderSettings() {
    var cfg = state.data.settings || {};
    return '<div class="admin-view active">' +
      '<div class="admin-action-row"><button class="admin-button primary" type="button" id="settings-save-top"><i class="fa-solid fa-floppy-disk"></i>Salvar alterações</button><button class="admin-button" type="button" id="settings-reset"><i class="fa-solid fa-rotate-left"></i>Restaurar padrão</button></div>' +
      '<form id="settings-form" novalidate>' +
      panel("Informações da instituição", renderInstitutionSettings(cfg)) +
      '<div class="admin-grid admin-two-column" style="margin-top:0">' +
        panel("Preferências de notificação", renderNotificationSettings(cfg)) +
        panel("Prévia das cores do sistema", renderColorPreview(cfg)) +
      '</div>' +
      '<div class="admin-grid admin-two-column" style="margin-top:0">' +
        panel("Segurança da conta", renderSecuritySettings(cfg)) +
        panel("Backup e restauração", renderBackupSettings(cfg)) +
      '</div>' +
      panel("Video da Acao Social", renderVideoAcaoSettings(cfg)) +
      panel("Cloudflare R2 — Armazenamento de mídias", renderR2Settings(cfg)) +
      panel("Dona Assunção — Backend de IA (FastAPI + Gemini)", renderDonaBackendSettings(cfg)) +
      '<div class="admin-settings-actions"><button class="admin-button" type="button" id="settings-reset2"><i class="fa-solid fa-rotate-left"></i>Restaurar padrão</button><button class="admin-button primary" type="submit"><i class="fa-solid fa-check"></i>Salvar alterações</button></div>' +
      '</form></div>';
  }

  function renderDonaBackendSettings(cfg) {
    var url = cfg["dona_assuncao_backend_url"] || "";
    var status = url ? "Configurado" : "Nao configurado";
    var statusTone = url ? "green" : "yellow";
    return '<div class="admin-form-grid">' +
      '<div class="admin-list-item admin-insight" style="margin-bottom:12px"><div class="admin-list-icon" style="--tone:linear-gradient(135deg,#7c3aed,#5b21b6)"><i class="fa-solid fa-robot"></i></div><div class="admin-list-body"><div class="admin-list-title">Backend da Dona Assuncao ' + badge(status, statusTone) + '</div><div class="admin-list-sub">Quando configurado, o chat publico chama esse backend (Gemini real, com memoria de conversa) em vez de responder so pelo matching local. Deixe em branco para manter apenas o matching local.</div></div></div>' +
      '<label>URL base do backend (ex: https://sua-api.exemplo.com)<input name="dona_assuncao_backend_url" type="url" value="' + esc(url) + '" placeholder="https://sua-api.exemplo.com"></label>' +
      '<div class="admin-form-row"><button class="admin-button" type="button" id="dona-backend-test"><i class="fa-solid fa-plug-circle-check"></i>Testar conexao</button></div>' +
      '</div>';
  }

  function renderR2Settings(cfg) {
    var workerUrl = cfg["r2_worker_url"] || "";
    var status = workerUrl ? "Configurado" : "Nao configurado";
    var statusTone = workerUrl ? "green" : "yellow";
    return '<div class="admin-form-grid">' +
      '<div class="admin-list-item admin-insight" style="margin-bottom:12px"><div class="admin-list-icon" style="--tone:linear-gradient(135deg,#f97316,#ea580c)"><i class="fa-solid fa-cloud"></i></div><div class="admin-list-body"><div class="admin-list-title">Cloudflare R2 ' + badge(status, statusTone) + '</div><div class="admin-list-sub">Configure o Worker URL e o token para habilitar upload de imagens e videos diretamente ao R2. Sem R2, o sistema usa Cloudinary como fallback.</div></div></div>' +
      '<label>Worker URL (ex: https://doavida-media.SEU_USUARIO.workers.dev)<input name="r2_worker_url" type="url" value="' + esc(workerUrl) + '" placeholder="https://doavida-media.xxx.workers.dev"></label>' +
      '<label>Token de autenticacao do Worker (deixe vazio se nao configurou UPLOAD_TOKEN)<input name="r2_upload_token" type="password" value="' + esc(cfg["r2_upload_token"] || "") + '" placeholder="Token secreto (wrangler secret put UPLOAD_TOKEN)" autocomplete="new-password"></label>' +
      '<label>URL publica do bucket R2 (ex: https://pub-xxx.r2.dev)<input name="r2_public_url" type="url" value="' + esc(cfg["r2_public_url"] || "") + '" placeholder="https://pub-XXXX.r2.dev"></label>' +
      '<div class="admin-form-row"><button class="admin-button" type="button" id="r2-test"><i class="fa-solid fa-plug-circle-check"></i>Testar conexao R2</button><a class="admin-button" href="worker/COMO-FAZER-DEPLOY.md" target="_blank"><i class="fa-solid fa-book"></i>Guia de deploy</a></div>' +
      '</div>';
  }

  function videoAcaoYoutubeId(url) {
    var m = String(url || "").match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : "";
  }

  function videoAcaoIsFile(url) {
    return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(String(url || ""));
  }

  function renderVideoAcaoSettings(cfg) {
    var videoUrl = cfg["doavida_video_acao"] || "";
    var posterUrl = cfg["doavida_video_acao_poster"] || "";
    return '<div class="admin-form-grid">' +
      '<div class="admin-list-item admin-insight" style="margin-bottom:4px"><div class="admin-list-icon" style="--tone:linear-gradient(135deg,#ef4444,#b91c1c)"><i class="fa-solid fa-circle-play"></i></div><div class="admin-list-body"><div class="admin-list-title">Card de video da pagina inicial</div><div class="admin-list-sub">Aceita link do YouTube, arquivo MP4/WebM ou upload direto pelo painel. A capa e opcional, mas deixa o card mais bonito antes do play.</div></div></div>' +
      '<div class="admin-video-preview" id="video-acao-preview"><i class="fa-solid fa-film"></i><span>Previa do video</span></div>' +
      '<label>URL do video' +
        '<input id="video-acao-url" name="doavida_video_acao" type="url" value="' + esc(videoUrl) + '" placeholder="https://youtu.be/... ou https://.../video.mp4">' +
      '</label>' +
      '<label class="admin-upload-box" id="video-acao-upload-box">' +
        '<input id="video-acao-file" type="file" accept="video/*">' +
        '<i class="fa-solid fa-cloud-arrow-up"></i>' +
        '<span>Enviar video do computador</span>' +
        '<small>MP4 ou WebM. O arquivo sera enviado para R2 ou Cloudinary.</small>' +
      '</label>' +
      '<div class="admin-form-row">' +
        '<label>URL da capa/poster' +
          '<input id="video-acao-poster-url" name="doavida_video_acao_poster" type="url" value="' + esc(posterUrl) + '" placeholder="https://.../capa.jpg">' +
        '</label>' +
        '<label class="admin-upload-box" id="video-acao-poster-upload-box">' +
          '<input id="video-acao-poster-file" type="file" accept="image/*">' +
          '<i class="fa-solid fa-image"></i>' +
          '<span>Enviar capa</span>' +
        '</label>' +
      '</div>' +
      '<div class="admin-settings-actions">' +
        '<button type="button" class="admin-button" id="video-acao-preview-btn"><i class="fa-regular fa-eye"></i>Ver previa</button>' +
        '<button type="button" class="admin-button primary" id="video-acao-save"><i class="fa-regular fa-floppy-disk"></i>Salvar video</button>' +
      '</div>' +
      '</div>';
  }

  var VOL_CARD_DEFAULTS = [
    { key: "card1", label: "Organizacao dos Alimentos", icon: "fa-wheat-awn",
      defaultUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&h=320&fit=crop&auto=format" },
    { key: "card2", label: "Apoio Espiritual", icon: "fa-hands-praying",
      defaultUrl: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&h=320&fit=crop&auto=format" },
    { key: "card3", label: "Transporte", icon: "fa-truck",
      defaultUrl: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600&h=320&fit=crop&auto=format" },
    { key: "card4", label: "Ajuda na Coleta de Alimentos", icon: "fa-hand-holding-heart",
      defaultUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=320&fit=crop&auto=format" }
  ];

  function renderVolunteerCardSettings(cfg) {
    /* Os valores reais chegam via loadVolCardImages() (async, como os gráficos).
       Aqui renderizamos a estrutura com o cache atual ou os defaults. */
    var volCfg = {};
    try { volCfg = JSON.parse((cfg && cfg["doavida_vol_contrib"]) || "{}"); } catch (e) {}
    return '<div class="admin-form-grid">' +
      '<div class="admin-list-item admin-insight" style="margin-bottom:4px"><div class="admin-list-icon" style="--tone:linear-gradient(135deg,#7c3aed,#5b21b6)"><i class="fa-solid fa-images"></i></div><div class="admin-list-body"><div class="admin-list-title">Cards de tipo de contribuicao</div><div class="admin-list-sub">Imagens exibidas em <strong>/voluntario-form.html</strong> ao escolher o tipo de ajuda. Os valores sao carregados do Firebase ao abrir esta aba.</div></div></div>' +
      '<div class="admin-vol-cards-grid">' +
      VOL_CARD_DEFAULTS.map(function (c) {
        var url = volCfg[c.key] || c.defaultUrl;
        return '<div class="admin-vol-card-item">' +
          '<div class="admin-vol-card-img" id="vol-card-preview-' + c.key + '">' +
          '<img src="' + esc(url) + '" alt="' + esc(c.label) + '" loading="lazy">' +
          '<span class="admin-vol-card-chip"><i class="fa-solid ' + c.icon + '"></i> ' + esc(c.label) + '</span>' +
          '</div>' +
          '<label>URL da imagem<input type="url" id="vol-card-url-' + c.key + '" class="vol-card-url-input" data-card-key="' + c.key + '" value="' + esc(url) + '" placeholder="https://..."></label>' +
          '<label class="admin-upload-box admin-vol-upload-label">' +
          '<input type="file" accept="image/*" id="vol-card-file-' + c.key + '" style="display:none" data-card-key="' + c.key + '">' +
          '<i class="fa-solid fa-cloud-arrow-up"></i><span>Enviar imagem ao Cloud</span>' +
          '</label>' +
          '</div>';
      }).join("") +
      '</div>' +
      '<div class="admin-settings-actions" style="margin-top:4px">' +
      '<button type="button" class="admin-button primary" id="vol-cards-save"><i class="fa-solid fa-floppy-disk"></i>Salvar imagens dos cards</button>' +
      '</div>' +
      '</div>';
  }

  function cfgValue(cfg, key, fallback) {
    return cfg[key] != null && cfg[key] !== "" ? cfg[key] : (fallback || "");
  }

  function renderInstitutionSettings(cfg) {
    return '<div class="admin-form-grid">' +
      '<label>Nome da instituicao<input name="instituicao_nome" value="' + esc(cfgValue(cfg, "instituicao_nome", "Acao Social Semear")) + '"></label>' +
      '<label>Telefone<input name="instituicao_telefone" value="' + esc(cfgValue(cfg, "instituicao_telefone", "")) + '"></label>' +
      '<label>Endereco<input name="instituicao_endereco" value="' + esc(cfgValue(cfg, "instituicao_endereco", "")) + '"></label>' +
      '<div class="admin-form-row"><label>Cidade<input name="instituicao_cidade" value="' + esc(cfgValue(cfg, "instituicao_cidade", "Belem")) + '"></label><label>Estado<input name="instituicao_estado" value="' + esc(cfgValue(cfg, "instituicao_estado", "Para")) + '"></label></div>' +
      '<label>E-mail institucional<input name="instituicao_email" value="' + esc(cfgValue(cfg, "instituicao_email", "")) + '"></label>' +
      '</div>';
  }

  function renderNotificationSettings(cfg) {
    var rows = [["email", "E-mail"], ["whatsapp", "WhatsApp"], ["sms", "SMS"], ["sistema", "Notificacoes do sistema"], ["resumo", "Resumo diario"]];
    return '<div class="admin-toggle-list">' + rows.map(function (r) {
      var key = "notify_" + r[0], on = cfg[key] === "true";
      return '<div class="admin-toggle-row"><span><strong>' + r[1] + '</strong><small>Preferencia salva em configuracao</small></span><button type="button" class="admin-toggle ' + (on ? "on" : "") + '" data-config-toggle="' + key + '" aria-pressed="' + on + '"></button><input type="hidden" name="' + key + '" value="' + (on ? "true" : "false") + '"></div>';
    }).join("") + '<label>Horario de envio do resumo<input name="resumo_horario" value="' + esc(cfgValue(cfg, "resumo_horario", "")) + '"></label></div>';
  }

  function renderColorPreview(cfg) {
    var primary = cfgValue(cfg, "cor_primaria", "#7c3aed");
    var secondary = cfgValue(cfg, "cor_secundaria", "#10b981");
    var accent = cfgValue(cfg, "cor_destaque", "#22c55e");
    var alert = cfgValue(cfg, "cor_alerta", "#f59e0b");
    return '<div class="admin-form-grid"><div class="admin-color-grid">' +
      colorInput("cor_primaria", "Cor primaria", primary) + colorInput("cor_secundaria", "Cor secundaria", secondary) + colorInput("cor_destaque", "Cor de destaque", accent) + colorInput("cor_alerta", "Cor de alerta", alert) +
      '</div><div class="admin-list-item admin-insight"><div class="admin-list-body"><div class="admin-list-title">Exemplo de card</div><div class="admin-list-sub">As cores salvas podem ser usadas pelo tema.</div></div>' + badge("Sucesso", "green") + '</div></div>';
  }

  function colorInput(name, label, value) {
    return '<label>' + esc(label) + '<span class="admin-color-input"><input type="color" name="' + esc(name) + '" value="' + esc(value) + '"><input name="' + esc(name) + '_text" value="' + esc(value) + '"></span></label>';
  }

  function renderSecuritySettings(cfg) {
    return '<div class="admin-list" style="margin-bottom:14px">' +
      '<div class="admin-list-item"><div class="admin-list-icon"><i class="fa-solid fa-shield-halved"></i></div><div class="admin-list-body"><div class="admin-list-title">Autenticacao em dois fatores</div><div class="admin-list-sub">Nao disponivel nesta versao do painel.</div></div></div>' +
      '<div class="admin-list-item"><div class="admin-list-icon"><i class="fa-solid fa-mobile-screen"></i></div><div class="admin-list-body"><div class="admin-list-title">Sessoes ativas</div><div class="admin-list-sub">Gerenciadas pelo Firebase Auth</div></div></div>' +
      '</div>' +
      '<div id="password-change-card" class="admin-form-grid">' +
      '<div class="admin-form-section-title"><i class="fa-solid fa-key"></i>Alterar senha de acesso</div>' +
      '<label>Senha atual<input name="senha_atual" type="password" autocomplete="current-password"></label>' +
      '<label>Nova senha<input name="senha_nova" type="password" autocomplete="new-password"></label>' +
      '<label>Confirmar nova senha<input name="senha_confirma" type="password" autocomplete="new-password"></label>' +
      '<button type="button" class="admin-button primary block" id="password-change-submit"><i class="fa-regular fa-floppy-disk"></i>Atualizar senha</button>' +
      '</div>';
  }

  function renderBackupSettings(cfg) {
    return '<div class="admin-detail">' +
      detailField("Ultimo backup", fmtDate(cfg.backup_ultimo, true) === "-" ? "Nunca realizado" : fmtDate(cfg.backup_ultimo, true)) +
      detailField("Agendamento", "Manual (sem rotina automatica)") +
      '<small class="admin-field-hint">Gera e baixa um arquivo .json com todos os dados atuais (alimentos, doacoes, familias, voluntarios, tarefas, etc.). Guarde-o em local seguro.</small>' +
      '<button type="button" class="admin-button block" id="settings-backup"><i class="fa-solid fa-database"></i>Fazer backup agora</button>' +
      '</div>';
  }

  function renderVolunteerFilters(tipos) {
    return '<div class="admin-filter-bar">' +
      '<input class="admin-filter-input" id="volunteers-inline-search" placeholder="Buscar voluntário..." value="' + esc(($("#admin-search") || {}).value || "") + '">' +
      selectFilter("volunteers", "tipo", [["todos", "Todos os tipos"]].concat(tipos.map(function (t) { return [slug(t), t]; }))) +
      selectFilter("volunteers", "status", [["todos", "Todos os status"], ["ativo", "Ativo"], ["inativo", "Inativo"], ["aguardando", "Aguardando"]]) +
      '<button class="admin-button" data-clear-filter="volunteers"><i class="fa-solid fa-filter-circle-xmark"></i><span class="admin-clearfilter-label">Limpar filtros</span></button>' +
      '</div>';
  }

  function volunteerDisponibilidade(v) {
    var dados = v.dados || {};
    if (v.disponibilidade) return String(v.disponibilidade);
    if (Array.isArray(dados.disponibilidade)) return dados.disponibilidade.join(", ");
    if (Array.isArray(dados.dias)) return dados.dias.join(", ");
    return "";
  }

  function renderVolunteers() {
    var rows = filteredVolunteers();
    var all = state.data.volunteers;
    var active = all.filter(function (v) {
      return ["ativo", "participando", "confirmado", "active"].indexOf(slug(v.status || "ativo")) >= 0;
    }).length || all.length;
    var tipos = unique(all.map(function (v) { return v.tipo_label || v.tipo; })).filter(Boolean);
    var novos30d = all.filter(function (v) {
      var d = donationDate(v);
      return d && d >= new Date(Date.now() - 30 * 86400000);
    }).length;
    return '<div class="admin-view active">' +
      '<div class="admin-action-row">' +
      '<button class="admin-button primary" id="new-volunteer"><i class="fa-solid fa-plus"></i>Novo voluntário</button>' +
      '<button class="admin-button js-export"><i class="fa-solid fa-download"></i>Exportar</button>' +
      '</div>' +
      '<div class="admin-grid admin-kpi-grid admin-kpi-grid-compact admin-kpi-grid-stacked">' +
      kpiCard({ label: "Total de voluntários", value: fmtInt(all.length), icon: "fa-hands-holding", tone: "linear-gradient(135deg,#a855f7,#7c3aed)", spark: "linear-gradient(90deg,transparent,#a855f7,transparent)", trend: "Firebase" }) +
      kpiCard({ label: "Ativos", value: fmtInt(active), icon: "fa-user-check", tone: "linear-gradient(135deg,#22c55e,#16a34a)", spark: "linear-gradient(90deg,transparent,#22c55e,transparent)", trend: "Tempo real" }) +
      kpiCard({ label: "Tipos de ajuda", value: fmtInt(tipos.length), icon: "fa-list-check", tone: "linear-gradient(135deg,#14b8a6,#10b981)", spark: "linear-gradient(90deg,transparent,#22d3ee,transparent)", trend: "Cadastrados" }) +
      kpiCard({ label: "Novos (30 dias)", value: fmtInt(novos30d), icon: "fa-user-plus", tone: "linear-gradient(135deg,#3b82f6,#2563eb)", spark: "linear-gradient(90deg,transparent,#2f7cff,transparent)", trend: realTrend(entityGrowth(all)) }) +
      '</div>' +
      panel("Lista de voluntários", renderVolunteerFilters(tipos) + renderVolunteersTable(rows)) +
      '</div>';
  }

  var SPIRITUAL_MODALIDADE_LABELS = {
    intercessao: "Intercessão em oração",
    visita: "Visita presencial",
    ambos: "Ambas as formas",
  };
  var SPIRITUAL_DIAS_LABELS = {
    seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom",
  };
  var SPIRITUAL_DIAS_ORDEM = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
  var SPIRITUAL_HORARIOS_LABELS = {
    manha: "Manhã", tarde: "Tarde", noite: "Noite", flexivel: "Flexível",
  };

  function isSpiritualVolunteer(v) {
    var dados = v.dados || {};
    return slug(v.tipo) === "espiritual" ||
      (Array.isArray(dados.areas) && dados.areas.map(slug).indexOf("espiritual") >= 0);
  }

  function allSpiritualVolunteers() {
    return state.data.volunteers.filter(isSpiritualVolunteer);
  }

  function spiritualModalidade(v) {
    return (v.dados && v.dados.modalidade) || "";
  }

  function spiritualModalidadeCounts(rows) {
    var counts = { intercessao: 0, visita: 0, ambos: 0 };
    rows.forEach(function (v) {
      var m = spiritualModalidade(v);
      if (counts.hasOwnProperty(m)) counts[m]++;
    });
    return counts;
  }

  function spiritualDiasLabel(v) {
    var dias = (v.dados && v.dados.dias_visita) || [];
    if (!Array.isArray(dias) || !dias.length) return "—";
    return dias.map(function (d) { return SPIRITUAL_DIAS_LABELS[d] || d; }).join(", ");
  }

  function spiritualHorariosLabel(v) {
    var horarios = (v.dados && v.dados.horarios) || [];
    if (!Array.isArray(horarios) || !horarios.length) return "—";
    return horarios.map(function (h) { return SPIRITUAL_HORARIOS_LABELS[h] || h; }).join(", ");
  }

  function filteredSpiritual() {
    var f = state.filters.spiritual;
    return allSpiritualVolunteers().filter(function (row) {
      return matchesSearch(row, ["nome", "name", "telefone", "whatsapp"]) &&
        (f.modalidade === "todos" || spiritualModalidade(row) === f.modalidade) &&
        (f.status === "todos" || slug(row.status || "ativo") === f.status);
    });
  }

  function renderSpiritualFilters() {
    return '<div class="admin-filter-bar">' +
      '<input class="admin-filter-input" id="spiritual-inline-search" placeholder="Buscar voluntário..." value="' + esc(($("#admin-search") || {}).value || "") + '">' +
      selectFilter("spiritual", "modalidade", [["todos", "Todas as modalidades"]].concat(Object.keys(SPIRITUAL_MODALIDADE_LABELS).map(function (k) { return [k, SPIRITUAL_MODALIDADE_LABELS[k]]; }))) +
      selectFilter("spiritual", "status", [["todos", "Todos os status"], ["ativo", "Ativo"], ["inativo", "Inativo"], ["aguardando", "Aguardando"]]) +
      '<button class="admin-button" data-clear-filter="spiritual"><i class="fa-solid fa-filter-circle-xmark"></i><span class="admin-clearfilter-label">Limpar filtros</span></button>' +
      '</div>';
  }

  function renderSpiritualTable(rows) {
    if (!rows.length) {
      return '<div class="admin-empty"><i class="fa-solid fa-hands-praying"></i><p>Nenhum voluntário de apoio espiritual encontrado.</p></div>';
    }
    return adminPeopleBoard("Lista de voluntários de apoio espiritual", rows.map(function (v, index) {
      var nome = v.nome || v.name || "Voluntário";
      var bairro = (v.dados && v.dados.bairro) || "Bairro não informado";
      var modalidade = spiritualModalidade(v);
      var phone = v.telefone || v.whatsapp || "Telefone não informado";
      var wa = whatsappUrl(phone);
      var tone = ["blue", "green", "purple", "cyan"][index % 4];
      return '<details class="admin-donation-card admin-donation-card--' + tone + '">' +
        '<summary class="admin-donation-summary">' +
          '<span class="admin-donation-protocol">' + esc(v.protocolo || ("ESP-" + String(v.id || index + 1).slice(-6).toUpperCase())) + '</span>' +
          '<span class="admin-donation-status">' + statusBadge(v.status || "ativo") + '</span>' +
          '<span class="admin-donation-avatar" aria-hidden="true">' + esc(initials(nome)) + '</span>' +
          '<span class="admin-donation-person">' +
            '<strong>' + esc(nome) + '</strong>' +
            (wa ? '<a class="admin-donation-phone" href="' + esc(wa) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="fa-brands fa-whatsapp"></i>' + esc(phone) + '</a>' : '<small><i class="fa-solid fa-phone"></i>' + esc(phone) + '</small>') +
          '</span>' +
          '<span class="admin-donation-meta">' +
            '<small><i class="fa-solid fa-hands-praying"></i>' + esc(SPIRITUAL_MODALIDADE_LABELS[modalidade] || "Modalidade não informada") + '</small>' +
            '<small><i class="fa-solid fa-location-dot"></i>' + esc(bairro) + '</small>' +
          '</span>' +
          '<i class="fa-solid fa-chevron-down admin-donation-chevron" aria-hidden="true"></i>' +
        '</summary>' +
        '<div class="admin-donation-detail">' +
          '<div class="admin-donation-info">' + contactLinkHtml("WhatsApp", v.telefone || v.whatsapp) + '</div>' +
          '<div class="admin-donation-info"><span><i class="fa-solid fa-hands-praying"></i>Modalidade</span><strong>' + esc(SPIRITUAL_MODALIDADE_LABELS[modalidade] || "-") + '</strong></div>' +
          '<div class="admin-donation-info"><span><i class="fa-regular fa-calendar"></i>Dias disponíveis</span><strong>' + esc(spiritualDiasLabel(v)) + '</strong></div>' +
          '<div class="admin-donation-info"><span><i class="fa-regular fa-clock"></i>Horário disponível</span><strong>' + esc(spiritualHorariosLabel(v)) + '</strong></div>' +
          '<div class="admin-donation-actions">' +
            (wa ? '<a class="admin-donation-action view" href="' + esc(wa) + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i><span>WhatsApp</span></a>' : "") +
            '<button class="admin-donation-action view" data-volunteer-edit="' + esc(v.id) + '"><i class="fa-regular fa-pen-to-square"></i><span>Ver ficha</span></button>' +
            '<button class="admin-donation-action danger" data-volunteer-delete="' + esc(v.id) + '"><i class="fa-regular fa-trash-can"></i><span>Excluir</span></button>' +
          '</div>' +
        '</div>' +
      '</details>';
    }).join("")) +
      '<p class="admin-table-foot">Mostrando ' + fmtInt(rows.length) + ' de ' + fmtInt(allSpiritualVolunteers().length) + ' voluntários de apoio espiritual</p>';
  }

  function renderSpiritualRequests(all) {
    var comObservacao = all.filter(function (v) { return v.dados && String(v.dados.observacao || "").trim(); });
    if (!comObservacao.length) {
      return '<div class="admin-empty"><i class="fa-solid fa-comment-dots"></i><p>Nenhum pedido de oração registrado ainda.</p></div>';
    }
    return '<div class="admin-list">' +
      comObservacao.slice(0, 8).map(function (v) {
        var nome = v.nome || v.name || "Voluntário";
        return '<div class="admin-list-item"><div class="admin-list-icon">' + esc(initials(nome)) + '</div>' +
          '<div class="admin-list-body"><div class="admin-list-title">' + esc(nome) + '</div>' +
          '<div class="admin-list-sub">' + esc(v.dados.observacao) + '</div></div></div>';
      }).join("") +
      '</div>';
  }

  function renderSpiritualAgenda(all) {
    var visitantes = all.filter(function (v) { var m = spiritualModalidade(v); return m === "visita" || m === "ambos"; });
    return '<div class="admin-list">' +
      SPIRITUAL_DIAS_ORDEM.map(function (dia) {
        var count = visitantes.filter(function (v) {
          var dias = (v.dados && v.dados.dias_visita) || [];
          return Array.isArray(dias) && dias.indexOf(dia) >= 0;
        }).length;
        return '<div class="admin-list-item"><div class="admin-list-icon">' + count + '</div>' +
          '<div class="admin-list-body"><div class="admin-list-title">' + SPIRITUAL_DIAS_LABELS[dia] + '</div>' +
          '<div class="admin-list-sub">voluntário' + (count === 1 ? "" : "s") + ' disponível' + (count === 1 ? "" : "is") + ' para visitar</div></div></div>';
      }).join("") +
      '</div>';
  }

  function renderSpiritual() {
    var all = allSpiritualVolunteers();
    var rows = filteredSpiritual();
    var counts = spiritualModalidadeCounts(all);
    var visitasSemana = all.filter(function (v) {
      var m = spiritualModalidade(v);
      var dias = (v.dados && v.dados.dias_visita) || [];
      return (m === "visita" || m === "ambos") && Array.isArray(dias) && dias.length > 0;
    }).length;
    return '<div class="admin-view active">' +
      '<div class="admin-action-row">' +
      '<button class="admin-button js-export"><i class="fa-solid fa-download"></i>Exportar</button>' +
      '</div>' +
      '<div class="admin-grid admin-kpi-grid admin-kpi-grid-compact admin-kpi-grid-stacked">' +
      kpiCard({ label: "Total de voluntários", value: fmtInt(all.length), icon: "fa-hands-praying", tone: "linear-gradient(135deg,#a855f7,#7c3aed)", spark: "linear-gradient(90deg,transparent,#a855f7,transparent)", trend: "Firebase" }) +
      kpiCard({ label: "Intercessores (oração)", value: fmtInt(counts.intercessao), icon: "fa-hands", tone: "linear-gradient(135deg,#8b5cf6,#6d5dfc)", spark: "linear-gradient(90deg,transparent,#8b5cf6,transparent)", trend: "Tempo real" }) +
      kpiCard({ label: "Visitantes de famílias", value: fmtInt(counts.visita), icon: "fa-house-chimney", tone: "linear-gradient(135deg,#2f7cff,#2563eb)", spark: "linear-gradient(90deg,transparent,#2f7cff,transparent)", trend: "Tempo real" }) +
      kpiCard({ label: "Ambos", value: fmtInt(counts.ambos), icon: "fa-hands-holding-circle", tone: "linear-gradient(135deg,#22c55e,#16a34a)", spark: "linear-gradient(90deg,transparent,#22c55e,transparent)", trend: "Tempo real" }) +
      kpiCard({ label: "Visitas agendadas na semana", value: fmtInt(visitasSemana), icon: "fa-calendar-week", tone: "linear-gradient(135deg,#f7b731,#f59e0b)", spark: "linear-gradient(90deg,transparent,#f7b731,transparent)", trend: "Disponibilidade recorrente", trendNote: "Baseado nos dias marcados" }) +
      '</div>' +
      '<div class="admin-grid admin-tasks-layout">' +
      '<div>' + panel("Lista de voluntários de apoio espiritual", renderSpiritualFilters() + renderSpiritualTable(rows)) + '</div>' +
      '<aside class="admin-grid">' +
      panel("Distribuição por modalidade", '<div class="admin-donut-info"><canvas id="spiritual-modalidade"></canvas><div class="admin-legend" id="spiritual-modalidade-legend"></div></div>', { sub: "Como cada voluntário deseja ajudar" }) +
      panel("Pedidos e acompanhamento", renderSpiritualRequests(all), { sub: "Pedidos de oração e observações recebidas" }) +
      panel("Agenda da semana", renderSpiritualAgenda(all), { sub: "Disponibilidade de visitas por dia" }) +
      '</aside>' +
      '</div>' +
      '</div>';
  }

  function renderPreservedPage(pageId) {
    var map = {
      foods: ["Alimentos", "Os dados de estoque continuam vindo da camada de dados atual."],
      volunteers: ["Voluntarios", "A gestao detalhada pode ser expandida sobre os componentes novos."],
      gallery: ["Galeria", "A area visual foi preservada no menu para manter a rota administrativa."],
      whatsapp: ["WhatsApp", "As configuracoes de comunicacao continuam isoladas na camada existente."],
      settings: ["Configuracoes", "Ajustes administrativos permanecem acessiveis pela rota."],
    };
    var info = map[pageId] || ["Area administrativa", "Rota preservada."];
    return '<div class="admin-view active">' +
      panel(info[0], '<div class="admin-empty"><i class="fa-solid fa-layer-group"></i><p>' + esc(info[1]) + '</p><button class="admin-button primary js-export"><i class="fa-solid fa-download"></i>Exportar dados</button></div>') +
      '</div>';
  }

  function countWhere(rows, key, accepted) {
    return rows.filter(function (row) { return accepted.indexOf(slug(row[key])) >= 0; }).length;
  }

  function renderActivities() {
    var data = state.data;
    var activities = []
      .concat(data.donations.slice(0, 2).map(function (d) { return { type: "Doacao", icon: "fa-gift", tone: "purple", desc: "Doacao recebida: " + fmtKg(getDonationKg(d)), who: d.name || d.nome || "Doador", status: "Concluido", date: d.created_at || d.createdAt }; }))
      .concat(data.families.slice(0, 2).map(function (f) { return { type: "Familia", icon: "fa-users", tone: "cyan", desc: "Nova familia cadastrada: " + (f.nome || f.responsavel || "Familia"), who: f.responsavel || "Equipe", status: f.status || "Aprovado", date: f.created_at || f.createdAt }; }))
      .concat(data.tasks.slice(0, 1).map(function (t) { return { type: "Tarefa", icon: "fa-list-check", tone: "yellow", desc: "Tarefa atualizada: " + (t.titulo || t.title), who: t.responsavel || "Equipe", status: t.status || "Concluido", date: t.created_at || t.data }; }));
    if (!activities.length) {
      return '<div class="admin-empty">Nenhuma atividade encontrada no Firebase.</div>';
    }

    /* <details>/<summary> nativo: a linha resumida (data + tipo + descricao)
       fica sempre visivel; responsavel + status só aparecem ao tocar/abrir. */
    return '<div class="admin-expand-list">' +
      activities.slice(0, 5).map(function (a) {
        return '<details class="admin-expand-row">' +
          '<summary class="admin-expand-summary">' +
            '<span class="admin-expand-lead">' + fmtDate(a.date, true) + '</span>' +
            badge(a.type, a.tone, a.icon) +
            '<span class="admin-expand-title">' + esc(a.desc) + '</span>' +
            '<i class="fa-solid fa-chevron-down admin-expand-chevron" aria-hidden="true"></i>' +
          '</summary>' +
          '<div class="admin-expand-detail">' +
            '<span><strong>Responsável:</strong> ' + esc(a.who) + '</span>' +
            '<span><strong>Status:</strong> ' + statusBadge(a.status) + '</span>' +
          '</div>' +
        '</details>';
      }).join("") +
      '</div>';
  }

  function renderGoals() {
    var m = metrics();
    var kgGoal = 7000;
    var kgPct = Math.min(100, Math.round((m.kg / kgGoal) * 100));
    var familyGoal = 400;
    var familyPct = Math.min(100, Math.round((m.families / familyGoal) * 100));
    return '<div class="admin-progress-group">' +
      progressItem("Meta mensal de arrecadacao", fmtKg(kgGoal), kgPct + "%", "Arrecadado: " + fmtKg(m.kg), "Meta: " + fmtKg(kgGoal)) +
      progressItem("Meta de familias cadastradas", familyGoal + " familias", familyPct + "%", "Cadastradas: " + fmtInt(m.families), "Meta: " + familyGoal) +
      '<div class="admin-list-item"><div class="admin-list-icon"><i class="fa-solid fa-trophy"></i></div><div class="admin-list-body"><div class="admin-list-title">Juntos estamos fazendo a diferenca!</div><div class="admin-list-sub">Cada doacao alimenta esperanca.</div></div></div>' +
      '</div>';
  }

  function renderGoalsCompact(periodDays) {
    var m = metrics(periodDays);
    var kgGoal = 7000;
    var kgPct = Math.min(100, Math.round((m.kg / kgGoal) * 100));
    var kgFalta = Math.max(0, kgGoal - m.kg);
    var familyGoal = 400;
    var familyPct = Math.min(100, Math.round((m.families / familyGoal) * 100));
    var familyFalta = Math.max(0, familyGoal - m.families);
    return '<div class="admin-progress-group">' +
      progressItem("Meta mensal de alimentos", fmtKg(kgGoal), kgPct + "%", "Arrecadado: " + fmtKg(m.kg), "Faltam: " + fmtKg(kgFalta)) +
      progressItem("Meta de familias cadastradas", familyGoal + " familias", familyPct + "%", "Cadastradas: " + fmtInt(m.families), "Faltam: " + familyFalta) +
      '</div>';
  }

  function progressItem(label, value, pct, left, right) {
    return '<div><div class="admin-progress-head"><div><span style="display:block;color:var(--admin-text-soft);font-weight:800">' + esc(label) + '</span><strong>' + esc(value) + '</strong></div><span>' + esc(pct) + '</span></div>' +
      '<div class="admin-progress-track"><div class="admin-progress-fill" style="--pct:' + esc(pct) + '"></div></div>' +
      '<div class="admin-progress-meta"><span>' + esc(left) + '</span><span>' + esc(right) + '</span></div></div>';
  }

  function renderHourlyBars(periodDays) {
    var cutoff = periodDays ? new Date(Date.now() - periodDays * 86400000) : null;
    var hourMap = {};
    state.data.donations.forEach(function (d) {
      var dt = donationDate(d);
      if (!dt) return;
      if (cutoff && dt < cutoff) return;
      var h = dt.getHours();
      hourMap[h] = (hourMap[h] || 0) + getDonationKg(d);
    });
    var rows = [];
    for (var h = 6; h <= 21; h++) {
      if (hourMap[h]) {
        var label = String(h).padStart(2, "0") + ":00 - " + String(h + 1).padStart(2, "0") + ":00";
        rows.push([label, hourMap[h]]);
      }
    }
    if (!rows.length) {
      return '<div class="admin-empty"><i class="fa-solid fa-clock"></i><p>Sem dados de horario disponíveis ainda.</p></div>';
    }
    var max = Math.max.apply(null, rows.map(function (r) { return r[1]; }));
    return '<div class="admin-bars">' + rows.map(function (r) {
      return '<div class="admin-bar-row"><span>' + r[0] + '</span><div class="admin-bar-track"><div class="admin-bar-fill" style="--pct:' + Math.round((r[1] / max) * 100) + '%"></div></div><strong>' + fmtKg(r[1]) + '</strong></div>';
    }).join("") + '</div>';
  }

  /*
    Lista de doações registradas — faltava por completo na aba "Doações":
    a aba só tinha gráficos/KPIs agregados, sem nenhuma tabela com os
    registros individuais (nem distinção visual das doações de
    "cesta básica completa", que são salvas com tipo_doacao='cesta_completa'
    em js/form.js).
  */
  function donationFoodLabel(d) {
    if (d.tipo_doacao === "cesta_completa") return "Cesta básica completa";
    if (Array.isArray(d.itens) && d.itens.length) {
      return d.itens.map(function (i) { return i.nome || i.name; }).filter(Boolean).join(", ");
    }
    return d.food || d.alimento || "—";
  }

  /*
    Mesma formatação de js/form.js (fmtUnidade/fmtTotal/ENTREGA_LABELS),
    duplicada aqui porque o admin não carrega form.js. O comprovante
    abaixo replica pixel a pixel o que o doador vê no passo 3 do
    formulário público (mesmo HTML/CSS — .receipt/.rcpt-* em admin-modern.css).
  */
  var ENTREGA_LABELS_ADMIN = {
    "igreja":   "Entrega na Igreja",
    "retirada": "Buscar em Casa",
  };

  function donationUnitWord(item, qty) {
    var raw = String(item.unidade || item.unit || "").trim().toLowerCase();
    var name = String(item.nome || item.name || "").toLowerCase();
    if (raw === "l" || raw === "litro" || raw === "litros") return qty === 1 ? "garrafa" : "garrafas";
    if (raw === "un" || raw === "unid" || raw === "unidade" || raw === "unidades") return qty === 1 ? "unidade" : "unidades";
    if (name.indexOf("óleo") >= 0 || name.indexOf("oleo") >= 0) return qty === 1 ? "garrafa" : "garrafas";
    return qty === 1 ? "pacote" : "pacotes";
  }

  function donationItemsListHtml(d) {
    var itens = Array.isArray(d.itens) && d.itens.length ? d.itens : [];
    if (!itens.length) {
      var amount = number(d.amount || d.quantidade || 1) || 1;
      return '<div class="admin-donation-items-list"><span>' + esc(fmtInt(amount) + " " + (amount === 1 ? "item" : "itens") + " de " + (d.food || d.alimento || "alimento")) + '</span></div>';
    }
    return '<div class="admin-donation-items-list">' + itens.map(function (item) {
      var qty = number(item.qty || item.quantidade || item.amount || 1) || 1;
      var qtyText = qty % 1 === 0 ? fmtInt(qty) : String(qty).replace(".", ",");
      var name = item.nome || item.name || "alimento";
      return '<span>' + esc(qtyText + " " + donationUnitWord(item, qty) + " de " + name) + '</span>';
    }).join("") + '</div>';
  }

  function fmtUnidadeAdmin(valor, unidade) {
    var v = parseFloat(valor) || 0;
    var u = (unidade || "kg").trim().toLowerCase();
    function numBR(n) {
      return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1).replace(".", ",");
    }
    if (u === "l" || u === "litro" || u === "litros") {
      if (v < 1) return Math.round(v * 1000) + " mL";
      return numBR(v) + " L";
    }
    if (v > 0 && v < 1) return Math.round(v * 1000) + " g";
    return numBR(v) + " kg";
  }

  function fmtTotalAdmin(totalKg) {
    if (totalKg > 0 && totalKg < 1) return Math.round(totalKg * 1000) + " g";
    return (totalKg > 0 ? totalKg.toFixed(1) : "0").replace(".", ",") + " kg";
  }

  function renderDonationReceiptHtml(d) {
    var dt = donationDate(d) || new Date();
    var dataFormatada = dt.toLocaleDateString("pt-BR");
    var horaFormatada = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    var entregaLabel = ENTREGA_LABELS_ADMIN[d.delivery] || d.delivery || d.entrega || "—";

    var enderecoTexto = d.endereco_texto || "";
    if (!enderecoTexto && d.endereco && typeof d.endereco === "object") {
      var e = d.endereco;
      enderecoTexto = [e.rua, e.numero, e.complemento,
        e.bairro ? "Bairro: " + e.bairro : "",
        e.referencia ? "Ref: " + e.referencia : ""].filter(Boolean).join(", ");
    }

    var itens = Array.isArray(d.itens) && d.itens.length ? d.itens : [];
    var totalKg = number(d.totalKg || d.total_kg) || itens.reduce(function (s, i) { return s + (number(i.totalKg) || 0); }, 0);

    var itensHtml = itens.map(function (i) {
      return '<div class="rcpt-item-row">' +
        '<span class="rcpt-item-desc">' + esc(String(i.nome || i.name || "").toUpperCase()) + '</span>' +
        '<span class="rcpt-item-qty">' + esc(i.qty || 1) + ' un</span>' +
        '<span class="rcpt-item-total">' + fmtUnidadeAdmin(i.totalKg || 0, i.unidade || "kg") + '</span>' +
      '</div>';
    }).join("");

    return '<div class="receipt" id="admin-receipt-paper">' +
      '<div class="receipt-perf"></div>' +
      '<div class="receipt-body">' +
        '<div class="rcpt-header">' +
          '<div class="rcpt-logos-row">' +
            '<div class="rcpt-logo-item">' +
              '<img src="logo-semear.jpeg" alt="Ação Social Semear" class="rcpt-logo-img semear" loading="lazy">' +
              '<span class="rcpt-logo-label">Ação Social<br><strong>Semear</strong></span>' +
            '</div>' +
            '<div class="rcpt-logo-sep">+</div>' +
            '<div class="rcpt-logo-item">' +
              '<img src="logo-maanaim.jpeg" alt="Comunidade Maanaim" class="rcpt-logo-img" loading="lazy">' +
              '<span class="rcpt-logo-label">Comunidade<br><strong>Maanaim</strong></span>' +
            '</div>' +
          '</div>' +
          '<div class="rcpt-store-info">Belém, Pará — Brasil</div>' +
        '</div>' +
        '<div class="rcpt-dashes">- - - - - - - - - - - - - - - - - - - - -</div>' +
        '<div class="rcpt-doc-title">COMPROVANTE DE DOAÇÃO DE ALIMENTOS</div>' +
        '<div class="rcpt-dashes">- - - - - - - - - - - - - - - - - - - - -</div>' +
        '<div class="rcpt-row"><span class="rcpt-k">PROTOCOLO :</span><span class="rcpt-v">' + esc(d.protocolo || "—") + '</span></div>' +
        '<div class="rcpt-row"><span class="rcpt-k">DATA      :</span><span class="rcpt-v">' + esc(dataFormatada) + '</span>' +
          '<span class="rcpt-k" style="margin-left:10px;">HORA:</span><span class="rcpt-v">' + esc(horaFormatada) + '</span></div>' +
        '<div class="rcpt-dashes">- - - - - - - - - - - - - - - - - - - - -</div>' +
        '<div class="rcpt-row"><span class="rcpt-k">DOADOR    :</span><span class="rcpt-v">' + esc(String(d.name || d.nome || "—").toUpperCase()) + '</span></div>' +
        '<div class="rcpt-row"><span class="rcpt-k">WHATSAPP  :</span><span class="rcpt-v">' + esc(d.telefone || d.phone || "—") + '</span></div>' +
        '<div class="rcpt-row"><span class="rcpt-k">ENTREGA   :</span><span class="rcpt-v">' + esc(entregaLabel) + '</span></div>' +
        (enderecoTexto ? '<div class="rcpt-row"><span class="rcpt-k">ENDEREÇO  :</span><span class="rcpt-v" style="white-space:pre-wrap;word-break:break-word">' + esc(enderecoTexto) + '</span></div>' : "") +
        '<div class="rcpt-dashes">- - - - - - - - - - - - - - - - - - - - -</div>' +
        '<div class="rcpt-section-title">ITENS DOADOS</div>' +
        '<div class="rcpt-items-head"><span class="rcpt-ih-desc">DESCRIÇÃO</span><span class="rcpt-ih-qty">QTD</span><span class="rcpt-ih-total">TOTAL</span></div>' +
        '<div class="rcpt-dashes">- - - - - - - - - - - - - - - - - - - - -</div>' +
        itensHtml +
        '<div class="rcpt-dashes">- - - - - - - - - - - - - - - - - - - - -</div>' +
        '<div class="rcpt-total-row"><span class="rcpt-total-k">&gt;&gt;&gt; TOTAL DOADO</span><span class="rcpt-total-v">' + fmtTotalAdmin(totalKg) + '</span></div>' +
        (d.observacao ? '<div class="rcpt-dashes">- - - - - - - - - - - - - - - - - - - - -</div>' +
          '<div class="rcpt-section-title">PEDIDO DE ORAÇÃO</div>' +
          '<div class="rcpt-msg-text">"' + esc(d.observacao) + '"</div>' : "") +
        '<div class="rcpt-dashes">- - - - - - - - - - - - - - - - - - - - -</div>' +
        '<div class="rcpt-spiritual">' +
          '<p class="rcpt-verse">"Pois tive fome e me destes de comer;<br>tive sede e me destes de beber..."</p>' +
          '<p class="rcpt-ref">— Mateus 25:35</p>' +
          '<div class="rcpt-thanks">*** OBRIGADO PELA SUA DOAÇÃO! ***</div>' +
        '</div>' +
        '<div class="rcpt-barcode-wrap"><div class="rcpt-barcode"></div><div class="rcpt-barcode-num">* ' + esc(d.protocolo || "DOA VIDA") + ' *</div></div>' +
      '</div>' +
      '<div class="receipt-perf bot"></div>' +
    '</div>';
  }

  function filteredDonations() {
    var f = state.filters.donations;
    var cutoff = f.periodo !== "todos" ? new Date(Date.now() - parseInt(f.periodo, 10) * 86400000) : null;
    return state.data.donations.filter(function (row) {
      var tipo = row.tipo_doacao === "cesta_completa" ? "cesta" : "itens";
      var dt = donationDate(row);
      return matchesSearch(row, ["name", "nome", "food", "protocolo", "telefone"]) &&
        (f.status === "todos" || slug(row.status || "pendente") === f.status) &&
        (f.tipo === "todos" || tipo === f.tipo) &&
        (!cutoff || (dt && dt >= cutoff));
    });
  }

  function renderDonationFilters() {
    return '<div class="admin-filter-bar">' +
      selectFilter("donations", "status", [["todos", "Status: todos"], ["pendente", "Pendente"], ["confirmado", "Confirmado"], ["entregue", "Entregue"], ["cancelado", "Cancelado"]]) +
      selectFilter("donations", "tipo", [["todos", "Tipo: todos"], ["cesta", "Cesta básica completa"], ["itens", "Itens individuais"]]) +
      selectFilter("donations", "periodo", [["todos", "Periodo: todos"], ["7", "7 dias"], ["30", "30 dias"], ["90", "90 dias"]]) +
      '<button class="admin-button" data-clear-filter="donations"><i class="fa-solid fa-filter-circle-xmark"></i><span class="admin-clearfilter-label">Limpar filtros</span></button>' +
      '</div>';
  }

  function renderDonationsTable(rows) {
    if (!rows.length) {
      return '<div class="admin-empty"><i class="fa-solid fa-hand-holding-heart"></i><p>Nenhuma doação encontrada para os filtros selecionados.</p></div>';
    }
    return '<div class="admin-donation-board">' +
      '<div class="admin-donation-list-head">' +
        '<h3>Lista de doações</h3>' +
        '<span><i class="fa-solid fa-arrow-down-wide-short"></i>Mais recentes</span>' +
      '</div>' +
      '<div class="admin-donation-list">' +
      rows.map(function (d, index) {
        var isCesta = d.tipo_doacao === "cesta_completa";
        var name = d.name || d.nome || "Doador anonimo";
        var phone = d.phone || d.telefone || d.whatsapp || "Telefone nao informado";
        var wa = whatsappUrl(phone);
        var delivery = d.delivery || d.entrega || d.tipoEntrega || "";
        var deliveryLabel = ENTREGA_LABELS_ADMIN[delivery] || delivery || "Nao informado";
        var note = d.observacao || d.note || d.obs || "Sem observação.";
        var tone = ["blue", "green", "purple", "cyan"][index % 4];
        return '<details class="admin-donation-card admin-donation-card--' + tone + '"' + (index === 0 ? " open" : "") + '>' +
          '<summary class="admin-donation-summary">' +
            '<span class="admin-donation-protocol">' + esc(d.protocolo || d.id || "DOA-" + (index + 1)) + '</span>' +
            '<span class="admin-donation-status">' + statusBadge(d.status || "pendente") + '</span>' +
            '<span class="admin-donation-avatar" aria-hidden="true">' + esc(initials(name)) + '</span>' +
            '<span class="admin-donation-person">' +
              '<strong>' + esc(name) + '</strong>' +
              (wa ? '<a class="admin-donation-phone" href="' + esc(wa) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="fa-brands fa-whatsapp"></i>' + esc(phone) + '</a>' : '<small><i class="fa-solid fa-phone"></i>' + esc(phone) + '</small>') +
            '</span>' +
            '<span class="admin-donation-meta">' +
              '<small><i class="fa-regular fa-calendar-days"></i>' + fmtDate(d.created_at || d.createdAt || d.data, true) + '</small>' +
              '<small><i class="fa-solid fa-location-dot"></i>Entrega: ' + esc(deliveryLabel) + '</small>' +
            '</span>' +
            '<i class="fa-solid fa-chevron-down admin-donation-chevron" aria-hidden="true"></i>' +
          '</summary>' +
          '<div class="admin-donation-detail">' +
            '<div class="admin-donation-info">' +
              '<span><i class="fa-solid fa-cube"></i>Itens doados</span>' +
              (isCesta ? '<strong>Cesta básica</strong>' : '') +
              donationItemsListHtml(d) +
            '</div>' +
            '<div class="admin-donation-info">' +
              '<span><i class="fa-solid fa-scale-balanced"></i>Quantidade</span>' +
              '<strong>' + fmtKg(getDonationKg(d)) + '</strong>' +
            '</div>' +
            '<div class="admin-donation-info">' +
              '<span><i class="fa-regular fa-message"></i>Observação</span>' +
              '<strong>' + esc(note) + '</strong>' +
            '</div>' +
            '<div class="admin-donation-actions">' +
              '<button class="admin-donation-action view" data-donation-view="' + esc(d.id) + '"><i class="fa-regular fa-eye"></i><span>Ver detalhes</span></button>' +
              '<button class="admin-donation-action danger" data-donation-delete="' + esc(d.id) + '"><i class="fa-regular fa-trash-can"></i><span>Excluir</span></button>' +
            '</div>' +
          '</div>' +
        '</details>';
      }).join("") + '</div></div>' +
      '<p class="admin-table-foot">Mostrando ' + fmtInt(rows.length) + ' de ' + fmtInt(state.data.donations.length) + ' doações</p>';
  }

  function renderTopDonors(periodDays) {
    var cutoff = periodDays ? new Date(Date.now() - periodDays * 86400000) : null;
    var donors = state.data.donations
      .filter(function (d) { if (!cutoff) return true; var dt = donationDate(d); return dt && dt >= cutoff; })
      .map(function (d) { return { name: d.name || d.nome || "Doador anonimo", kg: getDonationKg(d) }; })
      .sort(function (a, b) { return b.kg - a.kg; }).slice(0, 5);
    var totalKg = donors.reduce(function (s, d) { return s + d.kg; }, 0) || 1;
    if (!donors.length) {
      return '<div class="admin-empty"><i class="fa-solid fa-trophy"></i><p>Nenhum doador no período selecionado.</p></div>';
    }
    return '<div class="admin-list">' +
      donors.map(function (d, i) {
        var pct = Math.round((d.kg / totalKg) * 1000) / 10;
        return '<div class="admin-list-item">' +
          '<div class="admin-list-icon">' + (i + 1) + '</div>' +
          '<div class="admin-list-body">' +
            '<div class="admin-list-title">' + esc(d.name) + '</div>' +
            '<div class="admin-list-sub">' + fmtKg(d.kg) + ' · ' + pct + '% do total</div>' +
          '</div>' +
        '</div>';
      }).join("") +
      '</div>';
  }

  function renderFamilyFilters() {
    var bairros = unique(monthlyBasketFamilies().map(function (f) { return f.bairro; })).filter(Boolean);
    return '<div class="admin-filter-bar">' +
      selectFilter("families", "status", [["todos", "Todas do mes"], ["aguardando-entrega", "Aguardando receber"], ["entregue", "Ja recebeu"], ["nao-retirada", "Não recebeu"]]) +
      selectFilter("families", "prioridade", [["todos", "Prioridade: todas"], ["alta", "Alta"], ["media", "Media"], ["baixa", "Baixa"]]) +
      selectFilter("families", "bairro", [["todos", "Bairro: todos"]].concat(bairros.map(function (b) { return [slug(b), b]; }))) +
      '<button class="admin-button" data-clear-filter="families"><i class="fa-solid fa-filter-circle-xmark"></i><span class="admin-clearfilter-label">Limpar filtros</span></button>' +
      '</div>';
  }

  function renderBasketRequestFilters() {
    var bairros = unique(openBasketRequests().map(function (f) { return f.bairro; })).filter(Boolean);
    return '<div class="admin-filter-bar">' +
      selectFilter("requests", "status", [["todos", "Status: todos"], ["em-analise", "Em analise"], ["aguardando-documentos", "Aguardando documentos"]]) +
      selectFilter("requests", "bairro", [["todos", "Bairro: todos"]].concat(bairros.map(function (b) { return [slug(b), b]; }))) +
      selectFilter("requests", "periodo", [["todos", "Periodo"], ["7", "7 dias"], ["30", "30 dias"], ["90", "90 dias"]]) +
      '<button class="admin-button" data-clear-filter="requests"><i class="fa-solid fa-filter-circle-xmark"></i><span class="admin-clearfilter-label">Limpar filtros</span></button>' +
      '</div>';
  }

  function renderTaskFilters() {
    var people = unique(state.data.tasks.map(function (t) { return t.responsavel; })).filter(Boolean);
    return '<div class="admin-filter-bar">' +
      selectFilter("tasks", "status", [["todos", "Todos os status"], ["a-fazer", "A fazer"], ["em-andamento", "Em andamento"], ["aguardando", "Aguardando"], ["concluido", "Concluido"]]) +
      selectFilter("tasks", "tipo", [["todos", "Todos os tipos"], ["organizacao", "Organizacao"], ["atendimento", "Atendimento"], ["logistica", "Logistica"], ["comunicacao", "Comunicacao"], ["entrega", "Entrega"], ["compras", "Compras"], ["financeiro", "Financeiro"], ["captacao", "Captacao de doacoes"], ["eventos", "Eventos"], ["espiritual", "Espiritual"], ["outro", "Outro"]]) +
      selectFilter("tasks", "responsavel", [["todos", "Todos os responsaveis"]].concat(people.map(function (p) { return [slug(p), p]; }))) +
      selectFilter("tasks", "prioridade", [["todos", "Todas as prioridades"], ["alta", "Alta"], ["media", "Media"], ["baixa", "Baixa"]]) +
      '<button class="admin-button" data-clear-filter="tasks"><i class="fa-solid fa-filter-circle-xmark"></i><span class="admin-clearfilter-label">Limpar filtros</span></button>' +
      '</div>';
  }

  function selectFilter(group, key, options) {
    var current = state.filters[group][key] || "todos";
    return '<select class="admin-select" data-filter-group="' + group + '" data-filter-key="' + key + '">' +
      options.map(function (opt) { return '<option value="' + esc(opt[0]) + '"' + (current === opt[0] ? " selected" : "") + '>' + esc(opt[1]) + '</option>'; }).join("") +
      '</select>';
  }

  function filteredFamilies() {
    var f = state.filters.families;
    return monthlyBasketFamilies().filter(function (row) {
      return matchesSearch(row, ["protocolo", "nome", "responsavel", "bairro", "necessidade"]) &&
        (f.status === "todos" || slug(row.status) === f.status || (f.status === "aguardando-entrega" && ["aprovada", "aprovado"].indexOf(slug(row.status)) >= 0)) &&
        (f.prioridade === "todos" || slug(row.prioridade) === f.prioridade) &&
        (f.bairro === "todos" || slug(row.bairro) === f.bairro);
    });
  }

  function filteredBasketRequests() {
    var f = state.filters.requests;
    return openBasketRequests().filter(function (row) {
      if (f.periodo !== "todos") {
        var cutoff = new Date(Date.now() - parseInt(f.periodo, 10) * 86400000);
        var date = donationDate(row);
        if (date && date < cutoff) return false;
      }
      return matchesSearch(row, ["protocolo", "nome", "responsavel", "telefone", "bairro", "endereco", "necessidade", "referencia"]) &&
        (f.status === "todos" || slug(row.status || "em-analise") === f.status) &&
        (f.bairro === "todos" || slug(row.bairro) === f.bairro);
    });
  }

  function filteredVolunteers() {
    var f = state.filters.volunteers;
    return state.data.volunteers.filter(function (row) {
      return matchesSearch(row, ["nome", "name", "telefone", "whatsapp", "tipo", "tipo_label"]) &&
        (f.tipo === "todos" || slug(row.tipo || row.tipo_label) === f.tipo) &&
        (f.status === "todos" || slug(row.status || "ativo") === f.status);
    });
  }

  function filteredTasks() {
    var f = state.filters.tasks;
    return state.data.tasks.filter(function (row) {
      return matchesSearch(row, ["titulo", "title", "descricao", "responsavel", "tipo"]) &&
        (f.status === "todos" || slug(row.status) === f.status) &&
        (f.tipo === "todos" || slug(row.tipo) === f.tipo) &&
        (f.responsavel === "todos" || slug(row.responsavel) === f.responsavel) &&
        (f.prioridade === "todos" || slug(row.prioridade) === f.prioridade);
    });
  }

  function renderBasketHistoryHtml(f) {
    return '<div class="admin-basket-history"><h4>Histórico de Cestas</h4>' +
      familyBasketHistory(f).map(function (r) {
        return '<div class="admin-basket-history-item admin-basket-history-item--' + esc(basketStatusClass(r.status)) + '">' +
          '<strong>' + esc(monthLabelFromKey(r.mes_referencia)) + '</strong>' +
          '<span>Status: <b class="admin-basket-status admin-basket-status--' + esc(basketStatusClass(r.status)) + '">' + esc(normalizeBasketStatus(r.status)) + '</b></span>' +
          '<span>Data da entrega: ' + esc(r.data_entrega ? fmtDate(r.data_entrega, false) : "Ainda não definida") + '</span>' +
          '<span>Itens: ' + esc(r.itens_doados || "Ainda não informado") + '</span>' +
          '<span>Observação: ' + esc(r.observacao || "-") + '</span>' +
        '</div>';
      }).join("") +
      '</div>';
  }

  function adminPeopleBoard(title, rowsHtml) {
    return '<div class="admin-donation-board admin-people-board">' +
      '<div class="admin-donation-list-head">' +
        '<h3>' + esc(title) + '</h3>' +
        '<span><i class="fa-solid fa-arrow-down-wide-short"></i>Mais recentes</span>' +
      '</div>' +
      '<div class="admin-donation-list">' + rowsHtml + '</div>' +
    '</div>';
  }

  function renderVolunteersTable(rows) {
    if (!rows.length) {
      return '<div class="admin-empty"><i class="fa-solid fa-hands-holding"></i><p>Nenhum voluntario encontrado.</p></div>';
    }
    return adminPeopleBoard("Lista de voluntários", rows.map(function (v, index) {
      var nome = v.nome || v.name || "Voluntario";
      var phone = v.telefone || v.whatsapp || "Telefone nao informado";
      var wa = whatsappUrl(phone);
      var disponibilidade = volunteerDisponibilidade(v) || "-";
      var tone = ["blue", "green", "purple", "cyan"][index % 4];
      return '<details class="admin-donation-card admin-donation-card--' + tone + '">' +
        '<summary class="admin-donation-summary">' +
          '<span class="admin-donation-protocol">' + esc(v.protocolo || ("VOL-" + String(v.id || index + 1).slice(-6).toUpperCase())) + '</span>' +
          '<span class="admin-donation-status">' + statusBadge(v.status || "ativo") + '</span>' +
          '<span class="admin-donation-avatar" aria-hidden="true">' + esc(initials(nome)) + '</span>' +
          '<span class="admin-donation-person">' +
            '<strong>' + esc(nome) + '</strong>' +
            (wa ? '<a class="admin-donation-phone" href="' + esc(wa) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="fa-brands fa-whatsapp"></i>' + esc(phone) + '</a>' : '<small><i class="fa-solid fa-phone"></i>' + esc(phone) + '</small>') +
          '</span>' +
          '<span class="admin-donation-meta">' +
            '<small><i class="fa-solid fa-hand-holding-heart"></i>' + esc(v.tipo_label || v.tipo || "Tipo nao informado") + '</small>' +
            '<small><i class="fa-regular fa-calendar-days"></i>' + fmtDate(v.created_at || v.createdAt, true) + '</small>' +
          '</span>' +
          '<i class="fa-solid fa-chevron-down admin-donation-chevron" aria-hidden="true"></i>' +
        '</summary>' +
        '<div class="admin-donation-detail">' +
          '<div class="admin-donation-info"><span><i class="fa-solid fa-phone"></i>Contato</span>' + contactLinkHtml("WhatsApp", v.telefone || v.whatsapp) + '</div>' +
          '<div class="admin-donation-info"><span><i class="fa-solid fa-list-check"></i>Tipo de ajuda</span><strong>' + esc(v.tipo_label || v.tipo || "-") + '</strong></div>' +
          '<div class="admin-donation-info"><span><i class="fa-regular fa-clock"></i>Disponibilidade</span><strong>' + esc(disponibilidade) + '</strong></div>' +
          '<div class="admin-donation-actions">' +
            (wa ? '<a class="admin-donation-action view" href="' + esc(wa) + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i><span>WhatsApp</span></a>' : "") +
            '<button class="admin-donation-action view" data-volunteer-edit="' + esc(v.id) + '"><i class="fa-regular fa-pen-to-square"></i><span>Ver ficha</span></button>' +
            '<button class="admin-donation-action danger" data-volunteer-delete="' + esc(v.id) + '"><i class="fa-regular fa-trash-can"></i><span>Excluir</span></button>' +
          '</div>' +
        '</div>' +
      '</details>';
    }).join("")) +
    '<p class="admin-table-foot">Mostrando ' + fmtInt(rows.length) + ' de ' + fmtInt(state.data.volunteers.length) + ' voluntarios</p>';
  }

  function renderFamiliesTable(rows) {
    if (!rows.length) {
      return '<div class="admin-empty"><i class="fa-solid fa-users"></i><span>Nenhuma familia aprovada para receber cesta neste mes.</span></div>';
    }
    return adminPeopleBoard("Lista de famílias", rows.map(function (f, index) {
      var wa = whatsappUrl(f.telefone || f.whatsapp);
      var familyName = f.familia || f.nome_familia || f.responsavel || f.nome || "Familia";
      var responsible = f.responsavel || f.nome || familyName;
      var last = lastReceivedBasket(f);
      var next = nextBasket(f);
      var situation = "Aguardando entrega de " + monthLabelFromKey(next.mes_referencia).replace(/\/.*/, "");
      var familyState = basketStatusClass(f.status || next.status);
      var tone = familyState === "danger" ? "purple" : familyState === "received" ? "green" : ["blue", "green", "purple", "cyan"][index % 4];
      if (familyState === "danger") situation = "Não recebeu a cesta de " + monthLabelFromKey(f.mes_referencia || monthKey()).replace(/\/.*/, "");
      return '<details class="admin-donation-card admin-donation-card--' + tone + ' admin-family-state admin-family-state--' + esc(familyState) + '">' +
        '<summary class="admin-donation-summary">' +
          '<span class="admin-donation-protocol">' + esc(f.protocolo || f.id || "FAM") + '</span>' +
          '<span class="admin-donation-status">' + statusBadge(f.status || "em-analise") + '</span>' +
          familyAvatarHtml() +
          '<span class="admin-donation-person">' +
            '<strong>' + esc(familyName) + '</strong>' +
            (wa ? '<a class="admin-donation-phone" href="' + esc(wa) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="fa-brands fa-whatsapp"></i>' + esc(f.telefone || f.whatsapp) + '</a>' : '<small><i class="fa-solid fa-phone"></i>Telefone nao informado</small>') +
          '</span>' +
          '<span class="admin-donation-meta">' +
            '<small><i class="fa-solid fa-location-dot"></i>' + esc(f.endereco || f.bairro || "Endereço nao informado") + '</small>' +
            '<small><i class="fa-solid fa-basket-shopping"></i>' + esc(situation) + '</small>' +
          '</span>' +
          '<i class="fa-solid fa-chevron-down admin-donation-chevron" aria-hidden="true"></i>' +
        '</summary>' +
        '<div class="admin-donation-detail admin-family-profile">' +
          '<div class="admin-family-profile-main">' +
            '<span><strong>Família:</strong> ' + esc(familyName) + '</span>' +
            '<span><strong>Responsável:</strong> ' + esc(responsible) + '</span>' +
            contactLinkHtml("Telefone", f.telefone || f.whatsapp) +
            '<span><strong>Endereço:</strong> ' + esc(f.endereco || "-") + '</span>' +
            '<span><strong>Status da família:</strong> ' + esc(f.status_familia || "Ativa") + '</span>' +
          '</div>' +
          '<div class="admin-family-cycle">' +
            '<span><strong>Última cesta recebida:</strong><em>' + esc(last ? monthLabelFromKey(last.mes_referencia) : "Nenhuma registrada") + '</em></span>' +
            '<span><strong>Próxima cesta prevista:</strong><em>' + esc(monthLabelFromKey(next.mes_referencia)) + '</em></span>' +
            '<span><strong>Situação:</strong><em>' + esc(situation) + '</em></span>' +
          '</div>' +
          renderBasketHistoryHtml(f) +
          '<div class="admin-donation-actions">' +
            (wa ? '<a class="admin-donation-action view" href="' + esc(wa) + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i><span>WhatsApp</span></a>' : "") +
            '<button class="admin-donation-action view" data-family-delivery="' + esc(f.id) + '" data-status="entregue"><i class="fa-solid fa-box"></i><span>Recebeu</span></button>' +
            '<button class="admin-donation-action view" data-family-delivery="' + esc(f.id) + '" data-status="aguardando-entrega"><i class="fa-solid fa-hourglass-half"></i><span>Aguardando</span></button>' +
            '<button class="admin-donation-action danger" data-family-delivery="' + esc(f.id) + '" data-status="nao-retirada"><i class="fa-solid fa-circle-xmark"></i><span>Não recebeu</span></button>' +
            '<button class="admin-donation-action view" data-edit-family="' + esc(f.id) + '"><i class="fa-regular fa-pen-to-square"></i><span>Editar</span></button>' +
          '</div>' +
        '</div>' +
      '</details>';
    }).join(""));
  }

  function renderBasketRequestsTable(rows) {
    if (!rows.length) {
      return '<div class="admin-empty"><i class="fa-solid fa-basket-shopping"></i><span>Nenhuma solicitacao de cesta encontrada.</span></div>';
    }
    return adminPeopleBoard("Lista de solicitações", rows.map(function (f, index) {
      var wa = whatsappUrl(f.telefone || f.whatsapp);
      var name = f.responsavel || f.nome || "Solicitante";
      var tone = ["blue", "green", "purple", "cyan"][index % 4];
      return '<details class="admin-donation-card admin-donation-card--' + tone + '">' +
        '<summary class="admin-donation-summary">' +
          '<span class="admin-donation-protocol">' + esc(f.protocolo || f.id || "SOL") + '</span>' +
          '<span class="admin-donation-status">' + statusBadge(f.status || "em-analise") + '</span>' +
          '<span class="admin-donation-avatar" aria-hidden="true">' + esc(initials(name)) + '</span>' +
          '<span class="admin-donation-person">' +
            '<strong>' + esc(name) + '</strong>' +
            (wa ? '<a class="admin-donation-phone" href="' + esc(wa) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="fa-brands fa-whatsapp"></i>' + esc(f.telefone || f.whatsapp) + '</a>' : '<small><i class="fa-solid fa-phone"></i>Telefone nao informado</small>') +
          '</span>' +
          '<span class="admin-donation-meta">' +
            '<small><i class="fa-regular fa-calendar-days"></i>' + fmtDate(f.created_at || f.createdAt, true) + '</small>' +
            '<small><i class="fa-solid fa-location-dot"></i>' + esc(f.endereco || f.logradouro || f.bairro || "Endereço nao informado") + '</small>' +
          '</span>' +
          '<i class="fa-solid fa-chevron-down admin-donation-chevron" aria-hidden="true"></i>' +
        '</summary>' +
        '<div class="admin-donation-detail admin-request-detail">' +
          '<div class="admin-donation-info"><span><i class="fa-solid fa-phone"></i>Contato</span>' + contactLinkHtml("Telefone", f.telefone || f.whatsapp) + '</div>' +
          '<div class="admin-donation-info"><span><i class="fa-solid fa-location-dot"></i>Endereço</span><strong>' + esc(f.endereco || f.logradouro || "-") + '</strong></div>' +
          '<div class="admin-donation-info"><span><i class="fa-solid fa-people-group"></i>Família</span><strong>' + esc(f.pessoas_texto || fmtInt(f.pessoas || f.pessoasNaCasa || 1) + " pessoa(s)") + '</strong></div>' +
          '<div class="admin-donation-info"><span><i class="fa-solid fa-hand-holding-heart"></i>Necessidade</span><strong>' + esc(f.necessidade || "Cesta basica") + '</strong></div>' +
          '<div class="admin-donation-info"><span><i class="fa-solid fa-sack-dollar"></i>Renda</span><strong>' + esc(requestIncome(f)) + '</strong></div>' +
          '<div class="admin-donation-actions">' +
            (wa ? '<a class="admin-donation-action view" href="' + esc(wa) + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i><span>WhatsApp</span></a>' : "") +
            '<button class="admin-donation-action view" data-request-status="' + esc(f.id) + '" data-status="aguardando-entrega"><i class="fa-solid fa-circle-check"></i><span>Aprovar</span></button>' +
            '<button class="admin-donation-action view" data-request-status="' + esc(f.id) + '" data-status="aguardando-documentos"><i class="fa-solid fa-file-circle-exclamation"></i><span>Documentos</span></button>' +
            '<button class="admin-donation-action view" data-edit-family="' + esc(f.id) + '"><i class="fa-regular fa-pen-to-square"></i><span>Editar</span></button>' +
          '</div>' +
        '</div>' +
      '</details>';
    }).join(""));
  }

  function detailField(label, value) {
    return '<div><span class="admin-detail-label">' + esc(label) + '</span><span class="admin-detail-value">' + esc(value) + '</span></div>';
  }

  function renderKanban(tasks) {
    var cols = [
      ["a-fazer", "A fazer", "purple"],
      ["em-andamento", "Em andamento", "blue"],
      ["aguardando", "Aguardando", "yellow"],
      ["concluido", "Concluido", "green"],
    ];
    return '<div class="admin-kanban">' + cols.map(function (col) {
      var colTasks = tasks.filter(function (t) { return slug(t.status) === col[0] || (col[0] === "concluido" && slug(t.status) === "concluida"); });
      return '<section class="admin-kanban-column"><div class="admin-kanban-head"><span class="admin-dot" style="--dot:' + COLORS[col[2]] + '"></span>' + esc(col[1]) + badge(String(colTasks.length), col[2]) + '</div><div class="admin-task-list">' +
        (colTasks.length ? colTasks.map(function (t) { return renderTaskCard(t, col[2]); }).join("") : '<div class="admin-empty">Nenhuma tarefa</div>') +
        '<button class="admin-button block" data-add-task="' + col[0] + '"><i class="fa-solid fa-plus"></i>Adicionar tarefa</button></div></section>';
    }).join("") + '</div>';
  }

  function renderTaskCard(t, tone) {
    var nome = t.responsavel || "Equipe Semear";
    var titulo = t.titulo || t.title || "Tarefa";
    var descricao = t.descricao || t.description || "";
    return '<details class="admin-donation-card admin-donation-card--' + (tone || "blue") + ' admin-task-card">' +
      '<summary class="admin-task-card-summary">' +
        '<span class="admin-donation-avatar admin-task-card-avatar" aria-hidden="true">' + esc(initials(nome)) + '</span>' +
        '<span class="admin-task-card-body">' +
          '<strong>' + esc(titulo) + '</strong>' +
          '<small><i class="fa-regular fa-calendar"></i>' + fmtDate(t.data || t.dueDate) + ' · ' + esc(nome) + '</small>' +
          '<span class="admin-task-card-priority">' + priorityBadge(t.prioridade || "media") + '</span>' +
        '</span>' +
        '<i class="fa-solid fa-chevron-down admin-donation-chevron" aria-hidden="true"></i>' +
      '</summary>' +
      '<div class="admin-task-card-detail">' +
        (descricao ? '<p>' + esc(descricao) + '</p>' : '') +
        '<div class="admin-row-actions">' +
          '<button class="admin-mini-action" data-task-edit="' + esc(t.id) + '" aria-label="Editar tarefa"><i class="fa-regular fa-pen-to-square"></i></button>' +
          '<button class="admin-mini-action danger" data-task-delete="' + esc(t.id) + '" aria-label="Excluir tarefa"><i class="fa-regular fa-trash-can"></i></button>' +
        '</div>' +
      '</div>' +
    '</details>';
  }

  function renderDeadlines() {
    return '<div class="admin-list">' + state.data.tasks.slice().sort(function (a, b) { return new Date(a.data || 0) - new Date(b.data || 0); }).slice(0, 4).map(function (t) {
      var d = new Date(t.data || Date.now());
      return '<div class="admin-list-item"><div class="admin-list-icon">' + d.getDate() + '<small style="font-size:.55rem;display:block">JUN</small></div><div class="admin-list-body"><div class="admin-list-title">' + esc(t.titulo || t.title) + '</div><div class="admin-list-sub">' + esc(t.responsavel || "Equipe") + '</div></div>' + priorityBadge(t.prioridade || "media") + '</div>';
    }).join("") + '</div>';
  }

  function unique(rows) {
    var seen = {};
    return rows.filter(function (v) {
      var k = slug(v);
      if (!k || seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  function bindViewEvents() {
    $all(".js-export").forEach(function (btn) { btn.addEventListener("click", exportReport); });
    ["overview-site"].forEach(function (id) {
      var el = $("#" + id);
      if (el) el.addEventListener("click", goToSite);
    });

    $all("[data-filter-group]").forEach(function (el) {
      el.addEventListener("change", function () {
        state.filters[el.dataset.filterGroup][el.dataset.filterKey] = el.value;
        renderActivePage();
      });
    });

    $all("[data-clear-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        Object.keys(state.filters[btn.dataset.clearFilter]).forEach(function (key) {
          state.filters[btn.dataset.clearFilter][key] = "todos";
        });
        renderActivePage();
      });
    });

    $all("[data-edit-family]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openFamilyEditModal(btn.dataset.editFamily);
      });
    });

    $all("[data-request-status]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        updateBasketRequestStatus(btn.dataset.requestStatus, btn.dataset.status);
      });
    });

    $all("[data-family-delivery]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        updateBasketRequestStatus(btn.dataset.familyDelivery, btn.dataset.status);
      });
    });

    var requestsRefresh = $("#requests-refresh");
    if (requestsRefresh) requestsRefresh.addEventListener("click", async function () {
      notify("Atualizando solicitacoes...");
      await loadData();
      renderActivePage();
      notify("Solicitacoes atualizadas.");
    });

    $all("[data-analytics-period]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.analyticsPeriod = parseInt(btn.dataset.analyticsPeriod, 10);
        renderActivePage();
      });
    });

    var newTask = $("#new-task");
    if (newTask) newTask.addEventListener("click", function () { createTask("a-fazer"); });

    $all("[data-add-task]").forEach(function (btn) {
      btn.addEventListener("click", function () { createTask(btn.dataset.addTask); });
    });

    $all("[data-task-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () { editTask(btn.dataset.taskEdit); });
    });
    $all("[data-task-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () { deleteTaskRow(btn.dataset.taskDelete); });
    });

    var scale = $("#create-scale");
    if (scale) scale.addEventListener("click", function () { notify("Escala pronta para revisao da equipe."); });

    var foodForm = $("#food-quick-form");
    if (foodForm) foodForm.addEventListener("submit", saveFood);

    /* Preview de imagem ao digitar URL */
    var foodImgInput = $("#food-form-img");
    if (foodImgInput) foodImgInput.addEventListener("input", function () { updateFoodImgPreview(this.value); });

    /* Auto-sugerir imagem padrão ao digitar nome */
    var foodNomeInput = $("#food-form-nome");
    if (foodNomeInput) foodNomeInput.addEventListener("input", function () {
      var imgInput = $("#food-form-img");
      if (imgInput && !imgInput.value.trim()) {
        var autoImg = foodDefaultImg({ name: this.value });
        if (autoImg) updateFoodImgPreview(autoImg);
      }
    });

    /* Upload de arquivo para o campo imagem */
    var foodUploadBox = $("#food-upload-box");
    var foodFileInput = $("#food-form-file");
    if (foodFileInput) foodFileInput.addEventListener("change", async function () {
      var file = this.files && this.files[0];
      if (!file) return;
      if (foodUploadBox) foodUploadBox.classList.add("is-uploading");
      notify("Enviando imagem...");
      try {
        var url;
        if (window.DoaVidaR2 && DoaVidaR2.configurado()) {
          var res = await DoaVidaR2.upload(file, "alimentos");
          url = res.url;
        } else if (window.DoaVidaSync && DoaVidaSync.uploadImagemGaleria) {
          url = await DoaVidaSync.uploadImagemGaleria(file, "alimentos");
        } else {
          throw new Error("Nenhum servico de upload configurado.");
        }
        var imgInput = $("#food-form-img");
        if (imgInput) { imgInput.value = url; }
        updateFoodImgPreview(url);
        notify("Imagem enviada ao Cloud!");
      } catch (e) {
        notify("Erro no upload: " + (e.message || e));
      } finally {
        if (foodUploadBox) foodUploadBox.classList.remove("is-uploading");
      }
    });

    /* Arrastar e soltar no box de upload (o texto do label já prometia "arraste") */
    if (foodUploadBox && foodFileInput) {
      ["dragenter", "dragover"].forEach(function (evt) {
        foodUploadBox.addEventListener(evt, function (e) {
          e.preventDefault();
          foodUploadBox.classList.add("is-dragover");
        });
      });
      ["dragleave", "dragend", "drop"].forEach(function (evt) {
        foodUploadBox.addEventListener(evt, function (e) {
          e.preventDefault();
          foodUploadBox.classList.remove("is-dragover");
        });
      });
      foodUploadBox.addEventListener("drop", function (e) {
        var dropped = e.dataTransfer && e.dataTransfer.files;
        if (!dropped || !dropped.length) return;
        try { foodFileInput.files = dropped; } catch (err) { return; }
        foodFileInput.dispatchEvent(new Event("change"));
      });
    }

    var foodInlineSearch = $("#foods-inline-search");
    if (foodInlineSearch) foodInlineSearch.addEventListener("input", debounce(function () {
      var global = $("#admin-search");
      if (global) global.value = foodInlineSearch.value;
      renderActivePage();
    }));
    var openFoodForm = $("#open-food-form");
    if (openFoodForm) openFoodForm.addEventListener("click", openFoodModal);

    var closeFoodForm = $("#food-modal-close");
    if (closeFoodForm) closeFoodForm.addEventListener("click", closeFoodModal);

    var backdrop = $("#food-modal-backdrop");
    if (backdrop) backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) closeFoodModal();
    });
    $all("[data-food-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () { deleteFood(btn.dataset.foodDelete); });
    });
    $all("[data-food-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () { editFood(btn.dataset.foodEdit); });
    });

    $all("[data-donation-view]").forEach(function (btn) {
      btn.addEventListener("click", function () { openDonationModal(btn.dataset.donationView); });
    });
    $all("[data-donation-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () { deleteDonationRow(btn.dataset.donationDelete); });
    });

    var closeDonation = $("#donation-modal-close");
    if (closeDonation) closeDonation.addEventListener("click", closeDonationModal);

    var donationStatusForm = $("#donation-status-form");
    if (donationStatusForm) {
      donationStatusForm.addEventListener("submit", saveDonationStatus);
      /* Atualiza em tempo real: ao trocar o status no select, salva na hora
         (sem precisar clicar em "Salvar") e já reflete na tabela/KPIs. */
      var donationStatusSelect = donationStatusForm.querySelector("[name='status']");
      if (donationStatusSelect) donationStatusSelect.addEventListener("change", function () {
        saveDonationStatus({ preventDefault: function () {}, target: donationStatusForm }, { keepOpen: true });
      });
    }

    /* Botão "Cadastrar alimentos padrão" (na action row e no estado vazio) */
    ["seed-foods", "seed-foods-empty"].forEach(function (id) {
      var btn = $("#" + id);
      if (btn) btn.addEventListener("click", seedDefaultFoods);
    });

    /* Card "Cesta Básica Completa" — abre o modal de troca de imagem */
    var editCestaImg = $("#edit-cesta-img");
    if (editCestaImg) editCestaImg.addEventListener("click", openCestaImgModal);

    var closeCestaImg = $("#cesta-img-modal-close");
    if (closeCestaImg) closeCestaImg.addEventListener("click", closeCestaImgModal);

    var cestaImgUrlInput = $("#cesta-img-url-input");
    if (cestaImgUrlInput) cestaImgUrlInput.addEventListener("input", function () { updateCestaImgPreview(this.value.trim()); });

    var cestaImgSaveBtn = $("#cesta-img-save");
    if (cestaImgSaveBtn) cestaImgSaveBtn.addEventListener("click", salvarImgCesta);

    var cestaImgUploadBox = $("#cesta-img-upload-box");
    var cestaImgFileInput = $("#cesta-img-file");
    if (cestaImgFileInput) cestaImgFileInput.addEventListener("change", async function () {
      var file = this.files && this.files[0];
      if (!file) return;
      if (cestaImgUploadBox) cestaImgUploadBox.classList.add("is-uploading");
      notify("Enviando imagem...");
      try {
        var url;
        if (window.DoaVidaR2 && DoaVidaR2.configurado()) {
          var res = await DoaVidaR2.upload(file, "cesta");
          url = res.url;
        } else if (window.DoaVidaSync && DoaVidaSync.uploadImagemGaleria) {
          url = await DoaVidaSync.uploadImagemGaleria(file, "cesta");
        } else {
          throw new Error("Nenhum serviço de upload configurado.");
        }
        var urlInput = $("#cesta-img-url-input");
        if (urlInput) urlInput.value = url;
        updateCestaImgPreview(url);
        notify("Imagem enviada ao Cloud!");
      } catch (e) {
        notify("Erro no upload: " + (e.message || e));
      } finally {
        if (cestaImgUploadBox) cestaImgUploadBox.classList.remove("is-uploading");
      }
    });

    if (cestaImgUploadBox && cestaImgFileInput) {
      ["dragenter", "dragover"].forEach(function (evt) {
        cestaImgUploadBox.addEventListener(evt, function (e) {
          e.preventDefault();
          cestaImgUploadBox.classList.add("is-dragover");
        });
      });
      ["dragleave", "dragend", "drop"].forEach(function (evt) {
        cestaImgUploadBox.addEventListener(evt, function (e) {
          e.preventDefault();
          cestaImgUploadBox.classList.remove("is-dragover");
        });
      });
      cestaImgUploadBox.addEventListener("drop", function (e) {
        var dropped = e.dataTransfer && e.dataTransfer.files;
        if (!dropped || !dropped.length) return;
        try { cestaImgFileInput.files = dropped; } catch (err) { return; }
        cestaImgFileInput.dispatchEvent(new Event("change"));
      });
    }

    var waAdd = $("#wa-add-admin");
    if (waAdd) waAdd.addEventListener("click", openWhatsappAdminModal);
    $all("[data-wa-admin-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () { editWhatsappAdmin(btn.dataset.waAdminEdit); });
    });
    $all("[data-wa-admin-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () { deleteWhatsappAdminRow(btn.dataset.waAdminDelete); });
    });
    var waConnForm = $("#wa-connection-form");
    if (waConnForm) waConnForm.addEventListener("submit", saveWhatsappConnection);
    var waTest = $("#wa-test");
    if (waTest) waTest.addEventListener("click", testarConexaoWhatsApp);

    var galleryAdd = $("#gallery-add");
    if (galleryAdd) galleryAdd.addEventListener("click", addGalleryMedia);

    ["gallery-import-site", "gallery-import-site-empty"].forEach(function (id) {
      var btn = $("#" + id);
      if (btn) btn.addEventListener("click", importSiteImages);
    });

    $all("[data-gallery-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () { openGalleryEdit(btn.dataset.galleryEdit); });
    });

    $all("[data-gallery-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () { deleteGalleryItem(btn.dataset.galleryDelete); });
    });

    var geClose = $("#gallery-edit-close");
    if (geClose) geClose.addEventListener("click", closeGalleryEdit);
    var geCancel = $("#gallery-edit-cancel");
    if (geCancel) geCancel.addEventListener("click", closeGalleryEdit);
    var geBackdrop = $("#gallery-edit-backdrop");
    if (geBackdrop) geBackdrop.addEventListener("click", function (e) { if (e.target === geBackdrop) closeGalleryEdit(); });

    var geForm = $("#gallery-edit-form");
    if (geForm) geForm.addEventListener("submit", saveGalleryEdit);

    var geUrlInput = geForm && geForm.querySelector("[name='url']");
    if (geUrlInput) geUrlInput.addEventListener("input", function () { updateGalleryEditPreview(this.value); });

    var geFile = $("#gallery-edit-file");
    if (geFile) geFile.addEventListener("change", async function () {
      var file = this.files && this.files[0];
      if (!file) return;
      notify("Enviando imagem...");
      try {
        var url;
        if (window.DoaVidaR2 && DoaVidaR2.configurado()) {
          url = (await DoaVidaR2.upload(file, "galeria")).url;
        } else if (window.DoaVidaSync && DoaVidaSync.uploadImagemGaleria) {
          url = await DoaVidaSync.uploadImagemGaleria(file, "galeria");
        } else {
          throw new Error("Nenhum servico de upload configurado.");
        }
        var urlField = geForm && geForm.querySelector("[name='url']");
        if (urlField) urlField.value = url;
        updateGalleryEditPreview(url);
        notify("Imagem enviada!");
      } catch (e) {
        notify("Erro no upload: " + (e.message || e));
      }
    });

    var galleryInlineSearch = $("#gallery-inline-search");
    if (galleryInlineSearch) galleryInlineSearch.addEventListener("input", debounce(function () {
      var global = $("#admin-search");
      if (global) global.value = galleryInlineSearch.value;
      renderActivePage();
    }));

    var volunteersInlineSearch = $("#volunteers-inline-search");
    if (volunteersInlineSearch) volunteersInlineSearch.addEventListener("input", debounce(function () {
      var global = $("#admin-search");
      if (global) global.value = volunteersInlineSearch.value;
      renderActivePage();
    }));

    var spiritualInlineSearch = $("#spiritual-inline-search");
    if (spiritualInlineSearch) spiritualInlineSearch.addEventListener("input", debounce(function () {
      var global = $("#admin-search");
      if (global) global.value = spiritualInlineSearch.value;
      renderActivePage();
    }));

    $all("[data-config-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () { toggleConfig(btn); });
    });
    var settingsForm = $("#settings-form");
    if (settingsForm) settingsForm.addEventListener("submit", saveSettings);
    var settingsReset = $("#settings-reset");
    if (settingsReset) settingsReset.addEventListener("click", resetSettingsForm);
    var settingsBackup = $("#settings-backup");
    if (settingsBackup) settingsBackup.addEventListener("click", fazerBackupCompleto);
    var passwordSubmit = $("#password-change-submit");
    if (passwordSubmit) passwordSubmit.addEventListener("click", changeAdminPassword);
    $all(".admin-color-input").forEach(function (wrap) {
      var colorEl = wrap.querySelector("input[type='color']");
      var textEl = wrap.querySelector("input:not([type='color'])");
      if (!colorEl || !textEl || wrap._colorSyncBound) return;
      colorEl.addEventListener("input", function () { textEl.value = colorEl.value; });
      textEl.addEventListener("change", function () {
        if (/^#[0-9a-fA-F]{6}$/.test(textEl.value)) colorEl.value = textEl.value;
      });
      wrap._colorSyncBound = true;
    });

    var r2Test = $("#r2-test");
    if (r2Test) r2Test.addEventListener("click", testR2Connection);
    var donaBackendTest = $("#dona-backend-test");
    if (donaBackendTest) donaBackendTest.addEventListener("click", testDonaBackendConnection);

    var videoAcaoUrl = $("#video-acao-url");
    if (videoAcaoUrl) videoAcaoUrl.addEventListener("input", updateVideoAcaoPreview);
    var videoAcaoPoster = $("#video-acao-poster-url");
    if (videoAcaoPoster) videoAcaoPoster.addEventListener("input", updateVideoAcaoPreview);
    var videoPreviewBtn = $("#video-acao-preview-btn");
    if (videoPreviewBtn) videoPreviewBtn.addEventListener("click", updateVideoAcaoPreview);
    var videoSaveBtn = $("#video-acao-save");
    if (videoSaveBtn) videoSaveBtn.addEventListener("click", saveVideoAcaoSettings);
    var videoFile = $("#video-acao-file");
    if (videoFile) videoFile.addEventListener("change", function () { uploadVideoAcaoFile(videoFile, "video"); });
    var posterFile = $("#video-acao-poster-file");
    if (posterFile) posterFile.addEventListener("change", function () { uploadVideoAcaoFile(posterFile, "poster"); });
    if (videoAcaoUrl || videoAcaoPoster) updateVideoAcaoPreview();

    /* Cards de imagem do formulário de voluntário */
    $all(".vol-card-url-input").forEach(function (input) {
      input.addEventListener("input", function () {
        updateVolCardPreview(input.dataset.cardKey, input.value);
      });
    });
    VOL_CARD_DEFAULTS.forEach(function (c) {
      var fileInput = $("#vol-card-file-" + c.key);
      if (!fileInput) return;
      fileInput.addEventListener("change", async function () {
        var file = this.files && this.files[0];
        if (!file) return;
        notify("Enviando imagem do card...");
        try {
          var url;
          if (window.DoaVidaR2 && DoaVidaR2.configurado()) {
            url = (await DoaVidaR2.upload(file, "voluntarios")).url;
          } else if (window.DoaVidaSync && DoaVidaSync.uploadImagemGaleria) {
            url = await DoaVidaSync.uploadImagemGaleria(file, "voluntarios");
          } else {
            throw new Error("Nenhum servico de upload configurado.");
          }
          var urlInput = $("#vol-card-url-" + c.key);
          if (urlInput) urlInput.value = url;
          updateVolCardPreview(c.key, url);
          notify("Imagem enviada!");
        } catch (e) {
          notify("Erro no upload: " + (e.message || e));
        }
      });
    });
    var volCardsSave = $("#vol-cards-save");
    if (volCardsSave) volCardsSave.addEventListener("click", saveVolunteerCards);

    /* Botões das novas páginas */
    var newFamily = $("#new-family");
    if (newFamily) newFamily.addEventListener("click", function () { openFamilyNewModal(); });
    var newRequest = $("#new-request");
    if (newRequest) newRequest.addEventListener("click", function () { openFamilyNewModal(); });

    var newVolunteer = $("#new-volunteer");
    if (newVolunteer) newVolunteer.addEventListener("click", openVolunteerModal);

    $all("[data-volunteer-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () { editVolunteer(btn.dataset.volunteerEdit); });
    });
    $all("[data-volunteer-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () { deleteVolunteerRow(btn.dataset.volunteerDelete); });
    });

    var waTestTop = $("#wa-test-top");
    if (waTestTop) waTestTop.addEventListener("click", testarConexaoWhatsApp);

    var settingsSaveTop = $("#settings-save-top");
    if (settingsSaveTop) settingsSaveTop.addEventListener("click", function () {
      var form = document.getElementById("settings-form");
      if (form) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    var settingsReset2 = $("#settings-reset2");
    if (settingsReset2) settingsReset2.addEventListener("click", resetSettingsForm);

    /* Vincula close/backdrop dos modais novos (idempotente via _modalBound) */
    bindModalBackdrops();
  }

  function openFamilyNewModal() {
    var form = document.getElementById("family-quick-form");
    if (form) {
      form.reset();
      delete form.dataset.editId;
      var set = function (name, val) {
        var el = form.querySelector("[name='" + name + "']");
        if (el) el.value = val;
      };
      set("edit-id", "");
      set("uf", "PA");
      set("cidade", "Belem");
      set("status", "em-analise");
      set("prioridade", "media");
      set("necessidade", "Cesta basica");
    }
    var titleEl = document.getElementById("family-modal-title");
    if (titleEl) titleEl.textContent = "Nova solicitacao de cesta";
    var btnEl = document.getElementById("family-submit-btn");
    if (btnEl) btnEl.innerHTML = '<i class="fa-regular fa-floppy-disk"></i>Salvar solicitacao';
    openModal("family-modal-backdrop");
  }

  function openFamilyEditModal(familyId) {
    var f = (state.data.families || []).find(function (x) { return x.id === familyId; });
    if (!f) return;
    var form = document.getElementById("family-quick-form");
    if (!form) return;

    /* Marca modo edição */
    var fill = function (name, val) {
      var el = form.querySelector("[name='" + name + "']");
      if (el) el.value = (val == null ? "" : val);
    };
    fill("edit-id",    f.id);
    fill("responsavel",f.responsavel || f.nome || "");
    fill("telefone",   f.telefone || "");
    fill("estado_civil", f.estado_civil || "");
    fill("sexo",       f.sexo || "");
    fill("cep",        f.cep || "");
    fill("logradouro", f.logradouro || f.endereco || "");
    fill("numero",     f.numero || "");
    fill("complemento", f.complemento || "");
    fill("bairro",     f.bairro || "");
    fill("cidade",     f.cidade || "");
    fill("uf",         f.uf || "PA");
    fill("referencia", f.referencia || "");
    fill("pessoas_texto", f.pessoas_texto || (f.pessoas ? String(f.pessoas) + " pessoa(s)" : ""));
    fill("criancas",   f.criancas || "");
    fill("idosos",     f.idosos || "");
    fill("deficiencia", f.deficiencia || "");
    fill("renda_texto", f.renda_texto || "");
    fill("trabalho",   f.trabalho || "");
    fill("beneficio",  f.beneficio || "");
    fill("necessidade",f.necessidade || "Cesta basica");
    fill("status",     f.status || "em-analise");
    fill("prioridade", f.prioridade || "media");
    fill("observacao", f.observacao || "");

    /* Atualiza título e botão do modal */
    var titleEl = document.getElementById("family-modal-title");
    if (titleEl) titleEl.textContent = "Editar solicitacao de cesta";
    var btnEl = document.getElementById("family-submit-btn");
    if (btnEl) btnEl.innerHTML = '<i class="fa-regular fa-floppy-disk"></i>Salvar alterações';

    openModal("family-modal-backdrop");
  }

  async function saveFamily(e) {
    e.preventDefault();
    var form = e.target;
    var d = new FormData(form);
    var editId = (d.get("edit-id") || "").trim();

    var dadosEndereco = {
      logradouro:  d.get("logradouro")  || "",
      numero:      d.get("numero")      || "",
      complemento: d.get("complemento") || "",
      bairro:      d.get("bairro")      || "",
      cidade:      d.get("cidade")      || "",
      uf:          d.get("uf")          || "PA",
    };
    var pessoasTexto = d.get("pessoas_texto") || "";
    var campos = {
      responsavel:   d.get("responsavel") || "",
      nome:          d.get("responsavel") || "",
      telefone:      d.get("telefone")    || "",
      estado_civil:  d.get("estado_civil") || "",
      sexo:          d.get("sexo") || "",
      cep:           d.get("cep") || "",
      endereco:      fullAddress(dadosEndereco),
      logradouro:    dadosEndereco.logradouro,
      numero:        dadosEndereco.numero,
      complemento:   dadosEndereco.complemento,
      bairro:        dadosEndereco.bairro,
      cidade:        dadosEndereco.cidade,
      uf:            dadosEndereco.uf,
      referencia:    d.get("referencia") || "",
      pessoas:       peopleCount(pessoasTexto),
      pessoas_texto: pessoasTexto,
      criancas:      d.get("criancas") || "",
      idosos:        d.get("idosos") || "",
      deficiencia:   d.get("deficiencia") || "",
      renda_texto:   d.get("renda_texto") || "",
      trabalho:      d.get("trabalho") || "",
      beneficio:     d.get("beneficio") || "",
      necessidade:   d.get("necessidade") || "Cesta basica",
      status:        d.get("status") || "em-analise",
      prioridade:    d.get("prioridade") || "media",
      observacao:    d.get("observacao") || "",
      origem:        "admin-cesta-form",
    };
    if (campos.status === "aguardando-entrega") {
      campos.mes_referencia = monthKey();
      campos.aprovado_em = new Date().toISOString();
      campos.entregue_em = "";
    }
    if (campos.status === "entregue") {
      campos.mes_referencia = monthKey();
      campos.entregue_em = new Date().toISOString();
    }

    try {
      if (editId) {
        /* ─── Modo edição ─── */
        if (!window.DoaVidaSync || typeof DoaVidaSync.updateFamilia !== "function") throw new Error("Servico indisponivel.");
        var updated = await DoaVidaSync.updateFamilia(editId, campos);
        var idx = state.data.families.findIndex(function (f) { return f.id === editId; });
        if (idx >= 0) state.data.families[idx] = Object.assign({}, state.data.families[idx], campos);
        notify("Família atualizada!");
      } else {
        /* ─── Modo cadastro ─── */
        if (!window.DoaVidaSync || typeof DoaVidaSync.addFamilia !== "function") throw new Error("Servico indisponivel.");
        var payload = Object.assign({ protocolo: requestProtocol(), created_at: new Date().toISOString() }, campos);
        var saved = await DoaVidaSync.addFamilia(payload);
        state.data.families.unshift(saved || payload);
        notify("Solicitacao cadastrada!");
      }
      /* Reseta modal para modo cadastro */
      form.reset();
      var editInput = form.querySelector("[name='edit-id']");
      if (editInput) editInput.value = "";
      var titleEl = document.getElementById("family-modal-title");
      if (titleEl) titleEl.textContent = "Nova solicitacao de cesta";
      var btnEl = document.getElementById("family-submit-btn");
      if (btnEl) btnEl.innerHTML = '<i class="fa-regular fa-floppy-disk"></i>Salvar solicitacao';
      closeModal("family-modal-backdrop");
      renderActivePage();
    } catch (err) { notify("Erro ao salvar: " + (err.message || err)); }
  }

  async function updateBasketRequestStatus(id, status) {
    if (!id || !status) return;
    try {
      if (!window.DoaVidaSync || typeof DoaVidaSync.updateFamilia !== "function") throw new Error("Servico indisponivel.");
      var now = new Date().toISOString();
      var payload = { status: status, updated_at: now };
      var currentFamily = (state.data.families || []).find(function (f) { return f.id === id; }) || {};
      var history = familyBasketHistory(currentFamily);
      var currentMonth = monthKey();
      var nextMonth = nextMonthKey(currentMonth);
      function upsertBasket(row) {
        var idx = history.findIndex(function (h) { return h.mes_referencia === row.mes_referencia; });
        if (idx >= 0) history[idx] = Object.assign({}, history[idx], row);
        else history.push(row);
      }
      if (status === "aguardando-entrega") {
        payload.aprovado_em = now;
        payload.mes_referencia = currentMonth;
        payload.entregue_em = "";
        upsertBasket({
          id: "cesta-" + currentMonth,
          familia_id: id,
          mes_referencia: currentMonth,
          data_entrega: "",
          status: "Aguardando",
          itens_doados: "Ainda não informado",
          observacao: "Próxima cesta",
        });
      }
      if (status === "entregue") {
        payload.status = "aguardando-entrega";
        payload.entregue_em = now;
        payload.mes_referencia = nextMonth;
        upsertBasket({
          id: "cesta-" + currentMonth,
          familia_id: id,
          mes_referencia: currentMonth,
          data_entrega: now,
          status: "Recebida",
          itens_doados: currentFamily.itens_doados || "Ainda não informado",
          observacao: currentFamily.observacao_entrega || "Entregue normalmente",
        });
        upsertBasket({
          id: "cesta-" + nextMonth,
          familia_id: id,
          mes_referencia: nextMonth,
          data_entrega: "",
          status: "Aguardando",
          itens_doados: "Ainda não informado",
          observacao: "Próxima cesta",
        });
      }
      if (status === "nao-retirada") {
        payload.status = "nao-retirada";
        payload.mes_referencia = currentMonth;
        payload.entregue_em = "";
        upsertBasket({
          id: "cesta-" + currentMonth,
          familia_id: id,
          mes_referencia: currentMonth,
          data_entrega: "",
          status: "Não retirada",
          itens_doados: currentFamily.itens_doados || "Ainda não informado",
          observacao: "Família não recebeu a cesta",
        });
      }
      payload.entregas_cestas = history.sort(function (a, b) { return String(a.mes_referencia || "").localeCompare(String(b.mes_referencia || "")); });
      payload.bloqueado_meses = payload.entregas_cestas
        .filter(function (r) { return slug(r.status) === "recebida"; })
        .map(function (r) { return r.mes_referencia; });
      await DoaVidaSync.updateFamilia(id, payload);
      var idx = state.data.families.findIndex(function (f) { return f.id === id; });
      if (idx >= 0) state.data.families[idx] = Object.assign({}, state.data.families[idx], payload);
      notify(status === "aguardando-entrega" ? "Pessoa aprovada e enviada para Familias." : "Status da entrega atualizado.");
      renderActivePage();
    } catch (err) {
      notify("Nao foi possivel atualizar: " + (err.message || err));
    }
  }

  async function saveVolunteer(e) {
    e.preventDefault();
    var form = e.target;
    var editId = form.dataset.editId || "";
    var d = new FormData(form);
    var payload = {
      nome: d.get("nome") || "",
      telefone: d.get("whatsapp") || "",
      whatsapp: d.get("whatsapp") || "",
      tipo_label: d.get("tipo_label") || "",
      disponibilidade: d.get("disponibilidade") || "",
      status: d.get("status") || "ativo",
      observacao: d.get("observacao") || "",
    };
    var submitBtn = $("#volunteer-form-submit");
    var idleLabel = editId
      ? '<i class="fa-regular fa-floppy-disk"></i>Atualizar voluntário'
      : '<i class="fa-regular fa-floppy-disk"></i>Cadastrar voluntário';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>Salvando...'; }
    try {
      if (!window.DoaVidaSync) throw new Error("Servico indisponivel.");
      if (editId && typeof DoaVidaSync.updateVoluntario === "function") {
        var updated = await DoaVidaSync.updateVoluntario(editId, payload);
        state.data.volunteers = state.data.volunteers.map(function (v) { return v.id === editId ? Object.assign({}, v, updated || payload, { id: editId }) : v; });
        delete form.dataset.editId;
        notify("Voluntário atualizado.");
      } else {
        if (typeof DoaVidaSync.addVoluntario !== "function") throw new Error("Metodo addVoluntario indisponivel.");
        payload.created_at = new Date().toISOString();
        var saved = await DoaVidaSync.addVoluntario(payload);
        state.data.volunteers.unshift(saved || payload);
        notify("Voluntário cadastrado no Firebase.");
      }
      closeModal("volunteer-modal-backdrop");
      renderActivePage();
    } catch (err) {
      notify("Erro ao salvar: " + (err.message || err));
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = idleLabel; }
    }
  }

  function openVolunteerModal() {
    var backdrop = $("#volunteer-modal-backdrop");
    if (!backdrop) return;
    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var dialog = backdrop.querySelector(".admin-modal");
    if (dialog) dialog.setAttribute("aria-label", "Cadastrar voluntario");
    var titleText = $("#volunteer-modal-title-text");
    if (titleText) titleText.textContent = "Novo voluntário";
    var icon = $("#volunteer-modal-icon");
    if (icon) icon.className = "fa-solid fa-circle-plus";
    var submitBtn = $("#volunteer-form-submit");
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i>Cadastrar voluntário';
    var deleteBtn = $("#volunteer-form-delete");
    if (deleteBtn) deleteBtn.style.display = "none";
    var form = $("#volunteer-quick-form");
    if (form) delete form.dataset.editId;
    setTimeout(function () {
      var first = $("#volunteer-quick-form input[name='nome']");
      if (first) first.focus();
    }, 80);
  }

  function editVolunteer(id) {
    var v = state.data.volunteers.find(function (x) { return x.id === id; });
    if (!v) { notify("Voluntário nao encontrado."); return; }
    openModal("volunteer-modal-backdrop");
    setTimeout(function () {
      var form = $("#volunteer-quick-form");
      var fields = {
        nome:            String(v.nome || v.name || ""),
        whatsapp:        String(v.telefone || v.whatsapp || ""),
        tipo_label:      String(v.tipo_label || v.tipo || ""),
        disponibilidade: volunteerDisponibilidade(v),
        status:          String(v.status || "ativo"),
        observacao:      String(v.observacao || ""),
      };
      Object.keys(fields).forEach(function (key) {
        var el = form && form.querySelector("[name='" + key + "']");
        if (el) el.value = fields[key];
      });
      if (form) form.dataset.editId = id;
      var titleText = $("#volunteer-modal-title-text");
      if (titleText) titleText.textContent = "Editar voluntário";
      var icon = $("#volunteer-modal-icon");
      if (icon) icon.className = "fa-regular fa-pen-to-square";
      var submitBtn = $("#volunteer-form-submit");
      if (submitBtn) submitBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i>Atualizar voluntário';
      var deleteBtn = $("#volunteer-form-delete");
      if (deleteBtn) { deleteBtn.style.display = ""; deleteBtn.onclick = function () { deleteVolunteerRow(id); }; }
      var dialog = $("#volunteer-modal-backdrop").querySelector(".admin-modal");
      if (dialog) dialog.setAttribute("aria-label", "Editar voluntario");
    }, 50);
  }

  async function deleteVolunteerRow(id) {
    if (!id) return;
    if (!window.confirm("Excluir este voluntário permanentemente?")) return;
    try {
      if (!window.DoaVidaSync || typeof DoaVidaSync.deleteVoluntario !== "function") throw new Error("Servico indisponivel.");
      await DoaVidaSync.deleteVoluntario(id);
      state.data.volunteers = state.data.volunteers.filter(function (v) { return v.id !== id; });
      notify("Voluntário removido.");
      closeModal("volunteer-modal-backdrop");
      renderActivePage();
    } catch (e) {
      notify("Nao foi possivel remover: " + (e.message || e));
    }
  }

  async function saveFood(event) {
    event.preventDefault();
    if (!window.DoaVidaSync) { notify("Firebase indisponivel."); return; }
    var form = event.currentTarget;
    var editId = form.dataset.editId || "";
    var fd = new FormData(form);
    var imageUrl = String(fd.get("imagem") || "").trim();
    var file = fd.get("arquivo");
    var submitBtn = form.querySelector("[type='submit']");
    var idleLabel = editId
      ? '<i class="fa-regular fa-floppy-disk"></i>Atualizar alimento'
      : '<i class="fa-regular fa-floppy-disk"></i>Salvar alimento';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>Salvando...'; }
    try {
      /* Upload do arquivo se selecionado (o arquivo já pode ter sido enviado via listener,
         mas verificamos novamente para o caso do form ser submetido com arquivo ainda presente) */
      if (file && file.name && !imageUrl) {
        if (window.DoaVidaR2 && DoaVidaR2.configurado()) {
          var r2res = await DoaVidaR2.upload(file, "alimentos");
          imageUrl = r2res.url;
        } else if (typeof DoaVidaSync.uploadImagemGaleria === "function") {
          imageUrl = await DoaVidaSync.uploadImagemGaleria(file, "alimentos");
        }
      }

      /* Se ainda não tem imagem, tenta a padrão pelo nome */
      if (!imageUrl) imageUrl = foodDefaultImg({ name: String(fd.get("nome") || "") });

      var nome = String(fd.get("nome") || "").trim();
      var payload = {
        nome:        nome,
        name:        nome,
        categoria:   String(fd.get("categoria") || "").trim(),
        unidade:     String(fd.get("unidade") || "").trim(),
        qtdPorCesta: String(fd.get("qtdPorCesta") || "").trim(),
        kg:          number(fd.get("kg")),
        minimo:      number(fd.get("minimo")),
        meta:        number(fd.get("meta")),
        imagem:      imageUrl,
        img:         imageUrl,
        ativo:       true,
      };

      if (editId && typeof DoaVidaSync.updateAlimento === "function") {
        /* Modo edição */
        var updated = await DoaVidaSync.updateAlimento(editId, payload);
        state.data.foods = state.data.foods.map(function (f) { return f.id === editId ? Object.assign({}, f, updated || payload, { id: editId }) : f; });
        delete form.dataset.editId;
        notify("Alimento atualizado no Firebase.");
      } else {
        /* Modo criação */
        if (typeof DoaVidaSync.addAlimento !== "function") throw new Error("Metodo addAlimento indisponivel.");
        var saved = await DoaVidaSync.addAlimento(payload);
        state.data.foods.unshift(saved || payload);
        notify("Alimento salvo no Firebase.");
      }

      closeFoodModal();
      renderActivePage();
    } catch (e) {
      notify("Nao foi possivel salvar: " + (e.message || e));
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = idleLabel; }
    }
  }

  /*
    Modal "Comprovante da doação": mostra os dados da doação (itens, doador,
    entrega, endereço) como um comprovante, e permite trocar o status
    livremente (pendente/confirmado/entregue/cancelado) — antes só existia
    um botão que forçava sempre "confirmado", sem nenhuma forma de ver
    o que foi doado.
  */
  function openDonationModal(id) {
    var d = (state.data.donations || []).find(function (x) { return x.id === id; });
    if (!d) return;

    var box = $("#donation-modal-receipt");
    if (box) box.innerHTML =
      '<div class="admin-detail-hero" style="margin-bottom:14px"><div class="admin-person-avatar">' + esc(initials(d.name || d.nome)) + '</div><div><h3>' + esc(d.name || d.nome || "Doador anônimo") + '</h3><p>' + (d.protocolo ? esc(d.protocolo) + ' — ' : '') + '<span id="donation-modal-status-badge">' + statusBadge(d.status || "pendente") + '</span></p></div></div>' +
      renderDonationReceiptHtml(d);

    var form = $("#donation-status-form");
    if (form) {
      var idInput = form.querySelector("[name='donation-id']");
      var statusInput = form.querySelector("[name='status']");
      if (idInput) idInput.value = d.id;
      if (statusInput) statusInput.value = d.status || "pendente";
    }
    openModal("donation-modal-backdrop");
  }

  function closeDonationModal() {
    closeModal("donation-modal-backdrop");
  }

  async function saveDonationStatus(e, opts) {
    e.preventDefault();
    opts = opts || {};
    var form = e.target;
    var data = new FormData(form);
    var id = data.get("donation-id");
    var status = data.get("status");
    if (!id) return;
    try {
      if (!window.DoaVidaSync || typeof DoaVidaSync.updateDoacaoStatus !== "function") throw new Error("Serviço indisponível.");
      await DoaVidaSync.updateDoacaoStatus(id, status);
      var idx = state.data.donations.findIndex(function (d) { return d.id === id; });
      if (idx >= 0) state.data.donations[idx].status = status;

      /* Atualiza o badge do modal na hora, já que renderActivePage() só
         redesenha #admin-view — o modal vive fora dele e não é tocado. */
      var badgeEl = $("#donation-modal-status-badge");
      if (badgeEl) badgeEl.innerHTML = statusBadge(status);

      if (!opts.keepOpen) closeDonationModal();
      notify("Status da doação atualizado!");
      renderActivePage();
    } catch (err) {
      console.error("[DoaVida] Falha ao atualizar status da doação:", err);
      notify("Não foi possível atualizar o status: " + (err.message || err));
    }
  }

  async function deleteDonationRow(id) {
    if (!id) return;
    if (!window.confirm("Remover esta doação?")) return;
    try {
      if (!window.DoaVidaSync || typeof DoaVidaSync.deleteDoacao !== "function") throw new Error("Serviço indisponível.");
      await DoaVidaSync.deleteDoacao(id);
      state.data.donations = state.data.donations.filter(function (d) { return d.id !== id; });
      notify("Doação removida.");
      renderActivePage();
    } catch (e) {
      notify("Não foi possível remover: " + (e.message || e));
    }
  }

  async function deleteFood(id) {
    if (!id) return;
    if (!window.confirm("Remover este alimento do Firebase?")) return;
    try {
      if (!window.DoaVidaSync || typeof DoaVidaSync.deleteAlimento !== "function") throw new Error("Servico indisponivel.");
      await DoaVidaSync.deleteAlimento(id);
      state.data.foods = state.data.foods.filter(function (f) { return f.id !== id; });
      notify("Alimento removido.");
      renderActivePage();
    } catch (e) {
      notify("Nao foi possivel remover: " + (e.message || e));
    }
  }

  function openWhatsappAdminModal() {
    var form = $("#wa-admin-form");
    if (form) {
      form.reset();
      delete form.dataset.editId;
      var statusInput = form.querySelector("[name='status']");
      if (statusInput) statusInput.value = "ativo";
      $all("[name='avisos']", form).forEach(function (cb) { cb.checked = cb.value === "doacoes"; });
    }
    var titleText = $("#wa-admin-modal-title-text");
    if (titleText) titleText.textContent = "Novo administrador";
    var icon = $("#wa-admin-modal-icon");
    if (icon) icon.className = "fa-solid fa-circle-plus";
    var submitBtn = $("#wa-admin-form-submit");
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i>Adicionar administrador';
    var deleteBtn = $("#wa-admin-form-delete");
    if (deleteBtn) deleteBtn.style.display = "none";
    openModal("wa-admin-modal-backdrop");
  }

  function editWhatsappAdmin(id) {
    var a = (state.data.whatsappAdmins || []).find(function (x) { return x.id === id; });
    if (!a) { notify("Administrador nao encontrado."); return; }
    openModal("wa-admin-modal-backdrop");
    setTimeout(function () {
      var form = $("#wa-admin-form");
      var tags = Array.isArray(a.avisos) ? a.avisos : String(a.avisos || "").split(",").filter(Boolean);
      var fields = {
        nome:     String(a.nome || a.name || ""),
        telefone: String(a.telefone || a.whatsapp || a.phone || ""),
        funcao:   String(a.funcao || a.role || "Admin"),
        status:   String(a.status || "ativo"),
      };
      Object.keys(fields).forEach(function (key) {
        var el = form && form.querySelector("[name='" + key + "']");
        if (el) el.value = fields[key];
      });
      $all("[name='avisos']", form).forEach(function (cb) { cb.checked = tags.indexOf(cb.value) >= 0; });
      if (form) form.dataset.editId = id;
      var titleText = $("#wa-admin-modal-title-text");
      if (titleText) titleText.textContent = "Editar administrador";
      var icon = $("#wa-admin-modal-icon");
      if (icon) icon.className = "fa-regular fa-pen-to-square";
      var submitBtn = $("#wa-admin-form-submit");
      if (submitBtn) submitBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i>Atualizar administrador';
      var deleteBtn = $("#wa-admin-form-delete");
      if (deleteBtn) { deleteBtn.style.display = ""; deleteBtn.onclick = function () { deleteWhatsappAdminRow(id); }; }
    }, 50);
  }

  async function deleteWhatsappAdminRow(id) {
    if (!id) return;
    if (!window.confirm("Excluir este administrador? Ele deixara de receber notificacoes.")) return;
    try {
      if (!window.DoaVidaSync || typeof DoaVidaSync.deleteWhatsappAdmin !== "function") throw new Error("Servico indisponivel.");
      await DoaVidaSync.deleteWhatsappAdmin(id);
      state.data.whatsappAdmins = (state.data.whatsappAdmins || []).filter(function (a) { return a.id !== id; });
      notify("Administrador removido.");
      closeModal("wa-admin-modal-backdrop");
      renderActivePage();
    } catch (e) {
      notify("Nao foi possivel remover: " + (e.message || e));
    }
  }

  async function saveWhatsappAdmin(e) {
    e.preventDefault();
    var form = e.target;
    var editId = form.dataset.editId || "";
    var d = new FormData(form);
    var nome = String(d.get("nome") || "").trim();
    var telefone = String(d.get("telefone") || "").trim();
    if (!nome || !telefone) { notify("Informe nome e telefone/WhatsApp."); return; }
    var payload = {
      nome: nome,
      telefone: telefone,
      funcao: String(d.get("funcao") || "Admin").trim() || "Admin",
      status: d.get("status") || "ativo",
      avisos: d.getAll("avisos"),
    };
    var submitBtn = $("#wa-admin-form-submit");
    var idleLabel = editId
      ? '<i class="fa-regular fa-floppy-disk"></i>Atualizar administrador'
      : '<i class="fa-regular fa-floppy-disk"></i>Adicionar administrador';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>Salvando...'; }

    try {
      if (!window.DoaVidaSync) throw new Error("Servico indisponivel.");
      if (editId) {
        if (typeof DoaVidaSync.updateWhatsappAdmin !== "function") throw new Error("Servico indisponivel.");
        var updated = await DoaVidaSync.updateWhatsappAdmin(editId, payload);
        state.data.whatsappAdmins = (state.data.whatsappAdmins || []).map(function (a) {
          return a.id === editId ? Object.assign({}, a, updated || payload, { id: editId }) : a;
        });
        delete form.dataset.editId;
        notify("Administrador atualizado.");
      } else {
        if (typeof DoaVidaSync.addWhatsappAdmin !== "function") throw new Error("Servico indisponivel.");
        var saved = await DoaVidaSync.addWhatsappAdmin(payload);
        if (!state.data.whatsappAdmins) state.data.whatsappAdmins = [];
        state.data.whatsappAdmins.unshift(saved || Object.assign({ id: "wa-" + Date.now() }, payload));
        notify("Administrador adicionado.");
      }
      closeModal("wa-admin-modal-backdrop");
      renderActivePage();
    } catch (err) {
      notify("Nao foi possivel salvar: " + (err.message || err));
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = idleLabel; }
    }
  }

  async function saveWhatsappConnection(e) {
    e.preventDefault();
    var form = e.target;
    var d = new FormData(form);
    var apikey = String(d.get("apikey") || "").trim();
    var submitBtn = $("#wa-connection-save");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>Salvando...'; }
    try {
      if (!window.DoaVidaSync || typeof DoaVidaSync.setConfig !== "function") throw new Error("Servico indisponivel.");
      await DoaVidaSync.setConfig("whatsapp_apikey", apikey);
      if (!state.data.waConfig) state.data.waConfig = {};
      state.data.waConfig.apikey = apikey;
      notify("Chave da API salva.");
    } catch (err) {
      notify("Nao foi possivel salvar: " + (err.message || err));
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i>Salvar chave da API'; }
    }
  }

  async function testarConexaoWhatsApp() {
    var cfg = state.data.waConfig || {};
    if (!cfg.apikey) { notify("Configure a chave da API do CallMeBot antes de testar."); return; }
    var admins = (state.data.whatsappAdmins || []).filter(function (a) {
      return (a.status || "ativo") === "ativo" && (a.telefone || a.whatsapp || a.phone);
    });
    if (!admins.length) { notify("Cadastre ao menos 1 administrador ativo com telefone para testar."); return; }
    if (!window.DoaVidaAPI || typeof DoaVidaAPI.enviarWhatsAppCallMeBot !== "function") { notify("Servico de envio indisponivel."); return; }
    notify("Enviando mensagem de teste para " + admins.length + " administrador(es)...");
    var msg = "Teste de conexao - Acao Social Semear. Se voce recebeu esta mensagem, as notificacoes de WhatsApp estao funcionando!";
    if (!state.data.whatsappLogs) state.data.whatsappLogs = [];
    var resultados = await Promise.all(admins.map(function (a) {
      var phone = a.telefone || a.whatsapp || a.phone;
      return DoaVidaAPI.enviarWhatsAppCallMeBot(phone, cfg.apikey, msg)
        .then(function () {
          var log = { tipo: "teste_conexao", destinatario: phone, status: "enviado", detalhes: msg, created_at: new Date().toISOString() };
          state.data.whatsappLogs.unshift(log);
          if (window.DoaVidaSync && typeof DoaVidaSync.addWhatsappLog === "function") DoaVidaSync.addWhatsappLog(log);
          return true;
        })
        .catch(function (err) {
          var log = { tipo: "teste_conexao", destinatario: phone, status: "erro", detalhes: err.message || String(err), created_at: new Date().toISOString() };
          state.data.whatsappLogs.unshift(log);
          if (window.DoaVidaSync && typeof DoaVidaSync.addWhatsappLog === "function") DoaVidaSync.addWhatsappLog(log);
          return false;
        });
    }));
    var ok = resultados.filter(Boolean).length;
    notify(ok + " de " + admins.length + " mensagem(ns) de teste enviada(s). Veja o historico abaixo.");
    renderActivePage();
  }

  function addGalleryMedia() {
    /* Abre seletor de arquivo; após seleção faz upload R2 → salva no Firebase */
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*";
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener("change", async function () {
      var file = input.files && input.files[0];
      input.remove();
      if (!file) return;

      var titulo = window.prompt("Titulo da midia:", file.name.replace(/\.[^.]+$/, "")) || file.name;
      var categoria = window.prompt("Categoria (ex: eventos, campanhas, voluntarios):", "eventos") || "eventos";

      notify("Enviando arquivo para o Cloud...");
      try {
        var url;
        /* Tenta R2 primeiro */
        if (window.DoaVidaR2 && DoaVidaR2.configurado()) {
          var res = await DoaVidaR2.upload(file, "galeria");
          url = res.url;
        } else if (window.DoaVidaSync && DoaVidaSync.uploadImagemGaleria) {
          /* Fallback: Cloudinary via firebase.js */
          url = await DoaVidaSync.uploadImagemGaleria(file, "galeria");
        } else {
          throw new Error("Nenhum servico de upload configurado. Configure R2 ou Cloudinary.");
        }

        if (!window.DoaVidaSync || typeof DoaVidaSync.addFotoGaleria !== "function") {
          throw new Error("Servico Firebase indisponivel.");
        }

        var tipo = file.type.startsWith("video/") ? "video" : "imagem";
        var payload = {
          url: url,
          titulo: titulo,
          legenda: titulo,
          alt: titulo,
          categoria: categoria,
          tipo: tipo,
          poster_url: tipo === "video" ? "" : url,
          ativo: true,
          storage_path: window.DoaVidaR2 && DoaVidaR2.configurado() ? "r2" : "cloudinary",
        };
        var saved = await DoaVidaSync.addFotoGaleria(payload);
        state.data.gallery.unshift(saved || payload);
        notify("Midia enviada e salva na galeria!");
        renderActivePage();
      } catch (e) {
        notify("Erro no upload: " + (e.message || e));
      }
    });

    input.click();
  }

  function toggleConfig(btn) {
    var on = !btn.classList.contains("on");
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    var hidden = btn.parentElement && btn.parentElement.querySelector("input[type='hidden']");
    if (hidden) hidden.value = on ? "true" : "false";
    state.data.settings[btn.dataset.configToggle] = on ? "true" : "false";
    if (!hidden && window.DoaVidaSync && typeof DoaVidaSync.setConfig === "function") {
      DoaVidaSync.setConfig(btn.dataset.configToggle, on ? "true" : "false")
        .then(function () { notify("Preferencia salva no Firebase."); })
        .catch(function () { notify("Nao foi possivel salvar a preferencia."); });
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    if (!window.DoaVidaSync || typeof DoaVidaSync.setConfig !== "function") {
      notify("Servico Firebase de configuracao indisponivel.");
      return;
    }
    var fd = new FormData(event.currentTarget);
    var tasks = [];
    fd.forEach(function (value, key) {
      if (/_text$/.test(key) || /^senha_/.test(key)) return;
      var clean = String(value == null ? "" : value);
      state.data.settings[key] = clean;
      tasks.push(DoaVidaSync.setConfig(key, clean));
    });
    Object.keys(state.data.settings).forEach(function (key) {
      if (/^whatsapp_notify_|^notify_/.test(key) && !fd.has(key)) {
        tasks.push(DoaVidaSync.setConfig(key, state.data.settings[key]));
      }
    });
    try {
      await Promise.all(tasks);
      if (Object.prototype.hasOwnProperty.call(state.data.settings, "doavida_video_acao")) {
        try { localStorage.setItem("doavida_video_acao", state.data.settings["doavida_video_acao"] || ""); } catch (e) {}
      }
      if (Object.prototype.hasOwnProperty.call(state.data.settings, "doavida_video_acao_poster")) {
        try { localStorage.setItem("doavida_video_acao_poster", state.data.settings["doavida_video_acao_poster"] || ""); } catch (e) {}
      }
      /* Aplica R2 imediatamente sem precisar recarregar a página */
      if (window.DoaVidaR2) {
        var r2Url = state.data.settings["r2_worker_url"] || "";
        var r2Token = state.data.settings["r2_upload_token"] || "";
        if (r2Url) DoaVidaR2.configure({ workerUrl: r2Url, token: r2Token });
      }
      notify("Configuracoes salvas no Firebase.");
    } catch (e) {
      notify("Nao foi possivel salvar configuracoes: " + (e.message || e));
    }
  }

  var SETTINGS_DEFAULTS = {
    instituicao_nome: "Acao Social Semear",
    instituicao_telefone: "(91) 98605-4141",
    instituicao_endereco: "Rua Quinze de Agosto, 1818",
    instituicao_cidade: "Belem",
    instituicao_estado: "Para",
    instituicao_email: "",
    cor_primaria: "#7c3aed",
    cor_secundaria: "#10b981",
    cor_destaque: "#22c55e",
    cor_alerta: "#f59e0b",
    resumo_horario: "",
    r2_worker_url: "",
    r2_upload_token: "",
    r2_public_url: "",
    dona_assuncao_backend_url: "",
  };

  function resetSettingsForm() {
    var form = $("#settings-form");
    if (!form) return;
    Object.keys(SETTINGS_DEFAULTS).forEach(function (key) {
      var el = form.querySelector("[name='" + key + "']");
      if (el) el.value = SETTINGS_DEFAULTS[key];
      var textEl = form.querySelector("[name='" + key + "_text']");
      if (textEl) textEl.value = SETTINGS_DEFAULTS[key];
    });
    notify("Valores padrao aplicados no formulario. Clique em \"Salvar alteracoes\" para confirmar.");
  }

  async function changeAdminPassword() {
    var card = $("#password-change-card");
    if (!card) return;
    var atualEl = card.querySelector("[name='senha_atual']");
    var novaEl = card.querySelector("[name='senha_nova']");
    var confirmaEl = card.querySelector("[name='senha_confirma']");
    var atual = atualEl ? atualEl.value : "";
    var nova = novaEl ? novaEl.value : "";
    var confirma = confirmaEl ? confirmaEl.value : "";
    if (!atual || !nova || !confirma) { notify("Preencha todos os campos de senha."); return; }
    if (nova.length < 6) { notify("A nova senha deve ter pelo menos 6 caracteres."); return; }
    if (nova !== confirma) { notify("A confirmacao nao corresponde a nova senha."); return; }
    var btn = $("#password-change-submit");
    var idleLabel = '<i class="fa-regular fa-floppy-disk"></i>Atualizar senha';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>Verificando...'; }
    try {
      if (!window.DoaVidaSync || typeof DoaVidaSync.verificarSenha !== "function" || typeof DoaVidaSync.setSenha !== "function") {
        throw new Error("Servico indisponivel.");
      }
      var correta = await DoaVidaSync.verificarSenha(atual);
      if (!correta) throw new Error("Senha atual incorreta.");
      await DoaVidaSync.setSenha(nova);
      notify("Senha atualizada com sucesso.");
      if (atualEl) atualEl.value = "";
      if (novaEl) novaEl.value = "";
      if (confirmaEl) confirmaEl.value = "";
    } catch (e) {
      notify("Nao foi possivel atualizar a senha: " + (e.message || e));
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = idleLabel; }
    }
  }

  async function fazerBackupCompleto() {
    var btn = $("#settings-backup");
    var idleLabel = '<i class="fa-solid fa-database"></i>Fazer backup agora';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>Gerando backup...'; }
    try {
      var agora = new Date().toISOString();
      var payload = { exportadoEm: agora, fonte: "Acao Social Semear — backup completo", dados: state.data };
      downloadJSON("semear-backup-completo-" + agora.slice(0, 10) + ".json", payload);
      if (window.DoaVidaSync && typeof DoaVidaSync.setConfig === "function") {
        await DoaVidaSync.setConfig("backup_ultimo", agora);
      }
      state.data.settings.backup_ultimo = agora;
      notify("Backup gerado e baixado com sucesso.");
      renderActivePage();
    } catch (e) {
      notify("Nao foi possivel gerar o backup: " + (e.message || e));
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = idleLabel; }
    }
  }

  function refreshTaskResponsavelOptions() {
    var select = $("#task-form-responsavel");
    if (!select) return;
    var atual = select.value;
    var nomes = unique((state.data.volunteers || []).map(function (v) { return v.nome || v.name; })).filter(Boolean);
    select.innerHTML = '<option value="Equipe Semear">Equipe Semear</option>' +
      nomes.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; }).join("");
    if (atual && (nomes.indexOf(atual) >= 0 || atual === "Equipe Semear")) select.value = atual;
  }

  function createTask(defaultStatus) {
    var form = document.getElementById("task-quick-form");
    if (form) {
      form.reset();
      delete form.dataset.editId;
      var statusInput = form.querySelector("[name='status']");
      if (statusInput) statusInput.value = defaultStatus || "a-fazer";
      var dataInput = form.querySelector("[name='data']");
      if (dataInput && !dataInput.value) {
        dataInput.value = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      }
    }
    var titleText = $("#task-modal-title-text");
    if (titleText) titleText.textContent = "Nova tarefa";
    var icon = $("#task-modal-icon");
    if (icon) icon.className = "fa-solid fa-circle-plus";
    var submitBtn = $("#task-form-submit");
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i>Adicionar tarefa';
    var deleteBtn = $("#task-form-delete");
    if (deleteBtn) deleteBtn.style.display = "none";
    refreshTaskResponsavelOptions();
    openModal("task-modal-backdrop");
  }

  function editTask(id) {
    var t = state.data.tasks.find(function (x) { return x.id === id; });
    if (!t) { notify("Tarefa nao encontrada."); return; }
    refreshTaskResponsavelOptions();
    openModal("task-modal-backdrop");
    setTimeout(function () {
      var form = $("#task-quick-form");
      var fields = {
        titulo:      String(t.titulo || t.title || ""),
        descricao:   String(t.descricao || t.description || ""),
        responsavel: String(t.responsavel || "Equipe Semear"),
        tipo:        String(t.tipo || "organizacao"),
        status:      String(t.status || "a-fazer"),
        prioridade:  String(t.prioridade || "media"),
        data:        String(t.data || t.dueDate || ""),
      };
      Object.keys(fields).forEach(function (key) {
        var el = form && form.querySelector("[name='" + key + "']");
        if (el) el.value = fields[key];
      });
      if (form) form.dataset.editId = id;
      var titleText = $("#task-modal-title-text");
      if (titleText) titleText.textContent = "Editar tarefa";
      var icon = $("#task-modal-icon");
      if (icon) icon.className = "fa-regular fa-pen-to-square";
      var submitBtn = $("#task-form-submit");
      if (submitBtn) submitBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i>Atualizar tarefa';
      var deleteBtn = $("#task-form-delete");
      if (deleteBtn) { deleteBtn.style.display = ""; deleteBtn.onclick = function () { deleteTaskRow(id); }; }
    }, 50);
  }

  async function deleteTaskRow(id) {
    if (!id) return;
    if (!window.confirm("Excluir esta tarefa permanentemente?")) return;
    try {
      if (window.DoaVidaSync && typeof DoaVidaSync.deleteTarefa === "function") await DoaVidaSync.deleteTarefa(id);
      state.data.tasks = state.data.tasks.filter(function (t) { return t.id !== id; });
      notify("Tarefa removida.");
      closeModal("task-modal-backdrop");
      renderActivePage();
    } catch (e) {
      notify("Nao foi possivel remover: " + (e.message || e));
    }
  }

  async function saveTask(e) {
    e.preventDefault();
    var form = e.target;
    var editId = form.dataset.editId || "";
    var d = new FormData(form);
    var payload = {
      titulo: d.get("titulo") || "",
      descricao: d.get("descricao") || "",
      status: d.get("status") || "a-fazer",
      tipo: d.get("tipo") || "organizacao",
      responsavel: d.get("responsavel") || "Equipe Semear",
      prioridade: d.get("prioridade") || "media",
      data: d.get("data") || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    };
    var submitBtn = $("#task-form-submit");
    var idleLabel = editId
      ? '<i class="fa-regular fa-floppy-disk"></i>Atualizar tarefa'
      : '<i class="fa-regular fa-floppy-disk"></i>Adicionar tarefa';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>Salvando...'; }

    if (editId) {
      try {
        if (!window.DoaVidaSync || typeof DoaVidaSync.updateTarefa !== "function") throw new Error("Servico indisponivel.");
        var updated = await DoaVidaSync.updateTarefa(editId, payload);
        state.data.tasks = state.data.tasks.map(function (t) { return t.id === editId ? Object.assign({}, t, updated || payload, { id: editId }) : t; });
        delete form.dataset.editId;
        notify("Tarefa atualizada.");
        closeModal("task-modal-backdrop");
        renderActivePage();
      } catch (err) {
        notify("Nao foi possivel atualizar: " + (err.message || err));
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = idleLabel; }
      }
      return;
    }

    var task = Object.assign({ id: "tar-" + Date.now() }, payload);
    state.data.tasks.unshift(task);
    try {
      if (window.DoaVidaSync && DoaVidaSync.addTarefa) {
        var savedTask = await DoaVidaSync.addTarefa(payload);
        if (savedTask && savedTask.id) {
          task.id = savedTask.id;
          Object.assign(task, savedTask);
        }
      }
    } catch (err) { notify("Aviso: " + (err.message || "erro ao salvar no Firebase.")); }
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = idleLabel; }
    notify("Tarefa adicionada.");
    closeModal("task-modal-backdrop");
    renderActivePage();
  }

  function openFoodModal() {
    var backdrop = $("#food-modal-backdrop");
    if (!backdrop) return;
    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var dialog = backdrop.querySelector(".admin-modal");
    if (dialog) dialog.setAttribute("aria-label", "Cadastrar alimento");
    var titleText = $("#food-modal-title-text");
    if (titleText) titleText.textContent = "Cadastro rápido";
    var icon = $("#food-modal-icon");
    if (icon) icon.className = "fa-solid fa-circle-plus";
    var submitBtn = $("#food-quick-form [type='submit']");
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i>Salvar alimento';
    var form = $("#food-quick-form");
    if (form) delete form.dataset.editId;
    refreshFoodCategoryOptions();
    setTimeout(function () {
      var first = $("#food-quick-form input[name='nome']");
      if (first) first.focus();
    }, 80);
  }

  function closeFoodModal() {
    var backdrop = $("#food-modal-backdrop");
    if (!backdrop) return;
    backdrop.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    var form = $("#food-quick-form");
    if (form) { form.reset(); delete form.dataset.editId; }
    updateFoodImgPreview("");
  }

  function updateVolCardPreview(key, url) {
    var wrap = $("#vol-card-preview-" + key);
    if (!wrap) return;
    var img = wrap.querySelector("img");
    if (img) img.src = url || "";
  }

  function updateVideoAcaoPreview() {
    var preview = $("#video-acao-preview");
    if (!preview) return;
    var videoInput = $("#video-acao-url");
    var posterInput = $("#video-acao-poster-url");
    var url = videoInput ? videoInput.value.trim() : "";
    var poster = posterInput ? posterInput.value.trim() : "";
    if (!url) {
      preview.innerHTML = '<i class="fa-solid fa-film"></i><span>Previa do video</span>';
      return;
    }
    var ytId = videoAcaoYoutubeId(url);
    if (ytId) {
      preview.innerHTML = '<iframe src="https://www.youtube.com/embed/' + esc(ytId) + '?rel=0&modestbranding=1" title="Previa do video" allowfullscreen></iframe>';
      return;
    }
    if (videoAcaoIsFile(url)) {
      preview.innerHTML = '<video src="' + esc(url) + '"' + (poster ? ' poster="' + esc(poster) + '"' : '') + ' controls playsinline preload="metadata"></video>';
      return;
    }
    preview.innerHTML = '<div class="admin-video-preview-fallback"><i class="fa-solid fa-link"></i><span>Link salvo. Use YouTube ou arquivo .mp4/.webm para previa no painel.</span></div>';
  }

  async function uploadVideoAcaoFile(input, kind) {
    var file = input.files && input.files[0];
    if (!file) return;
    var expected = kind === "poster" ? "image/" : "video/";
    if (!file.type || file.type.indexOf(expected) !== 0) {
      notify(kind === "poster" ? "Selecione uma imagem para a capa." : "Selecione um arquivo de video.");
      input.value = "";
      return;
    }
    notify(kind === "poster" ? "Enviando capa..." : "Enviando video...");
    try {
      var url;
      if (window.DoaVidaR2 && DoaVidaR2.configurado()) {
        url = (await DoaVidaR2.upload(file, kind === "poster" ? "banners" : "media")).url;
      } else if (window.DoaVidaSync && DoaVidaSync.uploadImagemGaleria) {
        url = await DoaVidaSync.uploadImagemGaleria(file, kind === "poster" ? "banners" : "galeria");
      } else {
        throw new Error("Nenhum servico de upload configurado.");
      }
      var target = kind === "poster" ? $("#video-acao-poster-url") : $("#video-acao-url");
      if (target) target.value = url;
      updateVideoAcaoPreview();
      var videoUrlInput = $("#video-acao-url");
      if (videoUrlInput && videoUrlInput.value.trim()) {
        await saveVideoAcaoSettings();
      } else {
        notify(kind === "poster" ? "Capa enviada. Informe o video e salve." : "Video enviado. Clique em Salvar video.");
      }
    } catch (e) {
      notify("Erro no upload: " + (e.message || e));
    } finally {
      input.value = "";
    }
  }

  async function saveVideoAcaoSettings() {
    var videoInput = $("#video-acao-url");
    var posterInput = $("#video-acao-poster-url");
    var videoUrl = videoInput ? videoInput.value.trim() : "";
    var posterUrl = posterInput ? posterInput.value.trim() : "";
    if (!videoUrl) {
      notify("Informe a URL do video ou envie um arquivo.");
      if (videoInput) videoInput.focus();
      return;
    }
    if (!window.DoaVidaSync || typeof DoaVidaSync.setConfig !== "function") {
      notify("Firebase indisponivel para salvar o video.");
      return;
    }
    try {
      await Promise.all([
        DoaVidaSync.setConfig("doavida_video_acao", videoUrl),
        DoaVidaSync.setConfig("doavida_video_acao_poster", posterUrl),
      ]);
      try {
        localStorage.setItem("doavida_video_acao", videoUrl);
        localStorage.setItem("doavida_video_acao_poster", posterUrl);
      } catch (e) {}
      if (!state.data.settings) state.data.settings = {};
      state.data.settings.doavida_video_acao = videoUrl;
      state.data.settings.doavida_video_acao_poster = posterUrl;
      notify("Video da pagina inicial salvo.");
      updateVideoAcaoPreview();
    } catch (e) {
      notify("Erro ao salvar video: " + (e.message || e));
    }
  }

  async function saveVolunteerCards() {
    if (!window.DoaVidaSync) { notify("Firebase indisponivel."); return; }
    var volCfg = {};
    VOL_CARD_DEFAULTS.forEach(function (c) {
      var input = $("#vol-card-url-" + c.key);
      if (input) volCfg[c.key] = input.value.trim();
    });
    try {
      var json = JSON.stringify(volCfg);
      await DoaVidaSync.setConfig("doavida_vol_contrib", json);
      try { localStorage.setItem("doavida_vol_contrib", json); } catch (e) {}
      if (state.data && state.data.settings) state.data.settings["doavida_vol_contrib"] = json;
      notify("Imagens dos cards salvas com sucesso!");
    } catch (e) {
      notify("Erro ao salvar: " + (e.message || e));
    }
  }

  function updateFoodImgPreview(url) {
    var preview = $("#food-img-preview");
    if (!preview) return;
    if (url && url.startsWith("http")) {
      preview.innerHTML = '<img src="' + esc(url) + '" alt="Prévia da imagem" style="width:100%;height:100%;object-fit:cover;border-radius:12px">' +
        '<button type="button" class="admin-food-preview-remove" id="food-img-preview-remove" aria-label="Remover imagem"><i class="fa-solid fa-xmark"></i></button>';
      var removeBtn = $("#food-img-preview-remove");
      if (removeBtn) removeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        var imgInput = $("#food-form-img");
        if (imgInput) imgInput.value = "";
        var fileInput = $("#food-form-file");
        if (fileInput) fileInput.value = "";
        updateFoodImgPreview("");
      });
    } else {
      preview.innerHTML = '<i class="fa-solid fa-image"></i><span>Prévia da imagem</span>';
    }
  }

  function updateCestaImgPreview(url) {
    var preview = $("#cesta-img-preview");
    if (!preview) return;
    if (url) {
      preview.innerHTML = '<img src="' + esc(url) + '" alt="Prévia da cesta" style="width:100%;height:100%;object-fit:cover;border-radius:12px">';
    } else {
      preview.innerHTML = '<i class="fa-solid fa-image"></i><span>Prévia da imagem</span>';
    }
  }

  function openCestaImgModal() {
    var urlAtual = cestaImgUrl();
    var urlInput = $("#cesta-img-url-input");
    if (urlInput) urlInput.value = urlAtual;
    updateCestaImgPreview(urlAtual);
    openModal("cesta-img-modal-backdrop");
  }

  function closeCestaImgModal() {
    closeModal("cesta-img-modal-backdrop");
  }

  async function salvarImgCesta() {
    var urlInput = $("#cesta-img-url-input");
    var url = urlInput ? urlInput.value.trim() : "";
    if (!url) {
      notify("Informe uma URL ou envie uma imagem.");
      return;
    }
    localStorage.setItem("doavida_cesta_img", url);
    if (!state.data.settings) state.data.settings = {};
    state.data.settings.doavida_cesta_img = url;
    if (window.DoaVidaSync && typeof DoaVidaSync.setConfig === "function") {
      try { await DoaVidaSync.setConfig("doavida_cesta_img", url); } catch (e) { /* mantém o valor local mesmo se a sincronização remota falhar */ }
    }
    closeCestaImgModal();
    renderActivePage();
    notify("Imagem da cesta atualizada!");
  }

  function uniqueFoodCategories() {
    var set = {};
    (state.data.foods || []).forEach(function (f) {
      var c = String(f.categoria || f.category || "").trim();
      if (c) set[c] = true;
    });
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
  }

  function refreshFoodCategoryOptions() {
    var list = $("#food-categories-list");
    if (!list) return;
    list.innerHTML = uniqueFoodCategories().map(function (c) { return '<option value="' + esc(c) + '"></option>'; }).join("");
  }

  function editFood(id) {
    var f = state.data.foods.find(function (x) { return x.id === id; });
    if (!f) { notify("Alimento nao encontrado."); return; }
    /* Abre o modal primeiro */
    openFoodModal();
    /* Aguarda o modal abrir para preencher os campos.
       Usa os valores brutos do registro (sem os fallbacks de exibição de foodCategory/foodUnit/foodName),
       senão rótulos como "Sem categoria" acabam sendo salvos como dado real ao editar. */
    setTimeout(function () {
      var fields = {
        nome:        String(f.name || f.nome || f.alimento || ""),
        categoria:   String(f.categoria || f.category || ""),
        unidade:     String(f.unidade || f.unit || ""),
        qtdPorCesta: String(foodBasketQty(f) || ""),
        kg:          String(foodQty(f)),
        minimo:      String(foodMin(f)),
        meta:        String(foodGoal(f) || ""),
        imagem:      f.imagem || f.image || f.img || f.foto || "",
      };
      Object.keys(fields).forEach(function (key) {
        var el = $("#food-quick-form [name='" + key + "']");
        if (el) el.value = fields[key];
      });
      updateFoodImgPreview(fields.imagem || foodDefaultImg(f));
      var form = $("#food-quick-form");
      if (form) form.dataset.editId = id;
      var titleText = $("#food-modal-title-text");
      if (titleText) titleText.textContent = "Editar alimento";
      var icon = $("#food-modal-icon");
      if (icon) icon.className = "fa-regular fa-pen-to-square";
      var dialog = $("#food-modal-backdrop").querySelector(".admin-modal");
      if (dialog) dialog.setAttribute("aria-label", "Editar alimento");
      var submitBtn = form && form.querySelector("[type='submit']");
      if (submitBtn) submitBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i>Atualizar alimento';
    }, 50);
  }

  async function seedDefaultFoods() {
    if (!window.DoaVidaAPI || !DoaVidaAPI.ALIMENTOS_PADRAO) {
      notify("api.js nao carregado — dados padrao indisponiveis.");
      return;
    }
    if (!window.DoaVidaSync || typeof DoaVidaSync.addAlimento !== "function") {
      notify("Firebase nao disponivel.");
      return;
    }
    var padrao = DoaVidaAPI.ALIMENTOS_PADRAO;
    var existentes = state.data.foods.map(function (f) { return slug(foodName(f)); });
    var faltando = padrao.filter(function (p) {
      return existentes.indexOf(slug(p.name || p.nome || "")) < 0;
    });
    if (!faltando.length) {
      notify("Todos os alimentos padrao ja estao cadastrados no Firebase.");
      return;
    }
    notify("Cadastrando " + faltando.length + " alimentos padrao...");
    var salvos = 0;
    for (var i = 0; i < faltando.length; i++) {
      try {
        var p = faltando[i];
        var payload = {
          name:        p.name || p.nome,
          nome:        p.name || p.nome,
          categoria:   p.categoria || "Cesta básica",
          unidade:     p.unidade || "kg",
          qtdPorCesta: p.qtdPorCesta || String(p.peso || ""),
          kg:          p.kg || 0,
          minimo:      p.minimo || 0,
          meta:        p.goal || p.meta || 0,
          imagem:      p.img || p.imagem || "",
          img:         p.img || p.imagem || "",
          peso:        p.peso || 0,
          ativo:       true,
          emoji:       p.emoji || "",
        };
        var saved = await DoaVidaSync.addAlimento(payload);
        state.data.foods.unshift(saved || payload);
        salvos++;
      } catch (e) {}
    }
    notify(salvos + " alimento(s) cadastrado(s) com imagens no Firebase!");
    renderActivePage();
  }

  function updateGalleryEditPreview(url) {
    var preview = $("#gallery-edit-preview");
    if (!preview) return;
    if (url && url.trim()) {
      preview.innerHTML = '<img src="' + esc(url) + '" alt="Preview" style="width:100%;height:100%;object-fit:cover;border-radius:10px" onerror="this.parentElement.innerHTML=\'<i class=\\\"fa-solid fa-image\\\"></i><span>Imagem não encontrada</span>\'">';
    } else {
      preview.innerHTML = '<i class="fa-solid fa-image"></i><span>Prévia</span>';
    }
  }

  function openGalleryEdit(id) {
    var g = (state.data.gallery || []).find(function (x) { return x.id === id; });
    if (!g) { notify("Mídia não encontrada."); return; }
    var backdrop = $("#gallery-edit-backdrop");
    if (!backdrop) return;
    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    /* Preenche o formulário */
    setTimeout(function () {
      var form = $("#gallery-edit-form");
      if (!form) return;
      var set = function (name, val) {
        var el = form.querySelector("[name='" + name + "']");
        if (el) el.value = val || "";
      };
      set("id",          g.id);
      set("titulo",      g.titulo || g.legenda || "");
      set("legenda",     g.legenda || g.titulo || "");
      set("alt",         g.alt || "");
      set("categoria",   g.categoria || "geral");
      set("visibilidade", g.visibilidade || "publica");
      set("url",         galleryUrl(g));
      updateGalleryEditPreview(galleryUrl(g));
      var first = form.querySelector("[name='titulo']");
      if (first) first.focus();
    }, 50);
  }

  function closeGalleryEdit() {
    var backdrop = $("#gallery-edit-backdrop");
    if (!backdrop) return;
    backdrop.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  async function saveGalleryEdit(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var fd = new FormData(form);
    var id = String(fd.get("id") || "").trim();
    if (!id) { notify("ID da mídia não encontrado."); return; }
    if (!window.DoaVidaSync || typeof DoaVidaSync.updateFotoGaleria !== "function") {
      notify("Firebase indisponivel."); return;
    }
    var dados = {
      titulo:      String(fd.get("titulo")      || "").trim(),
      legenda:     String(fd.get("legenda")     || "").trim(),
      alt:         String(fd.get("alt")         || "").trim(),
      categoria:   String(fd.get("categoria")   || "geral").trim(),
      visibilidade: String(fd.get("visibilidade") || "publica").trim(),
      url:         String(fd.get("url")         || "").trim(),
    };
    /* Mantém url original se o campo ficou vazio */
    if (!dados.url) {
      var original = (state.data.gallery || []).find(function (g) { return g.id === id; });
      if (original) dados.url = galleryUrl(original);
    }
    try {
      await DoaVidaSync.updateFotoGaleria(id, dados);
      state.data.gallery = state.data.gallery.map(function (g) {
        return g.id === id ? Object.assign({}, g, dados) : g;
      });
      closeGalleryEdit();
      notify("Mídia atualizada!");
      renderActivePage();
    } catch (e) {
      notify("Erro ao salvar: " + (e.message || e));
    }
  }

  async function importSiteImages() {
    if (!window.DoaVidaSync || typeof DoaVidaSync.addFotoGaleria !== "function") {
      notify("Firebase indisponivel.");
      return;
    }
    var existingUrls = (state.data.gallery || []).map(function (g) { return galleryUrl(g); });
    var faltando = SITE_IMAGES.filter(function (img) {
      return existingUrls.indexOf(img.url) < 0;
    });
    if (!faltando.length) {
      notify("Todas as imagens do site ja estao na galeria.");
      return;
    }
    notify("Importando " + faltando.length + " imagens do site...");
    var salvos = 0;
    for (var i = 0; i < faltando.length; i++) {
      try {
        var img = faltando[i];
        var payload = {
          url:         img.url,
          titulo:      img.titulo,
          legenda:     img.titulo,
          alt:         img.alt,
          categoria:   img.categoria,
          tipo:        "imagem",
          ativo:       true,
          storage_path: "local",
          visibilidade: img.visibilidade || "publica",
        };
        var saved = await DoaVidaSync.addFotoGaleria(payload);
        state.data.gallery.push(saved || payload);
        salvos++;
      } catch (e) {}
    }
    notify(salvos + " imagem(ns) importada(s) para a galeria!");
    renderActivePage();
  }

  async function deleteGalleryItem(id) {
    if (!id) return;
    if (!window.confirm("Remover esta midia da galeria?")) return;
    try {
      if (!window.DoaVidaSync || typeof DoaVidaSync.deleteFotoGaleria !== "function") throw new Error("Servico indisponivel.");
      await DoaVidaSync.deleteFotoGaleria(id);
      state.data.gallery = state.data.gallery.filter(function (g) { return g.id !== id; });
      notify("Midia removida da galeria.");
      renderActivePage();
    } catch (e) {
      notify("Nao foi possivel remover: " + (e.message || e));
    }
  }

  async function testR2Connection() {
    var urlInput = document.querySelector("input[name='r2_worker_url']");
    var tokenInput = document.querySelector("input[name='r2_upload_token']");
    var url = urlInput ? urlInput.value.trim() : "";
    var token = tokenInput ? tokenInput.value.trim() : "";
    if (!url) { notify("Digite o Worker URL antes de testar."); return; }
    notify("Testando conexao com R2...");
    try {
      var headers = {};
      if (token) headers["X-Upload-Token"] = token;
      var resp = await fetch(url + "/", { method: "GET", headers: headers });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      var data = await resp.json();
      if (data.ok) {
        notify("R2 conectado com sucesso! Worker: " + (data.service || url));
        if (window.DoaVidaR2) DoaVidaR2.configure({ workerUrl: url, token: token });
      } else {
        throw new Error(data.error || "Resposta inesperada do Worker.");
      }
    } catch (e) {
      notify("Falha na conexao R2: " + e.message);
    }
  }

  async function testDonaBackendConnection() {
    var urlInput = document.querySelector("input[name='dona_assuncao_backend_url']");
    var url = urlInput ? urlInput.value.trim().replace(/\/+$/, "") : "";
    if (!url) { notify("Digite a URL do backend antes de testar."); return; }
    notify("Testando conexao com o backend da Dona Assuncao...");
    try {
      var controller = new AbortController();
      var timeoutId = setTimeout(function () { controller.abort(); }, 8000);
      var resp = await fetch(url + "/health", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      var data = await resp.json();
      notify("Backend conectado: " + (data.assistente || "ok"));
    } catch (e) {
      notify("Falha ao conectar no backend: " + (e.message || e));
    }
  }

  function exportReport() {
    var payload = {
      pagina: state.activePage,
      exportadoEm: new Date().toISOString(),
      dados: state.data,
    };
    downloadJSON("semear-admin-" + state.activePage + "-" + new Date().toISOString().slice(0, 10) + ".json", payload);
    notify("Relatorio exportado.");
  }

  function downloadJSON(filename, data) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function goToSite() {
    try {
      if (window.DoaVidaSync && DoaVidaSync.logout) {
        DoaVidaSync.logout().finally(function () { window.location.href = "index.html"; });
        return;
      }
    } catch (e) {}
    window.location.href = "index.html";
  }

  function animateKpiValues() {
    var DURATION = 900;
    $all(".admin-kpi-value[data-count-to]").forEach(function (el) {
      var target = parseFloat(el.dataset.countTo) || 0;
      var suffix = el.dataset.countSuffix || "";
      /* Ignora valores percentuais (realTrend) — perderiam o sinal + */
      if (!target || suffix.indexOf("%") >= 0) return;
      var unitEl = el.querySelector(".admin-kpi-unit");
      var unitHtml = unitEl ? unitEl.outerHTML : "";
      var isDecimal = (target !== Math.floor(target));
      var startTime = null;

      el.innerHTML = "0" + suffix + unitHtml;

      (function tick(now) {
        if (!startTime) startTime = now;
        var t = Math.min((now - startTime) / DURATION, 1);
        var ease = 1 - Math.pow(1 - t, 3);
        var current = target * ease;
        var fmt = isDecimal
          ? current.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : Math.round(current).toLocaleString("pt-BR");
        el.innerHTML = fmt + suffix + unitHtml;
        if (t < 1) requestAnimationFrame(tick);
      })(performance.now());
    });
  }

  /* Instância do mapa Leaflet — destruída e recriada ao trocar de aba */
  var _familyMap     = null;
  var _familyMarkers = [];

  /* Coordenadas aproximadas dos bairros de Belém, PA (lat, lng) */
  var BELEM_COORDS = {
    "guama":              [-1.4731, -48.5002],
    "jurunas":            [-1.4591, -48.5021],
    "sacramenta":         [-1.4103, -48.4568],
    "pedreira":           [-1.4558, -48.4688],
    "bengui":             [-1.3881, -48.4291],
    "marambaia":          [-1.4200, -48.4550],
    "terra-firme":        [-1.4500, -48.4900],
    "cremacao":           [-1.4680, -48.4790],
    "condor":             [-1.4400, -48.5021],
    "batista-campos":     [-1.4427, -48.4776],
    "umarizal":           [-1.4476, -48.4698],
    "marco":              [-1.4027, -48.4503],
    "nazare":             [-1.4523, -48.4973],
    "cidade-velha":       [-1.4620, -48.5050],
    "reduto":             [-1.4554, -48.4959],
    "fatima":             [-1.4211, -48.4690],
    "telegrafo":          [-1.3973, -48.4473],
    "souza":              [-1.4177, -48.4903],
    "barreiro":           [-1.3909, -48.4603],
    "icoaraci":           [-1.3009, -48.4780],
    "val-de-cans":        [-1.3781, -48.4502],
    "entroncamento":      [-1.4200, -48.4980],
    "canudos":            [-1.4580, -48.5010],
    "comercio":           [-1.4580, -48.5021],
    "maguari":            [-1.3681, -48.4302],
    "aguas-lindas":       [-1.3609, -48.4402],
    "tapana":             [-1.3831, -48.3880],
    "coqueiro":           [-1.3800, -48.4580],
    "cabanagem":          [-1.3700, -48.4900],
    "parque-verde":       [-1.3600, -48.4200],
    "pratinha":           [-1.3350, -48.4480],
    "outeiro":            [-1.2350, -48.5100],
    "mosqueiro":          [-1.1280, -48.4060],
    "marex":              [-1.3900, -48.4700],
    "sao-braz":           [-1.4050, -48.4650],
    "castanheira":        [-1.3850, -48.4650],
    "porto-dalem":        [-1.4700, -48.4850],
    "panorama":           [-1.4000, -48.4400],
    "parque-guajara":     [-1.4350, -48.4350],
    /* Aliases comuns de digitação */
    "sao-bras":           [-1.4050, -48.4650],
    "sao-braz":           [-1.4050, -48.4650],
    "nazare":             [-1.4523, -48.4973],
    "nazaret":            [-1.4523, -48.4973],
    "pedreira":           [-1.4558, -48.4688],
    "telegrapho":         [-1.3973, -48.4473],
    "cremacao":           [-1.4680, -48.4790],
    "cremação":           [-1.4680, -48.4790],
    "icoaraci":           [-1.3009, -48.4780],
    "icoraci":            [-1.3009, -48.4780],
    "icuaraci":           [-1.3009, -48.4780],
    "bengui":             [-1.3881, -48.4291],
    "benguí":             [-1.3881, -48.4291],
    "centro":             [-1.4560, -48.5020],
    "comercio":           [-1.4580, -48.5021],
    "comércio":           [-1.4580, -48.5021],
    "jurunas":            [-1.4591, -48.5021],
    "miramar":            [-1.4050, -48.4720],
    "fátima":             [-1.4211, -48.4690],
    "telegrafo":          [-1.3973, -48.4473],
    "telégrafo":          [-1.3973, -48.4473],
    "sacramenta":         [-1.4103, -48.4568],
    "sacramento":         [-1.4103, -48.4568],
    "parque-verde":       [-1.3600, -48.4200],
    "parque verde":       [-1.3600, -48.4200],
    "terra firme":        [-1.4500, -48.4900],
    "val de cans":        [-1.3781, -48.4502],
    "aguas lindas":       [-1.3609, -48.4402],
    "porto dalem":        [-1.4700, -48.4850],
    "parque guajara":     [-1.4350, -48.4350],
    "castanheira":        [-1.3850, -48.4650],
  };

  function initFamilyMap() {
    if (!window.L) return;
    /* Painel fica escondido no mobile (CSS) — evita baixar os tiles do mapa à toa */
    if (window.innerWidth <= 760) return;
    var container = document.getElementById("admin-family-map");
    if (!container) return;

    /* Destrói instância anterior para evitar conflito de re-renderização */
    if (_familyMap) { _familyMap.remove(); _familyMap = null; }
    _familyMarkers = [];

    var map = L.map(container, {
      center: [-1.455, -48.490],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });
    _familyMap = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    var PRIORITY = {
      "urgente": { color: "#dc2626", label: "Urgente", emoji: "🔴" },
      "alta":    { color: "#f97316", label: "Alta",    emoji: "🟠" },
      "media":   { color: "#eab308", label: "Média",   emoji: "🟡" },
      "baixa":   { color: "#22c55e", label: "Baixa",   emoji: "🟢" },
    };

    /* Agrupa por bairro para calcular o spread dos marcadores */
    var byBairro = {};
    var families = state.data.families || [];
    families.forEach(function (f) {
      var key = slug(f.bairro || "");
      if (!byBairro[key]) byBairro[key] = [];
      byBairro[key].push(f);
    });

    var bounds  = [];
    var notFound = 0;

    families.forEach(function (f) {
      var key    = slug(f.bairro || "");
      var coords = BELEM_COORDS[key];

      /* Tenta variações sem hífen, sem espaços */
      if (!coords) {
        var alt = key.replace(/-/g, "");
        Object.keys(BELEM_COORDS).forEach(function (k) {
          if (!coords && k.replace(/-/g, "") === alt) coords = BELEM_COORDS[k];
        });
      }

      if (!coords) { notFound++; return; }

      var group = byBairro[key] || [];
      var idx   = group.indexOf(f);
      var total = group.length;

      /* Espalhamento determinístico dentro do bairro — evita sobreposição */
      var lat = coords[0], lng = coords[1];
      if (total > 1) {
        var angle  = (idx / total) * 2 * Math.PI;
        var spread = Math.min(0.0045, 0.0008 * Math.sqrt(total + 1));
        lat += Math.cos(angle) * spread;
        lng += Math.sin(angle) * spread * 1.6;
      }

      var pr  = slug(f.prioridade || "media");
      var cfg = PRIORITY[pr] || PRIORITY["media"];

      var marker = L.circleMarker([lat, lng], {
        radius:      9,
        fillColor:   cfg.color,
        color:       "#fff",
        weight:      2,
        opacity:     1,
        fillOpacity: 0.92,
      }).addTo(map);

      bounds.push([lat, lng]);

      /* Popup completo com WhatsApp */
      var nome    = esc(f.responsavel || f.nome || "Família");
      var bairro  = esc(f.bairro || "—");
      var pessoas = f.pessoas ? f.pessoas + " pessoa(s)" : "";
      var tel     = (f.telefone || "").replace(/\D/g, "");
      var waHref  = tel ? "whatsapp://send?phone=55" + tel : "";
      var waBtn   = waHref
        ? '<a href="' + waHref + '" target="_blank" rel="noopener" class="admin-map-wa-btn">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.124 1.526 5.857L.057 23.5l5.804-1.522A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.647-.51-5.162-1.4l-.37-.22-3.443.903.919-3.354-.242-.386A9.94 9.94 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>' +
          ' WhatsApp</a>'
        : (tel ? '<span class="admin-map-tel">' + esc(f.telefone) + '</span>' : "");

      var endHtml  = f.endereco
        ? '<div class="admin-map-addr"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg> ' + esc(f.endereco) + '</div>'
        : "";
      var statHtml = f.status
        ? '<div class="admin-map-stat">' + esc(f.status.replace(/-/g, " ")) + '</div>'
        : "";
      var necHtml  = f.necessidade
        ? '<div class="admin-map-nec">' + esc(f.necessidade) + '</div>'
        : "";

      marker.bindPopup(
        '<div class="admin-map-popup">' +
          '<div class="admin-map-popup-header">' +
            '<strong>' + cfg.emoji + ' ' + nome + '</strong>' +
            '<span class="admin-map-popup-bairro">' + bairro + (pessoas ? ' · ' + pessoas : '') + '</span>' +
          '</div>' +
          endHtml + statHtml + necHtml +
          '<div class="admin-map-popup-footer">' + waBtn + '</div>' +
        '</div>',
        { maxWidth: 270, className: "admin-map-popup-wrap", autoPan: true }
      );

      marker._familyData = f;
      marker._latLng     = [lat, lng];
      _familyMarkers.push(marker);
    });

    /* Legenda de prioridades */
    var legend = L.control({ position: "bottomright" });
    legend.onAdd = function () {
      var div = L.DomUtil.create("div", "admin-map-legend");
      div.innerHTML =
        '<div class="admin-map-legend-title">Prioridade</div>' +
        Object.keys(PRIORITY).map(function (k) {
          var c = PRIORITY[k];
          return '<div class="admin-map-legend-item">' +
            '<span class="admin-map-legend-dot" style="background:' + c.color + '"></span>' +
            c.label + '</div>';
        }).join("") +
        (notFound > 0 ? '<div class="admin-map-legend-note">' + notFound + ' sem bairro mapeado</div>' : '');
      return div;
    };
    legend.addTo(map);

    /* Atualiza contador total */
    var countEl = document.getElementById("family-map-count");
    if (countEl) countEl.textContent = _familyMarkers.length + " família(s) no mapa";

    /* Ajusta zoom para cobrir todos os marcadores */
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [44, 44], maxZoom: 15 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    }

    /* Busca em tempo real */
    var searchInput = document.getElementById("family-map-search");
    if (searchInput) {
      var _doSearch = function () {
        var q = searchInput.value.toLowerCase().trim();
        var visible = 0;
        _familyMarkers.forEach(function (m) {
          var f    = m._familyData;
          var text = [f.responsavel, f.nome, f.bairro, f.endereco, f.necessidade, f.telefone, f.status].join(" ").toLowerCase();
          var show = !q || text.indexOf(q) >= 0;
          m.setStyle({ opacity: show ? 1 : 0.07, fillOpacity: show ? 0.92 : 0.04 });
          if (show) visible++;
        });
        if (countEl) countEl.textContent = (q ? visible + " encontrada(s)" : _familyMarkers.length + " família(s) no mapa");

        /* Se filtrando, ajusta zoom para os visíveis */
        if (q) {
          var vis = _familyMarkers.filter(function (m) { return m.options.opacity > 0.5; });
          if (vis.length) map.fitBounds(vis.map(function (m) { return m._latLng; }), { padding: [60, 60], maxZoom: 15 });
        } else if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [44, 44], maxZoom: 15 });
        }
      };
      searchInput.removeEventListener("input", searchInput._doSearch);
      searchInput._doSearch = _doSearch;
      searchInput.addEventListener("input", _doSearch);
    }
  }

  function drawCharts(page) {
    if (!window.Chart) return;
    if (page === "overview") {
      lineChart("overview-line", monthlyLabels(), monthlyValues());
      barChart("overview-bars", foodLabels(), foodValues(), [COLORS.blue, COLORS.cyan, COLORS.purple, COLORS.green, COLORS.yellow]);
      donutChart("overview-status", familyStatusLabels(), familyStatusValues(), [COLORS.blue, COLORS.cyan, COLORS.green], "overview-status-legend");
    } else if (page === "donations") {
      var kgData = computeKgByPeriodForAnalytics(state.analyticsPeriod);
      lineChart("analytics-line", kgData.labels, kgData.values);
      stackedChannelChart("analytics-channel", state.analyticsPeriod);
    } else if (page === "families") {
      initFamilyMap();
    } else if (page === "tasks") {
      donutChart("tasks-summary", ["Concluidas", "Em andamento", "Pendentes", "Atrasadas"], taskStatusValues(), [COLORS.green, COLORS.blue, COLORS.purple, COLORS.red], "tasks-summary-legend");
      var prodData = computeTasksProductivity();
      if (prodData.labels.length) {
        barChart("tasks-productivity", prodData.labels, prodData.values, [COLORS.purple, COLORS.blue, COLORS.purple2, COLORS.blue, COLORS.purple]);
      }
    } else if (page === "spiritual") {
      var modCounts = spiritualModalidadeCounts(allSpiritualVolunteers());
      donutChart("spiritual-modalidade", ["Intercessão em oração", "Visita presencial", "Ambas as formas"], [modCounts.intercessao, modCounts.visita, modCounts.ambos], [COLORS.purple, COLORS.blue, COLORS.green], "spiritual-modalidade-legend");
    }
  }

  function chartBase() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(5, 10, 24, .96)",
          borderColor: "rgba(255,255,255,.12)",
          borderWidth: 1,
          titleColor: "#fff",
          bodyColor: "rgba(235,241,255,.78)",
          padding: 12,
          cornerRadius: 12,
        },
      },
      scales: {
        x: { grid: { color: "rgba(255,255,255,.045)" }, ticks: { color: "rgba(235,241,255,.64)" } },
        y: { beginAtZero: true, grid: { color: "rgba(255,255,255,.055)" }, ticks: { color: "rgba(235,241,255,.64)" } },
      },
    };
  }

  function makeChart(id, config) {
    var canvas = document.getElementById(id);
    if (!canvas) return;
    if (state.charts[id]) state.charts[id].destroy();
    state.charts[id] = new Chart(canvas, config);
  }

  function lineChart(id, labels, values) {
    var ctx = document.getElementById(id);
    if (!ctx) return;
    var gradient = ctx.getContext("2d").createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, "rgba(139,92,246,.55)");
    gradient.addColorStop(1, "rgba(139,92,246,0)");
    var options = chartBase();
    makeChart(id, {
      type: "line",
      data: { labels: labels, datasets: [{ data: values, borderColor: COLORS.purple, backgroundColor: gradient, fill: true, tension: 0.42, pointRadius: 4, pointBackgroundColor: "#fff", pointBorderColor: COLORS.purple, pointBorderWidth: 2 }] },
      options: options,
    });
  }

  function barChart(id, labels, values, colors) {
    var options = chartBase();
    options.scales.x.grid.display = false;
    makeChart(id, {
      type: "bar",
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 10, borderSkipped: false }] },
      options: options,
    });
  }

  function donutChart(id, labels, values, colors, legendId) {
    makeChart(id, {
      type: "doughnut",
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 5 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: "67%", plugins: { legend: { display: false } } },
    });
    var legend = document.getElementById(legendId);
    if (legend) {
      var total = values.reduce(function (a, b) { return a + b; }, 0) || 1;
      legend.innerHTML = labels.map(function (label, i) {
        return '<div class="admin-legend-row"><span class="admin-legend-left"><span class="admin-dot" style="--dot:' + colors[i] + '"></span>' + esc(label) + '</span><strong>' + Math.round((values[i] / total) * 100) + '% (' + fmtInt(values[i]) + ')</strong></div>';
      }).join("");
    }
  }

  function stackedChannelChart(id, periodDays) {
    periodDays = periodDays || 30;
    var now = new Date();
    var labels = [], retirada = [], entrega = [];
    var numBuckets, bucketMs;
    if (periodDays <= 1) { numBuckets = 6; bucketMs = 4 * 3600000; }
    else if (periodDays <= 7) { numBuckets = 7; bucketMs = 86400000; }
    else if (periodDays <= 30) { numBuckets = 4; bucketMs = 7 * 86400000; }
    else { numBuckets = 12; bucketMs = 30 * 86400000; }
    for (var b = numBuckets - 1; b >= 0; b--) {
      var wEnd, wStart, label;
      if (periodDays <= 1) {
        var h = (numBuckets - 1 - b) * 4;
        wStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h);
        wEnd = new Date(wStart.getTime() + bucketMs);
        label = String(h).padStart(2, "0") + "h-" + String(h + 4).padStart(2, "0") + "h";
      } else {
        wEnd = new Date(now.getTime() - b * bucketMs);
        wStart = new Date(wEnd.getTime() - bucketMs);
        if (periodDays <= 7) {
          label = wStart.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
        } else {
          label = wStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) +
                  " - " + wEnd.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
        }
      }
      labels.push(label);
      var rKg = 0, eKg = 0;
      state.data.donations.forEach(function (d) {
        var dt = donationDate(d);
        if (!dt || dt < wStart || dt >= wEnd) return;
        var kg = getDonationKg(d);
        if (d.delivery === "igreja") eKg += kg;
        else rKg += kg;
      });
      retirada.push(Math.round(rKg * 10) / 10);
      entrega.push(Math.round(eKg * 10) / 10);
    }
    makeChart(id, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          { label: "Retirada", data: retirada, backgroundColor: COLORS.purple, borderRadius: 8 },
          { label: "Entrega", data: entrega, backgroundColor: COLORS.blue, borderRadius: 8 },
        ],
      },
      options: Object.assign(chartBase(), { scales: { x: { stacked: true, grid: { display: false }, ticks: { color: "rgba(235,241,255,.64)" } }, y: { stacked: true, beginAtZero: true, grid: { color: "rgba(255,255,255,.055)" }, ticks: { color: "rgba(235,241,255,.64)" } } } }),
    });
  }

  function monthlyLabels() { return computeKgByPeriod(6, 5).labels; }
  function monthlyValues() { return computeKgByPeriod(6, 5).values; }
  function periodLabels() { return computeKgByPeriod(8, 4).labels; }
  function periodValues() { return computeKgByPeriod(8, 4).values; }

  function foodLabels() {
    var foods = state.data.foods || [];
    return foods.slice(0, 5).map(function (f) { return f.name || f.nome; });
  }

  function foodValues() {
    var foods = state.data.foods || [];
    return foods.slice(0, 5).map(function (f) { return number(f.kg || f.quantidade || 0); });
  }

  function familyStatusLabels() { return ["Em analise", "Aguardando receber", "Entregues"]; }
  function familyStatusValues() {
    var rows = state.data.families;
    return [
      countWhere(rows, "status", ["em-analise"]),
      countWhere(rows, "status", ["aguardando-entrega", "aprovada", "aprovado"]),
      countWhere(rows, "status", ["entregue"])
    ];
  }

  function taskStatusValues() {
    var rows = state.data.tasks;
    var late = rows.filter(function (t) { return t.data && new Date(t.data) < new Date() && ["concluido", "concluida"].indexOf(slug(t.status)) < 0; }).length;
    return [
      countWhere(rows, "status", ["concluido", "concluida"]),
      countWhere(rows, "status", ["em-andamento"]),
      countWhere(rows, "status", ["a-fazer", "pendente"]),
      late
    ];
  }

  function initLogin() {
    var form = $("#admin-login-form");
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      var error = $("#admin-login-error");
      error.classList.remove("visible");
      var email = $("#admin-login-email").value.trim();
      var password = $("#admin-login-password").value;
      try {
        if (!window.DoaVidaSync || !DoaVidaSync.login) throw new Error("Servico de autenticacao indisponivel.");
        await DoaVidaSync.login(email, password);
        await showApp();
      } catch (e) {
        error.textContent = "Nao foi possivel validar o acesso. Verifique e-mail e senha.";
        error.classList.add("visible");
      }
    });
  }

  function renderTaskModal() {
    return '<div id="task-modal-backdrop" class="admin-modal-backdrop" aria-hidden="true">' +
      '<div class="admin-modal" role="dialog" aria-modal="true" aria-label="Cadastrar tarefa">' +
        '<div class="admin-modal-header">' +
          '<h2 id="task-modal-title"><i class="fa-solid fa-circle-plus" id="task-modal-icon"></i><span id="task-modal-title-text">Nova tarefa</span></h2>' +
          '<button class="admin-icon-button" id="task-modal-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>' +
        '</div>' +
        '<div class="admin-modal-body">' +
          '<form id="task-quick-form" class="admin-form-grid">' +
            '<label>Título da tarefa<input name="titulo" required placeholder="Ex.: Separar cestas para entrega"></label>' +
            '<label>Descrição<textarea name="descricao" rows="2" placeholder="Detalhes opcionais..."></textarea></label>' +
            '<div class="admin-form-row">' +
              '<label>Responsável<select name="responsavel" id="task-form-responsavel"><option value="Equipe Semear">Equipe Semear</option></select></label>' +
              '<label>Tipo<select name="tipo">' +
                '<option value="organizacao">Organização</option>' +
                '<option value="atendimento">Atendimento</option>' +
                '<option value="logistica">Logística</option>' +
                '<option value="comunicacao">Comunicação</option>' +
                '<option value="entrega">Entrega</option>' +
                '<option value="compras">Compras</option>' +
                '<option value="financeiro">Financeiro</option>' +
                '<option value="captacao">Captação de doações</option>' +
                '<option value="eventos">Eventos</option>' +
                '<option value="espiritual">Espiritual</option>' +
                '<option value="outro">Outro</option>' +
              '</select></label>' +
            '</div>' +
            '<div class="admin-form-row">' +
              '<label>Status<select name="status">' +
                '<option value="a-fazer">A fazer</option>' +
                '<option value="em-andamento">Em andamento</option>' +
                '<option value="aguardando">Aguardando</option>' +
                '<option value="concluido">Concluído</option>' +
              '</select></label>' +
              '<label>Prioridade<select name="prioridade">' +
                '<option value="media">Média</option>' +
                '<option value="alta">Alta</option>' +
                '<option value="urgente">Urgente</option>' +
                '<option value="baixa">Baixa</option>' +
              '</select></label>' +
            '</div>' +
            '<label>Prazo<input name="data" type="date"></label>' +
            '<div class="admin-form-actions">' +
              '<button type="button" class="admin-button danger" id="task-form-delete" style="display:none"><i class="fa-regular fa-trash-can"></i>Excluir</button>' +
              '<button type="submit" class="admin-button primary block" id="task-form-submit"><i class="fa-regular fa-floppy-disk"></i>Adicionar tarefa</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderFamilyModal() {
    return '<div id="family-modal-backdrop" class="admin-modal-backdrop" aria-hidden="true">' +
      '<div class="admin-modal admin-modal-wide" role="dialog" aria-modal="true" aria-label="Cadastrar solicitacao de cesta">' +
        '<div class="admin-modal-header">' +
          '<h2 id="family-modal-title">Nova solicitacao de cesta</h2>' +
          '<button class="admin-icon-button" id="family-modal-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>' +
        '</div>' +
        '<div class="admin-modal-body">' +
          '<form id="family-quick-form" class="admin-form-grid">' +
            '<input type="hidden" name="edit-id" value="">' +
            '<div class="admin-form-section-title"><i class="fa-solid fa-user"></i>Dados do responsavel</div>' +
            '<label>Nome completo <span class="req">*</span><input name="responsavel" required placeholder="Nome completo"></label>' +
            '<div class="admin-form-row">' +
              '<label>Telefone / WhatsApp <span class="req">*</span><input name="telefone" required placeholder="(91) 9 0000-0000"></label>' +
              '<label>Estado civil<select name="estado_civil"><option value="">Estado civil</option><option>Solteiro(a)</option><option>Casado(a)</option><option>Uniao estavel</option><option>Separado(a)</option><option>Divorciado(a)</option><option>Viuvo(a)</option></select></label>' +
            '</div>' +
            '<label>Sexo<select name="sexo"><option value="">Sexo</option><option>Feminino</option><option>Masculino</option><option>Prefiro nao informar</option></select></label>' +
            '<div class="admin-form-section-title"><i class="fa-solid fa-location-dot"></i>Endereco</div>' +
            '<div class="admin-form-row">' +
              '<label>CEP<input name="cep" inputmode="numeric" maxlength="9" placeholder="66000-000"></label>' +
              '<label>Endereco<input name="logradouro" placeholder="Rua, avenida, passagem..."></label>' +
            '</div>' +
            '<div class="admin-form-row">' +
              '<label>Numero<input name="numero" inputmode="numeric" placeholder="Numero"></label>' +
              '<label>Complemento<input name="complemento" placeholder="Casa, bloco, fundos..."></label>' +
            '</div>' +
            '<label>Bairro<input name="bairro" placeholder="Ex.: Pedreira, Guama, Jurunas..."></label>' +
            '<div class="admin-form-row">' +
              '<label>Cidade<input name="cidade" placeholder="Belem"></label>' +
              '<label>UF<select name="uf"><option value="PA">PA</option><option value="AC">AC</option><option value="AL">AL</option><option value="AP">AP</option><option value="AM">AM</option><option value="BA">BA</option><option value="CE">CE</option><option value="DF">DF</option><option value="ES">ES</option><option value="GO">GO</option><option value="MA">MA</option><option value="MT">MT</option><option value="MS">MS</option><option value="MG">MG</option><option value="PB">PB</option><option value="PR">PR</option><option value="PE">PE</option><option value="PI">PI</option><option value="RJ">RJ</option><option value="RN">RN</option><option value="RS">RS</option><option value="RO">RO</option><option value="RR">RR</option><option value="SC">SC</option><option value="SP">SP</option><option value="SE">SE</option><option value="TO">TO</option></select></label>' +
            '</div>' +
            '<label>Ponto de referencia<input name="referencia" placeholder="Perto de escola, igreja, comercio..."></label>' +
            '<div class="admin-form-section-title"><i class="fa-solid fa-people-group"></i>Informacoes da familia</div>' +
            '<div class="admin-form-row">' +
              '<label>Quantas pessoas moram na casa?<select name="pessoas_texto"><option value="">Selecione</option><option>1 pessoa</option><option>2 pessoas</option><option>3 pessoas</option><option>4 pessoas</option><option>5 pessoas</option><option>6 pessoas ou mais</option></select></label>' +
              '<label>Criancas na residencia<select name="criancas"><option value="">Selecione</option><option>Nenhuma</option><option>1 crianca</option><option>2 criancas</option><option>3 criancas</option><option>4 criancas ou mais</option></select></label>' +
            '</div>' +
            '<div class="admin-form-row">' +
              '<label>Idosos na residencia<select name="idosos"><option value="">Selecione</option><option>Nenhum</option><option>1 idoso</option><option>2 idosos</option><option>3 idosos ou mais</option></select></label>' +
              '<label>Pessoa com deficiencia?<select name="deficiencia"><option value="">Selecione</option><option>Nao</option><option>Sim</option><option>Prefiro informar pelo WhatsApp</option></select></label>' +
            '</div>' +
            '<div class="admin-form-section-title"><i class="fa-solid fa-hand-holding-heart"></i>Situacao social</div>' +
            '<div class="admin-form-row">' +
              '<label>Renda familiar mensal<select name="renda_texto"><option value="">Selecione</option><option>Sem renda</option><option>Ate R$ 500</option><option>R$ 501 a R$ 1.000</option><option>R$ 1.001 a R$ 1.500</option><option>Acima de R$ 1.500</option></select></label>' +
              '<label>Situacao de trabalho<select name="trabalho"><option value="">Selecione</option><option>Desempregado(a)</option><option>Trabalho informal</option><option>Trabalho formal</option><option>Aposentado(a)</option><option>Outro</option></select></label>' +
            '</div>' +
            '<div class="admin-form-row">' +
              '<label>Recebe outro beneficio?<select name="beneficio"><option value="">Selecione</option><option>Nao recebe</option><option>Bolsa Familia / Auxilio Brasil</option><option>BPC / LOAS</option><option>Aposentadoria</option><option>Outro beneficio</option></select></label>' +
              '<label>Principal necessidade<select name="necessidade">' +
                '<option value="Cesta basica">Cesta basica</option>' +
                '<option value="Cesta + Higiene">Cesta + Higiene</option>' +
                '<option value="Alimentos prontos">Alimentos prontos</option>' +
                '<option value="Apoio espiritual">Apoio espiritual</option>' +
              '</select></label>' +
            '</div>' +
            '<div class="admin-form-section-title"><i class="fa-solid fa-clipboard-check"></i>Controle do atendimento</div>' +
            '<div class="admin-form-row">' +
              '<label>Status<select name="status">' +
                '<option value="em-analise">Em analise</option>' +
                '<option value="aguardando-entrega">Aguardando receber</option>' +
                '<option value="aguardando-documentos">Aguardando documentos</option>' +
                '<option value="entregue">Entregue</option>' +
              '</select></label>' +
              '<label>Prioridade<select name="prioridade">' +
                '<option value="media">Media</option>' +
                '<option value="alta">Alta</option>' +
                '<option value="urgente">Urgente</option>' +
                '<option value="baixa">Baixa</option>' +
              '</select></label>' +
            '</div>' +
            '<label>Observacoes<textarea name="observacao" rows="2" placeholder="Informacoes adicionais..."></textarea></label>' +
            '<button type="submit" id="family-submit-btn" class="admin-button primary block"><i class="fa-regular fa-floppy-disk"></i>Salvar solicitacao</button>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderVolunteerModal() {
    return '<div id="volunteer-modal-backdrop" class="admin-modal-backdrop" aria-hidden="true">' +
      '<div class="admin-modal" role="dialog" aria-modal="true" aria-label="Cadastrar voluntario">' +
        '<div class="admin-modal-header">' +
          '<h2 id="volunteer-modal-title"><i class="fa-solid fa-circle-plus" id="volunteer-modal-icon"></i><span id="volunteer-modal-title-text">Novo voluntário</span></h2>' +
          '<button class="admin-icon-button" id="volunteer-modal-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>' +
        '</div>' +
        '<div class="admin-modal-body">' +
          '<form id="volunteer-quick-form" class="admin-form-grid">' +
            '<label>Nome completo<input name="nome" required placeholder="Ex.: Ana Costa"></label>' +
            '<label>WhatsApp / Telefone<input name="whatsapp" placeholder="(91) 9 0000-0000"></label>' +
            '<label>Tipo de contribuicao<input name="tipo_label" placeholder="Ex.: Organizacao, Transporte, Apoio espiritual..."></label>' +
            '<div class="admin-form-row">' +
              '<label>Disponibilidade<input name="disponibilidade" placeholder="Ex.: Sabados pela manha"></label>' +
              '<label>Status<select name="status">' +
                '<option value="ativo">Ativo</option>' +
                '<option value="aguardando">Aguardando</option>' +
                '<option value="inativo">Inativo</option>' +
              '</select></label>' +
            '</div>' +
            '<label>Observacoes<textarea name="observacao" rows="2" placeholder="Habilidades, restricoes..."></textarea></label>' +
            '<div class="admin-form-actions">' +
              '<button type="button" class="admin-button danger" id="volunteer-form-delete" style="display:none"><i class="fa-regular fa-trash-can"></i>Excluir</button>' +
              '<button type="submit" class="admin-button primary block" id="volunteer-form-submit"><i class="fa-regular fa-floppy-disk"></i>Cadastrar voluntário</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderWhatsappAdminModal() {
    return '<div id="wa-admin-modal-backdrop" class="admin-modal-backdrop" aria-hidden="true">' +
      '<div class="admin-modal" role="dialog" aria-modal="true" aria-label="Cadastrar administrador de WhatsApp">' +
        '<div class="admin-modal-header">' +
          '<h2 id="wa-admin-modal-title"><i class="fa-solid fa-circle-plus" id="wa-admin-modal-icon"></i><span id="wa-admin-modal-title-text">Novo administrador</span></h2>' +
          '<button class="admin-icon-button" id="wa-admin-modal-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>' +
        '</div>' +
        '<div class="admin-modal-body">' +
          '<form id="wa-admin-form" class="admin-form-grid">' +
            '<label>Nome completo<input name="nome" required placeholder="Ex.: Maria Souza"></label>' +
            '<label>Telefone / WhatsApp<input name="telefone" required placeholder="Ex.: 5591900000000"></label>' +
            '<small class="admin-field-hint">Use o numero completo com codigo do pais e DDD, sem espacos, sinais ou o "+" (padrao exigido pelo CallMeBot). Ex.: 5591900000000.</small>' +
            '<div class="admin-form-row">' +
              '<label>Funcao<input name="funcao" placeholder="Ex.: Coordenador, Admin..."></label>' +
              '<label>Status<select name="status">' +
                '<option value="ativo">Ativo</option>' +
                '<option value="inativo">Inativo</option>' +
              '</select></label>' +
            '</div>' +
            '<div class="admin-form-section-title"><i class="fa-regular fa-bell"></i>Tipos de aviso que vai receber</div>' +
            '<div class="admin-checkbox-grid">' +
            WA_AVISO_OPCOES.map(function (o) {
              return '<label class="admin-checkbox-pill"><input type="checkbox" name="avisos" value="' + esc(o[0]) + '">' + esc(o[1]) + '</label>';
            }).join("") +
            '</div>' +
            '<div class="admin-form-actions">' +
              '<button type="button" class="admin-button danger" id="wa-admin-form-delete" style="display:none"><i class="fa-regular fa-trash-can"></i>Excluir</button>' +
              '<button type="submit" class="admin-button primary block" id="wa-admin-form-submit"><i class="fa-regular fa-floppy-disk"></i>Adicionar administrador</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function openModal(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add("open");
    el.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(function () {
      var first = el.querySelector("input, textarea, select");
      if (first) first.focus();
    }, 80);
  }

  function closeModal(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("open");
    el.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    var form = el.querySelector("form");
    if (form) form.reset();
  }

  function mountModals() {
    /* Modais montados no document.body — fora do #admin-view que tem animation com transform,
       evitando o containing-block que prende position:fixed dentro da view animada */
    var toMount = [
      { id: "food-modal-backdrop",      html: renderFoodModal() },
      { id: "cesta-img-modal-backdrop", html: renderCestaImgModal() },
      { id: "donation-modal-backdrop",  html: renderDonationModal() },
      { id: "gallery-edit-backdrop",    html: renderGalleryEditModal() },
      { id: "task-modal-backdrop",      html: renderTaskModal() },
      { id: "family-modal-backdrop",    html: renderFamilyModal() },
      { id: "volunteer-modal-backdrop", html: renderVolunteerModal() },
      { id: "wa-admin-modal-backdrop",  html: renderWhatsappAdminModal() },
    ];
    toMount.forEach(function (m) {
      if (!document.getElementById(m.id)) {
        var div = document.createElement("div");
        div.innerHTML = m.html;
        document.body.appendChild(div.firstElementChild);
      }
    });
    bindModalBackdrops();
  }

  function bindModalBackdrops() {
    ["food-modal-backdrop", "cesta-img-modal-backdrop", "donation-modal-backdrop", "gallery-edit-backdrop",
     "task-modal-backdrop",
     "family-modal-backdrop", "volunteer-modal-backdrop",
     "wa-admin-modal-backdrop"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el._backdropBound) return;
      el.addEventListener("click", function (e) { if (e.target === el) closeModal(id); });
      el._backdropBound = true;
    });
    var bindings = [
      ["food-modal-close",      function () { closeFoodModal(); }],
      ["gallery-edit-close",    function () { closeGalleryEdit(); }],
      ["task-modal-close",      function () { closeModal("task-modal-backdrop"); }],
      ["family-modal-close",    function () { closeModal("family-modal-backdrop"); }],
      ["volunteer-modal-close", function () { closeModal("volunteer-modal-backdrop"); }],
      ["wa-admin-modal-close",  function () { closeModal("wa-admin-modal-backdrop"); }],
      ["task-quick-form",        null, "submit", saveTask],
      ["family-quick-form",     null, "submit", saveFamily],
      ["volunteer-quick-form",  null, "submit", saveVolunteer],
      ["wa-admin-form",         null, "submit", saveWhatsappAdmin],
    ];
    bindings.forEach(function (b) {
      var el = document.getElementById(b[0]);
      if (!el || el._modalBound) return;
      var evt = b[2] || "click";
      var fn  = b[1] || b[3];
      el.addEventListener(evt, fn);
      el._modalBound = true;
    });

    var familyCep = document.querySelector("#family-quick-form [name='cep']");
    if (familyCep && !familyCep._cepBound) {
      familyCep.addEventListener("input", function () {
        var digits = this.value.replace(/\D/g, "").slice(0, 8);
        this.value = digits.length > 5 ? digits.slice(0, 5) + "-" + digits.slice(5) : digits;
        if (digits.length === 8) fillFamilyAddressByCep(digits);
      });
      familyCep._cepBound = true;
    }
  }

  function fillFamilyAddressByCep(cep) {
    fetch("https://viacep.com.br/ws/" + cep + "/json/")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || d.erro) {
          notify("CEP nao encontrado.");
          return;
        }
        var form = document.getElementById("family-quick-form");
        if (!form) return;
        var endereco = form.querySelector("[name='logradouro']");
        var bairro = form.querySelector("[name='bairro']");
        var cidade = form.querySelector("[name='cidade']");
        var uf = form.querySelector("[name='uf']");
        if (endereco && d.logradouro) endereco.value = d.logradouro;
        if (bairro && d.bairro) bairro.value = d.bairro;
        if (cidade && d.localidade) cidade.value = d.localidade;
        if (uf && d.uf) uf.value = d.uf;
      })
      .catch(function () {
        notify("Erro ao buscar CEP.");
      });
  }

  async function showApp() {
    $("#login-screen").classList.add("hidden");
    $("#admin-app").classList.add("visible");
    if (!state.data) {
      $("#admin-view").innerHTML = '<div class="admin-empty">Carregando dados administrativos...</div>';
      await loadData();
    }
    mountModals();
    state.activePage = (location.hash || "#requests").replace("#", "") || "requests";
    if (!PAGES.some(function (p) { return p.id === state.activePage; })) state.activePage = "requests";
    updateShell();
    renderActivePage();
  }

  function init() {
    initLayout();
    initLogin();
    window.addEventListener("hashchange", function () {
      var next = (location.hash || "#requests").replace("#", "");
      if (next !== state.activePage) navigate(next);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
