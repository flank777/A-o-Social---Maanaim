-- ══════════════════════════════════════════════════════════════════════
-- DoaVida — Políticas de segurança RLS (Row Level Security)
-- Execute no SQL Editor do Supabase: app.supabase.com → SQL Editor
--
-- ATENÇÃO: execute PRIMEIRO o bloco de limpeza (DROP) antes de rodar
-- este script para evitar conflito com policies antigas.
-- ══════════════════════════════════════════════════════════════════════

-- ── Função auxiliar: verifica se o usuário logado é super_admin ────────
-- Usada dentro das policies para autorizar escrita nas tabelas protegidas.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
  );
$$;


-- ══════════════════════════════════════════════════════════════════════
-- LIMPEZA — remove policies antigas (evita conflito no re-run)
-- ══════════════════════════════════════════════════════════════════════

DO $$
DECLARE t text;
DECLARE p text;
BEGIN
  FOR t, p IN
    SELECT table_name, policyname
    FROM information_schema.table_privileges tp
    JOIN pg_policies pp ON pp.tablename = tp.table_name
    WHERE pp.schemaname = 'public'
      AND tp.table_schema = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, t);
  END LOOP;
END $$;

-- Drop explícito de policies conhecidas (segurança redundante)
DROP POLICY IF EXISTS "public_all"                        ON public.alimentos;
DROP POLICY IF EXISTS "public_all"                        ON public.doacoes;
DROP POLICY IF EXISTS "public_all"                        ON public.familias;
DROP POLICY IF EXISTS "public_all"                        ON public.galeria;
DROP POLICY IF EXISTS "public_all"                        ON public.voluntarios;
DROP POLICY IF EXISTS "public_all"                        ON public.oracoes;
DROP POLICY IF EXISTS "public_all"                        ON public.tarefas;
DROP POLICY IF EXISTS "public_all"                        ON public.configuracao;
DROP POLICY IF EXISTS "public_all"                        ON public.cestas_formadas;
DROP POLICY IF EXISTS "public_all"                        ON public.modelo_cesta_itens;

DROP POLICY IF EXISTS "leitura_publica_alimentos"         ON public.alimentos;
DROP POLICY IF EXISTS "escrita_publica_alimentos"         ON public.alimentos;
DROP POLICY IF EXISTS "atualizacao_publica_alimentos"     ON public.alimentos;
DROP POLICY IF EXISTS "exclusao_publica_alimentos"        ON public.alimentos;

DROP POLICY IF EXISTS "leitura_publica_doacoes"           ON public.doacoes;
DROP POLICY IF EXISTS "escrita_publica_doacoes"           ON public.doacoes;
DROP POLICY IF EXISTS "atualizacao_publica_doacoes"       ON public.doacoes;
DROP POLICY IF EXISTS "exclusao_publica_doacoes"          ON public.doacoes;

DROP POLICY IF EXISTS "leitura_publica_familias"          ON public.familias;
DROP POLICY IF EXISTS "escrita_publica_familias"          ON public.familias;
DROP POLICY IF EXISTS "atualizacao_publica_familias"      ON public.familias;
DROP POLICY IF EXISTS "exclusao_publica_familias"         ON public.familias;

DROP POLICY IF EXISTS "leitura_publica_galeria"           ON public.galeria;
DROP POLICY IF EXISTS "escrita_publica_galeria"           ON public.galeria;
DROP POLICY IF EXISTS "atualizacao_publica_galeria"       ON public.galeria;
DROP POLICY IF EXISTS "exclusao_publica_galeria"          ON public.galeria;

DROP POLICY IF EXISTS "leitura_publica_voluntarios"       ON public.voluntarios;
DROP POLICY IF EXISTS "escrita_publica_voluntarios"       ON public.voluntarios;
DROP POLICY IF EXISTS "atualizacao_publica_voluntarios"   ON public.voluntarios;
DROP POLICY IF EXISTS "exclusao_publica_voluntarios"      ON public.voluntarios;

DROP POLICY IF EXISTS "leitura_publica_oracoes"           ON public.oracoes;
DROP POLICY IF EXISTS "escrita_publica_oracoes"           ON public.oracoes;
DROP POLICY IF EXISTS "atualizacao_publica_oracoes"       ON public.oracoes;
DROP POLICY IF EXISTS "exclusao_publica_oracoes"          ON public.oracoes;

DROP POLICY IF EXISTS "leitura_publica_tarefas"           ON public.tarefas;
DROP POLICY IF EXISTS "escrita_publica_tarefas"           ON public.tarefas;
DROP POLICY IF EXISTS "atualizacao_publica_tarefas"       ON public.tarefas;
DROP POLICY IF EXISTS "exclusao_publica_tarefas"          ON public.tarefas;

DROP POLICY IF EXISTS "leitura_publica_configuracao"      ON public.configuracao;
DROP POLICY IF EXISTS "escrita_publica_configuracao"      ON public.configuracao;
DROP POLICY IF EXISTS "atualizacao_publica_configuracao"  ON public.configuracao;
DROP POLICY IF EXISTS "exclusao_publica_configuracao"     ON public.configuracao;


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: alimentos
-- Lógica: qualquer visitante vê os alimentos (necessário para o formulário
-- de doação público). Apenas super_admin pode criar/alterar/excluir.
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.alimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alimentos_select_public"
  ON public.alimentos FOR SELECT
  USING (true);

CREATE POLICY "alimentos_insert_admin"
  ON public.alimentos FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "alimentos_update_admin"
  ON public.alimentos FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "alimentos_delete_admin"
  ON public.alimentos FOR DELETE
  USING (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: doacoes
-- Lógica: qualquer visitante pode INSERIR sua doação (formulário público).
-- Apenas super_admin pode ler, atualizar status e excluir registros.
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.doacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doacoes_insert_public"
  ON public.doacoes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "doacoes_select_admin"
  ON public.doacoes FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "doacoes_update_admin"
  ON public.doacoes FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "doacoes_delete_admin"
  ON public.doacoes FOR DELETE
  USING (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: familias
-- Lógica: dado sensível (endereços, telefones de famílias vulneráveis).
-- Nenhum acesso público — somente super_admin.
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.familias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "familias_all_admin"
  ON public.familias FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: galeria
-- Lógica: fotos públicas da organização — visitantes veem.
-- Apenas super_admin pode gerenciar o conteúdo.
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.galeria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "galeria_select_public"
  ON public.galeria FOR SELECT
  USING (ativo = true);

CREATE POLICY "galeria_insert_admin"
  ON public.galeria FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "galeria_update_admin"
  ON public.galeria FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "galeria_delete_admin"
  ON public.galeria FOR DELETE
  USING (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: voluntarios
-- Lógica: formulário público permite cadastro (INSERT).
-- Dados dos voluntários são visíveis/gerenciáveis só pelo super_admin.
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.voluntarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voluntarios_insert_public"
  ON public.voluntarios FOR INSERT
  WITH CHECK (true);

CREATE POLICY "voluntarios_select_admin"
  ON public.voluntarios FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "voluntarios_update_admin"
  ON public.voluntarios FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "voluntarios_delete_admin"
  ON public.voluntarios FOR DELETE
  USING (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: oracoes
-- Lógica: formulário público permite enviar pedido de oração (INSERT).
-- Conteúdo é íntimo — apenas super_admin pode ler e gerenciar.
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.oracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oracoes_insert_public"
  ON public.oracoes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "oracoes_select_admin"
  ON public.oracoes FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "oracoes_update_admin"
  ON public.oracoes FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "oracoes_delete_admin"
  ON public.oracoes FOR DELETE
  USING (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: tarefas
-- Lógica: dado interno da equipe — nenhum acesso público.
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tarefas_all_admin"
  ON public.tarefas FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: configuracao
-- Lógica: dados internos do sistema (senhas, chaves de API, WhatsApp).
-- Nenhum acesso público — somente super_admin.
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.configuracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "configuracao_all_admin"
  ON public.configuracao FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: cestas_formadas
-- Lógica: dado operacional interno — somente super_admin.
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.cestas_formadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cestas_formadas_all_admin"
  ON public.cestas_formadas FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- TABELA: modelo_cesta_itens
-- Lógica: modelo da cesta básica — leitura pública (usada no formulário),
-- alterações apenas pelo super_admin.
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.modelo_cesta_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modelo_cesta_select_public"
  ON public.modelo_cesta_itens FOR SELECT
  USING (true);

CREATE POLICY "modelo_cesta_insert_admin"
  ON public.modelo_cesta_itens FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "modelo_cesta_update_admin"
  ON public.modelo_cesta_itens FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "modelo_cesta_delete_admin"
  ON public.modelo_cesta_itens FOR DELETE
  USING (public.is_super_admin());
