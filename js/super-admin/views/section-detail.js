/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/section-detail.js                              ║
  ║  Editor de uma seção: lista de cards + drag-and-drop +              ║
  ║  CRUD com painel slide-in.                                          ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  var st = { section: null, page: null, cards: [], selectedId: null };

  function statusPill(s) {
    if (s === 'published') return '<span class="sa-pill sa-pill--ok">publicado</span>';
    if (s === 'draft')     return '<span class="sa-pill sa-pill--draft">rascunho</span>';
    return '<span class="sa-pill">' + escHtml(s) + '</span>';
  }

  function shell(section, page) {
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
            '<button type="button" class="sa-btn sa-btn--ghost" id="sd-back">' +
              '<i class="fa-solid fa-arrow-left"></i><span>Voltar</span>' +
            '</button>' +
            '<h2 class="sa-view__title" style="margin:0">' + escHtml(section.internal_name || section.title || 'Seção') + '</h2>' +
            statusPill(section.status) +
          '</div>' +
          '<p class="sa-view__sub">Página: <strong>' + escHtml(page.title) + '</strong> · Tipo: <code>' + escHtml(section.type) + '</code></p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<button class="sa-btn sa-btn--soft"  id="sd-publish-section"><i class="fa-solid fa-rocket"></i><span>Publicar seção</span></button>' +
        '</div>' +
      '</header>' +

      '<section class="sa-panel">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">' +
          '<h3 class="sa-panel__title" style="margin:0">Cards desta seção</h3>' +
          '<button class="sa-btn sa-btn--primary" id="sd-add"><i class="fa-solid fa-plus"></i><span>Adicionar card</span></button>' +
        '</div>' +
        '<div id="sd-list" aria-busy="true">' + skel() + '</div>' +
      '</section>' +

      // Painel slide-in
      '<aside id="sd-edit" class="pd-edit" hidden>' +
        '<header class="pd-edit__head">' +
          '<strong id="sd-edit-title">Editar card</strong>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="sd-edit-close"><i class="fa-solid fa-xmark"></i></button>' +
        '</header>' +
        '<form id="sd-edit-form" class="pd-edit__body">' +
          '<input type="hidden" id="sd-c-id" />' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Título</span>' +
            '<input class="sa-field__input" id="sd-c-title" maxlength="160" />' +
          '</label>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Subtítulo</span>' +
            '<input class="sa-field__input" id="sd-c-subtitle" maxlength="200" />' +
          '</label>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Descrição</span>' +
            '<textarea class="sa-field__input" id="sd-c-description" rows="3" maxlength="600"></textarea>' +
          '</label>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Imagem (URL ou pegue da Mídia)</span>' +
            '<span class="sa-field__wrap">' +
              '<input class="sa-field__input" id="sd-c-image" placeholder="https://…" />' +
              '<button type="button" id="sd-c-image-pick" class="sa-field__toggle" aria-label="Escolher da biblioteca"><i class="fa-solid fa-photo-film"></i></button>' +
            '</span>' +
          '</label>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Ícone (Font Awesome — ex.: fa-solid fa-heart)</span>' +
            '<input class="sa-field__input" id="sd-c-icon" maxlength="80" />' +
          '</label>' +

          '<div class="sa-row">' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Texto do botão</span>' +
              '<input class="sa-field__input" id="sd-c-btn-text" maxlength="60" />' +
            '</label>' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Link do botão</span>' +
              '<input class="sa-field__input" id="sd-c-btn-link" placeholder="https://… ou /pagina" />' +
            '</label>' +
          '</div>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Visível?</span>' +
            '<select class="sa-field__input" id="sd-c-visible">' +
              '<option value="true">Sim</option><option value="false">Não</option>' +
            '</select>' +
          '</label>' +
        '</form>' +
        '<footer class="pd-edit__foot">' +
          '<button type="button" class="sa-btn sa-btn--danger"  id="sd-c-delete"><i class="fa-solid fa-trash"></i><span>Excluir</span></button>' +
          '<div style="flex:1"></div>' +
          '<button type="button" class="sa-btn sa-btn--soft"    id="sd-c-save"><i class="fa-solid fa-floppy-disk"></i><span>Salvar rascunho</span></button>' +
          '<button type="button" class="sa-btn sa-btn--primary" id="sd-c-publish"><i class="fa-solid fa-rocket"></i><span>Publicar</span></button>' +
        '</footer>' +
      '</aside>';
  }

  function skel() {
    var rows = '';
    for (var i = 0; i < 3; i++) {
      rows += '<div class="pd-row"><div class="sa-skel" style="height:18px;width:60%"></div><div class="sa-skel" style="height:14px;width:40%;margin-top:6px"></div></div>';
    }
    return '<div class="pd-list">' + rows + '</div>';
  }

  /* ── Lista ────────────────────────────────────────────────────── */
  function renderList() {
    var box = document.getElementById('sd-list');
    if (!box) return;
    if (!st.cards.length) {
      box.innerHTML = '<div class="sa-empty"><i class="fa-regular fa-rectangle-list"></i>' +
        '<div>Nenhum card ainda. Adicione o primeiro no botão acima.</div></div>';
      return;
    }
    var rows = st.cards.map(function (c, idx) {
      var dirty = window.SA.publish.isDirty(c);
      var dirtyTag = dirty ? '<span class="sa-pill sa-pill--draft" style="margin-left:6px">alterações</span>' : '';
      var statusTag = c.status === 'published'
        ? '<span class="sa-pill sa-pill--ok" style="margin-left:6px">publicado</span>'
        : '<span class="sa-pill sa-pill--draft" style="margin-left:6px">rascunho</span>';
      var hidden = c.visible === false ? '<span class="sa-pill" style="margin-left:6px">oculto</span>' : '';
      var thumb = c.image_url ? '<img src="' + escHtml(c.image_url) + '" alt="" />' : '';
      return '' +
        '<div class="pd-row sd-row" draggable="true" data-id="' + escHtml(c.id) + '" tabindex="0">' +
          '<div class="pd-row__handle"><i class="fa-solid fa-grip-vertical"></i></div>' +
          '<div class="sd-row__thumb">' + (thumb || '<i class="fa-regular fa-image" aria-hidden="true"></i>') + '</div>' +
          '<div class="pd-row__body">' +
            '<div class="pd-row__title"><strong>' + escHtml(c.title || '(sem título)') + '</strong>' + statusTag + hidden + dirtyTag + '</div>' +
            '<div class="pd-row__meta">' + escHtml(c.subtitle || c.description || '') + '</div>' +
          '</div>' +
          '<div class="pd-row__actions">' +
            '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="up"   title="Subir"><i class="fa-solid fa-arrow-up"></i></button>' +
            '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="down" title="Descer"><i class="fa-solid fa-arrow-down"></i></button>' +
            '<button class="sa-btn sa-btn--soft sa-btn--icon"  data-act="edit" title="Editar"><i class="fa-solid fa-pen"></i></button>' +
          '</div>' +
        '</div>';
    }).join('');
    box.innerHTML = '<div class="pd-list">' + rows + '</div>';
    box.querySelectorAll('.pd-row').forEach(function (row) {
      var id = row.getAttribute('data-id');
      row.querySelector('[data-act="edit"]').addEventListener('click', function () { openEdit(id); });
      row.querySelector('[data-act="up"]').addEventListener('click',   function () { move(id, -1); });
      row.querySelector('[data-act="down"]').addEventListener('click', function () { move(id, +1); });
    });
    bindDnD(box);
    bindStyles();
  }

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
    var src = st.cards.find(function (c) { return c.id === srcId; });
    var tgt = st.cards.find(function (c) { return c.id === tgtId; });
    if (!src || !tgt || src === tgt) return;
    var sorted = st.cards.slice().sort(function (a, b) { return (a.order_index||0) - (b.order_index||0); });
    var without = sorted.filter(function (c) { return c.id !== src.id; });
    var idx = without.indexOf(tgt);
    var insertAt = before ? idx : idx + 1;
    without.splice(insertAt, 0, src);
    var orders = without.map(function (c, i) { return { id: c.id, order_index: (i + 1) * 10 }; });
    try {
      await window.SA.api.cards.reorder(orders);
      window.SA.store.toast('Ordem atualizada', 'ok');
      await loadCards();
    } catch (e) {
      window.SA.store.toast('Falha: ' + e.message, 'err');
    }
  }

  async function move(id, delta) {
    var sorted = st.cards.slice().sort(function (a, b) { return (a.order_index||0) - (b.order_index||0); });
    var idx = sorted.findIndex(function (c) { return c.id === id; });
    if (idx < 0) return;
    var swap = idx + delta;
    if (swap < 0 || swap >= sorted.length) return;
    var a = sorted[idx], b = sorted[swap];
    var orders = [
      { id: a.id, order_index: b.order_index },
      { id: b.id, order_index: a.order_index }
    ];
    try {
      await window.SA.api.cards.reorder(orders);
      await loadCards();
    } catch (e) {
      window.SA.store.toast('Falha: ' + e.message, 'err');
    }
  }

  /* ── Carregar cards ────────────────────────────────────────────── */
  async function loadCards() {
    var box = document.getElementById('sd-list');
    if (box) box.setAttribute('aria-busy', 'true');
    try {
      st.cards = await window.SA.api.cards.listBySection(st.section.id);
    } catch (e) {
      if (box) {
        var msg = String(e.message || '');
        if (msg.indexOf('Could not find the table') >= 0 || msg.indexOf('does not exist') >= 0) {
          box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-database" style="font-size:24px"></i><div style="font-weight:700;color:var(--sa-text)">Migrações não aplicadas</div><div>Execute os SQLs em <code>db/super-admin/</code>.</div></div>';
        } else {
          box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>Erro: ' + escHtml(msg) + '</div></div>';
        }
      }
      return;
    } finally {
      if (box) box.setAttribute('aria-busy', 'false');
    }
    renderList();
  }

  /* ── Edição ────────────────────────────────────────────────────── */
  function openCreate() {
    st.selectedId = null;
    document.getElementById('sd-c-id').value          = '';
    document.getElementById('sd-c-title').value       = '';
    document.getElementById('sd-c-subtitle').value    = '';
    document.getElementById('sd-c-description').value = '';
    document.getElementById('sd-c-image').value       = '';
    document.getElementById('sd-c-icon').value        = '';
    document.getElementById('sd-c-btn-text').value    = '';
    document.getElementById('sd-c-btn-link').value    = '';
    document.getElementById('sd-c-visible').value     = 'true';
    document.getElementById('sd-edit-title').textContent = 'Novo card';
    document.getElementById('sd-c-delete').hidden = true;
    document.getElementById('sd-edit').hidden = false;
  }

  function openEdit(id) {
    var c = st.cards.find(function (x) { return x.id === id; });
    if (!c) return;
    st.selectedId = id;
    document.getElementById('sd-c-id').value          = c.id;
    document.getElementById('sd-c-title').value       = c.title || '';
    document.getElementById('sd-c-subtitle').value    = c.subtitle || '';
    document.getElementById('sd-c-description').value = c.description || '';
    document.getElementById('sd-c-image').value       = c.image_url || '';
    document.getElementById('sd-c-icon').value        = c.icon || '';
    document.getElementById('sd-c-btn-text').value    = c.button_text || '';
    document.getElementById('sd-c-btn-link').value    = c.button_link || '';
    document.getElementById('sd-c-visible').value     = c.visible === false ? 'false' : 'true';
    document.getElementById('sd-edit-title').textContent = 'Editar · ' + (c.title || '(sem título)');
    document.getElementById('sd-c-delete').hidden = false;
    document.getElementById('sd-edit').hidden = false;
  }

  function closeEdit() {
    document.getElementById('sd-edit').hidden = true;
    st.selectedId = null;
  }

  function readForm() {
    return {
      title:       document.getElementById('sd-c-title').value.trim(),
      subtitle:    document.getElementById('sd-c-subtitle').value.trim(),
      description: document.getElementById('sd-c-description').value.trim(),
      image_url:   document.getElementById('sd-c-image').value.trim(),
      icon:        document.getElementById('sd-c-icon').value.trim(),
      button_text: document.getElementById('sd-c-btn-text').value.trim(),
      button_link: document.getElementById('sd-c-btn-link').value.trim(),
      visible:     document.getElementById('sd-c-visible').value === 'true'
    };
  }

  async function saveCard() {
    var data = readForm();
    if (!data.title && !data.description && !data.image_url) {
      window.SA.store.toast('Informe ao menos título, descrição ou imagem.', 'err');
      return;
    }
    try {
      if (st.selectedId) {
        await window.SA.api.cards.update(st.selectedId, data);
        window.SA.store.toast('Card salvo', 'ok');
      } else {
        var maxOrder = st.cards.reduce(function (m, c) { return Math.max(m, c.order_index || 0); }, 0);
        var created = await window.SA.api.cards.create(Object.assign({
          section_id:  st.section.id,
          order_index: maxOrder + 10
        }, data));
        st.selectedId = created.id;
        document.getElementById('sd-c-id').value = created.id;
        document.getElementById('sd-c-delete').hidden = false;
        window.SA.store.toast('Card criado', 'ok');
      }
      await loadCards();
    } catch (e) {
      window.SA.store.toast('Erro: ' + e.message, 'err');
    }
  }

  async function publishCard() {
    if (!st.selectedId) { window.SA.store.toast('Salve antes de publicar.', 'info'); return; }
    try {
      await window.SA.api.cards.update(st.selectedId, readForm());
      await window.SA.publish.publish('site_cards', st.selectedId, 'Card publicado');
      window.SA.store.toast('Card publicado', 'ok');
      await loadCards();
    } catch (e) {
      window.SA.store.toast('Falha ao publicar: ' + e.message, 'err');
    }
  }

  async function deleteCard() {
    if (!st.selectedId) return;
    var c = st.cards.find(function (x) { return x.id === st.selectedId; });
    if (!confirm('Excluir o card "' + (c && c.title || 'sem título') + '"?')) return;
    try {
      await window.SA.api.cards.softDelete(st.selectedId);
      window.SA.store.toast('Card excluído', 'ok');
      closeEdit();
      await loadCards();
    } catch (e) {
      window.SA.store.toast('Falha: ' + e.message, 'err');
    }
  }

  async function publishSection() {
    try {
      await window.SA.publish.publish('site_sections', st.section.id, 'Seção publicada');
      window.SA.store.toast('Seção publicada', 'ok');
    } catch (e) {
      window.SA.store.toast('Falha: ' + e.message, 'err');
    }
  }

  /* ── Picker simples da biblioteca de mídia ─────────────────────── */
  async function openMediaPicker() {
    try {
      var list = await window.SA.api.media.list({ limit: 60 });
      var content = '' +
        '<div class="sa-panel" style="max-height:60vh;overflow:auto">' +
        (list.length === 0
          ? '<div class="sa-empty"><i class="fa-regular fa-folder-open"></i><div>Nenhuma mídia ainda. Adicione em <strong>Mídia</strong> no menu.</div></div>'
          : '<div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">' +
            list.map(function (m) {
              return '<button type="button" class="sd-pick" data-url="' + escHtml(m.url) + '" style="background:transparent;border:1px solid var(--sa-line);border-radius:10px;padding:6px;cursor:pointer">' +
                (m.kind === 'video'
                  ? '<div style="aspect-ratio:1;display:grid;place-items:center;background:#000;color:#fff;border-radius:8px"><i class="fa-solid fa-video"></i></div>'
                  : '<img src="' + escHtml(m.url) + '" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px" loading="lazy" />') +
                '<div style="font-size:11px;color:var(--sa-text-mute);margin-top:4px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escHtml(m.alt || m.category) + '</div>' +
              '</button>';
            }).join('') +
            '</div>'
        ) + '</div>';

      // Modal leve
      var modal = document.createElement('div');
      modal.className = 'sd-picker';
      modal.innerHTML = '' +
        '<div class="sd-picker__panel">' +
          '<header style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--sa-line)">' +
            '<strong>Escolher mídia</strong>' +
            '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="sd-pick-close"><i class="fa-solid fa-xmark"></i></button>' +
          '</header>' +
          '<div style="padding:12px">' + content + '</div>' +
        '</div>';
      document.body.appendChild(modal);

      function close() { modal.remove(); }
      modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
      modal.querySelector('#sd-pick-close').addEventListener('click', close);
      modal.querySelectorAll('.sd-pick').forEach(function (btn) {
        btn.addEventListener('click', function () {
          document.getElementById('sd-c-image').value = btn.getAttribute('data-url');
          close();
        });
      });
    } catch (e) {
      window.SA.store.toast('Falha ao abrir biblioteca: ' + e.message, 'err');
    }
  }

  /* ── Render ───────────────────────────────────────────────────── */
  async function render(params) {
    var view = document.getElementById('sa-view');
    if (!view) return;
    var id = params && params.id;
    if (!id) { window.SA.router.go('pages', {}); return; }

    view.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Carregando seção…</div></div>';

    var section, page;
    try {
      var sb = window.supabaseClient;
      var sRes = await sb.from('site_sections').select('*').eq('id', id).is('deleted_at', null).single();
      if (sRes.error || !sRes.data) throw new Error(sRes.error ? sRes.error.message : 'Seção não encontrada');
      section = sRes.data;
      var pRes = await sb.from('site_pages').select('*').eq('id', section.page_id).single();
      page = pRes.data;
    } catch (e) {
      view.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>Falha ao carregar seção: ' + escHtml(e.message) + '</div></div>';
      return;
    }

    st.section = section;
    st.page = page || { id: '', title: '—' };

    view.innerHTML = shell(section, st.page);
    if (window.SA && window.SA.layout) {
      window.SA.layout.setCrumbs([
        { label: 'Super Admin' },
        { label: 'Páginas' },
        { label: st.page.title || '—' },
        { label: section.internal_name || section.title || 'Seção', strong: true }
      ]);
    }

    document.getElementById('sd-back').addEventListener('click',            function () { window.SA.router.go('page-detail', { id: st.page.id }); });
    document.getElementById('sd-add').addEventListener('click',             openCreate);
    document.getElementById('sd-publish-section').addEventListener('click', publishSection);
    document.getElementById('sd-edit-close').addEventListener('click',      closeEdit);
    document.getElementById('sd-c-save').addEventListener('click',          saveCard);
    document.getElementById('sd-c-publish').addEventListener('click',       publishCard);
    document.getElementById('sd-c-delete').addEventListener('click',        deleteCard);
    document.getElementById('sd-c-image-pick').addEventListener('click',    openMediaPicker);

    bindStyles();
    await loadCards();
  }

  /* ── Estilos ───────────────────────────────────────────────────── */
  var stylesInjected = false;
  function bindStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var css = '' +
      '.sd-row { grid-template-columns: 28px 56px 1fr auto !important; }' +
      '.sd-row__thumb { width: 56px; height: 56px; border-radius: 10px; overflow: hidden; background: var(--sa-bg-soft); border: 1px solid var(--sa-line); display: grid; place-items: center; color: var(--sa-text-mute); }' +
      '.sd-row__thumb img { width: 100%; height: 100%; object-fit: cover; }' +

      '.sd-picker { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: grid; place-items: center; z-index: 60; padding: 14px; }' +
      '.sd-picker__panel { background: var(--sa-bg-elev); border: 1px solid var(--sa-line); border-radius: 14px; width: min(720px, 100%); max-height: calc(100vh - 24px); display: grid; grid-template-rows: auto 1fr; overflow: hidden; }' +
      '.sd-pick:hover { border-color: var(--sa-accent-2); }';
    var styleEl = document.createElement('style');
    styleEl.id = 'sa-section-detail-styles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.sectionDetail = { render: render };
})();
