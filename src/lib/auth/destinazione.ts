/**
 * Dove tornare dopo il login, se ci si può fidare.
 *
 * PERCHÉ ESISTE. Chi arrivava a una pagina senza sessione veniva mandato al
 * login, e dopo il login sempre sulla dashboard: la pagina che voleva aprire
 * era persa. Per una pagina qualunque è una seccatura, per il collegamento di
 * una chat era un vicolo cieco — claude.ai apre /oauth/authorize, quasi
 * sempre da un browser senza sessione, e dopo il login il consenso spariva.
 *
 * PERCHÉ COSÌ STRETTO. Un "torna a" preso dall'indirizzo è il modo classico di
 * far rimbalzare qualcuno su un altro sito dopo un login vero («open
 * redirect»): basta un link con ?next=https://sito-finto. Quindi si accetta
 * solo un percorso di questo sito: comincia con una sola "/", nessuna "\"
 * (i browser la trattano come "/" e "/\sito" diventerebbe "//sito"), nessun
 * carattere di controllo, e risolto contro un'origine qualunque deve restare
 * su quell'origine. Le pagine di accesso stesse sono escluse: tornare al login
 * dopo il login è un giro a vuoto.
 *
 * Vive in un file suo, senza dipendenze, perché serve in tre posti diversi:
 * middleware, pagina di login (client) e azione di login (server).
 */
export function destinazioneSicura(valore: string | null | undefined): string | null {
  if (!valore || valore.length > 2000) return null;
  if (!valore.startsWith("/") || valore.startsWith("//")) return null;
  if (valore.includes("\\") || /[\u0000-\u001f\u007f]/.test(valore)) return null;

  let url: URL;
  try {
    url = new URL(valore, "https://interno.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://interno.invalid") return null;

  /*
    Il controllo su "//" va rifatto DOPO la normalizzazione, non solo prima.
    Il parser toglie i segmenti "." e "..": "/.//evil.com", "/a/..//evil.com"
    e "/%2e//evil.com" superano il controllo sulla stringa grezza, restano
    sulla nostra origine mentre sono relativi a quella fittizia, e ne escono
    come "//evil.com" — che restituito così diventa https://evil.com. Trovato
    da una revisione indipendente, dopo che i casi di prova scritti da chi
    aveva scritto il codice passavano tutti.
  */
  const percorso = url.pathname;
  if (percorso.startsWith("//")) return null;
  if (
    percorso === "/" ||
    percorso.startsWith("/login") ||
    percorso.startsWith("/registrati") ||
    percorso.startsWith("/auth") ||
    percorso.startsWith("/in-attesa")
  ) {
    return null;
  }

  // Ultima prova sul valore che esce davvero: deve restare un percorso di
  // questo sito anche risolto di nuovo. Costa niente e chiude i casi che non
  // abbiamo immaginato.
  const risultato = percorso + url.search + url.hash;
  if (
    risultato.startsWith("//") ||
    new URL(risultato, "https://interno.invalid").origin !== "https://interno.invalid"
  ) {
    return null;
  }
  return risultato;
}
