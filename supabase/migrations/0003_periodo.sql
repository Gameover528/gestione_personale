-- =====================================================================
-- Gestione Personale — Bollette: periodo di riferimento
-- Esegui nel SQL Editor di Supabase (dopo 0002_divisione.sql).
-- =====================================================================

alter table public.bollette
  add column if not exists periodo_inizio date,
  add column if not exists periodo_fine date;
