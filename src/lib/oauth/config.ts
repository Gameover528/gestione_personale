/**
 * Le costanti dell'autorizzazione OAuth, in un posto solo.
 *
 * Tutto quello che qui è un elenco chiuso lo è di proposito: un `redirect_uri`
 * accettato alla cieca è il modo classico di farsi portare via un codice di
 * autorizzazione, perché basta convincere l'utente ad autorizzare e poi farsi
 * rimandare il codice a casa propria.
 */

/**
 * L'unico client ammesso, scritto qui e senza segreto.
 *
 * È un "client pubblico": il segreto non ci sarebbe comunque dove nasconderlo
 * (chi lo usa è un'applicazione di terzi) e OAuth 2.1 lo prevede, a patto di
 * usare PKCE — che qui è obbligatorio. Chi aggiunge il connettore incolla
 * questo identificativo nel campo "usa il tuo client OAuth".
 */
export const CLIENT_ID = "gestione-personale-chat";

/**
 * Dove si può tornare dopo il consenso. Elenco chiuso, confronto esatto.
 *
 * Il primo è l'indirizzo delle app di Claude (sito, desktop, telefono): è
 * fisso e documentato. Gli altri due sono i rientri su macchina locale che
 * usano i client da riga di comando, ammessi solo con porta qualunque perché
 * la scelgono al volo.
 */
const RITORNI_ESATTI = ["https://claude.ai/api/mcp/auth_callback"];

export function redirectUriAmmesso(uri: string): boolean {
  if (RITORNI_ESATTI.includes(uri)) return true;
  try {
    const u = new URL(uri);
    const locale = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    return locale && u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Quanto vale un codice di autorizzazione: il tempo di scambiarlo, non di più. */
export const CODICE_SECONDI = 60;

/**
 * Il token d'accesso dura poco perché viaggia a ogni chiamata; quello di
 * rinnovo dura a lungo ma si vede solo quando serve un accesso nuovo, e si
 * sostituisce ogni volta che lo si usa. Così un token d'accesso sfuggito vale
 * un'ora, e un rinnovo riusato due volte si nota.
 */
export const ACCESSO_SECONDI = 60 * 60;
export const RINNOVO_GIORNI = 180;

/** Cosa si può chiedere. Per ora si legge e basta. */
export const AMBITO = "lettura";

/** Il percorso del server MCP: la risorsa che si sta proteggendo. */
export const PERCORSO_MCP = "/api/mcp";
