-- ══════════════════════════════════════════════════════════════════════
-- DoaVida — Super Admin · Fase 2
-- Biblioteca de mídia centralizada (site_media) + bucket Storage
-- ══════════════════════════════════════════════════════════════════════
-- Idempotente. Pré-requisitos: 001 e 002.
-- ══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════════════════════
-- 1. site_media — catálogo de mídias (foto, vídeo, ícone, fundo, etc.)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_media (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url           TEXT NOT NULL,
  storage_path  TEXT DEFAULT '',
  kind          TEXT NOT NULL DEFAULT 'image'
                CHECK (kind IN ('image','video','icon','background','document','other')),
  category      TEXT NOT NULL DEFAULT 'geral',
  alt           TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  width         INTEGER,
  height        INTEGER,
  size_bytes    BIGINT,
  mime          TEXT DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','archived')),
  order_index   NUMERIC NOT NULL DEFAULT 0,
  uploaded_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_media_kind_status ON site_media(kind, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_category    ON site_media(category)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_created_at  ON site_media(created_at DESC) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_media_updated_at ON site_media;
CREATE TRIGGER trg_media_updated_at
  BEFORE UPDATE ON site_media
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE site_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_public_read"     ON site_media;
DROP POLICY IF EXISTS "media_super_admin_all" ON site_media;

-- Mídias ativas são lidas publicamente (o site público as referencia)
CREATE POLICY "media_public_read"
  ON site_media FOR SELECT
  USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "media_super_admin_all"
  ON site_media FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ══════════════════════════════════════════════════════════════════════
-- 2. STORAGE — bucket "super-admin"
-- Cria o bucket se não existir. As policies abaixo permitem leitura
-- pública e escrita autenticada (RLS no banco já filtra quem é super_admin).
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('super-admin', 'super-admin', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "sa_storage_read"   ON storage.objects;
DROP POLICY IF EXISTS "sa_storage_upload" ON storage.objects;
DROP POLICY IF EXISTS "sa_storage_delete" ON storage.objects;

CREATE POLICY "sa_storage_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'super-admin');

-- Apenas usuários autenticados podem fazer upload neste bucket.
-- (A camada client-side só envia se for super_admin; a checagem dura
-- está no `site_media` via RLS — sem registro em site_media o upload é órfão.)
CREATE POLICY "sa_storage_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'super-admin' AND auth.role() = 'authenticated');

CREATE POLICY "sa_storage_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'super-admin' AND auth.role() = 'authenticated');


-- ══════════════════════════════════════════════════════════════════════
-- 3. RPC — soft delete de mídia + helper de "onde está sendo usada"
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.super_admin_media_soft_delete(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Apenas super_admin' USING ERRCODE = '42501';
  END IF;
  UPDATE site_media SET deleted_at = NOW() WHERE id = p_id;

  INSERT INTO system_change_logs (entity_type, entity_id, action, description, user_id, user_email)
  SELECT 'site_media', p_id, 'delete', 'Mídia removida (soft delete)', auth.uid(), email
    FROM auth.users WHERE id = auth.uid();
  RETURN TRUE;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- 4. CHECAGEM
-- ══════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  RAISE NOTICE '[Super Admin · Fase 2] site_media + bucket "super-admin" prontos.';
END $$;
