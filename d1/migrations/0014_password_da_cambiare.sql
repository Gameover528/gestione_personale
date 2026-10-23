-- =====================================================================
-- Password scelte da un amministratore: si cambiano al primo accesso.
--
-- Quando un admin crea un account o genera una password temporanea, quella
-- password la conosce anche lui: finché resta valida, può entrare nei dati di
-- un altro, salute compresa. Prima niente obbligava a cambiarla, e una
-- temporanea dimenticata restava buona per sempre.
--
-- `password_da_cambiare`: 1 finché la persona non ne sceglie una sua. Il
-- middleware la tiene sulla pagina "Scegli la tua password" fino ad allora.
--
-- `password_temporanea_scade`: oltre questa data la password scelta da altri
-- non apre più niente, e serve chiederne un'altra. 24 ore per un reset, 7
-- giorni per un account appena creato (va comunicata e magari aspetta).
--
-- I valori predefiniti lasciano gli account esistenti come sono: nessuno si
-- ritrova obbligato a cambiare password per una migration.
-- =====================================================================

alter table users add column password_da_cambiare integer not null default 0;
alter table users add column password_temporanea_scade text;
