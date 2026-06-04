/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/overview.js — Tela inicial                     ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║  Cards-resumo com contagens reais do banco. Tudo em paralelo,       ║
  ║  com skeleton enquanto carrega, fallback robusto em caso de erro.   ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function shell() {
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<h2 class="sa-view__title">Visão Geral</h2>' +
          '<p class="sa-view__sub">Central de controle do dono da plataforma — Fase 0 · Fundação ativa.</p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<button type="button" class="sa-btn sa-btn--soft" id="ov-go-pages">' +
            '<i class="fa-solid fa-file-lines" aria-hidden="true"></i><span>Editar páginas</span>' +
          '</button>' +
          '<button type="button" class="sa-btn sa-btn--ghost" id="ov-go-history">' +
            '<i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i><span>Histórico</span>' +
          '</button>' +
        '</div>' +
      '</header>' +
      '<section class="sa-grid" id="ov-grid">' + skeletonCards(4) + '</section>' +
      '<section class="sa-panel" style="margin-top:18px">' +
        '<h3 class="sa-panel__title">O que está liberado nesta fase</h3>' +
        '<ul style="margin:0; padding-left:18px; color:var(--sa-text-soft); line-height:1.7;">' +
          '<li>Login seguro com Supabase Auth + verificação de papel <code>super_admin</code>.</li>' +
          '<li>Tabelas-base do conteúdo (páginas, seções, cards) com rascunho/publicado e soft delete.</li>' +
          '<li>Versionamento e histórico auditável (toda alteração registrada).</li>' +
          '<li>Painel responsivo, navegação ativa e estrutura pronta para os editores das próximas fases.</li>' +
        '</ul>' +
      '</section>';
  }

  function skeletonCards(n) {
    var out = '';
    for (var i = 0; i < n; i++) {
      out += '<div class="sa-card">' +
        '<div class="sa-skel" style="height:14px;width:60%"></div>' +
        '<div class="sa-skel" style="height:32px;width:40%;margin-top:6px"></div>' +
        '<div class="sa-skel" style="height:12px;width:80%"></div>' +
      '</div>';
    }
    return out;
  }

  async function loadStats() {
    var sb = window.supabaseClient;
    if (!sb) return { error: 'Supabase não inicializado.' };
    try {
      var pages = sb.from('site_pages').select('id, status, area_type', { count: 'exact' }).is('deleted_at', null);
      var sections = sb.from('site_sections').select('id', { count: 'exact' }).is('deleted_at', null);
      var cards    = sb.from('site_cards').select('id', { count: 'exact' }).is('deleted_at', null);
      var logs     = sb.from('system_change_logs').select('id', { count: 'exact' });

      var results = await Promise.all([pages, sections, cards, logs]);

      // Se qualquer query veio com erro, tratamos como "fundação não aplicada"
      // (mais comum: migração SQL ainda não rodou no Supabase do usuário).
      for (var i = 0; i < results.length; i++) {
        var err = results[i].error;
        if (err) {
          var msg = String(err.message || '');
          if (msg.indexOf('Could not find the table') >= 0 || msg.indexOf('does not exist') >= 0) {
            return { error: 'missing_tables' };
          }
          return { error: msg };
        }
      }

      var pagesData = results[0].data || [];
      return {
        pages_total:    results[0].count || pagesData.length,
        pages_public:   pagesData.filter(function (p) { return p.area_type === 'site_publico'; }).length,
        pages_admin:    pagesData.filter(function (p) { return p.area_type === 'admin'; }).length,
        pages_drafts:   pagesData.filter(function (p) { return p.status === 'draft'; }).length,
        sections_total: results[1].count || 0,
        cards_total:    results[2].count || 0,
        logs_total:     results[3].count || 0
      };
    } catch (e) {
      console.error('[overview] erro carregando stats', e);
      return { error: e.message || 'Erro desconhecido' };
    }
  }

  function card(title, value, icon, hint) {
    return '<div class="sa-card">' +
      '<h3 class="sa-card__title"><i class="fa-solid ' + escHtml(icon) + '" aria-hidden="true"></i><span>' + escHtml(title) + '</span></h3>' +
      '<p class="sa-card__value">' + escHtml(value) + '</p>' +
      '<p class="sa-card__hint">' + escHtml(hint || '') + '</p>' +
    '</div>';
  }

  async function render() {
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.innerHTML = shell();

    if (window.SA && window.SA.layout) {
      window.SA.layout.setCrumbs([{ label: 'Super Admin' }, { label: 'Visão Geral', strong: true }]);
    }

    document.getElementById('ov-go-pages').addEventListener('click', function () {
      window.SA.router.go('pages', {});
    });
    document.getElementById('ov-go-history').addEventListener('click', function () {
      window.SA.router.go('history', {});
    });

    var stats = await loadStats();
    var grid = document.getElementById('ov-grid');
    if (!grid) return;

    if (stats && stats.error === 'missing_tables') {
      grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1">' +
        '<i class="fa-solid fa-database" style="font-size:28px"></i>' +
        '<div style="font-weight:700;color:var(--sa-text);font-size:15px">Fundação ainda não aplicada no banco</div>' +
        '<div style="max-width:560px">As tabelas do Super Admin não existem no Supabase. Abra o <strong>SQL Editor</strong>, execute o arquivo <code>db/super-admin/001_super_admin_foundation.sql</code> e recarregue esta página.</div>' +
        '<div style="margin-top:6px"><a class="sa-btn sa-btn--primary" href="db/super-admin/README.md" target="_blank" rel="noopener"><i class="fa-solid fa-book"></i><span>Abrir guia de setup</span></a></div>' +
      '</div>';
      return;
    }

    if (stats && stats.error) {
      grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1">' +
        '<i class="fa-solid fa-triangle-exclamation"></i>' +
        '<div>Não consegui carregar as métricas: ' + escHtml(stats.error) + '</div>' +
      '</div>';
      return;
    }

    grid.innerHTML =
      card('Páginas (públicas)',  stats.pages_public,  'fa-globe',          'Editáveis pelo painel') +
      card('Páginas (admin)',     stats.pages_admin,   'fa-screwdriver-wrench', 'Área interna') +
      card('Seções no banco',     stats.sections_total,'fa-layer-group',    'Blocos editáveis criados') +
      card('Cards no banco',      stats.cards_total,   'fa-square',         'Pequenos blocos editáveis') +
      card('Rascunhos pendentes', stats.pages_drafts,  'fa-pen',            'Páginas com mudanças não publicadas') +
      card('Eventos no histórico',stats.logs_total,    'fa-clock-rotate-left', 'Total de ações registradas');
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.overview = { render: render };
})();
