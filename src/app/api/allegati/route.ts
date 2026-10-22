import { NextResponse } from "next/server";
import { getAllegatiKv } from "@/lib/cf";
import { getSessionUser } from "@/lib/auth/session";
import { LIMITE_ALLEGATO_BYTE } from "@/modules/bollette/types";

/**
 * Carica un PDF (bolletta o ricevuta) e restituisce il percorso salvato.
 *
 * PERCHÉ UNA ROUTE E NON PIÙ UNA SERVER ACTION. Il file passava come argomento
 * di una server action, e Next limita il corpo delle server action a 1 MB:
 * una bolletta scansionata o il PDF di molti gestori lo superano, e l'utente
 * vedeva un errore tecnico in inglese. Qui il corpo è il file stesso, senza
 * moduli multipart da decodificare, con un limite scelto da noi e un
 * messaggio in italiano.
 *
 * COSA SI CONTROLLA, LATO SERVER. Che chi carica sia entrato; che la richiesta
 * arrivi da questo sito (una route, a differenza delle server action, non ha
 * il controllo d'origine di Next); la dimensione, prima dall'intestazione e poi
 * sui byte veri; e che sia davvero un PDF, guardando la firma "%PDF-" nei
 * primi byte — il tipo dichiarato dal browser lo decide chi manda il file.
 * Prima nessuna di queste cose si controllava sul server: si salvava qualunque
 * file, con l'estensione che aveva.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return errore("Sessione scaduta: rientra e riprova.", 401);

  const origine = request.headers.get("origin");
  if (origine && origine !== new URL(request.url).origin) {
    return errore("Richiesta non ammessa.", 403);
  }

  const dichiarata = Number(request.headers.get("content-length"));
  if (Number.isFinite(dichiarata) && dichiarata > LIMITE_ALLEGATO_BYTE) {
    return errore(troppoGrande(dichiarata), 413);
  }

  const dati = await request.arrayBuffer();
  if (dati.byteLength === 0) return errore("Il file è vuoto.", 400);
  if (dati.byteLength > LIMITE_ALLEGATO_BYTE) {
    return errore(troppoGrande(dati.byteLength), 413);
  }

  // Lo standard ammette qualche byte prima della firma: la si cerca nel primo
  // kilobyte, non solo all'inizio.
  const testa = String.fromCharCode(...new Uint8Array(dati.slice(0, 1024)));
  if (!testa.includes("%PDF-")) {
    return errore("Il file non è un PDF.", 415);
  }

  const path = `${user.id}/${crypto.randomUUID()}.pdf`;
  await getAllegatiKv().put(path, dati, {
    metadata: { contentType: "application/pdf" },
  });

  return NextResponse.json({ path }, { headers: { "Cache-Control": "no-store" } });
}

function troppoGrande(byte: number): string {
  const mb = (byte / 1024 / 1024).toLocaleString("it-IT", { maximumFractionDigits: 1 });
  const max = LIMITE_ALLEGATO_BYTE / 1024 / 1024;
  return `Il file pesa ${mb} MB: il massimo è ${max} MB.`;
}

function errore(messaggio: string, status: number) {
  return NextResponse.json(
    { error: messaggio },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export const dynamic = "force-dynamic";
