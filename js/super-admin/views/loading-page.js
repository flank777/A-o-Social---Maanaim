/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/loading-page.js                                ║
  ║  Editor visual da página de carregamento + preview ao vivo.         ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  var st = { current: null };

  function shell() {
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<h2 class="sa-view__title">Página de carregamento</h2>' +
          '<p class="sa-view__sub">Edição da tela de boas-vindas exibida enquanto o site público carrega.</p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<button class="sa-btn sa-btn--soft"    id="lp-publish"><i class="fa-solid fa-rocket"></i><span>Salvar e publicar</span></button>' +
        '</div>' +
      '</header>' +

      '<div class="lp-grid">' +
        '<section class="sa-panel">' +
          '<h3 class="sa-panel__title">Configuração</h3>' +
          '<div class="sa-row">' +
            '<label class="sa-field"><span class="sa-field__label">Título principal</span><input class="sa-field__input" id="lp-title" maxlength="80" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Subtítulo</span><input class="sa-field__input" id="lp-subtitle" maxlength="160" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">URL da logo</span><input class="sa-field__input" id="lp-logo" placeholder="logo-semear.jpeg" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Tempo mín. (ms)</span><input class="sa-field__input" id="lp-min" type="number" min="0" step="100" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Tempo máx. (ms)</span><input class="sa-field__input" id="lp-max" type="number" min="500" step="100" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Mostrar anel</span><select class="sa-field__input" id="lp-ring"><option value="true">Sim</option><option value="false">Não</option></select></label>' +
            '<label class="sa-field"><span class="sa-field__label">Mostrar barra de progresso</span><select class="sa-field__input" id="lp-prog"><option value="true">Sim</option><option value="false">Não</option></select></label>' +
          '</div>' +

          '<details open style="margin-top:6px">' +
            '<summary style="cursor:pointer;color:var(--sa-text-soft);padding:8px 0;font-weight:600">Cores</summary>' +
            '<div class="sa-row">' +
              '<label class="sa-field"><span class="sa-field__label">Fundo</span><input class="sa-field__input lp-color" id="lp-bg" type="color" /></label>' +
              '<label class="sa-field"><span class="sa-field__label">Texto</span><input class="sa-field__input lp-color" id="lp-text" type="color" /></label>' +
              '<label class="sa-field"><span class="sa-field__label">Destaque (anel/barra)</span><input class="sa-field__input lp-color" id="lp-accent" type="color" /></label>' +
            '</div>' +
          '</details>' +

          '<details open>' +
            '<summary style="cursor:pointer;color:var(--sa-text-soft);padding:8px 0;font-weight:600">Mensagens rotativas</summary>' +
            '<label class="sa-field" style="margin-top:6px">' +
              '<span class="sa-field__label">Uma mensagem por linha</span>' +
              '<textarea class="sa-field__input" id="lp-messages" rows="4" placeholder="Carregando…\nPreparando sua experiência…\nQuase lá…"></textarea>' +
            '</label>' +
          '</details>' +
        '</section>' +

        '<section class="sa-panel" style="position:sticky;top:78px">' +
          '<h3 class="sa-panel__title">Pré-visualização ao vivo</h3>' +
          '<div id="lp-preview-stage" class="lp-stage">' +
            '<div class="lp-frame" id="lp-frame">' +
              '<img id="lpv-logo" alt="" />' +
              '<div class="lpv-ring" id="lpv-ring" aria-hidden="true"></div>' +
              '<div class="lpv-title"    id="lpv-title"></div>' +
              '<div class="lpv-subtitle" id="lpv-subtitle"></div>' +
              '<div class="lpv-progress" id="lpv-progress"><span></span></div>' +
              '<div class="lpv-msg"      id="lpv-msg" aria-live="polite"></div>' +
            '</div>' +
          '</div>' +
          '<p style="color:var(--sa-text-mute);font-size:12.5px;margin:10px 0 0">Mensagens rotacionam a cada 1.4s no preview.</p>' +
        '</section>' +
      '</div>';
  }

  function loadFromForm() {
    var msgs = document.getElementById('lp-messages').value
      .split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
    return {
      internal_key:     'default',
      title:            document.getElementById('lp-title').value.trim() || 'Carregando…',
      subtitle:         document.getElementById('lp-subtitle').value.trim() || '',
      logo_url:         document.getElementById('lp-logo').value.trim() || '',
      background_color: document.getElementById('lp-bg').value || '#0e1116',
      text_color:       document.getElementById('lp-text').value || '#e8eaf0',
      accent_color:     document.getElementById('lp-accent').value || '#4a8a39',
      show_ring:        document.getElementById('lp-ring').value === 'true',
      show_progress:    document.getElementById('lp-prog').value === 'true',
      min_duration_ms:  parseInt(document.getElementById('lp-min').value, 10) || 600,
      max_duration_ms:  parseInt(document.getElementById('lp-max').value, 10) || 4000,
      messages:         msgs.length ? msgs : ['Carregando…']
    };
  }

  function fillForm(d) {
    document.getElementById('lp-title').value    = d.title || '';
    document.getElementById('lp-subtitle').value = d.subtitle || '';
    document.getElementById('lp-logo').value     = d.logo_url || '';
    document.getElementById('lp-bg').value       = d.background_color || '#0e1116';
    document.getElementById('lp-text').value     = d.text_color || '#e8eaf0';
    document.getElementById('lp-accent').value   = d.accent_color || '#4a8a39';
    document.getElementById('lp-ring').value     = d.show_ring ? 'true' : 'false';
    document.getElementById('lp-prog').value     = d.show_progress ? 'true' : 'false';
    document.getElementById('lp-min').value      = d.min_duration_ms || 600;
    document.getElementById('lp-max').value      = d.max_duration_ms || 4000;
    document.getElementById('lp-messages').value = (d.messages || []).join('\n');
  }

  /* ── Preview ao vivo ───────────────────────────────────────────── */
  var previewTimer = null;
  function refreshPreview() {
    var d = loadFromForm();
    var frame = document.getElementById('lp-frame');
    if (!frame) return;
    frame.style.background = d.background_color;
    frame.style.color      = d.text_color;
    frame.style.setProperty('--lp-accent', d.accent_color);

    var logo = document.getElementById('lpv-logo');
    if (d.logo_url) { logo.src = d.logo_url; logo.style.display = ''; }
    else            { logo.removeAttribute('src'); logo.style.display = 'none'; }

    document.getElementById('lpv-title').textContent    = d.title;
    document.getElementById('lpv-subtitle').textContent = d.subtitle;
    document.getElementById('lpv-ring').style.display     = d.show_ring     ? '' : 'none';
    document.getElementById('lpv-progress').style.display = d.show_progress ? '' : 'none';

    // Rotação de mensagens
    var msgEl = document.getElementById('lpv-msg');
    if (previewTimer) { clearInterval(previewTimer); previewTimer = null; }
    if (d.messages && d.messages.length) {
      var i = 0;
      msgEl.textContent = d.messages[0];
      previewTimer = setInterval(function () {
        i = (i + 1) % d.messages.length;
        msgEl.style.opacity = '0';
        setTimeout(function () { msgEl.textContent = d.messages[i]; msgEl.style.opacity = '1'; }, 180);
      }, 1400);
    } else {
      msgEl.textContent = '';
    }
  }

  async function publish() {
    try {
      var d = loadFromForm();
      d.status = 'published';
      st.current = await window.SA.api.loadingPages.upsertDefault(d);
      window.SA.store.toast('Página de carregamento publicada', 'ok');
    } catch (e) {
      window.SA.store.toast('Erro: ' + e.message, 'err');
    }
  }

  function bindForm() {
    var ids = ['lp-title','lp-subtitle','lp-logo','lp-bg','lp-text','lp-accent',
               'lp-ring','lp-prog','lp-min','lp-max','lp-messages'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input',  refreshPreview);
      if (el) el.addEventListener('change', refreshPreview);
    });
    document.getElementById('lp-publish').addEventListener('click', publish);
  }

  async function render() {
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.innerHTML = shell();
    if (window.SA.layout) window.SA.layout.setCrumbs([
      { label: 'Super Admin' }, { label: 'Página de carregamento', strong: true }
    ]);
    bindStyles();

    try {
      st.current = await window.SA.api.loadingPages.get('default');
    } catch (e) {
      var msg = String(e.message || '');
      if (msg.indexOf('Could not find the table') >= 0 || msg.indexOf('does not exist') >= 0) {
        view.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-database" style="font-size:24px"></i><div style="font-weight:700;color:var(--sa-text)">Migração da Fase 4 não aplicada</div><div>Execute <code>db/super-admin/006_phase4_animations_loading.sql</code>.</div></div>';
        return;
      }
      window.SA.store.toast('Erro: ' + msg, 'err');
    }

    fillForm(st.current || {
      title: 'DoaVida', subtitle: 'Ação Social Semear · Belém, PA',
      logo_url: 'logo-semear.jpeg', background_color: '#faf9f5',
      text_color: '#1c1814', accent_color: '#4a8a39',
      show_ring: true, show_progress: true,
      min_duration_ms: 600, max_duration_ms: 4000,
      messages: ['Preparando…','Quase lá…']
    });
    bindForm();
    refreshPreview();
  }

  var stylesInjected = false;
  function bindStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var css = '' +
      '.lp-grid { display: grid; gap: 16px; grid-template-columns: minmax(0,1.1fr) minmax(0,1fr); align-items: start; }' +
      '@media (max-width: 1100px) { .lp-grid { grid-template-columns: 1fr; } }' +
      '.lp-color { width: 64px; height: 40px; padding: 4px; cursor: pointer; }' +

      '.lp-stage { padding: 14px; background: var(--sa-bg-soft); border: 1px solid var(--sa-line); border-radius: 12px; }' +
      '.lp-frame { --lp-accent: #4a8a39; position: relative; min-height: 360px; border-radius: 18px; overflow: hidden; display: grid; place-items: center; padding: 26px; gap: 12px; text-align: center; }' +
      '.lpv-ring { width: 96px; height: 96px; border-radius: 50%; border: 3px solid transparent; border-top-color: var(--lp-accent); border-right-color: var(--lp-accent); animation: lpv-spin 1.1s linear infinite; }' +
      '@keyframes lpv-spin { to { transform: rotate(360deg) } }' +
      '#lpv-logo { width: 76px; height: 114px; object-fit: cover; border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,.25); }' +
      '.lpv-title { font-family: "Playfair Display", Georgia, serif; font-size: 26px; }' +
      '.lpv-subtitle { font-size: 14px; opacity: .85; }' +
      '.lpv-progress { width: min(280px, 80%); height: 6px; background: rgba(0,0,0,.12); border-radius: 999px; overflow: hidden; }' +
      '.lpv-progress > span { display: block; height: 100%; width: 70%; background: linear-gradient(90deg, var(--lp-accent), #E8C96A); animation: lpv-prog 1.6s ease-in-out infinite; }' +
      '@keyframes lpv-prog { 0% { transform: translateX(-100%) } 100% { transform: translateX(60%) } }' +
      '.lpv-msg { font-size: 13px; opacity: .8; transition: opacity .2s ease; min-height: 18px; }';
    var styleEl = document.createElement('style');
    styleEl.id = 'sa-loading-page-styles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.loadingPage = { render: render };
})();
