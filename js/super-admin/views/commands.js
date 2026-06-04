/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/commands.js                                    ║
  ║  Central de comandos seguros — listagem, edição, execução, logs.    ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  // Allowlist de tipos de ação (espelha o runtime + SQL CHECK).
  var ACTION_TYPES = [
    { k: 'link_internal',         l: 'Ir para página interna',          icon: 'fa-arrow-right-to-bracket' },
    { k: 'link_external',         l: 'Abrir URL externa',               icon: 'fa-arrow-up-right-from-square' },
    { k: 'whatsapp_open',         l: 'Abrir WhatsApp',                  icon: 'fa-comment-dots' },
    { k: 'phone_call',            l: 'Ligar (tel:)',                    icon: 'fa-phone' },
    { k: 'email_compose',         l: 'Compor e-mail',                   icon: 'fa-envelope' },
    { k: 'modal_open',            l: 'Abrir modal',                     icon: 'fa-window-restore' },
    { k: 'download_file',         l: 'Baixar arquivo',                  icon: 'fa-download' },
    { k: 'toast_show',            l: 'Mostrar toast',                   icon: 'fa-bell' },
    { k: 'clipboard_copy',        l: 'Copiar para área de transferência', icon: 'fa-copy' },
    { k: 'page_publish',          l: 'Publicar página',                 icon: 'fa-rocket' },
    { k: 'section_publish',       l: 'Publicar seção',                  icon: 'fa-layer-group' },
    { k: 'widget_publish',        l: 'Publicar widget',                 icon: 'fa-chart-column' },
    { k: 'form_publish',          l: 'Publicar formulário',             icon: 'fa-list-check' },
    { k: 'record_update_status',  l: 'Atualizar status de registro',    icon: 'fa-pen-to-square' },
    { k: 'record_soft_delete',    l: 'Excluir registro (soft delete)',  icon: 'fa-trash' },
    { k: 'export_report',         l: 'Exportar relatório CSV',          icon: 'fa-file-csv' }
  ];
  var TRIGGERS = ['manual','on_click','on_submit','on_status_change','on_publish','on_proof_received','scheduled'];
  var ROLES    = ['user','admin','super_admin'];

  var st = { items: [], logs: [], tab: 'list', selectedId: null };

  function shell() {
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<h2 class="sa-view__title">Comandos seguros</h2>' +
          '<p class="sa-view__sub">Whitelist de ações pré-aprovadas. O sistema nunca executa código livre — apenas dispara um <code>command_key</code> que é mapeado a um handler validado.</p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<button class="sa-btn sa-btn--primary" id="cm-new"><i class="fa-solid fa-plus"></i><span>Novo comando</span></button>' +
        '</div>' +
      '</header>' +

      '<div role="tablist" style="display:inline-flex;gap:6px;background:var(--sa-bg-soft);padding:4px;border-radius:10px;border:1px solid var(--sa-line);margin-bottom:14px">' +
        '<button class="sa-btn sa-btn--ghost" data-tab="list" style="border:0" aria-current="true"><i class="fa-solid fa-bolt"></i><span>Comandos</span></button>' +
        '<button class="sa-btn sa-btn--ghost" data-tab="logs" style="border:0"><i class="fa-solid fa-clock-rotate-left"></i><span>Log de execução</span></button>' +
      '</div>' +

      '<section id="cm-tab-list">' +
        '<div id="cm-grid" class="sa-grid" aria-busy="true">' + skel() + '</div>' +
      '</section>' +

      '<section id="cm-tab-logs" hidden>' +
        '<div id="cm-logs" class="sa-tbl-wrap" aria-busy="true">' + skelTbl() + '</div>' +
      '</section>' +

      '<aside id="cm-edit" class="pd-edit" hidden>' +
        '<header class="pd-edit__head"><strong id="cm-edit-title">Novo comando</strong>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="cm-edit-close"><i class="fa-solid fa-xmark"></i></button></header>' +
        '<form class="pd-edit__body">' +
          '<input type="hidden" id="cm-id" />' +
          '<div class="sa-row">' +
            '<label class="sa-field"><span class="sa-field__label">Chave (única) *</span><input id="cm-key" class="sa-field__input" pattern="[a-z0-9._-]+" maxlength="60" required /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Nome *</span><input id="cm-name" class="sa-field__input" maxlength="80" required /></label>' +
          '</div>' +
          '<label class="sa-field"><span class="sa-field__label">Descrição</span><input id="cm-desc" class="sa-field__input" maxlength="200" /></label>' +
          '<div class="sa-row">' +
            '<label class="sa-field"><span class="sa-field__label">Tipo de ação *</span>' +
              '<select id="cm-action" class="sa-field__input">' +
                ACTION_TYPES.map(function (a) { return '<option value="' + escHtml(a.k) + '">' + escHtml(a.l) + '</option>'; }).join('') +
              '</select>' +
            '</label>' +
            '<label class="sa-field"><span class="sa-field__label">Gatilho</span>' +
              '<select id="cm-trigger" class="sa-field__input">' + TRIGGERS.map(function (t) { return '<option value="' + escHtml(t) + '">' + escHtml(t) + '</option>'; }).join('') + '</select>' +
            '</label>' +
            '<label class="sa-field"><span class="sa-field__label">Permissão necessária</span>' +
              '<select id="cm-role" class="sa-field__input">' + ROLES.map(function (r) { return '<option value="' + escHtml(r) + '">' + escHtml(r) + '</option>'; }).join('') + '</select>' +
            '</label>' +
            '<label class="sa-field"><span class="sa-field__label">Status</span>' +
              '<select id="cm-status" class="sa-field__input"><option value="active">Ativo</option><option value="disabled">Desativado</option><option value="draft">Rascunho</option></select>' +
            '</label>' +
          '</div>' +
          '<label class="sa-field"><span class="sa-field__label">Mensagem de sucesso</span><input id="cm-msg-ok" class="sa-field__input" maxlength="160" /></label>' +
          '<label class="sa-field"><span class="sa-field__label">Mensagem de erro</span><input id="cm-msg-err" class="sa-field__input" maxlength="160" /></label>' +
          '<label class="sa-field"><span class="sa-field__label">Payload (JSON) — parâmetros do comando</span>' +
            '<textarea id="cm-payload" class="sa-field__input" rows="6" spellcheck="false" style="font-family:Space Mono,monospace; font-size:12.5px"></textarea>' +
            '<span style="font-size:11.5px;color:var(--sa-text-mute)">Veja exemplos clicando nos comandos pré-aprovados.</span>' +
          '</label>' +
        '</form>' +
        '<footer class="pd-edit__foot">' +
          '<button type="button" class="sa-btn sa-btn--danger" id="cm-delete" hidden><i class="fa-solid fa-trash"></i><span>Excluir</span></button>' +
          '<div style="flex:1"></div>' +
          '<button type="button" class="sa-btn sa-btn--soft" id="cm-test"><i class="fa-solid fa-play"></i><span>Testar</span></button>' +
          '<button type="button" class="sa-btn sa-btn--primary" id="cm-save"><i class="fa-solid fa-floppy-disk"></i><span>Salvar</span></button>' +
        '</footer>' +
      '</aside>';
  }
  function skel() { var html = ''; for (var i = 0; i < 6; i++) html += '<div class="sa-card"><div class="sa-skel" style="height:14px;width:60%"></div><div class="sa-skel" style="height:14px;width:40%;margin-top:6px"></div></div>'; return html; }
  function skelTbl() { var rows = ''; for (var i = 0; i < 5; i++) rows += '<tr><td><div class="sa-skel" style="height:14px;width:80%"></div></td><td><div class="sa-skel" style="height:14px;width:60%"></div></td><td><div class="sa-skel" style="height:14px;width:50%"></div></td><td><div class="sa-skel" style="height:14px;width:40%"></div></td></tr>'; return '<table class="sa-tbl"><thead><tr><th>Quando</th><th>Comando</th><th>Resultado</th><th>Mensagem</th></tr></thead><tbody>' + rows + '</tbody></table>'; }

  /* ── Aba Comandos ──────────────────────────────────────────────── */
  function actionInfo(k) { return ACTION_TYPES.find(function (a) { return a.k === k; }) || { l: k, icon: 'fa-bolt' }; }

  function renderGrid() {
    var grid = document.getElementById('cm-grid');
    if (!grid) return;
    grid.setAttribute('aria-busy','false');
    if (!st.items.length) {
      grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-regular fa-folder-open"></i><div>Nenhum comando cadastrado.</div></div>';
      return;
    }
    grid.innerHTML = st.items.map(function (c) {
      var info = actionInfo(c.action_type);
      var statusKlass = c.status === 'active' ? 'sa-pill--ok' : c.status === 'draft' ? 'sa-pill--draft' : '';
      return '<button class="sa-card" data-id="' + escHtml(c.id) + '" type="button" style="text-align:left;cursor:pointer">' +
        '<h3 class="sa-card__title"><i class="fa-solid ' + escHtml(info.icon) + '"></i><span>' + escHtml(c.name) + '</span>' + (c.built_in ? ' <i class="fa-solid fa-lock" style="font-size:10px;color:var(--sa-text-mute);margin-left:6px"></i>' : '') + '</h3>' +
        '<p class="sa-card__hint">' + escHtml(c.description || info.l) + '</p>' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px">' +
          '<span class="sa-pill ' + statusKlass + '">' + escHtml(c.status) + '</span>' +
          '<span class="sa-pill" style="background:rgba(255,255,255,.04)">' + escHtml(c.action_type) + '</span>' +
          '<span class="sa-pill" style="background:rgba(255,255,255,.04)">' + escHtml(c.required_role) + '</span>' +
        '</div>' +
        '<code style="margin-top:4px;font-size:11px;color:var(--sa-text-mute)">' + escHtml(c.command_key) + '</code>' +
      '</button>';
    }).join('');
    grid.querySelectorAll('[data-id]').forEach(function (b) {
      b.addEventListener('click', function () { openEdit(b.getAttribute('data-id')); });
    });
  }

  async function loadCommands() {
    var grid = document.getElementById('cm-grid');
    if (grid) { grid.setAttribute('aria-busy','true'); grid.innerHTML = skel(); }
    try { st.items = await window.SA.api.commands.list(); }
    catch (e) {
      var msg = String(e.message || '');
      if (grid) {
        if (msg.indexOf('Could not find the table') >= 0 || msg.indexOf('does not exist') >= 0) {
          grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-solid fa-database" style="font-size:24px"></i><div style="font-weight:700;color:var(--sa-text)">Migração da Fase 7 não aplicada</div><div>Execute <code>db/super-admin/009_phase7_commands.sql</code>.</div></div>';
        } else grid.innerHTML = '<div class="sa-empty" style="grid-column:1/-1"><i class="fa-solid fa-triangle-exclamation"></i><div>' + escHtml(msg) + '</div></div>';
      }
      return;
    }
    renderGrid();
  }

  /* ── Aba Logs ──────────────────────────────────────────────────── */
  async function loadLogs() {
    var box = document.getElementById('cm-logs');
    if (!box) return;
    box.setAttribute('aria-busy','true');
    try { st.logs = await window.SA.api.commands.logs({ limit: 200 }); }
    catch (e) { box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>' + escHtml(e.message) + '</div></div>'; return; }
    finally { box.setAttribute('aria-busy','false'); }
    if (!st.logs.length) {
      box.innerHTML = '<div class="sa-empty"><i class="fa-regular fa-clock"></i><div>Nenhuma execução registrada ainda.</div></div>';
      return;
    }
    var trs = st.logs.map(function (l) {
      var when = new Date(l.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      var klass = l.result === 'ok' ? 'sa-pill--ok' : l.result === 'error' ? 'sa-pill--danger' : 'sa-pill--draft';
      return '<tr><td>' + escHtml(when) + '</td>' +
        '<td><code>' + escHtml(l.command_key) + '</code><div style="color:var(--sa-text-mute);font-size:12px">' + escHtml(l.action_type) + '</div></td>' +
        '<td><span class="sa-pill ' + klass + '">' + escHtml(l.result) + '</span></td>' +
        '<td style="max-width:520px;white-space:normal">' + escHtml(l.message || '—') + '</td></tr>';
    }).join('');
    box.innerHTML = '<table class="sa-tbl"><thead><tr><th>Quando</th><th>Comando</th><th>Resultado</th><th>Mensagem</th></tr></thead><tbody>' + trs + '</tbody></table>';
  }

  /* ── Editor ────────────────────────────────────────────────────── */
  function fillForm(c) {
    document.getElementById('cm-id').value      = c.id || '';
    document.getElementById('cm-key').value     = c.command_key || '';
    document.getElementById('cm-key').readOnly  = !!c.built_in;
    document.getElementById('cm-name').value    = c.name || '';
    document.getElementById('cm-desc').value    = c.description || '';
    document.getElementById('cm-action').value  = c.action_type || 'toast_show';
    document.getElementById('cm-trigger').value = c.trigger_type || 'manual';
    document.getElementById('cm-role').value    = c.required_role || 'super_admin';
    document.getElementById('cm-status').value  = c.status || 'active';
    document.getElementById('cm-msg-ok').value  = c.success_message || '';
    document.getElementById('cm-msg-err').value = c.error_message || '';
    document.getElementById('cm-payload').value = c.payload ? JSON.stringify(c.payload, null, 2) : '{}';
  }

  function openCreate() {
    st.selectedId = null;
    fillForm({});
    document.getElementById('cm-edit-title').textContent = 'Novo comando';
    document.getElementById('cm-delete').hidden = true;
    document.getElementById('cm-edit').hidden = false;
  }

  function openEdit(id) {
    var c = st.items.find(function (x) { return x.id === id; });
    if (!c) return;
    st.selectedId = id;
    fillForm(c);
    document.getElementById('cm-edit-title').textContent = (c.built_in ? '🔒 ' : '') + 'Editar · ' + c.name;
    document.getElementById('cm-delete').hidden = false;
    document.getElementById('cm-edit').hidden = false;
  }

  function readForm() {
    var payload = {};
    var raw = document.getElementById('cm-payload').value || '{}';
    try { payload = JSON.parse(raw); }
    catch (e) { throw new Error('Payload JSON inválido: ' + e.message); }
    return {
      command_key:     document.getElementById('cm-key').value.trim(),
      name:            document.getElementById('cm-name').value.trim(),
      description:     document.getElementById('cm-desc').value.trim(),
      action_type:     document.getElementById('cm-action').value,
      trigger_type:    document.getElementById('cm-trigger').value,
      required_role:   document.getElementById('cm-role').value,
      status:          document.getElementById('cm-status').value,
      success_message: document.getElementById('cm-msg-ok').value.trim(),
      error_message:   document.getElementById('cm-msg-err').value.trim(),
      payload:         payload
    };
  }

  async function save() {
    var data;
    try { data = readForm(); } catch (e) { return window.SA.store.toast(e.message, 'err'); }
    if (!data.command_key || !/^[a-z0-9._-]+$/.test(data.command_key)) return window.SA.store.toast('Chave inválida', 'err');
    if (!data.name) return window.SA.store.toast('Informe o nome', 'err');
    try {
      await window.SA.api.commands.upsert(data);
      window.SA.store.toast('Comando salvo', 'ok');
      document.getElementById('cm-edit').hidden = true;
      await loadCommands();
    } catch (e) { window.SA.store.toast('Erro: ' + e.message, 'err'); }
  }

  async function testCommand() {
    var key = document.getElementById('cm-key').value.trim();
    if (!key) return window.SA.store.toast('Salve antes de testar', 'info');
    try {
      var out = await window.SA.commandRuntime.execute(key, {});
      window.SA.store.toast('Teste OK: ' + (out && out.message ? out.message : 'executado'), 'ok');
    } catch (e) { window.SA.store.toast('Erro: ' + e.message, 'err'); }
  }

  async function deleteCmd() {
    if (!st.selectedId) return;
    if (!confirm('Excluir este comando? (built-in vira "disabled")')) return;
    try {
      await window.SA.api.commands.remove(st.selectedId);
      window.SA.store.toast('Removido', 'ok');
      document.getElementById('cm-edit').hidden = true;
      await loadCommands();
    } catch (e) { window.SA.store.toast('Erro: ' + e.message, 'err'); }
  }

  /* ── Tabs ──────────────────────────────────────────────────────── */
  function showTab(name) {
    st.tab = name;
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.querySelectorAll('[data-tab]').forEach(function (b) { b.removeAttribute('aria-current'); });
    var btn = view.querySelector('[data-tab="' + name + '"]');
    if (btn) btn.setAttribute('aria-current','true');
    document.getElementById('cm-tab-list').hidden = (name !== 'list');
    document.getElementById('cm-tab-logs').hidden = (name !== 'logs');
    if (name === 'logs') loadLogs();
  }

  function render() {
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.innerHTML = shell();
    if (window.SA.layout) window.SA.layout.setCrumbs([{ label: 'Super Admin' }, { label: 'Comandos seguros', strong: true }]);
    view.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); }); });
    document.getElementById('cm-new').addEventListener('click', openCreate);
    document.getElementById('cm-edit-close').addEventListener('click', function () { document.getElementById('cm-edit').hidden = true; });
    document.getElementById('cm-save').addEventListener('click', save);
    document.getElementById('cm-test').addEventListener('click', testCommand);
    document.getElementById('cm-delete').addEventListener('click', deleteCmd);
    showTab('list');
    loadCommands();
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.commands = { render: render };
})();
