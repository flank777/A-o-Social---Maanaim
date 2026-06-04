/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · bootstrap.js                                         ║
  ║  Ponto de entrada: inicializa Supabase, decide login/app, registra  ║
  ║  rotas e parte para a view inicial.                                 ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  var store  = function () { return window.SA && window.SA.store; };
  var auth   = function () { return window.SA && window.SA.auth; };
  var router = function () { return window.SA && window.SA.router; };
  var layout = function () { return window.SA && window.SA.layout; };
  var views  = function () { return (window.SA && window.SA.views) || {}; };

  /* ── Registro das rotas (apenas as ativas na Fase 0) ──────────── */
  function registerRoutes() {
    var r = router();
    r.register('overview',       '/overview',        function ()       { views().overview.render(); });
    r.register('pages',          '/pages',           function ()       { views().pages.render({ area: 'site_publico' }); });
    r.register('pages-area',     '/pages/:area',     function (params) { views().pages.render(params); });
    r.register('page-detail',    '/page/:id',        function (params) { views().pageDetail.render(params); });
    r.register('section-detail', '/section/:id',     function (params) { views().sectionDetail.render(params); });
    r.register('media',          '/media',           function ()       { views().mediaLibrary.render(); });
    r.register('forms',           '/forms',          function ()       { views().forms.render(); });
    r.register('form-detail',     '/form/:id',       function (params) { views().formDetail.render(params); });
    r.register('dashboards',      '/dashboards',     function ()       { views().dashboards.render(); });
    r.register('dashboard-detail','/dashboard/:id',  function (params) { views().dashboardDetail.render(params); });
    r.register('widget-detail',   '/widget/:id',     function (params) { views().widgetDetail.render(params); });
    r.register('presets',         '/presets',        function ()       { views().presets.render(); });
    r.register('loading-page',    '/loading',        function ()       { views().loadingPage.render(); });
    r.register('fonts',           '/fonts',          function ()       { views().fonts.render(); });
    r.register('colors',          '/colors',         function ()       { views().colors.render(); });
    r.register('texts',           '/texts',          function ()       { views().texts.render(); });
    r.register('receipts',        '/receipts',       function ()       { views().receipts.render(); });
    r.register('agent',           '/agent',          function ()       { views().agent.render(); });
    r.register('commands',        '/commands',       function ()       { views().commands.render(); });
    r.register('history',         '/history',        function ()       { views().history.render(); });
    r.register('manual-editor',   '/manual-editor',  function ()       { views().manualEditor.render(); });
  }

  /* ── Tela de login ────────────────────────────────────────────── */
  function bindLoginForm(onSuccess) {
    var form = document.getElementById('sa-login-form');
    var err  = document.getElementById('sa-login-error');
    var btn  = document.getElementById('sa-login-submit');
    var em   = document.getElementById('sa-login-email');
    var pw   = document.getElementById('sa-login-password');
    var tg   = document.getElementById('sa-login-toggle');

    function showError(msg) {
      if (!err) return;
      err.textContent = msg || '';
      err.hidden = !msg;
    }

    if (tg && pw) {
      tg.addEventListener('click', function () {
        var hidden = pw.type === 'password';
        pw.type = hidden ? 'text' : 'password';
        tg.setAttribute('aria-label', hidden ? 'Ocultar senha' : 'Mostrar senha');
        var icon = tg.querySelector('i');
        if (icon) icon.className = hidden ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
      });
    }

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      showError('');
      btn.disabled = true;
      var oldText = btn.querySelector('span').textContent;
      btn.querySelector('span').textContent = 'Verificando…';
      try {
        var session = await auth().signIn(em.value, pw.value);
        store().set({ session: session });
        onSuccess(session);
      } catch (e) {
        showError(e.message || 'Falha ao entrar.');
        pw.focus();
        pw.select();
      } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = oldText;
      }
    });
  }

  /* ── Boot principal ───────────────────────────────────────────── */
  async function boot() {
    // Garante que o cliente Supabase está inicializado.
    if (typeof window.inicializarSupabase === 'function' && !window.supabaseClient) {
      try { window.inicializarSupabase(); } catch (e) {}
    }
    if (!window.supabaseClient) {
      // Sem Supabase, não dá para nem mostrar login
      store().setBodyState('login');
      var emsg = document.getElementById('sa-login-error');
      if (emsg) {
        emsg.hidden = false;
        emsg.textContent = 'Supabase não configurado. Edite js/services/supabase.js antes de usar o painel.';
      }
      return;
    }

    registerRoutes();

    // Tenta sessão existente com timeout de 4s (evita travar se Supabase demorar)
    try {
      var existing = await Promise.race([
        auth().loadSession(),
        new Promise(function (_, reject) {
          setTimeout(function () { reject(new Error('timeout')); }, 4000);
        })
      ]);
      if (existing && existing.profile && existing.profile.role === 'super_admin') {
        return enterApp(existing);
      }
    } catch (e) {
      console.warn('[SA boot] loadSession falhou:', e.message);
    }

    // Sem sessão válida → tela de login
    store().setBodyState('login');
    bindLoginForm(function (session) { enterApp(session); });
  }

  function enterApp(session) {
    store().set({ session: session, booted: true });
    store().setBodyState('app');

    if (layout()) layout().init();

    // Refletir nome do usuário e rota inicial
    if (window.SA && window.SA.store) {
      window.SA.store.emit('state:change', window.SA.store.get());
    }

    // Logout em outras abas
    auth().watchAuthChanges(function (event) {
      if (event === 'SIGNED_OUT') {
        location.reload();
      }
    });

    // Inicia roteador
    router().start();
    if (store()) store().toast('Bem-vindo, ' + (session.profile.nome || 'super admin') + ' 👋', 'ok', { ttl: 2400 });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
