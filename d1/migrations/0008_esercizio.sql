-- =====================================================================
-- Area Salute: modulo Esercizio.
--
-- Quattro tabelle:
--  - esercizi_catalogo : il catalogo condiviso (ExerciseDB), uguale per tutti,
--                        senza user_id. Si popola con d1/seed-esercizi.sql.
--  - esercizi          : gli esercizi personali, per quello che il catalogo
--                        non ha (come i piatti personali per l'alimentazione).
--  - allenamenti       : la singola sessione.
--  - allenamento_serie : cosa si e' fatto dentro la sessione.
--
-- Muscoli, attrezzi e istruzioni sono salvati come array JSON in colonne di
-- testo: sono elenchi brevi che si leggono sempre insieme all'esercizio e non
-- si interrogano mai da soli, quindi una tabella di collegamento aggiungerebbe
-- join senza dare niente in cambio. La traduzione dei nomi verso i gruppi
-- muscolari disegnabili sta nel codice (muscoli/tipi.ts), non qui.
-- =====================================================================

create table if not exists esercizi_catalogo (
  id                text primary key,
  nome              text not null,
  gif_url           text,
  muscoli           text not null default '[]',
  muscoli_secondari text not null default '[]',
  parti_corpo       text not null default '[]',
  attrezzi          text not null default '[]',
  istruzioni        text not null default '[]'
);

create index if not exists esercizi_catalogo_nome_idx on esercizi_catalogo (nome);

create table if not exists esercizi (
  id                text primary key,
  user_id           text not null references users(id) on delete cascade,
  nome              text not null,
  muscoli           text not null default '[]',
  muscoli_secondari text not null default '[]',
  attrezzo          text,
  note              text,
  created_at        text not null default (datetime('now'))
);

create index if not exists esercizi_user_idx on esercizi (user_id, nome);

create table if not exists allenamenti (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  data       text not null,
  nome       text,
  durata_min integer,
  note       text,
  created_at text not null default (datetime('now'))
);

create index if not exists allenamenti_user_data_idx on allenamenti (user_id, data);

-- `esercizio_nome` e' copiato al momento dell'inserimento e non e' una chiave
-- esterna: il catalogo puo' cambiare o un esercizio personale essere cancellato,
-- ma un allenamento gia' fatto deve restare leggibile per sempre.
-- `esercizio_fonte` dice dove cercare i dettagli: 'catalogo' o 'personale'.
create table if not exists allenamento_serie (
  id              text primary key,
  allenamento_id  text not null references allenamenti(id) on delete cascade,
  user_id         text not null references users(id) on delete cascade,
  esercizio_id    text not null,
  esercizio_fonte text not null default 'catalogo',
  esercizio_nome  text not null,
  ordine          integer not null default 0,
  ripetizioni     integer,
  peso_kg         real,
  durata_min      real,
  distanza_km     real,
  created_at      text not null default (datetime('now'))
);

create index if not exists allenamento_serie_idx on allenamento_serie (allenamento_id, ordine);
