-- ══════════════════════════════════════════════════════════════════════
-- DoaVida — Schema: Sistema de Cestas Básicas
-- Cole no SQL Editor do Supabase e clique RUN
-- (seguro para rodar múltiplas vezes — não duplica nada)
-- ══════════════════════════════════════════════════════════════════════

-- Extensão UUID (se ainda não habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── TABELA: modelo_cesta_itens ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS modelo_cesta_itens (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alimento_id         UUID REFERENCES alimentos(id) ON DELETE CASCADE,
  alimento_nome       TEXT NOT NULL,
  alimento_emoji      TEXT DEFAULT '🥫',
  quantidade_por_cesta NUMERIC(10,3) NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modelo_cesta_alimento ON modelo_cesta_itens(alimento_id);

-- ── TABELA: cestas_formadas ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cestas_formadas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quantidade      INTEGER NOT NULL DEFAULT 1,
  observacao      TEXT DEFAULT '',
  itens_snapshot  JSONB DEFAULT '[]',
  total_kg        NUMERIC(10,2) DEFAULT 0,
  formado_por     TEXT DEFAULT 'admin',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cestas_formadas_created ON cestas_formadas(created_at DESC);

-- ── RLS: modelo_cesta_itens ───────────────────────────────────────────
ALTER TABLE public.modelo_cesta_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura_publica_modelo_cesta"    ON public.modelo_cesta_itens;
DROP POLICY IF EXISTS "escrita_publica_modelo_cesta"    ON public.modelo_cesta_itens;
DROP POLICY IF EXISTS "atualizacao_publica_modelo_cesta" ON public.modelo_cesta_itens;
DROP POLICY IF EXISTS "exclusao_publica_modelo_cesta"   ON public.modelo_cesta_itens;

CREATE POLICY "leitura_publica_modelo_cesta"     ON public.modelo_cesta_itens FOR SELECT USING (true);
CREATE POLICY "escrita_publica_modelo_cesta"     ON public.modelo_cesta_itens FOR INSERT WITH CHECK (true);
CREATE POLICY "atualizacao_publica_modelo_cesta" ON public.modelo_cesta_itens FOR UPDATE USING (true);
CREATE POLICY "exclusao_publica_modelo_cesta"    ON public.modelo_cesta_itens FOR DELETE USING (true);

-- ── RLS: cestas_formadas ──────────────────────────────────────────────
ALTER TABLE public.cestas_formadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura_publica_cestas_formadas"    ON public.cestas_formadas;
DROP POLICY IF EXISTS "escrita_publica_cestas_formadas"    ON public.cestas_formadas;
DROP POLICY IF EXISTS "atualizacao_publica_cestas_formadas" ON public.cestas_formadas;
DROP POLICY IF EXISTS "exclusao_publica_cestas_formadas"   ON public.cestas_formadas;

CREATE POLICY "leitura_publica_cestas_formadas"     ON public.cestas_formadas FOR SELECT USING (true);
CREATE POLICY "escrita_publica_cestas_formadas"     ON public.cestas_formadas FOR INSERT WITH CHECK (true);
CREATE POLICY "atualizacao_publica_cestas_formadas" ON public.cestas_formadas FOR UPDATE USING (true);
CREATE POLICY "exclusao_publica_cestas_formadas"    ON public.cestas_formadas FOR DELETE USING (true);
