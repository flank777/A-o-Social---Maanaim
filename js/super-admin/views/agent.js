/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/agent.js                                       ║
  ║  Painel da Dona Assunção em 4 abas:                                 ║
  ║   1. Conhecimentos (CRUD da base)                                   ║
  ║   2. Configurações (tom, limites, instruções)                       ║
  ║   3. Testar conversa (chat com matching local)                      ║
  ║   4. Perguntas sem resposta (melhoria contínua)                     ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  var TONES = [
    { k: 'acolhedor', l: 'Acolhedor' },
    { k: 'formal',    l: 'Formal' },
    { k: 'direto',    l: 'Direto' },
    { k: 'animado',   l: 'Animado' },
    { k: 'solidario', l: 'Solidário' }
  ];

  var st = {
    tab: 'knowledge',
    settings: null,
    categories: [],
    knowledge:  [],
    knFilter: { q: '', status: '', category_key: '', page: 1, perPage: 50 },
    knTotal: 0,
    selectedKnId: null,
    unanswered: []
  };

  function shell() {
    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
            '<i class="fa-solid fa-robot" style="font-size:22px;color:var(--sa-accent-2)"></i>' +
            '<h2 class="sa-view__title" style="margin:0">Dona Assunção</h2>' +
            '<span class="sa-pill sa-pill--ok" id="ag-active-pill" hidden>ativa</span>' +
          '</div>' +
          '<p class="sa-view__sub">Assistente da Ação Social Semear — base de conhecimento aprovada e tom configurável.</p>' +
        '</div>' +
      '</header>' +

      '<div role="tablist" style="display:inline-flex;gap:6px;background:var(--sa-bg-soft);padding:4px;border-radius:10px;border:1px solid var(--sa-line);margin-bottom:14px;flex-wrap:wrap">' +
        '<button class="sa-btn sa-btn--ghost" data-tab="knowledge"  style="border:0" aria-current="true"><i class="fa-solid fa-book"></i><span>Conhecimentos</span></button>' +
        '<button class="sa-btn sa-btn--ghost" data-tab="settings"   style="border:0"><i class="fa-solid fa-sliders"></i><span>Configurações</span></button>' +
        '<button class="sa-btn sa-btn--ghost" data-tab="test"       style="border:0"><i class="fa-solid fa-comments"></i><span>Testar conversa</span></button>' +
        '<button class="sa-btn sa-btn--ghost" data-tab="unanswered" style="border:0"><i class="fa-solid fa-circle-question"></i><span>Sem resposta</span></button>' +
      '</div>' +

      // ── Aba Conhecimentos ─────────────────────────────────────────
      '<section id="ag-tab-knowledge">' +
        '<section class="sa-panel" style="margin-bottom:14px">' +
          '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">' +
            '<label class="sa-field" style="flex:1;min-width:220px"><span class="sa-field__label">Buscar</span><input id="kn-q" class="sa-field__input" type="search" placeholder="título, conteúdo…" /></label>' +
            '<label class="sa-field" style="min-width:180px"><span class="sa-field__label">Categoria</span><select id="kn-cat" class="sa-field__input"><option value="">Todas</option></select></label>' +
            '<label class="sa-field" style="min-width:140px"><span class="sa-field__label">Status</span><select id="kn-status" class="sa-field__input"><option value="">Todos</option><option value="active">Ativos</option><option value="draft">Rascunho</option><option value="archived">Arquivados</option></select></label>' +
            '<button class="sa-btn sa-btn--primary" id="kn-new" style="margin-left:auto"><i class="fa-solid fa-plus"></i><span>Novo conhecimento</span></button>' +
          '</div>' +
        '</section>' +
        '<div id="kn-tbl" class="sa-tbl-wrap" aria-busy="true">' + skel() + '</div>' +
      '</section>' +

      // ── Aba Configurações ─────────────────────────────────────────
      '<section id="ag-tab-settings" hidden>' +
        '<section class="sa-panel">' +
          '<h3 class="sa-panel__title">Identidade & comportamento</h3>' +
          '<div class="sa-row">' +
            '<label class="sa-field"><span class="sa-field__label">Nome exibido</span><input id="ag-name" class="sa-field__input" maxlength="60" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">URL do avatar</span><input id="ag-avatar" class="sa-field__input" placeholder="logo-semear.jpeg" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Tom de voz</span>' +
              '<select id="ag-tone" class="sa-field__input">' + TONES.map(function (t) { return '<option value="' + escHtml(t.k) + '">' + escHtml(t.l) + '</option>'; }).join('') + '</select>' +
            '</label>' +
            '<label class="sa-field"><span class="sa-field__label">Ativa?</span><select id="ag-active" class="sa-field__input"><option value="true">Sim</option><option value="false">Não</option></select></label>' +
            '<label class="sa-field" style="grid-column:1/-1"><span class="sa-field__label">Saudação inicial</span><textarea id="ag-greet" class="sa-field__input" rows="2" maxlength="280"></textarea></label>' +
            '<label class="sa-field" style="grid-column:1/-1"><span class="sa-field__label">Mensagem quando não souber responder</span><textarea id="ag-fallback" class="sa-field__input" rows="2" maxlength="400"></textarea></label>' +
            '<label class="sa-field" style="grid-column:1/-1"><span class="sa-field__label">Encaminhamento humano</span><input id="ag-handoff" class="sa-field__input" maxlength="200" /></label>' +
            '<label class="sa-field" style="grid-column:1/-1"><span class="sa-field__label">Instruções permanentes (regras de comportamento)</span><textarea id="ag-instructions" class="sa-field__input" rows="6" placeholder="• Tom acolhedor…&#10;• Não inventar dados…&#10;• Encaminhar casos delicados…"></textarea></label>' +
            '<label class="sa-field" style="grid-column:1/-1"><span class="sa-field__label">Limites (uma regra por linha)</span><textarea id="ag-limits" class="sa-field__input" rows="5" placeholder="nunca inventar dados&#10;sempre confirmar nome do doador antes de gerar recibo"></textarea></label>' +
          '</div>' +
          '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">' +
            '<button class="sa-btn sa-btn--primary" id="ag-save"><i class="fa-solid fa-floppy-disk"></i><span>Salvar configuração</span></button>' +
          '</div>' +
        '</section>' +
      '</section>' +

      // ── Aba Testar conversa ───────────────────────────────────────
      '<section id="ag-tab-test" hidden>' +
        '<section class="sa-panel">' +
          '<h3 class="sa-panel__title">Simulador de conversa</h3>' +
          '<p style="margin:-4px 0 12px;color:var(--sa-text-mute);font-size:12.5px">O matching local (sem IA externa) seleciona o melhor conhecimento aprovado pelas palavras-chave e prioridade. Útil para validar a base.</p>' +
          '<div id="ag-chat" class="ag-chat" aria-live="polite"></div>' +
          '<form id="ag-input-form" class="ag-input">' +
            '<input id="ag-input" class="sa-field__input" placeholder="Digite uma pergunta de teste…" autocomplete="off" />' +
            '<button class="sa-btn sa-btn--primary" type="submit"><i class="fa-solid fa-paper-plane"></i></button>' +
          '</form>' +
          '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
            '<button class="sa-btn sa-btn--ghost" data-quick="Como faço uma doação?">Como faço uma doação?</button>' +
            '<button class="sa-btn sa-btn--ghost" data-quick="Quero ser voluntário">Quero ser voluntário</button>' +
            '<button class="sa-btn sa-btn--ghost" data-quick="Como envio o comprovante?">Como envio o comprovante?</button>' +
            '<button class="sa-btn sa-btn--ghost" data-quick="Pedido de oração">Pedido de oração</button>' +
            '<button class="sa-btn sa-btn--ghost" data-quick="Onde fica a sede?">Onde fica a sede?</button>' +
          '</div>' +
        '</section>' +
      '</section>' +

      // ── Aba Sem resposta ──────────────────────────────────────────
      '<section id="ag-tab-unanswered" hidden>' +
        '<section class="sa-panel">' +
          '<h3 class="sa-panel__title">Perguntas sem resposta</h3>' +
          '<p style="margin:-4px 0 12px;color:var(--sa-text-mute);font-size:12.5px">Visitantes fizeram essas perguntas e a Dona Assunção não tinha resposta cadastrada. Use cada uma para criar um novo conhecimento.</p>' +
          '<div id="un-tbl" class="sa-tbl-wrap" aria-busy="true">' + skel() + '</div>' +
        '</section>' +
      '</section>' +

      // ── Slide-in: editor de conhecimento ──────────────────────────
      '<aside id="kn-edit" class="pd-edit" hidden>' +
        '<header class="pd-edit__head"><strong id="kn-edit-title">Novo conhecimento</strong>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" id="kn-edit-close"><i class="fa-solid fa-xmark"></i></button></header>' +
        '<form class="pd-edit__body">' +
          '<input type="hidden" id="kn-id" />' +
          '<div class="sa-row">' +
            '<label class="sa-field" style="grid-column:1/-1"><span class="sa-field__label">Título *</span><input id="kn-title" class="sa-field__input" maxlength="160" required /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Categoria</span><select id="kn-edit-cat" class="sa-field__input"></select></label>' +
            '<label class="sa-field"><span class="sa-field__label">Prioridade (1–100)</span><input id="kn-priority" type="number" class="sa-field__input" min="1" max="100" /></label>' +
            '<label class="sa-field" style="grid-column:1/-1"><span class="sa-field__label">Conteúdo *</span><textarea id="kn-content" class="sa-field__input" rows="6" maxlength="3000" required></textarea></label>' +
            '<label class="sa-field" style="grid-column:1/-1"><span class="sa-field__label">Palavras-chave (separadas por vírgula)</span><input id="kn-keywords" class="sa-field__input" placeholder="doar, doacao, contribuir, ajudar" /></label>' +
            '<label class="sa-field"><span class="sa-field__label">Status</span><select id="kn-edit-status" class="sa-field__input"><option value="active">Ativo</option><option value="draft">Rascunho</option><option value="archived">Arquivado</option></select></label>' +
            '<label class="sa-field"><span class="sa-field__label">Fonte (referência opcional)</span><input id="kn-source" class="sa-field__input" maxlength="160" placeholder="ex.: site, manual interno…" /></label>' +
          '</div>' +
        '</form>' +
        '<footer class="pd-edit__foot">' +
          '<button type="button" class="sa-btn sa-btn--danger" id="kn-delete" hidden><i class="fa-solid fa-trash"></i><span>Excluir</span></button>' +
          '<div style="flex:1"></div>' +
          '<button type="button" class="sa-btn sa-btn--primary" id="kn-save"><i class="fa-solid fa-floppy-disk"></i><span>Salvar</span></button>' +
        '</footer>' +
      '</aside>';
  }
  function skel() {
    var rows = '';
    for (var i = 0; i < 5; i++) rows += '<tr><td><div class="sa-skel" style="height:14px;width:60%"></div></td><td><div class="sa-skel" style="height:14px;width:40%"></div></td><td><div class="sa-skel" style="height:14px;width:30%"></div></td><td><div class="sa-skel" style="height:14px;width:60px"></div></td></tr>';
    return '<table class="sa-tbl"><thead><tr><th>Título</th><th>Categoria</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  /* ── Aba: Conhecimentos ───────────────────────────────────────── */
  function fillCategorySelects() {
    var sel1 = document.getElementById('kn-cat');
    var sel2 = document.getElementById('kn-edit-cat');
    var opts = '<option value="">Sem categoria</option>' +
      st.categories.map(function (c) { return '<option value="' + escHtml(c.category_key) + '" data-id="' + escHtml(c.id) + '">' + escHtml(c.name) + '</option>'; }).join('');
    if (sel1) sel1.innerHTML = '<option value="">Todas as categorias</option>' + st.categories.map(function (c) { return '<option value="' + escHtml(c.category_key) + '">' + escHtml(c.name) + '</option>'; }).join('');
    if (sel2) sel2.innerHTML = opts;
  }

  async function loadKnowledge() {
    var box = document.getElementById('kn-tbl');
    if (!box) return;
    box.setAttribute('aria-busy', 'true');
    try {
      var r = await window.SA.api.agent.knowledge.list(st.knFilter);
      st.knowledge = r.items; st.knTotal = r.total;
    } catch (e) {
      var msg = String(e.message || '');
      if (msg.indexOf('Could not find the table') >= 0 || msg.indexOf('does not exist') >= 0) {
        box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-database" style="font-size:24px"></i><div style="font-weight:700;color:var(--sa-text)">Migração da Fase 6 não aplicada</div><div>Execute <code>db/super-admin/008_phase6_agent.sql</code>.</div></div>';
      } else box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>' + escHtml(msg) + '</div></div>';
      return;
    } finally { box.setAttribute('aria-busy','false'); }
    if (!st.knowledge.length) {
      box.innerHTML = '<div class="sa-empty"><i class="fa-regular fa-folder-open"></i><div>Nenhum conhecimento. Adicione o primeiro.</div></div>';
      return;
    }
    var trs = st.knowledge.map(function (k) {
      var statusKlass = k.status === 'active' ? 'sa-pill--ok' : k.status === 'draft' ? 'sa-pill--draft' : '';
      return '<tr data-id="' + escHtml(k.id) + '">' +
        '<td><strong>' + escHtml(k.title) + '</strong>' +
          '<div style="color:var(--sa-text-mute);font-size:12px;margin-top:2px">' +
            (k.keywords && k.keywords.length ? (k.keywords.slice(0, 4).map(function (w) { return '<span class="sa-pill" style="margin-right:4px">' + escHtml(w) + '</span>'; }).join('')) : '') +
          '</div>' +
        '</td>' +
        '<td>' + escHtml(k.category_key || '—') + '</td>' +
        '<td><span class="sa-pill ' + statusKlass + '">' + escHtml(k.status) + '</span> · <span style="color:var(--sa-text-mute);font-size:12px">prio ' + k.priority + '</span></td>' +
        '<td class="sa-tbl__actions"><button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="edit"><i class="fa-solid fa-pen"></i></button></td>' +
      '</tr>';
    }).join('');
    box.innerHTML = '<table class="sa-tbl"><thead><tr><th>Título</th><th>Categoria</th><th>Status</th><th></th></tr></thead><tbody>' + trs + '</tbody></table>';
    box.querySelectorAll('tr[data-id]').forEach(function (tr) {
      var id = tr.getAttribute('data-id');
      tr.querySelector('[data-act="edit"]').addEventListener('click', function () { openEditKn(id); });
      tr.querySelector('td:first-child').style.cursor = 'pointer';
      tr.querySelector('td:first-child').addEventListener('click', function () { openEditKn(id); });
    });
  }

  function openCreateKn() {
    st.selectedKnId = null;
    document.getElementById('kn-id').value = '';
    document.getElementById('kn-title').value = '';
    document.getElementById('kn-content').value = '';
    document.getElementById('kn-keywords').value = '';
    document.getElementById('kn-priority').value = '50';
    document.getElementById('kn-edit-cat').value = '';
    document.getElementById('kn-edit-status').value = 'active';
    document.getElementById('kn-source').value = '';
    document.getElementById('kn-edit-title').textContent = 'Novo conhecimento';
    document.getElementById('kn-delete').hidden = true;
    document.getElementById('kn-edit').hidden = false;
  }

  function openEditKn(id) {
    var k = st.knowledge.find(function (x) { return x.id === id; });
    if (!k) return;
    st.selectedKnId = id;
    document.getElementById('kn-id').value = k.id;
    document.getElementById('kn-title').value = k.title || '';
    document.getElementById('kn-content').value = k.content || '';
    document.getElementById('kn-keywords').value = (k.keywords || []).join(', ');
    document.getElementById('kn-priority').value = k.priority || 50;
    document.getElementById('kn-edit-cat').value = k.category_key || '';
    document.getElementById('kn-edit-status').value = k.status || 'active';
    document.getElementById('kn-source').value = k.source || '';
    document.getElementById('kn-edit-title').textContent = 'Editar · ' + k.title;
    document.getElementById('kn-delete').hidden = false;
    document.getElementById('kn-edit').hidden = false;
  }

  async function saveKn() {
    var title = document.getElementById('kn-title').value.trim();
    var content = document.getElementById('kn-content').value.trim();
    if (!title)   return window.SA.store.toast('Informe o título', 'err');
    if (!content) return window.SA.store.toast('Informe o conteúdo', 'err');

    var keywords = document.getElementById('kn-keywords').value.split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    var catKey   = document.getElementById('kn-edit-cat').value;
    var cat      = st.categories.find(function (c) { return c.category_key === catKey; });

    var data = {
      title: title, content: content, keywords: keywords,
      priority: parseInt(document.getElementById('kn-priority').value, 10) || 50,
      category_key: catKey || null,
      category_id:  cat ? cat.id : null,
      status: document.getElementById('kn-edit-status').value,
      source: document.getElementById('kn-source').value.trim()
    };
    try {
      if (st.selectedKnId) {
        await window.SA.api.agent.knowledge.update(st.selectedKnId, data);
        window.SA.store.toast('Conhecimento atualizado', 'ok');
      } else {
        await window.SA.api.agent.knowledge.create(data);
        window.SA.store.toast('Conhecimento criado', 'ok');
      }
      document.getElementById('kn-edit').hidden = true;
      await loadKnowledge();
    } catch (e) { window.SA.store.toast('Erro: ' + e.message, 'err'); }
  }

  async function deleteKn() {
    if (!st.selectedKnId) return;
    if (!confirm('Excluir este conhecimento? (soft delete)')) return;
    try { await window.SA.api.agent.knowledge.softDelete(st.selectedKnId); window.SA.store.toast('Removido', 'ok'); document.getElementById('kn-edit').hidden = true; await loadKnowledge(); }
    catch (e) { window.SA.store.toast('Erro: ' + e.message, 'err'); }
  }

  /* ── Aba: Configurações ───────────────────────────────────────── */
  function fillSettings(s) {
    document.getElementById('ag-name').value         = s.display_name || 'Dona Assunção';
    document.getElementById('ag-avatar').value       = s.avatar_url || '';
    document.getElementById('ag-tone').value         = s.tone || 'acolhedor';
    document.getElementById('ag-active').value       = s.active === false ? 'false' : 'true';
    document.getElementById('ag-greet').value        = s.greeting || '';
    document.getElementById('ag-fallback').value     = s.fallback_message || '';
    document.getElementById('ag-handoff').value      = s.human_handoff || '';
    document.getElementById('ag-instructions').value = s.instructions || '';
    document.getElementById('ag-limits').value       = (s.limits || []).join('\n');
  }
  async function saveSettings() {
    try {
      var d = {
        display_name:     document.getElementById('ag-name').value.trim() || 'Dona Assunção',
        avatar_url:       document.getElementById('ag-avatar').value.trim(),
        tone:             document.getElementById('ag-tone').value,
        active:           document.getElementById('ag-active').value === 'true',
        greeting:         document.getElementById('ag-greet').value.trim(),
        fallback_message: document.getElementById('ag-fallback').value.trim(),
        human_handoff:    document.getElementById('ag-handoff').value.trim(),
        instructions:     document.getElementById('ag-instructions').value,
        limits:           document.getElementById('ag-limits').value.split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean)
      };
      st.settings = await window.SA.api.agent.settings.upsertDefault(d);
      window.SA.store.toast('Configuração salva', 'ok');
      reflectActivePill();
    } catch (e) { window.SA.store.toast('Erro: ' + e.message, 'err'); }
  }

  function reflectActivePill() {
    var pill = document.getElementById('ag-active-pill');
    if (!pill) return;
    pill.hidden = !(st.settings && st.settings.active);
  }

  /* ── Aba: Testar conversa ─────────────────────────────────────── */
  function pushMsg(who, text, knowledge) {
    var box = document.getElementById('ag-chat');
    if (!box) return;
    var div = document.createElement('div');
    div.className = 'ag-msg ag-msg--' + who;
    var src = knowledge ? '<small class="ag-msg__src">com base em: <strong>' + escHtml(knowledge.title) + '</strong> · prio ' + knowledge.priority + '</small>' : '';
    div.innerHTML = '<div class="ag-msg__bubble">' + escHtml(text).replace(/\n/g,'<br/>') + '</div>' + src;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  async function ask(query) {
    if (!query) return;
    pushMsg('user', query);
    var input = document.getElementById('ag-input');
    if (input) input.value = '';
    try {
      var match = await window.SA.api.agent.knowledge.match(query, { threshold: 3 });
      if (match) {
        pushMsg('agent', match.knowledge.content, match.knowledge);
      } else {
        var fb = (st.settings && st.settings.fallback_message) || 'Ainda não tenho essa resposta certinha.';
        pushMsg('agent', fb);
        // Em modo de teste, não logamos no banco para não poluir — usuário real do site sim.
      }
    } catch (e) {
      pushMsg('agent', 'Erro ao consultar a base: ' + e.message);
    }
  }

  /* ── Aba: Sem resposta ────────────────────────────────────────── */
  async function loadUnanswered() {
    var box = document.getElementById('un-tbl');
    if (!box) return;
    box.setAttribute('aria-busy','true');
    try { st.unanswered = await window.SA.api.agent.unanswered.list({ limit: 200 }); }
    catch (e) {
      box.innerHTML = '<div class="sa-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>' + escHtml(e.message) + '</div></div>';
      return;
    } finally { box.setAttribute('aria-busy','false'); }
    if (!st.unanswered.length) {
      box.innerHTML = '<div class="sa-empty"><i class="fa-regular fa-thumbs-up"></i><div>Tudo respondido. Continue assim!</div></div>';
      return;
    }
    var trs = st.unanswered.map(function (u) {
      var when = new Date(u.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      var statusKlass = u.status === 'new' ? 'sa-pill--draft' : u.status === 'answered' ? 'sa-pill--ok' : '';
      return '<tr data-id="' + escHtml(u.id) + '">' +
        '<td>' + escHtml(when) + '</td>' +
        '<td style="max-width:520px;white-space:normal">' + escHtml(u.question) + (u.context ? '<div style="color:var(--sa-text-mute);font-size:12px;margin-top:2px">' + escHtml(u.context) + '</div>' : '') + '</td>' +
        '<td><span class="sa-pill ' + statusKlass + '">' + escHtml(u.status) + '</span></td>' +
        '<td class="sa-tbl__actions">' +
          '<button class="sa-btn sa-btn--soft  sa-btn--icon" data-act="convert" title="Criar conhecimento a partir disso"><i class="fa-solid fa-bookmark"></i></button>' +
          '<button class="sa-btn sa-btn--ghost sa-btn--icon" data-act="ignore"  title="Ignorar"><i class="fa-solid fa-eye-slash"></i></button>' +
        '</td>' +
      '</tr>';
    }).join('');
    box.innerHTML = '<table class="sa-tbl"><thead><tr><th>Quando</th><th>Pergunta</th><th>Status</th><th></th></tr></thead><tbody>' + trs + '</tbody></table>';
    box.querySelectorAll('tr[data-id]').forEach(function (tr) {
      var id = tr.getAttribute('data-id');
      tr.querySelector('[data-act="convert"]').addEventListener('click', async function () {
        var u = st.unanswered.find(function (x) { return x.id === id; });
        if (!u) return;
        // Abre o slide-in pré-preenchido
        showTab('knowledge');
        await new Promise(function (r) { setTimeout(r, 100); });
        openCreateKn();
        document.getElementById('kn-title').value = u.question.slice(0, 160);
        document.getElementById('kn-content').focus();
      });
      tr.querySelector('[data-act="ignore"]').addEventListener('click', async function () {
        try { await window.SA.api.agent.unanswered.updateStatus(id, 'ignored'); await loadUnanswered(); }
        catch (e) { window.SA.store.toast('Erro: ' + e.message, 'err'); }
      });
    });
  }

  /* ── Tabs ──────────────────────────────────────────────────────── */
  function showTab(name) {
    st.tab = name;
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.querySelectorAll('[data-tab]').forEach(function (b) { b.removeAttribute('aria-current'); });
    var btn = view.querySelector('[data-tab="' + name + '"]');
    if (btn) btn.setAttribute('aria-current','true');
    ['knowledge','settings','test','unanswered'].forEach(function (n) {
      var s = document.getElementById('ag-tab-' + n);
      if (s) s.hidden = (n !== name);
    });
    if (name === 'unanswered') loadUnanswered();
    if (name === 'test') {
      var box = document.getElementById('ag-chat');
      if (box && !box.children.length && st.settings) {
        pushMsg('agent', st.settings.greeting || 'Olá! Como posso ajudar?');
      }
    }
  }

  async function render() {
    var view = document.getElementById('sa-view');
    if (!view) return;
    view.innerHTML = shell();
    if (window.SA.layout) window.SA.layout.setCrumbs([{ label: 'Super Admin' }, { label: 'Dona Assunção', strong: true }]);
    bindStyles();

    // Carrega settings + categorias em paralelo
    try {
      var res = await Promise.all([
        window.SA.api.agent.settings.get('default').catch(function () { return null; }),
        window.SA.api.agent.categories.list().catch(function () { return []; })
      ]);
      st.settings   = res[0];
      st.categories = res[1] || [];
    } catch (e) { /* tabela inexistente — fallback gracioso por aba */ }

    fillCategorySelects();
    if (st.settings) fillSettings(st.settings); else fillSettings({});
    reflectActivePill();

    // Tabs
    view.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); }); });

    // Knowledge
    var debKn = null;
    document.getElementById('kn-q').addEventListener('input', function (e) { clearTimeout(debKn); debKn = setTimeout(function () { st.knFilter.q = e.target.value; loadKnowledge(); }, 250); });
    document.getElementById('kn-cat').addEventListener('change', function (e) { st.knFilter.category_key = e.target.value; loadKnowledge(); });
    document.getElementById('kn-status').addEventListener('change', function (e) { st.knFilter.status = e.target.value; loadKnowledge(); });
    document.getElementById('kn-new').addEventListener('click', openCreateKn);
    document.getElementById('kn-edit-close').addEventListener('click', function () { document.getElementById('kn-edit').hidden = true; });
    document.getElementById('kn-save').addEventListener('click', saveKn);
    document.getElementById('kn-delete').addEventListener('click', deleteKn);

    // Settings
    document.getElementById('ag-save').addEventListener('click', saveSettings);

    // Test
    document.getElementById('ag-input-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = (document.getElementById('ag-input').value || '').trim();
      if (q) ask(q);
    });
    view.querySelectorAll('[data-quick]').forEach(function (b) {
      b.addEventListener('click', function () { ask(b.getAttribute('data-quick')); });
    });

    showTab('knowledge');
    await loadKnowledge();
  }

  var stylesInjected = false;
  function bindStyles() {
    if (stylesInjected) return; stylesInjected = true;
    var css = '' +
      '.ag-chat { display: flex; flex-direction: column; gap: 10px; min-height: 200px; max-height: 420px; overflow-y: auto; padding: 14px; background: var(--sa-bg-soft); border: 1px solid var(--sa-line); border-radius: 12px; }' +
      '.ag-msg { display: flex; flex-direction: column; gap: 4px; max-width: 80%; }' +
      '.ag-msg--user  { align-self: flex-end; align-items: flex-end; }' +
      '.ag-msg--agent { align-self: flex-start; align-items: flex-start; }' +
      '.ag-msg__bubble { padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5; }' +
      '.ag-msg--user  .ag-msg__bubble { background: var(--sa-accent); color: #fff; border-bottom-right-radius: 4px; }' +
      '.ag-msg--agent .ag-msg__bubble { background: var(--sa-bg-elev); color: var(--sa-text); border: 1px solid var(--sa-line); border-bottom-left-radius: 4px; }' +
      '.ag-msg__src { font-size: 11px; color: var(--sa-text-mute); padding: 0 4px; }' +
      '.ag-input { display: flex; gap: 8px; margin-top: 12px; }' +
      '.ag-input input { flex: 1; }';
    var el = document.createElement('style'); el.id = 'sa-agent-styles'; el.textContent = css; document.head.appendChild(el);
  }

  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.agent = { render: render };
})();
