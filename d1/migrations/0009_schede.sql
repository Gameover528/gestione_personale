-- =====================================================================
-- Schede di allenamento (programmi ricorrenti).
--
-- Una scheda e' un modello: l'elenco di esercizi che si ripetono, con quante
-- serie e con quali numeri sono previsti. Non e' un allenamento svolto: da una
-- scheda si *avvia* un allenamento, che copia le righe in allenamento_serie e
-- da quel momento vive per conto suo. Cosi' modificare la scheda non riscrive
-- la storia di quello che si e' gia' fatto, ed e' lo stesso principio per cui
-- le serie portano con se' il nome dell'esercizio.
--
-- `serie` e' quante serie generare all'avvio: una riga di scheda ("panca 4x8 a
-- 60 kg") diventa quattro righe nell'allenamento.
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

-- Da quale scheda e' nato un allenamento: serve solo a dirlo nell'interfaccia
-- ("da: Spinta A"). Resta null per gli allenamenti creati a mano, e se la
-- scheda viene cancellata torna null senza portarsi via l'allenamento.
alter table allenamenti add column scheda_id text references schede(id) on delete set null;
