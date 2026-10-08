import { NextResponse } from "next/server";
import { AMBITI, PERCORSO_MCP } from "@/lib/oauth/config";

/**
 * «Questa risorsa è protetta, e si entra da lì.»
 *
 * È il primo documento che Claude cerca dopo aver ricevuto un 401. Dice due
 * cose: qual è esattamente la risorsa, e chi rilascia i permessi per entrarci.
 *
 * Il percorso è un catch-all perché i client lo cercano in due posti: prima
 * sotto il percorso della risorsa (`/.well-known/oauth-protected-resource/api/mcp`)
 * e poi nudo. Rispondere a entrambi costa un file solo invece di due.
 *
 * `resource` deve coincidere **carattere per carattere** con l'indirizzo del
 * server MCP, percorso compreso. Non è formalismo: è il legame che impedisce di
 * farsi dare un token per un server e spenderlo su un altro.
 */
export async function GET(req: Request) {
  const base = new URL(req.url).origin;
  return NextResponse.json(
    {
      resource: `${base}${PERCORSO_MCP}`,
      authorization_servers: [base],
      scopes_supported: AMBITI,
      bearer_methods_supported: ["header"],
    },
    {
      headers: {
        // Pubblico e stabile: si può mettere in cache senza pensarci.
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
