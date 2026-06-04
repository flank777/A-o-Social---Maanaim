-- ══════════════════════════════════════════════════════════════════════
-- DoaVida — Supabase Schema (Estrutura do Banco de Dados)
-- Ação Social Semear + Comunidade Evangélica Maanaim — Belém, PA
-- ══════════════════════════════════════════════════════════════════════
--
-- COMO USAR:
-- 1. Acesse o painel do Supabase: https://app.supabase.com
-- 2. Vá em "SQL Editor" no menu lateral
-- 3. Cole este arquivo inteiro e clique em "Run"
-- 4. Todas as tabelas serão criadas automaticamente
--
-- ESTRUTURA:
--   alimentos    → catálogo de alimentos com meta e progresso
--   doacoes      → doações registradas pelos doadores
--   familias     → famílias beneficiadas cadastradas
--   voluntarios  → voluntários cadastrados
--   oracoes      → pedidos de oração
--   tarefas      → tarefas atribuídas a voluntários
--   galeria      → fotos públicas e privadas
--   configuracao → configurações do sistema (WhatsApp, senha, etc.)
--
-- ══════════════════════════════════════════════════════════════════════


-- ── Habilita a extensão UUID (necessária para gerar IDs únicos) ─────
-- uuid_generate_v4() gera um ID único como "550e8400-e29b-41d4-a716-446655440000"
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: alimentos
-- Catálogo de alimentos disponíveis para doação.
-- Cada alimento tem uma meta em kg e um progresso atual.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS alimentos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Nome do alimento (ex: "Arroz 5kg")
  name        TEXT NOT NULL,
  -- Emoji representativo (ex: "🌾")
  emoji       TEXT DEFAULT '🥫',
  -- URL de imagem do alimento (Unsplash ou upload)
  img         TEXT DEFAULT '',
  -- Meta de arrecadação em kg
  goal        NUMERIC(10,2) DEFAULT 0,
  -- Total já arrecadado em kg
  kg          NUMERIC(10,2) DEFAULT 0,
  -- Número de famílias que este alimento beneficia
  families    INTEGER DEFAULT 0,
  -- Peso unitário do pacote em kg (ex: 5 para saco de 5kg)
  peso        NUMERIC(10,3) DEFAULT 1,
  -- Timestamps automáticos
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca por nome (usado nos filtros do admin)
CREATE INDEX IF NOT EXISTS idx_alimentos_name ON alimentos(name);

-- Comentário na tabela
COMMENT ON TABLE alimentos IS 'Catálogo de alimentos disponíveis para doação';


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: doacoes
-- Registra cada doação feita pelo formulário público (form.html).
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS doacoes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Nome do doador
  name        TEXT NOT NULL,
  -- Telefone com máscara (ex: "(91) 99999-9999")
  phone       TEXT DEFAULT '',
  -- Alimento principal doado (nome)
  food        TEXT NOT NULL,
  -- Quantidade em unidades (ex: 2 sacos)
  amount      INTEGER DEFAULT 1,
  -- Peso total em kg
  total_kg    NUMERIC(10,2) DEFAULT 0,
  -- Forma de entrega: 'retirada' | 'entrega' | 'evento'
  delivery    TEXT DEFAULT 'retirada',
  -- Observações e pedido de oração do doador
  observacao  TEXT DEFAULT '',
  -- Status da doação: 'pendente' | 'confirmado' | 'entregue' | 'cancelado'
  status      TEXT DEFAULT 'pendente',
  -- JSON com os itens da doação [{id, nome, qty, totalKg}]
  itens       JSONB DEFAULT '[]',
  -- Timestamps automáticos
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para listagem ordenada por data (mais recente primeiro)
CREATE INDEX IF NOT EXISTS idx_doacoes_created_at ON doacoes(created_at DESC);
-- Índice para filtro por status
CREATE INDEX IF NOT EXISTS idx_doacoes_status ON doacoes(status);
-- Índice para busca por nome do doador
CREATE INDEX IF NOT EXISTS idx_doacoes_name ON doacoes(name);

COMMENT ON TABLE doacoes IS 'Doações registradas pelo formulário público';


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: familias
-- Famílias beneficiadas cadastradas pelo painel admin.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS familias (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Nome do responsável pela família
  name        TEXT NOT NULL,
  -- Telefone para contato via WhatsApp
  phone       TEXT NOT NULL,
  -- Endereço completo
  endereco    TEXT DEFAULT '',
  -- Número de pessoas na família
  pessoas     INTEGER DEFAULT 1,
  -- Observações gerais
  obs         TEXT DEFAULT '',
  -- Timestamps automáticos
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_familias_name ON familias(name);
CREATE INDEX IF NOT EXISTS idx_familias_created_at ON familias(created_at DESC);

COMMENT ON TABLE familias IS 'Famílias beneficiadas cadastradas pelo admin';


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: voluntarios
-- Voluntários cadastrados via voluntario.html ou pelo admin.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS voluntarios (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Nome completo
  nome        TEXT NOT NULL,
  -- Telefone com máscara
  telefone    TEXT DEFAULT '',
  -- Tipo de voluntariado (código interno)
  tipo        TEXT DEFAULT '',
  -- Label amigável do tipo (ex: "Distribuição de alimentos")
  tipo_label  TEXT DEFAULT '',
  -- Status: 'novo' | 'em-contato' | 'confirmado' | 'participando' | 'finalizado'
  status      TEXT DEFAULT 'novo',
  -- Timestamps automáticos
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voluntarios_status ON voluntarios(status);
CREATE INDEX IF NOT EXISTS idx_voluntarios_created_at ON voluntarios(created_at DESC);

COMMENT ON TABLE voluntarios IS 'Voluntários cadastrados via página de voluntariado';


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: oracoes
-- Pedidos de oração — enviados pelo formulário de doação ou diretamente.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS oracoes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Nome do solicitante (pode ser anônimo)
  nome        TEXT DEFAULT 'Anônimo',
  -- Categoria: 'saude' | 'familia' | 'espiritual' | 'outros'
  categoria   TEXT DEFAULT 'outros',
  -- Texto do pedido de oração
  mensagem    TEXT NOT NULL,
  -- Status: 'precisa-oracao' | 'orando'
  status      TEXT DEFAULT 'precisa-oracao',
  -- Timestamps automáticos
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oracoes_status ON oracoes(status);
CREATE INDEX IF NOT EXISTS idx_oracoes_created_at ON oracoes(created_at DESC);

COMMENT ON TABLE oracoes IS 'Pedidos de oração enviados pelo formulário ou admin';


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: tarefas
-- Tarefas criadas pelo admin e atribuídas a voluntários.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tarefas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Título da tarefa
  titulo           TEXT NOT NULL,
  -- Descrição detalhada
  descricao        TEXT DEFAULT '',
  -- Responsável (nome ou ID do voluntário)
  responsavel      TEXT DEFAULT '',
  -- Telefone do responsável (para envio por WhatsApp)
  responsavel_tel  TEXT DEFAULT '',
  -- Status: 'pendente' | 'em-andamento' | 'concluida' | 'cancelada'
  status           TEXT DEFAULT 'pendente',
  -- Data de vencimento (opcional)
  vencimento       DATE,
  -- Timestamps automáticos
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_created_at ON tarefas(created_at DESC);

COMMENT ON TABLE tarefas IS 'Tarefas atribuídas a voluntários com envio por WhatsApp';


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: galeria
-- Fotos e mídias da galeria pública e do painel admin.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS galeria (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- URL da imagem (upload ou link externo)
  url         TEXT NOT NULL,
  -- Legenda/descrição
  legenda     TEXT DEFAULT '',
  -- Categoria: 'evento' | 'distribuicao' | 'voluntarios' | 'outros'
  categoria   TEXT DEFAULT 'outros',
  -- Visibilidade: 'publica' | 'privada'
  visibilidade TEXT DEFAULT 'publica',
  -- Timestamps automáticos
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galeria_visibilidade ON galeria(visibilidade);
CREATE INDEX IF NOT EXISTS idx_galeria_created_at ON galeria(created_at DESC);

COMMENT ON TABLE galeria IS 'Fotos e mídias da galeria pública';


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: configuracao
-- Configurações do sistema (senha admin, WhatsApp, etc.)
-- Usa chave/valor para flexibilidade.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS configuracao (
  -- Chave única (ex: 'senha_admin', 'whatsapp_numero')
  chave       TEXT PRIMARY KEY,
  -- Valor (sempre texto — converter para tipo correto na aplicação)
  valor       TEXT DEFAULT '',
  -- Descrição amigável
  descricao   TEXT DEFAULT '',
  -- Quando foi atualizado pela última vez
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insere configurações padrão
INSERT INTO configuracao (chave, valor, descricao) VALUES
  ('senha_admin',     '2025',  'Senha de acesso ao painel administrativo'),
  ('whatsapp_numero', '',      'Número WhatsApp para receber notificações (ex: 5591999999999)'),
  ('whatsapp_apikey', '',      'API Key do serviço de envio de WhatsApp'),
  ('nome_sistema',    'DoaVida — Ação Social Semear', 'Nome do sistema exibido nas mensagens')
ON CONFLICT (chave) DO NOTHING;

COMMENT ON TABLE configuracao IS 'Configurações do sistema em formato chave/valor';


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: historico_whatsapp
-- Log de mensagens enviadas via WhatsApp.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS historico_whatsapp (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Número de destino (com código do país, ex: 5591999999999)
  destinatario TEXT NOT NULL,
  -- Texto da mensagem enviada
  mensagem    TEXT NOT NULL,
  -- Status do envio: 'enviado' | 'falhou'
  status      TEXT DEFAULT 'enviado',
  -- Timestamp do envio
  enviado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_enviado_em ON historico_whatsapp(enviado_em DESC);

COMMENT ON TABLE historico_whatsapp IS 'Log de mensagens enviadas pelo WhatsApp';


-- ══════════════════════════════════════════════════════════════════════
-- FUNÇÃO: atualizar updated_at automaticamente
-- Sempre que um registro for alterado, o updated_at é atualizado.
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplica a função em todas as tabelas que têm updated_at
CREATE TRIGGER trg_alimentos_updated_at
  BEFORE UPDATE ON alimentos
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trg_doacoes_updated_at
  BEFORE UPDATE ON doacoes
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trg_familias_updated_at
  BEFORE UPDATE ON familias
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trg_voluntarios_updated_at
  BEFORE UPDATE ON voluntarios
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trg_oracoes_updated_at
  BEFORE UPDATE ON oracoes
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trg_tarefas_updated_at
  BEFORE UPDATE ON tarefas
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trg_galeria_updated_at
  BEFORE UPDATE ON galeria
  FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();


-- ══════════════════════════════════════════════════════════════════════
-- POLÍTICAS DE SEGURANÇA (Row Level Security — RLS)
-- Controla quem pode ler e escrever em cada tabela.
-- ══════════════════════════════════════════════════════════════════════

-- Habilita RLS em todas as tabelas
ALTER TABLE alimentos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE doacoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE familias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE voluntarios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE galeria          ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracao     ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_whatsapp ENABLE ROW LEVEL SECURITY;

-- ── Políticas PÚBLICAS (leitura sem autenticação) ────────────────────
-- Alimentos: qualquer pessoa pode ver (necessário para o formulário público)
CREATE POLICY "alimentos_leitura_publica"
  ON alimentos FOR SELECT
  USING (true);

-- Galeria pública: qualquer um pode ver fotos públicas
CREATE POLICY "galeria_leitura_publica"
  ON galeria FOR SELECT
  USING (visibilidade = 'publica');

-- ── Políticas para INSERÇÃO pública (formulário de doação) ───────────
-- Qualquer pessoa pode registrar uma doação (sem login)
CREATE POLICY "doacoes_inserir_publico"
  ON doacoes FOR INSERT
  WITH CHECK (true);

-- Qualquer pessoa pode registrar voluntariado (sem login)
CREATE POLICY "voluntarios_inserir_publico"
  ON voluntarios FOR INSERT
  WITH CHECK (true);

-- Qualquer pessoa pode enviar pedido de oração (sem login)
CREATE POLICY "oracoes_inserir_publico"
  ON oracoes FOR INSERT
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════
-- NOTA SOBRE AUTENTICAÇÃO DO ADMIN:
-- As operações de UPDATE, DELETE e INSERT nas demais tabelas
-- devem ser feitas com a chave service_role do Supabase,
-- que bypassa o RLS. Configure isso em js/services/supabase.js.
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- REALTIME — Sincronização instantânea entre dispositivos
-- Adiciona as tabelas principais à publicação do Supabase Realtime.
-- Isso habilita os WebSockets no painel admin (js/admin.js).
-- Sem isso, o admin precisaria dar F5 para ver novos dados.
-- ══════════════════════════════════════════════════════════════════════

-- Habilita o Realtime para as tabelas que o admin precisa ouvir
ALTER PUBLICATION supabase_realtime ADD TABLE
  doacoes,
  alimentos,
  voluntarios,
  oracoes,
  familias;


-- ══════════════════════════════════════════════════════════════════════
-- STORAGE — Bucket para upload de fotos da galeria
-- Execute no SQL Editor do Supabase para criar o bucket e políticas.
-- O bucket "galeria" armazena as imagens enviadas pelo painel admin.
-- ══════════════════════════════════════════════════════════════════════

-- Cria o bucket público (substitua 'true' por 'false' para acesso restrito)
INSERT INTO storage.buckets (id, name, public)
VALUES ('galeria', 'galeria', true)
ON CONFLICT (id) DO NOTHING;

-- Política: leitura pública (qualquer um pode ver as fotos)
CREATE POLICY "galeria_leitura_publica"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'galeria');

-- Política: upload permitido (anon key — usado pelo admin logado)
-- Em produção, restrinja para usuários autenticados
CREATE POLICY "galeria_upload_publico"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'galeria');

-- Política: exclusão permitida
CREATE POLICY "galeria_delete_publico"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'galeria');
