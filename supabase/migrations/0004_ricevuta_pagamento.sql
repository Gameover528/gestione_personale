-- =====================================================================
-- Gestione Personale — Bollette: PDF ricevuta di pagamento
-- Esegui nel SQL Editor di Supabase (dopo 0003_periodo.sql).
-- =====================================================================

alter table public.bollette
  add column if not exists pagamento_path text;
