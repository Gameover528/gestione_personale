import { NextResponse } from "next/server";
import { getDb } from "@/lib/cf";
import { getSessionUser } from "@/lib/auth/session";
import {
  colonneDi,
  dipendenzeDi,
  etichetta,
  ordinaPerDipendenze,
  tabelleUtente,
} from "@/lib/dati-utente";

/**
 * Il backup dei propri dati: tutte le tabelle con `user_id`, lette dal
 * database (vedi src/lib/dati-utente.ts, la stessa regola della
 * sincronizzazione).
 *
 * Prima l'elenco era scritto qui a mano, ed era fermo a bollette, diario,
 * piatti, obiettivi e preferenze: mancavano abbonamenti e rate, allenamenti,
 * schede, esercizi personali e pesate. Il file si scaricava senza errori e
 * chi lo teneva da parte credeva di avere tutto. Un backup che dimentica
 * qualcosa in silenzio è peggio di nessun backup, perché lo si scopre quando
 * serve.
 *
 * FORMATO 2. Una chiave per tabella, col nome della tabella, nell'ordine in
 * cui andrebbero reinserite (le madri prima delle figlie). `user_id` si toglie:
 * è un identificativo interno, che fuori di qui non vuol dire niente — a dire
 * di chi sono i dati c'è `email`. In testa `contenuto` dice quante righe ci
 * sono di ciascuna cosa, così si vede cosa c'è dentro senza aprire tutto.
 * Rispetto al formato 1 le preferenze si chiamano `user_preferences`.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const db = getDb();
  const [schema, dipendenze] = await Promise.all([colonneDi(db), dipendenzeDi(db)]);
  const tabelle = tabelleUtente(schema);
  const ordine = ordinaPerDipendenze([...tabelle.keys()], dipendenze);

  const risultati = await Promise.all(
    ordine.map(async (tabella) => {
      const colonne = tabelle.get(tabella)!.filter((c) => c !== "user_id");
      const { results } = await db
        .prepare(`select ${colonne.join(", ")} from ${tabella} where user_id = ?`)
        .bind(user.id)
        .all();
      return [tabella, results ?? []] as const;
    })
  );

  const backup = {
    formato: 2,
    esportato_il: new Date().toISOString(),
    email: user.email,
    contenuto: Object.fromEntries(
      risultati.map(([tabella, righe]) => [etichetta(tabella), righe.length])
    ),
    ...Object.fromEntries(risultati),
  };

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="backup-gestione-personale-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
      // Contiene tutti i dati dell'utente: non deve restare in nessuna cache.
      "Cache-Control": "no-store",
    },
  });
}

export const dynamic = "force-dynamic";
