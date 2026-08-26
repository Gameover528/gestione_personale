-- =====================================================================
-- Abbonamenti (area Consumi e Costi): spese ricorrenti con rate generate
-- automaticamente in base alla frequenza scelta.
-- =====================================================================

create table if not exists abbonamenti (
  id            text primary key,
  user_id       text not null references users(id) on delete cascade,
  nome          text not null,
  importo       real not null default 0,
  -- settimanale | mensile | bimestrale | trimestrale | semestrale | annuale
  frequenza     text not null default 'mensile',
  data_inizio   text not null,
  -- attivo | sospeso | disdetto
  stato         text not null default 'attivo',
  -- Se valorizzata, le rate vengono generate solo a partire da questa data:
  -- serve a rendere non retroattiva la ripresa dopo una sospensione.
  data_ripresa  text,
  note          text,
  created_at    text not null default (datetime('now'))
);

create index if not exists abbonamenti_user_idx on abbonamenti (user_id);

create table if not exists abbonamento_rate (
  id             text primary key,
  abbonamento_id text not null references abbonamenti(id) on delete cascade,
  user_id        text not null references users(id) on delete cascade,
  data_scadenza  text not null,
  importo        real not null default 0,
  stato          text not null default 'da_pagare',
  data_pagamento text,
  created_at     text not null default (datetime('now')),
  unique (abbonamento_id, data_scadenza)
);

create index if not exists abbonamento_rate_user_idx on abbonamento_rate (user_id);
create index if not exists abbonamento_rate_abbonamento_idx on abbonamento_rate (abbonamento_id);
