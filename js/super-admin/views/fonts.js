/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/fonts.js                                       ║
  ║  Biblioteca de fontes com preview ao vivo (Google Fonts via @import).║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  var CATS = [
    { k: '',             l: 'Todas' },
    { k: 'sans-serif',   l: 'Sans-serif' },
    { k: 'serif',        l: 'Serif' },
    { k: 'display',      l: 'Display' },
    { k: 'handwriting',  l: 'Manuscrita' },
    { k: 'monospace',    l: 'Monospace' },
    { k: 'institucional',l: 'Institucional' },
    { k: 'elegante',     l: 'Elegante' }
  ];
  var LEVS = [
    { k: '',              l: 'Todos os níveis' },
    { k: 'iniciante',     l: 'Iniciante' },
    { k: 'intermediario', l: 'Intermediário' },
    { k: 'avancado',      l: 'Avançado' },
    { k: 'premium',       l: 'Premium' }
  ];

  var st = { filter: { category: '', level: '', q: '', page: 1, perPage: 24 }, items: [], total: 0, loadedKeys: {} };

  function shell() {
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<h2 class="sa-view__title">Fontes</h2>' +
          '<p class="sa-view__sub">Biblioteca paginada (preparada para 500+) — preview ao vivo de cada família.</p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<button class="sa-btn sa-btn--primary" id="fn-new"><i class="fa-solid fa-plus"></i><span>Nova fonte</span></button>' +
        '</div>' +
      '</header>' +
      '<section class="sa-panel" style="margin-bottom:14px">' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
          '<label class="sa-field" style="flex:1;min-width:220px"><span class="sa-field__label">Buscar</span>' +
            '<input id="fn-q" class="sa-field__input" type="search" placeholder="Inter, Playfair, Caveat…" /></label>' +
          '<label class="sa-field" style="min-width:180px"><span class="sa-field__label">Categoria</span>' +
            '<select id="fn-cat" class="sa-field__input">' + CATS.map(function (c) { return '<option value="' + escHtml(c.k) + '">' + escHtml(c.l) + '</option>'; }).join('') + '</select></label>' +
          '<label class="sa-field" style="min-width:180px"><span class="sa-field__label">Nível</span>' +
            '<select id="fn-level" class="sa-field__input">' + LEVS.map(function (l) { return '<option value="' + escHtml(l.k) + '">' + escHtml(l.l) + '</option>'; }).join('') + '</select></label>' +
        '</div>' +
      '</section>' +
      '<div id="fn-grid" class="fn-grid" aria-busy="true">' + skel() + '</div>' +
      '<footer style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:16px;color:var(--sa-text-soft);font-size:13px">' +
        '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="fn-prev"><i class="fa-solid fa-chevron-left"></i></button>' +
        '<span id="fn-page-info">Página 1</span>' +
        '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="fn-next"><i class="fa-solid fa-chevron-right"></i></button>' +
      '</footer>' +

      // Slide-in
      '<aside id="fn-edit" class="pd-edit" hidden>' +
        '<header class="pd-edit__head">' +
          '<strong id="fn-edit-title">Nova fonte</strong>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="fn-edit-close"><i class="fa-solid fa-xmark"></i></button>' +
        '</header>' +
        '<form class="pd-edit__body">' +
          '<input type="hidden" id="fn-id" />' +
          '<div class="sa-row">' +
            '<label class="sa-field"><span class="sa-field__label">Chave (única) *</span><input id="fn-key" class="sa-field__input" pattern="[a-z0-9-]+" maxlength="60" required /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Família *</span><input id="fn-family" class="sa-field__input" maxlength="80" required placeholder="ex.: Inter" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Categoria</span>' +
              '<select id="fn-edit-cat" class="sa-field__input">' + CATS.filter(function (c) { return c.k; }).map(function (c) { return '<option value="' + escHtml(c.k) + '">' + escHtml(c.l) + '</option>'; }).join('') + '</select></label>' +
            '<label class="sa-field"><span class="sa-field__label">Nível</span>' +
              '<select id="fn-edit-level" class="sa-field__input">' + LEVS.filter(function (l) { return l.k; }).map(function (l) { return '<option value="' + escHtml(l.k) + '">' + escHtml(l.l) + '</option>'; }).join('') + '</select></label>' +
          '</div>' +
          '<label class="sa-field"><span class="sa-field__label">URL @import (Google Fonts ou outro CDN) *</span>' +
            '<input id="fn-url" class="sa-field__input" required placeholder="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" /></label>' +
          '<label class="sa-field"><span class="sa-field__label">Pesos (JSON)</span>' +
            '<input id="fn-weights" class="sa-field__input" placeholder="[400,600,700]" /></label>' +
          '<label class="sa-field"><span class="sa-field__label">Texto de preview</span>' +
            '<input id="fn-preview" class="sa-field__input" maxlength="120" /></label>' +
          '<div id="fn-edit-preview" style="margin-top:8px;padding:14px;border:1px solid var(--sa-line);border-radius:10px;background:var(--sa-bg-soft);min-height:60px"></div>' +
        '</form>' +
        '<footer class="pd-edit__foot">' +
          '<button type="button" class="sa-btn sa-btn--danger" id="fn-delete" hidden><i class="fa-solid fa-trash"></i><span>Excluir</span></button>' +
          '<div style="flex:1"></div>' +
          '<button type="button" class="sa-btn sa-btn--primary" id="fn-save"><i class="fa-solid fa-floppy-disk"></i><span>Salvar</span></button>' +
        '</footer>' +
      '</aside>';
  }

  function skel() {
    var html = '';
    for (var i = 0; i < 6; i++) html += '<div class="fn-card"><div class="sa-skel" style="height:42px"></div><div class="sa-skel" style="height:14px;width:60%;margin-top:6px"></div></div>';
    return html;
  }

  /* ── Lazy-load do <link> da fonte ──────────────────────────────── */
  function ensureFontLoaded(font) {
    if (!font || !font.import_url) return;
    if (st.loadedKeys[font.font_key]) return;
    st.loadedKeys[font.font_key] = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = font.import_url;
    link.dataset.saFont = font.font_key;
    document.head.appendChild(link);
  }

  function renderGrid() {
    var grid = document.getElementById('fn-grid');
    if (!grid) return;
    grid.setAttribute('aria-busy','false');
    if (!st.items.length) {
      grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-regular fa-folder-open"></i><div>Nenhuma fonte com esses filtros.</div></div>';
      document.getElementById('fn-page-info').textContent = '—';
      return;
    }
    st.items.forEach(ensureFontLoaded);
    grid.innerHTML = st.items.map(function (f) {
      var preview = f.preview_text || 'A solidariedade transforma vidas.';
      return '<button class="fn-card" data-id="' + escHtml(f.id) + '" type="button" title="' + escHtml(f.family) + '">' +
        '<div class="fn-card__preview" style="font-family:\'' + escHtml(f.family) + '\', sans-serif">' + escHtml(preview) + '</div>' +
        '<div class="fn-card__meta">' +
          '<strong style="font-family:\'' + escHtml(f.family) + '\', sans-serif">' + escHtml(f.family) + '</strong>' +
          '<span>' + escHtml(f.category) + ' · ' + escHtml(f.level) + '</span>' +
        '</div>' +
        (f.built_in ? '<span class="fn-card__bi"><i class="fa-solid fa-lock"></i></span>' : '') +
      '</button>';
    }).join('');
    grid.querySelectorAll('.fn-card').forEach(function (b) {
      b.addEventListener('click', function () { openEdit(b.getAttribute('data-id')); });
    });
    var totalPages = Math.max(1, Math.ceil(st.total / st.filter.perPage));
    document.getElementById('fn-page-info').textContent = 'Página ' + st.filter.page + ' de ' + totalPages + ' · ' + st.total + ' fontes';
    document.getElementById('fn-prev').disabled = st.filter.page <= 1;
    document.getElementById('fn-next').disabled = st.filter.page >= totalPages;
  }

  async function load() {
    var grid = document.getElementById('fn-grid');
    if (grid) { grid.setAttribute('aria-busy','true'); grid.innerHTML = skel(); }
    try {
      var r = await window.SA.api.fonts.list(st.filter);
      st.items = r.items; st.total = r.total;
    } catch (e) {
      var msg = String(e.message || '');
      if (grid) {
        if (msg.indexOf('Could not find the table') >= 0 || msg.indexOf('does not exist') >= 0) {
          grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-solid fa-database" style="font-size:24px"></i><div style="font-weight:700;color:var(--sa-text)">Migração da Fase 5 não aplicada</div><div>Execute <code>db/super-admin/007_phase5_identity_receipts.sql</code>.</div></div>';
        } else grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-solid fa-triangle-exclamation"></i><div>' + escHtml(msg) + '</div></div>';
      }
      return;
    }
    renderGrid();
  }

  function openCreate() {
    document.getElementById('fn-id').value = '';
    document.getElementById('fn-key').value = '';
    document.getElementById('fn-family').value = '';
    document.getElementById('fn-edit-cat').value = 'sans-serif';
    document.getElementById('fn-edit-level').value = 'iniciante';
    document.getElementById('fn-url').value = '';
    document.getElementById('fn-weights').value = '[400,700]';
    document.getElementById('fn-preview').value = 'A solidariedade transforma vidas.';
    document.getElementById('fn-edit-title').textContent = 'Nova fonte';
    document.getElementById('fn-delete').hidden = true;
    document.getElementById('fn-edit').hidden = false;
    refreshEditPreview();
  }

  function openEdit(id) {
    var f = st.items.find(function (x) { return x.id === id; });
    if (!f) return;
    document.getElementById('fn-id').value = f.id;
    document.getElementById('fn-key').value = f.font_key;
    document.getElementById('fn-key').readOnly = !!f.built_in;
    document.getElementById('fn-family').value = f.family;
    document.getElementById('fn-edit-cat').value = f.category;
    document.getElementById('fn-edit-level').value = f.level;
    document.getElementById('fn-url').value = f.import_url;
    document.getElementById('fn-weights').value = JSON.stringify(f.weights || [400,700]);
    document.getElementById('fn-preview').value = f.preview_text || '';
    document.getElementById('fn-edit-title').textContent = (f.built_in ? '🔒 ' : '') + 'Editar · ' + f.family;
    document.getElementById('fn-delete').hidden = false;
    document.getElementById('fn-edit').hidden = false;
    refreshEditPreview();
  }

  function refreshEditPreview() {
    var family = document.getElementById('fn-family').value || 'sans-serif';
    var url    = document.getElementById('fn-url').value;
    var text   = document.getElementById('fn-preview').value || 'A solidariedade transforma vidas.';
    if (url) {
      // Carrega temp
      var existing = document.querySelector('link[data-sa-font-tmp]');
      if (existing) existing.remove();
      var l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = url; l.dataset.saFontTmp = '1';
      document.head.appendChild(l);
    }
    document.getElementById('fn-edit-preview').innerHTML =
      '<div style="font-family:\'' + escHtml(family) + '\',sans-serif;font-size:24px;line-height:1.2">' + escHtml(text) + '</div>' +
      '<div style="font-family:\'' + escHtml(family) + '\',sans-serif;font-size:14px;color:var(--sa-text-mute);margin-top:4px">' + escHtml(family) + '</div>';
  }

  async function save() {
    var weightsStr = document.getElementById('fn-weights').value || '[400,700]';
    var weights;
    try { weights = JSON.parse(weightsStr); } catch (e) { window.SA.store.toast('Pesos inválidos (use JSON, ex.: [400,700])', 'err'); return; }

    var d = {
      font_key:     document.getElementById('fn-key').value.trim(),
      family:       document.getElementById('fn-family').value.trim(),
      category:     document.getElementById('fn-edit-cat').value,
      level:        document.getElementById('fn-edit-level').value,
      import_url:   document.getElementById('fn-url').value.trim(),
      weights:      weights,
      preview_text: document.getElementById('fn-preview').value.trim()
    };
    if (!d.font_key) return window.SA.store.toast('Informe a chave', 'err');
    if (!/^[a-z0-9-]+$/.test(d.font_key)) return window.SA.store.toast('Chave inválida', 'err');
    if (!d.family)    return window.SA.store.toast('Informe a família', 'err');
    if (!d.import_url) return window.SA.store.toast('Informe a URL @import', 'err');

    var id = document.getElementById('fn-id').value;
    try {
      if (id) {
        await window.SA.api.fonts.update(id, d);
        window.SA.store.toast('Fonte atualizada', 'ok');
      } else {
        await window.SA.api.fonts.create(d);
        window.SA.store.toast('Fonte adicionada', 'ok');
      }
      document.getElementById('fn-edit').hidden = true;
      await load();
    } catch (e) {
      var msg = e.message || '';
      if (msg.indexOf('duplicate key') >= 0) msg = 'Já existe uma fonte com essa chave';
      window.SA.store.toast('Erro: ' + msg, 'err');
    }
  }

  async function deleteFont() {
    var id = document.getElementById('fn-id').value;
    if (!id) return;
    if (!confirm('Excluir esta fonte? (built-in vira inativa)')) return;
    try {
      await window.SA.api.fonts.remove(id);
      window.SA.store.toast('Fonte removida', 'ok');
      document.getElementById('fn-edit').hidden = true;
      await load();
    } catch (e) { window.SA.store.toast('Erro: ' + e.message, 'err'); }
  }

  function render() {
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.innerHTML = shell();
    if (window.SA.layout) window.SA.layout.setCrumbs([{ label: 'Super Admin' }, { label: 'Fontes', strong: true }]);
    var debounce = null;
    document.getElementById('fn-q').addEventListener('input', function (e) { clearTimeout(debounce); debounce = setTimeout(function () { st.filter.q = e.target.value; st.filter.page = 1; load(); }, 250); });
    document.getElementById('fn-cat').addEventListener('change',   function (e) { st.filter.category = e.target.value; st.filter.page = 1; load(); });
    document.getElementById('fn-level').addEventListener('change', function (e) { st.filter.level = e.target.value; st.filter.page = 1; load(); });
    document.getElementById('fn-prev').addEventListener('click',   function () { if (st.filter.page > 1) { st.filter.page--; load(); } });
    document.getElementById('fn-next').addEventListener('click',   function () { st.filter.page++; load(); });
    document.getElementById('fn-new').addEventListener('click',          openCreate);
    document.getElementById('fn-edit-close').addEventListener('click',   function () { document.getElementById('fn-edit').hidden = true; });
    document.getElementById('fn-save').addEventListener('click',         save);
    document.getElementById('fn-delete').addEventListener('click',       deleteFont);
    ['fn-family','fn-url','fn-preview'].forEach(function (id) { document.getElementById(id).addEventListener('input', refreshEditPreview); });
    bindStyles();
    load();
  }

  var stylesInjected = false;
  function bindStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var css = '' +
      '.fn-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }' +
      '.fn-card { position: relative; background: var(--sa-bg-elev); border: 1px solid var(--sa-line); border-radius: 14px; padding: 16px; cursor: pointer; transition: border-color .15s var(--sa-ease), transform .15s var(--sa-ease); display: flex; flex-direction: column; gap: 8px; text-align: left; }' +
      '.fn-card:hover { border-color: var(--sa-accent-2); transform: translateY(-2px); }' +
      '.fn-card__preview { font-size: 22px; line-height: 1.25; color: var(--sa-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
      '.fn-card__meta { display: flex; flex-direction: column; gap: 2px; color: var(--sa-text-mute); font-size: 12px; }' +
      '.fn-card__meta strong { font-size: 15px; color: var(--sa-text); }' +
      '.fn-card__bi { position: absolute; top: 8px; right: 8px; font-size: 11px; color: var(--sa-text-mute); background: var(--sa-bg-soft); border: 1px solid var(--sa-line); border-radius: 999px; padding: 2px 7px; }';
    var el = document.createElement('style'); el.id = 'sa-fonts-styles'; el.textContent = css; document.head.appendChild(el);
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.fonts = { render: render };
})();
