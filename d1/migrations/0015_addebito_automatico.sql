-- =====================================================================
-- Abbonamenti con addebito automatico: le rate si pagano da sole.
--
-- Prima ogni rata nasceva "da pagare", anche quelle che la banca o la carta
-- addebitano da sé, cioè quasi tutte. Un abbonamento inserito con una data di
-- inizio di due anni fa generava subito ventiquattro rate arretrate da
-- spuntare una per una, e intanto la dashboard segnalava debiti inesistenti.
--
-- Con addebito automatico (1) le rate che arrivano a scadenza nascono già
-- pagate, con data di pagamento uguale alla scadenza. Con 0 si segnano a mano,
-- come prima.
--
-- Predefinito 1 anche per gli abbonamenti esistenti: vale per le rate che
-- verranno generate da ora. Quelle già nate da pagare restano come sono, e si
-- possono segnare tutte insieme dal dettaglio dell'abbonamento.
-- =====================================================================

alter table abbonamenti add column addebito_automatico integer not null default 1;
