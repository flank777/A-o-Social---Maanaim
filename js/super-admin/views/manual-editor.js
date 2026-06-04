/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · views/manual-editor.js                               ║
  ║  Hub central do Editor Manual — mapeia, importa e edita todo        ║
  ║  conteúdo existente no projeto (hardcoded → editável pelo painel).  ║
  ║  Modo offline: edições salvas em localStorage até sync com banco.   ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  /* ── Helpers ─────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function router()   { return window.SA && window.SA.router; }
  function store()    { return window.SA && window.SA.store; }
  function api()      { return window.SA && window.SA.api; }
  function importer() { return window.SA && window.SA.importer; }
  function manifest() { return window.SA && window.SA.manifest; }
  function layout()   { return window.SA && window.SA.layout; }

  /* ── Estado da view ──────────────────────────────────────────────── */
  var st = {
    tab:          'pages',
    importStatus: {},
    loading:      false,
    importing:    false,
    texts:        [],
    dbTexts:      {},
    editingText:  null,
    expandedPage: null
  };

  /* ══════════════════════════════════════════════════════════════════
     Overrides locais (localStorage) — permite edição offline
  ══════════════════════════════════════════════════════════════════ */
  var LOCAL_OVERRIDES_KEY = 'sa_local_sec_overrides';

  function loadAllOverrides() {
    try { return JSON.parse(localStorage.getItem(LOCAL_OVERRIDES_KEY) || '{}'); } catch (e) { return {}; }
  }

  function loadSecOverride(internalName) {
    return loadAllOverrides()['sec__' + internalName] || null;
  }

  function saveSecOverride(internalName, data) {
    var all = loadAllOverrides();
    all['sec__' + internalName] = Object.assign({}, data, { _savedAt: new Date().toISOString() });
    try { localStorage.setItem(LOCAL_OVERRIDES_KEY, JSON.stringify(all)); } catch (e) {}
  }

  function clearSecOverride(internalName) {
    var all = loadAllOverrides();
    delete all['sec__' + internalName];
    try { localStorage.setItem(LOCAL_OVERRIDES_KEY, JSON.stringify(all)); } catch (e) {}
  }

  function hasPendingOverrides() {
    return Object.keys(loadAllOverrides()).length > 0;
  }

  /* ── Tabs ─────────────────────────────────────────────────────────── */
  var TABS = [
    { id: 'pages',  icon: 'fa-sitemap',     label: 'Páginas & Seções' },
    { id: 'texts',  icon: 'fa-font',        label: 'Textos' },
    { id: 'media',  icon: 'fa-photo-film',  label: 'Imagens & Mídias' },
    { id: 'charts', icon: 'fa-chart-line',  label: 'Gráficos' }
  ];

  /* ── Pills e badges ──────────────────────────────────────────────── */
  function statusPill(imported, hasDb) {
    if (imported || hasDb) {
      return '<span class="sa-pill sa-pill--ok" title="Já importado para o banco">importado</span>';
    }
    return '<span class="sa-pill sa-pill--draft" title="Ainda não importado">código estático</span>';
  }

  function typeBadge(type) {
    var colors = {
      hero: '#5A8A4A', text: '#4a7a8a', cards: '#8a6a4a',
      form: '#4a4a8a', cta: '#8a4a6a', steps: '#6a4a8a',
      stats: '#4a8a6a', gallery: '#8a7a4a', custom: '#666'
    };
    var color = colors[type] || '#666';
    return '<span style="display:inline-block;padding:1px 7px;border-radius:6px;font-size:10px;font-weight:600;background:' + color + '22;color:' + color + ';border:1px solid ' + color + '44">' + esc(type) + '</span>';
  }

  /* ── Shell principal ─────────────────────────────────────────────── */
  function shell() {
    var tabsHtml = TABS.map(function (t) {
      var active = t.id === st.tab ? ' aria-current="true" style="background:var(--sa-bg-card);box-shadow:var(--sa-shadow-sm)"' : '';
      return '<button type="button" class="sa-btn sa-btn--ghost" data-me-tab="' + t.id + '"' + active + ' style="gap:6px;padding:7px 14px">' +
        '<i class="fa-solid ' + t.icon + '" aria-hidden="true"></i><span>' + t.label + '</span>' +
      '</button>';
    }).join('');

    return '' +
      '<header class="sa-view__head">' +
        '<div>' +
          '<h2 class="sa-view__title"><i class="fa-solid fa-code-branch" style="margin-right:10px;color:var(--sa-accent)"></i>Editor Manual</h2>' +
          '<p class="sa-view__sub">Visualize, importe e edite todo conteúdo existente no projeto — páginas, seções, textos, mídias e gráficos hardcoded.</p>' +
        '</div>' +
        '<div class="sa-view__actions">' +
          '<button type="button" class="sa-btn sa-btn--ghost" id="me-refresh" title="Atualizar status">' +
            '<i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i>' +
          '</button>' +
          '<button type="button" class="sa-btn sa-btn--primary" id="me-import-all">' +
            '<i class="fa-solid fa-file-import" aria-hidden="true"></i><span>Importar tudo</span>' +
          '</button>' +
        '</div>' +
      '</header>' +

      '<div style="display:flex;gap:6px;background:var(--sa-bg-soft);padding:4px;border-radius:12px;border:1px solid var(--sa-line);margin-bottom:20px;flex-wrap:wrap" id="me-tabs">' +
        tabsHtml +
      '</div>' +

      '<div id="me-content"></div>';
  }

  /* ══════════════════════════════════════════════════════════════════
     TAB: Páginas & Seções
  ══════════════════════════════════════════════════════════════════ */
  function renderPagesTab() {
    var m = manifest();
    if (!m) {
      setContent('<p class="sa-empty">Manifest não carregado.</p>');
      return;
    }

    var groups = [
      { label: 'Site Público', icon: 'fa-globe',              pages: m.pages.filter(function (p) { return p.area_type === 'site_publico'; }) },
      { label: 'Área Admin',   icon: 'fa-screwdriver-wrench', pages: m.pages.filter(function (p) { return p.area_type === 'admin'; }) }
    ];

    var html = '' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
        '<p style="font-size:13px;color:var(--sa-text-soft)">Páginas mapeadas no manifest. Importe para torná-las editáveis pelo painel.</p>' +
        '<div style="display:flex;gap:6px">' +
          '<button class="sa-btn sa-btn--ghost" id="me-expand-all"><i class="fa-solid fa-list-tree"></i> <span>Expandir tudo</span></button>' +
        '</div>' +
      '</div>';

    /* Banner de overrides locais pendentes */
    if (hasPendingOverrides()) {
      var pendingCount = Object.keys(loadAllOverrides()).length;
      html += '' +
        '<div style="background:#fff8e1;border:1px solid #f9c74f;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px">' +
          '<i class="fa-solid fa-clock-rotate-left" style="color:#d4a017;font-size:18px;flex-shrink:0"></i>' +
          '<div style="flex:1;min-width:0">' +
            '<strong style="font-size:13px">' + pendingCount + ' seção(ões) com edições locais pendentes</strong>' +
            '<div style="font-size:12px;color:#7a5c00;margin-top:2px">As alterações estão salvas neste navegador. Quando o Supabase Auth estiver disponível, entre com conta real e clique em <strong>Sincronizar com banco</strong>.</div>' +
          '</div>' +
          '<button class="sa-btn sa-btn--ghost" id="me-sync-overrides" style="font-size:12px;border-color:#d4a017;color:#7a5c00;flex-shrink:0">' +
            '<i class="fa-solid fa-cloud-arrow-up"></i> Sincronizar' +
          '</button>' +
        '</div>';
    }

    groups.forEach(function (group) {
      if (!group.pages.length) return;
      html += '<div style="margin-bottom:24px">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
          '<i class="fa-solid ' + group.icon + '" style="color:var(--sa-accent)"></i>' +
          '<strong style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--sa-text-soft)">' + esc(group.label) + '</strong>' +
          '<span style="font-size:11px;color:var(--sa-text-soft);margin-left:4px">(' + group.pages.length + ' páginas)</span>' +
        '</div>';

      group.pages.forEach(function (pageDef) {
        var status  = st.importStatus[pageDef.key] || {};
        var imported = status.imported;
        var dbPage   = status.page;
        html += renderPageRow(pageDef, imported, dbPage);
      });

      html += '</div>';
    });

    /* Componentes globais */
    html += '<div style="margin-bottom:24px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
        '<i class="fa-solid fa-puzzle-piece" style="color:var(--sa-accent)"></i>' +
        '<strong style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--sa-text-soft)">Componentes Globais</strong>' +
      '</div>' +
      renderGlobalRow('navbar', 'Barra de Navegação', 'components/navbar.html', 'fa-bars') +
      renderGlobalRow('footer', 'Rodapé',              'components/footer.html', 'fa-rectangle-xmark') +
    '</div>';

    setContent(html);
    bindPagesTab();
  }

  function renderPageRow(pageDef, imported, dbPage) {
    var isExpanded = st.expandedPage === pageDef.key;
    var sections   = pageDef.sections || [];

    var html = '<div class="sa-tbl-row" style="display:block;padding:0;border-radius:12px;overflow:hidden;margin-bottom:8px;border:1px solid var(--sa-line)">' +
      '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--sa-bg-card);cursor:pointer" data-me-expand="' + esc(pageDef.key) + '">' +
        '<i class="fa-solid fa-chevron-' + (isExpanded ? 'down' : 'right') + '" style="color:var(--sa-text-soft);width:14px;flex-shrink:0" id="me-chevron-' + esc(pageDef.key) + '"></i>' +
        '<i class="fa-solid fa-file-lines" style="color:var(--sa-accent)"></i>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<strong style="font-size:14px">' + esc(pageDef.title) + '</strong>' +
            statusPill(imported, !!dbPage) +
          '</div>' +
          '<div style="font-size:11px;color:var(--sa-text-soft);margin-top:2px">' +
            '<code style="background:var(--sa-bg-soft);padding:1px 5px;border-radius:4px;font-size:10px">' + esc(pageDef.file) + '</code>' +
            ' · ' + sections.length + ' seções mapeadas' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-shrink:0">' +
          (imported
            ? '<button class="sa-btn sa-btn--primary" style="font-size:12px;padding:5px 12px" data-me-edit-page="' + esc(dbPage && dbPage.id) + '">' +
                '<i class="fa-solid fa-pen-to-square"></i><span>Editar</span>' +
              '</button>'
            : '<button class="sa-btn sa-btn--ghost" style="font-size:12px;padding:5px 12px;border-color:var(--sa-accent);color:var(--sa-accent)" data-me-import-page="' + esc(pageDef.key) + '">' +
                '<i class="fa-solid fa-file-import"></i><span>Importar</span>' +
              '</button>'
          ) +
        '</div>' +
      '</div>';

    if (isExpanded) {
      html += '<div style="padding:12px 16px 16px;background:var(--sa-bg-soft);border-top:1px solid var(--sa-line)">';
      if (!sections.length) {
        html += '<p style="color:var(--sa-text-soft);font-size:13px">Nenhuma seção mapeada.</p>';
      } else {
        html += '<div style="display:flex;flex-direction:column;gap:6px">';
        sections.forEach(function (sec) {
          html += renderSectionRow(sec, imported, dbPage);
        });
        html += '</div>';
      }
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  function renderSectionRow(sec, pageImported, dbPage) {
    var cardsCount = (sec.cards  || []).length;
    var textsCount = (sec.texts  || []).length;
    var btnsCount  = (sec.buttons|| []).length;
    var imgCount   = (sec.images || []).length;
    var hasLocal   = !!loadSecOverride(sec.internal_name);

    var borderColor = hasLocal ? 'var(--sa-accent)' : 'var(--sa-line)';
    var editBtnStyle = 'font-size:11px;padding:4px 10px' + (hasLocal ? ';border-color:var(--sa-accent);color:var(--sa-accent)' : '');

    /* Botão de edição: se página importada E tem dbPage → findAndEdit (pode ir para section-detail se existir)
       caso contrário → editor offline direto */
    var editBtn;
    if (pageImported && dbPage) {
      editBtn = '<button class="sa-btn sa-btn--ghost" style="' + editBtnStyle + '" data-me-find-section="' + esc(sec.internal_name) + '" data-me-page-id="' + esc(dbPage.id) + '">' +
        '<i class="fa-solid fa-pen"></i><span>Editar</span>' +
      '</button>';
    } else {
      editBtn = '<button class="sa-btn sa-btn--ghost" style="' + editBtnStyle + '" data-me-edit-sec-local="' + esc(sec.internal_name) + '">' +
        '<i class="fa-solid fa-pen"></i><span>Editar offline</span>' +
      '</button>';
    }

    return '' +
      '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--sa-bg-card);border-radius:8px;border:1px solid ' + borderColor + '">' +
        '<i class="fa-solid fa-layer-group" style="color:var(--sa-text-soft);margin-top:2px;flex-shrink:0"></i>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
            '<span style="font-size:13px;font-weight:600">' + esc(sec.name) + '</span>' +
            typeBadge(sec.type) +
            (hasLocal ? '<span class="sa-pill sa-pill--draft" title="Editado localmente — pendente de sincronização" style="font-size:10px"><i class="fa-solid fa-floppy-disk"></i> local</span>' : '') +
          '</div>' +
          '<div style="font-size:11px;color:var(--sa-text-soft);margin-top:3px;display:flex;gap:10px;flex-wrap:wrap">' +
            (cardsCount ? '<span><i class="fa-solid fa-square"></i> ' + cardsCount + ' cards</span>' : '') +
            (textsCount ? '<span><i class="fa-solid fa-font"></i> '   + textsCount + ' textos</span>' : '') +
            (btnsCount  ? '<span><i class="fa-solid fa-cursor"></i> ' + btnsCount  + ' botões</span>' : '') +
            (imgCount   ? '<span><i class="fa-solid fa-image"></i> '  + imgCount   + ' imagens</span>': '') +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-shrink:0">' +
          editBtn +
        '</div>' +
      '</div>';
  }

  function renderGlobalRow(key, name, file, icon) {
    return '' +
      '<div class="sa-tbl-row" style="display:flex;align-items:center;gap:12px;margin-bottom:8px;border-radius:10px;padding:12px 16px">' +
        '<i class="fa-solid ' + icon + '" style="color:var(--sa-accent)"></i>' +
        '<div style="flex:1">' +
          '<strong style="font-size:13px">' + esc(name) + '</strong>' +
          '<div style="font-size:11px;color:var(--sa-text-soft);margin-top:2px">' +
            '<code style="background:var(--sa-bg-soft);padding:1px 5px;border-radius:4px;font-size:10px">' + esc(file) + '</code>' +
          '</div>' +
        '</div>' +
        '<button class="sa-btn sa-btn--ghost" style="font-size:12px;padding:5px 12px" data-me-edit-global="' + esc(key) + '">' +
          '<i class="fa-solid fa-pen"></i><span>Editar textos</span>' +
        '</button>' +
      '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════
     TAB: Textos
  ══════════════════════════════════════════════════════════════════ */
  function renderTextsTab() {
    var m = manifest();
    var allTexts = m ? m.allTexts() : [];

    if (!allTexts.length) {
      setContent('<p class="sa-empty">Nenhum texto mapeado no manifest.</p>');
      return;
    }

    var byPage = {};
    allTexts.forEach(function (t) {
      var key = t.page_slug || 'geral';
      if (!byPage[key]) byPage[key] = { label: t.page_title || key, items: [] };
      byPage[key].items.push(t);
    });

    var html = '' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
        '<p style="font-size:13px;color:var(--sa-text-soft)">' + allTexts.length + ' textos mapeados. Edite e salve para sobrescrever o valor padrão do código.</p>' +
        '<button class="sa-btn sa-btn--ghost" id="me-import-texts"><i class="fa-solid fa-cloud-arrow-up"></i> <span>Salvar todos no banco</span></button>' +
      '</div>';

    Object.keys(byPage).forEach(function (pageSlug) {
      var group = byPage[pageSlug];
      html += '<div style="margin-bottom:24px">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
          '<i class="fa-solid fa-file-lines" style="color:var(--sa-accent)"></i>' +
          '<strong style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--sa-text-soft)">' + esc(group.label) + '</strong>' +
        '</div>' +
        '<div class="sa-tbl-wrap" style="overflow:visible">' +
          '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
          '<thead><tr style="background:var(--sa-bg-soft)">' +
            '<th style="padding:8px 12px;text-align:left;font-weight:600;color:var(--sa-text-soft);font-size:11px;border-bottom:1px solid var(--sa-line)">Campo</th>' +
            '<th style="padding:8px 12px;text-align:left;font-weight:600;color:var(--sa-text-soft);font-size:11px;border-bottom:1px solid var(--sa-line)">Seção</th>' +
            '<th style="padding:8px 12px;text-align:left;font-weight:600;color:var(--sa-text-soft);font-size:11px;border-bottom:1px solid var(--sa-line)">Valor atual</th>' +
            '<th style="padding:8px 12px;text-align:left;font-weight:600;color:var(--sa-text-soft);font-size:11px;border-bottom:1px solid var(--sa-line)">Ação</th>' +
          '</tr></thead>' +
          '<tbody>';

      group.items.forEach(function (t) {
        var dbRow = st.dbTexts['manifest__' + t.key];
        var currentVal = (dbRow && dbRow.value && dbRow.value.pt) ? dbRow.value.pt : t.value;
        var edited = dbRow && dbRow.value && dbRow.value.pt !== t.value;

        html += '<tr style="border-bottom:1px solid var(--sa-line)">' +
          '<td style="padding:8px 12px;vertical-align:top">' +
            '<div style="font-size:12px;font-weight:600">' + esc(t.label) + '</div>' +
            '<div style="font-size:10px;color:var(--sa-text-soft);margin-top:2px"><code>' + esc(t.key) + '</code></div>' +
          '</td>' +
          '<td style="padding:8px 12px;vertical-align:top;font-size:11px;color:var(--sa-text-soft)">' + esc(t.section_name) + '</td>' +
          '<td style="padding:8px 12px;vertical-align:top">' +
            '<div style="font-size:12px;max-width:360px;word-break:break-word">' + esc(currentVal) + '</div>' +
            (edited ? '<span style="font-size:10px;color:var(--sa-accent);margin-top:2px;display:block">✓ editado no banco</span>' : '') +
          '</td>' +
          '<td style="padding:8px 12px;vertical-align:top;white-space:nowrap">' +
            '<button class="sa-btn sa-btn--ghost" style="font-size:11px;padding:3px 10px" data-me-edit-text="' + esc(t.key) + '">' +
              '<i class="fa-solid fa-pen"></i> Editar' +
            '</button>' +
          '</td>' +
        '</tr>';
      });

      html += '</tbody></table></div></div>';
    });

    html += renderTextEditModal();
    setContent(html);
    bindTextsTab(allTexts);
  }

  function renderTextEditModal() {
    return '' +
      '<div id="me-text-modal" hidden style="position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5)">' +
        '<div style="background:var(--sa-bg-card);border-radius:16px;padding:28px;width:min(520px,90vw);box-shadow:0 20px 60px rgba(0,0,0,.3)">' +
          '<h3 style="margin:0 0 4px;font-size:16px" id="me-text-modal-title">Editar texto</h3>' +
          '<p style="font-size:12px;color:var(--sa-text-soft);margin:0 0 16px" id="me-text-modal-key"></p>' +
          '<label class="sa-field" style="margin-bottom:16px">' +
            '<span class="sa-field__label">Texto atual (código)</span>' +
            '<input class="sa-field__input" id="me-text-original" disabled style="opacity:.6" />' +
          '</label>' +
          '<label class="sa-field" style="margin-bottom:20px">' +
            '<span class="sa-field__label">Novo texto (editável)</span>' +
            '<textarea class="sa-field__input" id="me-text-new" rows="3" style="resize:vertical"></textarea>' +
          '</label>' +
          '<div style="display:flex;gap:8px;justify-content:flex-end">' +
            '<button class="sa-btn sa-btn--ghost" id="me-text-cancel">Cancelar</button>' +
            '<button class="sa-btn sa-btn--primary" id="me-text-save"><i class="fa-solid fa-cloud-arrow-up"></i> Salvar no banco</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════
     TAB: Mídias
  ══════════════════════════════════════════════════════════════════ */
  function renderMediaTab() {
    var m = manifest();
    var allMedia = m ? m.allMedia() : [];

    var html = '' +
      '<div style="margin-bottom:16px">' +
        '<p style="font-size:13px;color:var(--sa-text-soft)">' + allMedia.length + ' imagens e vídeos mapeados no manifest. Substitua por URLs externas ou faça upload pelo painel de Mídia.</p>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">';

    allMedia.forEach(function (media) {
      var isLocalFile = !media.url && !!media.file;
      var displaySrc  = media.url || (media.file ? media.file : '');

      html += '' +
        '<div style="background:var(--sa-bg-card);border:1px solid var(--sa-line);border-radius:12px;overflow:hidden">' +
          '<div style="height:140px;background:var(--sa-bg-soft);display:flex;align-items:center;justify-content:center">' +
            (isLocalFile
              ? '<img src="' + esc(displaySrc) + '" alt="' + esc(media.alt || media.name) + '" style="max-width:100%;max-height:140px;object-fit:contain" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
                '<div style="display:none;flex-direction:column;align-items:center;color:var(--sa-text-soft);gap:4px"><i class="fa-solid fa-image" style="font-size:28px"></i><span style="font-size:11px">Arquivo local</span></div>'
              : '<div style="display:flex;flex-direction:column;align-items:center;color:var(--sa-text-soft);gap:4px"><i class="fa-solid fa-image" style="font-size:28px"></i><span style="font-size:11px">Sem URL</span></div>'
            ) +
          '</div>' +
          '<div style="padding:12px">' +
            '<div style="font-size:13px;font-weight:600;margin-bottom:4px">' + esc(media.name || media.key) + '</div>' +
            '<div style="font-size:11px;color:var(--sa-text-soft);margin-bottom:6px">' +
              (media.where ? '<div><i class="fa-solid fa-location-dot"></i> ' + esc(media.where) + '</div>' : '') +
              (media.file  ? '<div style="margin-top:2px"><code style="font-size:10px">' + esc(media.file) + '</code></div>' : '') +
            '</div>' +
            '<div style="display:flex;gap:6px">' +
              '<button class="sa-btn sa-btn--ghost" style="font-size:11px;padding:4px 10px;flex:1" data-me-replace-media="' + esc(media.key) + '">' +
                '<i class="fa-solid fa-arrow-right-arrow-left"></i> Substituir URL' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    });

    html += '</div>';

    html += '' +
      '<div id="me-media-modal" hidden style="position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5)">' +
        '<div style="background:var(--sa-bg-card);border-radius:16px;padding:28px;width:min(480px,90vw);box-shadow:0 20px 60px rgba(0,0,0,.3)">' +
          '<h3 style="margin:0 0 4px;font-size:16px" id="me-media-modal-title">Substituir mídia</h3>' +
          '<p style="font-size:12px;color:var(--sa-text-soft);margin:0 0 16px" id="me-media-modal-sub"></p>' +
          '<label class="sa-field" style="margin-bottom:20px">' +
            '<span class="sa-field__label">Nova URL da imagem</span>' +
            '<input class="sa-field__input" id="me-media-url" type="url" placeholder="https://…" />' +
          '</label>' +
          '<div style="display:flex;gap:8px;justify-content:flex-end">' +
            '<button class="sa-btn sa-btn--ghost" id="me-media-cancel">Cancelar</button>' +
            '<button class="sa-btn sa-btn--primary" id="me-media-save"><i class="fa-solid fa-cloud-arrow-up"></i> Salvar no banco</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    setContent(html);
    bindMediaTab(allMedia);
  }

  /* ══════════════════════════════════════════════════════════════════
     TAB: Gráficos
  ══════════════════════════════════════════════════════════════════ */
  function renderChartsTab() {
    var m = manifest();
    var charts = (m && m.charts) || [];

    var html = '' +
      '<div style="margin-bottom:16px">' +
        '<p style="font-size:13px;color:var(--sa-text-soft)">' + charts.length + ' gráficos mapeados. Gerencie-os visualmente em <strong>Dashboards → Editor de Widget</strong>.</p>' +
      '</div>' +
      '<div class="sa-tbl-wrap"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
      '<thead><tr style="background:var(--sa-bg-soft)">' +
        '<th style="padding:10px 14px;text-align:left;font-size:11px;color:var(--sa-text-soft);border-bottom:1px solid var(--sa-line)">Nome</th>' +
        '<th style="padding:10px 14px;text-align:left;font-size:11px;color:var(--sa-text-soft);border-bottom:1px solid var(--sa-line)">Tipo</th>' +
        '<th style="padding:10px 14px;text-align:left;font-size:11px;color:var(--sa-text-soft);border-bottom:1px solid var(--sa-line)">Página</th>' +
        '<th style="padding:10px 14px;text-align:left;font-size:11px;color:var(--sa-text-soft);border-bottom:1px solid var(--sa-line)">Arquivo</th>' +
        '<th style="padding:10px 14px;text-align:left;font-size:11px;color:var(--sa-text-soft);border-bottom:1px solid var(--sa-line)">Ação</th>' +
      '</tr></thead><tbody>';

    charts.forEach(function (ch) {
      html += '<tr style="border-bottom:1px solid var(--sa-line)">' +
        '<td style="padding:10px 14px"><strong>' + esc(ch.name) + '</strong><div style="font-size:11px;color:var(--sa-text-soft);margin-top:2px">' + esc(ch.description) + '</div></td>' +
        '<td style="padding:10px 14px">' + typeBadge(ch.type) + '</td>' +
        '<td style="padding:10px 14px;font-size:12px">' + esc(ch.page) + '</td>' +
        '<td style="padding:10px 14px"><code style="font-size:10px;background:var(--sa-bg-soft);padding:2px 6px;border-radius:4px">' + esc(ch.file) + '</code></td>' +
        '<td style="padding:10px 14px">' +
          '<button class="sa-btn sa-btn--ghost" style="font-size:11px;padding:4px 10px" data-me-chart-dash="' + esc(ch.page) + '">' +
            '<i class="fa-solid fa-chart-column"></i> Dashboards' +
          '</button>' +
        '</td>' +
      '</tr>';
    });

    html += '</tbody></table></div>';
    setContent(html);
    bindChartsTab();
  }

  /* ── DOM helpers ─────────────────────────────────────────────────── */
  function setContent(html) {
    var el = document.getElementById('me-content');
    if (el) el.innerHTML = html;
  }

  function renderTab() {
    if      (st.tab === 'pages')  renderPagesTab();
    else if (st.tab === 'texts')  renderTextsTab();
    else if (st.tab === 'media')  renderMediaTab();
    else if (st.tab === 'charts') renderChartsTab();
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); })
    ]);
  }

  /* ── Carrega status de importação ────────────────────────────────── */
  async function loadStatus() {
    var imp = importer();
    if (!imp) return;
    try {
      st.importStatus = await withTimeout(imp.checkImportStatus(), 5000);
    } catch (e) {
      st.importStatus = {};
    }
  }

  /* ── Carrega textos do banco ─────────────────────────────────────── */
  async function loadDbTexts() {
    try {
      var rows = await withTimeout(api().texts.list({ limit: 1000 }), 5000);
      st.dbTexts = {};
      rows.forEach(function (r) { st.dbTexts[r.text_key] = r; });
    } catch (e) { st.dbTexts = {}; }
  }

  /* ── Bindings: tabs ──────────────────────────────────────────────── */
  function bindTabs() {
    var tabsEl = document.getElementById('me-tabs');
    if (!tabsEl) return;
    tabsEl.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-me-tab]');
      if (!btn) return;
      st.tab = btn.getAttribute('data-me-tab');
      renderTab();
    });
  }

  function bindHeaderBtns() {
    var refreshBtn   = document.getElementById('me-refresh');
    var importAllBtn = document.getElementById('me-import-all');

    if (refreshBtn) refreshBtn.addEventListener('click', async function () {
      refreshBtn.disabled = true;
      await loadStatus();
      await loadDbTexts();
      renderTab();
      refreshBtn.disabled = false;
    });

    if (importAllBtn) importAllBtn.addEventListener('click', async function () {
      if (!confirm('Importar todas as páginas, seções e textos para o banco? Dados existentes não serão sobrescritos.')) return;
      st.importing = true;
      importAllBtn.disabled = true;
      importAllBtn.querySelector('span').textContent = 'Importando…';

      var imp = importer();
      if (!imp) { importAllBtn.disabled = false; return; }

      try {
        var results = await imp.importAll(function (progress) {
          importAllBtn.querySelector('span').textContent = progress.step + '/' + progress.total + ' — ' + progress.label;
        });

        var ok  = results.filter(function (r) { return r.success; }).length;
        var err = results.filter(function (r) { return !r.success; }).length;
        store().toast('Importação concluída: ' + ok + ' páginas importadas' + (err ? ', ' + err + ' erros.' : '.'), err ? 'warning' : 'success', { ttl: 5000 });

        await loadStatus();
        await loadDbTexts();
        renderTab();
      } catch (e) {
        store().toast('Erro na importação: ' + e.message, 'error');
      } finally {
        importAllBtn.disabled = false;
        importAllBtn.querySelector('span').textContent = 'Importar tudo';
        st.importing = false;
      }
    });
  }

  /* ── Bindings: tab Páginas ───────────────────────────────────────── */
  function bindPagesTab() {
    var content = document.getElementById('me-content');
    if (!content) return;

    content.addEventListener('click', function (ev) {

      /* Expandir página */
      var expandBtn = ev.target.closest('[data-me-expand]');
      if (expandBtn) {
        var key = expandBtn.getAttribute('data-me-expand');
        st.expandedPage = (st.expandedPage === key) ? null : key;
        renderPagesTab();
        return;
      }

      /* Importar página */
      var importBtn = ev.target.closest('[data-me-import-page]');
      if (importBtn) {
        var pageKey = importBtn.getAttribute('data-me-import-page');
        importSinglePage(pageKey, importBtn);
        return;
      }

      /* Editar página (ir para page-detail) */
      var editPageBtn = ev.target.closest('[data-me-edit-page]');
      if (editPageBtn) {
        var pageId = editPageBtn.getAttribute('data-me-edit-page');
        if (pageId && router()) router().go('page-detail', { id: pageId });
        return;
      }

      /* Encontrar seção no banco ou abrir editor offline */
      var findSecBtn = ev.target.closest('[data-me-find-section]');
      if (findSecBtn) {
        var secInternal = findSecBtn.getAttribute('data-me-find-section');
        var pid         = findSecBtn.getAttribute('data-me-page-id');
        findAndEditSection(pid, secInternal);
        return;
      }

      /* Editar seção offline (página ainda não importada) */
      var editSecLocalBtn = ev.target.closest('[data-me-edit-sec-local]');
      if (editSecLocalBtn) {
        var internalName = editSecLocalBtn.getAttribute('data-me-edit-sec-local');
        var secDef = findSecDefByInternalName(internalName);
        if (secDef) {
          openSectionEditor(secDef);
        } else {
          store().toast('Seção não encontrada no manifest.', 'warning');
        }
        return;
      }

      /* Editar textos globais (navbar/footer) */
      var editGlobalBtn = ev.target.closest('[data-me-edit-global]');
      if (editGlobalBtn) {
        st.tab = 'texts';
        renderTextsTab();
        return;
      }

      /* Expandir tudo */
      var expandAllBtn = ev.target.closest('#me-expand-all');
      if (expandAllBtn) {
        st.expandedPage = st.expandedPage ? null : (manifest().pages[0] || {}).key;
        renderPagesTab();
        return;
      }

      /* Sincronizar overrides locais com banco */
      var syncBtn = ev.target.closest('#me-sync-overrides');
      if (syncBtn) {
        syncLocalOverridesToDb(syncBtn);
        return;
      }
    });
  }

  function findSecDefByInternalName(internalName) {
    var m = manifest();
    var found = null;
    if (m) {
      m.pages.forEach(function (p) {
        (p.sections || []).forEach(function (s) {
          if (s.internal_name === internalName) found = s;
        });
      });
    }
    return found;
  }

  async function importSinglePage(pageKey, btn) {
    var imp = importer();
    if (!imp) return;
    if (btn) { btn.disabled = true; btn.querySelector('span').textContent = 'Importando…'; }

    try {
      var result = await imp.importPage(pageKey);
      store().toast('Página importada! ' + (result.sections.length) + ' seções criadas.', 'success', { ttl: 3000 });
      await loadStatus();
      renderPagesTab();
    } catch (e) {
      store().toast('Erro: ' + e.message, 'error');
      if (btn) { btn.disabled = false; btn.querySelector('span').textContent = 'Importar'; }
    }
  }

  /* ── Encontra seção no banco ou abre editor offline ──────────────── */
  async function findAndEditSection(pageId, internalName) {
    var imp = importer();
    var a   = api();

    var secDef = findSecDefByInternalName(internalName);

    /* Tenta encontrar no banco com timeout */
    var sec = null;
    try {
      var sections = await withTimeout(a.sections.listByPage(pageId), 8000);
      sec = sections.find(function (s) { return s.internal_name === internalName; });
    } catch (e) {
      /* timeout ou erro de rede — continua */
    }

    /* Encontrou no banco → section-detail */
    if (sec && sec.id && router()) {
      router().go('section-detail', { id: sec.id });
      return;
    }

    /* Não encontrou → tenta criar via importSection */
    if (imp && secDef) {
      try {
        var result = await withTimeout(imp.importSection(pageId, secDef, []), 12000);
        if (result && result.section && result.section.id) {
          store().toast('Seção criada no banco!', 'success', { ttl: 2000 });
          router().go('section-detail', { id: result.section.id });
          return;
        }
      } catch (e) {
        /* RLS ou outro erro → cai no editor offline abaixo */
      }
    }

    /* Fallback definitivo: abre editor offline com localStorage */
    if (secDef) {
      store().toast('Abrindo editor offline — edições salvas localmente até sincronizar.', 'info', { ttl: 3500 });
      openSectionEditor(secDef);
    } else {
      store().toast('Seção não mapeada no manifest.', 'warning');
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     Editor de seção offline (localStorage)
  ══════════════════════════════════════════════════════════════════ */
  function fieldRow(label, id, value, isTextarea) {
    var inputEl = isTextarea
      ? '<textarea class="sa-field__input" id="' + esc(id) + '" rows="2" style="resize:vertical">' + esc(value) + '</textarea>'
      : '<input class="sa-field__input" id="' + esc(id) + '" type="text" value="' + esc(value) + '" />';
    return '' +
      '<label class="sa-field" style="margin-bottom:0">' +
        '<span class="sa-field__label" style="font-size:11px">' + esc(label) + '</span>' +
        inputEl +
      '</label>';
  }

  function openSectionEditor(secDef) {
    /* Remove editor anterior se existir */
    var existing = document.getElementById('me-sec-editor-overlay');
    if (existing) existing.remove();

    var saved    = loadSecOverride(secDef.internal_name) || {};
    var hasLocal = !!loadSecOverride(secDef.internal_name);

    /* ── Campos principais ── */
    var fieldsHtml = '';

    if (secDef.title !== undefined) {
      fieldsHtml += fieldRow('Título da seção', 'me-sec-title',
        saved.title !== undefined ? saved.title : (secDef.title || ''), false);
    }
    if (secDef.subtitle) {
      fieldsHtml += '<div style="margin-top:8px">' +
        fieldRow('Subtítulo', 'me-sec-subtitle',
          saved.subtitle !== undefined ? saved.subtitle : (secDef.subtitle || ''), false) +
      '</div>';
    }
    if (secDef.description) {
      fieldsHtml += '<div style="margin-top:8px">' +
        fieldRow('Descrição', 'me-sec-desc',
          saved.description !== undefined ? saved.description : (secDef.description || ''),
          (secDef.description || '').length > 80) +
      '</div>';
    }

    /* ── Textos ── */
    var texts = secDef.texts || [];
    if (texts.length) {
      fieldsHtml += '<div style="margin:16px 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--sa-text-soft)">Textos</div>';
      fieldsHtml += '<div style="display:flex;flex-direction:column;gap:8px">';
      texts.forEach(function (t) {
        var val = (saved.texts && saved.texts[t.key] !== undefined) ? saved.texts[t.key] : t.value;
        fieldsHtml += fieldRow(t.label, 'me-sec-text__' + t.key, val, val && val.length > 80);
      });
      fieldsHtml += '</div>';
    }

    /* ── Botões ── */
    var buttons = secDef.buttons || [];
    if (buttons.length) {
      fieldsHtml += '<div style="margin:16px 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--sa-text-soft)">Botões</div>';
      fieldsHtml += '<div style="display:flex;flex-direction:column;gap:8px">';
      buttons.forEach(function (b) {
        var savedBtn = saved.buttons && saved.buttons[b.key];
        var btnText  = savedBtn ? savedBtn.text : b.text;
        var btnLink  = savedBtn ? savedBtn.link : (b.link || '');
        fieldsHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          fieldRow(b.text + ' — texto', 'me-sec-btn-text__' + b.key, btnText, false) +
          fieldRow(b.text + ' — link',  'me-sec-btn-link__' + b.key, btnLink, false) +
        '</div>';
      });
      fieldsHtml += '</div>';
    }

    /* ── Imagens ── */
    var images = secDef.images || [];
    if (images.length) {
      fieldsHtml += '<div style="margin:16px 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--sa-text-soft)">Imagens</div>';
      fieldsHtml += '<div style="display:flex;flex-direction:column;gap:8px">';
      images.forEach(function (img) {
        var imgUrl = (saved.images && saved.images[img.key] !== undefined) ? saved.images[img.key] : (img.url || '');
        fieldsHtml += fieldRow(
          (img.where || img.key) + ' (URL)',
          'me-sec-img__' + img.key, imgUrl, false
        );
      });
      fieldsHtml += '</div>';
    }

    /* ── Cards (até 6) ── */
    var cards = secDef.cards || [];
    if (cards.length > 0 && cards.length <= 6) {
      fieldsHtml += '<div style="margin:16px 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--sa-text-soft)">Cards (' + cards.length + ')</div>';
      fieldsHtml += '<div style="display:flex;flex-direction:column;gap:8px">';
      cards.forEach(function (c) {
        var savedCard = saved.cards && saved.cards[c.key];
        var cTitle = savedCard ? savedCard.title : (c.title || '');
        var cDesc  = savedCard ? savedCard.description : (c.description || '');
        fieldsHtml += '' +
          '<div style="background:var(--sa-bg-soft);border-radius:8px;padding:10px 12px">' +
            '<div style="font-size:11px;font-weight:600;color:var(--sa-text-soft);margin-bottom:8px"><i class="fa-solid fa-square" style="margin-right:5px"></i>' + esc(c.title || c.key) + '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
              fieldRow('Título', 'me-sec-card-title__' + c.key, cTitle, false) +
              fieldRow('Descrição', 'me-sec-card-desc__' + c.key, cDesc, cDesc && cDesc.length > 60) +
            '</div>' +
          '</div>';
      });
      fieldsHtml += '</div>';
    } else if (cards.length > 6) {
      fieldsHtml += '' +
        '<div style="margin-top:16px;padding:10px 12px;background:var(--sa-bg-soft);border-radius:8px;font-size:12px;color:var(--sa-text-soft)">' +
          '<i class="fa-solid fa-circle-info" style="margin-right:6px;color:var(--sa-accent)"></i>' +
          'Esta seção tem ' + cards.length + ' cards — importe a página e edite-os pelo editor de Seções no banco.' +
        '</div>';
    }

    /* ── Modal HTML ── */
    var html = '' +
      '<div id="me-sec-editor-overlay" style="position:fixed;inset:0;z-index:9500;display:flex;align-items:flex-start;justify-content:center;background:rgba(0,0,0,.65);padding:16px;overflow-y:auto">' +
        '<div style="background:var(--sa-bg-card);border-radius:16px;padding:28px;width:min(640px,94vw);margin:auto 0;box-shadow:0 24px 80px rgba(0,0,0,.4)">' +

          /* Cabeçalho */
          '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:20px">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">' +
                '<h3 style="margin:0;font-size:16px">' + esc(secDef.name) + '</h3>' +
                typeBadge(secDef.type || 'custom') +
                (hasLocal ? '<span class="sa-pill sa-pill--draft" style="font-size:10px"><i class="fa-solid fa-floppy-disk"></i> editado localmente</span>' : '') +
              '</div>' +
              '<p style="margin:0;font-size:11px;color:var(--sa-text-soft)">' +
                '<i class="fa-solid fa-circle-info" style="margin-right:4px"></i>' +
                'Edição offline · salva em localStorage · sincronize com o banco depois' +
              '</p>' +
            '</div>' +
            '<button class="sa-btn sa-btn--ghost" id="me-sec-editor-x" style="padding:6px 10px;flex-shrink:0"><i class="fa-solid fa-xmark"></i></button>' +
          '</div>' +

          /* Corpo */
          '<div id="me-sec-editor-body">' + fieldsHtml + '</div>' +

          /* Rodapé */
          '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;padding-top:16px;margin-top:16px;border-top:1px solid var(--sa-line)">' +
            '<button class="sa-btn sa-btn--ghost" id="me-sec-editor-cancel">Cancelar</button>' +
            (hasLocal ? '<button class="sa-btn sa-btn--ghost" id="me-sec-editor-clear" style="color:#c0392b"><i class="fa-solid fa-trash"></i> Limpar edições</button>' : '') +
            '<button class="sa-btn sa-btn--primary" id="me-sec-editor-save"><i class="fa-solid fa-floppy-disk"></i> Salvar localmente</button>' +
          '</div>' +

        '</div>' +
      '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
    bindSectionEditor(secDef);
  }

  function collectSectionEditorData(secDef) {
    function getVal(id) {
      var el = document.getElementById(id);
      return el ? el.value : null;
    }

    var data = {};

    var titleEl = document.getElementById('me-sec-title');
    if (titleEl) data.title = titleEl.value;

    var subEl = document.getElementById('me-sec-subtitle');
    if (subEl) data.subtitle = subEl.value;

    var descEl = document.getElementById('me-sec-desc');
    if (descEl) data.description = descEl.value;

    var texts = secDef.texts || [];
    if (texts.length) {
      data.texts = {};
      texts.forEach(function (t) {
        var el = document.getElementById('me-sec-text__' + t.key);
        if (el) data.texts[t.key] = el.value;
      });
    }

    var buttons = secDef.buttons || [];
    if (buttons.length) {
      data.buttons = {};
      buttons.forEach(function (b) {
        var textEl = document.getElementById('me-sec-btn-text__' + b.key);
        var linkEl = document.getElementById('me-sec-btn-link__' + b.key);
        if (textEl || linkEl) {
          data.buttons[b.key] = {
            text: textEl ? textEl.value : b.text,
            link: linkEl ? linkEl.value : (b.link || '')
          };
        }
      });
    }

    var images = secDef.images || [];
    if (images.length) {
      data.images = {};
      images.forEach(function (img) {
        var el = document.getElementById('me-sec-img__' + img.key);
        if (el) data.images[img.key] = el.value;
      });
    }

    var cards = secDef.cards || [];
    if (cards.length > 0 && cards.length <= 6) {
      data.cards = {};
      cards.forEach(function (c) {
        var tEl = document.getElementById('me-sec-card-title__' + c.key);
        var dEl = document.getElementById('me-sec-card-desc__' + c.key);
        if (tEl || dEl) {
          data.cards[c.key] = {
            title:       tEl ? tEl.value : (c.title || ''),
            description: dEl ? dEl.value : (c.description || '')
          };
        }
      });
    }

    return data;
  }

  function bindSectionEditor(secDef) {
    var overlay = document.getElementById('me-sec-editor-overlay');
    if (!overlay) return;

    function closeEditor() {
      var el = document.getElementById('me-sec-editor-overlay');
      if (el) el.remove();
    }

    var xBtn      = document.getElementById('me-sec-editor-x');
    var cancelBtn = document.getElementById('me-sec-editor-cancel');
    var saveBtn   = document.getElementById('me-sec-editor-save');
    var clearBtn  = document.getElementById('me-sec-editor-clear');

    if (xBtn)      xBtn.addEventListener('click', closeEditor);
    if (cancelBtn) cancelBtn.addEventListener('click', closeEditor);

    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) closeEditor();
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (!confirm('Remover todas as edições locais desta seção?')) return;
        clearSecOverride(secDef.internal_name);
        store().toast('Edições locais removidas.', 'ok');
        closeEditor();
        renderPagesTab();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var data = collectSectionEditorData(secDef);
        saveSecOverride(secDef.internal_name, data);
        store().toast('Seção "' + secDef.name + '" salva localmente.', 'success', { ttl: 3000 });
        closeEditor();
        renderPagesTab();
      });
    }
  }

  /* ── Sincroniza overrides locais com o banco ─────────────────────── */
  async function syncLocalOverridesToDb(btn) {
    var all = loadAllOverrides();
    var keys = Object.keys(all);
    if (!keys.length) {
      store().toast('Nenhuma edição local para sincronizar.', 'info');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Sincronizando…'; }
    var imp = importer();
    var ok  = 0;
    var err = 0;

    for (var i = 0; i < keys.length; i++) {
      var overrideKey = keys[i];
      /* overrideKey = "sec__<internal_name>" */
      var internalName = overrideKey.replace(/^sec__/, '');
      var override = all[overrideKey];
      var secDef   = findSecDefByInternalName(internalName);

      if (!secDef || !imp) { err++; continue; }

      /* Sincroniza cada texto da seção para site_global_texts */
      var texts = secDef.texts || [];
      for (var j = 0; j < texts.length; j++) {
        var t = texts[j];
        var newVal = override.texts && override.texts[t.key] !== undefined
          ? override.texts[t.key]
          : t.value;
        try {
          await withTimeout(imp.importText(Object.assign({}, t, { value: newVal })), 8000);
          ok++;
        } catch (e) { err++; }
      }

      /* Sincroniza imagens como text overrides */
      var images = secDef.images || [];
      for (var k = 0; k < images.length; k++) {
        var img  = images[k];
        var url  = override.images && override.images[img.key] ? override.images[img.key] : '';
        if (!url) continue;
        try {
          await withTimeout(api().texts.upsert({
            text_key:    'manifest_media__' + img.key,
            value:       { url: url },
            area:        'media',
            description: img.where || img.key,
            status:      'active'
          }), 8000);
          ok++;
        } catch (e) { err++; }
      }
    }

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Sincronizar'; }

    if (err === 0) {
      store().toast('Sincronização concluída: ' + ok + ' itens enviados ao banco.', 'success', { ttl: 4000 });
    } else {
      store().toast('Sincronização parcial: ' + ok + ' ok, ' + err + ' com erro (verifique o login).', 'warning', { ttl: 5000 });
    }

    await loadDbTexts();
    renderPagesTab();
  }

  /* ── Bindings: tab Textos ────────────────────────────────────────── */
  function bindTextsTab(allTexts) {
    var content = document.getElementById('me-content');
    if (!content) return;

    var importTextsBtn = document.getElementById('me-import-texts');
    if (importTextsBtn) {
      importTextsBtn.addEventListener('click', async function () {
        importTextsBtn.disabled = true;
        importTextsBtn.querySelector('span').textContent = 'Salvando…';
        try {
          await importer().importAllTexts();
          store().toast('Todos os textos salvos no banco.', 'success');
          await loadDbTexts();
          renderTextsTab();
        } catch (e) {
          store().toast('Erro: ' + e.message, 'error');
        } finally {
          importTextsBtn.disabled = false;
          importTextsBtn.querySelector('span').textContent = 'Salvar todos no banco';
        }
      });
    }

    content.addEventListener('click', function (ev) {
      var editBtn = ev.target.closest('[data-me-edit-text]');
      if (!editBtn) return;
      var key = editBtn.getAttribute('data-me-edit-text');
      var textDef = allTexts.find(function (t) { return t.key === key; });
      if (!textDef) return;
      openTextModal(textDef);
    });

    bindTextModal(allTexts);
  }

  function openTextModal(textDef) {
    var modal    = document.getElementById('me-text-modal');
    var titleEl  = document.getElementById('me-text-modal-title');
    var keyEl    = document.getElementById('me-text-modal-key');
    var origEl   = document.getElementById('me-text-original');
    var newEl    = document.getElementById('me-text-new');
    if (!modal) return;

    var dbRow = st.dbTexts['manifest__' + textDef.key];
    var currentVal = (dbRow && dbRow.value && dbRow.value.pt) ? dbRow.value.pt : textDef.value;

    titleEl.textContent = textDef.label;
    keyEl.textContent   = 'Chave: manifest__' + textDef.key;
    origEl.value        = textDef.value;
    newEl.value         = currentVal;
    modal.hidden        = false;
    newEl.focus();
    st.editingText = textDef;
  }

  function bindTextModal(allTexts) {
    var modal     = document.getElementById('me-text-modal');
    var cancelBtn = document.getElementById('me-text-cancel');
    var saveBtn   = document.getElementById('me-text-save');
    if (!modal) return;

    cancelBtn.addEventListener('click', function () { modal.hidden = true; st.editingText = null; });
    modal.addEventListener('click', function (ev) { if (ev.target === modal) { modal.hidden = true; st.editingText = null; } });

    saveBtn.addEventListener('click', async function () {
      var newEl = document.getElementById('me-text-new');
      if (!st.editingText || !newEl) return;
      saveBtn.disabled = true;
      try {
        await importer().importText(Object.assign({}, st.editingText, { value: newEl.value.trim() }));
        store().toast('Texto salvo.', 'success');
        await loadDbTexts();
        modal.hidden = true;
        st.editingText = null;
        renderTextsTab();
      } catch (e) {
        store().toast('Erro: ' + e.message, 'error');
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  /* ── Bindings: tab Mídias ────────────────────────────────────────── */
  function bindMediaTab(allMedia) {
    var content = document.getElementById('me-content');
    if (!content) return;

    content.addEventListener('click', function (ev) {
      var replaceBtn = ev.target.closest('[data-me-replace-media]');
      if (!replaceBtn) return;
      var key = replaceBtn.getAttribute('data-me-replace-media');
      var mediaDef = allMedia.find(function (m) { return m.key === key; });
      if (!mediaDef) return;
      openMediaModal(mediaDef);
    });

    bindMediaModal(allMedia);
  }

  function openMediaModal(mediaDef) {
    var modal   = document.getElementById('me-media-modal');
    var titleEl = document.getElementById('me-media-modal-title');
    var subEl   = document.getElementById('me-media-modal-sub');
    var urlEl   = document.getElementById('me-media-url');
    if (!modal) return;

    titleEl.textContent = 'Substituir: ' + (mediaDef.name || mediaDef.key);
    subEl.textContent   = 'Aparece em: ' + (mediaDef.where || '—');
    urlEl.value         = mediaDef.url || '';
    modal.hidden        = false;
    urlEl.focus();
    modal._currentMedia = mediaDef;
  }

  function bindMediaModal(allMedia) {
    var modal     = document.getElementById('me-media-modal');
    var cancelBtn = document.getElementById('me-media-cancel');
    var saveBtn   = document.getElementById('me-media-save');
    if (!modal) return;

    cancelBtn.addEventListener('click', function () { modal.hidden = true; });
    modal.addEventListener('click', function (ev) { if (ev.target === modal) modal.hidden = true; });

    saveBtn.addEventListener('click', async function () {
      var urlEl = document.getElementById('me-media-url');
      var url   = urlEl ? urlEl.value.trim() : '';
      if (!url) { store().toast('Informe uma URL válida.', 'warning'); return; }

      var mediaDef = modal._currentMedia;
      if (!mediaDef) return;

      saveBtn.disabled = true;
      try {
        await api().texts.upsert({
          text_key:    'manifest_media__' + mediaDef.key,
          value:       { url: url },
          area:        'media',
          description: mediaDef.name || mediaDef.key,
          status:      'active'
        });
        store().toast('URL da mídia salva no banco.', 'success');
        modal.hidden = true;
      } catch (e) {
        store().toast('Erro: ' + e.message, 'error');
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  /* ── Bindings: tab Gráficos ──────────────────────────────────────── */
  function bindChartsTab() {
    var content = document.getElementById('me-content');
    if (!content) return;

    content.addEventListener('click', function (ev) {
      var dashBtn = ev.target.closest('[data-me-chart-dash]');
      if (dashBtn && router()) {
        router().go('dashboards', {});
      }
    });
  }

  /* ── Render principal ────────────────────────────────────────────── */
  async function render() {
    var main = document.getElementById('sa-view');
    if (!main) return;

    if (layout()) layout().setCrumbs([{ label: 'Editor Manual', strong: true }]);

    main.innerHTML = shell();
    bindTabs();

    setContent('<div class="sa-spinner" style="margin:40px auto"></div><p style="text-align:center;color:var(--sa-text-soft);margin-top:8px">Verificando banco de dados…</p>');

    await Promise.all([loadStatus(), loadDbTexts()]);

    renderTab();
    bindHeaderBtns();
  }

  /* ── Export ───────────────────────────────────────────────────────── */
  window.SA = window.SA || {};
  window.SA.views = window.SA.views || {};
  window.SA.views.manualEditor = { render: render };
})();
