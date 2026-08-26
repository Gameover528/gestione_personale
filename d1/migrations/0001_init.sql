-- =====================================================================
-- Gestione Personale — schema D1 (SQLite)
-- Consolida le 6 migration Postgres/Supabase in un unico schema iniziale
-- per il nuovo database D1. Nessuna RLS: l'isolamento per utente è
-- applicato a livello di codice (ogni query filtra su user_id, che
-- viene sempre letto dalla sessione lato server, mai dal client).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Autenticazione (sostituisce Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists users (
  id            text primary key,
  email         text not null unique,
  password_hash text not null,
  created_at    text not null default (datetime('now'))
);

create table if not exists sessions (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  expires_at text not null,
  created_at text not null default (datetime('now'))
);

create index if not exists sessions_user_idx on sessions (user_id);

-- ---------------------------------------------------------------------
-- Bollette
-- ---------------------------------------------------------------------
create table if not exists bollette (
  id             text primary key,
  user_id        text not null references users(id) on delete cascade,
  fornitore      text not null,
  tipo           text not null default 'altro',
  importo        real not null default 0,
  data_scadenza  text not null,
  stato          text not null default 'da_pagare',
  data_pagamento text,
  note           text,
  allegato_path  text,
  pagamento_path text,
  divisione      text not null default 'non_condivisa',
  persone_tue    integer not null default 3,
  persone_altre  integer not null default 2,
  periodo_inizio text,
  periodo_fine   text,
  created_at     text not null default (datetime('now'))
);

create index if not exists bollette_user_scadenza_idx on bollette (user_id, data_scadenza);
create index if not exists bollette_divisione_idx on bollette (user_id, divisione);

-- ---------------------------------------------------------------------
-- Preferenze utente (layout dashboard, ecc.)
-- ---------------------------------------------------------------------
create table if not exists user_preferences (
  user_id    text not null references users(id) on delete cascade,
  key        text not null,
  value      text not null default '{}',
  updated_at text not null default (datetime('now')),
  primary key (user_id, key)
);

-- ---------------------------------------------------------------------
-- Alimentazione: diario pasti
-- ---------------------------------------------------------------------
create table if not exists diario_pasti (
  id              text primary key,
  user_id         text not null references users(id) on delete cascade,
  data            text not null,
  pasto           text not null default 'pranzo',
  nome_alimento   text not null,
  marca           text,
  quantita_g      real not null default 0,
  kcal_100        real not null default 0,
  proteine_100    real not null default 0,
  carboidrati_100 real not null default 0,
  grassi_100      real not null default 0,
  fibre_100       real not null default 0,
  zuccheri_100    real not null default 0,
  sale_100        real not null default 0,
  fonte           text,
  created_at      text not null default (datetime('now'))
);

create index if not exists diario_user_data_idx on diario_pasti (user_id, data);

-- ---------------------------------------------------------------------
-- Alimentazione: obiettivi nutrizionali
-- ---------------------------------------------------------------------
create table if not exists obiettivi_nutrizionali (
  user_id   text not null references users(id) on delete cascade,
  nutriente text not null,
  valore    real not null default 0,
  tipo      text not null default 'max',
  primary key (user_id, nutriente)
);

-- ---------------------------------------------------------------------
-- Alimentazione: piatti (ricette) e ingredienti
-- ---------------------------------------------------------------------
create table if not exists piatti (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  nome       text not null,
  created_at text not null default (datetime('now'))
);

create table if not exists piatto_ingredienti (
  id              text primary key,
  piatto_id       text not null references piatti(id) on delete cascade,
  user_id         text not null references users(id) on delete cascade,
  nome_alimento   text not null,
  marca           text,
  quantita_g      real not null default 0,
  kcal_100        real not null default 0,
  proteine_100    real not null default 0,
  carboidrati_100 real not null default 0,
  grassi_100      real not null default 0,
  fibre_100       real not null default 0,
  zuccheri_100    real not null default 0,
  sale_100        real not null default 0,
  fonte           text
);

create index if not exists piatti_user_idx on piatti (user_id);
create index if not exists piatto_ing_piatto_idx on piatto_ingredienti (piatto_id);
