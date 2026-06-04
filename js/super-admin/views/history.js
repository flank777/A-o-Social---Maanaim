/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/history.js                                     ║
  ║  Histórico avançado: filtros + diff de versões + restauração.       ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  var ENTITIES = [
    { k: '',                l: 'Todas' },
    { k: 'site_pages',      l: 'Páginas' },
    { k: 'site_sections',   l: 'Seções' },
    { k: 'site_cards',      l: 'Cards' },
    { k: 'admin_widgets',   l: 'Widgets' },
    { k: 'site_forms',      l: 'Formulários' },
    { k: 'site_form_fields',l: 'Campos de form' },
    { k: 'site_media',      l: 'Mídia' }
  ];
  var ACTIONS = [
    { k: '',        l: 'Todas as ações' },
    { k: 'create',  l: 'Criar' },
    { k: 'update',  l: 'Editar' },
    { k: 'delete',  l: 'Excluir' },
    { k: 'restore', l: 'Restaurar' },
    { k: 'publish', l: 'Publicar' },
    { k: 'reorder', l: 'Reordenar' }
  ];

  var st = { tab: 'logs', filter: { entity_type: '', action: '', q: '', limit: 200 }, logs: [], versions: [], selectedEntity: null };

  function shell() {
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<h2 class="sa-view__title">Histórico</h2>' +
          '<p class="sa-view__sub">Eventos auditáveis e versões com diff e restauração.</p>' +
        '</div>' +
      '</header>' +

      '<div role="tablist" style="display:inline-flex;gap:6px;background:var(--sa-bg-soft);padding:4px;border-radius:10px;border:1px solid var(--sa-line);margin-bottom:14px">' +
        '<button class="sa-btn sa-btn--ghost" data-tab="logs"     style="border:0" aria-current="true"><i class="fa-solid fa-list"></i><span>Eventos</span></button>' +
        '<button class="sa-btn sa-btn--ghost" data-tab="versions" style="border:0"><i class="fa-solid fa-code-branch"></i><span>Versões</span></button>' +
      '</div>' +

      '<section id="hi-tab-logs">' +
        '<section class="sa-panel" style="margin-bottom:14px">' +
          '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
            '<label class="sa-field" style="flex:1;min-width:220px"><span class="sa-field__label">Buscar</span><input id="hi-q" class="sa-field__input" type="search" placeholder="usuário, descrição…" /></label>' +
            '<label class="sa-field" style="min-width:200px"><span class="sa-field__label">Entidade</span><select id="hi-ent" class="sa-field__input">' +
              ENTITIES.map(function (e) { return '<option value="' + escHtml(e.k) + '">' + escHtml(e.l) + '</option>'; }).join('') + '</select></label>' +
            '<label class="sa-field" style="min-width:180px"><span class="sa-field__label">Ação</span><select id="hi-act" class="sa-field__input">' +
              ACTIONS.map(function (a) { return '<option value="' + escHtml(a.k) + '">' + escHtml(a.l) + '</option>'; }).join('') + '</select></label>' +
            '<button class="sa-btn sa-btn--ghost" id="hi-refresh" style="align-self:flex-end"><i class="fa-solid fa-rotate"></i><span>Atualizar</span></button>' +
          '</div>' +
        '</section>' +
        '<div id="hi-tbl" class="sa-tbl-wrap" aria-busy="true">' + skel() + '</div>' +
      '</section>' +

      '<section id="hi-tab-versions" hidden>' +
        '<section class="sa-panel" style="margin-bottom:14px">' +
          '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end">' +
            '<label class="sa-field" style="min-width:200px"><span class="sa-field__label">Tipo de entidade</span><select id="hv-ent" class="sa-field__input">' +
              ENTITIES.filter(function (e) { return e.k; }).map(function (e) { return '<option value="' + escHtml(e.k) + '">' + escHtml(e.l) + '</option>'; }).join('') + '</select></label>' +
            '<label class="sa-field" style="flex:1;min-width:220px"><span class="sa-field__label">ID da entidade</span><input id="hv-id" class="sa-field__input" placeholder="UUID" /></label>' +
            '<button class="sa-btn sa-btn--primary" id="hv-load"><i class="fa-solid fa-magnifying-glass"></i><span>Carregar versões</span></button>' +
          '</div>' +
          '<p style="margin:8px 0 0;color:var(--sa-text-mute);font-size:12.5px">Para encontrar o ID, abra o item no editor — ele aparece no console e nos logs.</p>' +
        '</section>' +
        '<div id="hv-list"></div>' +
      '</section>';
  }
  function skel() {
    var rows = '';
    for (var i = 0; i < 6; i++) rows += '<tr><td><div class="sa-skel" style="height:14px;width:80%"></div></td><td><div class="sa-skel" style="height:14px;width:60%"></div></td><td><div class="sa-skel" style="height:14px;width:80%"></div></td><td><div class="sa-skel" style="height:14px;width:50%"></div></td></tr>';
    return '<table class="sa-tbl"><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Entidade</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  /* ── Logs ──────────────────────────────────────────────────────── */
  function actionLabel(a) { return (ACTIONS.find(function (x) { return x.k === a; }) || { l: a }).l; }
  function entityLabel(e) { return (ENTITIES.find(function (x) { return x.k === e; }) || { l: e }).l; }

  async function loadLogs() {
    var box = document.getElementById('hi-tbl');
    if (!box) return;
    box.setAttribute('aria-busy','true');
    try {
      var sb = window.supabaseClient;
      var q = sb.from('system_change_logs').select('*').order('created_at', { ascending: false }).limit(st.filter.limit);
      if (st.filter.entity_type) q = q.eq('entity_type', st.filter.entity_type);
      if (st.filter.action)      q = q.eq('action',      st.filter.action);
      if (st.filter.q)           q = q.or('user_email.ilike.%' + st.filter.q + '%,description.ilike.%' + st.filter.q + '%');
      var r = await q;
      if (r.error) throw new Error(r.error.message);
      st.logs = r.data || [];
    } catch (e) {
      box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>' + escHtml(e.message) + '</div></div>';
      return;
    } finally { box.setAttribute('aria-busy','false'); }

    if (!st.logs.length) {
      box.innerHTML = '<div class="sa-empty"><i class="fa-regular fa-clock"></i><div>Nenhum evento.</div></div>';
      return;
    }
    var trs = st.logs.map(function (l) {
      var when = new Date(l.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      return '<tr>' +
        '<td>' + escHtml(when) + '</td>' +
        '<td>' + escHtml(l.user_email || '—') + '</td>' +
        '<td><strong>' + escHtml(actionLabel(l.action)) + '</strong>' + (l.description ? '<div style="color:var(--sa-text-mute);font-size:12px;margin-top:2px">' + escHtml(l.description) + '</div>' : '') + '</td>' +
        '<td>' + escHtml(entityLabel(l.entity_type)) + (l.entity_id ? '<div style="color:var(--sa-text-mute);font-size:11px;font-family:Space Mono,monospace;margin-top:2px">' + escHtml(String(l.entity_id).slice(0, 8)) + '…</div>' : '') + '</td>' +
      '</tr>';
    }).join('');
    box.innerHTML = '<table class="sa-tbl"><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Entidade</th></tr></thead><tbody>' + trs + '</tbody></table>';
  }

  /* ── Versions ──────────────────────────────────────────────────── */
  async function loadVersions() {
    var entType = document.getElementById('hv-ent').value;
    var entId   = document.getElementById('hv-id').value.trim();
    if (!entId) return window.SA.store.toast('Informe o ID', 'err');
    var box = document.getElementById('hv-list');
    box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Carregando…</div></div>';
    try {
      st.versions = await window.SA.api.versions.listFor(entType, entId);
    } catch (e) {
      box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>' + escHtml(e.message) + '</div></div>';
      return;
    }
    if (!st.versions.length) {
      box.innerHTML = '<div class="sa-empty"><i class="fa-regular fa-folder-open"></i><div>Nenhuma versão para essa entidade.</div></div>';
      return;
    }
    var html = '<div class="hv-list">';
    st.versions.forEach(function (v, idx) {
      var when = new Date(v.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      var prev = st.versions[idx + 1]; // próxima na lista é uma versão mais antiga
      html += '<article class="hv-row" data-version="' + v.version_no + '">' +
        '<header style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
          '<div><strong>v' + v.version_no + '</strong> <span style="color:var(--sa-text-mute);font-size:12px">' + escHtml(when) + '</span>' + (v.notes ? ' <em style="color:var(--sa-text-mute);font-size:12px">— ' + escHtml(v.notes) + '</em>' : '') + '</div>' +
          '<div style="display:flex;gap:6px">' +
            (prev ? '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="diff" title="Ver diff vs v' + prev.version_no + '"><i class="fa-solid fa-code-compare"></i></button>' : '') +
            '<button class="sa-btn sa-btn--soft" data-act="restore"><i class="fa-solid fa-rotate-left"></i><span>Restaurar como rascunho</span></button>' +
          '</div>' +
        '</header>' +
        '<div class="hv-row__body" hidden></div>' +
      '</article>';
    });
    html += '</div>';
    box.innerHTML = html;

    box.querySelectorAll('.hv-row').forEach(function (row, idx) {
      var v = st.versions[idx];
      var prev = st.versions[idx + 1];
      var bodyEl = row.querySelector('.hv-row__body');

      var diffBtn = row.querySelector('[data-act="diff"]');
      if (diffBtn) diffBtn.addEventListener('click', function () {
        if (!bodyEl.hidden && bodyEl.dataset.kind === 'diff') { bodyEl.hidden = true; return; }
        bodyEl.dataset.kind = 'diff';
        bodyEl.innerHTML = renderDiff(prev.payload, v.payload);
        bodyEl.hidden = false;
      });
      row.querySelector('[data-act="restore"]').addEventListener('click', async function () {
        if (!confirm('Restaurar v' + v.version_no + ' como rascunho?')) return;
        try {
          await window.SA.publish.restoreVersion(entType, entId, v.version_no);
          window.SA.store.toast('Versão restaurada como rascunho', 'ok');
        } catch (e) {
          window.SA.store.toast('Erro: ' + e.message, 'err');
        }
      });
    });
  }

  /* ── Diff de JSON simples (chave-a-chave) ─────────────────────── */
  function renderDiff(a, b) {
    a = a || {}; b = b || {};
    var keys = {};
    Object.keys(a).forEach(function (k) { keys[k] = true; });
    Object.keys(b).forEach(function (k) { keys[k] = true; });
    var rows = Object.keys(keys).map(function (k) {
      var av = JSON.stringify(a[k]);
      var bv = JSON.stringify(b[k]);
      var changed = av !== bv;
      var added   = a[k] === undefined && b[k] !== undefined;
      var removed = b[k] === undefined && a[k] !== undefined;
      var color = added ? '#5fa64a' : removed ? '#d8523a' : (changed ? '#e0a526' : 'inherit');
      return '<tr>' +
        '<td><code>' + escHtml(k) + '</code></td>' +
        '<td style="color:#d8523a"><code>' + (av === undefined ? '—' : escHtml(av).slice(0, 200)) + '</code></td>' +
        '<td style="color:' + color + '"><code>' + (bv === undefined ? '—' : escHtml(bv).slice(0, 200)) + '</code></td>' +
      '</tr>';
    });
    return '<div style="margin-top:10px"><table class="sa-tbl"><thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
  }

  /* ── Tabs ──────────────────────────────────────────────────────── */
  function showTab(name) {
    st.tab = name;
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.querySelectorAll('[data-tab]').forEach(function (b) { b.removeAttribute('aria-current'); });
    var btn = view.querySelector('[data-tab="' + name + '"]');
    if (btn) btn.setAttribute('aria-current', 'true');
    document.getElementById('hi-tab-logs').hidden     = (name !== 'logs');
    document.getElementById('hi-tab-versions').hidden = (name !== 'versions');
  }

  function render() {
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.innerHTML = shell();
    if (window.SA.layout) window.SA.layout.setCrumbs([{ label: 'Super Admin' }, { label: 'Histórico', strong: true }]);
    view.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); }); });
    var deb = null;
    document.getElementById('hi-q').addEventListener('input',     function (e) { clearTimeout(deb); deb = setTimeout(function () { st.filter.q = e.target.value; loadLogs(); }, 250); });
    document.getElementById('hi-ent').addEventListener('change',  function (e) { st.filter.entity_type = e.target.value; loadLogs(); });
    document.getElementById('hi-act').addEventListener('change',  function (e) { st.filter.action = e.target.value; loadLogs(); });
    document.getElementById('hi-refresh').addEventListener('click', loadLogs);
    document.getElementById('hv-load').addEventListener('click',    loadVersions);
    bindStyles();
    showTab('logs');
    loadLogs();
  }

  var stylesInjected = false;
  function bindStyles() {
    if (stylesInjected) return; stylesInjected = true;
    var css = '' +
      '.hv-list { display: flex; flex-direction: column; gap: 8px; }' +
      '.hv-row { background: var(--sa-bg-elev); border: 1px solid var(--sa-line); border-radius: 12px; padding: 12px; }' +
      '.hv-row code { font-size: 12px; }';
    var el = document.createElement('style'); el.id = 'sa-history-styles'; el.textContent = css; document.head.appendChild(el);
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.history = { render: render };
})();
