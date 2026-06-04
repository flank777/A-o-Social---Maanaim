/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  DoaVida — js/services/firebase.js  (usa Supabase internamente)     ║
  ║  Camada de dados: Supabase Postgres                                  ║
  ║  URL:  https://jrugfqkeyyvekqkprdwr.supabase.co                     ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/

var _SUPA_URL = 'https://qklehrgkbyuvwhcclkst.supabase.co';
var _SUPA_KEY = 'sb_publishable_iCZWL3_h7wNs9Ukr9QNUZQ_JIWoHmVR';

var _sb  = null;  /* cliente Supabase */
var _localUser = null;

var LOCAL_ADMIN_PW = (function () {
  try { return localStorage.getItem('doavida_senha') || '@maanaim1818'; } catch (e) { return '@maanaim1818'; }
})();

/* ══════════════════════════════════════════════════════════════════════
   INICIALIZAÇÃO
   ══════════════════════════════════════════════════════════════════════ */

function inicializarFirebase() {
  if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
    _sb = window.supabase.createClient(_SUPA_URL, _SUPA_KEY);
    window._doaVidaFirestoreOk = true;
    console.log('[DoaVida] ✅ Supabase conectado —', _SUPA_URL);
  } else {
    /* SDK Supabase não carregou — usa REST direto */
    _sb = _buildRestClient();
    window._doaVidaFirestoreOk = true;
    console.log('[DoaVida] ✅ Supabase REST ativo (sem SDK)');
  }
  return true;
}

function inicializarSupabase() { return inicializarFirebase(); }
window.inicializarSupabase = inicializarSupabase;

/* ══════════════════════════════════════════════════════════════════════
   CLIENTE REST FALLBACK (quando o SDK não carregar)
   ══════════════════════════════════════════════════════════════════════ */

function _buildRestClient() {
  var base = _SUPA_URL + '/rest/v1/';
  var hdrs = {
    'apikey':        _SUPA_KEY,
    'Authorization': 'Bearer ' + _SUPA_KEY,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  };

  function _get(table, params) {
    var qs = Object.keys(params || {}).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    return fetch(base + table + (qs ? '?' + qs : ''), { headers: hdrs })
      .then(function (r) { return r.json(); })
      .then(function (d) { return { data: Array.isArray(d) ? d : [], error: null }; })
      .catch(function (e) { return { data: [], error: { message: e.message } }; });
  }

  function _post(table, body) {
    return fetch(base + table, { method: 'POST', headers: hdrs, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (d) { return { data: Array.isArray(d) ? d[0] : d, error: null }; })
      .catch(function (e) { return { data: null, error: { message: e.message } }; });
  }

  function _patch(table, id, body) {
    return fetch(base + table + '?id=eq.' + id, { method: 'PATCH', headers: hdrs, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (d) { return { data: Array.isArray(d) ? d[0] : d, error: null }; })
      .catch(function (e) { return { data: null, error: { message: e.message } }; });
  }

  function _del(table, id) {
    return fetch(base + table + '?id=eq.' + id, { method: 'DELETE', headers: hdrs })
      .then(function () { return { data: null, error: null }; })
      .catch(function (e) { return { data: null, error: { message: e.message } }; });
  }

  return {
    from: function (table) {
      var _filters = [];
      var _orderCol = null, _orderAsc = true, _lim = null, _isSingle = false, _selectCols = null;
      var b = {
        select: function (cols) { if (cols && cols !== '*') _selectCols = cols; return b; },
        eq: function (col, val) { _filters.push(col + '=eq.' + val); return b; },
        order: function (col, opts) { _orderCol = col; _orderAsc = !(opts && opts.ascending === false); return b; },
        limit: function (n) { _lim = n; return b; },
        single: function () { _isSingle = true; return b; },
        then: function (res, rej) {
          var params = {};
          if (_selectCols) params['select'] = _selectCols;
          _filters.forEach(function (f) { var p = f.split('='); params[p[0]] = p.slice(1).join('='); });
          if (_orderCol) params['order'] = _orderCol + (_orderAsc ? '.asc' : '.desc');
          if (_lim) params['limit'] = _lim;
          return _get(table, params).then(function (r) {
            if (_isSingle) {
              var row = Array.isArray(r.data) ? r.data[0] : r.data;
              return res({ data: row || null, error: row ? null : { message: 'Not found' } });
            }
            return res(r);
          }, rej);
        },
        insert: function (rows) {
          var row = Array.isArray(rows) ? rows[0] : rows;
          var b2 = {
            select: function () { return b2; },
            single: function () { return _post(table, row); }
          };
          return b2;
        },
        update: function (data) {
          return {
            eq: function (col, val) {
              var inner = {
                select: function () { return inner; },
                single: function () { return _patch(table, val, data); },
                then: function (res) { return _patch(table, val, data).then(res); }
              };
              return inner;
            }
          };
        },
        delete: function () {
          return {
            eq: function (col, val) {
              return _del(table, val);
            }
          };
        },
        upsert: function (data) {
          var uHdrs = Object.assign({}, hdrs, { 'Prefer': 'resolution=merge-duplicates,return=representation' });
          return fetch(base + table, { method: 'POST', headers: uHdrs, body: JSON.stringify(data) })
            .then(function (r) { return r.json(); })
            .then(function (d) { return { data: d, error: null }; })
            .catch(function (e) { return { data: null, error: { message: e.message } }; });
        }
      };
      return b;
    },
    auth: { signInWithPassword: function () { return Promise.resolve({ data: null, error: { message: 'SDK não carregado' } }); } },
    storage: { from: function () { return { remove: function () { return Promise.resolve({ data: null, error: null }); } }; } },
    channel: function () { var ch = { on: function () { return ch; }, subscribe: function () { return ch; } }; return ch; },
    removeChannel: function () {}
  };
}

/* ══════════════════════════════════════════════════════════════════════
   window.supabaseClient — interface esperada por admin.js
   ══════════════════════════════════════════════════════════════════════ */

window.supabaseClient = {

  auth: {
    signInWithPassword: async function (creds) {
      /* Só verifica a senha local — autenticação simplificada */
      var localPw = LOCAL_ADMIN_PW;
      try { localPw = localStorage.getItem('doavida_senha') || LOCAL_ADMIN_PW; } catch (_) {}
      if (creds.password === localPw) {
        _localUser = { id: 'admin', uid: 'admin', email: creds.email || 'admin@doavida.local' };
        return { data: { user: _localUser, session: { user: _localUser } }, error: null };
      }
      return { data: null, error: { message: 'E-mail ou senha inválidos.' } };
    },

    signOut: async function () { _localUser = null; },

    getSession: function () {
      return Promise.resolve({
        data: { session: _localUser ? { user: _localUser } : null }
      });
    },

    onAuthStateChange: function () {}
  },

  from: function (table) {
    if (table === 'profiles') {
      return {
        select: function () {
          return {
            eq: function () {
              return {
                single: function () {
                  if (!_localUser) return Promise.resolve({ data: null, error: { message: 'Not authenticated' } });
                  return Promise.resolve({ data: { role: 'admin', nome: _localUser.email }, error: null });
                }
              };
            }
          };
        }
      };
    }
    return _sb.from(table);
  },

  channel: function () {
    var ch = { on: function () { return ch; }, subscribe: function () { return ch; } };
    return ch;
  },
  removeChannel: function () {},

  storage: {
    from: function () {
      return {
        remove: async function () { return { data: null, error: null }; }
      };
    }
  }
};

/* ══════════════════════════════════════════════════════════════════════
   HELPERS INTERNOS
   ══════════════════════════════════════════════════════════════════════ */

function _now() { return new Date().toISOString(); }

function _withTimeout(promise, ms, fallback) {
  return new Promise(function (resolve) {
    var done = false;
    var t = setTimeout(function () {
      if (!done) { done = true; resolve(fallback !== undefined ? fallback : []); }
    }, ms);
    promise.then(function (v) {
      if (!done) { done = true; clearTimeout(t); resolve(v); }
    }).catch(function () {
      if (!done) { done = true; clearTimeout(t); resolve(fallback !== undefined ? fallback : []); }
    });
  });
}

async function _getAll(table, order) {
  try {
    var q = _sb.from(table).select('*');
    if (order) q = q.order(order, { ascending: true });
    var r = await _withTimeout(q, 12000, { data: [], error: null });
    return (r && r.data) ? r.data : [];
  } catch (e) { console.error('[DoaVida]', table, e.message); return []; }
}

async function _insert(table, payload) {
  var r = await _sb.from(table).insert(payload).select().single();
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

async function _update(table, id, dados) {
  var r = await _sb.from(table).update(Object.assign({}, dados, { updated_at: _now() })).eq('id', id).select().single();
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

async function _delete(table, id) {
  var r = await _sb.from(table).delete().eq('id', id);
  if (r.error) throw new Error(r.error.message);
  return true;
}

/* ══════════════════════════════════════════════════════════════════════
   DoaVidaSync — interface pública usada por form.js e admin.js
   ══════════════════════════════════════════════════════════════════════ */

var DoaVidaSync = {

  init: function () {
    inicializarFirebase();
    console.log('[DoaVidaSync] ✅ Inicializado');
    window.dispatchEvent(new CustomEvent('DoaVidaSyncPronto'));
  },

  /* ── ALIMENTOS ── */
  getAlimentos: async function () { return _getAll('alimentos', 'name'); },

  addAlimento: async function (dados) {
    return _insert('alimentos', Object.assign({}, dados, { kg: dados.kg || 0, created_at: _now() }));
  },

  updateAlimento: async function (id, dados) { return _update('alimentos', id, dados); },
  deleteAlimento: async function (id) { return _delete('alimentos', id); },

  getAlimentoById: async function (id) {
    var r = await _sb.from('alimentos').select('*').eq('id', id).single();
    return r.data || null;
  },

  /* ── DOAÇÕES ── */
  getDoacoes: async function () {
    try {
      var r = await _withTimeout(
        _sb.from('doacoes').select('*').order('created_at', { ascending: false }), 12000, { data: [] }
      );
      return (r && r.data) ? r.data : [];
    } catch (e) { return []; }
  },

  addDoacao: async function (dados) {
    return _insert('doacoes', Object.assign({}, dados, { created_at: _now() }));
  },

  updateDoacaoStatus: async function (id, status) { return _update('doacoes', id, { status: status }); },
  updateDoacao: async function (id, dados) { return _update('doacoes', id, dados); },
  deleteDoacao: async function (id) { return _delete('doacoes', id); },

  /* ── FAMÍLIAS ── */
  getFamilias: async function () { return _getAll('familias', 'created_at'); },
  addFamilia:  async function (dados) { return _insert('familias', Object.assign({}, dados, { created_at: _now() })); },
  updateFamilia: async function (id, dados) { return _update('familias', id, dados); },
  deleteFamilia: async function (id) { return _delete('familias', id); },

  /* ── VOLUNTÁRIOS ── */
  getVoluntarios: async function () { return _getAll('voluntarios', 'created_at'); },
  addVoluntario:  async function (dados) { return _insert('voluntarios', Object.assign({}, dados, { created_at: _now() })); },
  updateVoluntario: async function (id, dados) { return _update('voluntarios', id, dados); },
  deleteVoluntario: async function (id) { return _delete('voluntarios', id); },

  /* ── ORAÇÕES ── */
  getOracoes: async function () { return _getAll('oracoes', 'created_at'); },
  addOracao:  async function (dados) { return _insert('oracoes', Object.assign({}, dados, { created_at: _now() })); },
  updateOracao: async function (id, dados) { return _update('oracoes', id, dados); },
  deleteOracao: async function (id) { return _delete('oracoes', id); },

  /* ── GALERIA ── */

  /* Busca só metadados (sem url) para montar a grade rapidamente */
  getGaleriaMetadata: async function () {
    try {
      var cols = 'id,titulo,legenda,categoria,tipo,ativo,visibilidade,order_index,poster_url,storage_path,created_at';
      var q = _sb.from('galeria').select(cols).order('created_at', { ascending: true });
      var r = await _withTimeout(q, 15000, { data: [], error: null });
      return (r && r.data) ? r.data : [];
    } catch (e) { console.error('[DoaVida] galeria metadata', e.message); return []; }
  },

  /* Busca a URL de um único item (pode ser base64 grande — feito individualmente) */
  getGaleriaItemUrl: async function (id) {
    try {
      var r = await _sb.from('galeria').select('url').eq('id', id).single();
      return (r && r.data && r.data.url) ? r.data.url : '';
    } catch (e) { return ''; }
  },

  /* Versão completa (com url) — usada pelo modal de edição */
  getGaleria: async function () {
    try {
      var q = _sb.from('galeria').select('*').order('created_at', { ascending: true });
      var r = await _withTimeout(q, 60000, { data: [], error: null });
      return (r && r.data) ? r.data : [];
    } catch (e) { console.error('[DoaVida] galeria', e.message); return []; }
  },

  addFotoGaleria: async function (foto) {
    var payload = {
      url:          foto.url          || '',
      legenda:      foto.legenda      || foto.titulo || '',
      titulo:       foto.titulo       || foto.legenda || '',
      alt:          foto.alt          || '',
      categoria:    foto.categoria    || 'geral',
      tipo:         foto.tipo         || 'imagem',
      poster_url:   foto.poster_url   || '',
      order_index:  typeof foto.order_index === 'number' ? foto.order_index : 0,
      ativo:        foto.ativo !== false,
      storage_path: foto.storage_path || '',
      visibilidade: (foto.publica === false || foto.isPublic === false) ? 'privada' : 'publica',
      created_at:   _now()
    };
    return _insert('galeria', payload);
  },

  updateFotoGaleria: async function (id, dados) { return _update('galeria', id, dados); },

  deleteFotoGaleria: async function (id) { return _delete('galeria', id); },

  uploadImagemGaleria: async function (arquivo, nomeArquivo) {
    /* Tenta Supabase Storage; cai em base64 só se falhar */
    try {
      if (window.supabase && _sb && typeof _sb.storage === 'object') {
        /* SDK disponível — upload real para o bucket "galeria" */
        var upResult = await _sb.storage.from('galeria').upload(nomeArquivo, arquivo, {
          cacheControl: '3600',
          upsert: true,
          contentType: arquivo.type || 'application/octet-stream'
        });
        if (upResult.error) throw new Error(upResult.error.message);
        var urlResult = _sb.storage.from('galeria').getPublicUrl(nomeArquivo);
        return urlResult.data.publicUrl;
      }

      /* REST fallback — upload direto para a Storage API */
      var storageEndpoint = _SUPA_URL + '/storage/v1/object/galeria/' + encodeURIComponent(nomeArquivo);
      var resp = await fetch(storageEndpoint, {
        method: 'POST',
        headers: {
          'apikey':        _SUPA_KEY,
          'Authorization': 'Bearer ' + _SUPA_KEY,
          'Content-Type':  arquivo.type || 'application/octet-stream',
          'x-upsert':      'true'
        },
        body: arquivo
      });
      if (!resp.ok) {
        var errBody = await resp.json().catch(function () { return { message: resp.statusText }; });
        throw new Error(errBody.message || 'Upload falhou (' + resp.status + ')');
      }
      return _SUPA_URL + '/storage/v1/object/public/galeria/' + encodeURIComponent(nomeArquivo);

    } catch (storageErr) {
      console.warn('[DoaVida] Storage falhou, convertendo para base64:', storageErr.message);
      /* Fallback final: base64 (compatibilidade) */
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload  = function (e) { resolve(e.target.result); };
        reader.onerror = reject;
        reader.readAsDataURL(arquivo);
      });
    }
  },

  /* ── MODELO CESTA ── */
  getModeloCestaItens: async function () {
    try {
      var r = await _withTimeout(
        _sb.from('modelo_cesta_itens').select('*').order('created_at', { ascending: true }), 10000, { data: [] }
      );
      return (r && r.data) ? r.data : [];
    } catch (e) { return []; }
  },

  addModeloCestaItem: async function (dados) {
    return _insert('modelo_cesta_itens', Object.assign({}, dados, { created_at: _now() }));
  },

  updateModeloCestaItem: async function (id, dados) { return _update('modelo_cesta_itens', id, dados); },
  deleteModeloCestaItem: async function (id) { return _delete('modelo_cesta_itens', id); },

  /* ── CESTAS FORMADAS ── */
  getCestasFormadas: async function () { return _getAll('cestas_formadas', 'created_at'); },

  addCestaFormada: async function (dados) {
    return _insert('cestas_formadas', Object.assign({}, dados, { created_at: _now() }));
  },

  deleteCestaFormada: async function (id) { return _delete('cestas_formadas', id); },

  /* ── CONFIGURAÇÕES ── */
  getConfig: async function (chave) {
    try {
      var r = await _sb.from('configuracao').select('valor').eq('chave', chave).single();
      return (r.data && r.data.valor !== undefined) ? r.data.valor : null;
    } catch (e) { return null; }
  },

  setConfig: async function (chave, valor) {
    var r = await _sb.from('configuracao').upsert(
      { chave: chave, valor: String(valor), updated_at: _now() }
    );
    if (r && r.error) throw new Error(r.error.message);
  },

  getAllConfigs: async function () {
    try {
      var r = await _sb.from('configuracao').select('*');
      var obj = {};
      if (r.data) r.data.forEach(function (row) { obj[row.chave] = row.valor; });
      return obj;
    } catch (e) { return {}; }
  },

  /* ── SENHA ADMIN ── */
  getSenha: async function () {
    try {
      var v = await DoaVidaSync.getConfig('senha_admin');
      return v || '@maanaim1818';
    } catch (e) { return '@maanaim1818'; }
  },

  setSenha: async function (novaSenha) {
    LOCAL_ADMIN_PW = novaSenha;
    try { localStorage.setItem('doavida_senha', novaSenha); } catch (e) {}
    await DoaVidaSync.setConfig('senha_admin', novaSenha);
  },

  verificarSenha: async function (digitada) {
    var correta = await DoaVidaSync.getSenha();
    return digitada === correta;
  },

  /* ── BANNERS ── */
  getBanners: async function () {
    var cfg = await DoaVidaSync.getAllConfigs();
    return { hero: cfg['banner_hero'] || '', voluntario: cfg['banner_voluntario'] || '' };
  },
  setBannerHero:       async function (url) { await DoaVidaSync.setConfig('banner_hero', url); },
  setBannerVoluntario: async function (url) { await DoaVidaSync.setConfig('banner_voluntario', url); },

  /* ── WHATSAPP ── */
  getWAConfig: async function () {
    var cfg = await DoaVidaSync.getAllConfigs();
    return {
      apikey:     cfg['whatsapp_apikey']  || '',
      adminPhone: (cfg['whatsapp_phones'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
      ativo:      cfg['whatsapp_ativo'] === 'true'
    };
  },

  setWAConfig: async function (cfg) {
    await Promise.all([
      DoaVidaSync.setConfig('whatsapp_apikey',  cfg.apikey || ''),
      DoaVidaSync.setConfig('whatsapp_phones',
        Array.isArray(cfg.adminPhone) ? cfg.adminPhone.join(',') : (cfg.adminPhone || '')),
      DoaVidaSync.setConfig('whatsapp_ativo', cfg.ativo ? 'true' : 'false')
    ]);
  },

  /* ── MIGRAÇÃO LOCAL → SUPABASE ── */
  migrarLocalParaFirestore: async function () {
    try {
      var deFoods = JSON.parse(localStorage.getItem('doavida_foods')        || '[]');
      var deLocal = JSON.parse(localStorage.getItem('doavida_fs_alimentos') || '[]');
      var mapa = {};
      deFoods.concat(deLocal).forEach(function (a) {
        if (a && a.name) mapa[a.name.toLowerCase().trim()] = a;
      });
      var lista = Object.keys(mapa).map(function (k) { return mapa[k]; });
      if (!lista.length) return { ok: false, msg: 'Nenhum alimento local para migrar.' };

      var existentes = await DoaVidaSync.getAlimentos();
      var nomesEx = existentes.map(function (a) { return (a.name || '').toLowerCase().trim(); });
      var migrados = 0;
      for (var i = 0; i < lista.length; i++) {
        var a = lista[i];
        if (!a.name || nomesEx.indexOf(a.name.toLowerCase().trim()) !== -1) continue;
        await DoaVidaSync.addAlimento({
          name:    a.name,
          goal:    a.goal    || 0,
          kg:      a.kg      || 0,
          img:     a.img     || '',
          emoji:   a.emoji   || '🥫',
          peso:    a.peso    || 1,
          unidade: a.unidade || 'kg'
        });
        migrados++;
      }
      return { ok: true, migrados: migrados };
    } catch (e) { return { ok: false, msg: e.message }; }
  },

  /* ── EMAIL ── */
  notificarEmail: async function () {},

  EMAILJS_SERVICE_ID:  '',
  EMAILJS_TEMPLATE_ID: '',
  EMAILJS_PUBLIC_KEY:  '',
};

window.DoaVidaSync = DoaVidaSync;

/* Auto-inicializa ao carregar */
DoaVidaSync.init();
