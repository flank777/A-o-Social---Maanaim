-- ══════════════════════════════════════════════════════════════════════
-- DoaVida — Super Admin · Fase 5
-- Identidade visual (fontes + paletas) + textos globais + recibos
-- ══════════════════════════════════════════════════════════════════════
-- Idempotente. Pré-requisitos: 001..006.
-- Comprovantes reutilizam a tabela `configuracao` (chaves `proof_*`).
-- ══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════════════════════
-- 1. site_fonts — catálogo paginado (preparado para 500+)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_fonts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  font_key     TEXT NOT NULL UNIQUE,
  family       TEXT NOT NULL,
  -- URL @import (Google Fonts ou outro CDN). Ex.:
  -- https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap
  import_url   TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'sans-serif'
               CHECK (category IN ('sans-serif','serif','display','handwriting','monospace','institucional','elegante')),
  level        TEXT NOT NULL DEFAULT 'iniciante'
               CHECK (level IN ('iniciante','intermediario','avancado','premium')),
  weights      JSONB NOT NULL DEFAULT '[400,700]'::jsonb,
  preview_text TEXT DEFAULT 'A solidariedade transforma vidas.',
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  built_in     BOOLEAN NOT NULL DEFAULT FALSE,
  order_index  NUMERIC NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fonts_category_level ON site_fonts(category, level, order_index);
CREATE INDEX IF NOT EXISTS idx_fonts_search ON site_fonts USING gin (to_tsvector('portuguese', family));

DROP TRIGGER IF EXISTS trg_fonts_updated_at ON site_fonts;
CREATE TRIGGER trg_fonts_updated_at BEFORE UPDATE ON site_fonts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE site_fonts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fonts_public_read"     ON site_fonts;
DROP POLICY IF EXISTS "fonts_super_admin_all" ON site_fonts;
CREATE POLICY "fonts_public_read"     ON site_fonts FOR SELECT USING (status = 'active');
CREATE POLICY "fonts_super_admin_all" ON site_fonts FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- 2. site_color_palettes — paletas reutilizáveis
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_color_palettes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  palette_key  TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  description  TEXT DEFAULT '',
  -- tokens: { primary, secondary, accent, background, surface, text, text_soft, border, ... }
  tokens       JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  built_in     BOOLEAN NOT NULL DEFAULT FALSE,
  order_index  NUMERIC NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_palettes_updated_at ON site_color_palettes;
CREATE TRIGGER trg_palettes_updated_at BEFORE UPDATE ON site_color_palettes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE site_color_palettes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "palettes_public_read"     ON site_color_palettes;
DROP POLICY IF EXISTS "palettes_super_admin_all" ON site_color_palettes;
CREATE POLICY "palettes_public_read"     ON site_color_palettes FOR SELECT USING (status = 'active');
CREATE POLICY "palettes_super_admin_all" ON site_color_palettes FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- 3. site_global_texts — textos compartilhados (i18n-ready)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_global_texts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text_key     TEXT NOT NULL UNIQUE,
  -- valor por locale: { "pt-BR": "...", "en": "..." }
  value        JSONB NOT NULL DEFAULT '{"pt-BR": ""}'::jsonb,
  context      TEXT DEFAULT '',
  area         TEXT NOT NULL DEFAULT 'geral'
               CHECK (area IN ('geral','site_publico','admin','botoes','formularios','mensagens','modais','recibos','comprovantes','whatsapp','emails','graficos','tabelas','vazios','erros','sucessos','carregamentos')),
  description  TEXT DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_texts_area ON site_global_texts(area, text_key);
DROP TRIGGER IF EXISTS trg_texts_updated_at ON site_global_texts;
CREATE TRIGGER trg_texts_updated_at BEFORE UPDATE ON site_global_texts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE site_global_texts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "texts_public_read"     ON site_global_texts;
DROP POLICY IF EXISTS "texts_super_admin_all" ON site_global_texts;
CREATE POLICY "texts_public_read"     ON site_global_texts FOR SELECT USING (status = 'active');
CREATE POLICY "texts_super_admin_all" ON site_global_texts FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- 4. site_receipt_templates — templates de recibo
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_receipt_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key    TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  org_name        TEXT DEFAULT '',
  org_subtitle    TEXT DEFAULT '',
  logo_left_url   TEXT DEFAULT '',
  logo_right_url  TEXT DEFAULT '',
  receipt_title   TEXT DEFAULT 'Recibo de Doação',
  protocol_prefix TEXT DEFAULT 'DOA',
  thanks_message  TEXT DEFAULT 'Obrigado pela sua doação!',
  signature_label TEXT DEFAULT 'Responsável',
  footer_text     TEXT DEFAULT '',
  show_fields     JSONB NOT NULL DEFAULT '["protocolo","data","doador","item","quantidade","entrega"]'::jsonb,
  required_fields JSONB NOT NULL DEFAULT '["doador","item"]'::jsonb,
  primary_color   TEXT DEFAULT '#4a8a39',
  font_family     TEXT DEFAULT 'DM Sans',
  status          TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_receipts_updated_at ON site_receipt_templates;
CREATE TRIGGER trg_receipts_updated_at BEFORE UPDATE ON site_receipt_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE site_receipt_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receipts_public_read"     ON site_receipt_templates;
DROP POLICY IF EXISTS "receipts_super_admin_all" ON site_receipt_templates;
CREATE POLICY "receipts_public_read"     ON site_receipt_templates FOR SELECT USING (status = 'published');
CREATE POLICY "receipts_super_admin_all" ON site_receipt_templates FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- 5. SEED — fontes (Google Fonts curadas)
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO site_fonts (font_key, family, import_url, category, level, weights, built_in, order_index) VALUES
  ('inter',           'Inter',            'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',          'sans-serif',    'iniciante',  '[400,500,600,700]', TRUE, 10),
  ('dm-sans',         'DM Sans',          'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',         'sans-serif',    'iniciante',  '[400,500,600,700]', TRUE, 20),
  ('manrope',         'Manrope',          'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap',              'sans-serif',    'iniciante',  '[400,600,700]',     TRUE, 30),
  ('plus-jakarta',    'Plus Jakarta Sans','https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap',    'sans-serif',    'intermediario','[400,600,700]',   TRUE, 40),
  ('roboto-flex',     'Roboto Flex',      'https://fonts.googleapis.com/css2?family=Roboto+Flex:wght@400;600;700&display=swap',          'sans-serif',    'intermediario','[400,600,700]',   TRUE, 50),
  ('playfair',        'Playfair Display', 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap',         'serif',         'iniciante',  '[600,700]',         TRUE, 60),
  ('cormorant',       'Cormorant Garamond','https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;700&display=swap',     'serif',         'elegante',   '[500,700]',         TRUE, 70),
  ('lora',            'Lora',             'https://fonts.googleapis.com/css2?family=Lora:wght@400;600&display=swap',                     'serif',         'institucional','[400,600]',       TRUE, 80),
  ('merriweather',    'Merriweather',     'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',             'serif',         'institucional','[400,700]',       TRUE, 90),
  ('space-grotesk',   'Space Grotesk',    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap',        'display',       'avancado',   '[400,600,700]',     TRUE, 100),
  ('outfit',          'Outfit',           'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap',               'display',       'avancado',   '[400,600,700]',     TRUE, 110),
  ('caveat',          'Caveat',           'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap',                   'handwriting',   'iniciante',  '[400,700]',         TRUE, 120),
  ('dancing-script',  'Dancing Script',   'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap',           'handwriting',   'elegante',   '[400,700]',         TRUE, 130),
  ('space-mono',      'Space Mono',       'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',               'monospace',     'iniciante',  '[400,700]',         TRUE, 140),
  ('jetbrains-mono',  'JetBrains Mono',   'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap',           'monospace',     'avancado',   '[400,600]',         TRUE, 150)
ON CONFLICT (font_key) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════
-- 6. SEED — paletas curadas
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO site_color_palettes (palette_key, name, description, tokens, is_default, built_in, order_index) VALUES
  ('semear-classic', 'Semear Clássica', 'Paleta atual da Ação Social Semear · creme, verde, dourado.',
   '{"primary":"#4a8a39","secondary":"#7DC063","accent":"#E8C96A","background":"#faf9f5","surface":"#ffffff","text":"#1c1814","text_soft":"#3a3228","border":"rgba(0,0,0,0.10)"}'::jsonb,
   TRUE, TRUE, 10),
  ('semear-dark',    'Semear Escura',   'Versão escura premium — dashboards e admin.',
   '{"primary":"#5fa64a","secondary":"#7DC063","accent":"#E8C96A","background":"#0e1116","surface":"#151a22","text":"#e8eaf0","text_soft":"#b6bcc8","border":"rgba(255,255,255,0.10)"}'::jsonb,
   FALSE, TRUE, 20),
  ('warm-comunidade','Comunidade Quente','Tons quentes acolhedores — ideal para landing pages.',
   '{"primary":"#c2541a","secondary":"#e08e3a","accent":"#fff5d6","background":"#fff8ee","surface":"#ffffff","text":"#3a201c","text_soft":"#5a3a2c","border":"rgba(80,30,10,0.12)"}'::jsonb,
   FALSE, TRUE, 30),
  ('cool-noturno',   'Noturno Frio',    'Azuis profundos — sofisticado e moderno.',
   '{"primary":"#3d7eb8","secondary":"#5ea7e6","accent":"#9bd2ff","background":"#0a0f17","surface":"#121a26","text":"#dee9f6","text_soft":"#a7b8cf","border":"rgba(155,210,255,0.10)"}'::jsonb,
   FALSE, TRUE, 40)
ON CONFLICT (palette_key) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════
-- 7. SEED — textos globais essenciais
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO site_global_texts (text_key, value, area, description) VALUES
  ('btn.save',        '{"pt-BR":"Salvar"}',                              'botoes',     'Texto do botão salvar (genérico)'),
  ('btn.cancel',      '{"pt-BR":"Cancelar"}',                            'botoes',     'Texto do botão cancelar'),
  ('btn.send',        '{"pt-BR":"Enviar"}',                              'botoes',     'Texto do botão enviar'),
  ('btn.donate',      '{"pt-BR":"Doar agora"}',                          'botoes',     'CTA principal de doação'),
  ('msg.success',     '{"pt-BR":"Salvo com sucesso!"}',                  'sucessos',   'Toast genérico de sucesso'),
  ('msg.error',       '{"pt-BR":"Algo deu errado. Tente novamente."}',   'erros',      'Toast genérico de erro'),
  ('msg.empty.list',  '{"pt-BR":"Nada por aqui ainda."}',                'vazios',     'Estado vazio de listas'),
  ('msg.loading',     '{"pt-BR":"Carregando…"}',                         'carregamentos','Texto de loading inline'),
  ('whatsapp.greet',  '{"pt-BR":"Olá! Acabei de fazer uma doação."}',    'whatsapp',   'Mensagem padrão WhatsApp'),
  ('proof.intro',     '{"pt-BR":"Envie o comprovante do seu Pix para finalizar a doação."}','comprovantes','Instrução de envio'),
  ('proof.pending',   '{"pt-BR":"Comprovante recebido. Aguardando confirmação."}','comprovantes','Status pendente'),
  ('proof.approved',  '{"pt-BR":"Comprovante aprovado! Obrigado pela doação."}','comprovantes','Status aprovado'),
  ('proof.rejected',  '{"pt-BR":"Comprovante recusado. Por favor, envie novamente."}','comprovantes','Status recusado')
ON CONFLICT (text_key) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════
-- 8. SEED — recibo padrão
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO site_receipt_templates
  (template_key, name, org_name, org_subtitle, logo_left_url, logo_right_url,
   receipt_title, protocol_prefix, thanks_message, signature_label, footer_text,
   primary_color, font_family, status)
VALUES
  ('default', 'Padrão DoaVida',
   'Ação Social Semear', 'Comunidade Evangélica Maanaim · Belém, PA',
   'logo-semear.jpeg', 'logo-maanaim.jpeg',
   'Recibo de Doação', 'DOA',
   'Que sua generosidade alimente esperança.',
   'Coordenação · Ação Social Semear',
   'Belém · Pará · 2026',
   '#4a8a39', 'DM Sans',
   'published')
ON CONFLICT (template_key) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════
-- 9. CHECAGEM
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE f INT; p INT; t INT; r INT;
BEGIN
  SELECT COUNT(*) INTO f FROM site_fonts;
  SELECT COUNT(*) INTO p FROM site_color_palettes;
  SELECT COUNT(*) INTO t FROM site_global_texts;
  SELECT COUNT(*) INTO r FROM site_receipt_templates;
  RAISE NOTICE '[Super Admin · Fase 5] Fontes: % · Paletas: % · Textos globais: % · Recibos: %', f, p, t, r;
END $$;
