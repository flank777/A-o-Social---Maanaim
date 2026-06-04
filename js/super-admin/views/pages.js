/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/pages.js — Editor de Páginas (Fase 0)          ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║  CRUD completo + criação + soft delete + publicação ponta a ponta.  ║
  ║  Esta tela existe para validar a fundação: se ela funciona, todos   ║
  ║  os blocos das próximas fases (seções, cards, gráficos) usam o      ║
  ║  mesmo padrão.                                                      ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function shell(area) {
    var areaPub   = area === 'site_publico' ? ' aria-current="true"' : '';
    var areaAdmin = area === 'admin'        ? ' aria-current="true"' : '';
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<h2 class="sa-view__title">Páginas</h2>' +
          '<p class="sa-view__sub">Crie, edite, reordene e publique páginas do site público e da área admin.</p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<div role="tablist" aria-label="Área" style="display:inline-flex;gap:6px;background:var(--sa-bg-soft);padding:4px;border-radius:10px;border:1px solid var(--sa-line)">' +
            '<button class="sa-btn sa-btn--ghost" data-area="site_publico"' + areaPub + ' style="border:0">' +
              '<i class="fa-solid fa-globe" aria-hidden="true"></i><span>Site público</span>' +
            '</button>' +
            '<button class="sa-btn sa-btn--ghost" data-area="admin"' + areaAdmin + ' style="border:0">' +
              '<i class="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i><span>Admin</span>' +
            '</button>' +
          '</div>' +
          '<button class="sa-btn sa-btn--primary" id="pg-new">' +
            '<i class="fa-solid fa-plus" aria-hidden="true"></i><span>Nova página</span>' +
          '</button>' +
        '</div>' +
      '</header>' +

      '<div id="pg-tbl" class="sa-tbl-wrap" aria-busy="true">' +
        skelTable() +
      '</div>' +

      '<section class="sa-panel" id="pg-edit-panel" hidden style="margin-top:18px">' +
        '<h3 class="sa-panel__title" id="pg-edit-title">Editar página</h3>' +
        '<form id="pg-form" class="sa-row">' +
          '<input type="hidden" id="pg-id" />' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Título</span>' +
            '<input class="sa-field__input" id="pg-title" required maxlength="120" />' +
          '</label>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Slug (URL interna)</span>' +
            '<input class="sa-field__input" id="pg-slug" required maxlength="60" pattern="[a-z0-9-]+" />' +
          '</label>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">SEO · título</span>' +
            '<input class="sa-field__input" id="pg-seo-title" maxlength="160" />' +
          '</label>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">SEO · descrição</span>' +
            '<input class="sa-field__input" id="pg-seo-desc" maxlength="240" />' +
          '</label>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Ordem no menu</span>' +
            '<input class="sa-field__input" id="pg-order" type="number" step="1" />' +
          '</label>' +

          '<label class="sa-field">' +
            '<span class="sa-field__label">Aparece no menu?</span>' +
            '<select class="sa-field__input" id="pg-show">' +
              '<option value="true">Sim</option><option value="false">Não</option>' +
            '</select>' +
          '</label>' +

          '<div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:6px">' +
            '<button type="button" class="sa-btn sa-btn--ghost"   id="pg-cancel">Cancelar</button>' +
            '<button type="button" class="sa-btn sa-btn--danger"  id="pg-delete" hidden><i class="fa-solid fa-trash" aria-hidden="true"></i><span>Excluir</span></button>' +
            '<button type="button" class="sa-btn sa-btn--soft"    id="pg-save"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i><span>Salvar rascunho</span></button>' +
            '<button type="button" class="sa-btn sa-btn--primary" id="pg-publish"><i class="fa-solid fa-rocket" aria-hidden="true"></i><span>Publicar</span></button>' +
          '</div>' +
        '</form>' +
      '</section>';
  }

  function skelTable() {
    var rows = '';
    for (var i = 0; i < 5; i++) {
      rows += '<tr>' +
        '<td><div class="sa-skel" style="height:14px;width:90%"></div></td>' +
        '<td><div class="sa-skel" style="height:14px;width:70%"></div></td>' +
        '<td><div class="sa-skel" style="height:14px;width:50%"></div></td>' +
        '<td><div class="sa-skel" style="height:14px;width:30%"></div></td>' +
        '<td><div class="sa-skel" style="height:14px;width:80px"></div></td>' +
      '</tr>';
    }
    return '<table class="sa-tbl"><thead><tr>' +
      '<th>Título</th><th>Slug</th><th>Status</th><th>Ordem</th><th></th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function statusPill(s) {
    if (s === 'published') return '<span class="sa-pill sa-pill--ok">publicado</span>';
    if (s === 'draft')     return '<span class="sa-pill sa-pill--draft">rascunho</span>';
    if (s === 'archived')  return '<span class="sa-pill sa-pill--info">arquivado</span>';
    return '<span class="sa-pill">' + escHtml(s) + '</span>';
  }

  async function loadPages(area) {
    var box = document.getElementById('pg-tbl');
    if (!box) return;
    box.setAttribute('aria-busy', 'true');
    try {
      var rows = await window.SA.api.pages.list(area);
      renderTable(rows);
    } catch (e) {
      var msg = String(e.message || '');
      if (msg.indexOf('Could not find the table') >= 0 || msg.indexOf('does not exist') >= 0) {
        box.innerHTML = '<div class="sa-empty">' +
          '<i class="fa-solid fa-database" style="font-size:24px"></i>' +
          '<div style="font-weight:700;color:var(--sa-text)">Migração da Fase 0 ainda não aplicada</div>' +
          '<div>Execute <code>db/super-admin/001_super_admin_foundation.sql</code> no SQL Editor do Supabase.</div>' +
        '</div>';
      } else {
        box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>Erro ao carregar páginas: ' + escHtml(msg) + '</div></div>';
      }
    } finally {
      box.setAttribute('aria-busy', 'false');
    }
  }

  function renderTable(rows) {
    var box = document.getElementById('pg-tbl');
    if (!box) return;
    if (!rows || !rows.length) {
      box.innerHTML = '<div class="sa-empty"><i class="fa-regular fa-folder-open"></i><div>Nenhuma página nesta área. Crie a primeira no botão acima.</div></div>';
      return;
    }
    var trs = rows.map(function (p) {
      var dirty = window.SA.publish.isDirty(p);
      var dirtyTag = dirty ? ' <span class="sa-pill sa-pill--draft" style="margin-left:6px">alterações</span>' : '';
      return '<tr data-id="' + escHtml(p.id) + '">' +
        '<td><strong>' + escHtml(p.title) + '</strong>' + dirtyTag + '</td>' +
        '<td><code>' + escHtml(p.slug) + '</code></td>' +
        '<td>' + statusPill(p.status) + '</td>' +
        '<td>' + escHtml(String(p.order_index)) + '</td>' +
        '<td class="sa-tbl__actions">' +
          '<button class="sa-btn sa-btn--soft  sa-btn--icon" data-act="open"  title="Abrir editor"><i class="fa-solid fa-arrow-right-to-bracket"></i></button>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="edit"  title="Editar metadados"><i class="fa-solid fa-pen"></i></button>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="up"    title="Subir"><i class="fa-solid fa-arrow-up"></i></button>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="down"  title="Descer"><i class="fa-solid fa-arrow-down"></i></button>' +
        '</td>' +
      '</tr>';
    }).join('');
    box.innerHTML = '<table class="sa-tbl"><thead><tr>' +
      '<th>Título</th><th>Slug</th><th>Status</th><th>Ordem</th><th></th>' +
    '</tr></thead><tbody>' + trs + '</tbody></table>';

    box.querySelectorAll('tr[data-id]').forEach(function (tr) {
      var id = tr.getAttribute('data-id');
      tr.querySelector('[data-act="open"]').addEventListener('click', function () { window.SA.router.go('page-detail', { id: id }); });
      tr.querySelector('[data-act="edit"]').addEventListener('click', function () { openEdit(id); });
      tr.querySelector('[data-act="up"]').addEventListener('click',   function () { move(id, -1); });
      tr.querySelector('[data-act="down"]').addEventListener('click', function () { move(id, +1); });
      // Clique na linha (fora dos botões) também abre o editor
      tr.querySelector('td:first-child').style.cursor = 'pointer';
      tr.querySelector('td:first-child').addEventListener('click', function () { window.SA.router.go('page-detail', { id: id }); });
    });
  }

  /* ── Reordenação simples por delta ─────────────────────────────── */
  async function move(id, delta) {
    try {
      var area = currentArea();
      var rows = await window.SA.api.pages.list(area);
      var idx = rows.findIndex(function (r) { return r.id === id; });
      if (idx < 0) return;
      var swap = idx + delta;
      if (swap < 0 || swap >= rows.length) return;
      var a = rows[idx], b = rows[swap];
      var orders = [
        { id: a.id, order_index: b.order_index },
        { id: b.id, order_index: a.order_index }
      ];
      await window.SA.api.pages.reorder(orders);
      window.SA.store.toast('Ordem atualizada', 'ok');
      loadPages(area);
    } catch (e) {
      window.SA.store.toast('Falha ao reordenar: ' + e.message, 'err');
    }
  }

  /* ── Edição ────────────────────────────────────────────────────── */
  var editing = null;

  function openEdit(id) {
    window.SA.api.pages.get(id).then(function (p) {
      if (!p) return;
      editing = p;
      document.getElementById('pg-id').value         = p.id;
      document.getElementById('pg-title').value      = p.title || '';
      document.getElementById('pg-slug').value       = p.slug || '';
      document.getElementById('pg-seo-title').value  = p.seo_title || '';
      document.getElementById('pg-seo-desc').value   = p.seo_description || '';
      document.getElementById('pg-order').value      = p.order_index;
      document.getElementById('pg-show').value       = p.show_in_menu ? 'true' : 'false';
      document.getElementById('pg-edit-title').textContent = 'Editar página · ' + (p.title || '');
      document.getElementById('pg-delete').hidden = false;
      document.getElementById('pg-edit-panel').hidden = false;
      document.getElementById('pg-edit-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function (e) {
      window.SA.store.toast('Falha ao abrir: ' + e.message, 'err');
    });
  }

  function openCreate() {
    editing = null;
    document.getElementById('pg-id').value = '';
    document.getElementById('pg-title').value = '';
    document.getElementById('pg-slug').value  = '';
    document.getElementById('pg-seo-title').value = '';
    document.getElementById('pg-seo-desc').value  = '';
    document.getElementById('pg-order').value     = '9999';
    document.getElementById('pg-show').value      = 'true';
    document.getElementById('pg-edit-title').textContent = 'Nova página';
    document.getElementById('pg-delete').hidden = true;
    document.getElementById('pg-edit-panel').hidden = false;
    document.getElementById('pg-edit-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeEdit() {
    editing = null;
    document.getElementById('pg-edit-panel').hidden = true;
  }

  function readForm() {
    return {
      title:           document.getElementById('pg-title').value.trim(),
      slug:            document.getElementById('pg-slug').value.trim(),
      seo_title:       document.getElementById('pg-seo-title').value.trim(),
      seo_description: document.getElementById('pg-seo-desc').value.trim(),
      order_index:     parseFloat(document.getElementById('pg-order').value) || 9999,
      show_in_menu:    document.getElementById('pg-show').value === 'true'
    };
  }

  function validate(data) {
    if (!data.title)                                  return 'Informe o título.';
    if (!data.slug)                                   return 'Informe um slug (use letras minúsculas, números e hífen).';
    if (!/^[a-z0-9-]+$/.test(data.slug))              return 'Slug inválido. Use a-z, 0-9 e hífen.';
    return null;
  }

  async function saveDraft() {
    var data = readForm();
    var err  = validate(data);
    if (err) { window.SA.store.toast(err, 'err'); return; }

    try {
      if (editing && editing.id) {
        await window.SA.api.pages.update(editing.id, data);
        window.SA.store.toast('Rascunho salvo', 'ok');
      } else {
        var area = currentArea();
        var created = await window.SA.api.pages.create({
          area_type: area,
          title: data.title, slug: data.slug,
          seo_title: data.seo_title, seo_description: data.seo_description,
          order_index: data.order_index, show_in_menu: data.show_in_menu
        });
        editing = created;
        document.getElementById('pg-id').value = created.id;
        window.SA.store.toast('Página criada (em rascunho)', 'ok');
      }
      await loadPages(currentArea());
    } catch (e) {
      window.SA.store.toast('Erro ao salvar: ' + e.message, 'err');
    }
  }

  async function publishCurrent() {
    if (!editing || !editing.id) {
      window.SA.store.toast('Salve o rascunho antes de publicar.', 'info');
      return;
    }
    try {
      // garante que mudanças do form viraram draft antes
      await saveDraftSilent();
      await window.SA.publish.publish('site_pages', editing.id, 'Publicado pelo painel');
      window.SA.store.toast('Página publicada', 'ok');
      closeEdit();
      await loadPages(currentArea());
    } catch (e) {
      window.SA.store.toast('Falha ao publicar: ' + e.message, 'err');
    }
  }

  async function saveDraftSilent() {
    var data = readForm();
    if (validate(data)) return;
    if (editing && editing.id) {
      await window.SA.api.pages.update(editing.id, data);
    }
  }

  async function deleteCurrent() {
    if (!editing || !editing.id) return;
    if (!confirm('Excluir a página "' + editing.title + '"? (Soft delete — pode ser restaurada do banco)')) return;
    try {
      await window.SA.api.pages.softDelete(editing.id);
      window.SA.store.toast('Página excluída', 'ok');
      closeEdit();
      await loadPages(currentArea());
    } catch (e) {
      window.SA.store.toast('Falha ao excluir: ' + e.message, 'err');
    }
  }

  /* ── Aba ativa (área) ─────────────────────────────────────────── */
  function currentArea() {
    var st = window.SA.store.get();
    var p = (st.route && st.route.params) || {};
    return p.area || 'site_publico';
  }

  function bindAreaTabs() {
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.querySelectorAll('[data-area]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var area = btn.getAttribute('data-area');
        window.SA.router.go('pages-area', { area: area });
      });
    });
  }

  function bindForm() {
    document.getElementById('pg-new').addEventListener('click',     openCreate);
    document.getElementById('pg-cancel').addEventListener('click',  closeEdit);
    document.getElementById('pg-save').addEventListener('click',    saveDraft);
    document.getElementById('pg-publish').addEventListener('click', publishCurrent);
    document.getElementById('pg-delete').addEventListener('click',  deleteCurrent);
  }

  /* ── Render ───────────────────────────────────────────────────── */
  function render(params) {
    var area = (params && params.area) || 'site_publico';
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.innerHTML = shell(area);

    if (window.SA && window.SA.layout) {
      window.SA.layout.setCrumbs([
        { label: 'Super Admin' },
        { label: 'Páginas', strong: true },
        { label: area === 'admin' ? 'Admin' : 'Site público' }
      ]);
    }

    bindAreaTabs();
    bindForm();
    loadPages(area);
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.pages = { render: render };
})();
