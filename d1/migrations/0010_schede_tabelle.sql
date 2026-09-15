-- =====================================================================
-- Riparazione: le tabelle delle schede.
--
-- Il 15 settembre 2026 la migration 0009 e' passata solo a meta' su dev e su
-- produzione: `alter table allenamenti add column scheda_id` ha attecchito
-- (la colonna c'e' su entrambi), mentre i due `create table` no. Risultato:
-- la pagina Schede restava a "Caricamento..." per sempre, perche' la query
-- falliva e il componente non usciva mai dallo stato iniziale.
--
-- Questa migration ricrea solo le tabelle mancanti. E' scritta tutta con
-- `if not exists`, quindi si puo' applicare a qualunque ambiente — compreso
-- quello locale, dove le tabelle ci sono gia' e non succede niente.
--
-- NON rilanciare la 0009 per rimediare: il suo `alter table` fallirebbe con
-- "duplicate column name: scheda_id", perche' quella parte e' gia' applicata.
-- =====================================================================

create table if not exists schede (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  nome       text not null,
  note       text,
  created_at text not null default (datetime('now'))
);

create index if not exists schede_user_idx on schede (user_id, nome);

create table if not exists scheda_esercizi (
  id              text primary key,
  scheda_id       text not null references schede(id) on delete cascade,
  user_id         text not null references users(id) on delete cascade,
  esercizio_id    text not null,
  esercizio_fonte text not null default 'catalogo',
  esercizio_nome  text not null,
  ordine          integer not null default 0,
  serie           integer not null default 1,
  ripetizioni     integer,
  peso_kg         real,
  durata_min      real,
  distanza_km     real,
  created_at      text not null default (datetime('now'))
);

create index if not exists scheda_esercizi_idx on scheda_esercizi (scheda_id, ordine);
