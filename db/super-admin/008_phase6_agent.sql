-- ══════════════════════════════════════════════════════════════════════
-- DoaVida — Super Admin · Fase 6
-- Agente Dona Assunção: categorias, base de conhecimento, configurações,
-- perguntas sem resposta para melhoria contínua.
-- ══════════════════════════════════════════════════════════════════════
-- Idempotente. Pré-requisitos: 001..007.
-- ══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════════════════════
-- 1. agent_categories
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agent_categories (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_key TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  description  TEXT DEFAULT '',
  icon         TEXT DEFAULT 'fa-folder',
  order_index  NUMERIC NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_agent_cats_updated_at ON agent_categories;
CREATE TRIGGER trg_agent_cats_updated_at BEFORE UPDATE ON agent_categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE agent_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_cats_super" ON agent_categories;
DROP POLICY IF EXISTS "agent_cats_auth_r" ON agent_categories;
CREATE POLICY "agent_cats_super"  ON agent_categories FOR ALL   USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "agent_cats_auth_r" ON agent_categories FOR SELECT USING (auth.role() = 'authenticated' AND status = 'active');


-- ══════════════════════════════════════════════════════════════════════
-- 2. agent_knowledge — base de conhecimento aprovada
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agent_knowledge (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id     UUID REFERENCES agent_categories(id) ON DELETE SET NULL,
  category_key    TEXT,                          -- snapshot p/ uso direto
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  -- palavras-chave para matching simples (case-insensitive)
  keywords        TEXT[] NOT NULL DEFAULT '{}',
  -- 1..100 — quanto maior, mais prioridade no matching
  priority        SMALLINT NOT NULL DEFAULT 50 CHECK (priority BETWEEN 1 AND 100),
  source          TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','archived')),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_kn_cat_status ON agent_knowledge(category_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kn_priority   ON agent_knowledge(priority DESC)        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kn_keywords   ON agent_knowledge USING gin (keywords);
CREATE INDEX IF NOT EXISTS idx_kn_search     ON agent_knowledge USING gin (to_tsvector('portuguese', title || ' ' || content));
DROP TRIGGER IF EXISTS trg_kn_updated_at ON agent_knowledge;
CREATE TRIGGER trg_kn_updated_at BEFORE UPDATE ON agent_knowledge FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE agent_knowledge ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kn_super"   ON agent_knowledge;
DROP POLICY IF EXISTS "kn_auth_r"  ON agent_knowledge;
DROP POLICY IF EXISTS "kn_public_r" ON agent_knowledge;
CREATE POLICY "kn_super"    ON agent_knowledge FOR ALL    USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
-- Admin autenticado lê knowledge ativo (a Dona Assunção dentro do admin pode usar)
CREATE POLICY "kn_auth_r"   ON agent_knowledge FOR SELECT USING (auth.role() = 'authenticated' AND status = 'active' AND deleted_at IS NULL);
-- Público anon lê knowledge ativo (quando o site público invocar a agente)
CREATE POLICY "kn_public_r" ON agent_knowledge FOR SELECT USING (status = 'active' AND deleted_at IS NULL);


-- ══════════════════════════════════════════════════════════════════════
-- 3. agent_settings — singleton 'default' com tom, limites, etc.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agent_settings (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  internal_key       TEXT NOT NULL UNIQUE,
  display_name       TEXT NOT NULL DEFAULT 'Dona Assunção',
  avatar_url         TEXT DEFAULT '',
  tone               TEXT NOT NULL DEFAULT 'acolhedor'
                     CHECK (tone IN ('acolhedor','formal','direto','animado','solidario')),
  greeting           TEXT DEFAULT 'Olá! Sou a Dona Assunção. Como posso ajudar?',
  fallback_message   TEXT DEFAULT 'Ainda estou aprendendo sobre isso. Vou registrar sua dúvida e um responsável humano vai responder em breve.',
  human_handoff      TEXT DEFAULT '',
  -- Instruções permanentes (regras de comportamento)
  instructions       TEXT DEFAULT '',
  -- Limites: valores que a agente NÃO pode passar (ex.: dados financeiros)
  limits             JSONB NOT NULL DEFAULT '["nunca inventar dados","sempre confirmar nome do doador antes de gerar recibo","encaminhar casos delicados para humano"]'::jsonb,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_agent_set_updated_at ON agent_settings;
CREATE TRIGGER trg_agent_set_updated_at BEFORE UPDATE ON agent_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_set_super"  ON agent_settings;
DROP POLICY IF EXISTS "agent_set_pub_r"  ON agent_settings;
CREATE POLICY "agent_set_super" ON agent_settings FOR ALL    USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "agent_set_pub_r" ON agent_settings FOR SELECT USING (active = TRUE);


-- ══════════════════════════════════════════════════════════════════════
-- 4. agent_unanswered — perguntas sem resposta para melhoria contínua
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agent_unanswered (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question     TEXT NOT NULL,
  context      TEXT DEFAULT '',
  source       TEXT DEFAULT 'site',                 -- 'site' | 'admin' | 'whatsapp'
  meta         JSONB NOT NULL DEFAULT '{}'::jsonb,
  status       TEXT NOT NULL DEFAULT 'new'
               CHECK (status IN ('new','reviewed','answered','duplicate','ignored')),
  resolved_kn_id UUID REFERENCES agent_knowledge(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_unanswered_status ON agent_unanswered(status, created_at DESC);
ALTER TABLE agent_unanswered ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "unans_super_all" ON agent_unanswered;
DROP POLICY IF EXISTS "unans_pub_insert" ON agent_unanswered;
CREATE POLICY "unans_super_all"  ON agent_unanswered FOR ALL    USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
-- Público anon pode INSERIR (a agente registra perguntas sem resposta)
CREATE POLICY "unans_pub_insert" ON agent_unanswered FOR INSERT WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════════════
-- 5. SEED — categorias e configuração padrão
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO agent_categories (category_key, name, icon, order_index) VALUES
  ('acao_social',   'Ação Social',                  'fa-hand-holding-heart', 10),
  ('doacoes',       'Doações',                      'fa-gift',               20),
  ('alimentos',     'Alimentos',                    'fa-bowl-food',          30),
  ('familias',      'Famílias',                     'fa-people-roof',        40),
  ('voluntarios',   'Voluntários',                  'fa-hands-helping',      50),
  ('oracao',        'Pedidos de oração',            'fa-praying-hands',      60),
  ('comprovantes',  'Comprovantes',                 'fa-receipt',            70),
  ('eventos',       'Eventos',                      'fa-calendar-day',       80),
  ('faq',           'Perguntas frequentes',         'fa-circle-question',    90),
  ('regras',        'Regras internas',              'fa-shield-halved',      100),
  ('mensagens',     'Mensagens padrão',             'fa-comment-dots',       110),
  ('whatsapp',      'Atendimento WhatsApp',         'fa-whatsapp',           120)
ON CONFLICT (category_key) DO NOTHING;


INSERT INTO agent_settings
  (internal_key, display_name, avatar_url, tone, greeting,
   fallback_message, human_handoff, instructions, limits, active)
VALUES
  ('default', 'Dona Assunção', 'logo-semear.jpeg', 'acolhedor',
   'Olá! Sou a Dona Assunção, assistente da Ação Social Semear. Como posso ajudar você hoje?',
   'Ainda não tenho essa resposta certinha. Vou registrar sua dúvida e nossa equipe vai te retornar em breve.',
   'Caso precise falar com uma pessoa, pode escrever para nosso WhatsApp.',
   E'• Tom acolhedor, respeitoso e humano.\n• Sempre que mencionar dados específicos (datas, valores, nomes), use somente o que está na base de conhecimento aprovada.\n• Não invente. Em dúvida, peça para a pessoa falar com um responsável humano.\n• Use linguagem simples, com poucos termos técnicos.',
   '["nunca inventar dados","sempre confirmar nome do doador antes de gerar recibo","encaminhar casos delicados (saúde, violência, financeiro) para humano","respeitar a privacidade dos doadores e famílias atendidas","manter o tom respeitoso mesmo se a pessoa estiver irritada"]'::jsonb,
   TRUE)
ON CONFLICT (internal_key) DO NOTHING;


-- ── Knowledge seed (poucos itens iniciais — o usuário expande no painel)
INSERT INTO agent_knowledge (category_key, title, content, keywords, priority, status)
SELECT 'doacoes', 'Como faço uma doação?',
       'Você pode doar pelo formulário em /form.html. Escolha os itens, informe seus dados e finalize. Em seguida, gere o comprovante e envie pelo WhatsApp.',
       ARRAY['doar','doacao','doação','como doar','quero doar','contribuir'],
       80, 'active'
WHERE NOT EXISTS (SELECT 1 FROM agent_knowledge WHERE title = 'Como faço uma doação?');

INSERT INTO agent_knowledge (category_key, title, content, keywords, priority, status)
SELECT 'voluntarios', 'Como me tornar voluntário?',
       'Acesse /voluntario.html e preencha o cadastro. Avaliamos os perfis e entramos em contato em até 7 dias para combinar a primeira atividade.',
       ARRAY['voluntario','voluntária','voluntário','ajudar','quero ajudar','virar voluntario'],
       80, 'active'
WHERE NOT EXISTS (SELECT 1 FROM agent_knowledge WHERE title = 'Como me tornar voluntário?');

INSERT INTO agent_knowledge (category_key, title, content, keywords, priority, status)
SELECT 'comprovantes', 'Como envio o comprovante de Pix?',
       'Após preencher o formulário, na tela de finalização aparece um botão para enviar o comprovante. Você pode anexar a imagem ou enviar diretamente pelo WhatsApp.',
       ARRAY['comprovante','pix','enviar comprovante','recibo','compr.'],
       70, 'active'
WHERE NOT EXISTS (SELECT 1 FROM agent_knowledge WHERE title = 'Como envio o comprovante de Pix?');

INSERT INTO agent_knowledge (category_key, title, content, keywords, priority, status)
SELECT 'oracao', 'Como peço uma oração?',
       'Pelo formulário em /form.html há a opção de incluir um pedido de oração junto com sua doação, ou você pode enviar diretamente pelo nosso WhatsApp.',
       ARRAY['oracao','oração','pedido oracao','rezar','pedir oração'],
       60, 'active'
WHERE NOT EXISTS (SELECT 1 FROM agent_knowledge WHERE title = 'Como peço uma oração?');


-- ══════════════════════════════════════════════════════════════════════
-- 6. CHECAGEM
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE c INT; k INT; s INT;
BEGIN
  SELECT COUNT(*) INTO c FROM agent_categories;
  SELECT COUNT(*) INTO k FROM agent_knowledge;
  SELECT COUNT(*) INTO s FROM agent_settings;
  RAISE NOTICE '[Super Admin · Fase 6] Categorias: % · Conhecimentos: % · Settings: %', c, k, s;
END $$;
