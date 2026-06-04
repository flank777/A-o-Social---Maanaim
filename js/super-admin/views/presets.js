/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/presets.js                                     ║
  ║  Biblioteca de animações/efeitos/3D/transições com preview ao vivo. ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  var TYPES = [
    { key: '',             label: 'Tudo' },
    { key: 'animation',    label: 'Animações' },
    { key: 'effect',       label: 'Efeitos' },
    { key: 'effect3d',     label: '3D' },
    { key: 'transition',   label: 'Transições' },
    { key: 'background',   label: 'Fundos' },
    { key: 'text_effect',  label: 'Texto' }
  ];
  var LEVELS = [
    { key: '',              label: 'Todos os níveis' },
    { key: 'iniciante',     label: 'Iniciante' },
    { key: 'intermediario', label: 'Intermediário' },
    { key: 'avancado',      label: 'Avançado' },
    { key: 'premium',       label: 'Premium' },
    { key: '3d',            label: '3D' }
  ];

  var st = { filter: { preset_type: '', level: '', q: '', page: 1, perPage: 24 }, total: 0, items: [], styleNode: null };

  function shell() {
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<h2 class="sa-view__title">Animações & Efeitos</h2>' +
          '<p class="sa-view__sub">Biblioteca paginada de animações, efeitos, 3D e transições. Cada preset é um <code>data-sa-anim</code>.</p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<button class="sa-btn sa-btn--primary" id="pr-new"><i class="fa-solid fa-plus"></i><span>Novo preset</span></button>' +
        '</div>' +
      '</header>' +

      '<section class="sa-panel" style="margin-bottom:14px">' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">' +
          '<label class="sa-field" style="flex:1;min-width:220px">' +
            '<span class="sa-field__label">Buscar</span>' +
            '<input id="pr-q" class="sa-field__input" type="search" placeholder="Buscar por nome…" />' +
          '</label>' +
          '<label class="sa-field" style="min-width:180px">' +
            '<span class="sa-field__label">Tipo</span>' +
            '<select id="pr-type" class="sa-field__input">' +
              TYPES.map(function (t) { return '<option value="' + escHtml(t.key) + '">' + escHtml(t.label) + '</option>'; }).join('') +
            '</select>' +
          '</label>' +
          '<label class="sa-field" style="min-width:180px">' +
            '<span class="sa-field__label">Nível</span>' +
            '<select id="pr-level" class="sa-field__input">' +
              LEVELS.map(function (l) { return '<option value="' + escHtml(l.key) + '">' + escHtml(l.label) + '</option>'; }).join('') +
            '</select>' +
          '</label>' +
        '</div>' +
      '</section>' +

      '<div id="pr-grid" class="pr-grid" aria-busy="true">' + skel() + '</div>' +

      '<footer style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:16px;color:var(--sa-text-soft);font-size:13px">' +
        '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="pr-prev"><i class="fa-solid fa-chevron-left"></i></button>' +
        '<span id="pr-page-info">Página 1</span>' +
        '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="pr-next"><i class="fa-solid fa-chevron-right"></i></button>' +
      '</footer>' +

      // Slide-in editor
      '<aside id="pr-edit" class="pd-edit" hidden>' +
        '<header class="pd-edit__head">' +
          '<strong id="pr-edit-title">Novo preset</strong>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="pr-edit-close"><i class="fa-solid fa-xmark"></i></button>' +
        '</header>' +
        '<form id="pr-form" class="pd-edit__body">' +
          '<input type="hidden" id="pr-id" />' +
          '<div class="sa-row">' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Chave (única) *</span>' +
              '<input class="sa-field__input" id="pr-key" pattern="[a-z0-9-]+" maxlength="60" required />' +
            '</label>' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Nome *</span>' +
              '<input class="sa-field__input" id="pr-name" maxlength="80" required />' +
            '</label>' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Tipo</span>' +
              '<select class="sa-field__input" id="pr-edit-type">' +
                TYPES.filter(function (t) { return !!t.key; }).map(function (t) { return '<option value="' + escHtml(t.key) + '">' + escHtml(t.label) + '</option>'; }).join('') +
              '</select>' +
            '</label>' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Nível</span>' +
              '<select class="sa-field__input" id="pr-edit-level">' +
                LEVELS.filter(function (l) { return !!l.key; }).map(function (l) { return '<option value="' + escHtml(l.key) + '">' + escHtml(l.label) + '</option>'; }).join('') +
              '</select>' +
            '</label>' +
          '</div>' +
          '<label class="sa-field">' +
            '<span class="sa-field__label">Descrição</span>' +
            '<input class="sa-field__input" id="pr-desc" maxlength="200" />' +
          '</label>' +
          '<label class="sa-field">' +
            '<span class="sa-field__label">CSS *</span>' +
            '<textarea class="sa-field__input" id="pr-css" rows="10" spellcheck="false" style="font-family:Space Mono, monospace; font-size:12.5px" placeholder="@keyframes meu-fade { from { opacity:0 } to { opacity:1 } }\n[data-sa-anim=\\"meu-fade\\"] { animation: meu-fade .5s ease both; }"></textarea>' +
            '<span style="color:var(--sa-text-mute);font-size:11.5px">Use <code>[data-sa-anim="<chave>"]</code> como seletor para que o preset se aplique automaticamente.</span>' +
          '</label>' +
          '<div id="pr-edit-preview" style="margin-top:8px;padding:14px;border:1px solid var(--sa-line);border-radius:10px;background:var(--sa-bg-soft);min-height:80px;display:flex;align-items:center;justify-content:center"></div>' +
        '</form>' +
        '<footer class="pd-edit__foot">' +
          '<button type="button" class="sa-btn sa-btn--danger"  id="pr-delete" hidden><i class="fa-solid fa-trash"></i><span>Excluir</span></button>' +
          '<div style="flex:1"></div>' +
          '<button type="button" class="sa-btn sa-btn--soft"    id="pr-preview-refresh"><i class="fa-solid fa-rotate"></i><span>Recarregar preview</span></button>' +
          '<button type="button" class="sa-btn sa-btn--primary" id="pr-save"><i class="fa-solid fa-floppy-disk"></i><span>Salvar</span></button>' +
        '</footer>' +
      '</aside>';
  }

  function skel() {
    var html = '';
    for (var i = 0; i < 9; i++) html += '<div class="pr-card"><div class="sa-skel" style="height:80px;border-radius:10px"></div><div class="sa-skel" style="height:14px;width:60%;margin-top:8px"></div></div>';
    return html;
  }

  /* ── Aplica CSS de um preset numa <style> dedicada ─────────────── */
  function injectPresetCSS(items) {
    if (!st.styleNode) {
      st.styleNode = document.createElement('style');
      st.styleNode.id = 'sa-presets-runtime';
      document.head.appendChild(st.styleNode);
    }
    st.styleNode.textContent = items.map(function (p) { return '/* ' + p.preset_key + ' */ ' + (p.css || ''); }).join('\n\n');
  }

  function previewElementHtml(p) {
    // Preview "neutro" — um chip com texto + classe `data-sa-anim`
    var label = p.preset_name || p.preset_key;
    if (p.preset_type === 'text_effect') {
      return '<span data-sa-anim="' + escHtml(p.preset_key) + '" style="font-size:22px;font-weight:700">' + escHtml(label) + '</span>';
    }
    if (p.preset_type === 'background') {
      return '<div data-sa-anim="' + escHtml(p.preset_key) + '" style="width:100%;height:60px;border-radius:8px"></div>';
    }
    if (p.preset_type === 'transition') {
      return '<button data-sa-trans="' + escHtml(p.preset_key.replace(/^trans-/,'')) + '" class="pr-demo-btn">passe o mouse</button>';
    }
    return '<button data-sa-anim="' + escHtml(p.preset_key) + '" class="pr-demo-btn">' + escHtml(label) + '</button>';
  }

  function renderGrid() {
    var grid = document.getElementById('pr-grid');
    if (!grid) return;
    grid.setAttribute('aria-busy','false');
    if (!st.items.length) {
      grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-regular fa-folder-open"></i><div>Nenhum preset com esses filtros.</div></div>';
      document.getElementById('pr-page-info').textContent = '—';
      return;
    }
    injectPresetCSS(st.items);

    grid.innerHTML = st.items.map(function (p) {
      return '<button class="pr-card" data-id="' + escHtml(p.id) + '" type="button" title="' + escHtml(p.description || '') + '">' +
        '<div class="pr-card__stage">' + previewElementHtml(p) + '</div>' +
        '<div class="pr-card__meta">' +
          '<strong>' + escHtml(p.preset_name) + '</strong>' +
          '<span class="pr-card__chip">' + escHtml(p.preset_type) + ' · ' + escHtml(p.level) + '</span>' +
        '</div>' +
        (p.built_in ? '<span class="pr-card__bi" title="Preset embutido (não exclui — só inativa)"><i class="fa-solid fa-lock"></i></span>' : '') +
      '</button>';
    }).join('');

    grid.querySelectorAll('.pr-card').forEach(function (b) {
      b.addEventListener('click', function () { openEdit(b.getAttribute('data-id')); });
    });

    var totalPages = Math.max(1, Math.ceil(st.total / st.filter.perPage));
    document.getElementById('pr-page-info').textContent =
      'Página ' + st.filter.page + ' de ' + totalPages + ' · ' + st.total + ' presets';
    document.getElementById('pr-prev').disabled = st.filter.page <= 1;
    document.getElementById('pr-next').disabled = st.filter.page >= totalPages;
  }

  async function load() {
    var grid = document.getElementById('pr-grid');
    if (grid) { grid.setAttribute('aria-busy','true'); grid.innerHTML = skel(); }
    try {
      var res = await window.SA.api.presets.list(st.filter);
      st.items = res.items;
      st.total = res.total;
    } catch (e) {
      var msg = String(e.message || '');
      if (grid) {
        if (msg.indexOf('Could not find the table') >= 0 || msg.indexOf('does not exist') >= 0) {
          grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-solid fa-database" style="font-size:24px"></i><div style="font-weight:700;color:var(--sa-text)">Migração da Fase 4 não aplicada</div><div>Execute <code>db/super-admin/006_phase4_animations_loading.sql</code>.</div></div>';
        } else {
          grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-solid fa-triangle-exclamation"></i><div>Erro: ' + escHtml(msg) + '</div></div>';
        }
      }
      return;
    }
    renderGrid();
  }

  /* ── Edit pane ─────────────────────────────────────────────────── */
  function openCreate() {
    document.getElementById('pr-id').value      = '';
    document.getElementById('pr-key').value     = '';
    document.getElementById('pr-name').value    = '';
    document.getElementById('pr-edit-type').value  = 'animation';
    document.getElementById('pr-edit-level').value = 'iniciante';
    document.getElementById('pr-desc').value    = '';
    document.getElementById('pr-css').value     = '';
    document.getElementById('pr-edit-title').textContent = 'Novo preset';
    document.getElementById('pr-delete').hidden = true;
    document.getElementById('pr-edit').hidden = false;
    refreshPreview();
  }

  function openEdit(id) {
    var p = st.items.find(function (x) { return x.id === id; });
    if (!p) return;
    document.getElementById('pr-id').value      = p.id;
    document.getElementById('pr-key').value     = p.preset_key;
    document.getElementById('pr-name').value    = p.preset_name;
    document.getElementById('pr-edit-type').value  = p.preset_type;
    document.getElementById('pr-edit-level').value = p.level;
    document.getElementById('pr-desc').value    = p.description || '';
    document.getElementById('pr-css').value     = p.css || '';
    document.getElementById('pr-edit-title').textContent = (p.built_in ? '🔒 ' : '') + 'Editar · ' + p.preset_name;
    document.getElementById('pr-delete').hidden = false;
    document.getElementById('pr-key').readOnly = !!p.built_in;
    document.getElementById('pr-edit').hidden = false;
    refreshPreview();
  }

  function closeEdit() { document.getElementById('pr-edit').hidden = true; }

  function refreshPreview() {
    var stage = document.getElementById('pr-edit-preview');
    if (!stage) return;
    var key  = document.getElementById('pr-key').value.trim() || 'preview-temp';
    var type = document.getElementById('pr-edit-type').value;
    var name = document.getElementById('pr-name').value || key;
    var css  = document.getElementById('pr-css').value || '';

    // Estilo temporário só para o preview
    var tmpId = 'sa-preset-tmp';
    var tmp = document.getElementById(tmpId);
    if (!tmp) { tmp = document.createElement('style'); tmp.id = tmpId; document.head.appendChild(tmp); }
    tmp.textContent = css;

    stage.innerHTML = previewElementHtml({ preset_key: key, preset_name: name, preset_type: type });
  }

  async function save() {
    var data = {
      preset_key:  document.getElementById('pr-key').value.trim(),
      preset_name: document.getElementById('pr-name').value.trim(),
      preset_type: document.getElementById('pr-edit-type').value,
      level:       document.getElementById('pr-edit-level').value,
      description: document.getElementById('pr-desc').value.trim(),
      css:         document.getElementById('pr-css').value
    };
    if (!data.preset_key) { window.SA.store.toast('Informe a chave.', 'err'); return; }
    if (!/^[a-z0-9-]+$/.test(data.preset_key)) { window.SA.store.toast('Chave inválida (a-z, 0-9, -).', 'err'); return; }
    if (!data.preset_name) { window.SA.store.toast('Informe o nome.', 'err'); return; }
    if (!data.css.trim())  { window.SA.store.toast('Informe o CSS.', 'err'); return; }

    var id = document.getElementById('pr-id').value;
    try {
      if (id) {
        await window.SA.api.presets.update(id, data);
        window.SA.store.toast('Preset atualizado', 'ok');
      } else {
        await window.SA.api.presets.create(data);
        window.SA.store.toast('Preset criado', 'ok');
      }
      closeEdit();
      await load();
    } catch (e) {
      var msg = e.message || '';
      if (msg.indexOf('duplicate key') >= 0) msg = 'Já existe um preset com essa chave.';
      window.SA.store.toast('Erro: ' + msg, 'err');
    }
  }

  async function deletePreset() {
    var id = document.getElementById('pr-id').value;
    if (!id) return;
    if (!confirm('Excluir este preset? (built-in vira inativo)')) return;
    try {
      await window.SA.api.presets.remove(id);
      window.SA.store.toast('Preset removido', 'ok');
      closeEdit();
      await load();
    } catch (e) {
      window.SA.store.toast('Erro: ' + e.message, 'err');
    }
  }

  function bindFilters() {
    var debounce = null;
    document.getElementById('pr-q').addEventListener('input', function (e) {
      clearTimeout(debounce);
      debounce = setTimeout(function () { st.filter.q = e.target.value; st.filter.page = 1; load(); }, 250);
    });
    document.getElementById('pr-type').addEventListener('change',  function (e) { st.filter.preset_type = e.target.value; st.filter.page = 1; load(); });
    document.getElementById('pr-level').addEventListener('change', function (e) { st.filter.level = e.target.value; st.filter.page = 1; load(); });
    document.getElementById('pr-prev').addEventListener('click',   function () { if (st.filter.page > 1) { st.filter.page--; load(); } });
    document.getElementById('pr-next').addEventListener('click',   function () { st.filter.page++; load(); });
  }

  function bindEdit() {
    document.getElementById('pr-new').addEventListener('click',          openCreate);
    document.getElementById('pr-edit-close').addEventListener('click',   closeEdit);
    document.getElementById('pr-save').addEventListener('click',         save);
    document.getElementById('pr-delete').addEventListener('click',       deletePreset);
    document.getElementById('pr-preview-refresh').addEventListener('click', refreshPreview);
    ['pr-css','pr-key','pr-name','pr-edit-type'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', refreshPreview);
    });
  }

  function render() {
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.innerHTML = shell();
    if (window.SA.layout) window.SA.layout.setCrumbs([
      { label: 'Super Admin' }, { label: 'Animações & Efeitos', strong: true }
    ]);
    bindFilters();
    bindEdit();
    bindStyles();
    load();
  }

  var stylesInjected = false;
  function bindStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var css = '' +
      '.pr-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }' +
      '.pr-card { position: relative; background: var(--sa-bg-elev); border: 1px solid var(--sa-line); border-radius: 14px; padding: 12px; cursor: pointer; transition: border-color .15s var(--sa-ease), transform .15s var(--sa-ease); display: flex; flex-direction: column; gap: 8px; text-align: left; min-width: 0; }' +
      '.pr-card:hover { border-color: var(--sa-accent-2); transform: translateY(-2px); }' +
      '.pr-card__stage { display: grid; place-items: center; min-height: 90px; padding: 8px; border-radius: 10px; background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.04)); border: 1px solid var(--sa-line); }' +
      '.pr-card__meta { display: flex; flex-direction: column; gap: 2px; }' +
      '.pr-card__meta strong { font-size: 13px; }' +
      '.pr-card__chip { font-size: 11px; color: var(--sa-text-mute); }' +
      '.pr-card__bi { position: absolute; top: 8px; right: 8px; font-size: 11px; color: var(--sa-text-mute); background: var(--sa-bg-soft); border: 1px solid var(--sa-line); border-radius: 999px; padding: 2px 7px; }' +
      '.pr-demo-btn { padding: 8px 14px; border-radius: 999px; background: var(--sa-accent); color: #fff; border: 0; font: inherit; font-weight: 600; cursor: pointer; }';
    var styleEl = document.createElement('style');
    styleEl.id = 'sa-presets-styles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.presets = { render: render };
})();
