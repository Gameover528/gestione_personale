-- =====================================================================
-- Freno alla forza bruta sul login.
--
-- Una riga per "chiave" (l'IP di chi tenta, o l'email se l'IP non c'e'):
-- conta i tentativi falliti dentro una finestra temporale e, superata la
-- soglia, mette la chiave in blocco per qualche minuto. Il login riuscito
-- azzera la riga. E' l'unico punto non autenticato dell'app, quindi e' li'
-- che serve il freno; le azioni riservate (reset password, ecc.) sono gia'
-- protette dal controllo di ruolo.
--
-- Keying sull'IP e non sull'email: cosi' un estraneo non puo' bloccare
-- l'accesso a un account altrui a raffica di tentativi (lockout come DoS).
-- =====================================================================

create table if not exists login_attempts (
  chiave          text primary key,
  tentativi       integer not null default 0,
  finestra_inizio text not null default (datetime('now')),
  blocco_fino     text
);
