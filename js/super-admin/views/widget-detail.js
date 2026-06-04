/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/widget-detail.js                               ║
  ║  Editor de um widget: tipo + título + config JSON + preview ao vivo. ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  var TYPES = [
    { key: 'kpi',            label: 'KPI numérico',         icon: 'fa-chart-simple' },
    { key: 'progress',       label: 'Barra de progresso',   icon: 'fa-bars-progress' },
    { key: 'list',           label: 'Lista (top N)',        icon: 'fa-list' },
    { key: 'table',          label: 'Tabela',               icon: 'fa-table' },
    { key: 'chart_bar',      label: 'Gráfico de barras',    icon: 'fa-chart-column' },
    { key: 'chart_line',     label: 'Gráfico de linha',     icon: 'fa-chart-line' },
    { key: 'chart_area',     label: 'Gráfico de área',      icon: 'fa-chart-area' },
    { key: 'chart_pie',      label: 'Pizza',                icon: 'fa-chart-pie' },
    { key: 'chart_doughnut', label: 'Rosca',                icon: 'fa-circle-notch' },
    { key: 'chart_radar',    label: 'Radar',                icon: 'fa-bullseye' },
    { key: 'custom',         label: 'HTML personalizado',   icon: 'fa-code' }
  ];

  var st = { widget: null, page: null };

  function shell(w, page) {
    var typeOpts = TYPES.map(function (t) {
      return '<option value="' + escHtml(t.key) + '">' + escHtml(t.label) + '</option>';
    }).join('');

    var sourceOpts = (window.SA.widgetRenderer.ALLOWED_SOURCES || []).map(function (s) {
      return '<option value="' + escHtml(s) + '">' + escHtml(s) + '</option>';
    }).join('');

    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
            '<button type="button" class="sa-btn sa-btn--ghost" id="wd-back"><i class="fa-solid fa-arrow-left"></i><span>Voltar</span></button>' +
            '<h2 class="sa-view__title" style="margin:0">Editar widget</h2>' +
          '</div>' +
          '<p class="sa-view__sub">Dashboard: <strong>' + escHtml(page.title) + '</strong></p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<button class="sa-btn sa-btn--soft"    id="wd-publish"><i class="fa-solid fa-rocket"></i><span>Publicar</span></button>' +
        '</div>' +
      '</header>' +

      '<div class="wd-grid">' +
        '<section class="sa-panel">' +
          '<h3 class="sa-panel__title">Configuração</h3>' +
          '<div class="sa-row">' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Tipo</span>' +
              '<select class="sa-field__input" id="wd-type">' + typeOpts + '</select>' +
            '</label>' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Título</span>' +
              '<input class="sa-field__input" id="wd-title" maxlength="120" />' +
            '</label>' +
          '</div>' +

          '<div class="sa-row">' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Subtítulo / hint</span>' +
              '<input class="sa-field__input" id="wd-subtitle" maxlength="200" />' +
            '</label>' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Largura na grade (1–4)</span>' +
              '<input class="sa-field__input" id="wd-span" type="number" min="1" max="4" />' +
            '</label>' +
          '</div>' +

          '<details open>' +
            '<summary style="cursor:pointer;color:var(--sa-text-soft);padding:8px 0;font-weight:600">Fonte de dados</summary>' +
            '<div class="sa-row">' +
              '<label class="sa-field">' +
                '<span class="sa-field__label">Tabela</span>' +
                '<select class="sa-field__input" id="wd-source">' + sourceOpts + '</select>' +
              '</label>' +
              '<label class="sa-field">' +
                '<span class="sa-field__label">Agregação</span>' +
                '<select class="sa-field__input" id="wd-agg">' +
                  '<option value="count">count (contar)</option>' +
                  '<option value="sum:total_kg">sum (somar coluna)</option>' +
                  '<option value="avg:total_kg">avg (média)</option>' +
                '</select>' +
              '</label>' +
              '<label class="sa-field">' +
                '<span class="sa-field__label">Coluna para somar/médi (se aplicável)</span>' +
                '<input class="sa-field__input" id="wd-aggcol" placeholder="ex.: total_kg" />' +
              '</label>' +
              '<label class="sa-field">' +
                '<span class="sa-field__label">Agrupar por (gráficos/lista)</span>' +
                '<input class="sa-field__input" id="wd-groupby" placeholder="ex.: status, food, categoria" />' +
              '</label>' +
              '<label class="sa-field">' +
                '<span class="sa-field__label">Ordenar por</span>' +
                '<input class="sa-field__input" id="wd-orderby" placeholder="-value | label | -created_at" />' +
              '</label>' +
              '<label class="sa-field">' +
                '<span class="sa-field__label">Limite (top N)</span>' +
                '<input class="sa-field__input" id="wd-limit" type="number" min="1" max="100" />' +
              '</label>' +
              '<label class="sa-field" style="grid-column:1/-1">' +
                '<span class="sa-field__label">Filtros (JSON) — ex.: {"status":"pendente"}</span>' +
                '<input class="sa-field__input" id="wd-where" />' +
              '</label>' +
              '<label class="sa-field">' +
                '<span class="sa-field__label">Coluna de período</span>' +
                '<input class="sa-field__input" id="wd-pcol" placeholder="ex.: created_at" />' +
              '</label>' +
              '<label class="sa-field">' +
                '<span class="sa-field__label">Últimos N dias</span>' +
                '<input class="sa-field__input" id="wd-pdays" type="number" min="1" />' +
              '</label>' +
            '</div>' +
          '</details>' +

          '<details>' +
            '<summary style="cursor:pointer;color:var(--sa-text-soft);padding:8px 0;font-weight:600">Aparência</summary>' +
            '<div class="sa-row">' +
              '<label class="sa-field">' +
                '<span class="sa-field__label">Ícone (KPI)</span>' +
                '<input class="sa-field__input" id="wd-icon" placeholder="ex.: fa-hand-holding-heart" />' +
              '</label>' +
              '<label class="sa-field">' +
                '<span class="sa-field__label">Prefixo / Sufixo</span>' +
                '<span class="sa-field__wrap" style="display:flex;gap:8px">' +
                  '<input class="sa-field__input" id="wd-prefix" placeholder="R$ " />' +
                  '<input class="sa-field__input" id="wd-suffix" placeholder=" kg" />' +
                '</span>' +
              '</label>' +
              '<label class="sa-field" style="grid-column:1/-1">' +
                '<span class="sa-field__label">Cores (hex separadas por vírgula)</span>' +
                '<input class="sa-field__input" id="wd-colors" placeholder="#4a8a39, #e0a526, #4ea1ff" />' +
              '</label>' +
              '<label class="sa-field">' +
                '<span class="sa-field__label">Meta (progress)</span>' +
                '<input class="sa-field__input" id="wd-goal" type="number" />' +
              '</label>' +
              '<label class="sa-field" style="grid-column:1/-1">' +
                '<span class="sa-field__label">Colunas para tabela/lista (separadas por vírgula)</span>' +
                '<input class="sa-field__input" id="wd-cols" placeholder="ex.: name,food,total_kg" />' +
              '</label>' +
              '<label class="sa-field" style="grid-column:1/-1">' +
                '<span class="sa-field__label">HTML personalizado (custom)</span>' +
                '<textarea class="sa-field__input" id="wd-html" rows="3" style="font-family:Space Mono, monospace; font-size:12.5px"></textarea>' +
              '</label>' +
            '</div>' +
          '</details>' +

          '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">' +
            '<button class="sa-btn sa-btn--danger"  id="wd-delete"><i class="fa-solid fa-trash"></i><span>Excluir</span></button>' +
            '<button class="sa-btn sa-btn--soft"    id="wd-save"><i class="fa-solid fa-floppy-disk"></i><span>Salvar e ver preview</span></button>' +
          '</div>' +
        '</section>' +

        '<section class="sa-panel">' +
          '<h3 class="sa-panel__title">Pré-visualização ao vivo</h3>' +
          '<div id="wd-preview" style="min-height:200px"></div>' +
          '<p style="color:var(--sa-text-mute);font-size:12.5px;margin:10px 0 0">Salve para ver os dados reais. As alterações de tipo/fonte são aplicadas imediatamente.</p>' +
        '</section>' +
      '</div>';
  }

  function reflectTypeChanges() {
    // Pode ser usado futuramente para esconder campos não relevantes a um tipo
  }

  function fillForm(w) {
    document.getElementById('wd-type').value     = w.type     || 'kpi';
    document.getElementById('wd-title').value    = w.title    || '';
    document.getElementById('wd-subtitle').value = w.subtitle || '';
    document.getElementById('wd-span').value     = w.span_w   || 1;

    var c = w.config || {};
    document.getElementById('wd-source').value   = c.source   || 'doacoes';
    var agg = c.agg || 'count';
    if (agg.indexOf(':') >= 0) {
      document.getElementById('wd-agg').value    = agg;
      document.getElementById('wd-aggcol').value = agg.split(':')[1] || '';
    } else {
      document.getElementById('wd-agg').value    = 'count';
      document.getElementById('wd-aggcol').value = '';
    }
    document.getElementById('wd-groupby').value = c.groupBy || '';
    document.getElementById('wd-orderby').value = c.orderBy || '';
    document.getElementById('wd-limit').value   = c.limit   || '';
    document.getElementById('wd-where').value   = c.where ? JSON.stringify(c.where) : '';
    document.getElementById('wd-pcol').value    = (c.period && c.period.column) || '';
    document.getElementById('wd-pdays').value   = (c.period && c.period.days) || '';

    document.getElementById('wd-icon').value    = c.icon    || '';
    document.getElementById('wd-prefix').value  = c.prefix  || '';
    document.getElementById('wd-suffix').value  = c.suffix  || '';
    document.getElementById('wd-colors').value  = (c.colors || []).join(', ');
    document.getElementById('wd-goal').value    = c.goal    || '';
    document.getElementById('wd-cols').value    = (c.columns || []).join(',');
    document.getElementById('wd-html').value    = c.html    || '';
  }

  function readForm() {
    var aggSel = document.getElementById('wd-agg').value;
    var aggCol = document.getElementById('wd-aggcol').value.trim();
    var agg = aggSel === 'count' ? 'count' : (aggSel.split(':')[0] + ':' + (aggCol || aggSel.split(':')[1]));

    var whereStr = document.getElementById('wd-where').value.trim();
    var where = null;
    if (whereStr) {
      try { where = JSON.parse(whereStr); } catch (e) { throw new Error('Filtros (JSON) inválidos: ' + e.message); }
    }

    var pCol  = document.getElementById('wd-pcol').value.trim();
    var pDays = parseInt(document.getElementById('wd-pdays').value, 10);
    var period = null;
    if (pCol && pDays) period = { column: pCol, days: pDays };

    var colors = document.getElementById('wd-colors').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var cols   = document.getElementById('wd-cols').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);

    var config = {
      source:  document.getElementById('wd-source').value,
      agg:     agg,
      groupBy: document.getElementById('wd-groupby').value.trim() || null,
      orderBy: document.getElementById('wd-orderby').value.trim() || null,
      limit:   parseInt(document.getElementById('wd-limit').value, 10) || null,
      icon:    document.getElementById('wd-icon').value.trim() || null,
      prefix:  document.getElementById('wd-prefix').value || '',
      suffix:  document.getElementById('wd-suffix').value || '',
      colors:  colors.length ? colors : null,
      goal:    parseFloat(document.getElementById('wd-goal').value) || null,
      columns: cols.length ? cols : null,
      html:    document.getElementById('wd-html').value || null
    };
    if (where)  config.where  = where;
    if (period) config.period = period;
    // Limpa nulls
    Object.keys(config).forEach(function (k) { if (config[k] == null) delete config[k]; });

    return {
      type:     document.getElementById('wd-type').value,
      title:    document.getElementById('wd-title').value.trim(),
      subtitle: document.getElementById('wd-subtitle').value.trim(),
      span_w:   Math.max(1, Math.min(4, parseInt(document.getElementById('wd-span').value, 10) || 1)),
      config:   config
    };
  }

  async function preview() {
    try {
      var data = readForm();
      var preview = document.getElementById('wd-preview');
      preview.innerHTML = '';
      var node = document.createElement('div');
      preview.appendChild(node);
      // Monta um widget temporário em memória só para renderizar
      var w = Object.assign({ id: '__preview', status: 'draft', span_w: 1, config: {} }, st.widget, data);
      await window.SA.widgetRenderer.render(node, w);
    } catch (e) {
      window.SA.store.toast(e.message, 'err');
    }
  }

  async function save() {
    try {
      var data = readForm();
      await window.SA.api.widgets.update(st.widget.id, data);
      window.SA.store.toast('Widget salvo', 'ok');
      st.widget = await window.SA.api.widgets.get(st.widget.id);
      await preview();
    } catch (e) {
      window.SA.store.toast('Erro: ' + e.message, 'err');
    }
  }

  async function publish() {
    try {
      await save();
      await window.SA.api.widgets.publish(st.widget.id);
      window.SA.store.toast('Widget publicado', 'ok');
    } catch (e) {
      window.SA.store.toast('Falha: ' + e.message, 'err');
    }
  }

  async function remove() {
    if (!confirm('Excluir este widget?')) return;
    try {
      await window.SA.api.widgets.softDelete(st.widget.id);
      window.SA.store.toast('Widget excluído', 'ok');
      window.SA.router.go('dashboard-detail', { id: st.page.id });
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
    try {
      st.widget = await window.SA.api.widgets.get(id);
      if (!st.widget) throw new Error('Widget não encontrado');
      st.page = await window.SA.api.pages.get(st.widget.page_id);
    } catch (e) {
      view.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>Erro: ' + escHtml(e.message) + '</div></div>';
      return;
    }

    view.innerHTML = shell(st.widget, st.page);
    if (window.SA.layout) window.SA.layout.setCrumbs([
      { label: 'Super Admin' }, { label: 'Dashboards' },
      { label: st.page.title }, { label: st.widget.title || 'Widget', strong: true }
    ]);

    fillForm(st.widget);

    document.getElementById('wd-back').addEventListener('click',    function () { window.SA.router.go('dashboard-detail', { id: st.page.id }); });
    document.getElementById('wd-save').addEventListener('click',    save);
    document.getElementById('wd-publish').addEventListener('click', publish);
    document.getElementById('wd-delete').addEventListener('click',  remove);
    document.getElementById('wd-type').addEventListener('change',   reflectTypeChanges);

    bindStyles();
    await preview();
  }

  var stylesInjected = false;
  function bindStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var css = '' +
      '.wd-grid { display: grid; gap: 16px; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); align-items: start; }' +
      '@media (max-width: 1100px) { .wd-grid { grid-template-columns: 1fr; } }';
    var styleEl = document.createElement('style');
    styleEl.id = 'sa-widget-detail-styles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.widgetDetail = { render: render };
})();
