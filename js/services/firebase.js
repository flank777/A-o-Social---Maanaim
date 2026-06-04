/*
  DoaVida — js/services/firebase.js
  Banco de dados: Firebase Firestore (Google)
  Projeto: acao-social-ab5a6
  Plano: Spark (gratuito, nunca pausa, sem cartão)
*/

/* ── Configuração ─────────────────────────────────────────────────── */
var _firebaseConfig = {
  apiKey:            'AIzaSyBmKdkqM-YsrV9WmfrNXoUmcCepu5klp_4',
  authDomain:        'acao-social-ab5a6.firebaseapp.com',
  projectId:         'acao-social-ab5a6',
  storageBucket:     'acao-social-ab5a6.firebasestorage.app',
  messagingSenderId: '968054368178',
  appId:             '1:968054368178:web:ef6cd7a41aa109463e66ab'
};

var _db          = null;
var _localUser   = null;
var LOCAL_ADMIN_PW = (function () {
  try { return localStorage.getItem('doavida_senha') || '@maanaim1818'; } catch (e) { return '@maanaim1818'; }
})();

/* ── Inicialização ────────────────────────────────────────────────── */
function inicializarFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.error('[DoaVida] Firebase SDK não carregado. Verifique os scripts no HTML.');
      return false;
    }
    /* Evita inicializar mais de uma vez */
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(_firebaseConfig);
    }
    _db = firebase.firestore();
    window._doaVidaFirestoreOk = true;
    console.log('[DoaVida] ✅ Firebase Firestore conectado — projeto: acao-social-ab5a6');
    return true;
  } catch (e) {
    console.error('[DoaVida] Erro ao inicializar Firebase:', e.message);
    return false;
  }
}

function inicializarSupabase() { return inicializarFirebase(); }
window.inicializarSupabase = inicializarSupabase;

/* ── Auth local (compatibilidade com admin.js) ───────────────────── */
window.supabaseClient = {
  auth: {
    signInWithPassword: async function (creds) {
      var localPw = LOCAL_ADMIN_PW;
      try { localPw = localStorage.getItem('doavida_senha') || LOCAL_ADMIN_PW; } catch (_) {}
      if (creds.password === localPw) {
        _localUser = { id: 'admin', uid: 'admin', email: creds.email || 'admin@doavida.local' };
        return { data: { user: _localUser, session: { user: _localUser } }, error: null };
      }
      return { data: null, error: { message: 'E-mail ou senha inválidos.' } };
    },
    signOut:          async function () { _localUser = null; },
    getSession:       function () { return Promise.resolve({ data: { session: _localUser ? { user: _localUser } : null } }); },
    onAuthStateChange: function () {}
  },
  from: function (table) {
    if (table === 'profiles') {
      return { select: function () { return { eq: function () { return { single: function () {
        if (!_localUser) return Promise.resolve({ data: null, error: { message: 'Not authenticated' } });
        return Promise.resolve({ data: { role: 'admin', nome: _localUser.email }, error: null });
      }}}}};
    }
    /* Redireciona outras chamadas para DoaVidaSync quando possível */
    return {
      select: function () { return { order: function () { return Promise.resolve({ data: [], error: null }); } }; },
      insert: function () { return { select: function () { return { single: function () { return Promise.resolve({ data: null, error: { message: 'Use DoaVidaSync' } }); } } }; },
      update: function () { return { eq: function () { return Promise.resolve({ data: null, error: null }); } }; },
      delete: function () { return { eq: function () { return Promise.resolve({ data: null, error: null }); } }; },
      upsert: function () { return Promise.resolve({ data: null, error: null }); }
    };
  },
  channel:       function () { var ch = { on: function () { return ch; }, subscribe: function () { return ch; } }; return ch; },
  removeChannel: function () {},
  storage:       { from: function () { return { remove: async function () { return { data: null, error: null }; } }; } }
};

/* ── Helpers internos ─────────────────────────────────────────────── */
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

/* Lê todos os documentos de uma coleção, ordenados por campo */
async function _getAll(colecao, orderField) {
  try {
    var q = orderField
      ? _db.collection(colecao).orderBy(orderField, 'desc')
      : _db.collection(colecao);
    var snap = await _withTimeout(q.get(), 12000, null);
    if (!snap || !snap.docs) return [];
    return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  } catch (e) {
    console.error('[DoaVida]', colecao, e.message);
    return [];
  }
}

/* Adiciona um documento (ID gerado pelo Firestore) */
async function _insert(colecao, payload) {
  var dados = Object.assign({}, payload, { created_at: _now() });
  var ref   = await _db.collection(colecao).add(dados);
  return Object.assign({ id: ref.id }, dados);
}

/* Atualiza campos de um documento pelo ID */
async function _update(colecao, id, dados) {
  var atualizado = Object.assign({}, dados, { updated_at: _now() });
  await _db.collection(colecao).doc(id).update(atualizado);
  return Object.assign({ id: id }, atualizado);
}

/* Remove um documento pelo ID */
async function _delete(colecao, id) {
  await _db.collection(colecao).doc(id).delete();
  return true;
}

/* ══════════════════════════════════════════════════════════════════════
   DoaVidaSync — interface pública usada por form.js, admin.js e index.js
   Mantém exatamente o mesmo contrato do serviço anterior.
   ══════════════════════════════════════════════════════════════════════ */
var DoaVidaSync = {

  init: function () {
    inicializarFirebase();
    console.log('[DoaVidaSync] ✅ Inicializado — Firebase Firestore');
    window.dispatchEvent(new CustomEvent('DoaVidaSyncPronto'));
  },

  /* ── ALIMENTOS ── */
  getAlimentos: async function () {
    var lista = await _getAll('alimentos', 'name');
    if (!lista || lista.length === 0) {
      return typeof DoaVidaAPI !== 'undefined' ? DoaVidaAPI.getAlimentos() : [];
    }
    return lista;
  },

  addAlimento: async function (dados) {
    return _insert('alimentos', Object.assign({ kg: 0 }, dados));
  },

  updateAlimento: async function (id, dados) { return _update('alimentos', id, dados); },
  deleteAlimento: async function (id)        { return _delete('alimentos', id); },

  getAlimentoById: async function (id) {
    try {
      var doc = await _db.collection('alimentos').doc(id).get();
      return doc.exists ? Object.assign({ id: doc.id }, doc.data()) : null;
    } catch (e) { return null; }
  },

  /* ── DOAÇÕES ── */
  getDoacoes: async function () {
    return _getAll('doacoes', 'created_at');
  },

  addDoacao: async function (dados) {
    return _insert('doacoes', dados);
  },

  updateDoacaoStatus: async function (id, status) { return _update('doacoes', id, { status: status }); },
  updateDoacao:       async function (id, dados)  { return _update('doacoes', id, dados); },
  deleteDoacao:       async function (id)         { return _delete('doacoes', id); },

  /* ── FAMÍLIAS ── */
  getFamilias:   async function ()           { return _getAll('familias', 'created_at'); },
  addFamilia:    async function (dados)      { return _insert('familias', dados); },
  updateFamilia: async function (id, dados)  { return _update('familias', id, dados); },
  deleteFamilia: async function (id)         { return _delete('familias', id); },

  /* ── VOLUNTÁRIOS ── */
  getVoluntarios:   async function ()          { return _getAll('voluntarios', 'created_at'); },
  addVoluntario:    async function (dados)     { return _insert('voluntarios', dados); },
  updateVoluntario: async function (id, dados) { return _update('voluntarios', id, dados); },
  deleteVoluntario: async function (id)        { return _delete('voluntarios', id); },

  /* ── ORAÇÕES ── */
  getOracoes:   async function ()          { return _getAll('oracoes', 'created_at'); },
  addOracao:    async function (dados)     { return _insert('oracoes', dados); },
  updateOracao: async function (id, dados) { return _update('oracoes', id, dados); },
  deleteOracao: async function (id)        { return _delete('oracoes', id); },

  /* ── GALERIA ── */
  getGaleriaMetadata: async function () { return _getAll('galeria', 'created_at'); },
  getGaleria:         async function () { return _getAll('galeria', 'created_at'); },

  getGaleriaItemUrl: async function (id) {
    try {
      var doc = await _db.collection('galeria').doc(id).get();
      return (doc.exists && doc.data().url) ? doc.data().url : '';
    } catch (e) { return ''; }
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
      visibilidade: (foto.publica === false || foto.isPublic === false) ? 'privada' : 'publica'
    };
    return _insert('galeria', payload);
  },

  updateFotoGaleria: async function (id, dados) { return _update('galeria', id, dados); },
  deleteFotoGaleria: async function (id)        { return _delete('galeria', id); },

  /* Upload → Cloudinary (não usa Firebase Storage para evitar cobrança) */
  uploadImagemGaleria: async function (arquivo, nomeArquivo) {
    if (typeof DoaVidaCloudinary === 'undefined') {
      throw new Error('Cloudinary não carregado. Adicione js/services/cloudinary.js antes de firebase.js.');
    }
    var tipo      = arquivo.type.startsWith('video/') ? 'video' : 'image';
    var resultado = await DoaVidaCloudinary.upload(arquivo, tipo);
    return resultado.url;
  },

  /* ── MODELO CESTA ── */
  getModeloCestaItens: async function () { return _getAll('modelo_cesta_itens', 'created_at'); },

  addModeloCestaItem: async function (dados) {
    return _insert('modelo_cesta_itens', dados);
  },

  updateModeloCestaItem: async function (id, dados) { return _update('modelo_cesta_itens', id, dados); },
  deleteModeloCestaItem: async function (id)        { return _delete('modelo_cesta_itens', id); },

  /* ── CESTAS FORMADAS ── */
  getCestasFormadas:  async function ()      { return _getAll('cestas_formadas', 'created_at'); },
  addCestaFormada:    async function (dados) { return _insert('cestas_formadas', dados); },
  deleteCestaFormada: async function (id)    { return _delete('cestas_formadas', id); },

  /* ── CONFIGURAÇÕES (chave/valor) ── */
  getConfig: async function (chave) {
    try {
      var doc = await _db.collection('configuracao').doc(chave).get();
      return (doc.exists && doc.data().valor !== undefined) ? doc.data().valor : null;
    } catch (e) { return null; }
  },

  setConfig: async function (chave, valor) {
    await _db.collection('configuracao').doc(chave).set(
      { chave: chave, valor: String(valor), updated_at: _now() },
      { merge: true }
    );
  },

  getAllConfigs: async function () {
    try {
      var snap = await _db.collection('configuracao').get();
      var obj  = {};
      snap.docs.forEach(function (d) { obj[d.id] = d.data().valor; });
      return obj;
    } catch (e) { return {}; }
  },

  /* ── SENHA ADMIN ── */
  getSenha: async function () {
    var v = await DoaVidaSync.getConfig('senha_admin');
    return v || '@maanaim1818';
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

  /* ── EMAIL (stub) ── */
  notificarEmail: async function () {},
};

window.DoaVidaSync = DoaVidaSync;

/* Auto-inicializa ao carregar */
DoaVidaSync.init();
