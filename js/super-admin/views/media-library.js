/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/media-library.js                               ║
  ║  Biblioteca de mídia: upload + listagem + busca + categoria.        ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  var st = { items: [], filter: { kind: '', q: '', category: '' } };

  function shell() {
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<h2 class="sa-view__title">Mídia</h2>' +
          '<p class="sa-view__sub">Imagens, vídeos e arquivos reutilizados em todo o sistema.</p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<label class="sa-btn sa-btn--primary" for="ml-input">' +
            '<i class="fa-solid fa-cloud-arrow-up"></i><span>Enviar arquivos</span>' +
            '<input id="ml-input" type="file" multiple accept="image/*,video/*" style="display:none" />' +
          '</label>' +
        '</div>' +
      '</header>' +

      '<section class="sa-panel" style="margin-bottom:14px">' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">' +
          '<label class="sa-field" style="flex:1;min-width:220px">' +
            '<span class="sa-field__label">Buscar</span>' +
            '<input id="ml-q" class="sa-field__input" type="search" placeholder="Buscar por descrição ou categoria…" />' +
          '</label>' +
          '<label class="sa-field" style="min-width:160px">' +
            '<span class="sa-field__label">Tipo</span>' +
            '<select id="ml-kind" class="sa-field__input">' +
              '<option value="">Todos</option>' +
              '<option value="image">Imagens</option>' +
              '<option value="video">Vídeos</option>' +
              '<option value="icon">Ícones</option>' +
              '<option value="background">Fundos</option>' +
              '<option value="document">Documentos</option>' +
            '</select>' +
          '</label>' +
          '<label class="sa-field" style="min-width:160px">' +
            '<span class="sa-field__label">Categoria</span>' +
            '<input id="ml-cat" class="sa-field__input" placeholder="ex.: hero, galeria, doadores" />' +
          '</label>' +
        '</div>' +
      '</section>' +

      '<div id="ml-progress" hidden class="sa-panel" style="margin-bottom:14px">' +
        '<strong>Enviando…</strong>' +
        '<div id="ml-progress-list" style="margin-top:8px;display:grid;gap:6px"></div>' +
      '</div>' +

      '<div id="ml-grid" class="ml-grid" aria-busy="true">' + skel() + '</div>' +

      // Painel slide-in para editar metadados
      '<aside id="ml-edit" class="pd-edit" hidden>' +
        '<header class="pd-edit__head">' +
          '<strong id="ml-edit-title">Editar mídia</strong>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="ml-edit-close"><i class="fa-solid fa-xmark"></i></button>' +
        '</header>' +
        '<form class="pd-edit__body">' +
          '<input type="hidden" id="ml-m-id" />' +
          '<div id="ml-m-preview" style="margin-bottom:8px"></div>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">URL pública</span>' +
            '<input class="sa-field__input" id="ml-m-url" readonly />' +
          '</label>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Descrição (alt)</span>' +
            '<input class="sa-field__input" id="ml-m-alt" maxlength="200" />' +
          '</label>' +

          '<div class="sa-row">' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Tipo</span>' +
              '<select class="sa-field__input" id="ml-m-kind">' +
                '<option value="image">Imagem</option>' +
                '<option value="video">Vídeo</option>' +
                '<option value="icon">Ícone</option>' +
                '<option value="background">Fundo</option>' +
                '<option value="document">Documento</option>' +
                '<option value="other">Outro</option>' +
              '</select>' +
            '</label>' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Categoria</span>' +
              '<input class="sa-field__input" id="ml-m-cat" />' +
            '</label>' +
          '</div>' +
        '</form>' +
        '<footer class="pd-edit__foot">' +
          '<button type="button" class="sa-btn sa-btn--danger" id="ml-m-delete"><i class="fa-solid fa-trash"></i><span>Excluir</span></button>' +
          '<div style="flex:1"></div>' +
          '<button type="button" class="sa-btn sa-btn--ghost"  id="ml-m-copy"><i class="fa-solid fa-copy"></i><span>Copiar URL</span></button>' +
          '<button type="button" class="sa-btn sa-btn--primary"id="ml-m-save"><i class="fa-solid fa-floppy-disk"></i><span>Salvar</span></button>' +
        '</footer>' +
      '</aside>';
  }

  function skel() {
    var html = '';
    for (var i = 0; i < 8; i++) {
      html += '<div class="ml-card"><div class="sa-skel" style="aspect-ratio:1;border-radius:10px"></div></div>';
    }
    return html;
  }

  function visible(items) {
    var f = st.filter;
    return items.filter(function (m) {
      if (f.kind && m.kind !== f.kind) return false;
      if (f.category && (m.category || '').toLowerCase().indexOf(f.category.toLowerCase()) < 0) return false;
      if (f.q) {
        var q = f.q.toLowerCase();
        var bag = (m.alt || '') + ' ' + (m.description || '') + ' ' + (m.category || '');
        if (bag.toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function renderGrid() {
    var grid = document.getElementById('ml-grid');
    if (!grid) return;
    grid.setAttribute('aria-busy', 'false');
    var items = visible(st.items);
    if (!items.length) {
      grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-regular fa-folder-open"></i><div>Nenhuma mídia encontrada com esses filtros.</div></div>';
      return;
    }
    grid.innerHTML = items.map(function (m) {
      var thumb = m.kind === 'video'
        ? '<div class="ml-card__video"><i class="fa-solid fa-video"></i></div>'
        : '<img src="' + escHtml(m.url) + '" alt="' + escHtml(m.alt || '') + '" loading="lazy" />';
      return '<button type="button" class="ml-card" data-id="' + escHtml(m.id) + '" title="' + escHtml(m.alt || m.url) + '">' +
        thumb +
        '<div class="ml-card__meta">' +
          '<span class="ml-card__cat">' + escHtml(m.category || 'geral') + '</span>' +
          '<span class="ml-card__kind">' + escHtml(m.kind) + '</span>' +
        '</div>' +
      '</button>';
    }).join('');
    grid.querySelectorAll('.ml-card').forEach(function (b) {
      b.addEventListener('click', function () { openEdit(b.getAttribute('data-id')); });
    });
  }

  /* ── Carregar ──────────────────────────────────────────────────── */
  async function load() {
    var grid = document.getElementById('ml-grid');
    if (grid) { grid.setAttribute('aria-busy', 'true'); grid.innerHTML = skel(); }
    try {
      st.items = await window.SA.api.media.list({ limit: 200 });
    } catch (e) {
      var msg = String(e.message || '');
      if (msg.indexOf('Could not find the table') >= 0 || msg.indexOf('does not exist') >= 0) {
        if (grid) grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-solid fa-database" style="font-size:24px"></i><div style="font-weight:700;color:var(--sa-text)">Migração da Fase 2 não aplicada</div><div>Execute <code>db/super-admin/003_phase2_media_library.sql</code>.</div></div>';
      } else if (grid) {
        grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-solid fa-triangle-exclamation"></i><div>Erro: ' + escHtml(msg) + '</div></div>';
      }
      return;
    }
    renderGrid();
  }

  /* ── Upload ────────────────────────────────────────────────────── */
  async function handleUpload(files) {
    var prog = document.getElementById('ml-progress');
    var list = document.getElementById('ml-progress-list');
    prog.hidden = false;
    list.innerHTML = '';

    var total = 0, done = 0, failed = 0;
    var arr = Array.prototype.slice.call(files);
    total = arr.length;

    for (var i = 0; i < arr.length; i++) {
      var f = arr[i];
      var line = document.createElement('div');
      line.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:13px';
      line.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color:var(--sa-accent-2)"></i><span style="flex:1">' + escHtml(f.name) + '</span><span style="color:var(--sa-text-mute)" data-status>enviando…</span>';
      list.appendChild(line);

      try {
        if (!/^(image|video)\//.test(f.type)) throw new Error('Tipo de arquivo não suportado.');
        if (f.size > 50 * 1024 * 1024) throw new Error('Arquivo maior que 50 MB.');

        await window.SA.api.media.upload(f, {
          kind: f.type.indexOf('video/') === 0 ? 'video' : 'image',
          category: st.filter.category || 'geral'
        });
        done++;
        line.querySelector('i').className = 'fa-solid fa-circle-check';
        line.querySelector('i').style.color = 'var(--sa-accent-2)';
        line.querySelector('[data-status]').textContent = 'enviado';
      } catch (e) {
        failed++;
        line.querySelector('i').className = 'fa-solid fa-circle-exclamation';
        line.querySelector('i').style.color = 'var(--sa-danger)';
        line.querySelector('[data-status]').textContent = e.message;
      }
    }

    if (failed === 0) {
      window.SA.store.toast(total + ' arquivo(s) enviado(s)', 'ok');
    } else {
      window.SA.store.toast(done + ' enviado(s), ' + failed + ' falha(s)', failed === total ? 'err' : 'info');
    }

    setTimeout(function () { prog.hidden = true; }, 2200);
    await load();
  }

  /* ── Edição ────────────────────────────────────────────────────── */
  function openEdit(id) {
    var m = st.items.find(function (x) { return x.id === id; });
    if (!m) return;
    document.getElementById('ml-m-id').value  = m.id;
    document.getElementById('ml-m-url').value = m.url;
    document.getElementById('ml-m-alt').value = m.alt || '';
    document.getElementById('ml-m-kind').value= m.kind || 'image';
    document.getElementById('ml-m-cat').value = m.category || '';
    var pv = document.getElementById('ml-m-preview');
    pv.innerHTML = m.kind === 'video'
      ? '<video src="' + escHtml(m.url) + '" controls style="width:100%;border-radius:10px;background:#000"></video>'
      : '<img src="' + escHtml(m.url) + '" alt="" style="width:100%;border-radius:10px;border:1px solid var(--sa-line)" />';
    document.getElementById('ml-edit-title').textContent = 'Mídia · ' + (m.alt || (m.url || '').split('/').pop() || 'sem nome');
    document.getElementById('ml-edit').hidden = false;
  }

  function closeEdit() { document.getElementById('ml-edit').hidden = true; }

  async function saveEdit() {
    var id = document.getElementById('ml-m-id').value;
    if (!id) return;
    try {
      await window.SA.api.media.update(id, {
        alt:      document.getElementById('ml-m-alt').value.trim(),
        kind:     document.getElementById('ml-m-kind').value,
        category: document.getElementById('ml-m-cat').value.trim() || 'geral'
      });
      window.SA.store.toast('Mídia atualizada', 'ok');
      closeEdit();
      await load();
    } catch (e) {
      window.SA.store.toast('Erro: ' + e.message, 'err');
    }
  }

  async function deleteEdit() {
    var id = document.getElementById('ml-m-id').value;
    if (!id) return;
    if (!confirm('Excluir esta mídia? (soft delete)')) return;
    try {
      await window.SA.api.media.softDelete(id);
      window.SA.store.toast('Mídia excluída', 'ok');
      closeEdit();
      await load();
    } catch (e) {
      window.SA.store.toast('Erro: ' + e.message, 'err');
    }
  }

  function copyUrl() {
    var url = document.getElementById('ml-m-url').value;
    if (!url) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        window.SA.store.toast('URL copiada', 'ok', { ttl: 1800 });
      });
    } else {
      var t = document.createElement('textarea');
      t.value = url; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); window.SA.store.toast('URL copiada', 'ok', { ttl: 1800 }); }
      catch (e) {} finally { t.remove(); }
    }
  }

  /* ── Render ───────────────────────────────────────────────────── */
  function render() {
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.innerHTML = shell();
    if (window.SA && window.SA.layout) {
      window.SA.layout.setCrumbs([
        { label: 'Super Admin' },
        { label: 'Mídia', strong: true }
      ]);
    }

    document.getElementById('ml-input').addEventListener('change', function (e) { handleUpload(e.target.files); e.target.value = ''; });
    document.getElementById('ml-q').addEventListener('input',     function (e) { st.filter.q = e.target.value; renderGrid(); });
    document.getElementById('ml-kind').addEventListener('change', function (e) { st.filter.kind = e.target.value; renderGrid(); });
    document.getElementById('ml-cat').addEventListener('input',   function (e) { st.filter.category = e.target.value; renderGrid(); });
    document.getElementById('ml-edit-close').addEventListener('click', closeEdit);
    document.getElementById('ml-m-save').addEventListener('click',     saveEdit);
    document.getElementById('ml-m-delete').addEventListener('click',   deleteEdit);
    document.getElementById('ml-m-copy').addEventListener('click',     copyUrl);

    bindStyles();
    load();
  }

  var stylesInjected = false;
  function bindStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var css = '' +
      '.ml-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }' +
      '.ml-card { background: var(--sa-bg-elev); border: 1px solid var(--sa-line); border-radius: 14px; padding: 8px; cursor: pointer; transition: border-color .15s var(--sa-ease), transform .15s var(--sa-ease); display: flex; flex-direction: column; gap: 6px; text-align: left; }' +
      '.ml-card:hover { border-color: var(--sa-accent-2); transform: translateY(-2px); }' +
      '.ml-card img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 10px; background: #0c1015; }' +
      '.ml-card__video { aspect-ratio: 1; border-radius: 10px; background: #000; color: #fff; display: grid; place-items: center; font-size: 24px; }' +
      '.ml-card__meta { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 0 4px; }' +
      '.ml-card__cat  { font-size: 12px; color: var(--sa-text-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%; }' +
      '.ml-card__kind { font-size: 10.5px; color: var(--sa-text-mute); padding: 2px 7px; border: 1px solid var(--sa-line); border-radius: 999px; }';
    var styleEl = document.createElement('style');
    styleEl.id = 'sa-media-library-styles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.mediaLibrary = { render: render };
})();
