-- =====================================================================
-- Ruoli e stato account
-- ruolo: 'superadmin' | 'admin' | 'utilizzatore'
-- stato: 'attivo' | 'sospeso' | 'bloccato'
-- =====================================================================

alter table users add column ruolo text not null default 'utilizzatore';
alter table users add column stato text not null default 'attivo';

-- Il primo account mai creato diventa superadmin automaticamente
-- (non è cancellabile né modificabile da un admin).
update users
set ruolo = 'superadmin'
where id = (select id from users order by created_at asc limit 1);
