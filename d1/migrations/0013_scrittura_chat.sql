-- =====================================================================
-- Far scrivere una chat: permesso separato e provenienza visibile.
--
-- DUE COSE, UNA SOLA RAGIONE: quello che entra da fuori deve restare
-- distinguibile da quello che hai scritto tu.
--
-- `ambito` sui permessi. Finora esisteva un permesso solo, "lettura", e la
-- pagina del consenso prometteva per iscritto «non potrà scrivere». Aggiungere
-- gli attrezzi di scrittura senza questa colonna avrebbe fatto scrivere di
-- colpo i collegamenti già concessi, cioè avrebbe smentito la schermata su cui
-- qualcuno ha cliccato Consenti. Il valore predefinito è "lettura" apposta: i
-- permessi già dati restano quello che erano, e per scrivere si rifà il giro.
--
-- `fonte` sulle pesate. Il diario ce l'aveva già (off, usda, piatto, manuale);
-- il registro del peso no, perché finora lo compilavi solo tu. Serve per due
-- motivi: far vedere nell'app cosa è arrivato da una chat, e permettere di
-- disfare *solo* quello — una riga scritta da te, da lì, non si tocca.
-- =====================================================================

alter table oauth_codici add column ambito text not null default 'lettura';
alter table oauth_token  add column ambito text not null default 'lettura';

alter table pesi add column fonte text;
