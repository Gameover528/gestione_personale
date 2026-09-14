import { NextResponse } from "next/server";
import { getDb, getAllegatiKv } from "@/lib/cf";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Serve la GIF dimostrativa di un esercizio dal nostro dominio.
 *
 * Non si punta direttamente al CDN di ExerciseDB per due motivi: la CSP
 * dell'app consente immagini solo da `self` (e allentarla per un dominio
 * esterno vanificherebbe parte della protezione), e quel CDN appartiene a una
 * societa' che puo' cambiare condizioni quando vuole.
 *
 * La prima apertura di un esercizio scarica la GIF e la mette su KV; da lì in
 * poi non esce piu' nessuna richiesta verso l'esterno per quell'esercizio.
 */

const PREFISSO = "esercizio-gif/";
const SCADENZA_CACHE = 60 * 60 * 24 * 365;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { id } = await params;
  const kv = getAllegatiKv();
  const chiave = `${PREFISSO}${id}`;

  const inCache = await kv.get(chiave, "arrayBuffer");
  if (inCache) {
    return new Response(inCache, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": `private, max-age=${SCADENZA_CACHE}, immutable`,
      },
    });
  }

  // L'URL non arriva dal client ma dal catalogo: nessuno può far scaricare al
  // worker un indirizzo a piacere.
  const riga = await getDb()
    .prepare("select gif_url from esercizi_catalogo where id = ?")
    .bind(id)
    .first<{ gif_url: string | null }>();

  if (!riga?.gif_url) {
    return NextResponse.json({ error: "Non trovata" }, { status: 404 });
  }

  let risposta: Response;
  try {
    risposta = await fetch(riga.gif_url);
  } catch {
    return NextResponse.json({ error: "Sorgente non raggiungibile" }, { status: 502 });
  }
  if (!risposta.ok) {
    return NextResponse.json({ error: "Sorgente non raggiungibile" }, { status: 502 });
  }

  const dati = await risposta.arrayBuffer();
  // Se il salvataggio fallisce l'immagine si mostra lo stesso: la cache è
  // un'ottimizzazione, non una condizione per vedere l'esercizio.
  try {
    await kv.put(chiave, dati);
  } catch {
    // ignorata di proposito
  }

  return new Response(dati, {
    headers: {
      "Content-Type": risposta.headers.get("content-type") || "image/gif",
      "Cache-Control": `private, max-age=${SCADENZA_CACHE}, immutable`,
    },
  });
}

export const dynamic = "force-dynamic";
