-- ══════════════════════════════════════════════════════════════════
-- DoaVida — Cole este SQL no SQL Editor do Supabase e clique RUN
-- Cria todas as tabelas restantes (doacoes, familias, voluntarios,
-- oracoes, tarefas, galeria, configuracao)
-- ══════════════════════════════════════════════════════════════════

-- Função auxiliar para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── TABELA: doacoes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doacoes (
  id          UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name        TEXT NOT NULL,
  phone       TEXT NULL DEFAULT '',
  food        TEXT NOT NULL DEFAULT '',
  amount      INTEGER NULL DEFAULT 1,
  total_kg    NUMERIC(10,2) NULL DEFAULT 0,
  delivery    TEXT NULL DEFAULT 'retirada',
  observacao  TEXT NULL DEFAULT '',
  status      TEXT NULL DEFAULT 'pendente',
  itens       JSONB NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NULL DEFAULT NOW(),
  CONSTRAINT doacoes_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_doacoes_created_at ON public.doacoes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doacoes_status ON public.doacoes (status);
CREATE INDEX IF NOT EXISTS idx_doacoes_name ON public.doacoes (name);

CREATE TRIGGER trg_doacoes_updated_at
  BEFORE UPDATE ON doacoes
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();


-- ── TABELA: familias ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.familias (
  id          UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL DEFAULT '',
  endereco    TEXT NULL DEFAULT '',
  pessoas     INTEGER NULL DEFAULT 1,
  obs         TEXT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NULL DEFAULT NOW(),
  CONSTRAINT familias_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_familias_name ON public.familias (name);
CREATE INDEX IF NOT EXISTS idx_familias_created_at ON public.familias (created_at DESC);

CREATE TRIGGER trg_familias_updated_at
  BEFORE UPDATE ON familias
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();


-- ── TABELA: voluntarios ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.voluntarios (
  id          UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  nome        TEXT NOT NULL,
  telefone    TEXT NULL DEFAULT '',
  tipo        TEXT NULL DEFAULT '',
  tipo_label  TEXT NULL DEFAULT '',
  status      TEXT NULL DEFAULT 'novo',
  created_at  TIMESTAMPTZ NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NULL DEFAULT NOW(),
  CONSTRAINT voluntarios_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_voluntarios_status ON public.voluntarios (status);
CREATE INDEX IF NOT EXISTS idx_voluntarios_created_at ON public.voluntarios (created_at DESC);

CREATE TRIGGER trg_voluntarios_updated_at
  BEFORE UPDATE ON voluntarios
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();


-- ── TABELA: oracoes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.oracoes (
  id          UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  nome        TEXT NULL DEFAULT 'Anonimo',
  categoria   TEXT NULL DEFAULT 'outros',
  mensagem    TEXT NOT NULL,
  status      TEXT NULL DEFAULT 'precisa-oracao',
  created_at  TIMESTAMPTZ NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NULL DEFAULT NOW(),
  CONSTRAINT oracoes_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_oracoes_status ON public.oracoes (status);
CREATE INDEX IF NOT EXISTS idx_oracoes_created_at ON public.oracoes (created_at DESC);

CREATE TRIGGER trg_oracoes_updated_at
  BEFORE UPDATE ON oracoes
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();


-- ── TABELA: tarefas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tarefas (
  id              UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  titulo          TEXT NOT NULL,
  descricao       TEXT NULL DEFAULT '',
  responsavel     TEXT NULL DEFAULT '',
  responsavel_tel TEXT NULL DEFAULT '',
  status          TEXT NULL DEFAULT 'pendente',
  vencimento      DATE NULL,
  created_at      TIMESTAMPTZ NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NULL DEFAULT NOW(),
  CONSTRAINT tarefas_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_tarefas_status ON public.tarefas (status);
CREATE INDEX IF NOT EXISTS idx_tarefas_created_at ON public.tarefas (created_at DESC);

CREATE TRIGGER trg_tarefas_updated_at
  BEFORE UPDATE ON tarefas
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();


-- ── TABELA: galeria ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.galeria (
  id           UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  url          TEXT NOT NULL,
  legenda      TEXT NULL DEFAULT '',
  categoria    TEXT NULL DEFAULT 'outros',
  visibilidade TEXT NULL DEFAULT 'publica',
  created_at   TIMESTAMPTZ NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NULL DEFAULT NOW(),
  CONSTRAINT galeria_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_galeria_visibilidade ON public.galeria (visibilidade);
CREATE INDEX IF NOT EXISTS idx_galeria_created_at ON public.galeria (created_at DESC);

CREATE TRIGGER trg_galeria_updated_at
  BEFORE UPDATE ON galeria
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();


-- ── TABELA: configuracao ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.configuracao (
  chave      TEXT NOT NULL,
  valor      TEXT NULL DEFAULT '',
  descricao  TEXT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NULL DEFAULT NOW(),
  CONSTRAINT configuracao_pkey PRIMARY KEY (chave)
) TABLESPACE pg_default;

-- Dados iniciais da configuracao
INSERT INTO public.configuracao (chave, valor, descricao) VALUES
  ('senha_admin',     '2025',  'Senha de acesso ao painel admin'),
  ('whatsapp_numero', '',      'Numero WhatsApp para notificacoes'),
  ('whatsapp_apikey', '',      'API Key do servico WhatsApp'),
  ('nome_sistema',    'DoaVida - Acao Social Semear', 'Nome do sistema')
ON CONFLICT (chave) DO NOTHING;
