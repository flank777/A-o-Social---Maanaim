-- ══════════════════════════════════════════════════════════════
-- DoaVida — Setup completo do banco Supabase
-- Execute no SQL Editor do painel: app.supabase.com
--
-- ATENÇÃO: após rodar este script, execute também db/rls_policies.sql
-- para aplicar as políticas de segurança corretas.
-- ══════════════════════════════════════════════════════════════

-- ALIMENTOS
CREATE TABLE IF NOT EXISTS alimentos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  goal       numeric DEFAULT 0,
  kg         numeric DEFAULT 0,
  img        text DEFAULT '',
  emoji      text DEFAULT '🥫',
  peso       numeric DEFAULT 1,
  unidade    text DEFAULT 'kg',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE alimentos ENABLE ROW LEVEL SECURITY;

-- DOAÇÕES
CREATE TABLE IF NOT EXISTS doacoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text DEFAULT '',
  telefone      text DEFAULT '',
  protocolo     text DEFAULT '',
  status        text DEFAULT 'pendente',
  entrega       text DEFAULT '',
  itens         jsonb DEFAULT '[]',
  total_kg      numeric DEFAULT 0,
  pedido_oracao text DEFAULT '',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
ALTER TABLE doacoes ENABLE ROW LEVEL SECURITY;

-- FAMÍLIAS
CREATE TABLE IF NOT EXISTS familias (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  phone      text DEFAULT '',
  endereco   text DEFAULT '',
  pessoas    integer DEFAULT 0,
  obs        text DEFAULT '',
  ativa      boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE familias ENABLE ROW LEVEL SECURITY;

-- GALERIA
CREATE TABLE IF NOT EXISTS galeria (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url          text DEFAULT '',
  legenda      text DEFAULT '',
  titulo       text DEFAULT '',
  alt          text DEFAULT '',
  categoria    text DEFAULT 'geral',
  tipo         text DEFAULT 'imagem',
  poster_url   text DEFAULT '',
  order_index  integer DEFAULT 0,
  ativo        boolean DEFAULT true,
  storage_path text DEFAULT '',
  visibilidade text DEFAULT 'publica',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE galeria ENABLE ROW LEVEL SECURITY;

-- VOLUNTÁRIOS
CREATE TABLE IF NOT EXISTS voluntarios (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL,
  telefone   text DEFAULT '',
  tipo       text DEFAULT '',
  tipo_label text DEFAULT '',
  status     text DEFAULT 'novo',
  dados      jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE voluntarios ENABLE ROW LEVEL SECURITY;

-- ORAÇÕES
CREATE TABLE IF NOT EXISTS oracoes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text DEFAULT 'Anônimo',
  categoria  text DEFAULT 'outros',
  mensagem   text NOT NULL,
  status     text DEFAULT 'precisa-oracao',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE oracoes ENABLE ROW LEVEL SECURITY;

-- MODELO CESTA ITENS
CREATE TABLE IF NOT EXISTS modelo_cesta_itens (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alimento_id           text DEFAULT '',
  alimento_nome         text DEFAULT '',
  quantidade_por_cesta  numeric DEFAULT 1,
  peso_unitario_kg      numeric DEFAULT 1,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
ALTER TABLE modelo_cesta_itens ENABLE ROW LEVEL SECURITY;

-- CESTAS FORMADAS
CREATE TABLE IF NOT EXISTS cestas_formadas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quantidade      integer DEFAULT 1,
  observacao      text DEFAULT '',
  itens_snapshot  jsonb DEFAULT '[]',
  total_kg        numeric DEFAULT 0,
  formado_por     text DEFAULT 'admin',
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE cestas_formadas ENABLE ROW LEVEL SECURITY;

-- CONFIGURAÇÃO
CREATE TABLE IF NOT EXISTS configuracao (
  chave      text PRIMARY KEY,
  valor      text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE configuracao ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- DADOS INICIAIS
-- ══════════════════════════════════════════════════════════════

-- Alimentos padrão da cesta básica
INSERT INTO alimentos (id, name, peso, goal, kg, emoji, img) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Arroz 5kg',        5,     2000, 0, '🌾', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&q=70'),
  ('00000000-0000-0000-0000-000000000002', 'Feijão 1kg',       1,     800,  0, '🫘', 'https://images.unsplash.com/photo-1612257999756-3b9d3acd5e66?w=300&q=70'),
  ('00000000-0000-0000-0000-000000000003', 'Macarrão 500g',    0.5,   500,  0, '🍝', 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=300&q=70'),
  ('00000000-0000-0000-0000-000000000004', 'Óleo de Soja 1L',  1,     400,  0, '🫙', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&q=70'),
  ('00000000-0000-0000-0000-000000000005', 'Açúcar 1kg',       1,     400,  0, '🍬', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=70'),
  ('00000000-0000-0000-0000-000000000006', 'Sal 1kg',          1,     200,  0, '🧂', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300&q=70'),
  ('00000000-0000-0000-0000-000000000007', 'Farinha de Trigo', 1,     300,  0, '🌾', 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300&q=70'),
  ('00000000-0000-0000-0000-000000000008', 'Sardinha 125g',    0.125, 100,  0, '🐟', 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=300&q=70')
ON CONFLICT (id) DO NOTHING;

-- Configurações iniciais
-- ATENÇÃO: NÃO armazenar senhas em texto puro aqui.
-- A autenticação do sistema usa Supabase Auth (e-mail + senha).
-- Crie o usuário super_admin diretamente em: Supabase → Authentication → Users
INSERT INTO configuracao (chave, valor) VALUES
  ('wa_numero',         ''),
  ('wa_msg',            'Olá! Quero confirmar minha doação para a Ação Social Semear. Protocolo: {protocolo}'),
  ('wa_msg_admin',      'Nova doação recebida!\nDoador: {nome}\nProtocolo: {protocolo}\nItens: {itens}\nTotal: {total_kg}kg\nEntrega: {entrega}'),
  ('nome_organizacao',  'Ação Social Semear'),
  ('cidade',            'Belém, PA'),
  ('meta_geral_kg',     '5000'),
  ('permitir_coleta',   'true'),
  ('permitir_entrega',  'true')
ON CONFLICT (chave) DO NOTHING;
