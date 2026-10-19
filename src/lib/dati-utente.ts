/**
 * Quali sono "i dati di una persona", letto dal database invece che scritto a
 * mano.
 *
 * Serve a due cose che devono dare la stessa risposta: la sincronizzazione da
 * produzione e il backup. Entrambe avevano il proprio elenco di tabelle, ed
 * entrambi gli elenchi si erano fermati a quando erano stati scritti — la
 * sincronizzazione prima della 0008, il backup ancora prima, senza nemmeno gli
 * abbonamenti. Nessuno dei due falliva: facevano meno di quello che dicevano.
 *
 * La regola qui è una sola: è un dato della persona ogni tabella con
 * `user_id`, salvo quelle elencate in ESCLUSE. Una tabella nuova entra da sola
 * in sync e backup; per tenerla fuori bisogna dirlo.
 */

/**
 * Le tabelle con `user_id` che non sono dati della persona ma il suo accesso.
 * Copiarle o esportarle vorrebbe dire portare in giro sessioni e permessi:
 * un cookie o un token che vale altrove.
 */
export const ESCLUSE = new Set(["sessions", "oauth_codici", "oauth_token"]);

/** Nomi leggibili; una tabella nuova compare col suo nome. */
export const ETICHETTE: Record<string, string> = {
  bollette: "Bollette",
  user_preferences: "Preferenze",
  diario_pasti: "Diario pasti",
  obiettivi_nutrizionali: "Obiettivi nutrizionali",
  piatti: "Piatti",
  piatto_ingredienti: "Ingredienti piatti",
  abbonamenti: "Abbonamenti",
  abbonamento_rate: "Rate abbonamenti",
  allenamenti: "Allenamenti",
  allenamento_serie: "Serie degli allenamenti",
  schede: "Schede",
  scheda_esercizi: "Esercizi delle schede",
  esercizi: "Esercizi personali",
  pesi: "Pesate",
};

export function etichetta(tabella: string): string {
  return ETICHETTE[tabella] ?? tabella;
}

/*
  Le tabelle interne di D1 vanno escluse: il pragma su quelle è negato e
  l'intera query fallirebbe con SQLITE_AUTH. Stesso filtro di
  scripts/stato-migrazioni.mjs.
*/
const FILTRO_TABELLE =
  "m.type = 'table' and substr(m.name, 1, 1) <> '_'" +
  " and m.name not like 'sqlite%' and m.name not like 'd1%'";

/** Tabella -> colonne, nell'ordine in cui sono definite. */
export async function colonneDi(db: D1Database): Promise<Map<string, string[]>> {
  const { results } = await db
    .prepare(
      `select m.name as t, p.name as c from sqlite_master m
         join pragma_table_info(m.name) p
        where ${FILTRO_TABELLE}
        order by m.name, p.cid`
    )
    .all<{ t: string; c: string }>();
  const mappa = new Map<string, string[]>();
  for (const r of results ?? []) {
    if (!mappa.has(r.t)) mappa.set(r.t, []);
    mappa.get(r.t)!.push(r.c);
  }
  return mappa;
}

/** Le tabelle che contengono dati di una persona, con le loro colonne. */
export function tabelleUtente(schema: Map<string, string[]>): Map<string, string[]> {
  return new Map(
    [...schema].filter(
      ([tabella, colonne]) => colonne.includes("user_id") && !ESCLUSE.has(tabella)
    )
  );
}

/** Coppie figlia -> madre delle chiavi esterne. */
export async function dipendenzeDi(db: D1Database): Promise<[string, string][]> {
  const { results } = await db
    .prepare(
      `select m.name as figlia, f."table" as madre from sqlite_master m
         join pragma_foreign_key_list(m.name) f
        where ${FILTRO_TABELLE}`
    )
    .all<{ figlia: string; madre: string }>();
  return (results ?? []).map((r) => [r.figlia, r.madre]);
}

/**
 * Ordina le tabelle in modo che ogni madre venga prima delle sue figlie:
 * piatti prima degli ingredienti, schede prima degli allenamenti che le
 * citano. È l'ordine giusto per inserire; per cancellare si usa al contrario.
 */
export function ordinaPerDipendenze(
  tabelle: string[],
  dipendenze: [string, string][]
): string[] {
  const dentro = new Set(tabelle);
  const madri = new Map<string, Set<string>>(tabelle.map((t) => [t, new Set()]));
  for (const [figlia, madre] of dipendenze) {
    if (figlia !== madre && dentro.has(figlia) && dentro.has(madre)) {
      madri.get(figlia)!.add(madre);
    }
  }

  const ordinate: string[] = [];
  const fatte = new Set<string>();
  // Ordine alfabetico di partenza: lo stesso risultato a ogni esecuzione.
  const restanti = [...tabelle].sort();
  while (restanti.length > 0) {
    const i = restanti.findIndex((t) => [...madri.get(t)!].every((m) => fatte.has(m)));
    // Un ciclo fra chiavi esterne non c'è, ma se mai ci fosse si va avanti
    // invece di bloccarsi: l'inserimento lo segnalerebbe comunque.
    const t = restanti.splice(i >= 0 ? i : 0, 1)[0];
    ordinate.push(t);
    fatte.add(t);
  }
  return ordinate;
}
