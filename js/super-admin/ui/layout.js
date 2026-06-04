/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · ui/layout.js                                         ║
  ║  Sidebar + Topbar + breadcrumbs + estado mobile.                    ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  /* Mapa de navegação. As Fases futuras vão preencher os itens com
     `disabled: false`. Itens com disabled: true aparecem cinza com badge. */
  var NAV = [
    {
      title: 'Controle',
      items: [
        { id: 'overview',       label: 'Visão Geral',     icon: 'fa-gauge-high',        route: 'overview' },
        { id: 'pages',          label: 'Páginas',          icon: 'fa-file-lines',        route: 'pages' },
        { id: 'manual-editor',  label: 'Editor Manual',    icon: 'fa-code-branch',       route: 'manual-editor' },
        { id: 'history',        label: 'Histórico',        icon: 'fa-clock-rotate-left', route: 'history' }
      ]
    },
    {
      title: 'Edição visual',
      items: [
        { id: 'sections',     label: 'Seções',           icon: 'fa-layer-group',  route: 'pages' },
        { id: 'media',        label: 'Mídia',            icon: 'fa-photo-film',   route: 'media' },
        { id: 'forms',        label: 'Formulários',      icon: 'fa-list-check',   route: 'forms' },
        { id: 'cards',        label: 'Cards',            icon: 'fa-square',       disabled: true, badge: 'via Seções' }
      ]
    },
    {
      title: 'Identidade visual',
      items: [
        { id: 'fonts',        label: 'Fontes',           icon: 'fa-font',                 route: 'fonts' },
        { id: 'colors',       label: 'Cores',            icon: 'fa-palette',              route: 'colors' },
        { id: 'animations',   label: 'Animações & Efeitos', icon: 'fa-wand-magic-sparkles', route: 'presets' },
        { id: 'loading',      label: 'Página de carregamento', icon: 'fa-spinner',           route: 'loading-page' }
      ]
    },
    {
      title: 'Conteúdo & Comunicação',
      items: [
        { id: 'texts',        label: 'Textos globais',     icon: 'fa-comment',     route: 'texts' },
        { id: 'receipts',     label: 'Recibos & Comprovantes', icon: 'fa-receipt', route: 'receipts' }
      ]
    },
    {
      title: 'Inteligência',
      items: [
        { id: 'dashboards',   label: 'Dashboards',       icon: 'fa-chart-column', route: 'dashboards' },
        { id: 'charts',       label: 'Gráficos',         icon: 'fa-chart-line',   disabled: true, badge: 'via Dashboards' },
        { id: 'agent',        label: 'Dona Assunção',    icon: 'fa-robot',        route: 'agent' },
        { id: 'commands',     label: 'Comandos seguros', icon: 'fa-bolt',         route: 'commands' }
      ]
    }
  ];

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function renderNav() {
    var nav = document.getElementById('sa-nav');
    if (!nav) return;
    var html = NAV.map(function (group) {
      return '' +
        '<div class="sa-nav__group">' +
          '<div class="sa-nav__group-title">' + escHtml(group.title) + '</div>' +
          group.items.map(function (it) {
            var attrs = '';
            if (it.disabled) attrs = ' data-disabled="true" tabindex="-1" aria-disabled="true"';
            else attrs = ' data-route="' + escHtml(it.route) + '"';
            var badge = it.badge ? '<span class="sa-nav__badge">' + escHtml(it.badge) + '</span>' : '';
            return '<button type="button" class="sa-nav__item" id="sa-nav-' + escHtml(it.id) + '"' + attrs + '>' +
              '<i class="fa-solid ' + escHtml(it.icon) + '" aria-hidden="true"></i>' +
              '<span>' + escHtml(it.label) + '</span>' + badge +
            '</button>';
          }).join('') +
        '</div>';
    }).join('');
    nav.innerHTML = html;

    // Bindings
    nav.querySelectorAll('[data-route]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var route = btn.getAttribute('data-route');
        if (!route) return;
        if (window.SA && window.SA.router) window.SA.router.go(route, {});
        closeSidebar();
      });
    });
  }

  /* ── Estado ativo do nav baseado na rota ──────────────────────── */
  function reflectActive(routeName) {
    var nav = document.getElementById('sa-nav');
    if (!nav) return;
    nav.querySelectorAll('.sa-nav__item').forEach(function (b) {
      b.removeAttribute('aria-current');
    });
    var active = nav.querySelector('[data-route="' + routeName + '"]');
    if (active) active.setAttribute('aria-current', 'page');
  }

  /* ── Breadcrumbs ──────────────────────────────────────────────── */
  function setCrumbs(items) {
    var box = document.getElementById('sa-crumbs');
    if (!box) return;
    var html = items.map(function (it, idx) {
      if (idx > 0) html = (typeof html === 'undefined' ? '' : html);
      var sep = idx > 0 ? '<span class="sep" aria-hidden="true">/</span>' : '';
      var label = '<span>' + escHtml(it.label) + '</span>';
      if (it.strong) label = '<strong>' + escHtml(it.label) + '</strong>';
      return sep + label;
    }).join(' ');
    box.innerHTML = html;
  }

  /* ── Pill de rascunho global ──────────────────────────────────── */
  function reflectDraftPill() {
    var pill = document.getElementById('sa-draft-pill');
    if (!pill) return;
    var has = window.SA && window.SA.store && window.SA.store.hasDrafts();
    pill.hidden = !has;
  }

  /* ── Sidebar mobile ───────────────────────────────────────────── */
  function openSidebar() {
    var side = document.getElementById('sa-side');
    if (side) side.classList.add('is-open');
    var bd = document.getElementById('sa-backdrop');
    if (bd) { bd.hidden = false; setTimeout(function () { bd.classList.add('is-open'); }, 0); }
  }
  function closeSidebar() {
    var side = document.getElementById('sa-side');
    if (side) side.classList.remove('is-open');
    var bd = document.getElementById('sa-backdrop');
    if (bd) { bd.classList.remove('is-open'); setTimeout(function () { bd.hidden = true; }, 200); }
  }

  function bindChrome() {
    var toggle = document.getElementById('sa-side-toggle');
    var close  = document.getElementById('sa-side-close');
    var bd     = document.getElementById('sa-backdrop');
    if (toggle) toggle.addEventListener('click', openSidebar);
    if (close)  close.addEventListener('click',  closeSidebar);
    if (bd)     bd.addEventListener('click',     closeSidebar);

    var help = document.getElementById('sa-help');
    if (help) help.addEventListener('click', function () {
      if (window.SA && window.SA.store) {
        window.SA.store.toast(
          'Fase 0: Visão Geral, Páginas e Histórico ativos. Demais áreas chegam nas próximas fases.',
          'info', { ttl: 5000 }
        );
      }
    });

    var histBtn = document.getElementById('sa-history-open');
    if (histBtn) histBtn.addEventListener('click', function () {
      if (window.SA && window.SA.router) window.SA.router.go('history', {});
    });

    var logoutBtn = document.getElementById('sa-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', async function () {
      if (window.SA && window.SA.store) window.SA.store.toast('Saindo…', 'info', { ttl: 1500 });
      try { await window.SA.auth.signOut(); } catch (e) {}
      location.reload();
    });
  }

  /* ── Atualizar nome do usuário no rodapé do sidebar ──────────── */
  function reflectUser(profile) {
    var el = document.getElementById('sa-side-user-name');
    if (!el) return;
    if (!profile) { el.textContent = '—'; return; }
    el.textContent = profile.nome || profile.email || 'Super Admin';
  }

  function init() {
    renderNav();
    bindChrome();

    // Reage a mudanças de rota e drafts
    if (window.SA && window.SA.store) {
      window.SA.store.on('state:change', function (s) {
        reflectActive(s.route ? s.route.name : 'overview');
        reflectUser(s.session ? s.session.profile : null);
      });
      window.SA.store.on('draft:change', reflectDraftPill);
    }
  }

  window.SA = window.SA || {};
  window.SA.layout = {
    init:        init,
    setCrumbs:   setCrumbs,
    reflectActive: reflectActive
  };
})();
