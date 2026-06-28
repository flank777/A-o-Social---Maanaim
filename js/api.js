/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  DoaVida — js/api.js  v4.0                                          ║
  ║  CAMADA DE DADOS: tudo que o sistema salva e lê passa por aqui      ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  📚 O QUE É ESTE ARQUIVO?                                           ║
  ║                                                                      ║
  ║  Imagine este arquivo como o "banco de dados" do sistema.           ║
  ║  Todo dado (doações, voluntários, famílias...) é guardado aqui.    ║
  ║                                                                      ║
  ║  Usamos o localStorage do navegador como armazenamento.             ║
  ║  localStorage = um "armário" dentro do navegador onde podemos       ║
  ║  guardar informações que ficam salvas mesmo depois de fechar        ║
  ║  e reabrir a página.                                                 ║
  ║                                                                      ║
  ║  COMO FUNCIONA O FLUXO:                                             ║
  ║  1. Usuário faz algo (cadastrar doação, por exemplo)               ║
  ║  2. form.js chama DoaVidaAPI.addDoacao(dados)                      ║
  ║  3. api.js salva no localStorage                                    ║
  ║  4. admin.js chama DoaVidaAPI.getDoacoes()                         ║
  ║  5. api.js lê do localStorage e retorna os dados                   ║
  ║                                                                      ║
  ║  ORDEM DE CARREGAMENTO NOS HTMLs:                                   ║
  ║  ← api.js SEMPRE deve ser o PRIMEIRO script carregado →            ║
  ║  Depois: app.js → admin.js / form.js / voluntario.js               ║
  ║                                                                      ║
  ║  CHAVES DO localStorage (onde cada coisa é guardada):              ║
  ║  'doavida_foods'       → alimentos cadastrados                     ║
  ║  'doavida_donations'   → doações registradas                       ║
  ║  'doavida_families'    → famílias beneficiadas                     ║
  ║  'doavida_gallery'     → fotos da GALERIA pública                  ║
  ║  'doavida_midia_home'  → mídias da PÁGINA INICIAL (separado!)     ║
  ║  'doavida_settings'    → configurações gerais                      ║
  ║  'doavida_wa_config'   → configuração do WhatsApp                  ║
  ║  'doavida_msg_logs'    → histórico de mensagens enviadas           ║
  ║  'doavida_senha'       → senha do painel admin                     ║
  ║  'doavida_voluntarios' → voluntários cadastrados                   ║
  ║  'doavida_oracoes'     → pedidos de oração                         ║
  ║  'doavida_tarefas'     → tarefas atribuídas a voluntários (NOVO)  ║
  ║  'doavida_admin_session' → token de sessão do admin                ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 1 — NAMESPACE E CHAVES
   ══════════════════════════════════════════════════════════════════════

   NAMESPACE = um "agrupamento" para evitar conflitos de nomes.
   Em vez de ter variáveis soltas chamadas "KEYS" ou "SENHA",
   colocamos tudo dentro de "DoaVida.KEYS" e "DoaVida.SENHA_PADRAO".

   Assim, mesmo que outro script use uma variável chamada "KEYS",
   não há conflito — são objetos diferentes.
*/

/* Cria o objeto DoaVida caso ainda não exista */
var DoaVida = window.DoaVida || {};
/*
  window = o objeto global do navegador.
  window.DoaVida || {} significa:
  "Se já existe window.DoaVida, usa ele. Se não, cria um objeto vazio {}."
  Isso evita sobrescrever se outro script já tiver criado o objeto.
*/

/* Dicionário de chaves do localStorage */
DoaVida.KEYS = {
  alimentos:    'doavida_foods',          /* array de alimentos cadastrados    */
  doacoes:      'doavida_donations',      /* array de doações registradas      */
  familias:     'doavida_families',       /* array de famílias beneficiadas    */
  galeria:      'doavida_gallery',        /* array de fotos da GALERIA pública */
  midiaHome:    'doavida_midia_home',     /* array de mídias da PÁGINA INICIAL */
  settings:     'doavida_settings',       /* objeto de configurações gerais    */
  waConfig:     'doavida_wa_config',      /* configuração do WhatsApp          */
  msgLogs:      'doavida_msg_logs',       /* logs de mensagens enviadas        */
  senha:        'doavida_senha',          /* senha do painel admin             */
  voluntarios:  'doavida_voluntarios',    /* array de voluntários              */
  oracoes:      'doavida_oracoes',        /* array de pedidos de oração        */
  tarefas:      'doavida_tarefas',        /* array de tarefas                  */
  sessao:       'doavida_admin_session',  /* token de sessão do admin          */
  modeloCesta:  'doavida_modelo_cesta',   /* modelo da cesta básica padrão     */
  metaCestas:   'doavida_meta_cestas',    /* meta numérica de cestas a montar  */
};

/* Senha padrão — usada no primeiro acesso */
DoaVida.SENHA_PADRAO = '2025';

/*
  Duração da sessão admin: 8 horas em milissegundos.
  8 horas × 60 minutos × 60 segundos × 1000 milissegundos = 28.800.000 ms
*/
DoaVida.SESSAO_DURACAO_MS = 8 * 60 * 60 * 1000;

/* Configuração padrão do WhatsApp (CallMeBot — serviço gratuito) */
DoaVida.WA_CONFIG_PADRAO = {
  apikey:     '',                  /* chave da API — obtida no CallMeBot   */
  adminPhone: ['+5591986054141'],  /* número(s) que receberão notificações */
  ativo:      false,               /* false = notificações desativadas     */
};

/* Disponibiliza DoaVida globalmente para outros scripts */
window.DoaVida = DoaVida;


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 2 — FUNÇÕES BASE DO localStorage

   Três funções fundamentais usadas por TUDO:
   ● lerArray()  → lê uma lista do localStorage
   ● lerObjeto() → lê um objeto do localStorage
   ● salvar()    → grava qualquer dado no localStorage
   ══════════════════════════════════════════════════════════════════════ */

/*
  lerArray(chave)
  ───────────────
  Lê um array (lista) do localStorage pelo nome da chave.
  SEMPRE retorna um array — nunca null ou undefined.
  Se os dados estiverem corrompidos, retorna [] (lista vazia).

  Exemplo:
    lerArray('doavida_donations')
    → retorna: [{ id: '1', name: 'João', ... }, { id: '2', ... }]

  @param  {string} chave  → nome da chave (use DoaVida.KEYS.xxx)
  @returns {Array}          array de itens (pode estar vazio)
*/
function lerArray(chave) {
  try {
    /* Lê a string bruta do localStorage */
    var raw = localStorage.getItem(chave);

    /* Se não existe ainda, retorna lista vazia */
    if (!raw) return [];

    /* Converte string JSON de volta para objeto JavaScript */
    var parsed = JSON.parse(raw);
    /*
      JSON.parse() = converte uma string no formato JSON para objeto JS.
      JSON = JavaScript Object Notation = formato de texto para dados.
      O localStorage só guarda strings, então precisamos converter.
    */

    /* Garante que realmente é um array */
    return Array.isArray(parsed) ? parsed : [];

  } catch (e) {
    /* Se o JSON estiver corrompido, avisa no console e retorna vazio */
    console.warn('[DoaVida] Erro ao ler "' + chave + '":', e.message);
    return [];
  }
}

/*
  lerObjeto(chave)
  ────────────────
  Lê um objeto (não uma lista) do localStorage.
  SEMPRE retorna um objeto — nunca null.
  Se corrompido ou não existir, retorna {} (objeto vazio).

  Exemplo:
    lerObjeto('doavida_settings')
    → retorna: { meta: 500, descricao: 'Campanha 2025' }

  @param  {string} chave  → nome da chave
  @returns {Object}         objeto (pode estar vazio)
*/
function lerObjeto(chave) {
  try {
    var raw = localStorage.getItem(chave);
    if (!raw) return {};

    var parsed = JSON.parse(raw);

    /* Verifica: é objeto mas NÃO é array (arrays também são "objects" no JS) */
    var ehObjeto = parsed && typeof parsed === 'object' && !Array.isArray(parsed);
    return ehObjeto ? parsed : {};

  } catch (e) {
    console.warn('[DoaVida] Erro ao ler objeto "' + chave + '":', e.message);
    return {};
  }
}

/*
  salvar(chave, dados)
  ─────────────────────
  Salva qualquer dado no localStorage.
  Converte o dado para string JSON antes de salvar.
  Retorna true (salvou) ou false (erro — ex: armazenamento cheio).

  Exemplo:
    salvar('doavida_donations', [{ id: '1', name: 'João' }])
    → guarda a string '[ {"id":"1","name":"João"} ]' no localStorage

  @param  {string} chave  → nome da chave
  @param  {*}      dados  → qualquer valor (array, objeto, número...)
  @returns {boolean}        true = ok, false = falhou
*/
function salvar(chave, dados) {
  try {
    /* JSON.stringify() = converte objeto JS para string JSON */
    localStorage.setItem(chave, JSON.stringify(dados));
    return true;

  } catch (e) {
    /* Erro comum: localStorage cheio (limite ~5MB por domínio) */
    console.error('[DoaVida] Erro ao salvar "' + chave + '":', e.message);

    /* Avisa o usuário visualmente se o toast já estiver disponível */
    if (window.showToast) {
      window.showToast('⚠️ Armazenamento cheio. Não foi possível salvar.', 'error');
    }
    return false;
  }
}

/* Exporta as 3 funções base para o escopo global */
window.lerArray  = lerArray;
window.lerObjeto = lerObjeto;
window.salvar    = salvar;


/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 3 — CRUD PRINCIPAL (DoaVidaAPI)

   CRUD = Create (criar) + Read (ler) + Update (atualizar) + Delete (deletar)
   São as 4 operações básicas com qualquer dado.

   REGRA: nunca acesse localStorage diretamente fora deste objeto.
   Use sempre DoaVidaAPI.algumMetodo() — assim o código fica organizado.
   ══════════════════════════════════════════════════════════════════════ */

var DoaVidaAPI = {


  /* ══════════════════════════════════════════════════════════════
     3.1 — DOAÇÕES
     Registros de doações feitas pelos doadores via form.html
  ══════════════════════════════════════════════════════════════ */

  /*
    Retorna todas as doações, da mais recente para a mais antiga.
    @returns {Array} → lista de objetos de doação
  */
  getDoacoes: function () {
    return lerArray(DoaVida.KEYS.doacoes);
  },

  /*
    Adiciona uma nova doação.
    Campos obrigatórios: name (nome do doador), food (alimento), amount (kg).
    Gera automaticamente: id, status, protocolo, createdAt.
    Após salvar, notifica o admin via WhatsApp (assíncrono).

    @param  {Object} doacao → dados da doação
    @returns {Object}         doação salva com todos os campos
    @throws  {Error}          se faltar campo obrigatório
  */
  addDoacao: function (doacao) {
    /* Valida campos obrigatórios */
    if (!doacao.name || !doacao.food || !doacao.amount) {
      throw new Error('Campos obrigatórios: nome, alimento, quantidade');
    }

    /* Monta o objeto completo com valores padrão para campos opcionais */
    var nova = Object.assign({}, doacao, {
      id:        doacao.id        || window.gerarId(),
      status:    doacao.status    || 'pendente',
      protocolo: doacao.protocolo || ('DOA-' + Date.now().toString(36).toUpperCase()),
      createdAt: doacao.createdAt || new Date().toISOString(),
      /*
        new Date().toISOString() = data e hora atual no formato ISO 8601
        Exemplo: "2025-03-15T14:30:00.000Z"
        É um formato padrão universal para datas.
      */
    });

    /* Lê a lista atual, adiciona no início (mais recente primeiro) e salva */
    var doacoes = lerArray(DoaVida.KEYS.doacoes);
    doacoes.unshift(nova); /* .unshift() = adiciona no INÍCIO do array */
    salvar(DoaVida.KEYS.doacoes, doacoes);

    /* Atualiza os kg dos alimentos doados.
       Se a doação tem o array "itens" (doações novas do form.js),
       atualiza cada alimento individualmente com seu totalKg correto.
       Caso contrário (doações antigas ou manuais), usa food + amount. */
    if (nova.itens && Array.isArray(nova.itens) && nova.itens.length > 0) {
      nova.itens.forEach(function (item) {
        DoaVidaAPI._atualizarKgAlimento(item.nome, item.totalKg);
      });
    } else {
      DoaVidaAPI._atualizarKgAlimento(nova.food, nova.amount);
    }

    /* Notifica o admin por WhatsApp (assíncrono = não trava a interface) */
    DoaVidaAPI.notificarAdminWA(nova);

    return nova;
  },

  /*
    Atualiza campos de uma doação existente pelo id.
    @param  {string} id    → id da doação
    @param  {Object} dados → campos a atualizar
    @returns {Object|null}   doação atualizada ou null se não encontrada
  */
  updateDoacao: function (id, dados) {
    var doacoes    = lerArray(DoaVida.KEYS.doacoes);
    var atualizada = null;

    /* .map() cria um novo array substituindo apenas o item com o id correto */
    doacoes = doacoes.map(function (d) {
      if (d.id === id) {
        atualizada = Object.assign({}, d, dados, {
          updatedAt: new Date().toISOString(), /* registra quando foi alterado */
        });
        return atualizada;
      }
      return d; /* outros itens ficam inalterados */
    });

    if (!atualizada) {
      console.warn('[DoaVida] Doação não encontrada:', id);
      return null;
    }

    salvar(DoaVida.KEYS.doacoes, doacoes);
    return atualizada;
  },

  /*
    Remove uma doação pelo id.
    @param  {string}  id → id da doação
    @returns {boolean}     true = removida, false = não encontrada
  */
  deleteDoacao: function (id) {
    var doacoes  = lerArray(DoaVida.KEYS.doacoes);
    var original = doacoes.length;

    /*
      Guarda a doação ANTES de remover para poder decrementar os kg
      do alimento correspondente logo abaixo.
      Sem isso, o "Kg Arrecadados" ficaria inflado após a exclusão.
    */
    var doacao = doacoes.find(function (d) { return String(d.id) === String(id); });

    /* .filter() mantém todos EXCETO o item com o id alvo */
    doacoes = doacoes.filter(function (d) {
      return String(d.id) !== String(id);
    });

    /* Se o tamanho não mudou, o item não existia */
    if (doacoes.length === original) return false;

    salvar(DoaVida.KEYS.doacoes, doacoes);

    /*
      Decrementa os kg do alimento.
      Passa quantidade negativa para _atualizarKgAlimento, que já
      trata negativos clampando em 0 (nunca fica abaixo de zero).
    */
    if (doacao) {
      if (doacao.itens && Array.isArray(doacao.itens) && doacao.itens.length > 0) {
        doacao.itens.forEach(function (item) {
          DoaVidaAPI._atualizarKgAlimento(item.nome, -(parseFloat(item.totalKg) || 0));
        });
      } else if (doacao.food) {
        DoaVidaAPI._atualizarKgAlimento(doacao.food, -(parseFloat(doacao.amount) || 0));
      }
    }

    return true;
  },


  /* ══════════════════════════════════════════════════════════════
     3.2 — ALIMENTOS
     Catálogo de alimentos com meta de kg e progresso
  ══════════════════════════════════════════════════════════════ */

  /*
    Alimentos padrão — usados quando o localStorage está vazio.
    São os mesmos alimentos exibidos no formulário público.
    Qualquer alteração aqui reflete tanto no admin quanto no formulário.
  */
  ALIMENTOS_PADRAO: [
    { id:'arroz',      name:'Arroz 5kg',       peso:5,   img:'img/alimentos/arroz.webp',     goal:2000, kg:0, emoji:'🌾' },
    { id:'feijao',     name:'Feijão 1kg',       peso:1,   img:'img/alimentos/feijao.webp',    goal:800,  kg:0, emoji:'🫘' },
    { id:'macarrao',   name:'Macarrão 500g',    peso:0.5, img:'img/alimentos/macarrao.webp',  goal:500,  kg:0, emoji:'🍝' },
    { id:'oleo',       name:'Óleo de Soja 1L',  peso:1,   img:'img/alimentos/oleo.webp',      goal:400,  kg:0, emoji:'🫙' },
    { id:'acucar',     name:'Açúcar 1kg',       peso:1,   img:'img/alimentos/acucar.webp',    goal:400,  kg:0, emoji:'🍬' },
    { id:'sal',        name:'Sal 1kg',           peso:1,   img:'img/alimentos/sal.webp',       goal:200,  kg:0, emoji:'🧂' },
    { id:'farinha',    name:'Farinha de Trigo',  peso:1,   img:'img/alimentos/farinha.webp',   goal:300,  kg:0, emoji:'🌾' },
    { id:'sardinha',   name:'Sardinha 125g',     peso:0.125, img:'img/alimentos/sardinha.webp', goal:100, kg:0, emoji:'🐟' }
  ],

  /*
    Retorna os alimentos cadastrados no localStorage.
    Se não houver nenhum cadastrado, retorna os alimentos padrão.
    Se houver alimentos customizados mas faltar algum padrão (ex: localStorage
    foi corrompido na primeira adição), mescla automaticamente para não perder
    nenhum item padrão — isso garante que as doações sempre encontrem o alimento.
  */
  getAlimentos: function () {
    var alimentos = lerArray(DoaVida.KEYS.alimentos);
    /* Sem nada no storage → retorna padrão completo */
    if (!alimentos || alimentos.length === 0) {
      return DoaVidaAPI.ALIMENTOS_PADRAO.map(function(a){ return Object.assign({},a); });
    }
    /* Verifica se algum item padrão está faltando e mescla */
    var idsExistentes = alimentos.map(function(a){ return a.id; });
    var faltando = DoaVidaAPI.ALIMENTOS_PADRAO.filter(function(p){
      return idsExistentes.indexOf(p.id) === -1;
    });
    if (faltando.length > 0) {
      /* Re-insere os padrões faltantes no final e persiste */
      alimentos = alimentos.concat(faltando.map(function(p){ return Object.assign({},p); }));
      salvar(DoaVida.KEYS.alimentos, alimentos);
    }
    return alimentos;
  },

  addAlimento: function (alimento) {
    if (!alimento.name || !alimento.goal) {
      throw new Error('Nome e meta (kg) são obrigatórios');
    }

    /* Valores padrão para campos não informados */
    var novo = Object.assign({
      id:       alimento.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      kg:       0,         /* começa com 0 kg arrecadados        */
      emoji:    '🥫',      /* ícone padrão                       */
      families: 0,         /* quantas famílias beneficiadas      */
      img:      '',        /* URL de imagem do alimento          */
    }, alimento);

    var alimentos = lerArray(DoaVida.KEYS.alimentos);
    /* Se localStorage estiver vazio, semeia com os padrões para não perdê-los */
    if (!alimentos || alimentos.length === 0) {
      alimentos = DoaVidaAPI.ALIMENTOS_PADRAO.map(function(a) { return Object.assign({}, a); });
    }

    /* Impede duplicatas pelo nome (ignora maiúsculas/minúsculas) */
    var duplicado = alimentos.some(function (a) {
      return a.name.toLowerCase() === novo.name.toLowerCase();
    });
    if (duplicado) throw new Error('Já existe um alimento com este nome');

    alimentos.unshift(novo);
    salvar(DoaVida.KEYS.alimentos, alimentos);
    return novo;
  },

  updateAlimento: function (id, dados) {
    var alimentos  = lerArray(DoaVida.KEYS.alimentos);
    /* Se localStorage estiver vazio, semeia com os padrões para não perdê-los */
    if (!alimentos || alimentos.length === 0) {
      alimentos = DoaVidaAPI.ALIMENTOS_PADRAO.map(function(a) { return Object.assign({}, a); });
    }
    var atualizado = null;

    alimentos = alimentos.map(function (a) {
      if ((a.id || a.name) === id) {
        atualizado = Object.assign({}, a, dados);
        return atualizado;
      }
      return a;
    });

    if (!atualizado) return null;
    salvar(DoaVida.KEYS.alimentos, alimentos);
    return atualizado;
  },

  deleteAlimento: function (id) {
    var alimentos = lerArray(DoaVida.KEYS.alimentos);
    /* Se localStorage estiver vazio, semeia com os padrões para não perdê-los */
    if (!alimentos || alimentos.length === 0) {
      alimentos = DoaVidaAPI.ALIMENTOS_PADRAO.map(function(a) { return Object.assign({}, a); });
    }
    var filtrados = alimentos.filter(function (a) {
      return (a.id || a.name) !== id;
    });
    if (filtrados.length === alimentos.length) return false;
    salvar(DoaVida.KEYS.alimentos, filtrados);
    return true;
  },


  /* ══════════════════════════════════════════════════════════════
     3.3 — FAMÍLIAS
     Cadastro das famílias beneficiadas pelas doações
  ══════════════════════════════════════════════════════════════ */

  getFamilias: function () {
    return lerArray(DoaVida.KEYS.familias);
  },

  addFamilia: function (familia) {
    if (!familia.name || !familia.phone || !familia.endereco) {
      throw new Error('Nome, telefone e endereço são obrigatórios');
    }
    var nova = Object.assign({
      id:      window.gerarId ? window.gerarId() : Date.now().toString(),
      pessoas: 0,
      obs:     '',
      ativa:   true,
    }, familia, {
      createdAt: new Date().toISOString(),
    });

    var familias = lerArray(DoaVida.KEYS.familias);
    familias.unshift(nova);
    salvar(DoaVida.KEYS.familias, familias);
    return nova;
  },

  updateFamilia: function (id, dados) {
    var familias   = lerArray(DoaVida.KEYS.familias);
    var atualizada = null;
    familias = familias.map(function (f) {
      if (f.id === id) {
        atualizada = Object.assign({}, f, dados, { updatedAt: new Date().toISOString() });
        return atualizada;
      }
      return f;
    });
    if (!atualizada) return null;
    salvar(DoaVida.KEYS.familias, familias);
    return atualizada;
  },

  deleteFamilia: function (id) {
    var familias  = lerArray(DoaVida.KEYS.familias);
    var filtradas = familias.filter(function (f) { return f.id !== id; });
    if (filtradas.length === familias.length) return false;
    salvar(DoaVida.KEYS.familias, filtradas);
    return true;
  },


  /* ══════════════════════════════════════════════════════════════
     3.4 — GALERIA PÚBLICA
     Fotos e vídeos exibidos na galeria da página index.html

     SEPARADO da Mídia da Página Inicial (seção 3.5).
     Isso resolve o problema de desorganização de mídias.
  ══════════════════════════════════════════════════════════════ */

  /*
    Retorna fotos da galeria.
    @param {boolean} apenasPublicas → se true, filtra só as públicas
  */
  getGaleria: function (apenasPublicas) {
    var galeria = lerArray(DoaVida.KEYS.galeria);
    if (apenasPublicas) {
      return galeria.filter(function (g) { return g.isPublic !== false; });
    }
    return galeria;
  },

  /**
   * addFotoGaleria — Adiciona um item à galeria com todos os campos padronizados.
   * @param {Object} foto — Objeto com os dados da mídia
   * @param {string} foto.url — URL ou base64 da imagem/vídeo (obrigatório)
   * @param {string} [foto.title] — Título exibido na galeria e no modal
   * @param {string} [foto.description] — Descrição detalhada do item
   * @param {string} [foto.context] — Contexto (ex: "Campanha Natal 2024")
   * @param {string} [foto.category] — Categoria: 'galeria' | 'home' | 'logo'
   * @param {string} [foto.mediaType] — Tipo de mídia: 'imagem' | 'video'
   * @param {string} [foto.date] — Data do registro (ISO ou YYYY-MM-DD)
   * @param {string} [foto.layout] — Layout preferido: 'grid' | 'masonry' | 'hero'
   * @param {boolean} [foto.carousel] — Se aparece no carrossel da home
   * @param {boolean} [foto.isPublic] — Se é visível publicamente
   * @returns {Object} O item criado com todos os campos preenchidos
   */
  addFotoGaleria: function (foto) {
    /* Validação: url é o único campo obrigatório */
    if (!foto.url) throw new Error('URL da foto é obrigatória');

    /* Mescla valores padrão → dados do usuário → metadados automáticos */
    var nova = Object.assign(
      {
        titulo: '',          /* campo legado — mantido por compatibilidade */
        desc: '',            /* campo legado — mantido por compatibilidade */
        title: '',           /* título novo padronizado */
        description: '',     /* descrição nova padronizada */
        context: '',         /* contexto (evento, campanha, etc.) */
        category: 'galeria', /* categoria: galeria | home | logo */
        mediaType: 'imagem', /* tipo de mídia: imagem | video */
        date: '',            /* data do registro */
        layout: 'grid',      /* layout sugerido: grid | masonry | hero */
        carousel: false,     /* exibir no carrossel da home? */
        isPublic: true,      /* visível publicamente? */
        tipo: 'galeria'      /* campo legado — mantido por compatibilidade */
      },
      foto,
      { createdAt: new Date().toISOString() } /* data de criação automática */
    );

    /* Insere no início da galeria (mais recente primeiro) */
    var galeria = lerArray(DoaVida.KEYS.galeria);
    galeria.unshift(nova);
    salvar(DoaVida.KEYS.galeria, galeria);
    return nova;
  },

  /**
   * updateFotoGaleria — Atualiza um item existente na galeria pelo índice.
   * @param {number} index — Posição do item no array
   * @param {Object} dados — Campos a atualizar (parcial, usa Object.assign)
   * @returns {Object|false} O item atualizado ou false se índice inválido
   */
  updateFotoGaleria: function (index, dados) {
    var galeria = lerArray(DoaVida.KEYS.galeria);
    if (!galeria[index]) return false; /* índice inválido */
    Object.assign(galeria[index], dados); /* mescla alterações */
    salvar(DoaVida.KEYS.galeria, galeria);
    return galeria[index];
  },

  /*
    Mantido por compatibilidade com código existente.
    Chama addFotoGaleria internamente.
  */
  addFoto: function (foto) {
    return DoaVidaAPI.addFotoGaleria(foto);
  },

  toggleFotoVisibilidade: function (index) {
    var galeria = lerArray(DoaVida.KEYS.galeria);
    if (!galeria[index]) return false;
    galeria[index].isPublic = !galeria[index].isPublic;
    salvar(DoaVida.KEYS.galeria, galeria);
    return galeria[index].isPublic;
  },

  deleteFoto: function (index) {
    var galeria = lerArray(DoaVida.KEYS.galeria);
    if (index < 0 || index >= galeria.length) return false;
    galeria.splice(index, 1); /* .splice(i, 1) = remove 1 item na posição i */
    salvar(DoaVida.KEYS.galeria, galeria);
    return true;
  },


  /* ══════════════════════════════════════════════════════════════
     3.5 — MÍDIA DA PÁGINA INICIAL
     Imagens/vídeos do carrossel/destaque do index.html.

     SEPARADO da Galeria (seção 3.4) para evitar confusão.
     O admin pode gerenciar cada seção de forma independente.
  ══════════════════════════════════════════════════════════════ */

  getMidiaHome: function () {
    return lerArray(DoaVida.KEYS.midiaHome);
  },

  addMidiaHome: function (midia) {
    if (!midia.url) throw new Error('URL da mídia é obrigatória');
    var nova = Object.assign(
      { titulo: '', desc: '', tipo: 'imagem', ativo: true },
      midia,
      { createdAt: new Date().toISOString() }
    );
    var lista = lerArray(DoaVida.KEYS.midiaHome);
    lista.unshift(nova);
    salvar(DoaVida.KEYS.midiaHome, lista);
    return nova;
  },

  deleteMidiaHome: function (index) {
    var lista = lerArray(DoaVida.KEYS.midiaHome);
    if (index < 0 || index >= lista.length) return false;
    lista.splice(index, 1);
    salvar(DoaVida.KEYS.midiaHome, lista);
    return true;
  },

  toggleMidiaHomeAtivo: function (index) {
    var lista = lerArray(DoaVida.KEYS.midiaHome);
    if (!lista[index]) return false;
    lista[index].ativo = !lista[index].ativo;
    salvar(DoaVida.KEYS.midiaHome, lista);
    return lista[index].ativo;
  },


  /* ══════════════════════════════════════════════════════════════
     3.6 — CONFIGURAÇÕES GERAIS
  ══════════════════════════════════════════════════════════════ */

  getSettings: function () {
    return lerObjeto(DoaVida.KEYS.settings);
  },

  updateSettings: function (novasConfigs) {
    var atual      = lerObjeto(DoaVida.KEYS.settings);
    var atualizado = Object.assign({}, atual, novasConfigs);
    salvar(DoaVida.KEYS.settings, atualizado);
    return atualizado;
  },


  /* ══════════════════════════════════════════════════════════════
     3.7 — WHATSAPP (CallMeBot)
  ══════════════════════════════════════════════════════════════ */

  getWaConfig: function () {
    var salvo = lerObjeto(DoaVida.KEYS.waConfig);
    /* Mescla com os padrões para garantir todos os campos */
    return Object.assign({}, DoaVida.WA_CONFIG_PADRAO, salvo);
  },

  updateWaConfig: function (config) {
    var atual = DoaVidaAPI.getWaConfig();
    var novo  = Object.assign({}, atual, config);
    salvar(DoaVida.KEYS.waConfig, novo);
    return novo;
  },

  getLogs: function () {
    return lerArray(DoaVida.KEYS.msgLogs);
  },

  addLog: function (log) {
    var logs = lerArray(DoaVida.KEYS.msgLogs);
    logs.unshift(Object.assign({}, log, { createdAt: new Date().toISOString() }));
    /* Mantém apenas os últimos 100 registros para não lotar o localStorage */
    if (logs.length > 100) logs = logs.slice(0, 100);
    salvar(DoaVida.KEYS.msgLogs, logs);
  },


  /* ══════════════════════════════════════════════════════════════
     3.8 — AUTENTICAÇÃO ADMIN

     ✅ Usa localStorage (não sessionStorage) com expiração de 8h.
     sessionStorage seria isolado por aba — causava o bug do login.
     localStorage é compartilhado entre abas do mesmo navegador.

     Estrutura do token salvo:
     {
       token:      'authenticated',   → valor fixo que identifica sessão válida
       expiresAt:  1710516000000,     → timestamp de quando expira (ms)
       iniciadaEm: '2025-03-15...'   → para registro/auditoria
     }
  ══════════════════════════════════════════════════════════════ */

  /*
    Verifica se a senha digitada está correta.
    Compara com a senha salva no localStorage (ou a padrão '2025').
  */
  verificarSenha: function (senhaDigitada) {
    var salva = localStorage.getItem(DoaVida.KEYS.senha) || DoaVida.SENHA_PADRAO;
    return senhaDigitada === salva;
  },

  /*
    Altera a senha do admin.
    Exige a senha atual para confirmar a troca.
  */
  alterarSenha: function (senhaAtual, novaSenha) {
    if (!DoaVidaAPI.verificarSenha(senhaAtual)) {
      throw new Error('Senha atual incorreta');
    }
    if (!novaSenha || novaSenha.length < 4) {
      throw new Error('Nova senha deve ter pelo menos 4 caracteres');
    }
    localStorage.setItem(DoaVida.KEYS.senha, novaSenha);
    return true;
  },

  /*
    Verifica se há uma sessão admin válida e não expirada.
    Renova a expiração a cada verificação (sliding window):
    enquanto o admin está ativo, a sessão nunca expira.
  */
  verificarSessao: function () {
    try {
      var raw = localStorage.getItem(DoaVida.KEYS.sessao);
      if (!raw) return false; /* sem token = não autenticado */

      var token = JSON.parse(raw);

      /* Token malformado? */
      if (!token || token.token !== 'authenticated') return false;

      /* Token expirado? */
      if (!token.expiresAt || Date.now() > token.expiresAt) {
        localStorage.removeItem(DoaVida.KEYS.sessao);
        console.log('[DoaVida] Sessão admin expirada — faça login novamente.');
        return false;
      }

      /* Renova a expiração (sliding window) */
      token.expiresAt = Date.now() + DoaVida.SESSAO_DURACAO_MS;
      localStorage.setItem(DoaVida.KEYS.sessao, JSON.stringify(token));

      return true; /* ✅ sessão válida */

    } catch (e) {
      localStorage.removeItem(DoaVida.KEYS.sessao);
      return false;
    }
  },

  /* Inicia a sessão após login bem-sucedido */
  iniciarSessao: function () {
    var token = {
      token:      'authenticated',
      expiresAt:  Date.now() + DoaVida.SESSAO_DURACAO_MS,
      iniciadaEm: new Date().toISOString(),
    };
    localStorage.setItem(DoaVida.KEYS.sessao, JSON.stringify(token));
    console.log('[DoaVida] ✅ Sessão admin iniciada — expira em 8 horas.');
  },

  /* Encerra a sessão (logout) */
  encerrarSessao: function () {
    localStorage.removeItem(DoaVida.KEYS.sessao);
    console.log('[DoaVida] Sessão admin encerrada.');
  },


  /* ══════════════════════════════════════════════════════════════
     3.9 — VOLUNTÁRIOS
     Estrutura de cada voluntário:
     {
       id        : string  → ID único
       nome      : string  → nome completo
       telefone  : string  → com máscara (91) 99999-9999
       tipo      : string  → 'intercessao' | 'voluntario' | 'doacao' | 'logistica'
       tipoLabel : string  → texto legível do tipo
       status    : string  → 'novo' | 'em-contato' | 'confirmado' | 'participando' | 'finalizado'
       createdAt : string  → data ISO de cadastro
       updatedAt : string  → data ISO da última atualização
       dados     : Object  → campos extras por tipo (disponibilidade, dias, etc.)
     }
  ══════════════════════════════════════════════════════════════ */

  getVoluntarios: function () {
    return lerArray(DoaVida.KEYS.voluntarios);
  },

  getVoluntariosFiltrados: function (filtroTipo, filtroStatus) {
    var todos = lerArray(DoaVida.KEYS.voluntarios);
    if (filtroTipo) {
      todos = todos.filter(function (v) { return v.tipo === filtroTipo; });
    }
    if (filtroStatus) {
      todos = todos.filter(function (v) { return v.status === filtroStatus; });
    }
    return todos;
  },

  addVoluntario: function (dados) {
    if (!dados.nome || !dados.tipo) {
      throw new Error('Nome e tipo de ajuda são obrigatórios');
    }
    var novo = {
      id:        window.gerarId ? window.gerarId() : Date.now().toString(),
      nome:      dados.nome,
      telefone:  dados.telefone  || '',
      tipo:      dados.tipo,
      tipoLabel: dados.tipoLabel || dados.tipo,
      status:    'novo',                      /* status inicial sempre 'novo' */
      dados:     dados.dados     || {},        /* campos extras por tipo       */
      createdAt: new Date().toISOString(),
    };
    var voluntarios = lerArray(DoaVida.KEYS.voluntarios);
    voluntarios.unshift(novo);
    salvar(DoaVida.KEYS.voluntarios, voluntarios);
    console.log('[DoaVida] ✅ Voluntário salvo:', novo.id, '—', novo.nome);
    return novo;
  },

  updateStatusVoluntario: function (id, novoStatus) {
    var voluntarios = lerArray(DoaVida.KEYS.voluntarios);
    var atualizado  = null;
    voluntarios = voluntarios.map(function (v) {
      if (v.id === id) {
        atualizado = Object.assign({}, v, {
          status:    novoStatus,
          updatedAt: new Date().toISOString(),
        });
        return atualizado;
      }
      return v;
    });
    if (!atualizado) return null;
    salvar(DoaVida.KEYS.voluntarios, voluntarios);
    return atualizado;
  },

  deleteVoluntario: function (id) {
    var voluntarios = lerArray(DoaVida.KEYS.voluntarios);
    var filtrados   = voluntarios.filter(function (v) { return v.id !== id; });
    if (filtrados.length === voluntarios.length) return false;
    salvar(DoaVida.KEYS.voluntarios, filtrados);
    return true;
  },

  getEstatisticasVoluntarios: function () {
    var todos = lerArray(DoaVida.KEYS.voluntarios);
    return todos.reduce(function (acc, v) {
      acc.total++;
      var st = v.status || 'novo';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, { total: 0, novo: 0, 'em-contato': 0, confirmado: 0, participando: 0, finalizado: 0 });
  },


  /* ══════════════════════════════════════════════════════════════
     3.10 — PEDIDOS DE ORAÇÃO
     Estrutura:
     {
       id         : string  → ID único
       nome       : string  → nome (pode ser 'Anônimo')
       categoria  : string  → 'familia' | 'espiritual' | 'saude' | 'outros'
       mensagem   : string  → texto do pedido
       status     : string  → 'precisa-oracao' | 'orando'
       createdAt  : string  → data ISO
     }
  ══════════════════════════════════════════════════════════════ */

  getOracoes: function () {
    return lerArray(DoaVida.KEYS.oracoes);
  },

  getOracoesFiltradas: function (filtroCategoria, filtroStatus) {
    var todos = lerArray(DoaVida.KEYS.oracoes);
    if (filtroCategoria) {
      todos = todos.filter(function (o) { return o.categoria === filtroCategoria; });
    }
    if (filtroStatus) {
      todos = todos.filter(function (o) { return o.status === filtroStatus; });
    }
    return todos;
  },

  addOracao: function (dados) {
    if (!dados.categoria || !dados.mensagem) {
      throw new Error('Categoria e mensagem são obrigatórias');
    }
    var novo = {
      id:        window.gerarId ? window.gerarId() : Date.now().toString(),
      nome:      dados.nome      || 'Anônimo',
      categoria: dados.categoria,
      mensagem:  dados.mensagem,
      status:    'precisa-oracao',
      createdAt: new Date().toISOString(),
    };
    var oracoes = lerArray(DoaVida.KEYS.oracoes);
    oracoes.unshift(novo);
    salvar(DoaVida.KEYS.oracoes, oracoes);
    return novo;
  },

  updateStatusOracao: function (id, novoStatus) {
    var oracoes    = lerArray(DoaVida.KEYS.oracoes);
    var atualizado = null;
    oracoes = oracoes.map(function (o) {
      if (o.id === id) {
        atualizado = Object.assign({}, o, {
          status:    novoStatus,
          updatedAt: new Date().toISOString(),
        });
        return atualizado;
      }
      return o;
    });
    if (!atualizado) return null;
    salvar(DoaVida.KEYS.oracoes, oracoes);
    return atualizado;
  },

  deleteOracao: function (id) {
    var oracoes   = lerArray(DoaVida.KEYS.oracoes);
    var filtrados = oracoes.filter(function (o) { return o.id !== id; });
    if (filtrados.length === oracoes.length) return false;
    salvar(DoaVida.KEYS.oracoes, filtrados);
    return true;
  },


  /* ══════════════════════════════════════════════════════════════
     3.11 — TAREFAS (NOVO)
     Controle de atividades atribuídas a voluntários.
     Estrutura de cada tarefa:
     {
       id           : string  → ID único
       titulo       : string  → nome da tarefa
       descricao    : string  → detalhamento
       data         : string  → data no formato YYYY-MM-DD
       horario      : string  → horário no formato HH:MM
       local        : string  → onde será realizada
       tipo         : string  → 'organizacao'|'entrega'|'atendimento'|'espiritual'
       responsavelId: string  → id do voluntário responsável
       responsavel  : string  → nome (para facilitar exibição)
       status       : string  → 'pendente' | 'em-andamento' | 'concluida'
       obs          : string  → observações adicionais
       createdAt    : string  → data ISO de criação
       updatedAt    : string  → data ISO da última alteração
     }
  ══════════════════════════════════════════════════════════════ */

  getTarefas: function () {
    return lerArray(DoaVida.KEYS.tarefas);
  },

  getTarefasFiltradas: function (filtroStatus, filtroTipo, filtroResponsavel) {
    var todas = lerArray(DoaVida.KEYS.tarefas);

    /* Aplica cada filtro separadamente */
    if (filtroStatus) {
      todas = todas.filter(function (t) { return t.status === filtroStatus; });
    }
    if (filtroTipo) {
      todas = todas.filter(function (t) { return t.tipo === filtroTipo; });
    }
    if (filtroResponsavel) {
      todas = todas.filter(function (t) { return t.responsavelId === filtroResponsavel; });
    }

    return todas;
  },

  /*
    Retorna as tarefas de um voluntário específico.
    Usado para mostrar o histórico no painel do voluntário.
  */
  getTarefasDoVoluntario: function (idVoluntario) {
    var todas = lerArray(DoaVida.KEYS.tarefas);
    return todas.filter(function (t) { return t.responsavelId === idVoluntario; });
  },

  addTarefa: function (dados) {
    if (!dados.titulo) {
      throw new Error('O título da tarefa é obrigatório');
    }

    var nova = {
      id:            window.gerarId ? window.gerarId() : Date.now().toString(),
      titulo:        dados.titulo,
      descricao:     dados.descricao     || '',
      data:          dados.data          || '',
      horario:       dados.horario       || '',
      local:         dados.local         || '',
      tipo:          dados.tipo          || 'organizacao',
      responsavelId: dados.responsavelId || '',
      responsavel:   dados.responsavel   || 'Não atribuído',
      status:        'pendente',          /* sempre começa como pendente */
      obs:           dados.obs           || '',
      createdAt:     new Date().toISOString(),
    };

    var tarefas = lerArray(DoaVida.KEYS.tarefas);
    tarefas.unshift(nova);
    salvar(DoaVida.KEYS.tarefas, tarefas);
    console.log('[DoaVida] ✅ Tarefa criada:', nova.id, '—', nova.titulo);
    return nova;
  },

  updateTarefa: function (id, dados) {
    var tarefas    = lerArray(DoaVida.KEYS.tarefas);
    var atualizada = null;

    tarefas = tarefas.map(function (t) {
      if (t.id === id) {
        atualizada = Object.assign({}, t, dados, {
          updatedAt: new Date().toISOString(),
        });
        return atualizada;
      }
      return t;
    });

    if (!atualizada) return null;
    salvar(DoaVida.KEYS.tarefas, tarefas);
    return atualizada;
  },

  /*
    Atualiza apenas o status de uma tarefa.
    @param  {string} id        → id da tarefa
    @param  {string} novoStatus → 'pendente' | 'em-andamento' | 'concluida'
  */
  updateStatusTarefa: function (id, novoStatus) {
    return DoaVidaAPI.updateTarefa(id, { status: novoStatus });
  },

  deleteTarefa: function (id) {
    var tarefas   = lerArray(DoaVida.KEYS.tarefas);
    var filtradas = tarefas.filter(function (t) { return t.id !== id; });
    if (filtradas.length === tarefas.length) return false;
    salvar(DoaVida.KEYS.tarefas, filtradas);
    return true;
  },

  /*
    Gera o link do WhatsApp com a mensagem da tarefa pré-preenchida.
    Basta abrir este link para o WhatsApp abrir com a mensagem pronta.

    @param  {Object} tarefa    → objeto da tarefa
    @param  {string} telefone  → número do voluntário (ex: '91999999999')
    @returns {string}            URL do WhatsApp
  */
  gerarLinkWATarefa: function (tarefa, telefone) {
    if (!telefone) return null;

    /* Remove tudo que não for dígito do telefone */
    var fone = String(telefone).replace(/\D/g, '');

    /* Monta a mensagem com todos os detalhes da tarefa */
    var msg = [
      '📋 *Tarefa DoaVida*',
      '',
      '👋 Olá, *' + (tarefa.responsavel || 'Voluntário') + '*!',
      '',
      '🎯 *Tarefa:* ' + (tarefa.titulo || '—'),
      tarefa.descricao ? '📝 *Descrição:* ' + tarefa.descricao : '',
      tarefa.data      ? '📅 *Data:* ' + DoaVidaAPI._formatarDataBR(tarefa.data) : '',
      tarefa.horario   ? '⏰ *Horário:* ' + tarefa.horario : '',
      tarefa.local     ? '📍 *Local:* ' + tarefa.local : '',
      tarefa.obs       ? '💬 *Obs:* ' + tarefa.obs : '',
      '',
      '✅ Por favor, confirme o recebimento.',
      '',
      '🌱 *Ação Social Semear + Comunidade Maanaim*',
    ].filter(Boolean).join('\n');
    /*
      .filter(Boolean) = remove linhas vazias ('', null, undefined).
      Boolean('') = false → é removido.
      Boolean('texto') = true → é mantido.
    */

    /* encodeURIComponent() = codifica caracteres especiais para URL */
    return 'whatsapp://send?phone=55' + fone + '&text=' + encodeURIComponent(msg);
  },


  /* ══════════════════════════════════════════════════════════════
     3.12 — ESTATÍSTICAS GERAIS
  ══════════════════════════════════════════════════════════════ */

  getEstatisticas: function (periodo) {
    /*
      getAlimentos() usa o fallback ALIMENTOS_PADRAO quando o localStorage
      está vazio — garante que totalKg e totalAlimentos nunca sejam zero
      por falta de dados iniciais, mesmo antes do admin cadastrar alimentos.
    */
    var alimentos = DoaVidaAPI.getAlimentos();
    var doacoes   = lerArray(DoaVida.KEYS.doacoes);
    var familias  = lerArray(DoaVida.KEYS.familias);

    /* Filtra doações pelo período se especificado */
    if (periodo && periodo !== 'total') {
      doacoes = DoaVidaAPI._filtrarPorPeriodo(doacoes, periodo);
    }

    /* Calcula totais de kg e meta */
    var totalKg   = alimentos.reduce(function (soma, a) {
      return soma + (parseFloat(a.kg)   || 0);
    }, 0);
    var metaTotal = alimentos.reduce(function (soma, a) {
      return soma + (parseFloat(a.goal) || 0);
    }, 0);

    /* Porcentagem da meta atingida (máximo 100%) */
    var pctMeta = metaTotal > 0
      ? Math.min(Math.round((totalKg / metaTotal) * 100), 100)
      : 0;

    return {
      totalDoacoes:     doacoes.length,
      totalKg:          Math.round(totalKg * 10) / 10,
      totalFamilias:    familias.length,
      totalAlimentos:   alimentos.length,
      metaTotal:        metaTotal,
      pctMeta:          pctMeta,
      mediaKgPorDoacao: doacoes.length > 0
        ? Math.round(totalKg / doacoes.length * 10) / 10
        : 0,
    };
  },


  /* ══════════════════════════════════════════════════════════════
     3.13 — NOTIFICAÇÃO WHATSAPP AO ADMIN (CallMeBot)

     A configuração (apikey/ativo) e a lista de destinatários são lidas
     do Firebase via DoaVidaSync — a mesma fonte que o painel admin usa
     para cadastrar quem recebe avisos (aba WhatsApp). Isso garante que
     o que for configurado lá realmente tenha efeito aqui, em vez de
     depender de um valor salvo só no localStorage do navegador.
  ══════════════════════════════════════════════════════════════ */

  /*
    Envia 1 mensagem via CallMeBot.

    Não usamos fetch() aqui de propósito: a API do CallMeBot não devolve o
    cabeçalho Access-Control-Allow-Origin, então fetch() falha sempre com
    "Failed to fetch" (erro de CORS) ao ser chamado direto do navegador,
    mesmo com telefone/apikey corretos (confirmado testando a API direto
    por fora do navegador — ela responde normalmente, só não libera CORS).
    A própria CallMeBot foi desenhada para ser disparada via tag <img>
    (é assim que a documentação oficial e a comunidade integram no
    browser): o navegador faz a requisição GET de qualquer forma, o que
    já é suficiente para o servidor processar e enviar a mensagem —
    só não conseguimos ler o corpo da resposta (nem precisamos).
  */
  enviarWhatsAppCallMeBot: function (telefone, apikey, mensagem) {
    var url = 'https://api.callmebot.com/whatsapp.php'
      + '?phone='  + encodeURIComponent(String(telefone || '').replace(/[^\d+]/g, ''))
      + '&text='   + encodeURIComponent(mensagem)
      + '&apikey=' + encodeURIComponent(apikey);
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var concluido = false;
      var timer = setTimeout(function () {
        if (concluido) return;
        concluido = true;
        reject(new Error('Tempo esgotado ao contatar o CallMeBot.'));
      }, 15000);
      /* onload/onerror: ambos indicam que a requisição saiu e chegou ao
         servidor — a resposta do CallMeBot é texto, nunca uma imagem
         válida, então o navegador sempre cai em onerror mesmo em caso
         de sucesso no envio. Só um erro de rede real (ex.: sem internet,
         host indisponível) chega aqui de fato sem o servidor ter processado. */
      img.onload  = function () { if (concluido) return; concluido = true; clearTimeout(timer); resolve(); };
      img.onerror = function () { if (concluido) return; concluido = true; clearTimeout(timer); resolve(); };
      img.src = url;
    });
  },

  notificarAdminWA: async function (doacao) {
    try {
      if (!window.DoaVidaSync || typeof DoaVidaSync.getWAConfig !== 'function') return;
      var cfg = await DoaVidaSync.getWAConfig();

      /* Só envia se ativado e configurado */
      if (!cfg.ativo || !cfg.apikey) {
        console.log('[DoaVida] WA: não configurado. Admin → WhatsApp → Conexão.');
        return;
      }

      var admins = typeof DoaVidaSync.getWhatsappAdmins === 'function'
        ? await DoaVidaSync.getWhatsappAdmins() : [];
      var destinatarios = admins.filter(function (a) {
        var ativo  = (a.status || 'ativo') === 'ativo';
        var avisos = Array.isArray(a.avisos) ? a.avisos : [];
        return ativo && avisos.indexOf('doacoes') >= 0 && (a.telefone || a.whatsapp);
      });
      if (!destinatarios.length) {
        console.log('[DoaVida] WA: nenhum administrador cadastrado para receber avisos de doação.');
        return;
      }

      /* Monta lista de itens doados */
      var itens = doacao.itens || [];
      var itensLinhas = itens.length > 0
        ? itens.map(function(i) {
            return '  • ' + (i.nome || i.name || '?') + ' x' + (i.qty || 1) + ' = ' + (i.totalKg || 0).toFixed(1) + 'kg';
          }).join('\n')
        : '  • ' + (doacao.food || '—');

      var totalKg = doacao.total_kg || doacao.totalKg ||
        itens.reduce(function(s, i){ return s + (i.totalKg || 0); }, 0);

      var msg = [
        '🌱 *COMPROVANTE DE DOAÇÃO*',
        '🏷️ Ação Social Semear + Maanaim',
        '━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '👤 *Doador:* ' + (doacao.name || doacao.nome || 'Anônimo'),
        '📱 *WhatsApp:* ' + (doacao.phone || doacao.telefone || 'não informado'),
        '🚚 *Entrega:* ' + DoaVidaAPI._labelEntrega(doacao.delivery),
        '🔢 *Protocolo:* ' + (doacao.protocolo || '—'),
        '📅 *Data:* ' + new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}),
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━',
        '🥫 *ITENS DOADOS:*',
        itensLinhas,
        '━━━━━━━━━━━━━━━━━━━━━━━━',
        '⚖️ *TOTAL: ' + totalKg.toFixed(1) + ' kg*',
        '',
        '🙏 Que Deus abençoe sua generosidade!',
        '✉️ Ação Social Semear + Maanaim — Belém, PA',
      ].join('\n');

      destinatarios.forEach(function (admin) {
        var phone = admin.telefone || admin.whatsapp;
        DoaVidaAPI.enviarWhatsAppCallMeBot(phone, cfg.apikey, msg)
          .then(function () {
            console.log('[DoaVida] ✅ WA enviado para ' + phone);
            if (typeof DoaVidaSync.addWhatsappLog === 'function') {
              DoaVidaSync.addWhatsappLog({ tipo: 'notificacao_doacao', destinatario: phone, status: 'enviado', detalhes: msg.substring(0, 80) });
            }
          })
          .catch(function (err) {
            console.warn('[DoaVida] ❌ Falha WA:', err.message);
            if (typeof DoaVidaSync.addWhatsappLog === 'function') {
              DoaVidaSync.addWhatsappLog({ tipo: 'notificacao_doacao', destinatario: phone, status: 'erro', detalhes: err.message });
            }
          });
      });
    } catch (e) {
      console.warn('[DoaVida] Erro ao notificar administradores via WhatsApp:', e);
    }
  },


  /* ══════════════════════════════════════════════════════════════
     3.14 — EXPORTAR / LIMPAR (backup e manutenção)
  ══════════════════════════════════════════════════════════════ */

  exportarTudo: function () {
    var dados = {};
    Object.keys(DoaVida.KEYS).forEach(function (k) {
      /* Não exporta o token de sessão (é temporário) */
      if (k === 'sessao') return;
      var chave = DoaVida.KEYS[k];
      try {
        var raw   = localStorage.getItem(chave);
        dados[k]  = raw ? JSON.parse(raw) : (
          (k === 'settings' || k === 'waConfig') ? {} : []
        );
      } catch (e) {
        dados[k] = (k === 'settings' || k === 'waConfig') ? {} : [];
      }
    });
    dados._exportadoEm = new Date().toISOString();
    dados._versao      = '4.0.0';
    return dados;
  },

  /* Gera e baixa arquivo JSON de backup */
  baixarExportacao: function () {
    var dados = DoaVidaAPI.exportarTudo();
    var json  = JSON.stringify(dados, null, 2);
    var blob  = new Blob([json], { type: 'application/json' });
    var url   = URL.createObjectURL(blob);
    var a     = document.createElement('a');
    a.href     = url;
    a.download = 'doavida-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /* Apaga todos os dados (preserva senha e sessão) */
  limparTudo: function () {
    Object.keys(DoaVida.KEYS).forEach(function (k) {
      if (k === 'senha' || k === 'sessao') return; /* preserva autenticação */
      localStorage.removeItem(DoaVida.KEYS[k]);
    });
    console.log('[DoaVida] Todos os dados apagados (senha e sessão preservadas).');
  },


  /* ══════════════════════════════════════════════════════════════
     FUNÇÕES PRIVADAS (prefixo _ = uso interno apenas)
  ══════════════════════════════════════════════════════════════ */

  /*
    Atualiza os kg arrecadados de um alimento.
    Usado em addDoacao (quantidade positiva) e deleteDoacao (negativa).

    IMPORTANTE: usa getAlimentos() em vez de lerArray() diretamente
    para garantir que o fallback ALIMENTOS_PADRAO seja considerado
    quando o localStorage ainda estiver vazio.

    O kg nunca fica negativo — Math.max(0, ...) garante isso.
  */
  _atualizarKgAlimento: function (nomeAlimento, quantidade) {
    try {
      var alimentos  = DoaVidaAPI.getAlimentos();
      var nomeNorm   = (nomeAlimento || '').toLowerCase().trim();
      var encontrado = false;

      alimentos = alimentos.map(function (a) {
        var nomeA = (a.name || '').toLowerCase().trim();
        /* Comparação flexível: exata, ou um contém o outro (ex: 'Arroz' vs 'Arroz 5kg') */
        var bate = nomeA === nomeNorm
          || nomeA.indexOf(nomeNorm) !== -1
          || nomeNorm.indexOf(nomeA) !== -1;

        if (bate && nomeNorm.length > 0) {
          encontrado = true;
          var novoKg = (parseFloat(a.kg) || 0) + (parseFloat(quantidade) || 0);
          return Object.assign({}, a, {
            kg: Math.max(0, Math.round(novoKg * 100) / 100)
          });
        }
        return a;
      });

      if (encontrado) {
        salvar(DoaVida.KEYS.alimentos, alimentos);
      } else {
        console.warn('[DoaVida] Alimento não encontrado para atualizar kg:', nomeAlimento);
      }
    } catch (e) {
      console.warn('[DoaVida] Não foi possível atualizar kg:', e.message);
    }
  },

  /*
    Recalcula o estoque (kg) de todos os alimentos a partir do zero,
    relendo todas as doações gravadas no localStorage.

    Útil para corrigir inconsistências quando:
    - Doações foram registradas antes da correção do bug (food joined)
    - O admin editou kg manualmente e quer ressincronizar com as doações reais

    Chamada automaticamente no carregamento do painel admin para garantir
    que o estoque reflete fielmente todas as doações existentes.
  */
  recalcularEstoqueAlimentos: function () {
    try {
      /* 1. Zera o kg de todos os alimentos */
      var alimentos = DoaVidaAPI.getAlimentos().map(function (a) {
        return Object.assign({}, a, { kg: 0 });
      });
      salvar(DoaVida.KEYS.alimentos, alimentos);

      /* 2. Reaplica cada doação individualmente */
      var doacoes = lerArray(DoaVida.KEYS.doacoes);
      doacoes.forEach(function (doacao) {
        if (doacao.itens && Array.isArray(doacao.itens) && doacao.itens.length > 0) {
          /* Doação nova: usa itens individuais com totalKg correto */
          doacao.itens.forEach(function (item) {
            DoaVidaAPI._atualizarKgAlimento(item.nome, item.totalKg);
          });
        } else if (doacao.food && doacao.amount) {
          /* Doação antiga: fallback — usa food + amount total */
          DoaVidaAPI._atualizarKgAlimento(doacao.food, doacao.amount);
        }
      });
    } catch (e) {
      console.warn('[DoaVida] Erro ao recalcular estoque:', e.message);
    }
  },

  /* Converte data YYYY-MM-DD para DD/MM/YYYY */
  _formatarDataBR: function (dataISO) {
    if (!dataISO) return '—';
    try {
      /* dataISO = '2025-03-15' → partes = ['2025', '03', '15'] */
      var partes = dataISO.split('-');
      if (partes.length !== 3) return dataISO;
      return partes[2] + '/' + partes[1] + '/' + partes[0];
    } catch (e) {
      return dataISO;
    }
  },

  /* Retorna texto legível da forma de entrega */
  _labelEntrega: function (val) {
    var mapa = {
      'entrega-pessoal': 'Entrega pessoal',
      'retirada':        'Retirada pela equipe',
      'a-combinar':      'A combinar via WhatsApp',
    };
    return mapa[val] || val || 'Não informado';
  },

  /* Filtra doações por janela de tempo */
  _filtrarPorPeriodo: function (doacoes, periodo) {
    var agora = new Date();
    var inicio;
    switch (periodo) {
      case 'hoje':
        inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        break;
      case 'semana':
        inicio = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'mes':
        inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
        break;
      default:
        return doacoes;
    }
    return doacoes.filter(function (d) {
      return d.createdAt && new Date(d.createdAt) >= inicio;
    });
  },

  /* ══════════════════════════════════════════════════════════════════
     SEÇÃO CESTAS BÁSICAS
     ─────────────────────────────────────────────────────────────────
     Gerencia o modelo de cesta básica padrão e calcula automaticamente
     quantas cestas completas podem ser montadas com o estoque atual.

     COMO FUNCIONA:
     1. O admin define o modelo: quais alimentos e quanto de cada um
        compõem UMA cesta (ex: 5kg arroz, 2kg feijão, 1L óleo...).
     2. O sistema compara esse modelo com o estoque atual (campo "kg"
        de cada alimento, que representa o total já arrecadado).
     3. Divide estoque / quantidade_por_cesta para cada item.
     4. O total de cestas possíveis é o MENOR valor entre todos os itens
        (o "gargalo" — o item que limita a montagem).
     ══════════════════════════════════════════════════════════════════ */

  /*
    Modelo padrão de uma cesta básica.
    Cada item tem:
      - alimentoId: ID do alimento no catálogo (deve bater com ALIMENTOS_PADRAO)
      - nome:       nome amigável exibido na tela
      - quantidade: quanto deste alimento compõe UMA cesta
      - unidade:    'kg', 'L', 'unid'
  */
  MODELO_CESTA_PADRAO: [
    { alimentoId: 'arroz',    nome: 'Arroz',           quantidade: 5,   unidade: 'kg'   },
    { alimentoId: 'feijao',   nome: 'Feijão',          quantidade: 2,   unidade: 'kg'   },
    { alimentoId: 'macarrao', nome: 'Macarrão',        quantidade: 1,   unidade: 'kg'   },
    { alimentoId: 'acucar',   nome: 'Açúcar',          quantidade: 2,   unidade: 'kg'   },
    { alimentoId: 'oleo',     nome: 'Óleo de Soja',    quantidade: 1,   unidade: 'L'    },
    { alimentoId: 'sal',      nome: 'Sal',             quantidade: 1,   unidade: 'kg'   },
    { alimentoId: 'farinha',  nome: 'Farinha de Trigo',quantidade: 1,   unidade: 'kg'   },
  ],

  /*
    Retorna o modelo de cesta salvo pelo admin.
    Se nenhum modelo foi salvo ainda, retorna o padrão acima.
  */
  getModeloCesta: function () {
    var salvo = lerArray(DoaVida.KEYS.modeloCesta);
    var modelo = (salvo && salvo.length > 0) ? salvo : DoaVidaAPI.MODELO_CESTA_PADRAO;

    /* Remove duplicatas pelo nome (case-insensitive) — mantém a última ocorrência.
       Evita que itens iguais de versões antigas dupliquem o modelo. */
    var mapaNome = {};
    var deduped  = [];
    modelo.forEach(function (item) {
      var chave = (item.nome || '').toLowerCase().trim();
      if (mapaNome[chave] !== undefined) {
        deduped[mapaNome[chave]] = null; /* marca anterior para remoção */
      }
      mapaNome[chave] = deduped.length;
      deduped.push(item);
    });
    return deduped.filter(Boolean);
  },

  /*
    Salva um novo modelo de cesta.
    @param {Array} modelo — array de itens [{alimentoId, nome, quantidade, unidade}]
    @returns {boolean} true se salvou com sucesso
  */
  saveModeloCesta: function (modelo) {
    if (!Array.isArray(modelo) || modelo.length === 0) return false;
    salvar(DoaVida.KEYS.modeloCesta, modelo);
    return true;
  },

  /* Retorna a meta de cestas definida pelo admin (0 = sem meta) */
  getMetaCestas: function () {
    var v = localStorage.getItem(DoaVida.KEYS.metaCestas);
    return v ? (parseInt(v, 10) || 0) : 0;
  },

  /* Salva a meta de cestas */
  saveMetaCestas: function (valor) {
    var n = parseInt(valor, 10) || 0;
    if (n > 0) {
      localStorage.setItem(DoaVida.KEYS.metaCestas, String(n));
    } else {
      localStorage.removeItem(DoaVida.KEYS.metaCestas);
    }
    return n;
  },

  /*
    Adiciona um item ao modelo de cesta.
    @param {Object} item — { alimentoId, nome, quantidade, unidade }
    @returns {Array} modelo atualizado
  */
  addItemCesta: function (item) {
    var modelo = DoaVidaAPI.getModeloCesta();
    /* Impede duplicata pelo alimentoId */
    var existe = modelo.some(function (i) { return i.alimentoId === item.alimentoId; });
    if (existe) throw new Error('Este alimento já está no modelo de cesta.');
    modelo.push(item);
    salvar(DoaVida.KEYS.modeloCesta, modelo);
    return modelo;
  },

  /*
    Remove um item do modelo de cesta pelo alimentoId.
    @param {string} alimentoId
    @returns {Array} modelo atualizado
  */
  removeItemCesta: function (alimentoId) {
    var modelo = DoaVidaAPI.getModeloCesta().filter(function (i) {
      return i.alimentoId !== alimentoId;
    });
    salvar(DoaVida.KEYS.modeloCesta, modelo);
    return modelo;
  },

  /*
    ─────────────────────────────────────────────────────────────────
    FUNÇÃO PRINCIPAL: calcularCestas()

    Calcula quantas cestas completas podem ser montadas com o estoque
    atual e identifica o item limitante ("gargalo").

    RETORNA um objeto com:
    {
      total:     número total de cestas possíveis (limitado pelo gargalo)
      limitante: objeto do item que está limitando (menor cestasPossiveis)
      detalhes:  array com detalhes por item [
        {
          alimentoId,
          nome,
          quantidadePorCesta,
          unidade,
          estoque,            ← kg/L disponíveis
          cestasPossiveis,    ← floor(estoque / quantidadePorCesta)
          faltaParaProxima,   ← quanto falta para montar mais 1 cesta
          percentual          ← progresso do estoque em relação ao total
                                 necessário para "total+1" cestas (para barra)
        }
      ]
    }
    ─────────────────────────────────────────────────────────────────
  */
  calcularCestas: function () {
    var modelo    = DoaVidaAPI.getModeloCesta();
    var alimentos = DoaVidaAPI.getAlimentos();

    /* Para cada item no modelo, calcula cestas possíveis e falta */
    var detalhes = modelo.map(function (item) {
      /* Procura o alimento no catálogo:
         1º) pelo alimentoId exato
         2º) pelo nome (case insensitive, sem espaços extras)
         3º) se o nome do item contém o nome do alimento ou vice-versa (parcial)
      */
      var nomeItem = (item.nome || '').toLowerCase().trim();
      var alimento = alimentos.find(function (a) {
        if (a.id === item.alimentoId) return true;
        var nomeA = (a.name || '').toLowerCase().trim();
        if (nomeA === nomeItem) return true;
        if (nomeItem && nomeA && (nomeA.indexOf(nomeItem) !== -1 || nomeItem.indexOf(nomeA) !== -1)) return true;
        return false;
      });

      /* Estoque atual = kg/unidades arrecadadas deste alimento */
      var estoque = alimento ? (parseFloat(alimento.kg) || 0) : 0;

      /* Quantas cestas completas este item permite montar */
      var cestasPossiveis = item.quantidade > 0
        ? Math.floor(estoque / item.quantidade)
        : 0;

      /* Quanto falta para completar mais 1 cesta além do atual */
      var faltaParaProxima = Math.max(
        0,
        ((cestasPossiveis + 1) * item.quantidade) - estoque
      );

      /* Percentual de estoque para a próxima cesta (animação da barra) */
      var precisaPorCesta  = item.quantidade;
      var sobra = estoque - (cestasPossiveis * precisaPorCesta);
      var percentual = precisaPorCesta > 0
        ? Math.min(100, Math.round((sobra / precisaPorCesta) * 100))
        : 0;

      return {
        alimentoId:        item.alimentoId,
        nome:              item.nome,
        quantidadePorCesta: item.quantidade,
        unidade:           item.unidade || 'kg',
        estoque:           Math.round(estoque * 10) / 10,
        cestasPossiveis:   cestasPossiveis,
        faltaParaProxima:  Math.round(faltaParaProxima * 10) / 10,
        percentual:        percentual
      };
    });

    /* Total de cestas = mínimo entre todos os itens (o "gargalo") */
    var total = detalhes.length > 0
      ? Math.min.apply(null, detalhes.map(function (d) { return d.cestasPossiveis; }))
      : 0;

    /* Item limitante = o que tem menos cestas possíveis */
    var limitante = detalhes.reduce(function (min, d) {
      if (min === null) return d;
      return d.cestasPossiveis < min.cestasPossiveis ? d : min;
    }, null);

    return {
      total:     total,
      limitante: limitante,
      detalhes:  detalhes
    };
  },

}; /* fim DoaVidaAPI */


/* ── Exporta DoaVidaAPI globalmente ───────────────────────────────── */
window.DoaVidaAPI = DoaVidaAPI;

/* ══════════════════════════════════════════════════════════════════════
   abrirWhatsApp — abre no app (mobile) ou no WhatsApp Web (desktop)
   Uso: abrirWhatsApp("whatsapp://send?phone=5591...&text=...")
   ══════════════════════════════════════════════════════════════════════ */
window.abrirWhatsApp = function (whatsappUrl) {
  var isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|Windows Phone/i
    .test(navigator.userAgent);
  var url = isMobile
    ? whatsappUrl
    : whatsappUrl.replace('whatsapp://send', 'https://web.whatsapp.com/send');
  window.open(url, '_blank', 'noopener,noreferrer');
};

/* Intercepta cliques em <a href="whatsapp://..."> no desktop */
document.addEventListener('click', function (e) {
  var a = e.target.closest ? e.target.closest('a[href^="whatsapp://"]') : null;
  if (!a) return;
  var isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|Windows Phone/i
    .test(navigator.userAgent);
  if (!isMobile) {
    e.preventDefault();
    var url = a.getAttribute('href')
      .replace('whatsapp://send', 'https://web.whatsapp.com/send');
    window.open(url, '_blank', 'noopener,noreferrer');
  }
});

/* ── Log de carregamento ─────────────────────────────────────────── */
console.log(
  '[DoaVida] api.js ✅ v4.0 — ' +
  Object.keys(DoaVida.KEYS).length + ' coleções disponíveis — ' +
  'Sessão: localStorage multi-aba (8h)'
);
