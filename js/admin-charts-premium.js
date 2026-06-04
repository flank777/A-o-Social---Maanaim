/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  admin-charts-premium.js                                            ║
  ║  Substituição visual dos gráficos — apenas camada de renderização   ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║  SEÇÕES AFETADAS:                                                   ║
  ║    - Doações Recebidas  → renderDonationsStatusChart()              ║
  ║    - Voluntários        → renderVolunteersChart()                   ║
  ║                           renderVolTipoChart()                      ║
  ║    - Pedidos de Oração  → renderPrayersCharts()                     ║
  ║    - Tarefas            → _renderTarefasStatusChart()               ║
  ║                           _renderTarefasTipoChart()                 ║
  ║                                                                      ║
  ║  REGRAS:                                                            ║
  ║    ✅ Dados continuam vindo de DoaVidaSync (sem alteração)          ║
  ║    ✅ Canvas IDs preservados                                        ║
  ║    ✅ KPI IDs preservados                                           ║
  ║    ✅ Estados vazios e de erro tratados                             ║
  ║    ✅ Usa Chart.js 4.4.0 já carregado (sem novas dependências)      ║
  ║    ✅ killCanvas() garante que instâncias órfãs sejam destruídas    ║
  ║    ✅ MutationObserver redimensiona charts ao ativar qualquer aba   ║
  ║    ❌ Não altera lógica fora das 4 seções                           ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     PALETA PREMIUM
  ══════════════════════════════════════════════════════════════ */
  var C = {
    amber:  { s: '#F59E0B', bg: 'rgba(245,158,11,0.14)',  h: 'rgba(245,158,11,0.88)'  },
    green:  { s: '#22C55E', bg: 'rgba(34,197,94,0.14)',   h: 'rgba(34,197,94,0.88)'   },
    teal:   { s: '#14B8A6', bg: 'rgba(20,184,166,0.14)',  h: 'rgba(20,184,166,0.88)'  },
    blue:   { s: '#3B82F6', bg: 'rgba(59,130,246,0.14)',  h: 'rgba(59,130,246,0.88)'  },
    purple: { s: '#8B5CF6', bg: 'rgba(139,92,246,0.14)',  h: 'rgba(139,92,246,0.88)'  },
    red:    { s: '#EF4444', bg: 'rgba(239,68,68,0.14)',   h: 'rgba(239,68,68,0.88)'   },
    cyan:   { s: '#06B6D4', bg: 'rgba(6,182,212,0.14)',   h: 'rgba(6,182,212,0.88)'   },
    pink:   { s: '#EC4899', bg: 'rgba(236,72,153,0.14)',  h: 'rgba(236,72,153,0.88)'  },
    lime:   { s: '#84CC16', bg: 'rgba(132,204,22,0.14)',  h: 'rgba(132,204,22,0.88)'  },
  };

  /* Sequência de cores para múltiplas barras/fatias */
  var SEQ = [C.amber, C.blue, C.green, C.purple, C.cyan, C.pink, C.teal, C.lime, C.red];

  /* ══════════════════════════════════════════════════════════════
     TOOLTIP PADRÃO
  ══════════════════════════════════════════════════════════════ */
  var TT = {
    backgroundColor: 'rgba(8,8,14,0.97)',
    titleColor: '#F0EBE0',
    bodyColor: '#9CA3AF',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    padding: 14,
    cornerRadius: 12,
    displayColors: true,
    boxWidth: 10,
    boxHeight: 10,
    boxPadding: 4,
    titleFont: { family: 'DM Sans, sans-serif', size: 13, weight: '600' },
    bodyFont:  { family: 'DM Sans, sans-serif', size: 12 },
  };

  /* ══════════════════════════════════════════════════════════════
     ESCALAS PADRÃO
  ══════════════════════════════════════════════════════════════ */
  function scaleX(opts) {
    return Object.assign({
      grid: { display: false },
      ticks: { color: '#6B7280', font: { size: 11, family: 'DM Sans, sans-serif' } },
      border: { color: 'rgba(255,255,255,0.06)' },
    }, opts || {});
  }

  function scaleY(opts) {
    return Object.assign({
      beginAtZero: true,
      ticks: { color: '#6B7280', stepSize: 1, font: { size: 11 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
      border: { color: 'transparent' },
    }, opts || {});
  }

  /* ══════════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════════ */

  /* Destrói instância registrada no _charts global */
  function killChart(key) {
    if (window._charts && window._charts[key]) {
      try { window._charts[key].destroy(); } catch (e) {}
      window._charts[key] = null;
    }
  }

  /*
    Destrói qualquer instância Chart.js vinculada ao canvas via Chart.getChart().
    Necessário para evitar "Canvas is already in use" quando o gráfico foi criado
    em uma aba oculta (display:none) e a referência em _charts foi perdida.
  */
  function killCanvas(canvas) {
    if (!canvas || !window.Chart || typeof window.Chart.getChart !== 'function') return;
    var existing = window.Chart.getChart(canvas);
    if (existing) { try { existing.destroy(); } catch (e) {} }
  }

  /* Salva instância no registro global */
  function keepChart(key, inst) {
    if (!window._charts) window._charts = {};
    window._charts[key] = inst;
  }

  /* Redimensiona com delay (corrige canvas 300×150 padrão) */
  function deferResize(ch) {
    setTimeout(function () { try { ch.resize(); } catch (e) {} }, 80);
  }

  /* Exibe estado vazio no lugar do canvas */
  function showEmpty(canvas, icon, msg) {
    if (!canvas) return;
    var wrap = canvas.parentNode;
    if (!wrap) return;
    canvas.style.display = 'none';
    if (wrap.querySelector('.prem-chart-empty')) return;
    var em = document.createElement('div');
    em.className = 'prem-chart-empty';
    em.innerHTML = '<i class="' + icon + '"></i><span>' + msg + '</span>';
    wrap.appendChild(em);
  }

  /* Remove estado vazio e mostra canvas */
  function hideEmpty(canvas) {
    if (!canvas) return;
    canvas.style.display = '';
    var wrap = canvas.parentNode;
    if (!wrap) return;
    var em = wrap.querySelector('.prem-chart-empty');
    if (em) em.remove();
  }

  /* Plugin inline: label central do donut */
  function makeCenterPlugin(mainVal, subLabel, color) {
    return {
      id: 'premCenter',
      beforeDraw: function (chart) {
        if (chart.config.type !== 'doughnut') return;
        var ctx = chart.ctx;
        var ca  = chart.chartArea;
        if (!ca) return;
        var cx = (ca.left + ca.right)   / 2;
        var cy = (ca.top  + ca.bottom)  / 2;
        ctx.save();
        /* Número principal */
        ctx.font = 'bold 26px "Playfair Display", serif';
        ctx.fillStyle = color || '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(mainVal), cx, subLabel ? cy - 10 : cy);
        /* Sub-label */
        if (subLabel) {
          ctx.font = '10px "Space Mono", monospace';
          ctx.fillStyle = 'rgba(156,163,175,0.7)';
          ctx.letterSpacing = '0.05em';
          ctx.fillText(subLabel.toUpperCase(), cx, cy + 13);
        }
        ctx.restore();
      },
    };
  }

  /* Mescla tooltip padrão com callbacks customizados */
  function tooltip(callbacks) {
    return Object.assign({}, TT, { callbacks: callbacks });
  }

  /* ══════════════════════════════════════════════════════════════
     1. DOAÇÕES RECEBIDAS
        Barras verticais por status (pendente/confirmado/entregue/coleta/cancelado)
        Canvas: #donations-status-chart
        KPIs:   #don-pendente #don-confirmado #don-entregue #don-coleta #don-cancelado
  ══════════════════════════════════════════════════════════════ */
  function renderDonationsStatusChart(doacoesData) {
    if (!doacoesData) {
      DoaVidaSync.getDoacoes()
        .then(function (d) { renderDonationsStatusChart(d); })
        .catch(function () {});
      return;
    }

    killChart('donStatus');
    var canvas = document.getElementById('donations-status-chart');
    if (!canvas || !window.Chart) return;
    killCanvas(canvas);

    try {
      var STATUS = [
        { key: 'pendente',   label: 'Pendente',   cor: C.amber  },
        { key: 'confirmado', label: 'Confirmado', cor: C.green  },
        { key: 'entregue',   label: 'Entregue',   cor: C.teal   },
        { key: 'coleta',     label: 'Em Coleta',  cor: C.blue   },
        { key: 'cancelado',  label: 'Cancelado',  cor: C.red    },
      ];

      var counts = { pendente: 0, confirmado: 0, entregue: 0, coleta: 0, cancelado: 0 };
      doacoesData.forEach(function (d) {
        var s = (d.status || 'pendente').toLowerCase();
        if (counts[s] !== undefined) counts[s]++;
      });

      /* Atualiza KPI cards */
      STATUS.forEach(function (s) {
        var el = document.getElementById('don-' + s.key);
        if (el) el.textContent = counts[s.key];
      });

      var total = doacoesData.length;
      if (total === 0) {
        showEmpty(canvas, 'fas fa-hand-holding-heart', 'Nenhuma doação registrada ainda.');
        return;
      }
      hideEmpty(canvas);

      var ch = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: STATUS.map(function (s) { return s.label; }),
          datasets: [{
            data:                 STATUS.map(function (s) { return counts[s.key]; }),
            backgroundColor:      STATUS.map(function (s) { return s.cor.bg; }),
            borderColor:          STATUS.map(function (s) { return s.cor.s; }),
            hoverBackgroundColor: STATUS.map(function (s) { return s.cor.h; }),
            borderWidth: 2,
            borderRadius: 12,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 900, easing: 'easeOutQuart' },
          plugins: {
            legend: { display: false },
            tooltip: tooltip({
              title: function (items) { return items[0].label; },
              label: function (ctx) {
                var pct = total > 0 ? Math.round((ctx.parsed.y / total) * 100) : 0;
                return '  ' + ctx.parsed.y + ' doação(ões)  ·  ' + pct + '%';
              },
            }),
          },
          scales: {
            x: scaleX({ ticks: { color: '#9CA3AF', font: { size: 12, family: 'DM Sans, sans-serif' } } }),
            y: scaleY(),
          },
        },
      });

      keepChart('donStatus', ch);
      deferResize(ch);
    } catch (e) { /* silencia erros de canvas para não quebrar a tela */ }
  }

  /* ══════════════════════════════════════════════════════════════
     2a. VOLUNTÁRIOS — Barras horizontais por status (pipeline)
         Canvas: #volunteers-chart
         KPIs:   #vol-novo #vol-em-contato #vol-confirmado #vol-participando #vol-finalizado
  ══════════════════════════════════════════════════════════════ */
  function renderVolunteersChart(volsData) {
    if (!volsData) {
      DoaVidaSync.getVoluntarios()
        .then(function (d) { renderVolunteersChart(d); })
        .catch(function () {});
      return;
    }

    killChart('volunteers');
    var canvas = document.getElementById('volunteers-chart');
    if (!canvas || !window.Chart) return;
    killCanvas(canvas);

    try {
      var PIPELINE = [
        { key: 'novo',         label: 'Novo',          cor: C.amber  },
        { key: 'em-contato',   label: 'Em Contato',    cor: C.cyan   },
        { key: 'confirmado',   label: 'Confirmado',    cor: C.green  },
        { key: 'participando', label: 'Participando',  cor: C.blue   },
        { key: 'finalizado',   label: 'Finalizado',    cor: C.purple },
      ];

      var counts = { novo: 0, 'em-contato': 0, confirmado: 0, participando: 0, finalizado: 0 };
      volsData.forEach(function (v) {
        var s = v.status || 'novo';
        if (counts[s] !== undefined) counts[s]++;
      });

      /* Atualiza KPI cards */
      var idMap = { novo:'vol-novo','em-contato':'vol-em-contato',confirmado:'vol-confirmado',participando:'vol-participando',finalizado:'vol-finalizado' };
      Object.keys(idMap).forEach(function (s) {
        var el = document.getElementById(idMap[s]);
        if (el) el.textContent = counts[s];
      });

      var total = volsData.length;
      if (total === 0) {
        showEmpty(canvas, 'fas fa-users', 'Nenhum voluntário cadastrado ainda.');
        return;
      }
      hideEmpty(canvas);

      var ch = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: PIPELINE.map(function (p) { return p.label; }),
          datasets: [{
            data:                 PIPELINE.map(function (p) { return counts[p.key]; }),
            backgroundColor:      PIPELINE.map(function (p) { return p.cor.bg; }),
            borderColor:          PIPELINE.map(function (p) { return p.cor.s; }),
            hoverBackgroundColor: PIPELINE.map(function (p) { return p.cor.h; }),
            borderWidth: 2,
            borderRadius: 10,
            borderSkipped: false,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 900, easing: 'easeOutQuart' },
          plugins: {
            legend: { display: false },
            tooltip: tooltip({
              title: function (items) { return items[0].label; },
              label: function (ctx) {
                var pct = total > 0 ? Math.round((ctx.parsed.x / total) * 100) : 0;
                return '  ' + ctx.parsed.x + ' voluntário(s)  ·  ' + pct + '%';
              },
            }),
          },
          scales: {
            x: scaleY({ ticks: { color: '#6B7280', font: { size: 11 } } }),
            y: scaleX({ ticks: { color: '#D1D5DB', font: { size: 12, family: 'DM Sans, sans-serif' } } }),
          },
        },
      });

      keepChart('volunteers', ch);
      deferResize(ch);
    } catch (e) {}
  }

  /* ══════════════════════════════════════════════════════════════
     2b. VOLUNTÁRIOS — Donut por tipo de contribuição
         Canvas: #vol-tipo-chart
         Breakdown: #vol-tipo-breakdown
  ══════════════════════════════════════════════════════════════ */
  function renderVolTipoChart(volsData) {
    if (!volsData) {
      DoaVidaSync.getVoluntarios()
        .then(function (d) { renderVolTipoChart(d); })
        .catch(function () {});
      return;
    }

    killChart('volTipo');
    var canvas = document.getElementById('vol-tipo-chart');
    if (!canvas || !window.Chart) return;
    killCanvas(canvas);

    try {
      var TIPOS = [
        { key: 'doacao',             label: 'Doação',           cor: C.amber,  count: 0 },
        { key: 'voluntario',         label: 'Trab. Voluntário', cor: C.green,  count: 0 },
        { key: 'apoio-espiritual',   label: 'Apoio Espiritual', cor: C.purple, count: 0 },
        { key: 'logistica',          label: 'Logística',        cor: C.cyan,   count: 0 },
        { key: 'outros',             label: 'Outros',           cor: C.pink,   count: 0 },
      ];

      volsData.forEach(function (v) {
        var t = (v.tipo || 'outros').toLowerCase();
        var found = TIPOS.find(function (tp) { return tp.key === t; });
        if (found) found.count++;
        else TIPOS[TIPOS.length - 1].count++; /* → outros */
      });

      var total = volsData.length;
      if (total === 0) {
        showEmpty(canvas, 'fas fa-chart-pie', 'Sem dados para exibir.');
        return;
      }
      hideEmpty(canvas);

      /* Filtra itens com valor 0 para não poluir o donut */
      var ativos = TIPOS.filter(function (t) { return t.count > 0; });

      var ch = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels:   ativos.map(function (t) { return t.label; }),
          datasets: [{
            data:            ativos.map(function (t) { return t.count; }),
            backgroundColor: ativos.map(function (t) { return t.cor.bg; }),
            borderColor:     ativos.map(function (t) { return t.cor.s; }),
            borderWidth: 2,
            hoverOffset: 10,
            hoverBorderWidth: 3,
          }],
        },
        plugins: [makeCenterPlugin(total, 'total', '#F0EBE0')],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '66%',
          animation: { duration: 950, easing: 'easeOutQuart' },
          plugins: {
            legend: { display: false },
            tooltip: tooltip({
              label: function (ctx) {
                var pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                return '  ' + ctx.parsed + ' voluntário(s)  ·  ' + pct + '%';
              },
            }),
          },
        },
      });

      keepChart('volTipo', ch);

      /* Breakdown lateral */
      var bd = document.getElementById('vol-tipo-breakdown');
      if (bd) {
        bd.innerHTML = TIPOS.map(function (t) {
          var pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
          return (
            '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;' +
            'border-bottom:1px solid rgba(255,255,255,0.05)">' +
            '<div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;' +
            'background:' + t.cor.s + ';box-shadow:0 0 8px ' + t.cor.s + '70"></div>' +
            '<span style="flex:1;font-size:.8rem;color:#D1D5DB;font-family:DM Sans,sans-serif">' + t.label + '</span>' +
            '<span style="font-size:.95rem;font-weight:800;color:' + t.cor.s + ';' +
            'font-family:Playfair Display,serif">' + t.count + '</span>' +
            '<span style="font-size:.68rem;color:#6B7280;min-width:32px;text-align:right;' +
            'font-family:Space Mono,monospace">' + pct + '%</span>' +
            '</div>'
          );
        }).join('');
      }

      deferResize(ch);
    } catch (e) {}
  }

  /* ══════════════════════════════════════════════════════════════
     3. PEDIDOS DE ORAÇÃO
        Donut (status) + Barras verticais (categoria)
        Canvas: #prayers-chart  #prayers-cat-chart
        KPIs:   #prayer-total  #prayer-precisam  #prayer-orando
  ══════════════════════════════════════════════════════════════ */
  function renderPrayersCharts(oracoesData) {
    if (!oracoesData) {
      DoaVidaSync.getOracoes()
        .then(function (d) { renderPrayersCharts(d); })
        .catch(function () {});
      return;
    }

    try {
      var oracoes  = oracoesData;
      var total    = oracoes.length;
      var orando   = oracoes.filter(function (o) { return o.status === 'orando'; }).length;
      var precisam = total - orando;

      /* KPIs */
      var elT  = document.getElementById('prayer-total');    if (elT)  elT.textContent = total;
      var elPr = document.getElementById('prayer-precisam'); if (elPr) elPr.textContent = precisam;
      var elOr = document.getElementById('prayer-orando');   if (elOr) elOr.textContent = orando;

      /* ── Donut: status ── */
      killChart('prayers');
      var c1 = document.getElementById('prayers-chart');
      if (c1) {
        killCanvas(c1);
        if (total === 0) {
          showEmpty(c1, 'fas fa-hands-praying', 'Nenhum pedido registrado ainda.');
        } else {
          hideEmpty(c1);
          var ch1 = new Chart(c1, {
            type: 'doughnut',
            data: {
              labels:   ['Aguardando Oração', 'Sendo Orados'],
              datasets: [{
                data:            [precisam, orando],
                backgroundColor: [C.amber.bg,  C.green.bg],
                borderColor:     [C.amber.s,   C.green.s],
                borderWidth: 2,
                hoverOffset: 10,
                hoverBorderWidth: 3,
              }],
            },
            plugins: [makeCenterPlugin(total, 'pedidos', '#F0EBE0')],
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '68%',
              animation: { duration: 950, easing: 'easeOutQuart' },
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: { color: '#9CA3AF', font: { size: 11, family: 'DM Sans, sans-serif' }, boxWidth: 10, padding: 16 },
                },
                tooltip: tooltip({
                  label: function (ctx) {
                    var pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                    return '  ' + ctx.parsed + ' pedido(s)  ·  ' + pct + '%';
                  },
                }),
              },
            },
          });
          keepChart('prayers', ch1);
          deferResize(ch1);
        }
      }

      /* ── Barras: por categoria ── */
      killChart('prayersCat');
      var c2 = document.getElementById('prayers-cat-chart');
      if (c2) {
        killCanvas(c2);
        if (total === 0) {
          showEmpty(c2, 'fas fa-chart-bar', 'Sem pedidos por categoria.');
        } else {
          hideEmpty(c2);

          var CATS = [
            { key: 'familia',    label: 'Família',    cor: C.blue   },
            { key: 'espiritual', label: 'Espiritual', cor: C.purple },
            { key: 'saude',      label: 'Saúde',      cor: C.green  },
            { key: 'outros',     label: 'Outros',     cor: C.amber  },
          ];

          var catCounts = { familia: 0, espiritual: 0, saude: 0, outros: 0 };
          oracoes.forEach(function (o) {
            var cat = (o.categoria || 'outros').toLowerCase();
            if (catCounts[cat] !== undefined) catCounts[cat]++;
            else catCounts['outros']++;
          });

          var ch2 = new Chart(c2, {
            type: 'bar',
            data: {
              labels:   CATS.map(function (c) { return c.label; }),
              datasets: [{
                data:                 CATS.map(function (c) { return catCounts[c.key]; }),
                backgroundColor:      CATS.map(function (c) { return c.cor.bg; }),
                borderColor:          CATS.map(function (c) { return c.cor.s; }),
                hoverBackgroundColor: CATS.map(function (c) { return c.cor.h; }),
                borderWidth: 2,
                borderRadius: 12,
                borderSkipped: false,
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 900, easing: 'easeOutQuart' },
              plugins: {
                legend: { display: false },
                tooltip: tooltip({
                  title: function (items) { return items[0].label; },
                  label: function (ctx) {
                    var pct = total > 0 ? Math.round((ctx.parsed.y / total) * 100) : 0;
                    return '  ' + ctx.parsed.y + ' pedido(s)  ·  ' + pct + '%';
                  },
                }),
              },
              scales: {
                x: scaleX({ ticks: { color: '#9CA3AF', font: { size: 12, family: 'DM Sans, sans-serif' } } }),
                y: scaleY(),
              },
            },
          });

          keepChart('prayersCat', ch2);
          deferResize(ch2);
        }
      }
    } catch (e) {}
  }

  /* ══════════════════════════════════════════════════════════════
     4a. TAREFAS DOS VOLUNTÁRIOS — Donut por status
         Canvas: #tarefas-status-chart  (injetado por _renderResumoTarefas)
  ══════════════════════════════════════════════════════════════ */
  function _renderTarefasStatusChart(cont) {
    killChart('tarefasStatus');
    var canvas = document.getElementById('tarefas-status-chart');
    if (!canvas || !window.Chart) return;
    killCanvas(canvas);

    var pend  = cont['pendente']     || 0;
    var anda  = cont['em-andamento'] || 0;
    var conc  = cont['concluida']    || 0;
    var total = pend + anda + conc;

    try {
      var ch = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels:   ['Pendentes', 'Em Andamento', 'Concluídas'],
          datasets: [{
            data:            [pend, anda, conc],
            backgroundColor: [C.amber.bg,  C.blue.bg,  C.green.bg],
            borderColor:     [C.amber.s,   C.blue.s,   C.green.s],
            borderWidth: 2,
            hoverOffset: 10,
            hoverBorderWidth: 3,
          }],
        },
        plugins: [makeCenterPlugin(total, 'tarefas', '#F0EBE0')],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '66%',
          animation: { duration: 950, easing: 'easeOutQuart' },
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#9CA3AF', font: { size: 11, family: 'DM Sans, sans-serif' }, boxWidth: 10, padding: 12 },
            },
            tooltip: tooltip({
              label: function (ctx) {
                var pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                return '  ' + ctx.parsed + ' tarefa(s)  ·  ' + pct + '%';
              },
            }),
          },
        },
      });

      keepChart('tarefasStatus', ch);
      deferResize(ch);
    } catch (e) {}
  }

  /* ══════════════════════════════════════════════════════════════
     4b. TAREFAS DOS VOLUNTÁRIOS — Barras horizontais por tipo
         Canvas: #tarefas-tipo-chart  (injetado por _renderResumoTarefas)
  ══════════════════════════════════════════════════════════════ */
  function _renderTarefasTipoChart(tipos) {
    killChart('tarefasTipo');
    var canvas = document.getElementById('tarefas-tipo-chart');
    if (!canvas || !window.Chart) return;
    killCanvas(canvas);

    var LABEL_MAP = {
      organizacao: 'Organização', entrega:     'Entrega',
      acolhimento: 'Acolhimento', atendimento: 'Atendimento',
      logistica:   'Logística',   comunicacao: 'Comunicação',
      espiritual:  'Espiritual',  financeiro:  'Financeiro',
      geral:       'Geral',
    };

    var keys    = Object.keys(tipos);
    var labels  = keys.map(function (k) { return LABEL_MAP[k] || k; });
    var valores = keys.map(function (k) { return tipos[k]; });
    var total   = valores.reduce(function (a, b) { return a + b; }, 0);

    try {
      var ch = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            data:                 valores,
            backgroundColor:      keys.map(function (_, i) { return SEQ[i % SEQ.length].bg; }),
            borderColor:          keys.map(function (_, i) { return SEQ[i % SEQ.length].s; }),
            hoverBackgroundColor: keys.map(function (_, i) { return SEQ[i % SEQ.length].h; }),
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 900, easing: 'easeOutQuart' },
          plugins: {
            legend: { display: false },
            tooltip: tooltip({
              title: function (items) { return items[0].label; },
              label: function (ctx) {
                var pct = total > 0 ? Math.round((ctx.parsed.x / total) * 100) : 0;
                return '  ' + ctx.parsed.x + ' tarefa(s)  ·  ' + pct + '%';
              },
            }),
          },
          scales: {
            x: scaleY({ ticks: { color: '#6B7280', font: { size: 11 } } }),
            y: scaleX({ ticks: { color: '#D1D5DB', font: { size: 12, family: 'DM Sans, sans-serif' } } }),
          },
        },
      });

      keepChart('tarefasTipo', ch);
      deferResize(ch);
    } catch (e) {}
  }

  /* ══════════════════════════════════════════════════════════════
     SUBSTITUIÇÃO — expõe as novas funções no escopo global
     Substitui as originais de admin.js sem alterar mais nada
  ══════════════════════════════════════════════════════════════ */
  window.renderDonationsStatusChart = renderDonationsStatusChart;
  window.renderVolunteersChart      = renderVolunteersChart;
  window.renderVolTipoChart         = renderVolTipoChart;
  window.renderPrayersCharts        = renderPrayersCharts;
  window._renderTarefasStatusChart  = _renderTarefasStatusChart;
  window._renderTarefasTipoChart    = _renderTarefasTipoChart;

  /* ══════════════════════════════════════════════════════════════
     OBSERVADOR DE ABA — redimensiona charts quando a aba torna visível
     e aciona re-render de Tarefas (charts injetados dinamicamente).

     Problema resolvido: Chart.js cria canvas com dimensão 0×0 quando o
     painel-pai está display:none. O MutationObserver detecta a adição
     da classe "active" e chama ch.resize() nos charts do painel,
     garantindo dimensões corretas sem refazer a chamada ao Supabase.
  ══════════════════════════════════════════════════════════════ */
  function _setupTabChartResizer() {
    var panels = document.querySelectorAll('.admin-tab-panel');
    if (!panels.length) return;

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mut) {
        if (mut.type !== 'attributes' || mut.attributeName !== 'class') return;
        var panel = mut.target;
        if (!panel.classList.contains('active')) return;

        /* Redimensiona todos os charts conhecidos que estão dentro deste painel */
        setTimeout(function () {
          if (window._charts) {
            Object.keys(window._charts).forEach(function (key) {
              var ch = window._charts[key];
              if (ch && ch.canvas && panel.contains(ch.canvas)) {
                try { ch.resize(); } catch (e) {}
              }
            });
          }

          /*
            Aba Tarefas: os charts são criados por _renderResumoTarefas() quando
            renderTarefas() é chamado. Se a aba abrir sem gráficos (foram renderizados
            com o painel oculto e o canvas sumiu), refaz a renderização.
          */
          if (panel.id === 'tab-tarefas') {
            var hasTarefasChart = !!document.getElementById('tarefas-status-chart');
            if (!hasTarefasChart && typeof window.renderTarefas === 'function') {
              window.renderTarefas();
            }
          }
        }, 60);
      });
    });

    panels.forEach(function (panel) {
      observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
    });
  }

  /* Inicializa o observador após o DOM estar pronto */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _setupTabChartResizer);
  } else {
    _setupTabChartResizer();
  }

})();
