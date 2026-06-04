/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · ui/widget-renderer.js                                ║
  ║  Renderiza um admin_widget num container.                           ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  Tipos suportados:                                                  ║
  ║   • kpi               — número grande + descrição                   ║
  ║   • list              — top-N de uma tabela                         ║
  ║   • table             — tabela paginada                             ║
  ║   • chart_bar/line/area/pie/doughnut/radar — Chart.js               ║
  ║   • progress          — barra de progresso (atual / meta)           ║
  ║   • custom            — HTML livre (config.html)                    ║
  ║                                                                      ║
  ║  Config (JSONB):                                                    ║
  ║   {                                                                 ║
  ║     source:    "doacoes",                                           ║
  ║     agg:       "count" | "sum:total_kg" | "avg:total_kg",           ║
  ║     where:     { status: "pendente" },                              ║
  ║     groupBy:   "status",                                            ║
  ║     orderBy:   "-count" | "label",                                  ║
  ║     limit:     5,                                                   ║
  ║     period:    { column: "created_at", days: 30 },                  ║
  ║     icon:      "fa-hand-holding-heart",                             ║
  ║     prefix:    "R$ ",  suffix: " kg",                               ║
  ║     colors:    ["#4a8a39","#e0a526",...],                           ║
  ║     columns:   ["name","food","total_kg"],   (table)                ║
  ║     emptyText: "Sem registros."                                     ║
  ║   }                                                                 ║
  ║                                                                      ║
  ║  Tabelas alvo aceitas (allowlist anti-injection):                   ║
  ║    doacoes · voluntarios · familias · oracoes · alimentos ·         ║
  ║    galeria · site_form_submissions · system_change_logs             ║
  ║                                                                      ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  var ALLOWED_SOURCES = [
    'doacoes', 'voluntarios', 'familias', 'oracoes', 'alimentos',
    'galeria', 'site_form_submissions', 'system_change_logs',
    'site_pages', 'site_sections', 'site_cards', 'site_media'
  ];

  var DEFAULT_PALETTE = [
    '#4a8a39', '#7DC063', '#E8C96A', '#e0a526', '#4ea1ff',
    '#9d6bd2', '#d8523a', '#5fa64a', '#3d7eb8', '#c46aa6'
  ];

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function fmtNumber(n) {
    if (n == null || isNaN(n)) return '—';
    return new Intl.NumberFormat('pt-BR').format(n);
  }

  function client() { return window.supabaseClient; }

  /* ── Validação de source (allowlist) ─────────────────────────── */
  function safeSource(source) {
    if (!source) throw new Error('Widget sem fonte de dados (config.source).');
    if (ALLOWED_SOURCES.indexOf(source) < 0) {
      throw new Error('Fonte "' + source + '" não permitida. Use uma de: ' + ALLOWED_SOURCES.join(', '));
    }
    return source;
  }

  /* ── Builder de query Supabase reutilizável ────────────────────── */
  function applyWhere(q, where) {
    if (!where || typeof where !== 'object') return q;
    Object.keys(where).forEach(function (k) {
      var v = where[k];
      if (Array.isArray(v))                    q = q.in(k, v);
      else if (typeof v === 'string' && v.indexOf('%') >= 0) q = q.ilike(k, v);
      else                                     q = q.eq(k, v);
    });
    return q;
  }

  function applyPeriod(q, period) {
    if (!period || !period.column) return q;
    if (period.days) {
      var since = new Date(Date.now() - (Number(period.days) * 86400000));
      q = q.gte(period.column, since.toISOString());
    }
    if (period.from) q = q.gte(period.column, period.from);
    if (period.to)   q = q.lte(period.column, period.to);
    return q;
  }

  /* ── KPI ──────────────────────────────────────────────────────── */
  async function fetchKPI(cfg) {
    var src = safeSource(cfg.source);
    var sb  = client();
    var agg = cfg.agg || 'count';

    if (agg === 'count') {
      var q = sb.from(src).select('id', { count: 'exact', head: true });
      q = applyWhere(q, cfg.where);
      q = applyPeriod(q, cfg.period);
      var r = await q;
      if (r.error) throw new Error(r.error.message);
      return r.count || 0;
    }
    // sum:col / avg:col
    var parts = agg.split(':');
    var op    = parts[0];
    var col   = parts[1] || 'id';
    var qq = sb.from(src).select(col);
    qq = applyWhere(qq, cfg.where);
    qq = applyPeriod(qq, cfg.period);
    var rr = await qq;
    if (rr.error) throw new Error(rr.error.message);
    var arr = (rr.data || []).map(function (row) { return parseFloat(row[col]) || 0; });
    if (!arr.length) return 0;
    if (op === 'sum') return arr.reduce(function (a, b) { return a + b; }, 0);
    if (op === 'avg') return arr.reduce(function (a, b) { return a + b; }, 0) / arr.length;
    if (op === 'min') return Math.min.apply(null, arr);
    if (op === 'max') return Math.max.apply(null, arr);
    return 0;
  }

  function renderKPI(node, value, cfg) {
    var icon = cfg.icon ? '<i class="fa-solid ' + escHtml(cfg.icon) + '" aria-hidden="true"></i>' : '';
    var v = (cfg.prefix || '') + fmtNumber(typeof value === 'number' ? Math.round(value * 100) / 100 : value) + (cfg.suffix || '');
    node.innerHTML =
      '<div class="aw-kpi">' +
        (icon ? '<div class="aw-kpi__icon">' + icon + '</div>' : '') +
        '<div class="aw-kpi__value">' + escHtml(v) + '</div>' +
        (cfg.hint ? '<div class="aw-kpi__hint">' + escHtml(cfg.hint) + '</div>' : '') +
      '</div>';
  }

  /* ── Lista (top N) ─────────────────────────────────────────────── */
  async function fetchList(cfg) {
    var src   = safeSource(cfg.source);
    var sb    = client();
    var sel   = (cfg.columns && cfg.columns.length) ? cfg.columns.join(',') : '*';
    var order = cfg.orderBy || '-created_at';
    var desc  = order.charAt(0) === '-';
    var col   = desc ? order.substr(1) : order;
    var q = sb.from(src).select(sel).order(col, { ascending: !desc }).limit(cfg.limit || 5);
    q = applyWhere(q, cfg.where);
    q = applyPeriod(q, cfg.period);
    var r = await q;
    if (r.error) throw new Error(r.error.message);
    return r.data || [];
  }

  function renderList(node, rows, cfg) {
    if (!rows.length) {
      node.innerHTML = '<div class="aw-empty">' + escHtml(cfg.emptyText || 'Sem registros.') + '</div>';
      return;
    }
    var labelCol = (cfg.columns && cfg.columns[0]) || 'name';
    var subCol   = (cfg.columns && cfg.columns[1]) || null;
    node.innerHTML = '<ul class="aw-list">' +
      rows.map(function (r) {
        var label = r[labelCol] != null ? r[labelCol] : '—';
        var sub   = subCol && r[subCol] != null ? '<span class="aw-list__sub">' + escHtml(r[subCol]) + '</span>' : '';
        return '<li><strong>' + escHtml(label) + '</strong>' + sub + '</li>';
      }).join('') +
    '</ul>';
  }

  /* ── Tabela ────────────────────────────────────────────────────── */
  async function fetchTable(cfg) { return await fetchList(cfg); }

  function renderTable(node, rows, cfg) {
    var cols = (cfg.columns && cfg.columns.length) ? cfg.columns : (rows[0] ? Object.keys(rows[0]).slice(0, 4) : []);
    if (!rows.length) {
      node.innerHTML = '<div class="aw-empty">' + escHtml(cfg.emptyText || 'Sem registros.') + '</div>';
      return;
    }
    var thead = '<tr>' + cols.map(function (c) { return '<th>' + escHtml(c) + '</th>'; }).join('') + '</tr>';
    var tbody = rows.map(function (r) {
      return '<tr>' + cols.map(function (c) { return '<td>' + escHtml(r[c] != null ? r[c] : '') + '</td>'; }).join('') + '</tr>';
    }).join('');
    node.innerHTML = '<div class="aw-table-wrap"><table class="aw-table"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table></div>';
  }

  /* ── Charts (Chart.js) ─────────────────────────────────────────── */
  async function fetchGroup(cfg) {
    // Agrupa por uma coluna (`groupBy`) e retorna [{ label, value }].
    var src = safeSource(cfg.source);
    var sb  = client();
    var groupCol = cfg.groupBy;
    if (!groupCol) throw new Error('Configure config.groupBy para gráficos.');

    // Pegamos os registros e agrupamos client-side (Supabase JS sem SQL bruto)
    var sel = groupCol;
    var aggParts = (cfg.agg || 'count').split(':');
    var aggCol   = aggParts[1];
    if (aggCol) sel += ',' + aggCol;
    var q = sb.from(src).select(sel).limit(5000);
    q = applyWhere(q, cfg.where);
    q = applyPeriod(q, cfg.period);
    var r = await q;
    if (r.error) throw new Error(r.error.message);
    var rows = r.data || [];

    var bag = {};
    rows.forEach(function (row) {
      var key = (row[groupCol] == null || row[groupCol] === '') ? '(vazio)' : String(row[groupCol]);
      if (!bag[key]) bag[key] = [];
      bag[key].push(row);
    });
    var op = aggParts[0];
    var data = Object.keys(bag).map(function (label) {
      var arr = bag[label];
      var val;
      if (op === 'count') val = arr.length;
      else if (op === 'sum') val = arr.reduce(function (a, b) { return a + (parseFloat(b[aggCol]) || 0); }, 0);
      else if (op === 'avg') val = arr.reduce(function (a, b) { return a + (parseFloat(b[aggCol]) || 0); }, 0) / arr.length;
      else val = arr.length;
      return { label: label, value: val };
    });

    // Ordenação
    var ord = cfg.orderBy || '-value';
    var desc = ord.charAt(0) === '-';
    var col  = desc ? ord.substr(1) : ord;
    data.sort(function (a, b) {
      if (col === 'label') return desc ? b.label.localeCompare(a.label) : a.label.localeCompare(b.label);
      return desc ? (b.value - a.value) : (a.value - b.value);
    });
    if (cfg.limit) data = data.slice(0, cfg.limit);
    return data;
  }

  function chartTypeOf(t) {
    return t === 'chart_bar'      ? 'bar'
         : t === 'chart_line'     ? 'line'
         : t === 'chart_area'     ? 'line'   /* line + fill */
         : t === 'chart_pie'      ? 'pie'
         : t === 'chart_doughnut' ? 'doughnut'
         : t === 'chart_radar'    ? 'radar'
         : 'bar';
  }

  function renderChart(node, data, type, cfg) {
    if (typeof Chart === 'undefined') {
      node.innerHTML = '<div class="aw-empty">Chart.js não carregado.</div>';
      return null;
    }
    if (!data.length) {
      node.innerHTML = '<div class="aw-empty">' + escHtml(cfg.emptyText || 'Sem dados para o período.') + '</div>';
      return null;
    }
    node.innerHTML = '<canvas></canvas>';
    var ctx = node.querySelector('canvas').getContext('2d');
    var labels  = data.map(function (d) { return d.label; });
    var values  = data.map(function (d) { return d.value; });
    var colors  = (cfg.colors && cfg.colors.length) ? cfg.colors : DEFAULT_PALETTE;

    var ds = {
      label: cfg.title || cfg.source || 'Valores',
      data: values,
      backgroundColor: (type === 'chart_pie' || type === 'chart_doughnut' || type === 'chart_radar' || type === 'chart_bar')
        ? labels.map(function (_, i) { return colors[i % colors.length]; })
        : colors[0] + (type === 'chart_area' ? '55' : ''),
      borderColor:     colors[0],
      borderWidth: 2
    };
    if (type === 'chart_area' || type === 'chart_radar') ds.fill = true;
    if (type === 'chart_line' || type === 'chart_area')  ds.tension = 0.32;

    var chart = new Chart(ctx, {
      type: chartTypeOf(type),
      data: { labels: labels, datasets: [ds] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: type === 'chart_pie' || type === 'chart_doughnut' || type === 'chart_radar', labels: { color: '#b6bcc8' } }
        },
        scales: (type === 'chart_pie' || type === 'chart_doughnut' || type === 'chart_radar') ? {} : {
          x: { ticks: { color: '#b6bcc8' }, grid: { color: 'rgba(255,255,255,.06)' } },
          y: { ticks: { color: '#b6bcc8' }, grid: { color: 'rgba(255,255,255,.06)' }, beginAtZero: true }
        }
      }
    });
    return chart;
  }

  /* ── Progress ────────────────────────────────────────────────── */
  async function fetchProgress(cfg) {
    var v = await fetchKPI(cfg);
    var goal = Number(cfg.goal || 100);
    return { value: v, goal: goal };
  }
  function renderProgress(node, data, cfg) {
    var pct = data.goal > 0 ? Math.min(100, Math.round((data.value / data.goal) * 100)) : 0;
    node.innerHTML =
      '<div class="aw-progress">' +
        '<div class="aw-progress__top"><strong>' + escHtml(fmtNumber(data.value)) + '</strong>' +
          '<span class="aw-progress__goal">de ' + escHtml(fmtNumber(data.goal)) + (cfg.suffix ? ' ' + escHtml(cfg.suffix) : '') + '</span></div>' +
        '<div class="aw-progress__bar"><span style="width:' + pct + '%"></span></div>' +
        '<div class="aw-progress__pct">' + pct + '%</div>' +
      '</div>';
  }

  /* ── Skeleton + erro ──────────────────────────────────────────── */
  function renderSkeleton(node, cfg) {
    var title = cfg.title || '';
    node.innerHTML =
      (title ? '<div class="aw-head"><h3>' + escHtml(title) + '</h3></div>' : '') +
      '<div class="aw-body"><div class="sa-skel" style="height:54px;border-radius:10px"></div></div>';
  }
  function renderError(node, msg) {
    node.innerHTML = '<div class="aw-error"><i class="fa-solid fa-triangle-exclamation"></i><span>' + escHtml(msg) + '</span></div>';
  }

  /* ── Composição: head + body ──────────────────────────────────── */
  function ensureShell(node, w) {
    var title = w.title || (w.config && w.config.title) || '';
    var subtitle = w.subtitle || (w.config && w.config.subtitle) || '';
    var head = (title || subtitle)
      ? '<div class="aw-head">' + (title ? '<h3>' + escHtml(title) + '</h3>' : '') + (subtitle ? '<p>' + escHtml(subtitle) + '</p>' : '') + '</div>'
      : '';
    node.innerHTML = head + '<div class="aw-body"></div>';
    return node.querySelector('.aw-body');
  }

  /* ── API pública ─────────────────────────────────────────────── */
  async function render(node, widget) {
    if (!node || !widget) return;
    bindStyles();
    node.classList.add('aw-card');
    node.style.gridColumn = 'span ' + (widget.span_w || 1);
    node.style.minHeight  = (widget.height_desktop || 180) + 'px';
    var body = ensureShell(node, widget);

    var cfg = widget.config || {};
    try {
      switch (widget.type) {
        case 'kpi':       renderKPI(body, await fetchKPI(cfg), cfg); break;
        case 'list':      renderList(body, await fetchList(cfg), cfg); break;
        case 'table':     renderTable(body, await fetchTable(cfg), cfg); break;
        case 'chart_bar':
        case 'chart_line':
        case 'chart_area':
        case 'chart_pie':
        case 'chart_doughnut':
        case 'chart_radar':
          renderChart(body, await fetchGroup(cfg), widget.type, cfg); break;
        case 'progress':  renderProgress(body, await fetchProgress(cfg), cfg); break;
        case 'custom':    body.innerHTML = String(cfg.html || ''); break;
        default:          renderError(body, 'Tipo de widget desconhecido: ' + widget.type);
      }
    } catch (e) {
      renderError(body, e.message || 'Erro ao renderizar.');
    }
  }

  /* ── Estilos ──────────────────────────────────────────────────── */
  var stylesInjected = false;
  function bindStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var css = '' +
      '.aw-card { background: linear-gradient(180deg, var(--sa-bg-elev), #11151c); border: 1px solid var(--sa-line); border-radius: 14px; padding: 16px; box-shadow: var(--sa-shadow-1); display: flex; flex-direction: column; gap: 10px; min-width: 0; transition: border-color .15s var(--sa-ease); position: relative; }' +
      '.aw-card:hover { border-color: var(--sa-line-2); }' +
      '.aw-head h3 { margin: 0; font-size: 13px; letter-spacing: .04em; text-transform: uppercase; color: var(--sa-text-soft); font-weight: 700; }' +
      '.aw-head p  { margin: 4px 0 0; color: var(--sa-text-mute); font-size: 12.5px; }' +
      '.aw-body { flex: 1; display: flex; flex-direction: column; min-height: 0; }' +

      '.aw-kpi { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: center; }' +
      '.aw-kpi__icon { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 12px; background: var(--sa-accent-soft); color: var(--sa-accent-2); font-size: 20px; }' +
      '.aw-kpi__value { font-family: "Playfair Display", Georgia, serif; font-size: clamp(26px, 3vw, 36px); line-height: 1.1; color: var(--sa-text); grid-column: 1 / -1; }' +
      '.aw-kpi__icon + .aw-kpi__value { grid-column: auto; }' +
      '.aw-kpi__hint { color: var(--sa-text-mute); font-size: 12.5px; grid-column: 1 / -1; }' +

      '.aw-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }' +
      '.aw-list li { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; border-radius: 8px; background: rgba(255,255,255,.02); border: 1px solid var(--sa-line); }' +
      '.aw-list__sub { color: var(--sa-text-mute); font-size: 12.5px; }' +

      '.aw-table-wrap { overflow: auto; border: 1px solid var(--sa-line); border-radius: 10px; }' +
      '.aw-table { width: 100%; border-collapse: collapse; font-size: 13px; }' +
      '.aw-table th, .aw-table td { padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--sa-line); white-space: nowrap; }' +
      '.aw-table th { background: #0f141a; color: var(--sa-text-mute); font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }' +

      '.aw-progress__top { display: flex; align-items: baseline; gap: 6px; }' +
      '.aw-progress__top strong { font-family: "Playfair Display", serif; font-size: 24px; color: var(--sa-text); }' +
      '.aw-progress__goal { color: var(--sa-text-mute); font-size: 12.5px; }' +
      '.aw-progress__bar { background: var(--sa-bg-soft); border-radius: 999px; overflow: hidden; height: 10px; margin: 8px 0 4px; }' +
      '.aw-progress__bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--sa-accent-2), var(--sa-accent)); transition: width .4s var(--sa-ease); }' +
      '.aw-progress__pct { font-size: 12px; color: var(--sa-text-mute); text-align: right; }' +

      '.aw-empty { padding: 14px; color: var(--sa-text-mute); text-align: center; font-size: 13px; }' +
      '.aw-error { display: flex; align-items: center; gap: 8px; color: #ffb7a8; background: rgba(216,82,58,.10); border: 1px solid rgba(216,82,58,.30); border-radius: 10px; padding: 10px; font-size: 13px; }' +
      '.aw-error i { color: var(--sa-danger); }' +

      '.aw-card canvas { width: 100% !important; height: 100% !important; min-height: 180px; }';

    var st = document.createElement('style');
    st.id = 'sa-widget-renderer-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  window.SA = window.SA || {};
  window.SA.widgetRenderer = {
    render:           render,
    ALLOWED_SOURCES:  ALLOWED_SOURCES,
    DEFAULT_PALETTE:  DEFAULT_PALETTE
  };
})();
