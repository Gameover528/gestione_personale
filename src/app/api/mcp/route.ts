import { NextResponse } from "next/server";
import { getDb } from "@/lib/cf";
import { ATTREZZI } from "@/lib/mcp/attrezzi";
import { ATTREZZI_SCRITTURA } from "@/lib/mcp/scrittura";
import { AMBITO_LETTURA, PERCORSO_MCP, puoScrivere } from "@/lib/oauth/config";
import { utenteDaAccesso } from "@/lib/oauth/token";

/**
 * Il punto da cui una chat parla con l'app: un server MCP, per ora di sola
 * lettura e **solo in locale**.
 *
 * NON È PUBBLICABILE COSÌ. Non c'è nessuna autenticazione: chi raggiunge
 * questo indirizzo legge il diario e il peso di un utente. Per questo ci sono
 * due lucchetti indipendenti, e tutti e due vanno aperti a mano:
 *
 *   1. `MCP_LOCALE` deve valere "1". Sta in `.dev.vars`, che è escluso da git
 *      e che wrangler legge solo in locale: perché esista su un Worker
 *      pubblicato qualcuno dovrebbe aggiungerlo apposta a wrangler.jsonc.
 *   2. `MCP_UTENTE` deve contenere l'email dell'utente di cui leggere. Senza,
 *      non c'è nessuno da leggere e si risponde picche.
 *
 * Quando si deciderà come autenticare (token personale o Cloudflare Access),
 * questi due spariscono e al loro posto arriva l'utente vero. Gli attrezzi in
 * `lib/mcp/attrezzi.ts` non cambiano.
 *
 * Il trasporto è "Streamable HTTP" ridotto all'osso: si risponde a una POST
 * con un oggetto JSON solo, che la specifica consente esplicitamente, e non si
 * apre nessun flusso SSE. Niente sessioni: ogni chiamata si regge da sé.
 */

/** Versioni del protocollo che sappiamo parlare. */
const VERSIONI = ["2025-06-18", "2025-03-26", "2024-11-05"];
const VERSIONE_PREDEFINITA = "2025-06-18";

const NOME_SERVER = "gestione-personale";
const VERSIONE_SERVER = "0.1.0";

interface Messaggio {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function risposta(id: string | number | null | undefined, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function errore(
  id: string | number | null | undefined,
  code: number,
  message: string
) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

/**
 * La scorciatoia per lo sviluppo: niente autenticazione, utente fisso.
 *
 * Resta perché provare il protocollo senza dover ogni volta rifare il giro del
 * consenso fa risparmiare tempo. Vive solo in .dev.vars, che un Worker
 * pubblicato non ha.
 */
function scorciatoiaLocale(): boolean {
  return process.env.MCP_LOCALE === "1" && !!process.env.MCP_UTENTE;
}

/**
 * Chi sta chiamando.
 *
 * In produzione lo dice il token: niente token, niente risposta. Il 401 non è
 * un errore qualunque — è l'inizio del giro di autorizzazione, e deve portare
 * con sé l'indicazione di dove autenticarsi, altrimenti il client non sa da
 * dove cominciare.
 */
async function chiChiama(
  req: Request
): Promise<{ userId: string; ambito: string } | { rifiuto: NextResponse }> {
  const intestazione = req.headers.get("authorization") ?? "";
  const token = intestazione.toLowerCase().startsWith("bearer ")
    ? intestazione.slice(7).trim()
    : "";

  if (token) {
    const chi = await utenteDaAccesso(token);
    if (chi) return chi;
  }

  if (scorciatoiaLocale()) {
    const userId = await utenteConfigurato();
    // La scorciatoia di sviluppo da' tutto: serve a provare, non a proteggere.
    if (userId) return { userId, ambito: "lettura scrittura" };
  }

  const base = new URL(req.url).origin;
  return {
    rifiuto: new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource${PERCORSO_MCP}"`,
      },
    }),
  };
}

/**
 * La specifica obbliga a controllare `Origin`: senza, una pagina web
 * qualunque aperta nel browser potrebbe parlare con il server locale e
 * portarsi via i dati (DNS rebinding). Una chat non manda `Origin`, un sito
 * sì — e qui nessun sito è ammesso.
 */
function origineAmmessa(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return false;
  }
}

async function utenteConfigurato(): Promise<string | null> {
  const email = (process.env.MCP_UTENTE || "").trim().toLowerCase();
  if (!email) return null;
  const row = await getDb()
    .prepare("select id from users where email = ? and stato = 'attivo'")
    .bind(email)
    .first<{ id: string }>();
  return row?.id ?? null;
}

export async function POST(req: Request) {
  if (!origineAmmessa(req)) {
    return new NextResponse("Origine non ammessa", { status: 403 });
  }

  // Versione del protocollo: assente significa client vecchio, presente ma
  // sconosciuta significa che non ci capiremmo, e la specifica dice 400.
  const versione = req.headers.get("mcp-protocol-version");
  if (versione && !VERSIONI.includes(versione)) {
    return new NextResponse(`Versione del protocollo non supportata: ${versione}`, {
      status: 400,
    });
  }

  /*
    Le credenziali servono per TUTTO l'endpoint, non solo per le chiamate che
    leggono dati.

    All'inizio avevo lasciato passare initialize, ping e tools/list ragionando
    che non toccano niente. Ragionamento sbagliato, e il difetto non si vedeva
    in locale: e' il 401 della prima richiesta che dice al client "qui ci si
    autentica". Vedendo 200, Claude concludeva che il server fosse aperto, non
    mostrava mai la pagina del consenso, e poi le letture fallivano una per
    una. Collegato all'apparenza, inutile nei fatti.
  */
  const chi = await chiChiama(req);
  if ("rifiuto" in chi) return chi.rifiuto;
  const userId = chi.userId;

  /*
    Gli attrezzi disponibili dipendono dal permesso concesso. Chi ha collegato
    la chat quando c'era solo la lettura non vede nemmeno quelli che scrivono:
    meglio che non esistano, piuttosto che offrirli e poi rifiutarli — un
    attrezzo che compare e non funziona fa provare e riprovare.
  */
  const disponibili = puoScrivere(chi.ambito)
    ? [...ATTREZZI, ...ATTREZZI_SCRITTURA]
    : ATTREZZI;

  let msg: Messaggio;
  try {
    msg = (await req.json()) as Messaggio;
  } catch {
    return errore(null, -32700, "JSON non valido");
  }

  // Notifiche e risposte non hanno id e non vogliono risposta: 202 e basta.
  // `notifications/initialized` arriva sempre, subito dopo l'avvio.
  if (msg.id === undefined || msg.id === null) {
    return new NextResponse(null, { status: 202 });
  }

  const params = msg.params ?? {};

  switch (msg.method) {
    case "initialize": {
      // Si risponde con la versione chiesta dal client se la conosciamo,
      // altrimenti con la nostra: è la negoziazione prevista dalla specifica.
      const chiesta = String(params.protocolVersion ?? "");
      return risposta(msg.id, {
        protocolVersion: VERSIONI.includes(chiesta) ? chiesta : VERSIONE_PREDEFINITA,
        // `listChanged: false`: l'elenco degli attrezzi è nel codice e non
        // cambia mentre il server gira, quindi non promettiamo notifiche.
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: NOME_SERVER, version: VERSIONE_SERVER },
        instructions:
          "Dati personali di salute: diario alimentare e registro del peso. Sola lettura.",
      });
    }

    case "ping":
      return risposta(msg.id, {});

    case "tools/list":
      return risposta(msg.id, {
        tools: disponibili.map((a) => ({
          name: a.nome,
          title: a.titolo,
          description: a.descrizione,
          inputSchema: a.schema,
          /*
            Dire la verità su cosa fa un attrezzo serve al client per decidere
            se chiedere conferma: una lettura può passare liscia, una scrittura
            no. Mentire qui per far scorrere le cose sarebbe il modo più
            efficace di togliere la persona dal giro.
          */
          annotations: {
            readOnlyHint: !a.scrive,
            destructiveHint: a.nome === "annulla_aggiunta",
            openWorldHint: false,
          },
        })),
      });

    case "tools/call": {
      const nome = String(params.name ?? "");
      const attrezzo = disponibili.find((a) => a.nome === nome);
      if (!attrezzo) {
        // Se esiste ma non è concesso, lo si dice: altrimenti chi collega la
        // chat non capisce che deve rifare il consenso.
        const esisteMaNonConcesso = ATTREZZI_SCRITTURA.some((x) => x.nome === nome);
        return errore(
          msg.id,
          -32602,
          esisteMaNonConcesso
            ? `"${nome}" richiede il permesso di scrittura: questo collegamento ha solo la lettura. Va rifatto, chiedendo anche "scrittura".`
            : `Attrezzo sconosciuto: ${nome}`
        );
      }


      const argomenti = (params.arguments ?? {}) as Record<string, unknown>;
      try {
        const { testo, dati } = await attrezzo.esegui(userId, argomenti);
        return risposta(msg.id, {
          content: [{ type: "text", text: testo }],
          structuredContent: dati,
          isError: false,
        });
      } catch (e) {
        // Un guasto dell'attrezzo si racconta dentro il risultato, non come
        // errore di protocollo: così il modello lo legge e può dirlo, invece
        // di vedersi cadere la connessione.
        return risposta(msg.id, {
          content: [
            {
              type: "text",
              text: `Non ha funzionato: ${e instanceof Error ? e.message : "errore sconosciuto"}`,
            },
          ],
          isError: true,
        });
      }
    }

    default:
      return errore(msg.id, -32601, `Metodo non gestito: ${msg.method}`);
  }
}

/**
 * La specifica prevede che il client possa aprire un flusso SSE con una GET.
 * Noi non ne abbiamo bisogno — non mandiamo mai niente di nostra iniziativa —
 * e in quel caso la risposta giusta è 405, non un errore.
 */
export async function GET() {
  return new NextResponse(null, { status: 405 });
}

/** Nessuna sessione da chiudere: anche qui 405 è la risposta prevista. */
export async function DELETE() {
  return new NextResponse(null, { status: 405 });
}
