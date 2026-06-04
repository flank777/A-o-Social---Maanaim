/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/page-detail.js                                 ║
  ║  Editor de uma página: lista de seções + drag-and-drop +             ║
  ║  CRUD + Preview Responsivo lado a lado.                             ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  /* ── Cache de tipos de seção ──────────────────────────────────── */
  var typesCache = null;
  async function loadTypes() {
    if (typesCache) return typesCache;
    try {
      var sb = window.supabaseClient;
      var res = await sb.from('site_section_types').select('*').neq('status','inactive').order('order_index');
      if (!res.error && res.data) { typesCache = res.data; return typesCache; }
    } catch (e) {}
    typesCache = [
      { type_key: 'hero',   label: 'Hero / Capa',         icon: 'fa-image',      category: 'capa',      default_payload: {} },
      { type_key: 'text',   label: 'Texto institucional', icon: 'fa-align-left', category: 'conteudo',  default_payload: {} },
      { type_key: 'cards',  label: 'Grade de cards',      icon: 'fa-grip',       category: 'conteudo',  default_payload: {} },
      { type_key: 'custom', label: 'Personalizado',       icon: 'fa-square',     category: 'avancado',  default_payload: {} }
    ];
    return typesCache;
  }

  /* ── State local da view ──────────────────────────────────────── */
  var st = { page: null, sections: [], selectedId: null, preview: null };

  /* ── Shell ────────────────────────────────────────────────────── */
  function shell(p) {
    var statusPill = p.status === 'published'
      ? '<span class="sa-pill sa-pill--ok">publicado</span>'
      : '<span class="sa-pill sa-pill--draft">rascunho</span>';
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
            '<button type="button" class="sa-btn sa-btn--ghost" id="pd-back" title="Voltar para Páginas">' +
              '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i><span>Voltar</span>' +
            '</button>' +
            '<h2 class="sa-view__title" id="pd-title" style="margin:0">' + escHtml(p.title) + '</h2>' +
            statusPill +
          '</div>' +
          '<p class="sa-view__sub">/' + escHtml(p.slug) + ' · ' + (p.area_type === 'admin' ? 'Área admin' : 'Site público') + '</p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<button class="sa-btn sa-btn--soft"    id="pd-publish-page"><i class="fa-solid fa-rocket"></i><span>Publicar página</span></button>' +
          '<button class="sa-btn sa-btn--ghost"   id="pd-versions"    ><i class="fa-solid fa-clock-rotate-left"></i><span>Versões</span></button>' +
        '</div>' +
      '</header>' +

      '<div class="pd-grid">' +

        '<section class="sa-panel" id="pd-sections">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">' +
            '<h3 class="sa-panel__title" style="margin:0">Seções</h3>' +
            '<button class="sa-btn sa-btn--primary" id="pd-add"><i class="fa-solid fa-plus"></i><span>Adicionar</span></button>' +
          '</div>' +
          '<div id="pd-list" aria-busy="true">' + skel() + '</div>' +
        '</section>' +

        '<section class="sa-panel" id="pd-preview-panel">' +
          '<h3 class="sa-panel__title">Preview Responsivo</h3>' +
          '<p style="margin:-4px 0 12px;color:var(--sa-text-mute);font-size:12.5px">Mostra a página atual no ar. Quando o renderizador dinâmico entrar em produção (Fase 2), o preview refletirá rascunhos.</p>' +
          '<div id="pd-preview-host"></div>' +
        '</section>' +

      '</div>' +

      // Painel lateral de edição da seção selecionada (slide-in)
      '<aside id="pd-edit" class="pd-edit" hidden aria-label="Editar seção">' +
        '<header class="pd-edit__head">' +
          '<strong id="pd-edit-title">Editar seção</strong>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="pd-edit-close" title="Fechar"><i class="fa-solid fa-xmark"></i></button>' +
        '</header>' +
        '<form id="pd-edit-form" class="pd-edit__body">' +
          '<input type="hidden" id="pd-s-id" />' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Tipo</span>' +
            '<select class="sa-field__input" id="pd-s-type"></select>' +
          '</label>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Nome interno</span>' +
            '<input class="sa-field__input" id="pd-s-internal" maxlength="80" />' +
          '</label>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Título</span>' +
            '<input class="sa-field__input" id="pd-s-title" maxlength="160" />' +
          '</label>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Subtítulo</span>' +
            '<input class="sa-field__input" id="pd-s-subtitle" maxlength="200" />' +
          '</label>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Descrição</span>' +
            '<textarea class="sa-field__input" id="pd-s-description" rows="3" maxlength="800"></textarea>' +
          '</label>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Visível?</span>' +
            '<select class="sa-field__input" id="pd-s-visible">' +
              '<option value="true">Sim</option><option value="false">Não</option>' +
            '</select>' +
          '</label>' +

          '<details class="pd-edit__advanced">' +
            '<summary>Payload do rascunho (JSON avançado)</summary>' +
            '<textarea class="sa-field__input" id="pd-s-payload" rows="8" spellcheck="false" style="font-family:Space Mono, monospace; font-size:12.5px"></textarea>' +
            '<p style="font-size:12px;color:var(--sa-text-mute);margin:6px 0 0">Formato livre. Editores visuais por tipo virão nas próximas fases.</p>' +
          '</details>' +
        '</form>' +
        '<footer class="pd-edit__foot">' +
          '<button type="button" class="sa-btn sa-btn--danger"  id="pd-s-delete"><i class="fa-solid fa-trash"></i><span>Excluir</span></button>' +
          '<div style="flex:1"></div>' +
          '<button type="button" class="sa-btn sa-btn--soft"    id="pd-s-save"><i class="fa-solid fa-floppy-disk"></i><span>Salvar rascunho</span></button>' +
          '<button type="button" class="sa-btn sa-btn--primary" id="pd-s-publish"><i class="fa-solid fa-rocket"></i><span>Publicar</span></button>' +
        '</footer>' +
      '</aside>';
  }

  function skel() {
    var rows = '';
    for (var i = 0; i < 4; i++) {
      rows += '<div class="pd-row"><div class="sa-skel" style="height:18px;width:60%"></div><div class="sa-skel" style="height:14px;width:40%;margin-top:6px"></div></div>';
    }
    return '<div class="pd-list">' + rows + '</div>';
  }

  /* ── Renderiza lista de seções ─────────────────────────────────── */
  function renderList() {
    var box = document.getElementById('pd-list');
    if (!box) return;
    if (!st.sections.length) {
      box.innerHTML = '<div class="sa-empty"><i class="fa-regular fa-rectangle-list"></i>' +
        '<div>Nenhuma seção ainda. Adicione a primeira no botão acima.</div></div>';
      return;
    }
    var rows = st.sections.map(function (s, idx) {
      var dirty = window.SA.publish.isDirty(s);
      var dirtyTag = dirty ? '<span class="sa-pill sa-pill--draft" style="margin-left:6px">alterações</span>' : '';
      var statusTag = s.status === 'published'
        ? '<span class="sa-pill sa-pill--ok" style="margin-left:6px">publicada</span>'
        : '<span class="sa-pill sa-pill--draft" style="margin-left:6px">rascunho</span>';
      var hidden = s.visible === false ? '<span class="sa-pill" style="margin-left:6px">oculta</span>' : '';
      var typeLabel = (s.type || 'custom');
      return '' +
        '<div class="pd-row" draggable="true" data-id="' + escHtml(s.id) + '" data-idx="' + idx + '" tabindex="0">' +
          '<div class="pd-row__handle" aria-hidden="true"><i class="fa-solid fa-grip-vertical"></i></div>' +
          '<div class="pd-row__body">' +
            '<div class="pd-row__title"><strong>' + escHtml(s.internal_name || '(sem nome)') + '</strong>' + statusTag + hidden + dirtyTag + '</div>' +
            '<div class="pd-row__meta"><span class="pd-tag"><i class="fa-solid fa-shapes"></i> ' + escHtml(typeLabel) + '</span>' +
              (s.title ? ' · ' + escHtml(s.title) : '') +
            '</div>' +
          '</div>' +
          '<div class="pd-row__actions">' +
            '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="up"   title="Subir"><i class="fa-solid fa-arrow-up"></i></button>' +
            '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="down" title="Descer"><i class="fa-solid fa-arrow-down"></i></button>' +
            '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="edit" title="Editar metadados"><i class="fa-solid fa-pen"></i></button>' +
            '<button class="sa-btn sa-btn--soft  sa-btn--icon" data-act="open" title="Abrir editor de cards"><i class="fa-solid fa-arrow-right-to-bracket"></i></button>' +
          '</div>' +
        '</div>';
    }).join('');
    box.innerHTML = '<div class="pd-list" id="pd-list-inner">' + rows + '</div>';

    // Bindings
    box.querySelectorAll('.pd-row').forEach(function (row) {
      var id = row.getAttribute('data-id');
      row.querySelector('[data-act="edit"]').addEventListener('click', function () { openEdit(id); });
      row.querySelector('[data-act="open"]').addEventListener('click', function () { window.SA.router.go('section-detail', { id: id }); });
      row.querySelector('[data-act="up"]').addEventListener('click',   function () { move(id, -1); });
      row.querySelector('[data-act="down"]').addEventListener('click', function () { move(id, +1); });
    });
    bindDnD(box);
  }

  /* ── Drag & drop nativo ────────────────────────────────────────── */
  function bindDnD(box) {
    var rows = box.querySelectorAll('.pd-row');
    var dragSrc = null;

    rows.forEach(function (row) {
      row.addEventListener('dragstart', function (e) {
        dragSrc = row;
        row.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', row.getAttribute('data-id')); } catch (err) {}
      });
      row.addEventListener('dragend', function () {
        row.classList.remove('is-dragging');
        rows.forEach(function (r) { r.classList.remove('is-drop-before','is-drop-after'); });
      });
      row.addEventListener('dragover', function (e) {
        if (!dragSrc || dragSrc === row) return;
        e.preventDefault();
        var rect = row.getBoundingClientRect();
        var before = (e.clientY - rect.top) < rect.height / 2;
        rows.forEach(function (r) { r.classList.remove('is-drop-before','is-drop-after'); });
        row.classList.add(before ? 'is-drop-before' : 'is-drop-after');
      });
      row.addEventListener('drop', async function (e) {
        e.preventDefault();
        if (!dragSrc || dragSrc === row) return;
        var srcId = dragSrc.getAttribute('data-id');
        var tgtId = row.getAttribute('data-id');
        var rect = row.getBoundingClientRect();
        var before = (e.clientY - rect.top) < rect.height / 2;
        await reorderTo(srcId, tgtId, before);
      });
    });
  }

  async function reorderTo(srcId, tgtId, before) {
    var src = st.sections.find(function (s) { return s.id === srcId; });
    var tgt = st.sections.find(function (s) { return s.id === tgtId; });
    if (!src || !tgt || src === tgt) return;

    var list = st.sections.slice().sort(function (a, b) { return a.order_index - b.order_index; });
    var without = list.filter(function (s) { return s.id !== src.id; });
    var idx = without.indexOf(tgt);
    var insertAt = before ? idx : idx + 1;
    without.splice(insertAt, 0, src);

    var orders = without.map(function (s, i) { return { id: s.id, order_index: (i + 1) * 10 }; });
    try {
      await window.SA.api.sections.reorder(orders);
      window.SA.store.toast('Ordem atualizada', 'ok');
      await loadSections();
    } catch (e) {
      window.SA.store.toast('Falha ao reordenar: ' + e.message, 'err');
    }
  }

  async function move(id, delta) {
    var sorted = st.sections.slice().sort(function (a, b) { return a.order_index - b.order_index; });
    var idx = sorted.findIndex(function (r) { return r.id === id; });
    if (idx < 0) return;
    var swap = idx + delta;
    if (swap < 0 || swap >= sorted.length) return;
    var a = sorted[idx], b = sorted[swap];
    var orders = [
      { id: a.id, order_index: b.order_index },
      { id: b.id, order_index: a.order_index }
    ];
    try {
      await window.SA.api.sections.reorder(orders);
      await loadSections();
    } catch (e) {
      window.SA.store.toast('Falha: ' + e.message, 'err');
    }
  }

  /* ── Carregar dados ─────────────────────────────────────────── */
  async function loadSections() {
    try {
      st.sections = await window.SA.api.sections.listByPage(st.page.id);
    } catch (e) {
      st.sections = [];
      var box = document.getElementById('pd-list');
      if (box) {
        var msg = String(e.message || '');
        if (msg.indexOf('Could not find the table') >= 0 || msg.indexOf('does not exist') >= 0) {
          box.innerHTML = '<div class="sa-empty">' +
            '<i class="fa-solid fa-database" style="font-size:24px"></i>' +
            '<div style="font-weight:700;color:var(--sa-text)">Migração não aplicada</div>' +
            '<div>Execute <code>db/super-admin/001_super_admin_foundation.sql</code> e <code>002_phase1_devices_and_section_types.sql</code> no SQL Editor.</div>' +
          '</div>';
        } else {
          box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>Erro: ' + escHtml(msg) + '</div></div>';
        }
      }
      return;
    }
    renderList();
  }

  /* ── Edição de seção ──────────────────────────────────────────── */
  async function fillTypeSelect() {
    var sel = document.getElementById('pd-s-type');
    if (!sel) return;
    var types = await loadTypes();
    sel.innerHTML = types.map(function (t) {
      return '<option value="' + escHtml(t.type_key) + '">' + escHtml(t.label) + '</option>';
    }).join('');
  }

  function openCreate() {
    st.selectedId = null;
    var pane = document.getElementById('pd-edit');
    fillTypeSelect().then(function () {
      document.getElementById('pd-s-id').value = '';
      document.getElementById('pd-s-type').value = 'text';
      document.getElementById('pd-s-internal').value = 'nova-secao';
      document.getElementById('pd-s-title').value = '';
      document.getElementById('pd-s-subtitle').value = '';
      document.getElementById('pd-s-description').value = '';
      document.getElementById('pd-s-visible').value = 'true';
      document.getElementById('pd-s-payload').value = '{}';
      document.getElementById('pd-edit-title').textContent = 'Nova seção';
      document.getElementById('pd-s-delete').hidden = true;
      pane.hidden = false;
    });
  }

  function openEdit(id) {
    var s = st.sections.find(function (x) { return x.id === id; });
    if (!s) return;
    st.selectedId = id;
    var pane = document.getElementById('pd-edit');
    fillTypeSelect().then(function () {
      document.getElementById('pd-s-id').value          = s.id;
      document.getElementById('pd-s-type').value        = s.type || 'custom';
      document.getElementById('pd-s-internal').value    = s.internal_name || '';
      document.getElementById('pd-s-title').value       = s.title || '';
      document.getElementById('pd-s-subtitle').value    = s.subtitle || '';
      document.getElementById('pd-s-description').value = s.description || '';
      document.getElementById('pd-s-visible').value     = s.visible === false ? 'false' : 'true';
      try { document.getElementById('pd-s-payload').value = JSON.stringify(s.draft_payload || {}, null, 2); }
      catch (e) { document.getElementById('pd-s-payload').value = '{}'; }
      document.getElementById('pd-edit-title').textContent = 'Editar · ' + (s.internal_name || s.title || 'seção');
      document.getElementById('pd-s-delete').hidden = false;
      pane.hidden = false;
    });
  }

  function closeEdit() {
    var pane = document.getElementById('pd-edit');
    if (pane) pane.hidden = true;
    st.selectedId = null;
  }

  function readForm() {
    var payloadRaw = document.getElementById('pd-s-payload').value || '{}';
    var payload;
    try { payload = JSON.parse(payloadRaw); }
    catch (e) { throw new Error('JSON do payload inválido: ' + e.message); }
    return {
      type:           document.getElementById('pd-s-type').value,
      internal_name:  document.getElementById('pd-s-internal').value.trim(),
      title:          document.getElementById('pd-s-title').value.trim(),
      subtitle:       document.getElementById('pd-s-subtitle').value.trim(),
      description:    document.getElementById('pd-s-description').value.trim(),
      visible:        document.getElementById('pd-s-visible').value === 'true',
      draft_payload:  payload
    };
  }

  async function saveSection() {
    var data;
    try { data = readForm(); }
    catch (e) { window.SA.store.toast(e.message, 'err'); return; }

    if (!data.internal_name) { window.SA.store.toast('Nome interno é obrigatório.', 'err'); return; }

    try {
      if (st.selectedId) {
        await window.SA.api.sections.update(st.selectedId, data);
        window.SA.store.toast('Seção salva (rascunho)', 'ok');
      } else {
        // novo: order_index = último + 10
        var maxOrder = st.sections.reduce(function (m, s) { return Math.max(m, s.order_index || 0); }, 0);
        var created = await window.SA.api.sections.create(Object.assign({
          page_id: st.page.id,
          order_index: maxOrder + 10
        }, data));
        st.selectedId = created.id;
        document.getElementById('pd-s-id').value = created.id;
        document.getElementById('pd-s-delete').hidden = false;
        window.SA.store.toast('Seção criada', 'ok');
      }
      await loadSections();
    } catch (e) {
      window.SA.store.toast('Erro: ' + e.message, 'err');
    }
  }

  async function publishSection() {
    if (!st.selectedId) { window.SA.store.toast('Salve antes de publicar.', 'info'); return; }
    try {
      await saveSilent();
      await window.SA.publish.publish('site_sections', st.selectedId, 'Publicada pelo painel');
      window.SA.store.toast('Seção publicada', 'ok');
      await loadSections();
    } catch (e) {
      window.SA.store.toast('Falha ao publicar: ' + e.message, 'err');
    }
  }

  async function saveSilent() {
    if (!st.selectedId) return;
    try {
      var data = readForm();
      await window.SA.api.sections.update(st.selectedId, data);
    } catch (e) { /* ignora aqui — o save explícito mostra erro */ }
  }

  async function deleteSection() {
    if (!st.selectedId) return;
    var s = st.sections.find(function (x) { return x.id === st.selectedId; });
    if (!s) return;
    if (!confirm('Excluir a seção "' + (s.internal_name || s.title || 'sem nome') + '"?')) return;
    try {
      await window.SA.api.sections.softDelete(st.selectedId);
      window.SA.store.toast('Seção excluída', 'ok');
      closeEdit();
      await loadSections();
    } catch (e) {
      window.SA.store.toast('Falha: ' + e.message, 'err');
    }
  }

  /* ── Publicar página inteira ──────────────────────────────────── */
  async function publishPage() {
    try {
      await window.SA.publish.publish('site_pages', st.page.id, 'Página publicada pelo painel');
      window.SA.store.toast('Página publicada', 'ok');
    } catch (e) {
      window.SA.store.toast('Falha: ' + e.message, 'err');
    }
  }

  /* ── Render ───────────────────────────────────────────────────── */
  async function render(params) {
    var view = document.getElementById('sa-view');
    if (!view) return;
    var id = params && params.id;
    if (!id) { window.SA.router.go('pages', {}); return; }

    view.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Carregando página…</div></div>';

    var page;
    try { page = await window.SA.api.pages.get(id); }
    catch (e) {
      view.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>Falha ao carregar: ' + escHtml(e.message) + '</div></div>';
      return;
    }
    if (!page) { window.SA.router.go('pages', {}); return; }

    st.page = page;
    view.innerHTML = shell(page);

    if (window.SA && window.SA.layout) {
      window.SA.layout.setCrumbs([
        { label: 'Super Admin' },
        { label: 'Páginas' },
        { label: page.title, strong: true }
      ]);
    }

    // Preview lateral usa a página interna que renderiza pelo banco em modo draft.
    // Assim o painel mostra o RASCUNHO em tempo real, refletindo o que o
    // site_content.js entregaria depois de publicar.
    var host = document.getElementById('pd-preview-host');
    var url = 'super-admin-preview.html?page=' + encodeURIComponent(page.slug) + '&mode=draft';
    st.preview = window.SA.preview.mount(host, { url: url, device: 'iPhone 14' });

    // Bindings de chrome
    document.getElementById('pd-back').addEventListener('click',         function () { window.SA.router.go('pages-area', { area: page.area_type }); });
    document.getElementById('pd-add').addEventListener('click',          openCreate);
    document.getElementById('pd-publish-page').addEventListener('click', publishPage);
    document.getElementById('pd-versions').addEventListener('click',     function () { window.SA.router.go('history', {}); });

    document.getElementById('pd-edit-close').addEventListener('click', closeEdit);
    document.getElementById('pd-s-save').addEventListener('click',     saveSection);
    document.getElementById('pd-s-publish').addEventListener('click',  publishSection);
    document.getElementById('pd-s-delete').addEventListener('click',   deleteSection);

    bindStyles();
    await loadSections();
  }

  /* ── Estilos isolados específicos da view ─────────────────────── */
  var stylesInjected = false;
  function bindStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var css = '' +
      '.pd-grid { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); align-items: start; }' +
      '@media (max-width: 1100px) { .pd-grid { grid-template-columns: 1fr; } }' +

      '.pd-list { display: flex; flex-direction: column; gap: 8px; }' +
      '.pd-row { display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 10px; padding: 10px 12px; background: var(--sa-bg-elev); border: 1px solid var(--sa-line); border-radius: 12px; transition: border-color .15s var(--sa-ease), transform .15s var(--sa-ease), background .15s var(--sa-ease); }' +
      '.pd-row:hover { border-color: var(--sa-line-2); }' +
      '.pd-row.is-dragging { opacity: .55; transform: scale(.99); }' +
      '.pd-row.is-drop-before { box-shadow: 0 -3px 0 var(--sa-accent-2); }' +
      '.pd-row.is-drop-after  { box-shadow: 0  3px 0 var(--sa-accent-2); }' +
      '.pd-row__handle { color: var(--sa-text-mute); cursor: grab; padding: 6px 4px; }' +
      '.pd-row.is-dragging .pd-row__handle { cursor: grabbing; }' +
      '.pd-row__title { font-size: 14px; }' +
      '.pd-row__meta  { color: var(--sa-text-mute); font-size: 12.5px; margin-top: 2px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }' +
      '.pd-tag { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border: 1px solid var(--sa-line); border-radius: 999px; font-size: 11.5px; }' +
      '.pd-row__actions { display: flex; gap: 6px; }' +

      '.pd-edit { position: fixed; inset: 0 0 0 auto; width: min(440px, 100vw); background: var(--sa-bg-elev); border-left: 1px solid var(--sa-line); box-shadow: -20px 0 60px rgba(0,0,0,.45); display: grid; grid-template-rows: auto 1fr auto; z-index: 40; animation: pd-slide .25s var(--sa-ease); }' +
      '.pd-edit__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px 16px; border-bottom: 1px solid var(--sa-line); }' +
      '.pd-edit__body { padding: 16px; overflow-y: auto; display: grid; gap: 12px; }' +
      '.pd-edit__advanced summary { cursor: pointer; font-size: 13px; color: var(--sa-text-soft); padding: 8px 0; }' +
      '.pd-edit__foot { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--sa-line); background: var(--sa-bg-soft); }' +
      '@keyframes pd-slide { from { transform: translateX(20px); opacity: .4 } to { transform: translateX(0); opacity: 1 } }';

    var st_ = document.createElement('style');
    st_.id = 'sa-page-detail-styles';
    st_.textContent = css;
    document.head.appendChild(st_);
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.pageDetail = { render: render };
})();
