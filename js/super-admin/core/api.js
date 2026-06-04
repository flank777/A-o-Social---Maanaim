/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  Super Admin · core/api.js                                          ║
  ║  Camada CRUD genérica sobre Supabase para as tabelas do painel.     ║
  ╚══════════════════════════════════════════════════════════════════════╝
  Premissas:
    • Toda escrita passa por aqui — facilita auditoria e rate limit local.
    • Soft delete: nunca usamos DELETE direto em entidades de conteúdo;
      chamamos a RPC super_admin_soft_delete.
    • Publicação: nunca tocamos published_payload direto; vai pela RPC
      super_admin_publish que também grava system_versions e log.
    • Leituras filtram deleted_at IS NULL.
*/
(function () {
  'use strict';

  function client() {
    if (!window.supabaseClient) throw new Error('Supabase não inicializado.');
    return window.supabaseClient;
  }

  /* ── Helpers ───────────────────────────────────────────────────── */
  async function _select(table, query) {
    var sb = client();
    var q = sb.from(table).select(query.select || '*');

    if (query.eq)         Object.keys(query.eq).forEach(function (k) { q = q.eq(k, query.eq[k]); });
    if (query.neq)        Object.keys(query.neq).forEach(function (k) { q = q.neq(k, query.neq[k]); });
    if (query.in)         Object.keys(query.in).forEach(function (k) { q = q.in(k, query.in[k]); });
    if (query.notDeleted !== false) q = q.is('deleted_at', null);
    if (query.order)      q = q.order(query.order.column, { ascending: query.order.ascending !== false });
    if (query.limit)      q = q.limit(query.limit);

    var res = await q;
    if (res.error) throw new Error(res.error.message);
    return res.data || [];
  }

  async function _insert(table, payload) {
    var sb = client();
    var res = await sb.from(table).insert([payload]).select().single();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  }

  async function _update(table, id, partial) {
    var sb = client();
    var res = await sb.from(table).update(partial).eq('id', id).select().single();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  }

  /* ── Páginas ───────────────────────────────────────────────────── */
  var pages = {
    list: function (areaType) {
      return _select('site_pages', {
        eq: areaType ? { area_type: areaType } : null,
        order: { column: 'order_index', ascending: true }
      });
    },
    get: async function (id) {
      var rows = await _select('site_pages', { eq: { id: id }, limit: 1 });
      return rows[0] || null;
    },
    create: function (data) {
      var payload = {
        area_type:       data.area_type || 'site_publico',
        slug:            data.slug,
        title:           data.title,
        seo_title:       data.seo_title || '',
        seo_description: data.seo_description || '',
        show_in_menu:    data.show_in_menu !== false,
        order_index:     typeof data.order_index === 'number' ? data.order_index : 9999,
        status:          'draft',
        draft_payload:   data.draft_payload || {}
      };
      return _insert('site_pages', payload);
    },
    update: function (id, partial) {
      // Whitelist de campos atualizáveis pelo painel
      var allowed = ['title','slug','seo_title','seo_description','show_in_menu',
                     'order_index','status','draft_payload','cover_url',
                     'desktop_settings','tablet_settings','mobile_settings','area_type'];
      var clean = {};
      allowed.forEach(function (k) { if (partial[k] !== undefined) clean[k] = partial[k]; });
      return _update('site_pages', id, clean);
    },
    softDelete: function (id) {
      return rpc('super_admin_soft_delete', { p_entity_type: 'site_pages', p_entity_id: id });
    },
    reorder: function (orders) {
      // orders = [{ id, order_index }]
      return rpc('super_admin_reorder', {
        p_entity_type: 'site_pages',
        p_orders: orders
      });
    }
  };

  /* ── Seções ────────────────────────────────────────────────────── */
  var sections = {
    listByPage: function (pageId) {
      return _select('site_sections', {
        eq: { page_id: pageId },
        order: { column: 'order_index', ascending: true }
      });
    },
    create: function (data) {
      return _insert('site_sections', {
        page_id:       data.page_id,
        internal_name: data.internal_name || 'secao',
        type:          data.type || 'custom',
        title:         data.title || '',
        subtitle:      data.subtitle || '',
        description:   data.description || '',
        layout:        data.layout || 'default',
        status:        'draft',
        draft_payload: data.draft_payload || {},
        order_index:   typeof data.order_index === 'number' ? data.order_index : 9999
      });
    },
    update: function (id, partial) {
      var allowed = ['internal_name','type','title','subtitle','description','layout',
                     'status','draft_payload','order_index','visible',
                     'desktop_settings','tablet_settings','mobile_settings'];
      var clean = {};
      allowed.forEach(function (k) { if (partial[k] !== undefined) clean[k] = partial[k]; });
      return _update('site_sections', id, clean);
    },
    softDelete: function (id) {
      return rpc('super_admin_soft_delete', { p_entity_type: 'site_sections', p_entity_id: id });
    },
    reorder: function (orders) {
      return rpc('super_admin_reorder', { p_entity_type: 'site_sections', p_orders: orders });
    }
  };

  /* ── Cards ─────────────────────────────────────────────────────── */
  var cards = {
    listBySection: function (sectionId) {
      return _select('site_cards', {
        eq: { section_id: sectionId },
        order: { column: 'order_index', ascending: true }
      });
    },
    create: function (data) {
      return _insert('site_cards', {
        section_id:    data.section_id,
        title:         data.title || '',
        subtitle:      data.subtitle || '',
        description:   data.description || '',
        image_url:     data.image_url || '',
        video_url:     data.video_url || '',
        icon:          data.icon || '',
        button_text:   data.button_text || '',
        button_link:   data.button_link || '',
        status:        'draft',
        draft_payload: data.draft_payload || {},
        order_index:   typeof data.order_index === 'number' ? data.order_index : 9999
      });
    },
    update: function (id, partial) {
      var allowed = ['title','subtitle','description','image_url','video_url','icon',
                     'button_text','button_link','status','draft_payload','order_index',
                     'visible','desktop_settings','tablet_settings','mobile_settings'];
      var clean = {};
      allowed.forEach(function (k) { if (partial[k] !== undefined) clean[k] = partial[k]; });
      return _update('site_cards', id, clean);
    },
    softDelete: function (id) {
      return rpc('super_admin_soft_delete', { p_entity_type: 'site_cards', p_entity_id: id });
    },
    reorder: function (orders) {
      return rpc('super_admin_reorder', { p_entity_type: 'site_cards', p_orders: orders });
    }
  };

  /* ── Versões + logs ────────────────────────────────────────────── */
  var versions = {
    listFor: function (entityType, entityId) {
      return _select('system_versions', {
        eq: { entity_type: entityType, entity_id: entityId },
        order: { column: 'version_no', ascending: false },
        notDeleted: false
      });
    }
  };

  var logs = {
    list: function (opts) {
      opts = opts || {};
      return _select('system_change_logs', {
        eq: opts.entity_type ? { entity_type: opts.entity_type } : null,
        order: { column: 'created_at', ascending: false },
        limit: opts.limit || 50,
        notDeleted: false
      });
    }
  };

  /* ── Mídia ─────────────────────────────────────────────────────── */
  var media = {
    list: function (opts) {
      opts = opts || {};
      var query = {
        order: { column: 'created_at', ascending: false },
        limit: opts.limit || 200
      };
      var eq = {};
      if (opts.kind)     eq.kind     = opts.kind;
      if (opts.category) eq.category = opts.category;
      if (opts.status)   eq.status   = opts.status;
      if (Object.keys(eq).length) query.eq = eq;
      return _select('site_media', query);
    },
    create: function (data) {
      var payload = {
        url:          data.url,
        storage_path: data.storage_path || '',
        kind:         data.kind         || 'image',
        category:     data.category     || 'geral',
        alt:          data.alt          || '',
        description:  data.description  || '',
        width:        data.width        || null,
        height:       data.height       || null,
        size_bytes:   data.size_bytes   || null,
        mime:         data.mime         || '',
        order_index:  typeof data.order_index === 'number' ? data.order_index : 0
      };
      return _insert('site_media', payload);
    },
    update: function (id, partial) {
      var allowed = ['url','kind','category','alt','description','width','height','status','order_index'];
      var clean = {};
      allowed.forEach(function (k) { if (partial[k] !== undefined) clean[k] = partial[k]; });
      return _update('site_media', id, clean);
    },
    softDelete: function (id) {
      return rpc('super_admin_media_soft_delete', { p_id: id });
    },

    // Faz upload de um File para o bucket "super-admin" e retorna URL pública
    upload: async function (file, opts) {
      opts = opts || {};
      var sb = client();
      var ext = (file.name || '').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
      // path: <kind>/<yyyy>/<mm>/<uuid-ish>.<ext>
      var d = new Date();
      var yyyy = d.getFullYear();
      var mm   = String(d.getMonth() + 1).padStart(2, '0');
      var rnd  = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      var path = (opts.kind || 'image') + '/' + yyyy + '/' + mm + '/' + rnd + '.' + ext;

      var up = await sb.storage.from('super-admin').upload(path, file, { upsert: false, cacheControl: '31536000' });
      if (up.error) throw new Error('Upload falhou: ' + up.error.message);

      var pub = sb.storage.from('super-admin').getPublicUrl(path);
      var url = pub && pub.data && pub.data.publicUrl;
      if (!url) throw new Error('Não foi possível gerar URL pública.');

      // Lê dimensões se for imagem
      var dims = await readImageDimensions(file).catch(function () { return null; });

      return media.create({
        url: url,
        storage_path: path,
        kind:         opts.kind || (file.type && file.type.indexOf('video/') === 0 ? 'video' : 'image'),
        category:     opts.category || 'geral',
        alt:          opts.alt || '',
        description:  opts.description || '',
        mime:         file.type || '',
        size_bytes:   file.size || null,
        width:        dims ? dims.width  : null,
        height:       dims ? dims.height : null
      });
    }
  };

  function readImageDimensions(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) return resolve(null);
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload  = function () { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
      img.src = url;
    });
  }

  /* ── Forms ─────────────────────────────────────────────────────── */
  var forms = {
    list: function () {
      return _select('site_forms', { order: { column: 'created_at', ascending: false } });
    },
    get: async function (id) {
      var rows = await _select('site_forms', { eq: { id: id }, limit: 1 });
      return rows[0] || null;
    },
    create: function (data) {
      return _insert('site_forms', {
        internal_key:    data.internal_key,
        title:           data.title,
        description:     data.description     || '',
        submit_label:    data.submit_label    || 'Enviar',
        success_message: data.success_message || 'Recebido!',
        notify_emails:   data.notify_emails   || '',
        whatsapp_template: data.whatsapp_template || '',
        status:          'draft'
      });
    },
    update: function (id, partial) {
      var allowed = ['title','description','submit_label','success_message','notify_emails',
                     'whatsapp_template','status','draft_payload','internal_key'];
      var clean = {};
      allowed.forEach(function (k) { if (partial[k] !== undefined) clean[k] = partial[k]; });
      return _update('site_forms', id, clean);
    },
    softDelete: function (id) {
      return rpc('super_admin_soft_delete_generic', { p_entity_type: 'site_forms', p_entity_id: id })
        .catch(function () {
          // Fallback: soft delete client-side (RPC genérica não existe, usamos update)
          return _update('site_forms', id, { deleted_at: new Date().toISOString() });
        });
    },
    publish: function (id) {
      return rpc('super_admin_publish', { p_entity_type: 'site_forms', p_entity_id: id, p_notes: 'Form publicado' });
    },

    fields: {
      listByForm: function (formId) {
        return _select('site_form_fields', {
          eq: { form_id: formId },
          order: { column: 'order_index', ascending: true }
        });
      },
      create: function (data) {
        return _insert('site_form_fields', {
          form_id:     data.form_id,
          field_key:   data.field_key,
          field_type:  data.field_type || 'text',
          label:       data.label,
          placeholder: data.placeholder || '',
          help_text:   data.help_text || '',
          required:    !!data.required,
          options:     data.options || [],
          validation:  data.validation || {},
          order_index: typeof data.order_index === 'number' ? data.order_index : 9999
        });
      },
      update: function (id, partial) {
        var allowed = ['field_key','field_type','label','placeholder','help_text',
                       'required','options','validation','order_index'];
        var clean = {};
        allowed.forEach(function (k) { if (partial[k] !== undefined) clean[k] = partial[k]; });
        return _update('site_form_fields', id, clean);
      },
      remove: async function (id) {
        var sb = client();
        var res = await sb.from('site_form_fields').delete().eq('id', id);
        if (res.error) throw new Error(res.error.message);
        return true;
      },
      reorder: function (formId, orders) {
        return rpc('super_admin_form_field_reorder', { p_form_id: formId, p_orders: orders });
      }
    },

    submissions: {
      listByForm: function (formId, opts) {
        opts = opts || {};
        var query = {
          eq: { form_id: formId },
          order: { column: 'created_at', ascending: false },
          limit: opts.limit || 100,
          notDeleted: false
        };
        return _select('site_form_submissions', query);
      },
      updateStatus: function (id, status) {
        var partial = { status: status };
        if (status === 'read')     partial.read_at     = new Date().toISOString();
        if (status === 'answered') partial.answered_at = new Date().toISOString();
        return _update('site_form_submissions', id, partial);
      }
    }
  };

  // Soft delete fallback para forms (a RPC genérica não existe — usamos update)
  forms.softDelete = async function (id) {
    var sb = client();
    var res = await sb.from('site_forms').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (res.error) throw new Error(res.error.message);
    return true;
  };

  /* ── Widgets (Dashboards) ──────────────────────────────────────── */
  var widgets = {
    listByPage: function (pageId) {
      return _select('admin_widgets', {
        eq: { page_id: pageId },
        order: { column: 'order_index', ascending: true }
      });
    },
    get: async function (id) {
      var rows = await _select('admin_widgets', { eq: { id: id }, limit: 1 });
      return rows[0] || null;
    },
    create: function (data) {
      return _insert('admin_widgets', {
        page_id:  data.page_id,
        type:     data.type     || 'kpi',
        title:    data.title    || '',
        subtitle: data.subtitle || '',
        config:   data.config   || {},
        status:   'draft',
        span_w:   data.span_w   || 1,
        span_h:   data.span_h   || 1,
        height_desktop: data.height_desktop || null,
        height_tablet:  data.height_tablet  || null,
        height_mobile:  data.height_mobile  || null,
        order_index:    typeof data.order_index === 'number' ? data.order_index : 9999
      });
    },
    update: function (id, partial) {
      var allowed = ['type','title','subtitle','config','status','draft_payload',
                     'span_w','span_h','height_desktop','height_tablet','height_mobile',
                     'order_index','visible'];
      var clean = {};
      allowed.forEach(function (k) { if (partial[k] !== undefined) clean[k] = partial[k]; });
      return _update('admin_widgets', id, clean);
    },
    softDelete: function (id) {
      return rpc('super_admin_widget_soft_delete', { p_id: id });
    },
    reorder: function (pageId, orders) {
      return rpc('super_admin_widget_reorder', { p_page_id: pageId, p_orders: orders });
    },
    publish: function (id) {
      return rpc('super_admin_publish', { p_entity_type: 'admin_widgets', p_entity_id: id, p_notes: 'Widget publicado' });
    }
  };

  /* ── Presets de estilo (animação/efeito/3D/transição/bg/texto) ─── */
  var presets = {
    list: async function (opts) {
      opts = opts || {};
      var sb = client();
      var page = Math.max(1, opts.page || 1);
      var perPage = opts.perPage || 24;
      var from = (page - 1) * perPage;
      var to   = from + perPage - 1;
      var q = sb.from('site_style_presets').select('*', { count: 'exact' }).neq('status','inactive');
      if (opts.preset_type) q = q.eq('preset_type', opts.preset_type);
      if (opts.level)       q = q.eq('level', opts.level);
      if (opts.category)    q = q.eq('category', opts.category);
      if (opts.q)           q = q.ilike('preset_name', '%' + opts.q + '%');
      q = q.order('order_index', { ascending: true }).order('preset_name', { ascending: true }).range(from, to);
      var r = await q;
      if (r.error) throw new Error(r.error.message);
      return { items: r.data || [], total: r.count || 0, page: page, perPage: perPage };
    },
    get: async function (id) {
      var rows = await _select('site_style_presets', { eq: { id: id }, limit: 1, notDeleted: false });
      return rows[0] || null;
    },
    create: function (data) {
      return _insert('site_style_presets', {
        preset_key:   data.preset_key,
        preset_name:  data.preset_name,
        preset_type:  data.preset_type || 'animation',
        level:        data.level       || 'iniciante',
        category:     data.category    || 'geral',
        css:          data.css         || '',
        description:  data.description || '',
        config:       data.config      || {},
        order_index:  typeof data.order_index === 'number' ? data.order_index : 9999
      });
    },
    update: function (id, partial) {
      var allowed = ['preset_name','preset_type','level','category','css','description','status','order_index','config'];
      var clean = {};
      allowed.forEach(function (k) { if (partial[k] !== undefined) clean[k] = partial[k]; });
      return _update('site_style_presets', id, clean);
    },
    remove: async function (id) {
      // Built-in preset não pode ser excluído (apenas inativado)
      var p = await presets.get(id);
      if (!p) return false;
      if (p.built_in) {
        return presets.update(id, { status: 'inactive' });
      }
      var sb = client();
      var r = await sb.from('site_style_presets').delete().eq('id', id);
      if (r.error) throw new Error(r.error.message);
      return true;
    }
  };

  /* ── Loading pages ─────────────────────────────────────────────── */
  var loadingPages = {
    listAll: function () {
      return _select('site_loading_pages', { order: { column: 'internal_key', ascending: true }, notDeleted: false });
    },
    get: async function (key) {
      var sb = client();
      var r = await sb.from('site_loading_pages').select('*').eq('internal_key', key || 'default').single();
      if (r.error) {
        if (r.error.code === 'PGRST116') return null; // nenhuma linha
        throw new Error(r.error.message);
      }
      return r.data;
    },
    upsertDefault: async function (data) {
      var sb = client();
      var allowed = ['title','subtitle','logo_url','background_color','text_color','accent_color',
                     'show_ring','show_progress','min_duration_ms','max_duration_ms','messages','status'];
      var clean = { internal_key: data.internal_key || 'default' };
      allowed.forEach(function (k) { if (data[k] !== undefined) clean[k] = data[k]; });
      var r = await sb.from('site_loading_pages').upsert(clean, { onConflict: 'internal_key' }).select().single();
      if (r.error) throw new Error(r.error.message);
      return r.data;
    }
  };

  /* ── Fontes ────────────────────────────────────────────────────── */
  var fonts = {
    list: async function (opts) {
      opts = opts || {};
      var sb = client();
      var page = Math.max(1, opts.page || 1);
      var perPage = opts.perPage || 24;
      var from = (page - 1) * perPage, to = from + perPage - 1;
      var q = sb.from('site_fonts').select('*', { count: 'exact' }).neq('status','inactive');
      if (opts.category) q = q.eq('category', opts.category);
      if (opts.level)    q = q.eq('level', opts.level);
      if (opts.q)        q = q.ilike('family', '%' + opts.q + '%');
      q = q.order('order_index', { ascending: true }).range(from, to);
      var r = await q;
      if (r.error) throw new Error(r.error.message);
      return { items: r.data || [], total: r.count || 0, page: page, perPage: perPage };
    },
    create: function (d) {
      return _insert('site_fonts', {
        font_key: d.font_key, family: d.family, import_url: d.import_url,
        category: d.category || 'sans-serif', level: d.level || 'iniciante',
        weights: d.weights || [400,700],
        preview_text: d.preview_text || 'A solidariedade transforma vidas.',
        order_index: d.order_index || 9999
      });
    },
    update: function (id, partial) {
      var allowed = ['family','import_url','category','level','weights','preview_text','status','order_index'];
      var clean = {};
      allowed.forEach(function (k) { if (partial[k] !== undefined) clean[k] = partial[k]; });
      return _update('site_fonts', id, clean);
    },
    remove: async function (id) {
      var rows = await _select('site_fonts', { eq: { id: id }, limit: 1, notDeleted: false });
      var f = rows[0];
      if (!f) return false;
      if (f.built_in) return fonts.update(id, { status: 'inactive' });
      var sb = client();
      var r = await sb.from('site_fonts').delete().eq('id', id);
      if (r.error) throw new Error(r.error.message);
      return true;
    }
  };

  /* ── Paletas ───────────────────────────────────────────────────── */
  var palettes = {
    list: function () {
      return _select('site_color_palettes', { order: { column: 'order_index', ascending: true }, notDeleted: false });
    },
    get: async function (key) {
      var sb = client();
      var r = await sb.from('site_color_palettes').select('*').eq('palette_key', key).single();
      if (r.error) return null;
      return r.data;
    },
    create: function (d) {
      return _insert('site_color_palettes', {
        palette_key: d.palette_key, name: d.name, description: d.description || '',
        tokens: d.tokens || {}, is_default: !!d.is_default, order_index: d.order_index || 9999
      });
    },
    update: function (id, partial) {
      var allowed = ['name','description','tokens','is_default','status','order_index'];
      var clean = {};
      allowed.forEach(function (k) { if (partial[k] !== undefined) clean[k] = partial[k]; });
      return _update('site_color_palettes', id, clean);
    },
    setDefault: async function (id) {
      var sb = client();
      var r1 = await sb.from('site_color_palettes').update({ is_default: false }).eq('is_default', true);
      if (r1.error) throw new Error(r1.error.message);
      return _update('site_color_palettes', id, { is_default: true });
    },
    remove: async function (id) {
      var rows = await _select('site_color_palettes', { eq: { id: id }, limit: 1, notDeleted: false });
      var p = rows[0];
      if (!p) return false;
      if (p.built_in) return palettes.update(id, { status: 'inactive' });
      var sb = client();
      var r = await sb.from('site_color_palettes').delete().eq('id', id);
      if (r.error) throw new Error(r.error.message);
      return true;
    }
  };

  /* ── Textos globais ────────────────────────────────────────────── */
  var texts = {
    list: function (opts) {
      opts = opts || {};
      return _select('site_global_texts', {
        eq: opts.area ? { area: opts.area } : null,
        order: { column: 'text_key', ascending: true },
        limit: opts.limit || 500,
        notDeleted: false
      });
    },
    get: async function (key) {
      var rows = await _select('site_global_texts', { eq: { text_key: key }, limit: 1, notDeleted: false });
      return rows[0] || null;
    },
    upsert: async function (d) {
      var sb = client();
      var payload = {
        text_key: d.text_key, value: d.value || {}, area: d.area || 'geral',
        context: d.context || '', description: d.description || '',
        status: d.status || 'active'
      };
      var r = await sb.from('site_global_texts').upsert(payload, { onConflict: 'text_key' }).select().single();
      if (r.error) throw new Error(r.error.message);
      return r.data;
    },
    remove: async function (id) {
      var sb = client();
      var r = await sb.from('site_global_texts').delete().eq('id', id);
      if (r.error) throw new Error(r.error.message);
      return true;
    }
  };

  /* ── Recibos ───────────────────────────────────────────────────── */
  var receipts = {
    listAll: function () {
      return _select('site_receipt_templates', { order: { column: 'updated_at', ascending: false }, notDeleted: false });
    },
    get: async function (key) {
      var sb = client();
      var r = await sb.from('site_receipt_templates').select('*').eq('template_key', key || 'default').single();
      if (r.error) {
        if (r.error.code === 'PGRST116') return null;
        throw new Error(r.error.message);
      }
      return r.data;
    },
    upsertDefault: async function (d) {
      var sb = client();
      var allowed = ['name','org_name','org_subtitle','logo_left_url','logo_right_url',
                     'receipt_title','protocol_prefix','thanks_message','signature_label',
                     'footer_text','show_fields','required_fields','primary_color','font_family','status'];
      var clean = { template_key: d.template_key || 'default' };
      allowed.forEach(function (k) { if (d[k] !== undefined) clean[k] = d[k]; });
      if (!clean.name) clean.name = 'Padrão';
      var r = await sb.from('site_receipt_templates').upsert(clean, { onConflict: 'template_key' }).select().single();
      if (r.error) throw new Error(r.error.message);
      return r.data;
    }
  };

  /* ── Comprovantes (config singleton em `configuracao`) ─────────── */
  var proofs = {
    KEYS: ['proof_pix_key','proof_whatsapp_text','proof_intro','proof_pending_msg','proof_approved_msg','proof_rejected_msg','proof_btn_label','proof_max_size_mb'],
    getAll: async function () {
      var sb = client();
      var r = await sb.from('configuracao').select('chave,valor').in('chave', proofs.KEYS);
      if (r.error) throw new Error(r.error.message);
      var out = {};
      (r.data || []).forEach(function (row) { out[row.chave] = row.valor; });
      proofs.KEYS.forEach(function (k) { if (out[k] === undefined) out[k] = ''; });
      return out;
    },
    saveAll: async function (kv) {
      var sb = client();
      var rows = Object.keys(kv).filter(function (k) { return proofs.KEYS.indexOf(k) >= 0; }).map(function (k) {
        return { chave: k, valor: String(kv[k] == null ? '' : kv[k]), updated_at: new Date().toISOString() };
      });
      if (!rows.length) return true;
      var r = await sb.from('configuracao').upsert(rows, { onConflict: 'chave' });
      if (r.error) throw new Error(r.error.message);
      return true;
    }
  };

  /* ── Agente Dona Assunção ──────────────────────────────────────── */
  var agent = {
    categories: {
      list: function () {
        return _select('agent_categories', { order: { column: 'order_index', ascending: true }, notDeleted: false });
      },
      upsert: async function (d) {
        var sb = client();
        var payload = { category_key: d.category_key, name: d.name, description: d.description || '', icon: d.icon || 'fa-folder', order_index: d.order_index || 9999 };
        var r = await sb.from('agent_categories').upsert(payload, { onConflict: 'category_key' }).select().single();
        if (r.error) throw new Error(r.error.message);
        return r.data;
      },
      remove: async function (id) {
        var sb = client();
        var r = await sb.from('agent_categories').delete().eq('id', id);
        if (r.error) throw new Error(r.error.message);
        return true;
      }
    },

    knowledge: {
      list: async function (opts) {
        opts = opts || {};
        var sb = client();
        var page = Math.max(1, opts.page || 1);
        var perPage = opts.perPage || 50;
        var from = (page - 1) * perPage, to = from + perPage - 1;
        var q = sb.from('agent_knowledge').select('*', { count: 'exact' }).is('deleted_at', null);
        if (opts.status)       q = q.eq('status', opts.status);
        if (opts.category_id)  q = q.eq('category_id', opts.category_id);
        if (opts.category_key) q = q.eq('category_key', opts.category_key);
        if (opts.q)            q = q.or('title.ilike.%' + opts.q + '%,content.ilike.%' + opts.q + '%');
        q = q.order('priority', { ascending: false }).order('updated_at', { ascending: false }).range(from, to);
        var r = await q;
        if (r.error) throw new Error(r.error.message);
        return { items: r.data || [], total: r.count || 0, page: page, perPage: perPage };
      },
      get: async function (id) {
        var rows = await _select('agent_knowledge', { eq: { id: id }, limit: 1 });
        return rows[0] || null;
      },
      create: function (d) {
        return _insert('agent_knowledge', {
          category_id:  d.category_id || null,
          category_key: d.category_key || null,
          title:        d.title,
          content:      d.content,
          keywords:     Array.isArray(d.keywords) ? d.keywords : [],
          priority:     Math.max(1, Math.min(100, d.priority || 50)),
          source:       d.source || '',
          status:       d.status || 'active'
        });
      },
      update: function (id, partial) {
        var allowed = ['category_id','category_key','title','content','keywords','priority','source','status'];
        var clean = {};
        allowed.forEach(function (k) { if (partial[k] !== undefined) clean[k] = partial[k]; });
        if (clean.priority !== undefined) clean.priority = Math.max(1, Math.min(100, clean.priority));
        return _update('agent_knowledge', id, clean);
      },
      softDelete: async function (id) {
        var sb = client();
        var r = await sb.from('agent_knowledge').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if (r.error) throw new Error(r.error.message);
        return true;
      },

      // Matching local — simples e determinístico (sem LLM externa).
      // Pontua cada knowledge por palavras-chave + termos do título/conteúdo,
      // pondera pela `priority` e devolve o melhor item (ou null se score < threshold).
      match: async function (query, opts) {
        opts = opts || {};
        var sb = client();
        var r = await sb.from('agent_knowledge').select('*').eq('status', 'active').is('deleted_at', null);
        if (r.error) throw new Error(r.error.message);
        var rows = r.data || [];
        var q = String(query || '').toLowerCase();
        if (!q) return null;
        var qTokens = q.split(/[^a-z0-9á-úà-ùâ-ûä-üã-õç]+/i).filter(function (t) { return t.length >= 3; });

        var best = null;
        var bestScore = 0;
        rows.forEach(function (k) {
          var score = 0;
          var kw = (k.keywords || []).map(function (s) { return String(s).toLowerCase(); });
          // +5 por keyword exata
          kw.forEach(function (w) { if (q.indexOf(w) >= 0) score += 5; });
          // +2 por token do query batido em título
          var title   = String(k.title   || '').toLowerCase();
          var content = String(k.content || '').toLowerCase();
          qTokens.forEach(function (t) {
            if (title.indexOf(t)   >= 0) score += 2;
            if (content.indexOf(t) >= 0) score += 1;
          });
          // Multiplica por (priority/100) — prioriza itens mais relevantes
          score = score * (k.priority / 100 + 0.5);
          if (score > bestScore) { bestScore = score; best = k; }
        });
        var threshold = opts.threshold || 3;
        if (!best || bestScore < threshold) return null;
        return { knowledge: best, score: bestScore };
      }
    },

    settings: {
      get: async function (key) {
        var sb = client();
        var r = await sb.from('agent_settings').select('*').eq('internal_key', key || 'default').single();
        if (r.error) {
          if (r.error.code === 'PGRST116') return null;
          throw new Error(r.error.message);
        }
        return r.data;
      },
      upsertDefault: async function (d) {
        var sb = client();
        var allowed = ['display_name','avatar_url','tone','greeting','fallback_message','human_handoff','instructions','limits','active'];
        var clean = { internal_key: d.internal_key || 'default' };
        allowed.forEach(function (k) { if (d[k] !== undefined) clean[k] = d[k]; });
        var r = await sb.from('agent_settings').upsert(clean, { onConflict: 'internal_key' }).select().single();
        if (r.error) throw new Error(r.error.message);
        return r.data;
      }
    },

    unanswered: {
      list: function (opts) {
        opts = opts || {};
        return _select('agent_unanswered', {
          eq: opts.status ? { status: opts.status } : null,
          order: { column: 'created_at', ascending: false },
          limit: opts.limit || 100,
          notDeleted: false
        });
      },
      log: async function (question, context, source) {
        var sb = client();
        var r = await sb.from('agent_unanswered').insert([{
          question: String(question || ''),
          context:  String(context  || ''),
          source:   source || 'site'
        }]);
        if (r.error) throw new Error(r.error.message);
        return true;
      },
      updateStatus: async function (id, status, kn_id) {
        var partial = { status: status };
        if (status !== 'new') partial.reviewed_at = new Date().toISOString();
        if (kn_id) partial.resolved_kn_id = kn_id;
        return _update('agent_unanswered', id, partial);
      }
    }
  };

  /* ── Comandos seguros ──────────────────────────────────────────── */
  var commands = {
    list: function (opts) {
      opts = opts || {};
      return _select('system_commands', {
        eq: opts.action_type ? { action_type: opts.action_type } : null,
        order: { column: 'order_index', ascending: true },
        notDeleted: false
      });
    },
    get: async function (id) {
      var rows = await _select('system_commands', { eq: { id: id }, limit: 1, notDeleted: false });
      return rows[0] || null;
    },
    upsert: async function (d) {
      var sb = client();
      var allowed = ['command_key','name','description','action_type','payload','trigger_type',
                     'conditions','success_message','error_message','required_role','status','order_index'];
      var clean = {};
      allowed.forEach(function (k) { if (d[k] !== undefined) clean[k] = d[k]; });
      if (!clean.command_key) throw new Error('command_key é obrigatório');
      var r = await sb.from('system_commands').upsert(clean, { onConflict: 'command_key' }).select().single();
      if (r.error) throw new Error(r.error.message);
      return r.data;
    },
    update: function (id, partial) {
      var allowed = ['name','description','payload','trigger_type','conditions','success_message','error_message','required_role','status','order_index'];
      var clean = {};
      allowed.forEach(function (k) { if (partial[k] !== undefined) clean[k] = partial[k]; });
      return _update('system_commands', id, clean);
    },
    remove: async function (id) {
      var rows = await _select('system_commands', { eq: { id: id }, limit: 1, notDeleted: false });
      var c = rows[0];
      if (!c) return false;
      if (c.built_in) return commands.update(id, { status: 'disabled' });
      var sb = client();
      var r = await sb.from('system_commands').delete().eq('id', id);
      if (r.error) throw new Error(r.error.message);
      return true;
    },
    logs: function (opts) {
      opts = opts || {};
      return _select('system_command_logs', {
        eq: opts.command_key ? { command_key: opts.command_key } : null,
        order: { column: 'created_at', ascending: false },
        limit: opts.limit || 100,
        notDeleted: false
      });
    }
  };

  /* ── RPCs ──────────────────────────────────────────────────────── */
  async function rpc(name, args) {
    var sb = client();
    var res = await sb.rpc(name, args);
    if (res.error) throw new Error(res.error.message);
    return res.data;
  }

  /* ── Export ────────────────────────────────────────────────────── */
  window.SA = window.SA || {};
  window.SA.api = {
    pages:    pages,
    sections: sections,
    cards:    cards,
    media:    media,
    forms:    forms,
    widgets:  widgets,
    presets:      presets,
    loadingPages: loadingPages,
    fonts:        fonts,
    palettes:     palettes,
    texts:        texts,
    receipts:     receipts,
    proofs:       proofs,
    agent:        agent,
    commands:     commands,
    versions: versions,
    logs:     logs,
    rpc:      rpc
  };
})();
