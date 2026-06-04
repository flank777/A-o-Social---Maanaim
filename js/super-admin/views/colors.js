/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/colors.js                                      ║
  ║  Editor de paletas de cores reutilizáveis.                          ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  // Tokens semânticos da paleta. Pode crescer livremente sem migração.
  var TOKEN_KEYS = ['primary','secondary','accent','background','surface','text','text_soft','border'];
  var TOKEN_LABELS = {
    primary: 'Primária', secondary: 'Secundária', accent: 'Destaque',
    background: 'Fundo', surface: 'Superfície',
    text: 'Texto principal', text_soft: 'Texto secundário', border: 'Borda'
  };

  var st = { items: [], selectedId: null };

  function shell() {
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<h2 class="sa-view__title">Cores & Paletas</h2>' +
          '<p class="sa-view__sub">Paletas reutilizáveis com tokens semânticos. Defina uma como padrão para o site.</p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<button class="sa-btn sa-btn--primary" id="cl-new"><i class="fa-solid fa-plus"></i><span>Nova paleta</span></button>' +
        '</div>' +
      '</header>' +
      '<div id="cl-grid" class="cl-grid" aria-busy="true">' + skel() + '</div>' +

      '<aside id="cl-edit" class="pd-edit" hidden>' +
        '<header class="pd-edit__head"><strong id="cl-edit-title">Editar paleta</strong>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="cl-edit-close"><i class="fa-solid fa-xmark"></i></button></header>' +
        '<form class="pd-edit__body">' +
          '<input type="hidden" id="cl-id" />' +
          '<div class="sa-row">' +
            '<label class="sa-field"><span class="sa-field__label">Chave (única) *</span><input id="cl-key" class="sa-field__input" pattern="[a-z0-9-]+" maxlength="60" required /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Nome *</span><input id="cl-name" class="sa-field__input" maxlength="80" required /></label>' +
          '</div>' +
          '<label class="sa-field"><span class="sa-field__label">Descrição</span><input id="cl-desc" class="sa-field__input" maxlength="200" /></label>' +
          '<div id="cl-tokens" class="cl-tokens"></div>' +
          '<div id="cl-preview" class="cl-preview"></div>' +
        '</form>' +
        '<footer class="pd-edit__foot">' +
          '<button type="button" class="sa-btn sa-btn--danger" id="cl-delete" hidden><i class="fa-solid fa-trash"></i><span>Excluir</span></button>' +
          '<div style="flex:1"></div>' +
          '<button type="button" class="sa-btn sa-btn--ghost" id="cl-default" hidden><i class="fa-solid fa-star"></i><span>Tornar padrão</span></button>' +
          '<button type="button" class="sa-btn sa-btn--primary" id="cl-save"><i class="fa-solid fa-floppy-disk"></i><span>Salvar</span></button>' +
        '</footer>' +
      '</aside>';
  }
  function skel() {
    var html = '';
    for (var i = 0; i < 4; i++) html += '<div class="cl-card"><div class="sa-skel" style="height:80px;border-radius:10px"></div></div>';
    return html;
  }

  function renderGrid() {
    var grid = document.getElementById('cl-grid');
    if (!grid) return;
    grid.setAttribute('aria-busy','false');
    if (!st.items.length) {
      grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-regular fa-folder-open"></i><div>Nenhuma paleta. Crie a primeira.</div></div>';
      return;
    }
    grid.innerHTML = st.items.map(function (p) {
      var t = p.tokens || {};
      var swatches = TOKEN_KEYS.slice(0, 5).map(function (k) {
        return '<span class="cl-card__sw" style="background:' + escHtml(t[k] || '#888') + '" title="' + escHtml(k) + ': ' + escHtml(t[k] || '') + '"></span>';
      }).join('');
      var def = p.is_default ? '<span class="cl-card__chip"><i class="fa-solid fa-star"></i> padrão</span>' : '';
      return '<button class="cl-card" data-id="' + escHtml(p.id) + '" type="button">' +
        '<div class="cl-card__sws">' + swatches + '</div>' +
        '<div class="cl-card__meta"><strong>' + escHtml(p.name) + '</strong>' + def + '</div>' +
        (p.description ? '<small style="color:var(--sa-text-mute)">' + escHtml(p.description) + '</small>' : '') +
        (p.built_in ? '<span class="fn-card__bi"><i class="fa-solid fa-lock"></i></span>' : '') +
      '</button>';
    }).join('');
    grid.querySelectorAll('.cl-card').forEach(function (b) {
      b.addEventListener('click', function () { openEdit(b.getAttribute('data-id')); });
    });
  }

  async function load() {
    var grid = document.getElementById('cl-grid');
    if (grid) { grid.setAttribute('aria-busy','true'); grid.innerHTML = skel(); }
    try { st.items = await window.SA.api.palettes.list(); }
    catch (e) {
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

  function fillTokenInputs(tokens) {
    var box = document.getElementById('cl-tokens');
    box.innerHTML = TOKEN_KEYS.map(function (k) {
      var v = tokens && tokens[k] ? tokens[k] : '';
      var isHex = /^#[0-9a-f]{3,8}$/i.test(v);
      return '<label class="cl-token"><span>' + escHtml(TOKEN_LABELS[k] || k) + '</span>' +
        '<span class="cl-token__row">' +
          (isHex ? '<input type="color" data-token="' + k + '-color" value="' + escHtml(v.length === 9 ? v.slice(0,7) : v) + '" />' : '<span class="cl-token__noColor"></span>') +
          '<input type="text" data-token="' + k + '" value="' + escHtml(v) + '" placeholder="ex.: #4a8a39 ou rgba(...)" class="sa-field__input" style="flex:1" />' +
        '</span>' +
      '</label>';
    }).join('');

    box.querySelectorAll('input[type="color"]').forEach(function (col) {
      col.addEventListener('input', function () {
        var key = col.getAttribute('data-token').replace('-color','');
        box.querySelector('input[data-token="' + key + '"]').value = col.value;
        refreshPreview();
      });
    });
    box.querySelectorAll('input[type="text"]').forEach(function (txt) {
      txt.addEventListener('input', refreshPreview);
    });
  }

  function readTokens() {
    var t = {};
    document.querySelectorAll('#cl-tokens input[type="text"]').forEach(function (i) {
      t[i.getAttribute('data-token')] = i.value.trim();
    });
    return t;
  }

  function refreshPreview() {
    var t = readTokens();
    var pv = document.getElementById('cl-preview');
    pv.style.background = t.background || '#fff';
    pv.style.color      = t.text || '#000';
    pv.style.border     = '1px solid ' + (t.border || 'transparent');
    pv.innerHTML = '' +
      '<div style="background:' + escHtml(t.surface || '#fff') + ';color:' + escHtml(t.text || '#000') + ';padding:14px;border-radius:12px;border:1px solid ' + escHtml(t.border || 'transparent') + '">' +
        '<h4 style="margin:0 0 4px;color:' + escHtml(t.primary || '#4a8a39') + '">Pré-visualização</h4>' +
        '<p style="margin:0 0 8px;color:' + escHtml(t.text_soft || '#555') + '">A solidariedade transforma vidas.</p>' +
        '<button style="background:' + escHtml(t.primary || '#4a8a39') + ';color:#fff;border:0;padding:8px 14px;border-radius:8px;font-weight:600;margin-right:6px">Doar agora</button>' +
        '<button style="background:transparent;color:' + escHtml(t.primary || '#4a8a39') + ';border:1px solid ' + escHtml(t.primary || '#4a8a39') + ';padding:8px 14px;border-radius:8px;font-weight:600">Saiba mais</button>' +
      '</div>';
  }

  function openCreate() {
    document.getElementById('cl-id').value = '';
    document.getElementById('cl-key').value = '';
    document.getElementById('cl-key').readOnly = false;
    document.getElementById('cl-name').value = '';
    document.getElementById('cl-desc').value = '';
    fillTokenInputs({ primary: '#4a8a39', secondary: '#7DC063', accent: '#E8C96A', background: '#faf9f5', surface: '#ffffff', text: '#1c1814', text_soft: '#3a3228', border: 'rgba(0,0,0,0.10)' });
    document.getElementById('cl-edit-title').textContent = 'Nova paleta';
    document.getElementById('cl-delete').hidden = true;
    document.getElementById('cl-default').hidden = true;
    document.getElementById('cl-edit').hidden = false;
    refreshPreview();
  }

  function openEdit(id) {
    var p = st.items.find(function (x) { return x.id === id; });
    if (!p) return;
    st.selectedId = id;
    document.getElementById('cl-id').value = p.id;
    document.getElementById('cl-key').value = p.palette_key;
    document.getElementById('cl-key').readOnly = !!p.built_in;
    document.getElementById('cl-name').value = p.name;
    document.getElementById('cl-desc').value = p.description || '';
    fillTokenInputs(p.tokens || {});
    document.getElementById('cl-edit-title').textContent = (p.built_in ? '🔒 ' : '') + 'Editar · ' + p.name;
    document.getElementById('cl-delete').hidden = false;
    document.getElementById('cl-default').hidden = !!p.is_default;
    document.getElementById('cl-edit').hidden = false;
    refreshPreview();
  }

  async function save() {
    var key = document.getElementById('cl-key').value.trim();
    var name = document.getElementById('cl-name').value.trim();
    if (!key || !/^[a-z0-9-]+$/.test(key)) return window.SA.store.toast('Chave inválida (a-z, 0-9, -)', 'err');
    if (!name) return window.SA.store.toast('Informe o nome', 'err');
    var data = {
      palette_key: key, name: name,
      description: document.getElementById('cl-desc').value.trim(),
      tokens: readTokens()
    };
    var id = document.getElementById('cl-id').value;
    try {
      if (id) {
        await window.SA.api.palettes.update(id, { name: data.name, description: data.description, tokens: data.tokens });
        window.SA.store.toast('Paleta atualizada', 'ok');
      } else {
        await window.SA.api.palettes.create(data);
        window.SA.store.toast('Paleta criada', 'ok');
      }
      document.getElementById('cl-edit').hidden = true;
      await load();
    } catch (e) {
      var msg = e.message || '';
      if (msg.indexOf('duplicate key') >= 0) msg = 'Já existe uma paleta com essa chave';
      window.SA.store.toast('Erro: ' + msg, 'err');
    }
  }

  async function setDefault() {
    var id = document.getElementById('cl-id').value;
    if (!id) return;
    try { await window.SA.api.palettes.setDefault(id); window.SA.store.toast('Definida como padrão', 'ok'); document.getElementById('cl-edit').hidden = true; await load(); }
    catch (e) { window.SA.store.toast('Erro: ' + e.message, 'err'); }
  }

  async function deletePalette() {
    var id = document.getElementById('cl-id').value;
    if (!id) return;
    if (!confirm('Excluir esta paleta?')) return;
    try { await window.SA.api.palettes.remove(id); window.SA.store.toast('Removida', 'ok'); document.getElementById('cl-edit').hidden = true; await load(); }
    catch (e) { window.SA.store.toast('Erro: ' + e.message, 'err'); }
  }

  function render() {
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.innerHTML = shell();
    if (window.SA.layout) window.SA.layout.setCrumbs([{ label: 'Super Admin' }, { label: 'Cores', strong: true }]);
    document.getElementById('cl-new').addEventListener('click', openCreate);
    document.getElementById('cl-edit-close').addEventListener('click', function () { document.getElementById('cl-edit').hidden = true; });
    document.getElementById('cl-save').addEventListener('click', save);
    document.getElementById('cl-default').addEventListener('click', setDefault);
    document.getElementById('cl-delete').addEventListener('click', deletePalette);
    bindStyles();
    load();
  }

  var stylesInjected = false;
  function bindStyles() {
    if (stylesInjected) return; stylesInjected = true;
    var css = '' +
      '.cl-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }' +
      '.cl-card { position: relative; background: var(--sa-bg-elev); border: 1px solid var(--sa-line); border-radius: 14px; padding: 14px; cursor: pointer; transition: border-color .15s var(--sa-ease), transform .15s var(--sa-ease); display: flex; flex-direction: column; gap: 8px; text-align: left; }' +
      '.cl-card:hover { border-color: var(--sa-accent-2); transform: translateY(-2px); }' +
      '.cl-card__sws { display: flex; gap: 4px; height: 40px; }' +
      '.cl-card__sw  { flex: 1; border-radius: 6px; border: 1px solid rgba(0,0,0,.18); }' +
      '.cl-card__meta { display: flex; align-items: center; justify-content: space-between; }' +
      '.cl-card__chip { font-size: 11px; color: var(--sa-accent-2); }' +

      '.cl-tokens { display: grid; gap: 8px; margin-top: 10px; }' +
      '.cl-token { display: grid; grid-template-columns: 130px 1fr; align-items: center; gap: 8px; font-size: 13px; color: var(--sa-text-soft); }' +
      '.cl-token__row { display: flex; align-items: center; gap: 8px; }' +
      '.cl-token__row input[type="color"] { width: 42px; height: 36px; padding: 2px; cursor: pointer; border: 1px solid var(--sa-line); border-radius: 6px; background: var(--sa-bg-soft); }' +
      '.cl-token__noColor { width: 42px; height: 36px; border: 1px dashed var(--sa-line); border-radius: 6px; }' +
      '.cl-preview { margin-top: 14px; padding: 14px; border-radius: 12px; }';
    var el = document.createElement('style'); el.id = 'sa-colors-styles'; el.textContent = css; document.head.appendChild(el);
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.colors = { render: render };
})();
