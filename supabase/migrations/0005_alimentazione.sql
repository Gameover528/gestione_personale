-- =====================================================================
-- Gestione Personale — Modulo Alimentazione
-- Esegui nel SQL Editor di Supabase (dopo 0004_ricevuta_pagamento.sql).
-- =====================================================================

-- Diario dei pasti: ogni riga e' un alimento consumato in un pasto.
-- I valori nutrizionali sono salvati per 100 g al momento dell'inserimento
-- (snapshot), piu' la quantita' in grammi.
create table if not exists public.diario_pasti (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  data          date not null,
  pasto         text not null default 'pranzo',
  nome_alimento text not null,
  marca         text,
  quantita_g    numeric(8,1) not null default 0,
  kcal_100         numeric(8,2) not null default 0,
  proteine_100     numeric(8,2) not null default 0,
  carboidrati_100  numeric(8,2) not null default 0,
  grassi_100       numeric(8,2) not null default 0,
  fibre_100        numeric(8,2) not null default 0,
  zuccheri_100     numeric(8,2) not null default 0,
  sale_100         numeric(8,2) not null default 0,
  fonte         text,
  created_at    timestamptz not null default now()
);

create index if not exists diario_user_data_idx
  on public.diario_pasti (user_id, data);

alter table public.diario_pasti enable row level security;

drop policy if exists "diario_all_own" on public.diario_pasti;
create policy "diario_all_own" on public.diario_pasti
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Obiettivi nutrizionali per utente e nutriente.
-- tipo = 'min' (obiettivo minimo, superabile) oppure 'max' (limite da non superare).
create table if not exists public.obiettivi_nutrizionali (
  user_id   uuid not null references auth.users(id) on delete cascade,
  nutriente text not null,
  valore    numeric(8,2) not null default 0,
  tipo      text not null default 'max',
  primary key (user_id, nutriente)
);

alter table public.obiettivi_nutrizionali enable row level security;

drop policy if exists "obiettivi_all_own" on public.obiettivi_nutrizionali;
create policy "obiettivi_all_own" on public.obiettivi_nutrizionali
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
