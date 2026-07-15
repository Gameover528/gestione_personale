-- =====================================================================
-- Gestione Personale — Bollette: divisione spese con altra famiglia
-- Esegui nel SQL Editor del tuo progetto Supabase (dopo 0001_init.sql).
-- =====================================================================

alter table public.bollette
  add column if not exists divisione text not null default 'non_condivisa',
  add column if not exists persone_tue smallint not null default 3,
  add column if not exists persone_altre smallint not null default 2;

-- Indice per filtrare velocemente le bollette ancora da dividere
create index if not exists bollette_divisione_idx
  on public.bollette (user_id, divisione);
