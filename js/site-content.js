/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  DoaVida — js/site-content.js                                       ║
  ║  Renderizador dinâmico do site público.                             ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  USO (no site público — totalmente OPT-IN):                         ║
  ║                                                                      ║
  ║    <div data-sa-page="index"> ║
  ║      <!-- Conteúdo estático que serve de FALLBACK. --> ║
  ║      <!-- Se o renderizador conseguir buscar do banco, ele substitui--> ║    </div> ║
  ║    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> ║    <script src="js/services/supabase.js"></script> ║
  ║    <script src="js/site-content.js"></script> ║
  ║                                                                      ║
  ║  Comportamento:                                                      ║
  ║   • Se Supabase responde com seções publicadas, renderiza dentro    ║
  ║     do container `[data-sa-page]`.                                   ║
  ║   • Se a tabela não existe, ou veio vazia, ou está offline, NÃO     ║
  ║     toca no DOM existente — mantém o HTML estático intacto.         ║
  ║   • Modo "draft" (?sa_mode=draft) habilita pré-visualização do      ║
  ║     rascunho — usado pelo painel super-admin via iframe.            ║
  ║                                                                      ║
  ║  Sem dependências além do que o projeto já carrega.                 ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function client() { return window.supabaseClient || null; }

  function urlParams() {
    var qs = (location.search || '').replace(/^\?/, '');
    var out = {};
    qs.split('&').forEach(function (kv) {
      if (!kv) return;
      var p = kv.split('=');
      out[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
    });
    return out;
  }

  /* ── Carrega seções de uma página ─────────────────────────────── */
  async function loadSections(slug, mode) {
    var sb = client();
    if (!sb) return null;
    try {
      var pageRes = await sb.from('site_pages').select('*').eq('slug', slug).is('deleted_at', null).limit(1);
      if (pageRes.error || !pageRes.data || !pageRes.data.length) return null;
      var page = pageRes.data[0];

      var query = sb.from('site_sections')
        .select('*, site_cards(*)')
        .eq('page_id', page.id)
        .is('deleted_at', null)
        .order('order_index', { ascending: true });

      // Em modo published, só vemos publicado. Em draft (super_admin), o RLS
      // já libera tudo automaticamente.
      if (mode !== 'draft') query = query.eq('status', 'published');

      var secRes = await query;
      if (secRes.error) {
        // Tabela não existe — mantém HTML estático
        return null;
      }

      // Filtra cards só de publicados (em draft, todos)
      var sections = (secRes.data || []).map(function (s) {
        var cards = (s.site_cards || [])
          .filter(function (c) { return !c.deleted_at && (mode === 'draft' || c.status === 'published'); })
          .sort(function (a, b) { return (a.order_index || 0) - (b.order_index || 0); });
        return Object.assign({}, s, { _cards: cards });
      }).filter(function (s) { return s.visible !== false; });

      return { page: page, sections: sections, mode: mode };
    } catch (e) {
      console.warn('[site-content] erro ao carregar:', e.message);
      return null;
    }
  }

  /* ── Renderers por tipo de seção ──────────────────────────────── */
  var R = {};

  function payloadOf(s, mode) {
    return mode === 'draft' ? (s.draft_payload || {}) : (s.published_payload || s.draft_payload || {});
  }

  R.hero = function (s, mode) {
    var p = payloadOf(s, mode);
    var title    = escHtml(p.title    || s.title    || '');
    var subtitle = escHtml(p.subtitle || s.subtitle || '');
    var bg       = escHtml(p.background || '');
    var cta      = p.cta || {};
    return '' +
      '<section class="sc-section sc-hero"' + (bg ? ' style="background-image:url(\'' + bg + '\')"' : '') + '>' +
        '<div class="sc-hero__inner">' +
          (title    ? '<h1 class="sc-hero__title">' + title + '</h1>' : '') +
          (subtitle ? '<p class="sc-hero__subtitle">' + subtitle + '</p>' : '') +
          (cta.label ? '<a class="sc-cta" href="' + escHtml(cta.link || '#') + '">' + escHtml(cta.label) + '</a>' : '') +
        '</div>' +
      '</section>';
  };

  R.text = function (s, mode) {
    var p = payloadOf(s, mode);
    var heading = escHtml(p.heading || s.title || '');
    var body    = String(p.body || s.description || '').split(/\n+/).map(function (par) {
      return '<p>' + escHtml(par) + '</p>';
    }).join('');
    return '<section class="sc-section sc-text">' +
      (heading ? '<h2 class="sc-h">' + heading + '</h2>' : '') +
      '<div class="sc-rich">' + body + '</div>' +
    '</section>';
  };

  R.cards = function (s, mode) {
    var p = payloadOf(s, mode);
    var heading = escHtml(p.heading || s.title || '');
    // Itens: prioridade para s._cards (registros reais); fallback para p.items (payload livre)
    var items = (s._cards && s._cards.length) ? s._cards.map(function (c) {
      return {
        title:       c.title,        subtitle:   c.subtitle,
        description: c.description,  image_url:  c.image_url,
        button_text: c.button_text,  button_link: c.button_link,
        icon:        c.icon
      };
    }) : (p.items || []);

    var html = '<section class="sc-section sc-cards">' +
      (heading ? '<h2 class="sc-h">' + heading + '</h2>' : '') +
      '<div class="sc-cards__grid">';
    html += items.map(function (it) {
      var img    = it.image_url   ? '<img src="' + escHtml(it.image_url) + '" alt="' + escHtml(it.title || '') + '" loading="lazy" />' : '';
      var icon   = it.icon        ? '<i class="' + escHtml(it.icon) + '" aria-hidden="true"></i>' : '';
      var t      = it.title       ? '<h3>' + escHtml(it.title) + '</h3>' : '';
      var sub    = it.subtitle    ? '<p class="sc-card__sub">' + escHtml(it.subtitle) + '</p>' : '';
      var desc   = it.description ? '<p>' + escHtml(it.description) + '</p>' : '';
      var btn    = it.button_text ? '<a class="sc-cta" href="' + escHtml(it.button_link || '#') + '">' + escHtml(it.button_text) + '</a>' : '';
      return '<article class="sc-card">' + img + icon + t + sub + desc + btn + '</article>';
    }).join('');
    html += '</div></section>';
    return html;
  };

  R.cta = function (s, mode) {
    var p = payloadOf(s, mode);
    var title    = escHtml(p.title || s.title || '');
    var subtitle = escHtml(p.subtitle || s.subtitle || '');
    var cta = p.cta || {};
    return '<section class="sc-section sc-ctaband">' +
      (title    ? '<h2 class="sc-h">' + title + '</h2>' : '') +
      (subtitle ? '<p>' + subtitle + '</p>' : '') +
      (cta.label ? '<a class="sc-cta" href="' + escHtml(cta.link || '#') + '">' + escHtml(cta.label) + '</a>' : '') +
    '</section>';
  };

  R.gallery = function (s, mode) {
    var p = payloadOf(s, mode);
    var heading = escHtml(p.heading || s.title || '');
    var items = p.items || [];
    return '<section class="sc-section sc-gallery">' +
      (heading ? '<h2 class="sc-h">' + heading + '</h2>' : '') +
      '<div class="sc-gallery__grid">' +
      items.map(function (it) {
        var src = escHtml(it.url || it.src || '');
        var alt = escHtml(it.alt || it.legenda || '');
        return '<figure><img src="' + src + '" alt="' + alt + '" loading="lazy"/></figure>';
      }).join('') +
      '</div></section>';
  };

  R.stats = function (s, mode) {
    var p = payloadOf(s, mode);
    var heading = escHtml(p.heading || s.title || '');
    var items = p.items || [];
    return '<section class="sc-section sc-stats">' +
      (heading ? '<h2 class="sc-h">' + heading + '</h2>' : '') +
      '<div class="sc-stats__grid">' +
      items.map(function (it) {
        return '<div class="sc-stat"><strong>' + escHtml(it.value || '') + '</strong><span>' + escHtml(it.label || '') + '</span></div>';
      }).join('') +
      '</div></section>';
  };

  R.video = function (s, mode) {
    var p = payloadOf(s, mode);
    var src    = escHtml(p.src || '');
    var poster = escHtml(p.poster || '');
    if (!src) return '';
    return '<section class="sc-section sc-video">' +
      '<video controls preload="metadata"' + (poster ? ' poster="' + poster + '"' : '') + '><source src="' + src + '" /></video>' +
    '</section>';
  };

  R.faq = function (s, mode) {
    var p = payloadOf(s, mode);
    var heading = escHtml(p.heading || s.title || '');
    var items = p.items || [];
    return '<section class="sc-section sc-faq">' +
      (heading ? '<h2 class="sc-h">' + heading + '</h2>' : '') +
      items.map(function (it) {
        return '<details><summary>' + escHtml(it.q || '') + '</summary><div>' + escHtml(it.a || '') + '</div></details>';
      }).join('') +
    '</section>';
  };

  R.testimonials = function (s, mode) {
    var p = payloadOf(s, mode);
    var heading = escHtml(p.heading || s.title || '');
    var items = p.items || [];
    return '<section class="sc-section sc-testimonials">' +
      (heading ? '<h2 class="sc-h">' + heading + '</h2>' : '') +
      '<div class="sc-testimonials__grid">' +
      items.map(function (it) {
        return '<blockquote><p>“' + escHtml(it.quote || '') + '”</p><cite>' + escHtml(it.author || '') + '</cite></blockquote>';
      }).join('') +
      '</div></section>';
  };

  R.contact = R.text;
  /* Form é especial: vamos retornar um placeholder e injetar dinamicamente,
     pois precisamos de async para buscar campos. */
  R.form = function (s, mode) {
    var p = payloadOf(s, mode);
    var key = p.form_key || s.internal_name;
    return '<section class="sc-section sc-formhost" data-sa-form="' + escHtml(key) + '"></section>';
  };
  R.custom  = function (s, mode) {
    var p = payloadOf(s, mode);
    var heading = escHtml(p.heading || s.title || '');
    return '<section class="sc-section sc-custom">' +
      (heading ? '<h2 class="sc-h">' + heading + '</h2>' : '') +
      '<div class="sc-rich">' + escHtml(p.html || s.description || '') + '</div>' +
    '</section>';
  };

  function renderSection(s, mode) {
    var fn = R[s.type] || R.custom;
    try { return fn(s, mode) || ''; }
    catch (e) {
      console.warn('[site-content] erro ao renderizar', s.type, e);
      return '';
    }
  }

  /* ── Estilos básicos isolados (prefixo .sc-) ───────────────────── */
  var stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var css = '' +
      '.sc-section { padding: clamp(28px,5vw,64px) clamp(16px,4vw,48px); }' +
      '.sc-h { font-family: "Playfair Display", Georgia, serif; font-size: clamp(22px,3vw,34px); margin: 0 0 16px; }' +
      '.sc-rich p { margin: 0 0 12px; line-height: 1.65; }' +
      '.sc-cta { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 999px; background: #4a8a39; color: #fff; text-decoration: none; font-weight: 600; }' +
      '.sc-cta:hover { filter: brightness(1.08); }' +

      '.sc-hero { display: grid; place-items: center; min-height: clamp(280px,40vh,480px); background-size: cover; background-position: center; }' +
      '.sc-hero__inner { background: rgba(255,255,255,.78); padding: clamp(20px,4vw,36px); border-radius: 18px; text-align: center; max-width: 760px; backdrop-filter: blur(4px); }' +
      '.sc-hero__title { font-family: "Playfair Display", serif; font-size: clamp(28px, 4vw, 48px); margin: 0 0 8px; }' +
      '.sc-hero__subtitle { margin: 0 0 16px; color: #4a4a45; }' +

      '.sc-cards__grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }' +
      '.sc-card { background: #fff; border: 1px solid rgba(0,0,0,.08); border-radius: 14px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,.05); }' +
      '.sc-card img { width: 100%; aspect-ratio: 16/10; object-fit: cover; border-radius: 10px; }' +
      '.sc-card h3 { margin: 12px 0 6px; }' +
      '.sc-card__sub { color: #4a8a39; font-weight: 600; font-size: 13px; }' +

      '.sc-gallery__grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }' +
      '.sc-gallery img { width: 100%; aspect-ratio: 1/1; object-fit: cover; border-radius: 10px; }' +

      '.sc-stats__grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); text-align: center; }' +
      '.sc-stat strong { display: block; font-family: "Playfair Display", serif; font-size: clamp(28px,4vw,42px); color: #4a8a39; }' +
      '.sc-stat span { color: #555; font-size: 14px; }' +

      '.sc-video video { width: 100%; max-height: 540px; border-radius: 14px; background: #000; }' +
      '.sc-faq details { padding: 12px; border-bottom: 1px solid rgba(0,0,0,.08); }' +
      '.sc-faq summary { cursor: pointer; font-weight: 600; }' +
      '.sc-testimonials__grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }' +
      '.sc-testimonials blockquote { background: #f9f7f1; padding: 18px; border-radius: 14px; border-left: 4px solid #4a8a39; margin: 0; }' +

      '.sc-form { display: grid; gap: 12px; max-width: 640px; margin: 0 auto; }' +
      '.sc-form__row { display: grid; gap: 6px; }' +
      '.sc-form__label { font-weight: 600; font-size: 14px; color: #2a2620; }' +
      '.sc-form__label em { color: #a02828; font-style: normal; }' +
      '.sc-form__row input, .sc-form__row textarea, .sc-form__row select { padding: 10px 12px; border: 1px solid rgba(0,0,0,.15); border-radius: 10px; font: inherit; font-size: 15px; background: #fff; }' +
      '.sc-form__row input:focus, .sc-form__row textarea:focus, .sc-form__row select:focus { outline: none; border-color: #4a8a39; box-shadow: 0 0 0 3px rgba(74,138,57,.18); }' +
      '.sc-form__group { border: 0; padding: 0; margin: 0; display: grid; gap: 6px; }' +
      '.sc-form__opt { display: inline-flex; align-items: center; gap: 6px; }' +
      '.sc-form__help { color: #6b6660; font-size: 12px; }' +
      '.sc-form__desc { color: #555; margin: -4px 0 8px; }' +
      '.sc-form__actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 6px; }' +
      '.sc-form__msg { font-size: 14px; }' +
      '.sc-form__empty { padding: 24px; text-align: center; color: #888; border: 1px dashed rgba(0,0,0,.12); border-radius: 12px; }';

    var st = document.createElement('style');
    st.id = 'sc-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ── Form rendering / submit ──────────────────────────────────── */

  async function loadFormByKey(key) {
    var sb = client();
    if (!sb) return null;
    var fr = await sb.from('site_forms').select('*').eq('internal_key', key).is('deleted_at', null).limit(1);
    if (fr.error || !fr.data || !fr.data.length) return null;
    var form = fr.data[0];
    var ff = await sb.from('site_form_fields').select('*').eq('form_id', form.id).is('deleted_at', null).order('order_index', { ascending: true });
    if (ff.error) return { form: form, fields: [] };
    return { form: form, fields: ff.data || [] };
  }

  function renderField(f) {
    var common = 'name="' + escHtml(f.field_key) + '" id="scf-' + escHtml(f.field_key) + '"' +
                 (f.required ? ' required' : '') +
                 (f.placeholder ? ' placeholder="' + escHtml(f.placeholder) + '"' : '');
    var help = f.help_text ? '<small class="sc-form__help">' + escHtml(f.help_text) + '</small>' : '';
    var label = '<span class="sc-form__label">' + escHtml(f.label) + (f.required ? ' <em>*</em>' : '') + '</span>';
    switch (f.field_type) {
      case 'textarea':
        return '<label class="sc-form__row">' + label + '<textarea ' + common + ' rows="4"></textarea>' + help + '</label>';
      case 'email':
        return '<label class="sc-form__row">' + label + '<input type="email" ' + common + ' />' + help + '</label>';
      case 'phone':
        return '<label class="sc-form__row">' + label + '<input type="tel" ' + common + ' />' + help + '</label>';
      case 'number':
        return '<label class="sc-form__row">' + label + '<input type="number" ' + common + ' />' + help + '</label>';
      case 'date':
        return '<label class="sc-form__row">' + label + '<input type="date" ' + common + ' />' + help + '</label>';
      case 'select':
        return '<label class="sc-form__row">' + label + '<select ' + common + '>' +
          '<option value="">Selecione…</option>' +
          (f.options || []).map(function (o) {
            return '<option value="' + escHtml(o.value || o.label) + '">' + escHtml(o.label || o.value) + '</option>';
          }).join('') +
        '</select>' + help + '</label>';
      case 'radio':
        return '<fieldset class="sc-form__row sc-form__group">' +
          '<legend class="sc-form__label">' + escHtml(f.label) + (f.required ? ' <em>*</em>' : '') + '</legend>' +
          (f.options || []).map(function (o, i) {
            var v = escHtml(o.value || o.label);
            return '<label class="sc-form__opt"><input type="radio" name="' + escHtml(f.field_key) + '" value="' + v + '"' + (f.required && i === 0 ? ' required' : '') + ' /> ' + escHtml(o.label || o.value) + '</label>';
          }).join('') +
          help +
        '</fieldset>';
      case 'checkbox':
        return '<fieldset class="sc-form__row sc-form__group">' +
          '<legend class="sc-form__label">' + escHtml(f.label) + (f.required ? ' <em>*</em>' : '') + '</legend>' +
          (f.options || []).map(function (o) {
            var v = escHtml(o.value || o.label);
            return '<label class="sc-form__opt"><input type="checkbox" name="' + escHtml(f.field_key) + '" value="' + v + '" /> ' + escHtml(o.label || o.value) + '</label>';
          }).join('') +
          help +
        '</fieldset>';
      case 'consent':
        return '<label class="sc-form__row sc-form__opt"><input type="checkbox" name="' + escHtml(f.field_key) + '"' + (f.required ? ' required' : '') + ' /> <span>' + escHtml(f.label) + '</span></label>' + help;
      case 'file':
        return '<label class="sc-form__row">' + label + '<input type="file" ' + common + ' />' + help + '</label>';
      case 'text':
      default:
        return '<label class="sc-form__row">' + label + '<input type="text" ' + common + ' />' + help + '</label>';
    }
  }

  function gatherForm(formEl, fields) {
    var data = new FormData(formEl);
    var out = {};
    fields.forEach(function (f) {
      if (f.field_type === 'checkbox') {
        out[f.field_key] = data.getAll(f.field_key);
      } else {
        out[f.field_key] = data.get(f.field_key) || '';
      }
    });
    return out;
  }

  async function mountForm(host) {
    var key = host.getAttribute('data-sa-form');
    if (!key) return;
    var sb = client();
    if (!sb) return;

    var data;
    try { data = await loadFormByKey(key); }
    catch (e) { console.warn('[site-content form]', e.message); return; }
    if (!data || !data.form) {
      host.innerHTML = '<div class="sc-form__empty">Formulário não encontrado.</div>';
      return;
    }

    var f = data.form;
    var fieldsHtml = (data.fields || []).map(renderField).join('');
    host.innerHTML = '' +
      '<form class="sc-form" novalidate>' +
        (f.title       ? '<h2 class="sc-h">' + escHtml(f.title) + '</h2>' : '') +
        (f.description ? '<p class="sc-form__desc">' + escHtml(f.description) + '</p>' : '') +
        fieldsHtml +
        '<div class="sc-form__actions">' +
          '<button type="submit" class="sc-cta">' + escHtml(f.submit_label || 'Enviar') + '</button>' +
          '<span class="sc-form__msg" role="status" aria-live="polite"></span>' +
        '</div>' +
      '</form>';

    var formEl = host.querySelector('form');
    var msgEl  = host.querySelector('.sc-form__msg');
    var btn    = host.querySelector('button[type="submit"]');
    formEl.addEventListener('submit', async function (e) {
      e.preventDefault();
      btn.disabled = true;
      msgEl.textContent = 'Enviando…';
      msgEl.style.color = '';
      try {
        var payload = gatherForm(formEl, data.fields);
        var meta = {
          ua:       navigator.userAgent || '',
          referrer: document.referrer || '',
          locale:   navigator.language || '' };
        var ins = await sb.from('site_form_submissions').insert([{
          form_id:  f.id,
          form_key: f.internal_key,
          payload:  payload,
          meta:     meta
        }]);
        if (ins.error) throw new Error(ins.error.message);
        formEl.reset();
        msgEl.textContent = f.success_message || 'Recebido!';
        msgEl.style.color = '#2c6e1c';
      } catch (err) {
        msgEl.textContent = 'Erro ao enviar. Tente novamente.';
        msgEl.style.color = '#a02828';
        console.error('[site-content form submit]', err);
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ── Render no DOM ────────────────────────────────────────────── */
  function renderInto(target, data) {
    var html = data.sections.map(function (s) { return renderSection(s, data.mode); }).join('');
    if (!html) return false;  // nada vindo do banco — mantém HTML estático
    target.innerHTML = html;
    // Monta forms incrustados (das seções tipo `form` ou containers livres)
    var hosts = target.querySelectorAll('[data-sa-form]');
    for (var i = 0; i < hosts.length; i++) mountForm(hosts[i]);
    return true;
  }

  /* ── Carrega presets de animação ativos e aplica como <style> ── */
  var presetsInjected = false;
  async function injectPresets() {
    if (presetsInjected) return;
    presetsInjected = true;
    var sb = client();
    if (!sb) return;
    try {
      var r = await sb.from('site_style_presets').select('preset_key, css').eq('status','active');
      if (r.error || !r.data) return;
      var st = document.createElement('style');
      st.id = 'sa-runtime-presets';
      st.textContent = r.data.map(function (p) { return '/* ' + p.preset_key + ' */ ' + (p.css || ''); }).join('\n\n');
      document.head.appendChild(st);
    } catch (e) {
      // silencioso — presets são opcionais
    }
  }

  /* ── Ponto de entrada automático ──────────────────────────────── */
  async function autoMount() {
    var nodes = document.querySelectorAll('[data-sa-page]');
    if (!nodes.length) {
      // Mesmo sem páginas SA, ainda injetamos presets se houver elementos com data-sa-anim
      if (document.querySelector('[data-sa-anim],[data-sa-trans]')) injectPresets();
      return;
    }

    var qp = urlParams();
    var mode = qp.sa_mode === 'draft' ? 'draft' : 'published';

    // Sincroniza Supabase se ainda não foi inicializado
    if (typeof window.inicializarSupabase === 'function' && !window.supabaseClient) {
      try { window.inicializarSupabase(); } catch (e) {}
    }
    if (!window.supabaseClient) return;

    injectStyles();

    for (var i = 0; i < nodes.length; i++) {
      var el   = nodes[i];
      var slug = el.getAttribute('data-sa-page') || '';
      if (!slug) continue;

      try {
        var data = await loadSections(slug, mode);
        if (data && data.sections.length) {
          renderInto(el, data);
          el.setAttribute('data-sa-rendered', 'true');
        }
      } catch (e) {
        console.warn('[site-content]', slug, e.message);
        // não toca no DOM — fallback estático
      }
    }
  }

  /* Export utilitário (para o painel chamar manualmente) */
  window.SiteContent = {
    loadSections: loadSections,
    renderSection: renderSection,
    renderInto: renderInto,
    injectStyles: injectStyles
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }
})();
