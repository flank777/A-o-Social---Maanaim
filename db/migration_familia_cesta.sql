-- Migration: adiciona familia_id em cestas_formadas
-- Execute no Supabase SQL Editor: https://app.supabase.com → projeto → SQL Editor
--
-- Esta coluna vincula cada lote de cestas à família beneficiada.
-- Nullable: lotes sem família específica continuam funcionando.

ALTER TABLE cestas_formadas
  ADD COLUMN IF NOT EXISTS familia_id UUID REFERENCES familias(id) ON DELETE SET NULL;

-- Índice para acelerar consultas por família
CREATE INDEX IF NOT EXISTS idx_cestas_formadas_familia_id
  ON cestas_formadas (familia_id);
