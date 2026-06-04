/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/forms.js                                       ║
  ║  Lista de formulários + criação rápida.                             ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function statusPill(s) {
    if (s === 'published') return '<span class="sa-pill sa-pill--ok">publicado</span>';
    if (s === 'archived')  return '<span class="sa-pill sa-pill--info">arquivado</span>';
    return '<span class="sa-pill sa-pill--draft">rascunho</span>';
  }

  function shell() {
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<h2 class="sa-view__title">Formulários</h2>' +
          '<p class="sa-view__sub">Crie formulários reutilizáveis e visualize as respostas recebidas no site público.</p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<button class="sa-btn sa-btn--primary" id="fm-new"><i class="fa-solid fa-plus"></i><span>Novo formulário</span></button>' +
        '</div>' +
      '</header>' +

      '<div id="fm-tbl" class="sa-tbl-wrap" aria-busy="true">' + skel() + '</div>' +

      // Painel lateral de criação rápida
      '<aside id="fm-edit" class="pd-edit" hidden>' +
        '<header class="pd-edit__head">' +
          '<strong>Novo formulário</strong>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="fm-edit-close"><i class="fa-solid fa-xmark"></i></button>' +
        '</header>' +
        '<form class="pd-edit__body" id="fm-form">' +
          '<label class="sa-field">' +
            '<span class="sa-field__label">Chave interna (única) *</span>' +
            '<input id="fm-key" class="sa-field__input" placeholder="ex.: contato, oracao" pattern="[a-z0-9-]+" required maxlength="60" />' +
            '<span style="font-size:11.5px;color:var(--sa-text-mute)">Use a-z, 0-9 e hífen. Não pode mudar depois sem cuidado.</span>' +
          '</label>' +
          '<label class="sa-field">' +
            '<span class="sa-field__label">Título *</span>' +
            '<input id="fm-title" class="sa-field__input" required maxlength="120" />' +
          '</label>' +
          '<label class="sa-field">' +
            '<span class="sa-field__label">Descrição</span>' +
            '<textarea id="fm-desc" class="sa-field__input" rows="2" maxlength="400"></textarea>' +
          '</label>' +
          '<div class="sa-row">' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Texto do botão</span>' +
              '<input id="fm-submit-label" class="sa-field__input" value="Enviar" maxlength="40" />' +
            '</label>' +
            '<label class="sa-field">' +
              '<span class="sa-field__label">Mensagem de sucesso</span>' +
              '<input id="fm-success" class="sa-field__input" value="Recebido! Em breve entraremos em contato." maxlength="200" />' +
            '</label>' +
          '</div>' +
        '</form>' +
        '<footer class="pd-edit__foot">' +
          '<button type="button" class="sa-btn sa-btn--ghost"   id="fm-cancel">Cancelar</button>' +
          '<div style="flex:1"></div>' +
          '<button type="button" class="sa-btn sa-btn--primary" id="fm-create"><i class="fa-solid fa-arrow-right"></i><span>Criar e abrir editor</span></button>' +
        '</footer>' +
      '</aside>';
  }

  function skel() {
    var rows = '';
    for (var i = 0; i < 4; i++) {
      rows += '<tr>' +
        '<td><div class="sa-skel" style="height:14px;width:60%"></div></td>' +
        '<td><div class="sa-skel" style="height:14px;width:40%"></div></td>' +
        '<td><div class="sa-skel" style="height:14px;width:50%"></div></td>' +
        '<td><div class="sa-skel" style="height:14px;width:80px"></div></td>' +
      '</tr>';
    }
    return '<table class="sa-tbl"><thead><tr>' +
      '<th>Título</th><th>Chave</th><th>Status</th><th></th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  async function load() {
    var box = document.getElementById('fm-tbl');
    if (!box) return;
    box.setAttribute('aria-busy', 'true');
    try {
      var rows = await window.SA.api.forms.list();
      if (!rows.length) {
        box.innerHTML = '<div class="sa-empty"><i class="fa-regular fa-rectangle-list"></i><div>Nenhum formulário ainda. Clique em <strong>Novo formulário</strong>.</div></div>';
        return;
      }
      var trs = rows.map(function (f) {
        return '<tr data-id="' + escHtml(f.id) + '">' +
          '<td><strong>' + escHtml(f.title) + '</strong>' + (f.description ? '<div style="color:var(--sa-text-mute);font-size:12px">' + escHtml(f.description) + '</div>' : '') + '</td>' +
          '<td><code>' + escHtml(f.internal_key) + '</code></td>' +
          '<td>' + statusPill(f.status) + '</td>' +
          '<td class="sa-tbl__actions">' +
            '<button class="sa-btn sa-btn--soft sa-btn--icon" data-act="open" title="Abrir editor"><i class="fa-solid fa-arrow-right-to-bracket"></i></button>' +
          '</td>' +
        '</tr>';
      }).join('');
      box.innerHTML = '<table class="sa-tbl"><thead><tr>' +
        '<th>Título</th><th>Chave</th><th>Status</th><th></th>' +
      '</tr></thead><tbody>' + trs + '</tbody></table>';
      box.querySelectorAll('tr[data-id]').forEach(function (tr) {
        var id = tr.getAttribute('data-id');
        tr.querySelector('[data-act="open"]').addEventListener('click', function () { window.SA.router.go('form-detail', { id: id }); });
        tr.querySelector('td:first-child').style.cursor = 'pointer';
        tr.querySelector('td:first-child').addEventListener('click', function () { window.SA.router.go('form-detail', { id: id }); });
      });
    } catch (e) {
      var msg = String(e.message || '');
      if (msg.indexOf('Could not find the table') >= 0 || msg.indexOf('does not exist') >= 0) {
        box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-database" style="font-size:24px"></i><div style="font-weight:700;color:var(--sa-text)">Migração da Fase 2.5 não aplicada</div><div>Execute <code>db/super-admin/004_phase2_5_forms.sql</code>.</div></div>';
      } else {
        box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>Erro: ' + escHtml(msg) + '</div></div>';
      }
    } finally {
      box.setAttribute('aria-busy', 'false');
    }
  }

  function openCreate() {
    document.getElementById('fm-key').value = '';
    document.getElementById('fm-title').value = '';
    document.getElementById('fm-desc').value = '';
    document.getElementById('fm-submit-label').value = 'Enviar';
    document.getElementById('fm-success').value = 'Recebido! Em breve entraremos em contato.';
    document.getElementById('fm-edit').hidden = false;
    document.getElementById('fm-key').focus();
  }
  function closeCreate() { document.getElementById('fm-edit').hidden = true; }

  async function doCreate() {
    var key   = document.getElementById('fm-key').value.trim();
    var title = document.getElementById('fm-title').value.trim();
    if (!key)   { window.SA.store.toast('Informe a chave interna.', 'err'); return; }
    if (!/^[a-z0-9-]+$/.test(key)) { window.SA.store.toast('Chave inválida (a-z, 0-9, hífen).', 'err'); return; }
    if (!title) { window.SA.store.toast('Informe o título.', 'err'); return; }
    try {
      var f = await window.SA.api.forms.create({
        internal_key:    key,
        title:           title,
        description:     document.getElementById('fm-desc').value.trim(),
        submit_label:    document.getElementById('fm-submit-label').value.trim() || 'Enviar',
        success_message: document.getElementById('fm-success').value.trim() || 'Recebido!'
      });
      window.SA.store.toast('Formulário criado', 'ok');
      closeCreate();
      window.SA.router.go('form-detail', { id: f.id });
    } catch (e) {
      var msg = e.message || '';
      if (msg.indexOf('duplicate key') >= 0) msg = 'Já existe um formulário com essa chave.';
      window.SA.store.toast('Erro: ' + msg, 'err');
    }
  }

  function render() {
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.innerHTML = shell();
    if (window.SA && window.SA.layout) {
      window.SA.layout.setCrumbs([
        { label: 'Super Admin' },
        { label: 'Formulários', strong: true }
      ]);
    }
    document.getElementById('fm-new').addEventListener('click',    openCreate);
    document.getElementById('fm-cancel').addEventListener('click', closeCreate);
    document.getElementById('fm-edit-close').addEventListener('click', closeCreate);
    document.getElementById('fm-create').addEventListener('click', doCreate);
    load();
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.forms = { render: render };
})();
