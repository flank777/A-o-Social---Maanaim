/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/dashboards.js                                  ║
  ║  Lista de dashboards = páginas com area_type='admin'.               ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function shell() {
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<h2 class="sa-view__title">Dashboards</h2>' +
          '<p class="sa-view__sub">Cada página da área admin é uma dashboard. Adicione widgets (KPIs, gráficos, listas, tabelas) com fontes do banco.</p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<button class="sa-btn sa-btn--ghost" id="db-go-pages"><i class="fa-solid fa-file-lines"></i><span>Gerenciar páginas admin</span></button>' +
        '</div>' +
      '</header>' +
      '<div id="db-grid" class="sa-grid" aria-busy="true">' + skel() + '</div>';
  }
  function skel() {
    var html = '';
    for (var i = 0; i < 4; i++) {
      html += '<div class="sa-card"><div class="sa-skel" style="height:18px;width:60%"></div><div class="sa-skel" style="height:14px;width:40%;margin-top:6px"></div></div>';
    }
    return html;
  }

  async function load() {
    var grid = document.getElementById('db-grid');
    if (!grid) return;
    try {
      var pages = await window.SA.api.pages.list('admin');
      if (!pages.length) {
        grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-regular fa-folder-open"></i><div>Nenhuma página admin ainda. Crie em <strong>Páginas → Admin</strong>.</div></div>';
        return;
      }
      // Conta widgets por página em paralelo
      var sb = window.supabaseClient;
      var counts = await Promise.all(pages.map(function (p) {
        return sb.from('admin_widgets').select('id', { count: 'exact', head: true }).eq('page_id', p.id).is('deleted_at', null);
      }));
      grid.innerHTML = pages.map(function (p, idx) {
        var c = (counts[idx] && counts[idx].count) || 0;
        return '<button class="sa-card" data-id="' + escHtml(p.id) + '" style="text-align:left;cursor:pointer;border:1px solid var(--sa-line);background:var(--sa-bg-elev)">' +
          '<h3 class="sa-card__title"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i><span>' + escHtml(p.title) + '</span></h3>' +
          '<p class="sa-card__value" style="font-size:22px">' + c + ' <small style="font-size:13px;color:var(--sa-text-mute);font-family:DM Sans,sans-serif">widget(s)</small></p>' +
          '<p class="sa-card__hint">/' + escHtml(p.slug) + ' · ' + (p.status === 'published' ? 'publicada' : 'rascunho') + '</p>' +
        '</button>';
      }).join('');
      grid.querySelectorAll('[data-id]').forEach(function (b) {
        b.addEventListener('click', function () { window.SA.router.go('dashboard-detail', { id: b.getAttribute('data-id') }); });
      });
    } catch (e) {
      var msg = String(e.message || '');
      if (msg.indexOf('Could not find the table') >= 0 || msg.indexOf('does not exist') >= 0) {
        grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-solid fa-database" style="font-size:24px"></i><div style="font-weight:700;color:var(--sa-text)">Migração da Fase 3 não aplicada</div><div>Execute <code>db/super-admin/005_phase3_widgets.sql</code>.</div></div>';
      } else {
        grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-solid fa-triangle-exclamation"></i><div>Erro: ' + escHtml(msg) + '</div></div>';
      }
    } finally {
      grid.setAttribute('aria-busy','false');
    }
  }

  function render() {
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.innerHTML = shell();
    if (window.SA.layout) window.SA.layout.setCrumbs([
      { label: 'Super Admin' }, { label: 'Dashboards', strong: true }
    ]);
    document.getElementById('db-go-pages').addEventListener('click', function () { window.SA.router.go('pages-area', { area: 'admin' }); });
    load();
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.dashboards = { render: render };
})();
