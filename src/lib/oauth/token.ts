import { getDb } from "@/lib/cf";
import {
  ACCESSO_SECONDI,
  CODICE_SECONDI,
  RINNOVO_GIORNI,
} from "./config";

/**
 * Codici e token: come si fabbricano, come si salvano, come si verificano.
 *
 * Due regole che valgono per tutto il file:
 * - quello che l'utente riceve non è mai quello che finisce nel database:
 *   salviamo l'impronta, così chi legge il database non può usarne nessuno;
 * - un codice si consuma: la verifica lo cancella nello stesso momento in cui
 *   lo accetta, perché un codice riusabile è un codice rubabile due volte.
 */

/** 32 byte casuali in base64url: abbastanza da non doverci pensare. */
function segreto(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * SHA-256, senza sale.
 *
 * Per le password il sale è obbligatorio, perché le password le scelgono le
 * persone e si indovinano. Un token è 32 byte casuali: non esiste elenco da
 * provare, quindi il sale non aggiungerebbe niente e costerebbe una colonna.
 */
async function impronta(valore: string): Promise<string> {
  const dati = new TextEncoder().encode(valore);
  const buf = await crypto.subtle.digest("SHA-256", dati);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** La verifica PKCE: S256, l'unico metodo che accettiamo. */
export async function pkceCorrisponde(
  verifier: string,
  challenge: string
): Promise<boolean> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  const calcolato = btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  // Confronto a tempo costante: la lunghezza è nota e uguale, quindi basta
  // scorrere tutto senza uscire al primo carattere diverso.
  if (calcolato.length !== challenge.length) return false;
  let diff = 0;
  for (let i = 0; i < calcolato.length; i++) {
    diff |= calcolato.charCodeAt(i) ^ challenge.charCodeAt(i);
  }
  return diff === 0;
}

// --------------------------- Codici ---------------------------

export async function creaCodice(
  userId: string,
  codeChallenge: string,
  redirectUri: string,
  ambito: string
): Promise<string> {
  const codice = segreto();
  const db = getDb();

  /*
    Occasione buona per buttare i codici scaduti.

    Non è ordine fine a se stesso: un codice si consuma scambiandolo, ma chi
    dà il consenso e poi chiude la finestra non scambia niente, e quella riga
    resterebbe lì per sempre. Si è visto misurando — due righe avanzate dopo
    quattro prove. Stesso trucco già usato per le sessioni scadute.
  */
  await db.batch([
    db.prepare("delete from oauth_codici where scadenza <= datetime('now')"),
    db
      .prepare(
        `insert into oauth_codici (impronta, user_id, code_challenge, redirect_uri, ambito, scadenza)
         values (?, ?, ?, ?, ?, datetime('now', '+${CODICE_SECONDI} seconds'))`
      )
      .bind(await impronta(codice), userId, codeChallenge, redirectUri, ambito),
  ]);
  return codice;
}

export interface CodiceRisolto {
  userId: string;
  codeChallenge: string;
  redirectUri: string;
  ambito: string;
}

/**
 * Consuma un codice: lo legge e lo cancella, scaduto o no.
 *
 * La cancellazione avviene anche quando il codice è scaduto o quando poi la
 * verifica PKCE fallirà: un codice presentato una volta non deve poter essere
 * ripresentato, qualunque sia andata la prima volta.
 */
export async function consumaCodice(
  codice: string
): Promise<CodiceRisolto | null> {
  const db = getDb();
  const h = await impronta(codice);

  const riga = await db
    .prepare(
      `select user_id, code_challenge, redirect_uri, ambito, scadenza > datetime('now') as valido
         from oauth_codici where impronta = ?`
    )
    .bind(h)
    .first<{
      user_id: string;
      code_challenge: string;
      redirect_uri: string;
      ambito: string;
      valido: number;
    }>();

  await db.prepare("delete from oauth_codici where impronta = ?").bind(h).run();

  if (!riga || !riga.valido) return null;
  return {
    userId: riga.user_id,
    codeChallenge: riga.code_challenge,
    redirectUri: riga.redirect_uri,
    ambito: riga.ambito,
  };
}

// --------------------------- Token ---------------------------

export interface CoppiaToken {
  accesso: string;
  rinnovo: string;
  scadeFra: number;
  ambito: string;
}

/**
 * Crea accesso e rinnovo di uno stesso collegamento.
 *
 * `sessione` è il filo che li tiene insieme: è quello che l'utente vede in
 * Impostazioni come "una chat collegata", ed è quello che si cancella per
 * staccarla — entrambi i token spariscono insieme.
 */
export async function creaToken(
  userId: string,
  sessione: string,
  ambito: string
): Promise<CoppiaToken> {
  const accesso = segreto();
  const rinnovo = segreto();
  const db = getDb();

  await db.batch([
    db
      .prepare(
        `insert into oauth_token (impronta, user_id, tipo, sessione, ambito, scadenza)
         values (?, ?, 'accesso', ?, ?, datetime('now', '+${ACCESSO_SECONDI} seconds'))`
      )
      .bind(await impronta(accesso), userId, sessione, ambito),
    db
      .prepare(
        `insert into oauth_token (impronta, user_id, tipo, sessione, ambito, scadenza)
         values (?, ?, 'rinnovo', ?, ?, datetime('now', '+${RINNOVO_GIORNI} days'))`
      )
      .bind(await impronta(rinnovo), userId, sessione, ambito),
  ]);

  return { accesso, rinnovo, scadeFra: ACCESSO_SECONDI, ambito };
}

/**
 * Chi è il portatore di questo token d'accesso, se è ancora buono.
 *
 * Aggiorna `ultimo_uso`, che serve a far vedere in Impostazioni quando una
 * chat ha letto l'ultima volta: un collegamento fermo da mesi è il primo
 * candidato da staccare.
 */
export async function utenteDaAccesso(
  token: string
): Promise<{ userId: string; ambito: string } | null> {
  const db = getDb();
  const h = await impronta(token);
  const riga = await db
    .prepare(
      `select t.user_id as user_id, t.ambito as ambito
         from oauth_token t
         join users u on u.id = t.user_id
        where t.impronta = ? and t.tipo = 'accesso'
          and t.scadenza > datetime('now')
          and u.stato = 'attivo'`
    )
    .bind(h)
    .first<{ user_id: string; ambito: string }>();
  if (!riga) return null;

  await db
    .prepare("update oauth_token set ultimo_uso = datetime('now') where impronta = ?")
    .bind(h)
    .run();
  return { userId: riga.user_id, ambito: riga.ambito };
}

/**
 * Usa un token di rinnovo: restituisce una coppia nuova e butta la vecchia.
 *
 * La rotazione non è pignoleria: se un rinnovo viene copiato, il primo dei due
 * che lo usa invalida l'altro, quindi l'uso illecito si trasforma in un
 * collegamento che smette di funzionare — cioè in qualcosa che si nota.
 */
export async function rinnova(token: string): Promise<CoppiaToken | null> {
  const db = getDb();
  const h = await impronta(token);
  const riga = await db
    .prepare(
      `select user_id, sessione, ambito from oauth_token
        where impronta = ? and tipo = 'rinnovo' and scadenza > datetime('now')`
    )
    .bind(h)
    .first<{ user_id: string; sessione: string; ambito: string }>();
  if (!riga) return null;

  await db
    .prepare("delete from oauth_token where sessione = ?")
    .bind(riga.sessione)
    .run();

  // L'ambito si conserva: un rinnovo non è l'occasione per allargare i
  // permessi, quelli si cambiano solo rifacendo il consenso.
  return creaToken(riga.user_id, riga.sessione, riga.ambito);
}

export function nuovaSessione(): string {
  return crypto.randomUUID();
}
