-- ══════════════════════════════════════════════════════════════════════
-- DoaVida — Super Admin · Fase 1
-- Presets de dispositivos (Preview Responsivo) + tipos de seção
-- ══════════════════════════════════════════════════════════════════════
-- Idempotente. Pode rodar múltiplas vezes sem efeito colateral.
-- Pré-requisito: 001_super_admin_foundation.sql.
-- ══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════════════════════
-- 1. site_device_presets
--    Catálogo de modelos de dispositivos exibidos no Preview Responsivo.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_device_presets (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_name  TEXT NOT NULL,
  device_type  TEXT NOT NULL CHECK (device_type IN ('mobile','tablet','desktop')),
  brand        TEXT DEFAULT '',
  width        INTEGER NOT NULL,
  height       INTEGER NOT NULL,
  pixel_ratio  NUMERIC(4,2) DEFAULT 1,
  notch        BOOLEAN DEFAULT FALSE,
  status       TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  order_index  NUMERIC NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (device_name)
);

CREATE INDEX IF NOT EXISTS idx_devices_type_order
  ON site_device_presets(device_type, order_index);

DROP TRIGGER IF EXISTS trg_devices_updated_at ON site_device_presets;
CREATE TRIGGER trg_devices_updated_at
  BEFORE UPDATE ON site_device_presets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE site_device_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devices_super_admin"     ON site_device_presets;
DROP POLICY IF EXISTS "devices_authenticated_r" ON site_device_presets;

CREATE POLICY "devices_super_admin"
  ON site_device_presets FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Qualquer usuário autenticado pode ler (quando admin comum acessar o painel
-- nas próximas fases, ele precisa ver os presets de preview).
CREATE POLICY "devices_authenticated_r"
  ON site_device_presets FOR SELECT
  USING (auth.role() = 'authenticated');


-- ══════════════════════════════════════════════════════════════════════
-- 2. site_section_types
--    Tipos de seção disponíveis para criar dentro de uma página
--    (hero, cards, formulário, galeria, etc.). Cada tipo carrega um
--    schema padrão (default_payload) que serve de ponto de partida.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_section_types (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_key        TEXT NOT NULL UNIQUE,
  label           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  icon            TEXT DEFAULT 'fa-square',
  category        TEXT DEFAULT 'geral',
  default_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','beta','inactive')),
  order_index     NUMERIC NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_section_types_order ON site_section_types(category, order_index);

DROP TRIGGER IF EXISTS trg_section_types_updated_at ON site_section_types;
CREATE TRIGGER trg_section_types_updated_at
  BEFORE UPDATE ON site_section_types
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE site_section_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "section_types_super_admin"     ON site_section_types;
DROP POLICY IF EXISTS "section_types_authenticated_r" ON site_section_types;

CREATE POLICY "section_types_super_admin"
  ON site_section_types FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "section_types_authenticated_r"
  ON site_section_types FOR SELECT
  USING (auth.role() = 'authenticated');


-- ══════════════════════════════════════════════════════════════════════
-- 3. SEED — modelos de dispositivos
--    Cobre os modelos reais mais comuns no Brasil + ultrawide.
--    `width × height` em CSS pixels (a moldura usa esses valores no iframe).
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO site_device_presets (device_name, device_type, brand, width, height, pixel_ratio, notch, order_index) VALUES
  -- Mobile · Apple
  ('iPhone SE',            'mobile',  'Apple',     375,  667, 2,    FALSE,  10),
  ('iPhone 12 / 13',       'mobile',  'Apple',     390,  844, 3,    TRUE,   20),
  ('iPhone 14',            'mobile',  'Apple',     390,  844, 3,    TRUE,   30),
  ('iPhone 14 Pro',        'mobile',  'Apple',     393,  852, 3,    TRUE,   40),
  ('iPhone 15',            'mobile',  'Apple',     393,  852, 3,    TRUE,   50),
  ('iPhone 15 Pro Max',    'mobile',  'Apple',     430,  932, 3,    TRUE,   60),

  -- Mobile · Samsung
  ('Galaxy S20',           'mobile',  'Samsung',   360,  800, 3,    TRUE,  100),
  ('Galaxy S21',           'mobile',  'Samsung',   360,  800, 3,    TRUE,  110),
  ('Galaxy S22',           'mobile',  'Samsung',   360,  780, 3,    TRUE,  120),
  ('Galaxy S23',           'mobile',  'Samsung',   360,  780, 3,    TRUE,  130),
  ('Galaxy S24',           'mobile',  'Samsung',   360,  780, 3,    TRUE,  140),
  ('Galaxy A54',           'mobile',  'Samsung',   384,  854, 2.75, TRUE,  150),
  ('Galaxy A55',           'mobile',  'Samsung',   384,  854, 2.75, TRUE,  160),

  -- Mobile · outros
  ('Pixel 7',              'mobile',  'Google',    412,  915, 2.625, TRUE, 200),
  ('Pixel 8',              'mobile',  'Google',    412,  915, 2.625, TRUE, 210),
  ('Moto G',               'mobile',  'Motorola',  360,  800, 2,    FALSE, 220),

  -- Tablet
  ('iPad Mini',            'tablet',  'Apple',     768, 1024, 2, FALSE, 300),
  ('iPad',                 'tablet',  'Apple',     810, 1080, 2, FALSE, 310),
  ('iPad Air',             'tablet',  'Apple',     820, 1180, 2, FALSE, 320),
  ('iPad Pro 11"',         'tablet',  'Apple',     834, 1194, 2, FALSE, 330),
  ('iPad Pro 12.9"',       'tablet',  'Apple',    1024, 1366, 2, FALSE, 340),
  ('Galaxy Tab S',         'tablet',  'Samsung',   800, 1280, 2, FALSE, 350),

  -- Desktop
  ('Notebook 13"',         'desktop', '',         1280,  720, 1, FALSE, 400),
  ('Notebook 14"',         'desktop', '',         1366,  768, 1, FALSE, 410),
  ('Notebook 15"',         'desktop', '',         1440,  900, 1, FALSE, 420),
  ('Full HD',              'desktop', '',         1920, 1080, 1, FALSE, 430),
  ('2K',                   'desktop', '',         2560, 1440, 1, FALSE, 440),
  ('4K',                   'desktop', '',         3840, 2160, 1, FALSE, 450),
  ('Ultrawide',            'desktop', '',         3440, 1440, 1, FALSE, 460)
ON CONFLICT (device_name) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════
-- 4. SEED — tipos de seção
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO site_section_types (type_key, label, description, icon, category, default_payload, order_index) VALUES
  ('hero',       'Hero / Capa',         'Bloco de capa com título grande, subtítulo e CTA',  'fa-image',         'capa',     '{"title":"","subtitle":"","cta":{"label":"","link":""},"background":""}', 10),
  ('text',       'Texto institucional', 'Bloco de texto rico (parágrafos)',                  'fa-align-left',    'conteudo', '{"heading":"","body":""}', 20),
  ('cards',      'Grade de cards',      'Lista de cards (chamadas, serviços, valores)',      'fa-grip',          'conteudo', '{"heading":"","items":[]}', 30),
  ('gallery',    'Galeria de imagens',  'Galeria/carrossel de fotos',                        'fa-images',        'midia',    '{"heading":"","items":[]}', 40),
  ('video',      'Vídeo',               'Bloco com vídeo embed/upload',                      'fa-video',         'midia',    '{"heading":"","src":"","poster":""}', 50),
  ('form',       'Formulário',          'Formulário customizado',                            'fa-list-check',    'formularios','{"heading":"","fields":[],"submit":"Enviar"}', 60),
  ('cta',        'Chamada para ação',   'Banner CTA com botão',                              'fa-bullhorn',      'conteudo', '{"title":"","subtitle":"","cta":{"label":"","link":""}}', 70),
  ('stats',      'Estatísticas',        'Números/contadores em destaque',                    'fa-chart-simple',  'dados',    '{"heading":"","items":[]}', 80),
  ('testimonials','Depoimentos',        'Lista de depoimentos',                              'fa-quote-left',    'conteudo', '{"heading":"","items":[]}', 90),
  ('faq',        'Perguntas frequentes','FAQ em accordion',                                  'fa-circle-question','conteudo','{"heading":"","items":[]}', 100),
  ('contact',    'Contato',             'Bloco com informações de contato',                  'fa-address-card',  'contato',  '{"heading":"","items":[]}', 110),
  ('custom',     'Personalizado',       'Seção em branco para conteúdo livre',               'fa-square',        'avancado', '{}', 999)
ON CONFLICT (type_key) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════
-- 5. CHECAGEM
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  d INT; s INT;
BEGIN
  SELECT COUNT(*) INTO d FROM site_device_presets;
  SELECT COUNT(*) INTO s FROM site_section_types;
  RAISE NOTICE '[Super Admin · Fase 1] Devices: % · Section types: %', d, s;
END $$;
