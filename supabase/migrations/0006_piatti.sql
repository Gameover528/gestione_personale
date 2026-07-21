-- =====================================================================
-- Gestione Personale — Alimentazione: piatti (ricette) composti
-- Esegui nel SQL Editor di Supabase (dopo 0005_alimentazione.sql).
-- =====================================================================

create table if not exists public.piatti (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  nome       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.piatto_ingredienti (
  id            uuid primary key default gen_random_uuid(),
  piatto_id     uuid not null references public.piatti(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
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
  fonte         text
);

create index if not exists piatti_user_idx on public.piatti (user_id);
create index if not exists piatto_ing_piatto_idx on public.piatto_ingredienti (piatto_id);

alter table public.piatti enable row level security;
alter table public.piatto_ingredienti enable row level security;

drop policy if exists "piatti_all_own" on public.piatti;
create policy "piatti_all_own" on public.piatti
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "piatto_ing_all_own" on public.piatto_ingredienti;
create policy "piatto_ing_all_own" on public.piatto_ingredienti
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
