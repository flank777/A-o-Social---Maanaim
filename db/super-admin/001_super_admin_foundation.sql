-- ══════════════════════════════════════════════════════════════════════
-- DoaVida — Super Admin · Fase 0 · Fundação
-- ══════════════════════════════════════════════════════════════════════
--
-- COMO USAR:
--   1. Execute db/schema.sql (se ainda não executou)
--   2. Cole este arquivo no SQL Editor do Supabase e clique em Run
--   3. No painel Authentication → Users, crie o usuário do dono do sistema
--      (e-mail + senha). O primeiro usuário criado vira super_admin
--      automaticamente.
--   4. Acesse /super-admin.html e faça login com esse e-mail/senha.
--
-- PRINCÍPIOS:
--   • Idempotente — pode rodar quantas vezes precisar sem efeito colateral.
--   • Não toca nas tabelas existentes; apenas ADICIONA.
--   • RLS em tudo. Apenas super_admin escreve; site público lê o que está
--     publicado.
--   • Soft delete em tudo (deleted_at). Restauração de versões via
--     system_versions + system_change_logs.
--   • Separação rascunho × publicado: cada conteúdo tem `status` e
--     `published_payload` (JSONB). Site público consome o payload publicado.
-- ══════════════════════════════════════════════════════════════════════

-- ── Extensões necessárias ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ══════════════════════════════════════════════════════════════════════
-- 1. PROFILES — espelho de auth.users com papel (role)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  nome        TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'admin'
              CHECK (role IN ('super_admin','admin','user')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role  ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

COMMENT ON TABLE  profiles IS 'Perfil de usuário ligado a auth.users — guarda role';
COMMENT ON COLUMN profiles.role IS 'super_admin = dono | admin = gestor | user = comum';


-- Trigger: ao criar um auth.users, cria o profile correspondente.
-- O PRIMEIRO usuário do sistema é promovido automaticamente a super_admin.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_existentes INT;
  papel_inicial    TEXT;
BEGIN
  SELECT COUNT(*) INTO total_existentes FROM public.profiles;
  papel_inicial := CASE WHEN total_existentes = 0 THEN 'super_admin' ELSE 'admin' END;

  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    papel_inicial
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- Função utilitária: o usuário atual é super_admin?
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
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

-- Função utilitária: o usuário atual é admin OU super_admin?
CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin','super_admin')
  );
$$;


-- ══════════════════════════════════════════════════════════════════════
-- 2. UPDATED_AT — função única reaproveitada por gatilhos
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- 3. TABELAS DE CONTEÚDO — base para todo o painel
--    Cada uma carrega:
--      • status            (draft | published | archived)
--      • draft_payload     (JSONB com a versão em edição)
--      • published_payload (JSONB com o que está no ar)
--      • deleted_at        (soft delete)
--      • order_index       (ordem dentro do pai)
-- ══════════════════════════════════════════════════════════════════════

-- ── 3.1 site_pages ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_pages (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_type          TEXT NOT NULL CHECK (area_type IN ('site_publico','admin')),
  slug               TEXT NOT NULL,
  title              TEXT NOT NULL,
  seo_title          TEXT DEFAULT '',
  seo_description    TEXT DEFAULT '',
  show_in_menu       BOOLEAN NOT NULL DEFAULT TRUE,
  order_index        NUMERIC NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','published','archived')),
  draft_payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_payload  JSONB NOT NULL DEFAULT '{}'::jsonb,
  cover_url          TEXT DEFAULT '',
  desktop_settings   JSONB NOT NULL DEFAULT '{}'::jsonb,
  tablet_settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  mobile_settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  UNIQUE (area_type, slug)
);

CREATE INDEX IF NOT EXISTS idx_pages_area_status   ON site_pages(area_type, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pages_order         ON site_pages(area_type, order_index) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_site_pages_updated_at ON site_pages;
CREATE TRIGGER trg_site_pages_updated_at
  BEFORE UPDATE ON site_pages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE site_pages IS 'Páginas editáveis (públicas e admin) — Super Admin';


-- ── 3.2 site_sections ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_sections (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id            UUID NOT NULL REFERENCES site_pages(id) ON DELETE CASCADE,
  internal_name      TEXT NOT NULL,
  type               TEXT NOT NULL DEFAULT 'custom',
  title              TEXT DEFAULT '',
  subtitle           TEXT DEFAULT '',
  description        TEXT DEFAULT '',
  layout             TEXT DEFAULT 'default',
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','published','archived')),
  draft_payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_payload  JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_index        NUMERIC NOT NULL DEFAULT 0,
  visible            BOOLEAN NOT NULL DEFAULT TRUE,
  desktop_settings   JSONB NOT NULL DEFAULT '{}'::jsonb,
  tablet_settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  mobile_settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sections_page_order ON site_sections(page_id, order_index) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sections_status     ON site_sections(status) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_site_sections_updated_at ON site_sections;
CREATE TRIGGER trg_site_sections_updated_at
  BEFORE UPDATE ON site_sections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ── 3.3 site_cards ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_cards (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id         UUID NOT NULL REFERENCES site_sections(id) ON DELETE CASCADE,
  title              TEXT DEFAULT '',
  subtitle           TEXT DEFAULT '',
  description        TEXT DEFAULT '',
  image_url          TEXT DEFAULT '',
  video_url          TEXT DEFAULT '',
  icon               TEXT DEFAULT '',
  button_text        TEXT DEFAULT '',
  button_link        TEXT DEFAULT '',
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','published','archived')),
  draft_payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_payload  JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_index        NUMERIC NOT NULL DEFAULT 0,
  visible            BOOLEAN NOT NULL DEFAULT TRUE,
  desktop_settings   JSONB NOT NULL DEFAULT '{}'::jsonb,
  tablet_settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  mobile_settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cards_section_order ON site_cards(section_id, order_index) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_site_cards_updated_at ON site_cards;
CREATE TRIGGER trg_site_cards_updated_at
  BEFORE UPDATE ON site_cards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ══════════════════════════════════════════════════════════════════════
-- 4. VERSIONAMENTO — snapshots e logs de alteração
-- ══════════════════════════════════════════════════════════════════════

-- ── 4.1 system_versions ──────────────────────────────────────────────
-- Snapshot completo de uma entidade num momento.
CREATE TABLE IF NOT EXISTS system_versions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type  TEXT NOT NULL,
  entity_id    UUID NOT NULL,
  version_no   INT  NOT NULL,
  payload      JSONB NOT NULL,
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (entity_type, entity_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_versions_entity
  ON system_versions(entity_type, entity_id, version_no DESC);


-- ── 4.2 system_change_logs ───────────────────────────────────────────
-- Delta do que foi alterado, para auditoria fina.
CREATE TABLE IF NOT EXISTS system_change_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  action        TEXT NOT NULL CHECK (action IN ('create','update','delete','restore','publish','reorder')),
  field_name    TEXT,
  old_value     JSONB,
  new_value     JSONB,
  description   TEXT DEFAULT '',
  area_type     TEXT,
  device        TEXT,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_created_at ON system_change_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_entity     ON system_change_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_user       ON system_change_logs(user_id, created_at DESC);


-- ══════════════════════════════════════════════════════════════════════
-- 5. RPC — operações controladas que rodam server-side com autoria
-- ══════════════════════════════════════════════════════════════════════

-- 5.1 Publicar um rascunho (draft_payload → published_payload)
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
    UPDATE site_pages
       SET published_payload = draft_payload,
           status            = 'published'
     WHERE id = p_entity_id
     RETURNING draft_payload INTO v_payload;
  ELSIF p_entity_type = 'site_sections' THEN
    UPDATE site_sections
       SET published_payload = draft_payload,
           status            = 'published'
     WHERE id = p_entity_id
     RETURNING draft_payload INTO v_payload;
  ELSIF p_entity_type = 'site_cards' THEN
    UPDATE site_cards
       SET published_payload = draft_payload,
           status            = 'published'
     WHERE id = p_entity_id
     RETURNING draft_payload INTO v_payload;
  ELSE
    RAISE EXCEPTION 'entity_type inválido: %', p_entity_type;
  END IF;

  IF v_payload IS NULL THEN
    RAISE EXCEPTION 'Registro % não encontrado', p_entity_id;
  END IF;

  -- Próximo número de versão
  SELECT COALESCE(MAX(version_no), 0) + 1
    INTO v_version
    FROM system_versions
   WHERE entity_type = p_entity_type AND entity_id = p_entity_id;

  INSERT INTO system_versions (entity_type, entity_id, version_no, payload, notes, created_by)
  VALUES (p_entity_type, p_entity_id, v_version, v_payload, p_notes, auth.uid());

  INSERT INTO system_change_logs (entity_type, entity_id, action, description, user_id, user_email)
  VALUES (p_entity_type, p_entity_id, 'publish',
          'Versão ' || v_version || ' publicada',
          auth.uid(), v_user_email);

  RETURN jsonb_build_object('version', v_version, 'payload', v_payload);
END;
$$;


-- 5.2 Restaurar uma versão antiga (volta como rascunho — não publica direto)
CREATE OR REPLACE FUNCTION public.super_admin_restore_version(
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_version_no  INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload    JSONB;
  v_user_email TEXT;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Apenas super_admin pode restaurar versões' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  SELECT payload INTO v_payload
    FROM system_versions
   WHERE entity_type = p_entity_type
     AND entity_id   = p_entity_id
     AND version_no  = p_version_no;

  IF v_payload IS NULL THEN
    RAISE EXCEPTION 'Versão % não encontrada para %/%', p_version_no, p_entity_type, p_entity_id;
  END IF;

  IF p_entity_type = 'site_pages' THEN
    UPDATE site_pages    SET draft_payload = v_payload, status = 'draft' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'site_sections' THEN
    UPDATE site_sections SET draft_payload = v_payload, status = 'draft' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'site_cards' THEN
    UPDATE site_cards    SET draft_payload = v_payload, status = 'draft' WHERE id = p_entity_id;
  ELSE
    RAISE EXCEPTION 'entity_type inválido: %', p_entity_type;
  END IF;

  INSERT INTO system_change_logs (entity_type, entity_id, action, description, user_id, user_email)
  VALUES (p_entity_type, p_entity_id, 'restore',
          'Versão ' || p_version_no || ' restaurada como rascunho',
          auth.uid(), v_user_email);

  RETURN jsonb_build_object('restored_version', p_version_no, 'payload', v_payload);
END;
$$;


-- 5.3 Reordenar entidades em lote (drag-and-drop)
CREATE OR REPLACE FUNCTION public.super_admin_reorder(
  p_entity_type TEXT,
  p_orders      JSONB   -- [{id: uuid, order_index: number}, ...]
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
    RAISE EXCEPTION 'Apenas super_admin pode reordenar' USING ERRCODE = '42501';
  END IF;

  FOR rec IN SELECT * FROM jsonb_to_recordset(p_orders) AS x(id UUID, order_index NUMERIC) LOOP
    IF p_entity_type = 'site_pages' THEN
      UPDATE site_pages    SET order_index = rec.order_index WHERE id = rec.id;
    ELSIF p_entity_type = 'site_sections' THEN
      UPDATE site_sections SET order_index = rec.order_index WHERE id = rec.id;
    ELSIF p_entity_type = 'site_cards' THEN
      UPDATE site_cards    SET order_index = rec.order_index WHERE id = rec.id;
    END IF;
  END LOOP;

  INSERT INTO system_change_logs (entity_type, action, description, user_id)
  VALUES (p_entity_type, 'reorder', 'Reordenação em lote (' || jsonb_array_length(p_orders) || ' itens)', auth.uid());

  RETURN TRUE;
END;
$$;


-- 5.4 Soft delete
CREATE OR REPLACE FUNCTION public.super_admin_soft_delete(
  p_entity_type TEXT,
  p_entity_id   UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Apenas super_admin pode excluir' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  IF p_entity_type = 'site_pages' THEN
    UPDATE site_pages    SET deleted_at = NOW() WHERE id = p_entity_id;
  ELSIF p_entity_type = 'site_sections' THEN
    UPDATE site_sections SET deleted_at = NOW() WHERE id = p_entity_id;
  ELSIF p_entity_type = 'site_cards' THEN
    UPDATE site_cards    SET deleted_at = NOW() WHERE id = p_entity_id;
  ELSE
    RAISE EXCEPTION 'entity_type inválido: %', p_entity_type;
  END IF;

  INSERT INTO system_change_logs (entity_type, entity_id, action, description, user_id, user_email)
  VALUES (p_entity_type, p_entity_id, 'delete', 'Soft delete', auth.uid(), v_user_email);

  RETURN TRUE;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- 6. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_pages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_sections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_cards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_versions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_change_logs  ENABLE ROW LEVEL SECURITY;

-- Policies (idempotentes via DROP+CREATE)
DROP POLICY IF EXISTS "profiles_self_select"        ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select"       ON profiles;
DROP POLICY IF EXISTS "profiles_super_admin_update" ON profiles;

CREATE POLICY "profiles_self_select"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_admin_select"
  ON profiles FOR SELECT
  USING (public.is_admin_or_above());

CREATE POLICY "profiles_super_admin_update"
  ON profiles FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- site_pages: público lê o que está publicado; super_admin tudo
DROP POLICY IF EXISTS "pages_public_read"       ON site_pages;
DROP POLICY IF EXISTS "pages_super_admin_all"   ON site_pages;

CREATE POLICY "pages_public_read"
  ON site_pages FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "pages_super_admin_all"
  ON site_pages FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- site_sections
DROP POLICY IF EXISTS "sections_public_read"     ON site_sections;
DROP POLICY IF EXISTS "sections_super_admin_all" ON site_sections;

CREATE POLICY "sections_public_read"
  ON site_sections FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "sections_super_admin_all"
  ON site_sections FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- site_cards
DROP POLICY IF EXISTS "cards_public_read"        ON site_cards;
DROP POLICY IF EXISTS "cards_super_admin_all"    ON site_cards;

CREATE POLICY "cards_public_read"
  ON site_cards FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "cards_super_admin_all"
  ON site_cards FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- system_versions: só super_admin lê e escreve
DROP POLICY IF EXISTS "versions_super_admin" ON system_versions;
CREATE POLICY "versions_super_admin"
  ON system_versions FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- system_change_logs: super_admin lê tudo; insert via RPC (SECURITY DEFINER)
DROP POLICY IF EXISTS "logs_super_admin_select" ON system_change_logs;
CREATE POLICY "logs_super_admin_select"
  ON system_change_logs FOR SELECT
  USING (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- 7. SEED — páginas iniciais espelhando o site atual
--    Inseridas como 'published' para o site público funcionar de cara.
--    O dono pode editar e publicar novas versões pelo painel.
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO site_pages (area_type, slug, title, seo_title, seo_description, order_index, status, draft_payload, published_payload)
VALUES
  ('site_publico', 'index',       'Página Inicial',   'DoaVida — Ação Social Semear',          'Plataforma de doações de alimentos da Ação Social Semear em Belém, PA', 10, 'published', '{}', '{}'),
  ('site_publico', 'form',        'Doar Alimentos',   'Doar — DoaVida',                        'Faça sua doação de alimentos em três passos rápidos', 20, 'published', '{}', '{}'),
  ('site_publico', 'voluntario',  'Seja Voluntário',  'Voluntariado — DoaVida',                'Cadastre-se como voluntário e ajude a transformar vidas', 30, 'published', '{}', '{}'),
  ('site_publico', 'gallery',     'Galeria',          'Galeria — DoaVida',                     'Fotos das ações sociais da nossa comunidade', 40, 'published', '{}', '{}'),
  ('admin',        'dashboard',   'Dashboard',        'Dashboard — DoaVida Admin',             'Visão geral da plataforma', 10, 'published', '{}', '{}'),
  ('admin',        'admin',       'Painel',           'Painel Admin — DoaVida',                'Gestão de doações, voluntários e famílias', 20, 'published', '{}', '{}')
ON CONFLICT (area_type, slug) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════
-- 8. CHECAGEM FINAL
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM site_pages;
  RAISE NOTICE '[Super Admin] Fundação aplicada. Páginas seed: %', cnt;
  RAISE NOTICE '[Super Admin] Próximo passo: criar usuário em Authentication → Users';
  RAISE NOTICE '[Super Admin] O primeiro usuário criado será promovido automaticamente a super_admin.';
END $$;
