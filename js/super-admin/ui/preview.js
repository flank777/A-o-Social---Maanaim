/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · ui/preview.js                                        ║
  ║  Componente Preview Responsivo: iframe + moldura de dispositivo +   ║
  ║  tamanho personalizado + fullscreen + zoom + recarregar.            ║
  ╚══════════════════════════════════════════════════════════════════════╝

  USO:
    var p = SA.preview.mount(containerEl, { url: 'index.html', device: 'iPhone 14' });
    p.setUrl('form.html');
    p.setDevice('iPad Air');
    p.setCustomSize(390, 844);
    p.toggleFullscreen();
    p.refresh();
    p.destroy();
*/
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  /* ── Cache de presets de dispositivo (carregado uma vez do banco) ── */
  var devicesCache = null;

  async function loadDevices() {
    if (devicesCache) return devicesCache;
    try {
      var sb = window.supabaseClient;
      var res = await sb.from('site_device_presets').select('*').eq('status','active').order('order_index');
      if (!res.error && res.data) {
        devicesCache = res.data;
        return devicesCache;
      }
    } catch (e) {}
    // Fallback (caso a Fase 1 ainda não tenha sido aplicada): 6 modelos básicos
    devicesCache = [
      { device_name: 'iPhone SE',       device_type: 'mobile',  width: 375,  height: 667, pixel_ratio: 2 },
      { device_name: 'iPhone 14',       device_type: 'mobile',  width: 390,  height: 844, pixel_ratio: 3 },
      { device_name: 'Galaxy S23',      device_type: 'mobile',  width: 360,  height: 780, pixel_ratio: 3 },
      { device_name: 'iPad Air',        device_type: 'tablet',  width: 820,  height: 1180, pixel_ratio: 2 },
      { device_name: 'Notebook 14"',    device_type: 'desktop', width: 1366, height: 768, pixel_ratio: 1 },
      { device_name: 'Full HD',         device_type: 'desktop', width: 1920, height: 1080, pixel_ratio: 1 }
    ];
    return devicesCache;
  }

  function deviceTypeIcon(type) {
    return type === 'mobile' ? 'fa-mobile-screen'
         : type === 'tablet' ? 'fa-tablet-screen-button'
         : 'fa-desktop';
  }

  /* ── Mount ─────────────────────────────────────────────────────── */
  function mount(container, opts) {
    opts = opts || {};
    container.innerHTML = chrome();
    bindStyles();

    var iframe   = container.querySelector('.sa-pv__frame');
    var stage    = container.querySelector('.sa-pv__stage');
    var sizeEl   = container.querySelector('.sa-pv__size');
    var deviceSel= container.querySelector('#sa-pv-device');
    var orient   = container.querySelector('#sa-pv-orient');
    var widthIn  = container.querySelector('#sa-pv-w');
    var heightIn = container.querySelector('#sa-pv-h');
    var zoomIn   = container.querySelector('#sa-pv-zoom');
    var fsBtn    = container.querySelector('#sa-pv-fs');
    var refBtn   = container.querySelector('#sa-pv-ref');
    var openBtn  = container.querySelector('#sa-pv-open');

    var state = {
      url:        opts.url || 'index.html',
      device:     opts.device || 'iPhone 14',
      width:      390,
      height:     844,
      orientation:'portrait',
      zoom:       1,
      fullscreen: false
    };

    // Popula select de dispositivos
    loadDevices().then(function (list) {
      // Agrupa por tipo
      var groups = { mobile: [], tablet: [], desktop: [] };
      list.forEach(function (d) { (groups[d.device_type] || groups.desktop).push(d); });

      var html = '';
      ['mobile','tablet','desktop'].forEach(function (kind) {
        if (!groups[kind].length) return;
        var label = kind === 'mobile' ? 'Celular' : kind === 'tablet' ? 'Tablet' : 'Desktop';
        html += '<optgroup label="' + label + '">';
        groups[kind].forEach(function (d) {
          html += '<option value="' + escHtml(d.device_name) + '" data-w="' + d.width + '" data-h="' + d.height + '">' +
                  escHtml(d.device_name) + ' · ' + d.width + '×' + d.height +
                  '</option>';
        });
        html += '</optgroup>';
      });
      html += '<optgroup label="Avançado"><option value="__custom">Tamanho personalizado…</option></optgroup>';
      deviceSel.innerHTML = html;

      // Aplica device inicial
      applyDevice(state.device);
    });

    function applyDevice(name) {
      var sel = deviceSel.querySelector('option[value="' + cssEscape(name) + '"]');
      if (!sel) {
        // Padrão se não encontrar
        sel = deviceSel.querySelector('option[value="iPhone 14"]') || deviceSel.querySelector('option');
      }
      if (!sel) return;
      deviceSel.value = sel.value;
      if (sel.value === '__custom') {
        widthIn.disabled = false;
        heightIn.disabled = false;
        return;
      }
      widthIn.disabled = false;
      heightIn.disabled = false;
      state.width  = parseInt(sel.getAttribute('data-w'), 10);
      state.height = parseInt(sel.getAttribute('data-h'), 10);
      widthIn.value  = state.width;
      heightIn.value = state.height;
      reflect();
    }

    function reflect() {
      var w = state.width, h = state.height;
      if (state.orientation === 'landscape') { var t = w; w = h; h = t; }
      iframe.style.width  = w + 'px';
      iframe.style.height = h + 'px';
      iframe.style.transform = 'scale(' + state.zoom + ')';
      iframe.style.transformOrigin = 'top center';
      sizeEl.textContent = w + ' × ' + h + ' · ' + Math.round(state.zoom * 100) + '%';
    }

    function setUrl(url) {
      state.url = url;
      iframe.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_sa_preview=' + Date.now();
    }
    function setDevice(name) { state.device = name; applyDevice(name); }
    function setCustomSize(w, h) {
      state.width = w; state.height = h;
      deviceSel.value = '__custom';
      widthIn.value = w; heightIn.value = h;
      reflect();
    }
    function toggleFullscreen() {
      state.fullscreen = !state.fullscreen;
      container.classList.toggle('is-fullscreen', state.fullscreen);
      fsBtn.querySelector('span').textContent = state.fullscreen ? 'Sair da tela cheia' : 'Tela cheia';
    }
    function refresh() { setUrl(state.url); }
    function openInNewTab() { window.open(state.url, '_blank', 'noopener'); }
    function destroy() { container.innerHTML = ''; }

    // Bindings
    deviceSel.addEventListener('change', function () {
      if (deviceSel.value === '__custom') {
        widthIn.disabled = false; heightIn.disabled = false; return;
      }
      var opt = deviceSel.selectedOptions[0];
      if (!opt) return;
      state.device = opt.value;
      state.width  = parseInt(opt.getAttribute('data-w'),10);
      state.height = parseInt(opt.getAttribute('data-h'),10);
      widthIn.value = state.width; heightIn.value = state.height;
      reflect();
    });
    orient.addEventListener('change', function () {
      state.orientation = orient.value;
      reflect();
    });
    widthIn.addEventListener('input',  function () { var v = parseInt(widthIn.value,10);  if (v>=120 && v<=4000)  { state.width=v;  reflect(); }});
    heightIn.addEventListener('input', function () { var v = parseInt(heightIn.value,10); if (v>=120 && v<=4000)  { state.height=v; reflect(); }});
    zoomIn.addEventListener('input',   function () { state.zoom = parseFloat(zoomIn.value) || 1; reflect(); });
    refBtn.addEventListener('click', refresh);
    fsBtn.addEventListener('click',  toggleFullscreen);
    openBtn.addEventListener('click', openInNewTab);

    // Esc sai do fullscreen
    container.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.fullscreen) toggleFullscreen();
    });

    // URL inicial
    iframe.addEventListener('load', function () {
      stage.classList.remove('is-loading');
    });
    setUrl(state.url);
    stage.classList.add('is-loading');

    return {
      setUrl: setUrl,
      setDevice: setDevice,
      setCustomSize: setCustomSize,
      toggleFullscreen: toggleFullscreen,
      refresh: refresh,
      destroy: destroy,
      element: container
    };
  }

  // CSS.escape com fallback para ES5
  function cssEscape(v) {
    if (window.CSS && CSS.escape) return CSS.escape(v);
    return String(v).replace(/(["\\\[\]])/g, '\\$1');
  }

  /* ── Chrome (HTML do componente) ───────────────────────────────── */
  function chrome() {
    return '' +
      '<div class="sa-pv">' +
        '<div class="sa-pv__bar">' +
          '<label class="sa-pv__field">' +
            '<i class="fa-solid fa-mobile-screen" aria-hidden="true"></i>' +
            '<select id="sa-pv-device" aria-label="Dispositivo"></select>' +
          '</label>' +

          '<label class="sa-pv__field">' +
            '<i class="fa-solid fa-rotate" aria-hidden="true"></i>' +
            '<select id="sa-pv-orient" aria-label="Orientação">' +
              '<option value="portrait">Retrato</option>' +
              '<option value="landscape">Paisagem</option>' +
            '</select>' +
          '</label>' +

          '<label class="sa-pv__field sa-pv__field--num" title="Largura (px)">' +
            '<span>L</span><input id="sa-pv-w" type="number" min="120" max="4000" aria-label="Largura" />' +
          '</label>' +
          '<label class="sa-pv__field sa-pv__field--num" title="Altura (px)">' +
            '<span>A</span><input id="sa-pv-h" type="number" min="120" max="4000" aria-label="Altura" />' +
          '</label>' +
          '<label class="sa-pv__field sa-pv__field--zoom" title="Zoom">' +
            '<i class="fa-solid fa-magnifying-glass-plus"></i>' +
            '<input id="sa-pv-zoom" type="range" min="0.25" max="1.5" step="0.05" value="1" aria-label="Zoom" />' +
          '</label>' +

          '<div class="sa-pv__sep" aria-hidden="true"></div>' +

          '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="sa-pv-ref"  title="Recarregar"><i class="fa-solid fa-rotate"></i></button>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="sa-pv-open" title="Abrir em nova aba"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>' +
          '<button class="sa-btn sa-btn--soft" id="sa-pv-fs"><i class="fa-solid fa-expand"></i><span>Tela cheia</span></button>' +
        '</div>' +

        '<div class="sa-pv__stage">' +
          '<div class="sa-pv__loader"><div class="sa-skel" style="width:40%;height:14px;margin-bottom:6px"></div><div class="sa-skel" style="width:70%;height:14px"></div></div>' +
          '<iframe class="sa-pv__frame" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" referrerpolicy="no-referrer" loading="lazy" title="Preview do site"></iframe>' +
        '</div>' +

        '<div class="sa-pv__foot">' +
          '<span class="sa-pv__size">— × — · 100%</span>' +
        '</div>' +
      '</div>';
  }

  /* ── Estilos isolados (injeta uma vez) ─────────────────────────── */
  var stylesInjected = false;
  function bindStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var css = '' +
      '.sa-pv { display: grid; grid-template-rows: auto 1fr auto; gap: 10px; }' +
      '.sa-pv__bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px; background: var(--sa-bg-soft); border: 1px solid var(--sa-line); border-radius: 12px; }' +
      '.sa-pv__field { display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; border: 1px solid var(--sa-line); border-radius: 8px; background: var(--sa-bg-elev); color: var(--sa-text-soft); font-size: 13px; }' +
      '.sa-pv__field i, .sa-pv__field span { color: var(--sa-text-mute); font-weight: 600; }' +
      '.sa-pv__field select, .sa-pv__field input { background: transparent; color: var(--sa-text); border: 0; outline: 0; font: inherit; font-size: 13px; min-width: 60px; max-width: 220px; }' +
      '.sa-pv__field--num input { width: 76px; }' +
      '.sa-pv__field--zoom input { width: 130px; }' +
      '.sa-pv__sep { flex: 1; }' +

      '.sa-pv__stage { position: relative; background: repeating-conic-gradient(rgba(255,255,255,.018) 0% 25%, transparent 0% 50%) 50%/24px 24px; border: 1px solid var(--sa-line); border-radius: 14px; overflow: auto; padding: 24px; min-height: 480px; display: flex; align-items: flex-start; justify-content: center; }' +
      '.sa-pv__stage.is-loading::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(0,0,0,.18)); pointer-events: none; }' +
      '.sa-pv__loader { position: absolute; inset: auto 0 0 0; padding: 8px 14px; }' +
      '.sa-pv__frame { background: #fff; border: 0; border-radius: 18px; box-shadow: 0 30px 60px rgba(0,0,0,.5), 0 1px 0 rgba(255,255,255,.05) inset; transition: width .25s var(--sa-ease), height .25s var(--sa-ease), transform .25s var(--sa-ease); }' +

      '.sa-pv__foot { display: flex; justify-content: flex-end; }' +
      '.sa-pv__size { font-family: "Space Mono", monospace; font-size: 12px; color: var(--sa-text-mute); padding: 6px 10px; background: var(--sa-bg-soft); border: 1px solid var(--sa-line); border-radius: 999px; }' +

      /* Fullscreen */
      '.is-fullscreen { position: fixed !important; inset: 0; z-index: 999; background: var(--sa-bg); padding: 14px; }' +
      '.is-fullscreen .sa-pv__stage { min-height: calc(100vh - 110px); }' +

      '@media (max-width: 700px) {' +
      '  .sa-pv__field--num input { width: 60px; }' +
      '  .sa-pv__field--zoom input { width: 90px; }' +
      '}';

    var st = document.createElement('style');
    st.id = 'sa-preview-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ── Export ────────────────────────────────────────────────────── */
  window.SA = window.SA || {};
  window.SA.preview = { mount: mount };
})();
