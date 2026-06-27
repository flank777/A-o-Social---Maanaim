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

var _db   = null;
var _auth = null;

/* ── Inicialização ────────────────────────────────────────────────── */
function inicializarFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.error('[DoaVida] Firebase SDK não carregado. Verifique os scripts no HTML.');
      return false;
    }
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(_firebaseConfig);
    }
    _db   = firebase.firestore();
    _auth = firebase.auth();
    window._doaVidaFirestoreOk = true;
    console.log('[DoaVida] ✅ Firebase Auth + Firestore conectados — projeto: acao-social-ab5a6');
    return true;
  } catch (e) {
    console.error('[DoaVida] Erro ao inicializar Firebase:', e.message);
    return false;
  }
}

function inicializarSupabase() { return inicializarFirebase(); }
window.inicializarSupabase = inicializarSupabase;

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

/* Lê todos os documentos de uma coleção, ordenados por campo.
   Antes, uma falha ou timeout na primeira tentativa virava lista vazia
   sem nenhum aviso — parecia que os dados tinham "desaparecido" (eram
   removidos do retorno por uma conexao lenta, nao do banco). Agora
   tenta de novo uma vez antes de desistir, e sempre avisa no console. */
async function _getAll(colecao, orderField) {
  function tentar() {
    var q = orderField
      ? _db.collection(colecao).orderBy(orderField, 'desc')
      : _db.collection(colecao);
    return _withTimeout(q.get(), 12000, null);
  }
  try {
    var snap = await tentar();
    if (!snap || !snap.docs) {
      console.warn('[DoaVida]', colecao, '- 1a tentativa falhou ou expirou (12s), tentando novamente...');
      await new Promise(function (resolve) { setTimeout(resolve, 1200); });
      snap = await tentar();
    }
    if (!snap || !snap.docs) {
      console.error('[DoaVida]', colecao, '- nao foi possivel carregar apos 2 tentativas (conexao lenta ou indisponivel).');
      return [];
    }
    /* { id: d.id } vem por ÚLTIMO de propósito: o ID real do documento no Firestore
       nunca pode ser sobrescrito por um campo "id" que tenha sido salvo (por engano)
       dentro dos próprios dados do documento. */
    return snap.docs.map(function (d) { return Object.assign({}, d.data(), { id: d.id }); });
  } catch (e) {
    console.error('[DoaVida]', colecao, e.message);
    return [];
  }
}

/* Adiciona um documento (ID gerado pelo Firestore) */
async function _insert(colecao, payload) {
  var dados = Object.assign({}, payload, { created_at: _now() });
  var ref   = await _db.collection(colecao).add(dados);
  return Object.assign({}, dados, { id: ref.id });
}

/* Atualiza campos de um documento pelo ID (cria se não existir) */
async function _update(colecao, id, dados) {
  var atualizado = Object.assign({}, dados, { updated_at: _now() });
  await _db.collection(colecao).doc(id).set(atualizado, { merge: true });
  return Object.assign({}, atualizado, { id: id });
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
    console.log('[DoaVidaSync] ✅ Inicializado — Firebase Auth + Firestore');
    /* Carrega configurações do R2 do Firestore (se disponível) */
    setTimeout(function () {
      if (typeof DoaVidaR2 === 'undefined') return;
      DoaVidaSync.getConfig('r2_worker_url').then(function (url) {
        if (url) {
          DoaVidaSync.getConfig('r2_upload_token').then(function (token) {
            DoaVidaR2.configure({ workerUrl: url, token: token || '' });
            console.log('[DoaVidaSync] ✅ Cloudflare R2 configurado via Firestore');
          });
        }
      }).catch(function () {});
    }, 800);
    window.dispatchEvent(new CustomEvent('DoaVidaSyncPronto'));
  },

  /* ── AUTENTICAÇÃO (Firebase Auth real) ── */

  /*
    Login com e-mail e senha via Firebase Authentication.
    @param {string} email
    @param {string} senha
    @returns {Promise<Object>} usuário Firebase
  */
  login: async function (email, senha) {
    if (!_auth) throw new Error('Firebase Auth não inicializado.');
    var result = await _auth.signInWithEmailAndPassword(email, senha);
    return result.user;
  },

  /* Logout via Firebase Authentication */
  logout: async function () {
    if (_auth) await _auth.signOut();
    if (typeof DoaVidaAPI !== 'undefined') DoaVidaAPI.encerrarSessao();
  },

  /* Retorna o usuário autenticado atual (ou null) */
  getUsuarioAtual: function () {
    return (_auth && _auth.currentUser) ? _auth.currentUser : null;
  },

  /* Escuta mudanças de estado de autenticação */
  onAuthChange: function (callback) {
    if (_auth) _auth.onAuthStateChanged(callback);
  },

  /* verificarSenha mantida para compatibilidade — delega ao Firebase Auth */
  verificarSenha: async function (senha) {
    /* Não usada com Firebase Auth real — login usa email+senha direto */
    return false;
  },

  /* ── ALIMENTOS ── */
  getAlimentos: async function () {
    return _getAll('alimentos', 'name');
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

  getTarefas:   async function ()          { return _getAll('tarefas', 'created_at'); },
  addTarefa:    async function (dados)     { return _insert('tarefas', dados); },
  updateTarefa: async function (id, dados) { return _update('tarefas', id, dados); },
  deleteTarefa: async function (id)        { return _delete('tarefas', id); },

  getEventos:   async function ()          { return _getAll('eventos', 'data'); },
  addEvento:    async function (dados)     { return _insert('eventos', dados); },
  updateEvento: async function (id, dados) { return _update('eventos', id, dados); },
  deleteEvento: async function (id)        { return _delete('eventos', id); },

  getWhatsappAdmins:    async function ()          { return _getAll('whatsapp_admins', 'created_at'); },
  addWhatsappAdmin:     async function (dados)     { return _insert('whatsapp_admins', dados); },
  updateWhatsappAdmin:  async function (id, dados) { return _update('whatsapp_admins', id, dados); },
  deleteWhatsappAdmin:  async function (id)        { return _delete('whatsapp_admins', id); },
  getWhatsappLogs:      async function ()          { return _getAll('whatsapp_logs', 'created_at'); },
  addWhatsappLog:       async function (dados)     { return _insert('whatsapp_logs', dados); },

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

  /* Upload → R2 (preferencial) ou Cloudinary (fallback) */
  uploadImagemGaleria: async function (arquivo, pasta) {
    /* Tenta Cloudflare R2 primeiro */
    if (typeof DoaVidaR2 !== 'undefined' && DoaVidaR2.configurado()) {
      var pastaR2 = pasta && pasta.indexOf('alimento') >= 0 ? 'alimentos'
                  : pasta && pasta.indexOf('banner')   >= 0 ? 'banners'
                  : pasta && pasta.indexOf('voluntar') >= 0 ? 'voluntarios'
                  : 'galeria';
      var res = await DoaVidaR2.upload(arquivo, pastaR2);
      return res.url;
    }
    /* Fallback: Cloudinary */
    if (typeof DoaVidaCloudinary !== 'undefined') {
      var tipo = arquivo.type.startsWith('video/') ? 'video' : 'image';
      var resultado = await DoaVidaCloudinary.upload(arquivo, tipo);
      return resultado.url;
    }
    throw new Error('Nenhum serviço de upload configurado. Configure Cloudflare R2 ou Cloudinary.');
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

  /* ── DONA ASSUNCAO (base do backend FastAPI/Firebase) ── */
  getDonaBackendUrl: async function () {
    var url = await DoaVidaSync.getConfig('dona_assuncao_backend_url');
    return String(url || '').replace(/\/+$/, '');
  },

  setDonaBackendUrl: async function (url) {
    await DoaVidaSync.setConfig('dona_assuncao_backend_url', String(url || '').replace(/\/+$/, ''));
  },

  getDonaBaseConhecimento: async function () {
    try {
      var snap = await _withTimeout(_db.collection('base_conhecimento').get(), 12000, null);
      if (!snap || !snap.docs) return [];
      return snap.docs.map(function (d) {
        return Object.assign({}, d.data(), { id: d.id });
      });
    } catch (e) {
      console.warn('[DoaVidaSync] Dona Assuncao base_conhecimento indisponivel:', e.message);
      return [];
    }
  },

  getDonaCampanhasAtivas: async function () {
    try {
      var q = _db.collection('campanhas').where('ativa', '==', true);
      var snap = await _withTimeout(q.get(), 12000, null);
      if (!snap || !snap.docs) return [];
      return snap.docs.map(function (d) {
        return Object.assign({}, d.data(), { id: d.id });
      });
    } catch (e) {
      console.warn('[DoaVidaSync] Dona Assuncao campanhas indisponiveis:', e.message);
      return [];
    }
  },

  getDonaConversa: async function (userId) {
    try {
      var doc = await _db.collection('conversas').doc(String(userId || 'web:anonimo')).get();
      return doc.exists ? Object.assign({}, doc.data(), { id: doc.id }) : null;
    } catch (e) {
      return null;
    }
  },

  salvarDonaTurno: async function (userId, nome, msgUsuario, msgAssistente) {
    try {
      userId = String(userId || 'web:anonimo');
      var ref = _db.collection('conversas').doc(userId);
      var doc = await ref.get();
      var dados = doc.exists ? (doc.data() || {}) : {};
      var mensagens = Array.isArray(dados.mensagens) ? dados.mensagens.slice() : [];
      mensagens.push({ role: 'user', text: String(msgUsuario || ''), ts: _now() });
      mensagens.push({ role: 'model', text: String(msgAssistente || ''), ts: _now() });
      mensagens = mensagens.slice(-40);
      await ref.set({
        nome: nome || dados.nome || '',
        mensagens: mensagens,
        atualizado_em: _now()
      }, { merge: true });
      return true;
    } catch (e) {
      console.warn('[DoaVidaSync] Falha ao salvar conversa da Dona Assuncao:', e.message);
      return false;
    }
  },

  addDonaRegistro: async function (registro) {
    try {
      return _insert('registros', Object.assign({
        tipo: 'pergunta_sem_resposta',
        status: 'novo',
        canal: 'web'
      }, registro || {}));
    } catch (e) {
      console.warn('[DoaVidaSync] Falha ao registrar caso da Dona Assuncao:', e.message);
      return null;
    }
  },

  /* ── EMAIL (stub) ── */
  notificarEmail: async function () {},
};

window.DoaVidaSync = DoaVidaSync;

/* Auto-inicializa ao carregar */
DoaVidaSync.init();
