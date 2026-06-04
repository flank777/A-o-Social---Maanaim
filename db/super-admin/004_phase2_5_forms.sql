-- ══════════════════════════════════════════════════════════════════════
-- DoaVida — Super Admin · Fase 2.5
-- Form Builder: site_forms + site_form_fields + site_form_submissions
-- ══════════════════════════════════════════════════════════════════════
-- Idempotente. Pré-requisitos: 001, 002, 003.
-- ══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════════════════════
-- 1. site_forms — formulários reutilizáveis
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_forms (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  internal_key       TEXT NOT NULL UNIQUE,            -- ex.: 'contato', 'oracao', 'voluntariado-2026'
  title              TEXT NOT NULL,
  description        TEXT DEFAULT '',
  submit_label       TEXT DEFAULT 'Enviar',
  success_message    TEXT DEFAULT 'Recebido! Em breve entraremos em contato.',
  notify_emails      TEXT DEFAULT '',                 -- separadas por vírgula (referência futura)
  whatsapp_template  TEXT DEFAULT '',                 -- p/ envio futuro de notificação
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','published','archived')),
  draft_payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_payload  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_forms_status ON site_forms(status) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_forms_updated_at ON site_forms;
CREATE TRIGGER trg_forms_updated_at
  BEFORE UPDATE ON site_forms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE site_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forms_public_read"        ON site_forms;
DROP POLICY IF EXISTS "forms_super_admin_all"    ON site_forms;

CREATE POLICY "forms_public_read"
  ON site_forms FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "forms_super_admin_all"
  ON site_forms FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- 2. site_form_fields — campos de cada formulário
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_form_fields (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id       UUID NOT NULL REFERENCES site_forms(id) ON DELETE CASCADE,
  field_key     TEXT NOT NULL,                                -- chave única dentro do form (ex.: 'nome', 'telefone')
  field_type    TEXT NOT NULL DEFAULT 'text'
                CHECK (field_type IN ('text','textarea','email','phone','number','date','select','radio','checkbox','file','consent')),
  label         TEXT NOT NULL,
  placeholder   TEXT DEFAULT '',
  help_text     TEXT DEFAULT '',
  required      BOOLEAN NOT NULL DEFAULT FALSE,
  options       JSONB NOT NULL DEFAULT '[]'::jsonb,           -- p/ select/radio/checkbox: [{value, label}]
  validation    JSONB NOT NULL DEFAULT '{}'::jsonb,           -- {min, max, pattern, accept}
  order_index   NUMERIC NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  UNIQUE (form_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_fields_form_order ON site_form_fields(form_id, order_index) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_fields_updated_at ON site_form_fields;
CREATE TRIGGER trg_fields_updated_at
  BEFORE UPDATE ON site_form_fields
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE site_form_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fields_public_read"     ON site_form_fields;
DROP POLICY IF EXISTS "fields_super_admin_all" ON site_form_fields;

-- Públicos podem ler campos de formulários publicados (necessário para renderizar)
CREATE POLICY "fields_public_read"
  ON site_form_fields FOR SELECT
  USING (deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM site_forms f
    WHERE f.id = site_form_fields.form_id
      AND f.status = 'published' AND f.deleted_at IS NULL
  ));

CREATE POLICY "fields_super_admin_all"
  ON site_form_fields FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- 3. site_form_submissions — respostas recebidas
--    Aceita inserção pública (formulário no site sem login).
--    Apenas super_admin lê.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_form_submissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id       UUID REFERENCES site_forms(id) ON DELETE SET NULL,
  form_key      TEXT NOT NULL,                                -- snapshot do internal_key
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,           -- { campo_key: valor, ... }
  meta          JSONB NOT NULL DEFAULT '{}'::jsonb,           -- ua, referrer, locale (sem IP por padrão)
  status        TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new','read','answered','archived','spam')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at       TIMESTAMPTZ,
  answered_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subs_form_status ON site_form_submissions(form_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subs_created_at  ON site_form_submissions(created_at DESC);

ALTER TABLE site_form_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subs_public_insert"    ON site_form_submissions;
DROP POLICY IF EXISTS "subs_super_admin_all"  ON site_form_submissions;

-- Público anônimo pode INSERIR (formulário no site)
CREATE POLICY "subs_public_insert"
  ON site_form_submissions FOR INSERT
  WITH CHECK (true);

-- Apenas super_admin lê/edita/exclui
CREATE POLICY "subs_super_admin_all"
  ON site_form_submissions FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "subs_super_admin_update" ON site_form_submissions;
CREATE POLICY "subs_super_admin_update"
  ON site_form_submissions FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- 4. RPCs auxiliares
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.super_admin_form_field_reorder(
  p_form_id UUID,
  p_orders  JSONB   -- [{id: uuid, order_index: number}]
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
    UPDATE site_form_fields SET order_index = rec.order_index
     WHERE id = rec.id AND form_id = p_form_id;
  END LOOP;
  INSERT INTO system_change_logs (entity_type, entity_id, action, description, user_id)
  VALUES ('site_form_fields', p_form_id, 'reorder',
          'Reordenação de campos (' || jsonb_array_length(p_orders) || ')',
          auth.uid());
  RETURN TRUE;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- 5. CHECAGEM
-- ══════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  RAISE NOTICE '[Super Admin · Fase 2.5] site_forms + site_form_fields + site_form_submissions prontos.';
END $$;
