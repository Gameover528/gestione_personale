-- =====================================================================
-- Profilo utente: come la persona vuole essere chiamata.
--
-- Resta separato dall'email (che e' l'identificativo di accesso e non si
-- cambia): se non valorizzato, l'app continua a mostrare l'email.
--
-- Il tema scelto (chiaro/scuro/sistema) non ha bisogno di una colonna: sta
-- tra le preferenze utente, in user_preferences con chiave "aspetto".
-- =====================================================================

alter table users add column nome text;
