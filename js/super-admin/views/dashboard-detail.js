/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/dashboard-detail.js                            ║
  ║  Editor de uma dashboard: grid de widgets reais (renderizados ao    ║
  ║  vivo) + drag-and-drop nativo + adicionar/editar/excluir.           ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  var st = { page: null, widgets: [] };

  function shell(p) {
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
            '<button type="button" class="sa-btn sa-btn--ghost" id="dd-back"><i class="fa-solid fa-arrow-left"></i><span>Dashboards</span></button>' +
            '<h2 class="sa-view__title" style="margin:0">' + escHtml(p.title) + '</h2>' +
          '</div>' +
          '<p class="sa-view__sub">/' + escHtml(p.slug) + ' · Área admin</p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<button class="sa-btn sa-btn--ghost" id="dd-refresh"><i class="fa-solid fa-rotate"></i><span>Atualizar dados</span></button>' +
          '<button class="sa-btn sa-btn--primary" id="dd-add"><i class="fa-solid fa-plus"></i><span>Adicionar widget</span></button>' +
        '</div>' +
      '</header>' +
      '<div id="dd-grid" class="dd-grid" aria-busy="true">' + skel() + '</div>';
  }
  function skel() {
    var html = '';
    for (var i = 0; i < 4; i++) html += '<div class="aw-card" style="min-height:160px"><div class="sa-skel" style="height:14px;width:50%"></div><div class="sa-skel" style="height:38px;width:80%;margin-top:10px"></div></div>';
    return html;
  }

  async function loadAndRender() {
    var grid = document.getElementById('dd-grid');
    if (!grid) return;
    grid.setAttribute('aria-busy','true');
    try {
      st.widgets = await window.SA.api.widgets.listByPage(st.page.id);
    } catch (e) {
      var msg = String(e.message || '');
      if (msg.indexOf('Could not find the table') >= 0 || msg.indexOf('does not exist') >= 0) {
        grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-solid fa-database" style="font-size:24px"></i><div style="font-weight:700;color:var(--sa-text)">Migração da Fase 3 não aplicada</div><div>Execute <code>db/super-admin/005_phase3_widgets.sql</code>.</div></div>';
      } else {
        grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-solid fa-triangle-exclamation"></i><div>Erro: ' + escHtml(msg) + '</div></div>';
      }
      return;
    } finally { grid.setAttribute('aria-busy','false'); }

    if (!st.widgets.length) {
      grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-regular fa-chart-bar"></i><div>Sem widgets ainda. Clique em <strong>Adicionar widget</strong>.</div></div>';
      return;
    }

    grid.innerHTML = '';
    st.widgets.forEach(function (w) {
      var wrap = document.createElement('div');
      wrap.setAttribute('data-id', w.id);
      wrap.setAttribute('draggable', 'true');
      grid.appendChild(wrap);
      window.SA.widgetRenderer.render(wrap, w);

      // Toolbar do widget
      var toolbar = document.createElement('div');
      toolbar.className = 'dd-tools';
      toolbar.innerHTML =
        '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="edit"   title="Editar"><i class="fa-solid fa-pen"></i></button>' +
        '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="up"     title="Mover ←"><i class="fa-solid fa-arrow-left"></i></button>' +
        '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="down"   title="Mover →"><i class="fa-solid fa-arrow-right"></i></button>' +
        '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="delete" title="Excluir"><i class="fa-solid fa-trash"></i></button>';
      wrap.appendChild(toolbar);

      toolbar.querySelector('[data-act="edit"]').addEventListener('click',   function () { window.SA.router.go('widget-detail', { id: w.id }); });
      toolbar.querySelector('[data-act="up"]').addEventListener('click',     function () { move(w.id, -1); });
      toolbar.querySelector('[data-act="down"]').addEventListener('click',   function () { move(w.id, +1); });
      toolbar.querySelector('[data-act="delete"]').addEventListener('click', function () { remove(w.id); });
    });

    bindDnD(grid);
    bindStyles();
  }

  function bindDnD(grid) {
    var rows = grid.querySelectorAll('[data-id]');
    var drag = null;
    rows.forEach(function (row) {
      row.addEventListener('dragstart', function () { drag = row; row.classList.add('is-dragging'); });
      row.addEventListener('dragend',   function () { row.classList.remove('is-dragging'); rows.forEach(function (r) { r.classList.remove('is-drop'); }); });
      row.addEventListener('dragover',  function (e) { if (!drag || drag === row) return; e.preventDefault(); rows.forEach(function (r) { r.classList.remove('is-drop'); }); row.classList.add('is-drop'); });
      row.addEventListener('drop', async function (e) {
        e.preventDefault();
        if (!drag || drag === row) return;
        var srcId = drag.getAttribute('data-id'), tgtId = row.getAttribute('data-id');
        await reorderTo(srcId, tgtId);
      });
    });
  }

  async function reorderTo(srcId, tgtId) {
    var sorted = st.widgets.slice().sort(function (a, b) { return (a.order_index||0) - (b.order_index||0); });
    var src = sorted.find(function (w) { return w.id === srcId; });
    var tgt = sorted.find(function (w) { return w.id === tgtId; });
    if (!src || !tgt) return;
    var without = sorted.filter(function (w) { return w.id !== src.id; });
    var idx = without.indexOf(tgt);
    without.splice(idx, 0, src);
    var orders = without.map(function (w, i) { return { id: w.id, order_index: (i + 1) * 10 }; });
    try {
      await window.SA.api.widgets.reorder(st.page.id, orders);
      window.SA.store.toast('Ordem atualizada', 'ok');
      await loadAndRender();
    } catch (e) {
      window.SA.store.toast('Falha: ' + e.message, 'err');
    }
  }

  async function move(id, delta) {
    var sorted = st.widgets.slice().sort(function (a, b) { return (a.order_index||0) - (b.order_index||0); });
    var idx = sorted.findIndex(function (w) { return w.id === id; });
    var swap = idx + delta;
    if (idx < 0 || swap < 0 || swap >= sorted.length) return;
    var orders = [
      { id: sorted[idx].id,  order_index: sorted[swap].order_index },
      { id: sorted[swap].id, order_index: sorted[idx].order_index }
    ];
    try { await window.SA.api.widgets.reorder(st.page.id, orders); await loadAndRender(); }
    catch (e) { window.SA.store.toast('Falha: ' + e.message, 'err'); }
  }

  async function remove(id) {
    if (!confirm('Excluir este widget? (soft delete)')) return;
    try {
      await window.SA.api.widgets.softDelete(id);
      window.SA.store.toast('Widget excluído', 'ok');
      await loadAndRender();
    } catch (e) {
      window.SA.store.toast('Erro: ' + e.message, 'err');
    }
  }

  async function addWidget() {
    // Cria um KPI vazio padrão e abre o editor
    try {
      var maxOrder = st.widgets.reduce(function (m, w) { return Math.max(m, w.order_index || 0); }, 0);
      var w = await window.SA.api.widgets.create({
        page_id: st.page.id,
        type:    'kpi',
        title:   'Novo widget',
        config:  { source: 'doacoes', agg: 'count', icon: 'fa-hand-holding-heart', hint: 'Total acumulado' },
        order_index: maxOrder + 10
      });
      window.SA.store.toast('Widget criado', 'ok');
      window.SA.router.go('widget-detail', { id: w.id });
    } catch (e) {
      window.SA.store.toast('Erro: ' + e.message, 'err');
    }
  }

  async function render(params) {
    var view = document.getElementById('sa-view');
    if (!view) return;
    var id = params && params.id;
    if (!id) { window.SA.router.go('dashboards', {}); return; }

    view.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Carregando…</div></div>';
    try { st.page = await window.SA.api.pages.get(id); }
    catch (e) {
      view.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>Erro: ' + escHtml(e.message) + '</div></div>';
      return;
    }
    if (!st.page) { window.SA.router.go('dashboards', {}); return; }

    view.innerHTML = shell(st.page);
    if (window.SA.layout) window.SA.layout.setCrumbs([
      { label: 'Super Admin' }, { label: 'Dashboards' }, { label: st.page.title, strong: true }
    ]);

    document.getElementById('dd-back').addEventListener('click',    function () { window.SA.router.go('dashboards', {}); });
    document.getElementById('dd-add').addEventListener('click',     addWidget);
    document.getElementById('dd-refresh').addEventListener('click', loadAndRender);

    bindStyles();
    await loadAndRender();
  }

  var stylesInjected = false;
  function bindStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var css = '' +
      '.dd-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }' +
      '.dd-grid > [data-id] { position: relative; }' +
      '.dd-grid > [data-id].is-dragging { opacity: .5; }' +
      '.dd-grid > [data-id].is-drop { box-shadow: 0 0 0 2px var(--sa-accent-2); }' +
      '.dd-tools { position: absolute; top: 6px; right: 6px; display: flex; gap: 4px; opacity: 0; transition: opacity .15s var(--sa-ease); background: rgba(11,15,20,.7); padding: 4px; border-radius: 8px; backdrop-filter: blur(4px); }' +
      '[data-id]:hover .dd-tools, [data-id]:focus-within .dd-tools { opacity: 1; }';
    var styleEl = document.createElement('style');
    styleEl.id = 'sa-dashboard-detail-styles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.dashboardDetail = { render: render };
})();
