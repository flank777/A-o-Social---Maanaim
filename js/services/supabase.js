/*
  ╔══════════════════════════════════════════════════════════════════════╗
  ║  DoaVida — js/services/supabase.js                                  ║
  ║  Camada de integração com o Supabase (banco de dados na nuvem)      ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║  📚 O QUE É O SUPABASE?                                             ║
  ║                                                                      ║
  ║  Supabase é um banco de dados PostgreSQL na nuvem com uma API       ║
  ║  REST automática. Em vez de guardar dados no localStorage           ║
  ║  (que fica só no computador do usuário), os dados ficam num         ║
  ║  servidor acessível de qualquer lugar.                              ║
  ║                                                                      ║
  ║  VANTAGENS vs localStorage:                                         ║
  ║  ✅ Dados persistem entre dispositivos                              ║
  ║  ✅ Admin acessa de qualquer lugar                                  ║
  ║  ✅ Backup automático                                               ║
  ║  ✅ Múltiplos admins ao mesmo tempo                                 ║
  ║  ✅ Doadores não precisam estar no mesmo navegador                  ║
  ║                                                                      ║
  ║  COMO CONFIGURAR:                                                    ║
  ║  1. Crie um projeto em https://app.supabase.com                     ║
  ║  2. Vá em Settings → API                                            ║
  ║  3. Copie a "Project URL" e cole em SUPABASE_URL abaixo             ║
  ║  4. Copie a "anon key" e cole em SUPABASE_ANON_KEY abaixo           ║
  ║  5. Execute o arquivo db/schema.sql no SQL Editor do Supabase       ║
  ║                                                                      ║
  ║  ATENÇÃO: A anon key é pública (pode ficar no código).              ║
  ║  Nunca coloque a service_role key no código do front-end!           ║
  ║                                                                      ║
  ╚══════════════════════════════════════════════════════════════════════╝
*/

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 1 — CONFIGURAÇÃO
   Substitua os valores abaixo pelas credenciais do seu projeto Supabase.
   ══════════════════════════════════════════════════════════════════════ */

/* URL do projeto Supabase (Settings → API → Project URL) */
var SUPABASE_URL = "https://yjcugowvfwkuxjeoauao.supabase.co";

/* Chave pública (Settings → API → anon/public key) */
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqY3Vnb3d2ZndrdXhqZW9hdWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjM4MTIsImV4cCI6MjA5MDE5OTgxMn0.a0tbtnKV_bRY3wwjlUHizCng4Blz34Sn9DBwsscoxQo";

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 2 — CLIENTE SUPABASE
   Cria o cliente que faz as chamadas ao banco.
   ══════════════════════════════════════════════════════════════════════ */

/*
  Inicializa o cliente Supabase.
  O objeto `supabase` é criado pela biblioteca @supabase/supabase-js
  que deve ser carregada antes deste arquivo no HTML.

  Exemplo de inclusão no HTML:
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
*/
var supabaseClient = null;

/*
  Inicializa o cliente — chame esta função antes de usar qualquer
  método do DoaVidaSupabase.
*/
function inicializarSupabase() {
  /* Verifica se a biblioteca foi carregada */
  if (typeof window.supabase === "undefined") {
    console.error(
      "[DoaVida] Biblioteca Supabase não encontrada! " +
        "Adicione o script CDN antes de supabase.js",
    );
    return false;
  }

  /* Verifica se as credenciais foram configuradas */
  if (
    SUPABASE_URL.includes("SEU_PROJETO") ||
    SUPABASE_ANON_KEY.includes("SUA_ANON_KEY")
  ) {
    console.warn(
      "[DoaVida] Credenciais Supabase não configuradas. " +
        "Edite js/services/supabase.js e adicione URL e ANON_KEY.",
    );
    return false;
  }

  /* Cria o cliente */
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  );
  /* Expõe globalmente para que index.html possa usar Realtime */
  window.supabaseClient = supabaseClient;
  console.log("[DoaVida] ✅ Supabase conectado:", SUPABASE_URL);
  return true;
}

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 3 — SERVIÇOS DE DADOS
   Funções async que substituem o DoaVidaAPI (que usa localStorage).
   Cada função tem o mesmo contrato (parâmetros/retorno) do DoaVidaAPI,
   facilitando a migração gradual.
   ══════════════════════════════════════════════════════════════════════ */

/*
  Namespace para os serviços do Supabase.
  Uso: await DoaVidaSupabase.alimentos.listar()
*/
var DoaVidaSupabase = {
  /* ── ALIMENTOS ────────────────────────────────────────────────────── */
  alimentos: {
    /*
      Lista todos os alimentos cadastrados, ordenados por data de criação.
      Equivale a: DoaVidaAPI.getAlimentos()
    */
    listar: async function () {
      var { data, error } = await supabaseClient
        .from("alimentos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[DoaVida] Erro ao listar alimentos:", error.message);
        return [];
      }
      return data || [];
    },

    /*
      Busca alimento por ID.
      @param {string} id — UUID do alimento
    */
    buscarPorId: async function (id) {
      var { data, error } = await supabaseClient
        .from("alimentos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("[DoaVida] Erro ao buscar alimento:", error.message);
        return null;
      }
      return data;
    },

    /*
      Cadastra um novo alimento.
      @param {Object} alimento — { name, goal, emoji, img, peso, families }
    */
    criar: async function (alimento) {
      var { data, error } = await supabaseClient
        .from("alimentos")
        .insert([alimento])
        .select()
        .single();

      if (error) {
        console.error("[DoaVida] Erro ao criar alimento:", error.message);
        throw new Error(error.message);
      }
      return data;
    },

    /*
      Atualiza um alimento existente.
      @param {string} id     — UUID do alimento
      @param {Object} dados  — campos a atualizar
    */
    atualizar: async function (id, dados) {
      var { data, error } = await supabaseClient
        .from("alimentos")
        .update(dados)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[DoaVida] Erro ao atualizar alimento:", error.message);
        throw new Error(error.message);
      }
      return data;
    },

    /*
      Remove um alimento.
      @param {string} id — UUID do alimento
    */
    excluir: async function (id) {
      var { error } = await supabaseClient
        .from("alimentos")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("[DoaVida] Erro ao excluir alimento:", error.message);
        return false;
      }
      return true;
    },
  },

  /* ── DOAÇÕES ──────────────────────────────────────────────────────── */
  doacoes: {
    /*
      Lista todas as doações, das mais recentes para as mais antigas.
      Equivale a: DoaVidaAPI.getDoacoes()
    */
    listar: async function () {
      var { data, error } = await supabaseClient
        .from("doacoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[DoaVida] Erro ao listar doações:", error.message);
        return [];
      }
      return data || [];
    },

    /*
      Registra uma nova doação (chamado pelo formulário público).
      @param {Object} doacao — dados do formulário
    */
    criar: async function (doacao) {
      var { data, error } = await supabaseClient
        .from("doacoes")
        .insert([doacao])
        .select()
        .single();

      if (error) {
        console.error("[DoaVida] Erro ao registrar doação:", error.message);
        throw new Error(error.message);
      }
      return data;
    },

    /*
      Atualiza o status de uma doação.
      @param {string} id     — UUID da doação
      @param {string} status — novo status
    */
    atualizarStatus: async function (id, status) {
      var { data, error } = await supabaseClient
        .from("doacoes")
        .update({ status: status })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error(
          "[DoaVida] Erro ao atualizar status da doação:",
          error.message,
        );
        return null;
      }
      return data;
    },

    /* Atualiza qualquer campo da doação (status, observacao, delivery…) */
    atualizar: async function (id, dados) {
      var { data, error } = await supabaseClient
        .from("doacoes")
        .update(dados)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        console.error("[DoaVida] Erro ao atualizar doação:", error.message);
        throw new Error(error.message);
      }
      return data;
    },

    /*
      Remove uma doação.
      @param {string} id — UUID da doação
    */
    excluir: async function (id) {
      var { error } = await supabaseClient
        .from("doacoes")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("[DoaVida] Erro ao excluir doação:", error.message);
        return false;
      }
      return true;
    },
  },

  /* ── FAMÍLIAS ─────────────────────────────────────────────────────── */
  familias: {
    listar: async function () {
      var { data, error } = await supabaseClient
        .from("familias")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[DoaVida] Famílias:", error.message);
        return [];
      }
      return data || [];
    },

    criar: async function (familia) {
      var { data, error } = await supabaseClient
        .from("familias")
        .insert([familia])
        .select()
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },

    atualizar: async function (id, dados) {
      var { data, error } = await supabaseClient
        .from("familias")
        .update(dados)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },

    excluir: async function (id) {
      var { error } = await supabaseClient
        .from("familias")
        .delete()
        .eq("id", id);
      return !error;
    },
  },

  /* ── VOLUNTÁRIOS ──────────────────────────────────────────────────── */
  voluntarios: {
    listar: async function () {
      var { data, error } = await supabaseClient
        .from("voluntarios")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[DoaVida] Voluntários:", error.message);
        return [];
      }
      return data || [];
    },

    criar: async function (voluntario) {
      var { data, error } = await supabaseClient
        .from("voluntarios")
        .insert([voluntario])
        .select()
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },

    atualizarStatus: async function (id, status) {
      var { data, error } = await supabaseClient
        .from("voluntarios")
        .update({ status: status })
        .eq("id", id)
        .select()
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },

    /* Atualiza qualquer campo do voluntário (nome, telefone, tipo, status…) */
    atualizar: async function (id, dados) {
      var { data, error } = await supabaseClient
        .from("voluntarios")
        .update(dados)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },

    excluir: async function (id) {
      var { error } = await supabaseClient
        .from("voluntarios")
        .delete()
        .eq("id", id);
      return !error;
    },
  },

  /* ── ORAÇÕES ──────────────────────────────────────────────────────── */
  oracoes: {
    listar: async function () {
      var { data, error } = await supabaseClient
        .from("oracoes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[DoaVida] Orações:", error.message);
        return [];
      }
      return data || [];
    },

    criar: async function (oracao) {
      var { data, error } = await supabaseClient
        .from("oracoes")
        .insert([oracao])
        .select()
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },

    atualizarStatus: async function (id, status) {
      var { data, error } = await supabaseClient
        .from("oracoes")
        .update({ status: status })
        .eq("id", id)
        .select()
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },

    excluir: async function (id) {
      var { error } = await supabaseClient
        .from("oracoes")
        .delete()
        .eq("id", id);
      return !error;
    },
  },

  /* ── GALERIA ───────────────────────────────────────────────────────── */
  galeria: {
    listar: async function () {
      var { data, error } = await supabaseClient
        .from("galeria")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) { console.error("[DoaVida] Erro ao listar galeria:", error.message); return []; }
      return data || [];
    },
    criar: async function (foto) {
      var { data, error } = await supabaseClient
        .from("galeria")
        .insert([foto])
        .select()
        .single();
      if (error) { console.error("[DoaVida] Erro ao salvar foto:", error.message); throw new Error(error.message); }
      return data;
    },
    atualizar: async function (id, dados) {
      var { data, error } = await supabaseClient
        .from("galeria")
        .update(dados)
        .eq("id", id)
        .select()
        .single();
      if (error) { console.error("[DoaVida] Erro ao atualizar foto:", error.message); throw new Error(error.message); }
      return data;
    },
    excluir: async function (id) {
      /* Busca o registro antes de excluir para obter o storage_path */
      var { data: registro } = await supabaseClient
        .from("galeria")
        .select("storage_path")
        .eq("id", id)
        .single();

      /* Remove o registro da tabela */
      var { error } = await supabaseClient
        .from("galeria")
        .delete()
        .eq("id", id);
      if (error) { console.error("[DoaVida] Erro ao excluir foto:", error.message); return false; }

      /* Se havia arquivo no Storage, remove também para não acumular lixo */
      if (registro && registro.storage_path) {
        var { error: storageError } = await supabaseClient.storage
          .from("galeria")
          .remove([registro.storage_path]);
        if (storageError) {
          console.warn("[DoaVida] Registro excluído mas arquivo no Storage não foi removido:", storageError.message);
        }
      }

      return true;
    },
  },

  /* ── ESTATÍSTICAS (usado pelo Dashboard e Visão Geral) ────────────── */
  estatisticas: {
    /*
      Retorna um resumo de estatísticas para o painel admin.
      Equivale aos cálculos feitos em renderVisaoGeral() do admin.js.
    */
    resumo: async function () {
      /* Busca contagens em paralelo para melhor performance */
      var [doacoes, familias, voluntarios, alimentos, oracoes] =
        await Promise.all([
          supabaseClient
            .from("doacoes")
            .select("id, total_kg", { count: "exact" }),
          supabaseClient.from("familias").select("id", { count: "exact" }),
          supabaseClient.from("voluntarios").select("id", { count: "exact" }),
          supabaseClient.from("alimentos").select("id", { count: "exact" }),
          supabaseClient
            .from("oracoes")
            .select("id", { count: "exact" })
            .eq("status", "precisa-oracao"),
        ]);

      /* Calcula total de kg doados */
      var totalKg = (doacoes.data || []).reduce(function (acc, d) {
        return acc + (parseFloat(d.total_kg) || 0);
      }, 0);

      return {
        totalDoacoes: doacoes.count || 0,
        totalKg: Math.round(totalKg * 10) / 10,
        totalFamilias: familias.count || 0,
        totalVoluntarios: voluntarios.count || 0,
        totalAlimentos: alimentos.count || 0,
        oracoesPendentes: oracoes.count || 0,
      };
    },
  },
};

/* Exporta para uso global */
window.DoaVidaSupabase = DoaVidaSupabase;
window.inicializarSupabase = inicializarSupabase;

console.log(
  "[DoaVida] services/supabase.js carregado — configure as credenciais para ativar",
);

/* ══════════════════════════════════════════════════════════════════════
   SEÇÃO 4 — DOAVIDA SYNC (camada de acesso ao Supabase)

   DoaVidaSync é a camada entre os scripts da aplicacao e o Supabase.
   Sempre usa o Supabase — sem fallback para localStorage.

   Uso nos outros scripts:
     var doacoes = await DoaVidaSync.getDoacoes();
     await DoaVidaSync.addDoacao(dados);
   ══════════════════════════════════════════════════════════════════════ */

/*
  Helper interno — envolve uma Promise com limite de tempo.
  Se a Promise não resolver/rejeitar em `ms` milissegundos, resolve com `fallback`.
  Evita que queries travadas no Supabase congelem a interface.
*/
function _syncTimeout(promise, ms, fallback) {
  return new Promise(function (resolve) {
    var done = false;
    var id = setTimeout(function () {
      if (!done) { done = true; resolve(fallback !== undefined ? fallback : []); }
    }, ms);
    promise.then(function (v) {
      if (!done) { done = true; clearTimeout(id); resolve(v); }
    }).catch(function () {
      if (!done) { done = true; clearTimeout(id); resolve(fallback !== undefined ? fallback : []); }
    });
  });
}

var DoaVidaSync = {

  /*
    init()
    ------
    Inicializa o cliente Supabase.
    Deve ser chamada uma vez, no carregamento da pagina.
  */
  init: function () {
    inicializarSupabase();
    console.log("[DoaVidaSync] Inicializado — usando Supabase.");
    /* Avisa o index.html que o cliente Supabase está pronto
       para ativar o Realtime de sincronização de imagens */
    window.dispatchEvent(new CustomEvent('DoaVidaSyncPronto'));
  },

  /* ── DOACOES ───────────────────────────────────────────────────────── */

  /*
    Retorna todas as doacoes.
    @returns {Promise<Array>}
  */
  getDoacoes: async function () {
    return await _syncTimeout(DoaVidaSupabase.doacoes.listar(), 10000);
  },

  /*
    Registra uma nova doacao.
    @param {Object} dados — dados do formulario de doacao
    @returns {Promise<Object>}
  */
  addDoacao: async function (dados) {
    /* Mapeia os campos do formulario para as colunas do Supabase */
    var payload = {
      name:       dados.name      || dados.nome      || '',
      phone:      dados.phone     || (dados.telefone ? String(dados.telefone).replace(/\D/g,'') : ''),
      food:       dados.food      || '',
      amount:     Math.round(dados.amount || 1),
      total_kg:   dados.total_kg  || dados.totalKg   || 0,
      delivery:   dados.delivery  || dados.entrega   || 'retirada',
      observacao: dados.observacao || '',
      itens:      dados.itens     || [],
      status:     dados.status    || 'pendente'
    };
    return await DoaVidaSupabase.doacoes.criar(payload);
  },

  /*
    Atualiza apenas o status de uma doacao.
    @param {string} id     — id da doacao
    @param {string} status — novo status
    @returns {Promise<Object|null>}
  */
  updateDoacaoStatus: async function (id, status) {
    return await DoaVidaSupabase.doacoes.atualizarStatus(id, status);
  },

  /*
    Atualiza qualquer campo de uma doação (status, observacao, delivery…).
    @param {string} id    — UUID da doação
    @param {Object} dados — campos a atualizar
    @returns {Promise<Object>}
  */
  updateDoacao: async function (id, dados) {
    return await DoaVidaSupabase.doacoes.atualizar(id, dados);
  },

  /*
    Remove uma doacao.
    @param {string} id — id da doacao
    @returns {Promise<boolean>}
  */
  deleteDoacao: async function (id) {
    return await DoaVidaSupabase.doacoes.excluir(id);
  },

  /* ── ALIMENTOS ─────────────────────────────────────────────────────── */

  /*
    Retorna todos os alimentos cadastrados.
    @returns {Promise<Array>}
  */
  getAlimentos: async function () {
    /* Timeout de 5s — se o Supabase travar, cai no fallback do localStorage */
    var resultado = await _syncTimeout(DoaVidaSupabase.alimentos.listar(), 5000);
    if (!resultado || resultado.length === 0) {
      return typeof DoaVidaAPI !== 'undefined' ? DoaVidaAPI.getAlimentos() : [];
    }
    return resultado;
  },

  /* Busca um alimento pelo ID diretamente do banco (sem cache) */
  getAlimentoById: async function (id) {
    return await DoaVidaSupabase.alimentos.buscarPorId(id);
  },

  /*
    Cadastra um novo alimento.
    @param {Object} dados — dados do alimento
    @returns {Promise<Object>}
  */
  addAlimento: async function (dados) {
    return await DoaVidaSupabase.alimentos.criar(dados);
  },

  /*
    Atualiza um alimento existente.
    @param {string} id    — id do alimento
    @param {Object} dados — campos a atualizar
    @returns {Promise<Object>}
  */
  updateAlimento: async function (id, dados) {
    return await DoaVidaSupabase.alimentos.atualizar(id, dados);
  },

  /*
    Remove um alimento.
    @param {string} id — id do alimento
    @returns {Promise<boolean>}
  */
  deleteAlimento: async function (id) {
    return await DoaVidaSupabase.alimentos.excluir(id);
  },

  /* ── FAMILIAS ──────────────────────────────────────────────────────── */

  /*
    Retorna todas as familias beneficiadas.
    @returns {Promise<Array>}
  */
  getFamilias: async function () {
    return await _syncTimeout(DoaVidaSupabase.familias.listar(), 10000);
  },

  /*
    Cadastra uma nova familia.
    @param {Object} dados — dados da familia
    @returns {Promise<Object>}
  */
  addFamilia: async function (dados) {
    return await DoaVidaSupabase.familias.criar(dados);
  },

  /*
    Atualiza uma familia existente.
    @param {string} id    — id da familia
    @param {Object} dados — campos a atualizar
    @returns {Promise<Object>}
  */
  updateFamilia: async function (id, dados) {
    return await DoaVidaSupabase.familias.atualizar(id, dados);
  },

  /*
    Remove uma familia.
    @param {string} id — id da familia
    @returns {Promise<boolean>}
  */
  deleteFamilia: async function (id) {
    return await DoaVidaSupabase.familias.excluir(id);
  },

  /* ── VOLUNTARIOS ───────────────────────────────────────────────────── */

  /*
    Retorna todos os voluntarios cadastrados.
    @returns {Promise<Array>}
  */
  getVoluntarios: async function () {
    return await _syncTimeout(DoaVidaSupabase.voluntarios.listar(), 10000);
  },

  /*
    Cadastra um novo voluntario.
    @param {Object} dados — dados do voluntario
    @returns {Promise<Object>}
  */
  addVoluntario: async function (dados) {
    return await DoaVidaSupabase.voluntarios.criar(dados);
  },

  /*
    Atualiza qualquer campo de um voluntário (nome, telefone, tipo, status…).
    @param {string} id    — UUID do voluntário
    @param {Object} dados — campos a atualizar
    @returns {Promise<Object>}
  */
  updateVoluntario: async function (id, dados) {
    return await DoaVidaSupabase.voluntarios.atualizar(id, dados);
  },

  /*
    Remove um voluntario.
    @param {string} id — id do voluntario
    @returns {Promise<boolean>}
  */
  deleteVoluntario: async function (id) {
    return await DoaVidaSupabase.voluntarios.excluir(id);
  },

  /* ── ORACOES ───────────────────────────────────────────────────────── */

  /*
    Retorna todos os pedidos de oracao.
    @returns {Promise<Array>}
  */
  getOracoes: async function () {
    return await _syncTimeout(DoaVidaSupabase.oracoes.listar(), 10000);
  },

  /*
    Registra um novo pedido de oracao.
    @param {Object} dados — dados do pedido
    @returns {Promise<Object>}
  */
  addOracao: async function (dados) {
    return await DoaVidaSupabase.oracoes.criar(dados);
  },

  /*
    Atualiza o status de um pedido de oracao.
    @param {string} id     — id do pedido
    @param {string} status — novo status
    @returns {Promise<Object>}
  */
  updateOracao: async function (id, status) {
    return await DoaVidaSupabase.oracoes.atualizarStatus(id, status);
  },

  /*
    Remove um pedido de oracao.
    @param {string} id — id do pedido
    @returns {Promise<boolean>}
  */
  deleteOracao: async function (id) {
    return await DoaVidaSupabase.oracoes.excluir(id);
  },

  /* ── GALERIA ────────────────────────────────────────────────────────── */
  getGaleria: async function () {
    return await _syncTimeout(DoaVidaSupabase.galeria.listar(), 10000);
  },

  /*
    Salva uma foto na tabela galeria do Supabase.
    Usa as colunas corretas do schema: url, legenda, categoria, visibilidade.
    @param {Object} foto — { url, legenda?, categoria?, publica? }
  */
  addFotoGaleria: async function (foto) {
    var payload = {
      url:          foto.url || '',
      legenda:      foto.legenda || foto.titulo || foto.title || '',
      titulo:       foto.titulo || foto.title || foto.legenda || '',
      alt:          foto.alt || '',
      categoria:    foto.categoria || foto.category || 'geral',
      tipo:         foto.tipo || 'imagem',
      poster_url:   foto.poster_url || '',
      order_index:  typeof foto.order_index === 'number' ? foto.order_index : 0,
      ativo:        foto.ativo !== false,
      storage_path: foto.storage_path || '',
      /* visibilidade: 'publica' se publica/isPublic não for false explicitamente */
      visibilidade: (foto.publica === false || foto.isPublic === false) ? 'privada' : 'publica',
    };
    return await DoaVidaSupabase.galeria.criar(payload);
  },

  updateFotoGaleria: async function (id, dados) {
    return await DoaVidaSupabase.galeria.atualizar(id, dados);
  },
  deleteFotoGaleria: async function (id) {
    return await DoaVidaSupabase.galeria.excluir(id);
  },

  /*
    Faz upload de um arquivo de imagem para o Supabase Storage.
    O bucket "galeria" precisa existir e estar com acesso público.
    @param {File}   arquivo      — arquivo selecionado pelo <input type="file">
    @param {string} nomeArquivo  — nome único para o arquivo (ex: uuid + extensão)
    @returns {Promise<string>}   — URL pública da imagem
  */
  uploadImagemGaleria: async function (arquivo, nomeArquivo) {
    if (!supabaseClient) throw new Error('Supabase não inicializado');

    try {
      /* Faz o upload para o bucket "galeria" */
      var uploadResult = await supabaseClient.storage
        .from('galeria')
        .upload(nomeArquivo, arquivo, {
          cacheControl: '3600',
          upsert: false,   /* não sobrescreve se já existir */
        });

      if (uploadResult.error) {
        var errorMsg = uploadResult.error.message || JSON.stringify(uploadResult.error);
        console.error('[DoaVida] Erro Supabase Storage:', errorMsg);
        throw new Error('Storage: ' + errorMsg);
      }

      /* Pega a URL pública gerada pelo Storage */
      var { data } = supabaseClient.storage
        .from('galeria')
        .getPublicUrl(nomeArquivo);

      if (!data || !data.publicUrl) throw new Error('URL pública não disponível');
      return data.publicUrl;
    } catch (e) {
      console.error('[DoaVida] uploadImagemGaleria falhou:', e.message);
      throw e;
    }
  },

  /* ── MODELO CESTA ──────────────────────────────────────────────────── */

  getModeloCestaItens: async function () {
    if (!supabaseClient) return [];
    var { data, error } = await supabaseClient
      .from('modelo_cesta_itens')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) { console.error('[DoaVida] Erro ao listar modelo cesta:', error.message); return []; }
    return data || [];
  },

  addModeloCestaItem: async function (dados) {
    var { data, error } = await supabaseClient
      .from('modelo_cesta_itens')
      .insert([{
        alimento_id:          dados.alimento_id,
        alimento_nome:        dados.alimento_nome,
        alimento_emoji:       dados.alimento_emoji || '🥫',
        quantidade_por_cesta: dados.quantidade_por_cesta || 1
      }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  updateModeloCestaItem: async function (id, dados) {
    var { data, error } = await supabaseClient
      .from('modelo_cesta_itens')
      .update({
        quantidade_por_cesta: dados.quantidade_por_cesta,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  deleteModeloCestaItem: async function (id) {
    var { error } = await supabaseClient
      .from('modelo_cesta_itens')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  },

  /* ── CESTAS FORMADAS ───────────────────────────────────────────────── */

  getCestasFormadas: async function () {
    if (!supabaseClient) return [];
    var { data, error } = await supabaseClient
      .from('cestas_formadas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('[DoaVida] Erro ao listar cestas:', error.message); return []; }
    return data || [];
  },

  addCestaFormada: async function (dados) {
    var { data, error } = await supabaseClient
      .from('cestas_formadas')
      .insert([{
        quantidade:      dados.quantidade,
        observacao:      dados.observacao || '',
        itens_snapshot:  dados.itens_snapshot || [],
        total_kg:        dados.total_kg || 0,
        formado_por:     dados.formado_por || 'admin'
      }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  deleteCestaFormada: async function (id) {
    var { error } = await supabaseClient
      .from('cestas_formadas')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  },

  /* ══════════════════════════════════════════════════════════════════
     CONFIGURAÇÕES — lê e grava na tabela `configuracao` (chave/valor)
     Funciona em qualquer dispositivo — computador, celular, tablet.
  ══════════════════════════════════════════════════════════════════ */

  /*
    Lê UMA chave da tabela configuracao.
    @param {string} chave
    @returns {Promise<string|null>}
  */
  getConfig: async function (chave) {
    var { data, error } = await supabaseClient
      .from('configuracao')
      .select('valor')
      .eq('chave', chave)
      .single();
    if (error || !data) return null;
    return data.valor;
  },

  /*
    Grava ou atualiza uma chave na tabela configuracao.
    @param {string} chave
    @param {string} valor
  */
  setConfig: async function (chave, valor) {
    var { error } = await supabaseClient
      .from('configuracao')
      .upsert({ chave: chave, valor: String(valor), updated_at: new Date().toISOString() },
               { onConflict: 'chave' });
    if (error) throw new Error(error.message);
  },

  /*
    Lê TODAS as configurações de uma vez.
    @returns {Promise<Object>} ex: { senha_admin: '2025', banner_hero: 'https://...' }
  */
  getAllConfigs: async function () {
    var { data, error } = await supabaseClient
      .from('configuracao')
      .select('chave, valor');
    if (error || !data) return {};
    var obj = {};
    data.forEach(function (row) { obj[row.chave] = row.valor; });
    return obj;
  },

  /* ── Senha admin ─────────────────────────────────────────────────── */

  getSenha: async function () {
    var v = await DoaVidaSync.getConfig('senha_admin');
    return v || '2025';
  },

  setSenha: async function (novaSenha) {
    await DoaVidaSync.setConfig('senha_admin', novaSenha);
    /* Sincroniza no localStorage local também */
    try { localStorage.setItem('doavida_senha', novaSenha); } catch(e) {}
  },

  verificarSenha: async function (digitada) {
    var correta = await DoaVidaSync.getSenha();
    return digitada === correta;
  },

  /* ── Banners ─────────────────────────────────────────────────────── */

  getBanners: async function () {
    var configs = await DoaVidaSync.getAllConfigs();
    return {
      hero:       configs['banner_hero']       || '',
      voluntario: configs['banner_voluntario'] || ''
    };
  },

  setBannerHero: async function (url) {
    await DoaVidaSync.setConfig('banner_hero', url);
  },

  setBannerVoluntario: async function (url) {
    await DoaVidaSync.setConfig('banner_voluntario', url);
  },

  /* ── WhatsApp ────────────────────────────────────────────────────── */

  getWAConfig: async function () {
    var configs = await DoaVidaSync.getAllConfigs();
    return {
      apikey:      configs['whatsapp_apikey']  || '',
      adminPhone:  (configs['whatsapp_phones'] || '').split(',').map(function(s){ return s.trim(); }),
      ativo:       configs['whatsapp_ativo'] === 'true'
    };
  },

  setWAConfig: async function (cfg) {
    await Promise.all([
      DoaVidaSync.setConfig('whatsapp_apikey',  cfg.apikey  || ''),
      DoaVidaSync.setConfig('whatsapp_phones',  Array.isArray(cfg.adminPhone) ? cfg.adminPhone.join(',') : cfg.adminPhone || ''),
      DoaVidaSync.setConfig('whatsapp_ativo',   cfg.ativo ? 'true' : 'false')
    ]);
  },
};

/* Exporta para uso global */
window.DoaVidaSync = DoaVidaSync;

/* Auto-inicializa ao carregar o arquivo */
DoaVidaSync.init();
