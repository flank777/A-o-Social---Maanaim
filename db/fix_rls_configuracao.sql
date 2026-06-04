-- =============================================================
-- DoaVida — Correção de RLS da tabela `configuracao`
-- =============================================================
-- Causa raiz do bug de sincronização de imagens:
-- A policy de UPDATE original tinha apenas USING (true), sem WITH CHECK (true).
-- Como o Supabase `upsert` usa INSERT ... ON CONFLICT DO UPDATE,
-- quando a chave já existe, o UPDATE é bloqueado silenciosamente,
-- e as imagens nunca são persistidas no banco para chaves reincidentes.
--
-- Execute este script UMA ÚNICA VEZ no SQL Editor do Supabase.
-- =============================================================

-- Remove a policy antiga (incompleta)
DROP POLICY IF EXISTS "atualizacao_publica_configuracao" ON public.configuracao;

-- Recria a policy com USING + WITH CHECK (ambos necessários para UPSERT)
CREATE POLICY "atualizacao_publica_configuracao"
  ON public.configuracao
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Garante também policy de DELETE (não existia no arquivo original)
DROP POLICY IF EXISTS "exclusao_publica_configuracao" ON public.configuracao;
CREATE POLICY "exclusao_publica_configuracao"
  ON public.configuracao
  FOR DELETE
  USING (true);

-- Garante que as demais policies existem e estão corretas
DROP POLICY IF EXISTS "leitura_publica_configuracao" ON public.configuracao;
CREATE POLICY "leitura_publica_configuracao"
  ON public.configuracao
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "escrita_publica_configuracao" ON public.configuracao;
CREATE POLICY "escrita_publica_configuracao"
  ON public.configuracao
  FOR INSERT
  WITH CHECK (true);

-- Verificação: confirma que as 4 policies estão ativas
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'configuracao'
ORDER BY cmd;
