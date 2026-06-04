/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/texts.js                                       ║
  ║  Central de textos globais (chave/valor) com filtro por área.       ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  var AREAS = ['geral','site_publico','admin','botoes','formularios','mensagens','modais','recibos','comprovantes','whatsapp','emails','graficos','tabelas','vazios','erros','sucessos','carregamentos'];

  var st = { items: [], filter: { area: '', q: '' } };

  function shell() {
    var areaOpts = '<option value="">Todas as áreas</option>' + AREAS.map(function (a) { return '<option value="' + escHtml(a) + '">' + escHtml(a) + '</option>'; }).join('');
    var areaSelect = '<select id="tx-area" class="sa-field__input">' + areaOpts + '</select>';
    var areaSelectEdit = '<select id="tx-edit-area" class="sa-field__input">' + AREAS.map(function (a) { return '<option value="' + escHtml(a) + '">' + escHtml(a) + '</option>'; }).join('') + '</select>';
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<h2 class="sa-view__title">Textos globais</h2>' +
          '<p class="sa-view__sub">Mensagens reutilizadas em todo o sistema (botões, modais, recibos, e-mails…). Estrutura i18n-ready.</p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<button class="sa-btn sa-btn--primary" id="tx-new"><i class="fa-solid fa-plus"></i><span>Novo texto</span></button>' +
        '</div>' +
      '</header>' +

      '<section class="sa-panel" style="margin-bottom:14px">' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
          '<label class="sa-field" style="flex:1;min-width:220px"><span class="sa-field__label">Buscar</span><input id="tx-q" class="sa-field__input" type="search" placeholder="chave ou conteúdo…" /></label>' +
          '<label class="sa-field" style="min-width:200px"><span class="sa-field__label">Área</span>' + areaSelect + '</label>' +
        '</div>' +
      '</section>' +

      '<div id="tx-tbl" class="sa-tbl-wrap" aria-busy="true">' + skel() + '</div>' +

      '<aside id="tx-edit" class="pd-edit" hidden>' +
        '<header class="pd-edit__head"><strong id="tx-edit-title">Novo texto</strong>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="tx-edit-close"><i class="fa-solid fa-xmark"></i></button></header>' +
        '<form class="pd-edit__body">' +
          '<input type="hidden" id="tx-id" />' +
          '<div class="sa-row">' +
            '<label class="sa-field"><span class="sa-field__label">Chave (única) *</span><input id="tx-key" class="sa-field__input" pattern="[a-z0-9._-]+" maxlength="80" required placeholder="ex.: btn.donate" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Área</span>' + areaSelectEdit + '</label>' +
          '</div>' +
          '<label class="sa-field"><span class="sa-field__label">Texto (pt-BR) *</span><textarea id="tx-pt" class="sa-field__input" rows="3" maxlength="800" required></textarea></label>' +
          '<label class="sa-field"><span class="sa-field__label">Texto (en) — opcional</span><textarea id="tx-en" class="sa-field__input" rows="2" maxlength="800"></textarea></label>' +
          '<label class="sa-field"><span class="sa-field__label">Descrição (contexto interno)</span><input id="tx-desc" class="sa-field__input" maxlength="200" /></label>' +
        '</form>' +
        '<footer class="pd-edit__foot">' +
          '<button type="button" class="sa-btn sa-btn--danger" id="tx-delete" hidden><i class="fa-solid fa-trash"></i><span>Excluir</span></button>' +
          '<div style="flex:1"></div>' +
          '<button type="button" class="sa-btn sa-btn--primary" id="tx-save"><i class="fa-solid fa-floppy-disk"></i><span>Salvar</span></button>' +
        '</footer>' +
      '</aside>';
  }
  function skel() {
    var rows = '';
    for (var i = 0; i < 5; i++) rows += '<tr><td><div class="sa-skel" style="height:14px;width:60%"></div></td><td><div class="sa-skel" style="height:14px;width:80%"></div></td><td><div class="sa-skel" style="height:14px;width:40%"></div></td><td><div class="sa-skel" style="height:14px;width:60px"></div></td></tr>';
    return '<table class="sa-tbl"><thead><tr><th>Chave</th><th>Texto (pt-BR)</th><th>Área</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function visible() {
    var f = st.filter;
    return st.items.filter(function (t) {
      if (f.area && t.area !== f.area) return false;
      if (f.q) {
        var q = f.q.toLowerCase();
        var bag = (t.text_key + ' ' + JSON.stringify(t.value || {}) + ' ' + (t.description || '')).toLowerCase();
        if (bag.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function renderTable() {
    var box = document.getElementById('tx-tbl');
    if (!box) return;
    box.setAttribute('aria-busy','false');
    var rows = visible();
    if (!rows.length) { box.innerHTML = '<div class="sa-empty"><i class="fa-regular fa-comment"></i><div>Nenhum texto.</div></div>'; return; }
    var trs = rows.map(function (t) {
      var pt = (t.value && t.value['pt-BR']) || '';
      return '<tr data-id="' + escHtml(t.id) + '">' +
        '<td><code>' + escHtml(t.text_key) + '</code></td>' +
        '<td style="max-width:520px;white-space:normal">' + escHtml(pt) + (t.description ? '<div style="color:var(--sa-text-mute);font-size:12px;margin-top:4px">' + escHtml(t.description) + '</div>' : '') + '</td>' +
        '<td><span class="sa-pill">' + escHtml(t.area) + '</span></td>' +
        '<td class="sa-tbl__actions"><button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="edit" title="Editar"><i class="fa-solid fa-pen"></i></button></td>' +
      '</tr>';
    }).join('');
    box.innerHTML = '<table class="sa-tbl"><thead><tr><th>Chave</th><th>Texto (pt-BR)</th><th>Área</th><th></th></tr></thead><tbody>' + trs + '</tbody></table>';
    box.querySelectorAll('tr[data-id]').forEach(function (tr) {
      var id = tr.getAttribute('data-id');
      tr.querySelector('[data-act="edit"]').addEventListener('click', function () { openEdit(id); });
      tr.querySelector('td:first-child').style.cursor = 'pointer';
      tr.querySelector('td:first-child').addEventListener('click', function () { openEdit(id); });
    });
  }

  async function load() {
    var box = document.getElementById('tx-tbl');
    if (box) { box.setAttribute('aria-busy','true'); box.innerHTML = skel(); }
    try { st.items = await window.SA.api.texts.list({}); }
    catch (e) {
      var msg = String(e.message || '');
      if (box) {
        if (msg.indexOf('Could not find the table') >= 0 || msg.indexOf('does not exist') >= 0) {
          box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-database" style="font-size:24px"></i><div style="font-weight:700;color:var(--sa-text)">Migração da Fase 5 não aplicada</div><div>Execute <code>db/super-admin/007_phase5_identity_receipts.sql</code>.</div></div>';
        } else box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>' + escHtml(msg) + '</div></div>';
      }
      return;
    }
    renderTable();
  }

  function openCreate() {
    document.getElementById('tx-id').value = '';
    document.getElementById('tx-key').value = '';
    document.getElementById('tx-key').readOnly = false;
    document.getElementById('tx-pt').value = '';
    document.getElementById('tx-en').value = '';
    document.getElementById('tx-desc').value = '';
    document.getElementById('tx-edit-area').value = 'geral';
    document.getElementById('tx-edit-title').textContent = 'Novo texto';
    document.getElementById('tx-delete').hidden = true;
    document.getElementById('tx-edit').hidden = false;
    document.getElementById('tx-key').focus();
  }
  function openEdit(id) {
    var t = st.items.find(function (x) { return x.id === id; });
    if (!t) return;
    document.getElementById('tx-id').value = t.id;
    document.getElementById('tx-key').value = t.text_key;
    document.getElementById('tx-key').readOnly = true;
    document.getElementById('tx-pt').value = (t.value && t.value['pt-BR']) || '';
    document.getElementById('tx-en').value = (t.value && t.value['en']) || '';
    document.getElementById('tx-desc').value = t.description || '';
    document.getElementById('tx-edit-area').value = t.area || 'geral';
    document.getElementById('tx-edit-title').textContent = 'Editar · ' + t.text_key;
    document.getElementById('tx-delete').hidden = false;
    document.getElementById('tx-edit').hidden = false;
  }

  async function save() {
    var key = document.getElementById('tx-key').value.trim();
    var pt  = document.getElementById('tx-pt').value;
    if (!key || !/^[a-z0-9._-]+$/.test(key)) return window.SA.store.toast('Chave inválida (a-z, 0-9, . _ -)', 'err');
    if (!pt.trim()) return window.SA.store.toast('Informe o texto em pt-BR', 'err');
    var en = document.getElementById('tx-en').value;
    var value = { 'pt-BR': pt };
    if (en && en.trim()) value['en'] = en;
    try {
      await window.SA.api.texts.upsert({
        text_key: key, value: value,
        area: document.getElementById('tx-edit-area').value,
        description: document.getElementById('tx-desc').value.trim()
      });
      window.SA.store.toast('Texto salvo', 'ok');
      document.getElementById('tx-edit').hidden = true;
      await load();
    } catch (e) { window.SA.store.toast('Erro: ' + e.message, 'err'); }
  }

  async function deleteText() {
    var id = document.getElementById('tx-id').value;
    if (!id) return;
    if (!confirm('Excluir este texto? (afeta todas as páginas que o usam)')) return;
    try { await window.SA.api.texts.remove(id); window.SA.store.toast('Removido', 'ok'); document.getElementById('tx-edit').hidden = true; await load(); }
    catch (e) { window.SA.store.toast('Erro: ' + e.message, 'err'); }
  }

  function render() {
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.innerHTML = shell();
    if (window.SA.layout) window.SA.layout.setCrumbs([{ label: 'Super Admin' }, { label: 'Textos globais', strong: true }]);
    var debounce = null;
    document.getElementById('tx-q').addEventListener('input', function (e) { clearTimeout(debounce); debounce = setTimeout(function () { st.filter.q = e.target.value; renderTable(); }, 200); });
    document.getElementById('tx-area').addEventListener('change', function (e) { st.filter.area = e.target.value; renderTable(); });
    document.getElementById('tx-new').addEventListener('click', openCreate);
    document.getElementById('tx-edit-close').addEventListener('click', function () { document.getElementById('tx-edit').hidden = true; });
    document.getElementById('tx-save').addEventListener('click', save);
    document.getElementById('tx-delete').addEventListener('click', deleteText);
    load();
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.texts = { render: render };
})();
