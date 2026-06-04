/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · core/importer.js                                     ║
  ║  Importa páginas/seções/cards do manifest estático para o banco.   ║
  ║  Idempotente: nunca duplica. Checa por slug (pages) e internal_name ║
  ║  (sections) antes de inserir.                                       ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function api()      { return window.SA && window.SA.api; }
  function manifest() { return window.SA && window.SA.manifest; }

  /* ── Importa uma página inteira (página + seções + cards) ───────── */
  async function importPage(pageKey) {
    var m = manifest();
    if (!m) throw new Error('Manifest não carregado.');
    var pageDef = m.getPage(pageKey);
    if (!pageDef) throw new Error('Página "' + pageKey + '" não encontrada no manifest.');

    var a = api();

    /* Verifica se já existe pelo slug */
    var existing = await findPageBySlug(pageDef.slug);
    var page;

    if (existing) {
      page = existing;
    } else {
      page = await a.pages.create({
        area_type:       pageDef.area_type,
        slug:            pageDef.slug,
        title:           pageDef.title,
        seo_title:       pageDef.title,
        seo_description: pageDef.description || '',
        show_in_menu:    pageDef.area_type === 'site_publico',
        order_index:     pageDef.order_index || 99,
        draft_payload: {
          source:       'static_import',
          source_file:  pageDef.file,
          manifest_key: pageDef.key,
          imported_at:  new Date().toISOString()
        }
      });
    }

    /* Importa seções */
    /* Atualiza cache com o page recém-importado */
    try {
      var cached = loadStatusCache() || {};
      cached[pageDef.key] = { imported: true, page: page };
      saveStatusCache(cached);
    } catch (e) {}

    var results = { page: page, sections: [], cards: [], skipped: 0 };
    var existingSections = await a.sections.listByPage(page.id);
    var existingKeys = existingSections.map(function (s) { return s.internal_name; });

    for (var i = 0; i < (pageDef.sections || []).length; i++) {
      var secDef = pageDef.sections[i];
      var secResult = await importSection(page.id, secDef, existingKeys);
      results.sections.push(secResult.section);
      results.cards = results.cards.concat(secResult.cards);
      if (secResult.skipped) results.skipped++;
    }

    return results;
  }

  /* ── Importa uma seção (com cards) ──────────────────────────────── */
  async function importSection(pageId, secDef, existingKeys) {
    var a = api();
    existingKeys = existingKeys || [];

    if (existingKeys.indexOf(secDef.internal_name) >= 0) {
      return { section: { internal_name: secDef.internal_name, _exists: true }, cards: [], skipped: true };
    }

    var section = await a.sections.create({
      page_id:       pageId,
      internal_name: secDef.internal_name,
      type:          secDef.type || 'custom',
      title:         secDef.title || '',
      subtitle:      secDef.subtitle || '',
      description:   secDef.description || '',
      order_index:   secDef.order_index || 99,
      draft_payload: {
        source:       'static_import',
        manifest_key: secDef.key,
        buttons:      secDef.buttons  || [],
        images:       secDef.images   || [],
        texts:        secDef.texts    || [],
        imported_at:  new Date().toISOString()
      }
    });

    /* Importa cards da seção */
    var cards = [];
    for (var j = 0; j < (secDef.cards || []).length; j++) {
      var cardDef = secDef.cards[j];
      var card = await a.cards.create({
        section_id:  section.id,
        title:       cardDef.title       || '',
        subtitle:    cardDef.subtitle    || '',
        description: cardDef.description || '',
        icon:        cardDef.icon        || '',
        image_url:   cardDef.image_url   || '',
        button_text: cardDef.button_text || '',
        button_link: cardDef.button_link || '',
        order_index: j,
        draft_payload: { source: 'static_import', manifest_key: cardDef.key }
      });
      cards.push(card);
    }

    return { section: section, cards: cards, skipped: false };
  }

  /* ── Importa TODAS as páginas do manifest ────────────────────────── */
  async function importAll(onProgress) {
    var m = manifest();
    if (!m) throw new Error('Manifest não carregado.');
    var pages = m.pages || [];
    var results = [];

    for (var i = 0; i < pages.length; i++) {
      var pageDef = pages[i];
      if (typeof onProgress === 'function') {
        onProgress({ step: i + 1, total: pages.length, label: pageDef.title });
      }
      try {
        var r = await importPage(pageDef.key);
        results.push({ key: pageDef.key, success: true, result: r });
      } catch (e) {
        results.push({ key: pageDef.key, success: false, error: e.message });
      }
    }

    /* Importa textos globais */
    await importAllTexts();

    return results;
  }

  /* ── Importa textos do manifest → site_global_texts ─────────────── */
  async function importAllTexts() {
    var m = manifest();
    if (!m) return;
    var a = api();
    var allTexts = m.allTexts();

    for (var i = 0; i < allTexts.length; i++) {
      var t = allTexts[i];
      try {
        await a.texts.upsert({
          text_key:    'manifest__' + t.key,
          value:       { pt: t.value },
          area:        t.page_slug || 'geral',
          context:     t.section_name + ' — ' + t.label,
          description: t.label,
          status:      'active'
        });
      } catch (e) { /* continua mesmo se um falhar */ }
    }
  }

  /* ── Importa texto individual ────────────────────────────────────── */
  async function importText(textDef) {
    var a = api();
    return a.texts.upsert({
      text_key:    'manifest__' + textDef.key,
      value:       { pt: textDef.value },
      area:        textDef.page_slug || 'geral',
      context:     (textDef.section_name || '') + ' — ' + (textDef.label || ''),
      description: textDef.label || textDef.key,
      status:      'active'
    });
  }

  var STATUS_CACHE_KEY = 'sa_import_status_cache';

  function saveStatusCache(status) {
    try { localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(status)); } catch (e) {}
  }

  function loadStatusCache() {
    try {
      var raw = localStorage.getItem(STATUS_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /* ── Verifica quais páginas já estão importadas ──────────────────── */
  async function checkImportStatus() {
    var a = api();
    var m = manifest();
    if (!a || !m) return loadStatusCache() || {};

    try {
      var timeout = new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 7000); });
      var dbPages = await Promise.race([a.pages.list(), timeout]);
      var slugsInDb = {};
      dbPages.forEach(function (p) { slugsInDb[p.slug] = p; });

      var status = {};
      (m.pages || []).forEach(function (pageDef) {
        status[pageDef.key] = {
          imported: !!slugsInDb[pageDef.slug],
          page:     slugsInDb[pageDef.slug] || null
        };
      });

      saveStatusCache(status);
      return status;
    } catch (e) {
      /* Supabase indisponível — usa cache */
      return loadStatusCache() || {};
    }
  }

  /* ── Verifica quais seções de uma página já foram importadas ─────── */
  async function checkSectionStatus(pageId) {
    var a = api();
    var existing = await a.sections.listByPage(pageId);
    var keys = {};
    existing.forEach(function (s) { keys[s.internal_name] = s; });
    return keys;
  }

  /* ── Busca página no banco pelo slug ─────────────────────────────── */
  async function findPageBySlug(slug) {
    try {
      var sb = window.supabaseClient;
      if (!sb) return null;
      var res = await sb.from('site_pages')
        .select('*')
        .eq('slug', slug)
        .is('deleted_at', null)
        .maybeSingle();
      if (res.error || !res.data) return null;
      return res.data;
    } catch (e) { return null; }
  }

  /* ── Export ────────────────────────────────────────────────────────  */
  window.SA = window.SA || {};
  window.SA.importer = {
    importPage:         importPage,
    importSection:      importSection,
    importAll:          importAll,
    importAllTexts:     importAllTexts,
    importText:         importText,
    checkImportStatus:  checkImportStatus,
    checkSectionStatus: checkSectionStatus,
    findPageBySlug:     findPageBySlug
  };
})();
