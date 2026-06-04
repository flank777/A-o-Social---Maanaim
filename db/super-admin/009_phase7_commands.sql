-- ══════════════════════════════════════════════════════════════════════
-- DoaVida — Super Admin · Fase 7 (final)
-- Comandos seguros + log de execução
-- ══════════════════════════════════════════════════════════════════════
-- Idempotente. Pré-requisitos: 001..008.
-- ══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════════════════════
-- 1. system_commands — comandos pré-aprovados configuráveis
-- ══════════════════════════════════════════════════════════════════════
-- O `action_type` é uma WHITELIST. O cliente nunca executa código livre:
-- ele só dispara um `command_id`; o runtime mapeia o `action_type` para
-- uma função pré-aprovada, com permissão verificada e log gerado.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS system_commands (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  command_key     TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  action_type     TEXT NOT NULL CHECK (action_type IN (
                    'link_internal','link_external','whatsapp_open','phone_call','email_compose',
                    'modal_open','download_file','toast_show','clipboard_copy',
                    'page_publish','section_publish','widget_publish','form_publish',
                    'record_update_status','record_soft_delete',
                    'export_report'
                  )),
  -- Parâmetros do comando (URL, mensagem, table+id, status novo, etc.)
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  trigger_type    TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual','on_click','on_submit','on_status_change','on_publish','on_proof_received','scheduled')),
  conditions      JSONB NOT NULL DEFAULT '{}'::jsonb,
  success_message TEXT DEFAULT 'Comando executado com sucesso',
  error_message   TEXT DEFAULT 'Falha ao executar o comando',
  required_role   TEXT NOT NULL DEFAULT 'super_admin' CHECK (required_role IN ('super_admin','admin','user')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','draft')),
  built_in        BOOLEAN NOT NULL DEFAULT FALSE,
  order_index     NUMERIC NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_commands_status_action ON system_commands(status, action_type);
CREATE INDEX IF NOT EXISTS idx_commands_trigger       ON system_commands(trigger_type);
DROP TRIGGER IF EXISTS trg_commands_updated_at ON system_commands;
CREATE TRIGGER trg_commands_updated_at BEFORE UPDATE ON system_commands FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE system_commands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cmd_super"  ON system_commands;
DROP POLICY IF EXISTS "cmd_auth_r" ON system_commands;
CREATE POLICY "cmd_super"  ON system_commands FOR ALL    USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "cmd_auth_r" ON system_commands FOR SELECT USING (auth.role() = 'authenticated' AND status = 'active');


-- ══════════════════════════════════════════════════════════════════════
-- 2. system_command_logs — log de execução
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS system_command_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  command_id   UUID REFERENCES system_commands(id) ON DELETE SET NULL,
  command_key  TEXT NOT NULL,
  action_type  TEXT NOT NULL,
  result       TEXT NOT NULL CHECK (result IN ('ok','error','denied')),
  message      TEXT DEFAULT '',
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cmd_logs_created ON system_command_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cmd_logs_command ON system_command_logs(command_key, created_at DESC);
ALTER TABLE system_command_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cmd_logs_super_r" ON system_command_logs;
DROP POLICY IF EXISTS "cmd_logs_auth_w"  ON system_command_logs;
CREATE POLICY "cmd_logs_super_r" ON system_command_logs FOR SELECT USING (public.is_super_admin());
-- Inserção via RPC SECURITY DEFINER (abaixo). Não permitimos INSERT direto.
CREATE POLICY "cmd_logs_auth_w" ON system_command_logs FOR INSERT WITH CHECK (false);


-- ══════════════════════════════════════════════════════════════════════
-- 3. RPC log_command_execution
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.log_command_execution(
  p_command_id  UUID,
  p_command_key TEXT,
  p_action_type TEXT,
  p_result      TEXT,
  p_message     TEXT,
  p_payload     JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_email TEXT;
BEGIN
  -- Apenas autenticados podem logar
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sem permissão para registrar execução' USING ERRCODE = '42501';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO system_command_logs (command_id, command_key, action_type, result, message, payload, user_id, user_email)
  VALUES (p_command_id, p_command_key, p_action_type, p_result, COALESCE(p_message,''), COALESCE(p_payload,'{}'::jsonb), auth.uid(), v_email)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- 4. SEED — 14 comandos pré-aprovados (built-in)
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO system_commands (command_key, name, description, action_type, payload, trigger_type, success_message, required_role, built_in, order_index) VALUES
  ('open.whatsapp.donor',      'Abrir WhatsApp do doador',
   'Abre WhatsApp Web/App com o número do doador e mensagem padrão.',
   'whatsapp_open',  '{"number_field":"phone","template":"Olá {nome}! Confirmamos sua doação. Obrigado!"}'::jsonb,
   'manual', 'WhatsApp aberto', 'admin', TRUE, 10),

  ('open.whatsapp.org',        'Abrir WhatsApp da organização',
   'Abre WhatsApp Web no número configurado.',
   'whatsapp_open',  '{"number_config_key":"whatsapp_numero","template":"Olá! Sou da Ação Social Semear."}'::jsonb,
   'manual', 'WhatsApp aberto', 'admin', TRUE, 20),

  ('call.donor',               'Ligar para doador',
   'Abre o discador com o telefone do doador.',
   'phone_call', '{"number_field":"phone"}'::jsonb,
   'manual', 'Discador aberto', 'admin', TRUE, 30),

  ('email.donor',              'E-mail para doador',
   'Abre o cliente de e-mail.',
   'email_compose', '{"email_field":"email","subject":"Sua doação na Ação Social Semear","body":"Olá!"}'::jsonb,
   'manual', 'E-mail aberto', 'admin', TRUE, 40),

  ('redirect.dashboard',       'Ir para Dashboard',
   'Redireciona para o painel admin.',
   'link_internal', '{"path":"admin.html"}'::jsonb,
   'manual', '', 'admin', TRUE, 50),

  ('open.modal.contact',       'Abrir modal de contato',
   'Abre o modal global de contato.',
   'modal_open', '{"modal_id":"contact"}'::jsonb,
   'manual', '', 'user', TRUE, 60),

  ('toast.thank_you',          'Toast de agradecimento',
   'Mostra mensagem rápida de obrigado.',
   'toast_show', '{"message":"Obrigado pela sua contribuição! 🙏","kind":"ok"}'::jsonb,
   'on_submit', 'Mostrado', 'user', TRUE, 70),

  ('clipboard.pix',            'Copiar chave Pix',
   'Copia a chave Pix configurada para a área de transferência.',
   'clipboard_copy', '{"value_config_key":"proof_pix_key"}'::jsonb,
   'manual', 'Chave Pix copiada', 'user', TRUE, 80),

  ('publish.page.current',     'Publicar página atual',
   'Publica a página em edição.',
   'page_publish', '{}'::jsonb,
   'manual', 'Página publicada', 'super_admin', TRUE, 90),

  ('approve.proof',            'Aprovar comprovante',
   'Marca um comprovante como aprovado e atualiza o status da doação.',
   'record_update_status', '{"table":"doacoes","status_value":"confirmado"}'::jsonb,
   'on_proof_received', 'Comprovante aprovado', 'admin', TRUE, 100),

  ('reject.proof',             'Recusar comprovante',
   'Marca um comprovante como recusado.',
   'record_update_status', '{"table":"doacoes","status_value":"recusado"}'::jsonb,
   'on_proof_received', 'Comprovante recusado', 'admin', TRUE, 110),

  ('soft_delete.donation',     'Excluir doação (soft delete)',
   'Marca uma doação como excluída — pode ser restaurada do banco.',
   'record_soft_delete', '{"table":"doacoes"}'::jsonb,
   'manual', 'Doação removida', 'super_admin', TRUE, 120),

  ('download.file',            'Baixar arquivo',
   'Inicia o download de uma URL configurada.',
   'download_file', '{"url":"","filename":"arquivo"}'::jsonb,
   'manual', 'Download iniciado', 'admin', TRUE, 130),

  ('export.donations.csv',     'Exportar doações (CSV)',
   'Gera um CSV das doações para baixar.',
   'export_report', '{"table":"doacoes","format":"csv"}'::jsonb,
   'manual', 'Relatório exportado', 'admin', TRUE, 140)
ON CONFLICT (command_key) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════
-- 5. CHECAGEM
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE c INT;
BEGIN
  SELECT COUNT(*) INTO c FROM system_commands;
  RAISE NOTICE '[Super Admin · Fase 7] Comandos pré-aprovados: %', c;
END $$;
