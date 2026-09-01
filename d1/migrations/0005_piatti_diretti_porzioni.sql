-- =====================================================================
-- Alimentazione: i "piatti" diventano un vero database personale.
--
-- 1) Un piatto puo' essere di due tipi:
--    - 'composto': come prima, i valori si ricavano dalla somma degli
--      ingredienti (tabella piatto_ingredienti);
--    - 'diretto': i valori per 100 g sono inseriti a mano e salvati qui
--      (etichetta di un prodotto, piatto della mensa, ricetta di cui si
--      conosce solo il totale). Questi piatti non hanno ingredienti.
--    Le colonne kcal_100...sale_100 restano a 0 per i piatti composti.
--
-- 2) Porzioni: porzione_nome + porzione_g permettono di registrare per
--    porzioni ("1 piatto = 350 g", "1 fetta = 30 g") invece che in grammi.
--    Anche le righe di diario conservano la porzione con cui sono state
--    inserite, così restano leggibili nel tempo.
--
-- ATTENZIONE: da applicare UNA SOLA VOLTA per database. SQLite non ha
-- "add column if not exists", quindi rilanciando il file si ottiene
-- "duplicate column name: marca": è un errore innocuo (si ferma sulla prima
-- istruzione, non modifica niente), ma per capire se una migration è già
-- passata conviene guardare lo schema invece di rilanciarla:
--   npx wrangler d1 execute <db> --remote --command \
--     "select sql from sqlite_master where name = 'piatti'"
-- =====================================================================

alter table piatti add column marca text;
alter table piatti add column tipo text not null default 'composto';
alter table piatti add column kcal_100 real not null default 0;
alter table piatti add column proteine_100 real not null default 0;
alter table piatti add column carboidrati_100 real not null default 0;
alter table piatti add column grassi_100 real not null default 0;
alter table piatti add column fibre_100 real not null default 0;
alter table piatti add column zuccheri_100 real not null default 0;
alter table piatti add column sale_100 real not null default 0;
alter table piatti add column porzione_nome text;
alter table piatti add column porzione_g real;

alter table diario_pasti add column porzione_nome text;
alter table diario_pasti add column porzione_g real;

-- Ricerca dei piatti personali per nome (usata dalla ricerca alimenti).
create index if not exists piatti_user_nome_idx on piatti (user_id, nome);

-- Elenco "usati di recente" (group by nome con max(created_at)).
create index if not exists diario_user_created_idx on diario_pasti (user_id, created_at);
