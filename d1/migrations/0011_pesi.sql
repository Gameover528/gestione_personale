-- =====================================================================
-- Registro del peso corporeo.
--
-- Il peso c'era gia', ma come numero unico dentro le preferenze
-- (`DatiCorporei.peso_kg`): buono per calcolare gli obiettivi, inutile per
-- vedere un andamento, e con un effetto collaterale sgradevole. Le calorie
-- bruciate di un allenamento si stimano da MET, durata e peso: con un solo
-- peso "attuale", un allenamento di due mesi fa veniva ricalcolato ogni volta
-- col peso di oggi, e la storia si riscriveva da sola all'indietro. Con questo
-- registro ogni allenamento usa la pesata piu' vicina alla sua data.
--
-- Una pesata al giorno: `unique (user_id, data)`. Pesarsi due volte nello
-- stesso giorno e tenere entrambe le misure non aggiunge informazione — il
-- peso oscilla di un chilo fra mattina e sera — e obbligherebbe ogni lettura a
-- decidere quale delle due vale. Registrare di nuovo lo stesso giorno
-- sovrascrive, che e' quello che uno si aspetta correggendo un errore di
-- battitura.
--
-- `peso_kg` e' real: le bilance danno i decimali, e su un registro del peso il
-- decimale e' spesso l'unica cosa che cambia da una settimana all'altra.
-- =====================================================================

create table if not exists pesi (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  data       text not null,
  peso_kg    real not null,
  nota       text,
  created_at text not null default (datetime('now')),
  unique (user_id, data)
);

-- L'indice segue le due letture che esistono: l'elenco piu' recente per primo
-- e la ricerca della pesata piu' vicina a una data.
create index if not exists pesi_user_data_idx on pesi (user_id, data desc);
