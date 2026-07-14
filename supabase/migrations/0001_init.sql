-- =====================================================================
-- Gestione Personale — schema iniziale
-- Esegui questo script nel SQL Editor del tuo NUOVO progetto Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabella: bollette
-- ---------------------------------------------------------------------
create table if not exists public.bollette (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  fornitore      text not null,
  tipo           text not null default 'altro',
  importo        numeric(10,2) not null default 0,
  data_scadenza  date not null,
  stato          text not null default 'da_pagare',
  data_pagamento date,
  note           text,
  allegato_path  text,
  created_at     timestamptz not null default now()
);

create index if not exists bollette_user_scadenza_idx
  on public.bollette (user_id, data_scadenza);

alter table public.bollette enable row level security;

drop policy if exists "bollette_select_own" on public.bollette;
drop policy if exists "bollette_insert_own" on public.bollette;
drop policy if exists "bollette_update_own" on public.bollette;
drop policy if exists "bollette_delete_own" on public.bollette;

create policy "bollette_select_own" on public.bollette
  for select using (auth.uid() = user_id);
create policy "bollette_insert_own" on public.bollette
  for insert with check (auth.uid() = user_id);
create policy "bollette_update_own" on public.bollette
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bollette_delete_own" on public.bollette
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Tabella: user_preferences (layout dashboard e impostazioni varie)
-- ---------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_preferences enable row level security;

drop policy if exists "prefs_all_own" on public.user_preferences;
create policy "prefs_all_own" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Storage: bucket privato "bollette" per gli allegati PDF
-- I file sono salvati sotto la cartella <user_id>/... : ogni utente
-- vede e gestisce solo i propri file.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('bollette', 'bollette', false)
on conflict (id) do nothing;

drop policy if exists "bollette_storage_select" on storage.objects;
drop policy if exists "bollette_storage_insert" on storage.objects;
drop policy if exists "bollette_storage_update" on storage.objects;
drop policy if exists "bollette_storage_delete" on storage.objects;

create policy "bollette_storage_select" on storage.objects
  for select using (
    bucket_id = 'bollette'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "bollette_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'bollette'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "bollette_storage_update" on storage.objects
  for update using (
    bucket_id = 'bollette'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "bollette_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'bollette'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
