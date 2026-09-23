/**
 * Turnstile: il controllo anti-bot di Cloudflare davanti alla registrazione.
 *
 * Serve perché la registrazione è l'unica porta aperta dell'app: senza, un
 * programma automatico può creare account a raffica: non entrerebbe (serve
 * comunque l'approvazione) ma riempirebbe la tabella e la pagina degli utenti
 * di richieste finte, che è esattamente il lavoro che si vuole evitare.
 *
 * Non è un CAPTCHA da risolvere: nella quasi totalità dei casi chi si registra
 * non vede niente e non clicca niente.
 *
 * DUE CHIAVI, UNA PUBBLICA E UNA NO. La chiave del sito finisce nell'HTML ed è
 * pubblica per costruzione; il segreto sta fra i segreti del Worker e non esce
 * mai di lì. Senza segreto configurato si usano le chiavi di prova pubblicate
 * da Cloudflare, che accettano tutto: va bene in locale, non in produzione —
 * per questo `turnstileConfigurato()` permette di dirlo a chi amministra.
 */

/** Chiavi di prova di Cloudflare: accettano qualunque token. Solo per lo sviluppo. */
const SITEKEY_PROVA = "1x00000000000000000000AA";
const SEGRETO_PROVA = "1x0000000000000000000000000000000AA";

const VERIFICA =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** La chiave pubblica da mettere nel widget. */
export function turnstileSitekey(): string {
  return process.env.TURNSTILE_SITEKEY || SITEKEY_PROVA;
}

/** Vero quando ci sono chiavi vere: in produzione, se è falso, il filtro non filtra. */
export function turnstileConfigurato(): boolean {
  return !!process.env.TURNSTILE_SITEKEY && !!process.env.TURNSTILE_SECRET;
}

/**
 * Chiede a Cloudflare se il token è buono.
 *
 * In caso di errore di rete risponde `false`, cioè blocca. È l'opposto della
 * scelta fatta per il freno ai tentativi di accesso, che in caso di guasto
 * lascia passare: lì un guasto avrebbe chiuso fuori gli utenti veri, qui al
 * massimo rimanda di un minuto una registrazione. Quando si sbaglia, si
 * sbaglia dalla parte che costa meno.
 */
export async function verificaTurnstile(
  token: string,
  ip: string | null
): Promise<boolean> {
  if (!token) return false;

  const corpo = new FormData();
  corpo.append("secret", process.env.TURNSTILE_SECRET || SEGRETO_PROVA);
  corpo.append("response", token);
  if (ip) corpo.append("remoteip", ip);

  try {
    const res = await fetch(VERIFICA, { method: "POST", body: corpo });
    if (!res.ok) return false;
    const esito = (await res.json()) as { success?: boolean };
    return esito.success === true;
  } catch {
    return false;
  }
}
