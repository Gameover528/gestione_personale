-- =====================================================================
-- Cache locale dei risultati di ricerca alimenti (Open Food Facts + USDA).
-- Evita di dipendere ogni volta dalle API esterne (Open Food Facts in
-- particolare è nota per essere lenta/instabile): la prima ricerca di un
-- termine lo interroga dal vivo, le successive leggono da qui.
-- Condivisa tra tutti gli utenti (i dati nutrizionali non sono personali).
-- =====================================================================
create table if not exists alimenti_cache (
  query      text primary key,
  risultati  text not null,
  updated_at text not null default (datetime('now'))
);
