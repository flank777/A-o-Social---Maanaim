-- ══════════════════════════════════════════════════════════════════════
-- DoaVida — Super Admin · Fase 4
-- Animações · Efeitos · 3D · Transições · Página de carregamento
-- ══════════════════════════════════════════════════════════════════════
-- Idempotente. Pré-requisitos: 001..005.
-- ══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════════════════════
-- 1. site_style_presets — biblioteca paginada de animações/efeitos/etc.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_style_presets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  preset_key    TEXT NOT NULL UNIQUE,
  preset_name   TEXT NOT NULL,
  preset_type   TEXT NOT NULL CHECK (preset_type IN ('animation','transition','effect','effect3d','background','filter','text_effect')),
  level         TEXT NOT NULL DEFAULT 'iniciante' CHECK (level IN ('iniciante','intermediario','avancado','premium','3d')),
  category      TEXT DEFAULT 'geral',
  -- CSS aplicado quando o preset é ativado. Usar `:root --vars` permite
  -- combinar com `data-sa-anim="<preset_key>"` em qualquer elemento.
  css           TEXT NOT NULL DEFAULT '',
  -- Configuração leve para futuros parâmetros (duration default, easing, etc.)
  config        JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_html  TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','beta','inactive')),
  built_in      BOOLEAN NOT NULL DEFAULT FALSE,
  order_index   NUMERIC NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presets_type_level ON site_style_presets(preset_type, level, order_index);
CREATE INDEX IF NOT EXISTS idx_presets_category   ON site_style_presets(category);
CREATE INDEX IF NOT EXISTS idx_presets_search     ON site_style_presets USING gin (to_tsvector('portuguese', preset_name || ' ' || COALESCE(description, '')));

DROP TRIGGER IF EXISTS trg_presets_updated_at ON site_style_presets;
CREATE TRIGGER trg_presets_updated_at
  BEFORE UPDATE ON site_style_presets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE site_style_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presets_public_read"     ON site_style_presets;
DROP POLICY IF EXISTS "presets_super_admin_all" ON site_style_presets;

-- Públicos: site público precisa ler para aplicar os estilos
CREATE POLICY "presets_public_read"
  ON site_style_presets FOR SELECT
  USING (status = 'active');

CREATE POLICY "presets_super_admin_all"
  ON site_style_presets FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- 2. site_loading_pages — configuração da tela de carregamento
--    Singleton "default" + variações futuras por device/página.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_loading_pages (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  internal_key       TEXT NOT NULL UNIQUE,             -- 'default', 'mobile', 'admin', etc.
  title              TEXT NOT NULL DEFAULT 'Carregando…',
  subtitle           TEXT DEFAULT '',
  logo_url           TEXT DEFAULT '',
  background_color   TEXT DEFAULT '#0e1116',
  text_color         TEXT DEFAULT '#e8eaf0',
  accent_color       TEXT DEFAULT '#4a8a39',
  show_ring          BOOLEAN NOT NULL DEFAULT TRUE,
  show_progress      BOOLEAN NOT NULL DEFAULT TRUE,
  min_duration_ms    INTEGER NOT NULL DEFAULT 600,
  max_duration_ms    INTEGER NOT NULL DEFAULT 4000,
  messages           JSONB NOT NULL DEFAULT '["Preparando sua experiência…","Organizando informações…","Quase lá…"]'::jsonb,
  draft_payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_payload  JSONB NOT NULL DEFAULT '{}'::jsonb,
  status             TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_loading_pages_updated_at ON site_loading_pages;
CREATE TRIGGER trg_loading_pages_updated_at
  BEFORE UPDATE ON site_loading_pages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE site_loading_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loading_public_read"     ON site_loading_pages;
DROP POLICY IF EXISTS "loading_super_admin_all" ON site_loading_pages;

CREATE POLICY "loading_public_read"
  ON site_loading_pages FOR SELECT
  USING (status = 'published');

CREATE POLICY "loading_super_admin_all"
  ON site_loading_pages FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- 3. SEED — presets de animação/efeito/transição/3D (curado, expansível)
--    A arquitetura suporta até 500 por categoria — começamos com base
--    coerente que cobre ~90% dos casos comuns.
-- ══════════════════════════════════════════════════════════════════════

-- ── ANIMAÇÕES (entrada) ──────────────────────────────────────────────
INSERT INTO site_style_presets (preset_key, preset_name, preset_type, level, category, css, description, built_in, order_index) VALUES
  ('anim-fade-in',       'Fade in',           'animation', 'iniciante', 'entrada',
   '@keyframes sa-fade-in { from { opacity: 0 } to { opacity: 1 } }
    [data-sa-anim="anim-fade-in"] { animation: sa-fade-in .6s ease both; }',
   'Aparece suavemente.', TRUE, 10),

  ('anim-fade-up',       'Fade up',           'animation', 'iniciante', 'entrada',
   '@keyframes sa-fade-up { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: none } }
    [data-sa-anim="anim-fade-up"] { animation: sa-fade-up .55s cubic-bezier(.2,.7,.2,1) both; }',
   'Surge de baixo para cima.', TRUE, 20),

  ('anim-fade-down',     'Fade down',         'animation', 'iniciante', 'entrada',
   '@keyframes sa-fade-down { from { opacity: 0; transform: translateY(-20px) } to { opacity: 1; transform: none } }
    [data-sa-anim="anim-fade-down"] { animation: sa-fade-down .55s cubic-bezier(.2,.7,.2,1) both; }',
   'Surge do topo.', TRUE, 30),

  ('anim-slide-left',    'Slide left',        'animation', 'iniciante', 'entrada',
   '@keyframes sa-slide-left { from { opacity: 0; transform: translateX(36px) } to { opacity: 1; transform: none } }
    [data-sa-anim="anim-slide-left"] { animation: sa-slide-left .55s cubic-bezier(.2,.7,.2,1) both; }',
   'Entra deslizando da direita.', TRUE, 40),

  ('anim-slide-right',   'Slide right',       'animation', 'iniciante', 'entrada',
   '@keyframes sa-slide-right { from { opacity: 0; transform: translateX(-36px) } to { opacity: 1; transform: none } }
    [data-sa-anim="anim-slide-right"] { animation: sa-slide-right .55s cubic-bezier(.2,.7,.2,1) both; }',
   'Entra deslizando da esquerda.', TRUE, 50),

  ('anim-zoom-in',       'Zoom in',           'animation', 'iniciante', 'entrada',
   '@keyframes sa-zoom-in { from { opacity: 0; transform: scale(.86) } to { opacity: 1; transform: none } }
    [data-sa-anim="anim-zoom-in"] { animation: sa-zoom-in .5s cubic-bezier(.2,.7,.2,1) both; }',
   'Cresce ao aparecer.', TRUE, 60),

  ('anim-bounce',        'Bounce',            'animation', 'intermediario', 'destaque',
   '@keyframes sa-bounce { 0% { transform: translateY(0) } 30% { transform: translateY(-12px) } 60% { transform: translateY(0) } 80% { transform: translateY(-4px) } 100% { transform: translateY(0) } }
    [data-sa-anim="anim-bounce"] { animation: sa-bounce .9s ease both; }',
   'Pulinho de destaque.', TRUE, 70),

  ('anim-pulse',         'Pulse',             'animation', 'intermediario', 'destaque',
   '@keyframes sa-pulse { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.03); opacity: .95 } }
    [data-sa-anim="anim-pulse"] { animation: sa-pulse 1.6s ease-in-out infinite; }',
   'Pulsa suavemente, em loop.', TRUE, 80),

  ('anim-float',         'Float',             'animation', 'intermediario', 'destaque',
   '@keyframes sa-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
    [data-sa-anim="anim-float"] { animation: sa-float 3.4s ease-in-out infinite; }',
   'Flutua devagar, em loop.', TRUE, 90),

  ('anim-shimmer',       'Shimmer',           'animation', 'avancado', 'destaque',
   '@keyframes sa-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
    [data-sa-anim="anim-shimmer"] { background: linear-gradient(90deg, currentColor 25%, rgba(255,255,255,.6) 50%, currentColor 75%); background-size: 200% 100%; animation: sa-shimmer 2.4s linear infinite; -webkit-background-clip: text; background-clip: text; color: transparent; }',
   'Brilho que atravessa o texto.', TRUE, 100),

  ('anim-typing',        'Máquina de escrever','animation', 'avancado', 'texto',
   '@keyframes sa-typing { from { width: 0 } to { width: 100% } }
    @keyframes sa-caret { 50% { border-color: transparent } }
    [data-sa-anim="anim-typing"] { display: inline-block; overflow: hidden; white-space: nowrap; border-right: 2px solid currentColor; animation: sa-typing 2.4s steps(34, end) both, sa-caret .8s step-end infinite; }',
   'Digitação progressiva.', TRUE, 110)
ON CONFLICT (preset_key) DO NOTHING;

-- ── EFEITOS (hover/glow) ─────────────────────────────────────────────
INSERT INTO site_style_presets (preset_key, preset_name, preset_type, level, category, css, description, built_in, order_index) VALUES
  ('effect-glow',        'Glow no hover',     'effect', 'iniciante', 'hover',
   '[data-sa-anim="effect-glow"] { transition: box-shadow .25s ease, transform .25s ease; }
    [data-sa-anim="effect-glow"]:hover { box-shadow: 0 0 0 4px rgba(74,138,57,.18), 0 8px 24px rgba(74,138,57,.35); transform: translateY(-2px); }',
   'Brilho verde ao passar o mouse.', TRUE, 10),

  ('effect-lift',        'Eleva no hover',    'effect', 'iniciante', 'hover',
   '[data-sa-anim="effect-lift"] { transition: transform .25s cubic-bezier(.2,.7,.2,1), box-shadow .25s ease; }
    [data-sa-anim="effect-lift"]:hover { transform: translateY(-4px); box-shadow: 0 18px 38px rgba(0,0,0,.22); }',
   'Sobe levemente no hover.', TRUE, 20),

  ('effect-magnetic',    'Magnético',         'effect', 'avancado', 'hover',
   '[data-sa-anim="effect-magnetic"] { transition: transform .35s cubic-bezier(.2,.7,.2,1); will-change: transform; }
    [data-sa-anim="effect-magnetic"]:hover { transform: scale(1.04) rotate(.4deg); }',
   'Pequena imantação no cursor.', TRUE, 30),

  ('effect-glass',       'Glassmorphism',     'effect', 'premium', 'superficie',
   '[data-sa-anim="effect-glass"] { background: rgba(255,255,255,.10); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,.18); }',
   'Vidro fosco com borda sutil.', TRUE, 40),

  ('effect-neon',        'Neon outline',      'effect', 'premium', 'destaque',
   '[data-sa-anim="effect-neon"] { color: #c8ffd0; text-shadow: 0 0 4px #4a8a39, 0 0 16px #4a8a39, 0 0 32px rgba(74,138,57,.6); }',
   'Texto com brilho neon verde.', TRUE, 50)
ON CONFLICT (preset_key) DO NOTHING;

-- ── EFEITOS 3D ───────────────────────────────────────────────────────
INSERT INTO site_style_presets (preset_key, preset_name, preset_type, level, category, css, description, built_in, order_index) VALUES
  ('3d-tilt',            'Tilt 3D',           'effect3d', '3d', '3d',
   '[data-sa-anim="3d-tilt"] { transform-style: preserve-3d; transition: transform .3s cubic-bezier(.2,.7,.2,1); }
    [data-sa-anim="3d-tilt"]:hover { transform: perspective(800px) rotateX(6deg) rotateY(-6deg) translateY(-2px); }',
   'Inclina como um cartão 3D no hover.', TRUE, 10),

  ('3d-flip',            'Flip 3D',           'effect3d', '3d', '3d',
   '[data-sa-anim="3d-flip"] { transform-style: preserve-3d; transition: transform .6s cubic-bezier(.2,.7,.2,1); }
    [data-sa-anim="3d-flip"]:hover { transform: rotateY(180deg); }',
   'Vira o elemento (precisa back-face em outro elemento).', TRUE, 20),

  ('3d-depth',            'Profundidade',     'effect3d', 'avancado', '3d',
   '[data-sa-anim="3d-depth"] { box-shadow: 0 1px 0 rgba(255,255,255,.06) inset, 0 6px 0 #1f3018, 0 12px 24px rgba(0,0,0,.35); transform: translateY(0); transition: transform .15s ease, box-shadow .15s ease; }
    [data-sa-anim="3d-depth"]:active { transform: translateY(4px); box-shadow: 0 1px 0 rgba(255,255,255,.06) inset, 0 2px 0 #1f3018, 0 4px 10px rgba(0,0,0,.35); }',
   'Botão com base sólida 3D, afunda ao clicar.', TRUE, 30)
ON CONFLICT (preset_key) DO NOTHING;

-- ── TRANSIÇÕES de conteúdo ──────────────────────────────────────────
INSERT INTO site_style_presets (preset_key, preset_name, preset_type, level, category, css, description, built_in, order_index) VALUES
  ('trans-smooth',       'Smooth (default)',  'transition', 'iniciante', 'global',
   '[data-sa-trans="smooth"] { transition: all .35s cubic-bezier(.2,.7,.2,1); }',
   'Transição padrão suave.', TRUE, 10),

  ('trans-snappy',       'Snappy',            'transition', 'iniciante', 'global',
   '[data-sa-trans="snappy"] { transition: all .15s cubic-bezier(.4,0,.2,1); }',
   'Resposta rápida, ideal para botões.', TRUE, 20),

  ('trans-elastic',      'Elastic',           'transition', 'avancado', 'global',
   '[data-sa-trans="elastic"] { transition: transform .55s cubic-bezier(.34,1.56,.64,1); }',
   'Saída elástica com leve overshoot.', TRUE, 30)
ON CONFLICT (preset_key) DO NOTHING;

-- ── BACKGROUNDS animados ────────────────────────────────────────────
INSERT INTO site_style_presets (preset_key, preset_name, preset_type, level, category, css, description, built_in, order_index) VALUES
  ('bg-gradient-flow',   'Gradiente animado', 'background', 'intermediario', 'fundo',
   '@keyframes sa-grad { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }
    [data-sa-anim="bg-gradient-flow"] { background: linear-gradient(120deg, #4a8a39, #7DC063, #E8C96A, #4a8a39); background-size: 400% 400%; animation: sa-grad 14s ease infinite; }',
   'Gradiente verde-dourado em loop.', TRUE, 10),

  ('bg-aurora',          'Aurora',            'background', 'premium', 'fundo',
   '[data-sa-anim="bg-aurora"] { background: radial-gradient(1200px 600px at 10% -10%, rgba(125,192,99,.45), transparent 60%), radial-gradient(900px 500px at 110% 110%, rgba(232,201,106,.30), transparent 60%), #0e1116; }',
   'Camadas suaves estilo aurora boreal.', TRUE, 20)
ON CONFLICT (preset_key) DO NOTHING;

-- ── TEXT EFFECTS ────────────────────────────────────────────────────
INSERT INTO site_style_presets (preset_key, preset_name, preset_type, level, category, css, description, built_in, order_index) VALUES
  ('text-gradient-gold', 'Texto gradiente ouro', 'text_effect', 'iniciante', 'texto',
   '[data-sa-anim="text-gradient-gold"] { background: linear-gradient(90deg, #E8C96A, #b89a4f); -webkit-background-clip: text; background-clip: text; color: transparent; }',
   'Texto preenchido com gradiente dourado.', TRUE, 10),

  ('text-shadow-soft',   'Sombra suave',      'text_effect', 'iniciante', 'texto',
   '[data-sa-anim="text-shadow-soft"] { text-shadow: 0 2px 8px rgba(0,0,0,.18); }',
   'Sombra leve para legibilidade sobre imagens.', TRUE, 20),

  ('text-outline',       'Contorno',          'text_effect', 'intermediario', 'texto',
   '[data-sa-anim="text-outline"] { color: transparent; -webkit-text-stroke: 1px currentColor; text-stroke: 1px currentColor; }',
   'Texto somente com contorno.', TRUE, 30)
ON CONFLICT (preset_key) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════
-- 4. SEED — loading page padrão
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO site_loading_pages
  (internal_key, title, subtitle, logo_url, background_color, text_color, accent_color,
   show_ring, show_progress, min_duration_ms, max_duration_ms, messages, status)
VALUES
  ('default', 'DoaVida', 'Ação Social Semear · Belém, PA',
   'logo-semear.jpeg', '#faf9f5', '#1c1814', '#4a8a39',
   TRUE, TRUE, 600, 4000,
   '["Preparando sua experiência…","Organizando informações…","Quase lá…"]'::jsonb,
   'published')
ON CONFLICT (internal_key) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════
-- 5. CHECAGEM
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE p INT; l INT;
BEGIN
  SELECT COUNT(*) INTO p FROM site_style_presets;
  SELECT COUNT(*) INTO l FROM site_loading_pages;
  RAISE NOTICE '[Super Admin · Fase 4] Presets: % · Loading pages: %', p, l;
END $$;
