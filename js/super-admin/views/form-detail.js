/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/form-detail.js                                 ║
  ║  Editor de campos de um formulário (DnD nativo) + tab de Respostas. ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  var st = { form: null, fields: [], submissions: [], tab: 'fields', selectedFieldId: null };

  var FIELD_TYPES = [
    { key: 'text',     label: 'Texto curto',  icon: 'fa-i-cursor' },
    { key: 'textarea', label: 'Texto longo',  icon: 'fa-align-left' },
    { key: 'email',    label: 'E-mail',       icon: 'fa-envelope' },
    { key: 'phone',    label: 'Telefone',     icon: 'fa-phone' },
    { key: 'number',   label: 'Número',       icon: 'fa-hashtag' },
    { key: 'date',     label: 'Data',         icon: 'fa-calendar' },
    { key: 'select',   label: 'Lista (select)',  icon: 'fa-caret-down' },
    { key: 'radio',    label: 'Opções únicas (radio)', icon: 'fa-circle-dot' },
    { key: 'checkbox', label: 'Múltipla escolha (checkbox)', icon: 'fa-square-check' },
    { key: 'file',     label: 'Arquivo',      icon: 'fa-paperclip' },
    { key: 'consent',  label: 'Consentimento', icon: 'fa-check' }
  ];

  function statusPill(s) {
    if (s === 'published') return '<span class="sa-pill sa-pill--ok">publicado</span>';
    return '<span class="sa-pill sa-pill--draft">rascunho</span>';
  }

  function shell(form) {
    var snippet = '<' + 'div data-sa-form="' + escHtml(form.internal_key) + '"></div>';
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
            '<button type="button" class="sa-btn sa-btn--ghost" id="fd-back"><i class="fa-solid fa-arrow-left"></i><span>Voltar</span></button>' +
            '<h2 class="sa-view__title" style="margin:0">' + escHtml(form.title) + '</h2>' +
            statusPill(form.status) +
          '</div>' +
          '<p class="sa-view__sub">Chave: <code>' + escHtml(form.internal_key) + '</code></p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<button class="sa-btn sa-btn--soft"    id="fd-publish"><i class="fa-solid fa-rocket"></i><span>Publicar</span></button>' +
          '<button class="sa-btn sa-btn--danger"  id="fd-delete"><i class="fa-solid fa-trash"></i><span>Excluir</span></button>' +
        '</div>' +
      '</header>' +

      '<div role="tablist" aria-label="Abas" style="display:inline-flex;gap:6px;background:var(--sa-bg-soft);padding:4px;border-radius:10px;border:1px solid var(--sa-line);margin-bottom:14px">' +
        '<button class="sa-btn sa-btn--ghost" data-tab="fields"      style="border:0" aria-current="true"><i class="fa-solid fa-list-check"></i><span>Campos</span></button>' +
        '<button class="sa-btn sa-btn--ghost" data-tab="settings"    style="border:0"><i class="fa-solid fa-sliders"></i><span>Configurações</span></button>' +
        '<button class="sa-btn sa-btn--ghost" data-tab="submissions" style="border:0"><i class="fa-solid fa-inbox"></i><span>Respostas</span></button>' +
        '<button class="sa-btn sa-btn--ghost" data-tab="embed"       style="border:0"><i class="fa-solid fa-code"></i><span>Como usar</span></button>' +
      '</div>' +

      '<section id="fd-tab-fields">' +
        '<section class="sa-panel">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
            '<h3 class="sa-panel__title" style="margin:0">Campos</h3>' +
            '<button class="sa-btn sa-btn--primary" id="fd-add-field"><i class="fa-solid fa-plus"></i><span>Adicionar campo</span></button>' +
          '</div>' +
          '<div id="fd-fields" aria-busy="true">' + skel() + '</div>' +
        '</section>' +
      '</section>' +

      '<section id="fd-tab-settings" hidden>' +
        '<section class="sa-panel">' +
          '<h3 class="sa-panel__title">Configurações</h3>' +
          '<div class="sa-row">' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Título</span>' +
              '<input id="fd-s-title" class="sa-field__input" />' +
            '</label>' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Texto do botão</span>' +
              '<input id="fd-s-submit" class="sa-field__input" />' +
            '</label>' +
            '<label class="sa-field" style="grid-column:1/-1">' +
              '<span class="sa-field__label">Descrição</span>' +
              '<textarea id="fd-s-desc" class="sa-field__input" rows="2"></textarea>' +
            '</label>' +
            '<label class="sa-field" style="grid-column:1/-1">' +
              '<span class="sa-field__label">Mensagem de sucesso</span>' +
              '<input id="fd-s-success" class="sa-field__input" />' +
            '</label>' +
            '<label class="sa-field" style="grid-column:1/-1">' +
              '<span class="sa-field__label">E-mails para notificação (separados por vírgula)</span>' +
              '<input id="fd-s-emails" class="sa-field__input" placeholder="ainda informativo — disparo automático na Fase 7" />' +
            '</label>' +
          '</div>' +
          '<div style="margin-top:12px;display:flex;justify-content:flex-end;gap:8px">' +
            '<button class="sa-btn sa-btn--soft" id="fd-s-save"><i class="fa-solid fa-floppy-disk"></i><span>Salvar configurações</span></button>' +
          '</div>' +
        '</section>' +
      '</section>' +

      '<section id="fd-tab-submissions" hidden>' +
        '<div id="fd-subs" class="sa-tbl-wrap" aria-busy="true">' + skel() + '</div>' +
      '</section>' +

      '<section id="fd-tab-embed" hidden>' +
        '<section class="sa-panel">' +
          '<h3 class="sa-panel__title">Como usar este formulário no site</h3>' +
          '<p style="color:var(--sa-text-soft);margin:-4px 0 12px">Copie o snippet e cole na página onde o formulário deve aparecer. Funciona em qualquer arquivo HTML do projeto.</p>' +
          '<pre style="background:#0a0d12;border:1px solid var(--sa-line);border-radius:10px;padding:12px;overflow:auto;font-family:Space Mono,monospace;font-size:12.5px;color:#cfe9c1">' + escHtml(snippet) + '</pre>' +
          '<p style="color:var(--sa-text-mute);font-size:12.5px">Carregue também <code>js/site-content.js</code> + cliente Supabase. O renderizador detecta o atributo <code>data-sa-form</code> e injeta o formulário automaticamente.</p>' +
        '</section>' +
      '</section>' +

      // Slide-in de campo
      '<aside id="fd-edit" class="pd-edit" hidden>' +
        '<header class="pd-edit__head">' +
          '<strong id="fd-edit-title">Novo campo</strong>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="fd-edit-close"><i class="fa-solid fa-xmark"></i></button>' +
        '</header>' +
        '<form id="fd-field-form" class="pd-edit__body">' +
          '<input type="hidden" id="fd-f-id" />' +
          '<div class="sa-row">' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Tipo</span>' +
              '<select id="fd-f-type" class="sa-field__input">' +
                FIELD_TYPES.map(function (t) {
                  return '<option value="' + escHtml(t.key) + '">' + escHtml(t.label) + '</option>';
                }).join('') +
              '</select>' +
            '</label>' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Chave (única no form)</span>' +
              '<input id="fd-f-key" class="sa-field__input" pattern="[a-z0-9_]+" maxlength="40" />' +
            '</label>' +
          '</div>' +
          '<label class="sa-field">' +
            '<span class="sa-field__label">Rótulo (label visível)</span>' +
            '<input id="fd-f-label" class="sa-field__input" required maxlength="120" />' +
          '</label>' +
          '<label class="sa-field">' +
            '<span class="sa-field__label">Placeholder</span>' +
            '<input id="fd-f-placeholder" class="sa-field__input" maxlength="120" />' +
          '</label>' +
          '<label class="sa-field">' +
            '<span class="sa-field__label">Texto de ajuda (abaixo do campo)</span>' +
            '<input id="fd-f-help" class="sa-field__input" maxlength="200" />' +
          '</label>' +
          '<label class="sa-field" id="fd-f-options-wrap" hidden>' +
            '<span class="sa-field__label">Opções (uma por linha — formato <code>valor|rótulo</code> ou só rótulo)</span>' +
            '<textarea id="fd-f-options" class="sa-field__input" rows="4" placeholder="opcao1|Opção 1\nopcao2|Opção 2"></textarea>' +
          '</label>' +
          '<label class="sa-field">' +
            '<span class="sa-field__label">Obrigatório?</span>' +
            '<select id="fd-f-required" class="sa-field__input">' +
              '<option value="false">Não</option><option value="true">Sim</option>' +
            '</select>' +
          '</label>' +
        '</form>' +
        '<footer class="pd-edit__foot">' +
          '<button type="button" class="sa-btn sa-btn--danger" id="fd-f-delete"><i class="fa-solid fa-trash"></i><span>Excluir</span></button>' +
          '<div style="flex:1"></div>' +
          '<button type="button" class="sa-btn sa-btn--primary" id="fd-f-save"><i class="fa-solid fa-floppy-disk"></i><span>Salvar campo</span></button>' +
        '</footer>' +
      '</aside>';
  }

  function skel() {
    var rows = '';
    for (var i = 0; i < 4; i++) {
      rows += '<div class="pd-row"><div class="sa-skel" style="height:18px;width:60%"></div><div class="sa-skel" style="height:14px;width:40%;margin-top:6px"></div></div>';
    }
    return '<div class="pd-list">' + rows + '</div>';
  }

  /* ── Lista de campos ───────────────────────────────────────────── */
  function renderFields() {
    var box = document.getElementById('fd-fields');
    if (!box) return;
    if (!st.fields.length) {
      box.innerHTML = '<div class="sa-empty"><i class="fa-regular fa-rectangle-list"></i><div>Sem campos. Adicione o primeiro.</div></div>';
      return;
    }
    var rows = st.fields.map(function (f) {
      var t = FIELD_TYPES.find(function (x) { return x.key === f.field_type; }) || FIELD_TYPES[0];
      var req = f.required ? '<span class="sa-pill" style="margin-left:6px">obrigatório</span>' : '';
      return '' +
        '<div class="pd-row" draggable="true" data-id="' + escHtml(f.id) + '" tabindex="0">' +
          '<div class="pd-row__handle"><i class="fa-solid fa-grip-vertical"></i></div>' +
          '<div class="pd-row__body">' +
            '<div class="pd-row__title"><i class="fa-solid ' + escHtml(t.icon) + '" style="margin-right:6px;color:var(--sa-accent-2)"></i><strong>' + escHtml(f.label || '(sem label)') + '</strong>' + req + '</div>' +
            '<div class="pd-row__meta"><code>' + escHtml(f.field_key) + '</code> · ' + escHtml(t.label) + '</div>' +
          '</div>' +
          '<div class="pd-row__actions">' +
            '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="up"   title="Subir"><i class="fa-solid fa-arrow-up"></i></button>' +
            '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="down" title="Descer"><i class="fa-solid fa-arrow-down"></i></button>' +
            '<button class="sa-btn sa-btn--soft  sa-btn--icon" data-act="edit" title="Editar"><i class="fa-solid fa-pen"></i></button>' +
          '</div>' +
        '</div>';
    }).join('');
    box.innerHTML = '<div class="pd-list">' + rows + '</div>';

    box.querySelectorAll('.pd-row').forEach(function (row) {
      var id = row.getAttribute('data-id');
      row.querySelector('[data-act="edit"]').addEventListener('click', function () { openEdit(id); });
      row.querySelector('[data-act="up"]').addEventListener('click',   function () { move(id, -1); });
      row.querySelector('[data-act="down"]').addEventListener('click', function () { move(id, +1); });
    });
    bindDnD(box);
  }

  function bindDnD(box) {
    var rows = box.querySelectorAll('.pd-row');
    var drag = null;
    rows.forEach(function (row) {
      row.addEventListener('dragstart', function () { drag = row; row.classList.add('is-dragging'); });
      row.addEventListener('dragend',   function () { row.classList.remove('is-dragging'); rows.forEach(function (r) { r.classList.remove('is-drop-before','is-drop-after'); }); });
      row.addEventListener('dragover',  function (e) {
        if (!drag || drag === row) return;
        e.preventDefault();
        var rect = row.getBoundingClientRect();
        var before = (e.clientY - rect.top) < rect.height / 2;
        rows.forEach(function (r) { r.classList.remove('is-drop-before','is-drop-after'); });
        row.classList.add(before ? 'is-drop-before' : 'is-drop-after');
      });
      row.addEventListener('drop', async function (e) {
        e.preventDefault();
        if (!drag || drag === row) return;
        var srcId = drag.getAttribute('data-id'), tgtId = row.getAttribute('data-id');
        var rect = row.getBoundingClientRect();
        var before = (e.clientY - rect.top) < rect.height / 2;
        await reorderTo(srcId, tgtId, before);
      });
    });
  }

  async function reorderTo(srcId, tgtId, before) {
    var src = st.fields.find(function (f) { return f.id === srcId; });
    var tgt = st.fields.find(function (f) { return f.id === tgtId; });
    if (!src || !tgt || src === tgt) return;
    var sorted = st.fields.slice().sort(function (a, b) { return (a.order_index||0) - (b.order_index||0); });
    var without = sorted.filter(function (f) { return f.id !== src.id; });
    var idx = without.indexOf(tgt);
    var insertAt = before ? idx : idx + 1;
    without.splice(insertAt, 0, src);
    var orders = without.map(function (f, i) { return { id: f.id, order_index: (i + 1) * 10 }; });
    try {
      await window.SA.api.forms.fields.reorder(st.form.id, orders);
      window.SA.store.toast('Ordem atualizada', 'ok');
      await loadFields();
    } catch (e) {
      window.SA.store.toast('Falha: ' + e.message, 'err');
    }
  }

  async function move(id, delta) {
    var sorted = st.fields.slice().sort(function (a, b) { return (a.order_index||0) - (b.order_index||0); });
    var idx = sorted.findIndex(function (f) { return f.id === id; });
    if (idx < 0) return;
    var swap = idx + delta;
    if (swap < 0 || swap >= sorted.length) return;
    var orders = [
      { id: sorted[idx].id, order_index: sorted[swap].order_index },
      { id: sorted[swap].id, order_index: sorted[idx].order_index }
    ];
    try {
      await window.SA.api.forms.fields.reorder(st.form.id, orders);
      await loadFields();
    } catch (e) {
      window.SA.store.toast('Falha: ' + e.message, 'err');
    }
  }

  /* ── Carregar campos / submissões ─────────────────────────────── */
  async function loadFields() {
    try {
      st.fields = await window.SA.api.forms.fields.listByForm(st.form.id);
    } catch (e) {
      st.fields = [];
    }
    renderFields();
  }

  async function loadSubs() {
    var box = document.getElementById('fd-subs');
    if (!box) return;
    box.setAttribute('aria-busy', 'true');
    try {
      st.submissions = await window.SA.api.forms.submissions.listByForm(st.form.id, { limit: 200 });
    } catch (e) {
      box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>Erro: ' + escHtml(e.message) + '</div></div>';
      return;
    } finally {
      box.setAttribute('aria-busy', 'false');
    }
    if (!st.submissions.length) {
      box.innerHTML = '<div class="sa-empty"><i class="fa-regular fa-inbox"></i><div>Nenhuma resposta ainda.</div></div>';
      return;
    }
    var trs = st.submissions.map(function (s) {
      var when = new Date(s.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      var preview;
      try {
        preview = Object.keys(s.payload || {}).slice(0, 3).map(function (k) {
          return '<strong>' + escHtml(k) + '</strong>: ' + escHtml(String(s.payload[k]).slice(0, 80));
        }).join(' · ');
      } catch (e) { preview = ''; }
      var statusKlass = s.status === 'new'      ? 'sa-pill--draft'
                      : s.status === 'read'     ? 'sa-pill--info'
                      : s.status === 'answered' ? 'sa-pill--ok'
                      : '';
      return '<tr data-id="' + escHtml(s.id) + '">' +
        '<td>' + escHtml(when) + '</td>' +
        '<td><span class="sa-pill ' + statusKlass + '">' + escHtml(s.status) + '</span></td>' +
        '<td>' + preview + '</td>' +
        '<td class="sa-tbl__actions">' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="view" title="Ver"><i class="fa-solid fa-eye"></i></button>' +
        '</td>' +
      '</tr>';
    }).join('');
    box.innerHTML = '<table class="sa-tbl"><thead><tr>' +
      '<th>Quando</th><th>Status</th><th>Preview</th><th></th>' +
    '</tr></thead><tbody>' + trs + '</tbody></table>';

    box.querySelectorAll('tr[data-id]').forEach(function (tr) {
      tr.querySelector('[data-act="view"]').addEventListener('click', function () { viewSub(tr.getAttribute('data-id')); });
    });
  }

  async function viewSub(id) {
    var s = st.submissions.find(function (x) { return x.id === id; });
    if (!s) return;
    if (s.status === 'new') {
      try { await window.SA.api.forms.submissions.updateStatus(id, 'read'); s.status = 'read'; } catch (e) {}
    }
    var lines = Object.keys(s.payload || {}).map(function (k) {
      return '<div style="padding:8px 0;border-bottom:1px solid var(--sa-line)"><strong>' + escHtml(k) + '</strong><div style="white-space:pre-wrap;color:var(--sa-text-soft)">' + escHtml(String(s.payload[k])) + '</div></div>';
    }).join('');
    var modal = document.createElement('div');
    modal.className = 'sd-picker';
    modal.innerHTML = '' +
      '<div class="sd-picker__panel" style="width:min(560px,100%)">' +
        '<header style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid var(--sa-line)">' +
          '<strong>Resposta · ' + escHtml(new Date(s.created_at).toLocaleString('pt-BR')) + '</strong>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="vs-close"><i class="fa-solid fa-xmark"></i></button>' +
        '</header>' +
        '<div style="padding:14px;overflow:auto">' + (lines || '<em>Sem dados.</em>') + '</div>' +
        '<footer style="padding:10px 14px;border-top:1px solid var(--sa-line);display:flex;gap:8px;justify-content:flex-end">' +
          '<button class="sa-btn sa-btn--soft" data-act="answered"><i class="fa-solid fa-check"></i><span>Marcar como respondida</span></button>' +
          '<button class="sa-btn sa-btn--ghost" data-act="archive">Arquivar</button>' +
        '</footer>' +
      '</div>';
    document.body.appendChild(modal);
    function close() { modal.remove(); loadSubs(); }
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    modal.querySelector('#vs-close').addEventListener('click', close);
    modal.querySelector('[data-act="answered"]').addEventListener('click', async function () {
      try { await window.SA.api.forms.submissions.updateStatus(id, 'answered'); window.SA.store.toast('Marcada', 'ok'); } catch (e) {}
      close();
    });
    modal.querySelector('[data-act="archive"]').addEventListener('click', async function () {
      try { await window.SA.api.forms.submissions.updateStatus(id, 'archived'); } catch (e) {}
      close();
    });
  }

  /* ── Slide-in de edição de campo ──────────────────────────────── */
  function optionsToText(arr) {
    if (!Array.isArray(arr)) return '';
    return arr.map(function (o) {
      if (typeof o === 'string') return o;
      return (o.value && o.label) ? (o.value + '|' + o.label) : (o.label || o.value || '');
    }).join('\n');
  }
  function textToOptions(t) {
    return String(t || '').split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var p = l.split('|');
      var val = (p[0] || '').trim();
      var lab = (p[1] || p[0] || '').trim();
      return { value: val.toLowerCase().replace(/\s+/g, '-'), label: lab };
    });
  }

  function reflectTypeChange() {
    var t = document.getElementById('fd-f-type').value;
    var needsOptions = (t === 'select' || t === 'radio' || t === 'checkbox');
    document.getElementById('fd-f-options-wrap').hidden = !needsOptions;
  }

  function openCreateField() {
    st.selectedFieldId = null;
    document.getElementById('fd-f-id').value          = '';
    document.getElementById('fd-f-type').value        = 'text';
    document.getElementById('fd-f-key').value         = 'campo' + (st.fields.length + 1);
    document.getElementById('fd-f-label').value       = '';
    document.getElementById('fd-f-placeholder').value = '';
    document.getElementById('fd-f-help').value        = '';
    document.getElementById('fd-f-options').value     = '';
    document.getElementById('fd-f-required').value    = 'false';
    document.getElementById('fd-edit-title').textContent = 'Novo campo';
    document.getElementById('fd-f-delete').hidden = true;
    reflectTypeChange();
    document.getElementById('fd-edit').hidden = false;
  }
  function openEdit(id) {
    var f = st.fields.find(function (x) { return x.id === id; });
    if (!f) return;
    st.selectedFieldId = id;
    document.getElementById('fd-f-id').value          = f.id;
    document.getElementById('fd-f-type').value        = f.field_type || 'text';
    document.getElementById('fd-f-key').value         = f.field_key  || '';
    document.getElementById('fd-f-label').value       = f.label      || '';
    document.getElementById('fd-f-placeholder').value = f.placeholder || '';
    document.getElementById('fd-f-help').value        = f.help_text  || '';
    document.getElementById('fd-f-options').value     = optionsToText(f.options);
    document.getElementById('fd-f-required').value    = f.required ? 'true' : 'false';
    document.getElementById('fd-edit-title').textContent = 'Editar · ' + (f.label || f.field_key);
    document.getElementById('fd-f-delete').hidden = false;
    reflectTypeChange();
    document.getElementById('fd-edit').hidden = false;
  }
  function closeEdit() { document.getElementById('fd-edit').hidden = true; }

  function readFieldForm() {
    return {
      field_type:  document.getElementById('fd-f-type').value,
      field_key:   document.getElementById('fd-f-key').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'_'),
      label:       document.getElementById('fd-f-label').value.trim(),
      placeholder: document.getElementById('fd-f-placeholder').value.trim(),
      help_text:   document.getElementById('fd-f-help').value.trim(),
      options:     textToOptions(document.getElementById('fd-f-options').value),
      required:    document.getElementById('fd-f-required').value === 'true'
    };
  }

  async function saveField() {
    var data = readFieldForm();
    if (!data.field_key) { window.SA.store.toast('Informe a chave do campo.', 'err'); return; }
    if (!data.label)     { window.SA.store.toast('Informe o rótulo.', 'err'); return; }
    try {
      if (st.selectedFieldId) {
        await window.SA.api.forms.fields.update(st.selectedFieldId, data);
        window.SA.store.toast('Campo atualizado', 'ok');
      } else {
        var maxOrder = st.fields.reduce(function (m, f) { return Math.max(m, f.order_index || 0); }, 0);
        await window.SA.api.forms.fields.create(Object.assign({ form_id: st.form.id, order_index: maxOrder + 10 }, data));
        window.SA.store.toast('Campo adicionado', 'ok');
      }
      closeEdit();
      await loadFields();
    } catch (e) {
      var msg = e.message || '';
      if (msg.indexOf('duplicate key') >= 0) msg = 'Já existe um campo com essa chave.';
      window.SA.store.toast('Erro: ' + msg, 'err');
    }
  }

  async function deleteField() {
    if (!st.selectedFieldId) return;
    if (!confirm('Excluir este campo?')) return;
    try {
      await window.SA.api.forms.fields.remove(st.selectedFieldId);
      window.SA.store.toast('Campo excluído', 'ok');
      closeEdit();
      await loadFields();
    } catch (e) {
      window.SA.store.toast('Falha: ' + e.message, 'err');
    }
  }

  /* ── Settings ──────────────────────────────────────────────────── */
  function fillSettings() {
    document.getElementById('fd-s-title').value   = st.form.title || '';
    document.getElementById('fd-s-desc').value    = st.form.description || '';
    document.getElementById('fd-s-submit').value  = st.form.submit_label || 'Enviar';
    document.getElementById('fd-s-success').value = st.form.success_message || '';
    document.getElementById('fd-s-emails').value  = st.form.notify_emails || '';
  }
  async function saveSettings() {
    try {
      await window.SA.api.forms.update(st.form.id, {
        title:           document.getElementById('fd-s-title').value.trim(),
        description:     document.getElementById('fd-s-desc').value.trim(),
        submit_label:    document.getElementById('fd-s-submit').value.trim() || 'Enviar',
        success_message: document.getElementById('fd-s-success').value.trim() || 'Recebido!',
        notify_emails:   document.getElementById('fd-s-emails').value.trim()
      });
      window.SA.store.toast('Configurações salvas', 'ok');
    } catch (e) {
      window.SA.store.toast('Erro: ' + e.message, 'err');
    }
  }

  async function publishForm() {
    try {
      await window.SA.api.forms.publish(st.form.id);
      window.SA.store.toast('Formulário publicado', 'ok');
      st.form.status = 'published';
    } catch (e) {
      window.SA.store.toast('Falha: ' + e.message, 'err');
    }
  }

  async function deleteForm() {
    if (!confirm('Excluir este formulário? (soft delete — campos e respostas permanecem no banco)')) return;
    try {
      await window.SA.api.forms.softDelete(st.form.id);
      window.SA.store.toast('Formulário excluído', 'ok');
      window.SA.router.go('forms', {});
    } catch (e) {
      window.SA.store.toast('Erro: ' + e.message, 'err');
    }
  }

  /* ── Tabs ──────────────────────────────────────────────────────── */
  function showTab(name) {
    st.tab = name;
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.querySelectorAll('[data-tab]').forEach(function (b) { b.removeAttribute('aria-current'); });
    var btn = view.querySelector('[data-tab="' + name + '"]');
    if (btn) btn.setAttribute('aria-current', 'true');
    ['fields','settings','submissions','embed'].forEach(function (n) {
      var s = document.getElementById('fd-tab-' + n);
      if (s) s.hidden = (n !== name);
    });
    if (name === 'submissions') loadSubs();
    if (name === 'settings')    fillSettings();
  }

  /* ── Render ───────────────────────────────────────────────────── */
  async function render(params) {
    var view = document.getElementById('sa-view');
    if (!view) return;
    var id = params && params.id;
    if (!id) { window.SA.router.go('forms', {}); return; }

    view.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-spinner fa-spin"></i><div>Carregando…</div></div>';
    try {
      st.form = await window.SA.api.forms.get(id);
    } catch (e) {
      view.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>Erro: ' + escHtml(e.message) + '</div></div>';
      return;
    }
    if (!st.form) { window.SA.router.go('forms', {}); return; }

    view.innerHTML = shell(st.form);
    if (window.SA && window.SA.layout) {
      window.SA.layout.setCrumbs([
        { label: 'Super Admin' },
        { label: 'Formulários' },
        { label: st.form.title, strong: true }
      ]);
    }

    document.getElementById('fd-back').addEventListener('click',       function () { window.SA.router.go('forms', {}); });
    document.getElementById('fd-publish').addEventListener('click',    publishForm);
    document.getElementById('fd-delete').addEventListener('click',     deleteForm);
    document.getElementById('fd-add-field').addEventListener('click',  openCreateField);
    document.getElementById('fd-edit-close').addEventListener('click', closeEdit);
    document.getElementById('fd-f-save').addEventListener('click',     saveField);
    document.getElementById('fd-f-delete').addEventListener('click',   deleteField);
    document.getElementById('fd-f-type').addEventListener('change',    reflectTypeChange);
    document.getElementById('fd-s-save').addEventListener('click',     saveSettings);

    view.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
    });

    showTab('fields');
    await loadFields();
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.formDetail = { render: render };
})();
