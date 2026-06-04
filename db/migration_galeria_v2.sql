-- ══════════════════════════════════════════════════════════════════════
-- Ação Social — Migration: Galeria v2
-- Adiciona suporte a vídeos, ordenação, ativo/inativo, poster, alt, storage_path
--
-- COMO EXECUTAR:
-- 1. Acesse o painel Supabase → SQL Editor
-- 2. Cole este arquivo e clique em "Run"
-- 3. Execute UMA ÚNICA VEZ — as colunas são adicionadas apenas se não existirem
-- ══════════════════════════════════════════════════════════════════════

-- ── Tipo da mídia: 'imagem' ou 'video' ───────────────────────────────
ALTER TABLE galeria
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'imagem'
    CHECK (tipo IN ('imagem', 'video'));

-- ── Título curto (exibido no admin e nas seleções) ───────────────────
ALTER TABLE galeria
  ADD COLUMN IF NOT EXISTS titulo TEXT DEFAULT '';

-- ── Texto alternativo (acessibilidade + SEO) ─────────────────────────
ALTER TABLE galeria
  ADD COLUMN IF NOT EXISTS alt TEXT DEFAULT '';

-- ── Caminho interno no Supabase Storage (sem a URL base) ─────────────
ALTER TABLE galeria
  ADD COLUMN IF NOT EXISTS storage_path TEXT DEFAULT '';

-- ── Ordem de exibição (menor = primeiro) ─────────────────────────────
ALTER TABLE galeria
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- ── Ativo/inativo (false = oculto em todas as páginas públicas) ───────
ALTER TABLE galeria
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- ── URL do poster de vídeo (frame de pré-visualização) ───────────────
ALTER TABLE galeria
  ADD COLUMN IF NOT EXISTS poster_url TEXT DEFAULT '';

-- ── Índices para performance ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_galeria_tipo      ON galeria(tipo);
CREATE INDEX IF NOT EXISTS idx_galeria_ativo     ON galeria(ativo);
CREATE INDEX IF NOT EXISTS idx_galeria_categoria ON galeria(categoria);
CREATE INDEX IF NOT EXISTS idx_galeria_order     ON galeria(order_index ASC);

-- ── RLS: garantir policies para galeria ──────────────────────────────
ALTER TABLE galeria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura_publica_galeria" ON public.galeria;
CREATE POLICY "leitura_publica_galeria"
  ON public.galeria FOR SELECT USING (true);

DROP POLICY IF EXISTS "insercao_publica_galeria" ON public.galeria;
CREATE POLICY "insercao_publica_galeria"
  ON public.galeria FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "atualizacao_publica_galeria" ON public.galeria;
CREATE POLICY "atualizacao_publica_galeria"
  ON public.galeria FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "exclusao_publica_galeria" ON public.galeria;
CREATE POLICY "exclusao_publica_galeria"
  ON public.galeria FOR DELETE USING (true);

-- ── Confirmar estrutura resultante ───────────────────────────────────
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'galeria'
ORDER BY ordinal_position;
