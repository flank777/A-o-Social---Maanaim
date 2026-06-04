-- ══════════════════════════════════════════════════════════════════════
-- DoaVida — Super Admin · Fase 3
-- admin_widgets: KPIs, gráficos, listas e tabelas configuráveis
-- ══════════════════════════════════════════════════════════════════════
-- Idempotente. Pré-requisitos: 001 .. 004.
-- ══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════════════════════
-- 1. admin_widgets — widgets de uma "dashboard" (= site_pages com area_type='admin')
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_widgets (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id            UUID NOT NULL REFERENCES site_pages(id) ON DELETE CASCADE,
  type               TEXT NOT NULL DEFAULT 'kpi'
                     CHECK (type IN ('kpi','list','table','chart_bar','chart_line','chart_area','chart_pie','chart_doughnut','chart_radar','progress','custom')),
  title              TEXT DEFAULT '',
  subtitle           TEXT DEFAULT '',
  -- config JSONB descreve a fonte de dados e parâmetros visuais.
  -- Exemplo: { "source":"doacoes", "agg":"count", "where":{"status":"pendente"},
  --            "groupBy":"food", "orderBy":"-count", "limit":5,
  --            "colors":["#4a8a39","#e0a526"], "icon":"fa-hand-holding-heart" }
  config             JSONB NOT NULL DEFAULT '{}'::jsonb,
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','published','archived')),
  draft_payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_payload  JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Tamanho na grade (Bento). Lados de 1..4.
  span_w             SMALLINT NOT NULL DEFAULT 1 CHECK (span_w BETWEEN 1 AND 4),
  span_h             SMALLINT NOT NULL DEFAULT 1 CHECK (span_h BETWEEN 1 AND 4),
  height_desktop     INTEGER,
  height_tablet      INTEGER,
  height_mobile      INTEGER,
  visible            BOOLEAN NOT NULL DEFAULT TRUE,
  order_index        NUMERIC NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_widgets_page_order ON admin_widgets(page_id, order_index) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_widgets_status     ON admin_widgets(status)              WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_admin_widgets_updated_at ON admin_widgets;
CREATE TRIGGER trg_admin_widgets_updated_at
  BEFORE UPDATE ON admin_widgets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE admin_widgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "widgets_admin_read"      ON admin_widgets;
DROP POLICY IF EXISTS "widgets_super_admin_all" ON admin_widgets;

-- Apenas usuários autenticados (admin/super_admin) leem widgets publicados.
CREATE POLICY "widgets_admin_read"
  ON admin_widgets FOR SELECT
  USING (auth.role() = 'authenticated' AND deleted_at IS NULL AND status = 'published');

CREATE POLICY "widgets_super_admin_all"
  ON admin_widgets FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- 2. RPCs específicas
-- ══════════════════════════════════════════════════════════════════════

-- Reordenação em lote de widgets de uma dashboard
CREATE OR REPLACE FUNCTION public.super_admin_widget_reorder(
  p_page_id UUID,
  p_orders  JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Apenas super_admin' USING ERRCODE = '42501';
  END IF;
  FOR rec IN SELECT * FROM jsonb_to_recordset(p_orders) AS x(id UUID, order_index NUMERIC) LOOP
    UPDATE admin_widgets SET order_index = rec.order_index
     WHERE id = rec.id AND page_id = p_page_id;
  END LOOP;
  INSERT INTO system_change_logs (entity_type, entity_id, action, description, user_id)
  VALUES ('admin_widgets', p_page_id, 'reorder',
          'Reordenação de widgets (' || jsonb_array_length(p_orders) || ')', auth.uid());
  RETURN TRUE;
END;
$$;

-- Soft delete específico
CREATE OR REPLACE FUNCTION public.super_admin_widget_soft_delete(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Apenas super_admin' USING ERRCODE = '42501';
  END IF;
  UPDATE admin_widgets SET deleted_at = NOW() WHERE id = p_id;
  INSERT INTO system_change_logs (entity_type, entity_id, action, description, user_id)
  VALUES ('admin_widgets', p_id, 'delete', 'Widget removido', auth.uid());
  RETURN TRUE;
END;
$$;


-- Estende super_admin_publish e super_admin_restore_version para incluir admin_widgets.
-- (As funções da Fase 0 só conheciam site_pages/site_sections/site_cards.)
CREATE OR REPLACE FUNCTION public.super_admin_publish(
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_notes       TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload   JSONB;
  v_version   INT;
  v_user_email TEXT;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Apenas super_admin pode publicar' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  IF p_entity_type = 'site_pages' THEN
    UPDATE site_pages    SET published_payload = draft_payload, status = 'published' WHERE id = p_entity_id RETURNING draft_payload INTO v_payload;
  ELSIF p_entity_type = 'site_sections' THEN
    UPDATE site_sections SET published_payload = draft_payload, status = 'published' WHERE id = p_entity_id RETURNING draft_payload INTO v_payload;
  ELSIF p_entity_type = 'site_cards' THEN
    UPDATE site_cards    SET published_payload = draft_payload, status = 'published' WHERE id = p_entity_id RETURNING draft_payload INTO v_payload;
  ELSIF p_entity_type = 'admin_widgets' THEN
    UPDATE admin_widgets SET published_payload = draft_payload, status = 'published' WHERE id = p_entity_id RETURNING draft_payload INTO v_payload;
  ELSIF p_entity_type = 'site_forms' THEN
    UPDATE site_forms    SET published_payload = draft_payload, status = 'published' WHERE id = p_entity_id RETURNING draft_payload INTO v_payload;
  ELSE
    RAISE EXCEPTION 'entity_type inválido: %', p_entity_type;
  END IF;

  IF v_payload IS NULL THEN
    RAISE EXCEPTION 'Registro % não encontrado', p_entity_id;
  END IF;

  SELECT COALESCE(MAX(version_no), 0) + 1 INTO v_version
    FROM system_versions
   WHERE entity_type = p_entity_type AND entity_id = p_entity_id;

  INSERT INTO system_versions (entity_type, entity_id, version_no, payload, notes, created_by)
  VALUES (p_entity_type, p_entity_id, v_version, v_payload, p_notes, auth.uid());

  INSERT INTO system_change_logs (entity_type, entity_id, action, description, user_id, user_email)
  VALUES (p_entity_type, p_entity_id, 'publish', 'Versão ' || v_version || ' publicada', auth.uid(), v_user_email);

  RETURN jsonb_build_object('version', v_version, 'payload', v_payload);
END;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- 3. CHECAGEM
-- ══════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  RAISE NOTICE '[Super Admin · Fase 3] admin_widgets pronto · super_admin_publish estendido para forms+widgets.';
END $$;
