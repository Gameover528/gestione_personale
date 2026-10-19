"use server";

import { revalidatePath } from "next/cache";
import { getDb, getDbProd } from "@/lib/cf";
import { requireAdminUser } from "@/lib/auth/session";
import {
  colonneDi,
  dipendenzeDi,
  etichetta,
  ordinaPerDipendenze,
  tabelleUtente,
} from "@/lib/dati-utente";

export interface SyncResult {
  error?: string;
  ok?: boolean;
  riepilogo?: Record<string, number>;
  /** Cose che non si sono potute copiare, con il motivo: di solito una migration mancante su dev. */
  avvisi?: string[];
}

/*
  QUALI TABELLE SI COPIANO: TUTTE QUELLE CON `user_id`, TROVATE DAL DATABASE
  (vedi src/lib/dati-utente.ts, la stessa regola del backup).

  Prima erano un elenco scritto a mano, fermo alle tabelle che esistevano
  quando è stato scritto: allenamenti, serie, schede ed esercizi personali
  (0008-0010) e il registro del peso (0011) non ci sono mai entrati. La
  sincronizzazione finiva senza errori e diceva "Fatto", e su dev mancavano
  undici allenamenti su tredici — con loro le calorie bruciate, che si
  calcolano da allenamenti, serie e peso.
*/

/**
 * Porta su dev i dati del PROPRIO account presi da produzione, senza toccare
 * nient'altro. Riservata al superadmin, funziona solo in ambiente dev (dove
 * esiste il binding DB_PROD).
 *
 * Cancella solo le righe di questo utente (individuato per email, l'id può
 * differire tra prod e dev) e le rimpiazza con quelle di produzione. Gli altri
 * profili di test su dev restano intatti, e non toccando la tabella account la
 * sessione resta valida.
 *
 * Si riscrive solo `user_id`. Gli altri id (chiavi primarie, piatto_id,
 * scheda_id, ...) restano identici: sono UUID, coerenti fra loro, e le righe
 * del richiedente su dev sono già state tolte, quindi non collidono.
 *
 * Non copia gli allegati PDF (restano su Workers KV di produzione): i "path"
 * delle bollette puntano a file che da dev non saranno apribili.
 */
export async function sincronizzaProdSuDevAction(): Promise<SyncResult> {
  const user = await requireAdminUser();
  if (user.ruolo !== "superadmin") {
    return { error: "Questa operazione è riservata al superadmin." };
  }

  const dbProd = getDbProd();
  if (!dbProd) {
    return { error: "Disponibile solo nell'ambiente di sviluppo." };
  }
  const dbDev = getDb();

  // Lo stesso account su prod e su dev si riconosce dall'email, non dall'id.
  const prod = await dbProd
    .prepare("select id, nome from users where email = ?")
    .bind(user.email)
    .first<{ id: string; nome: string | null }>();
  if (!prod) {
    return {
      error: `Nessun account di produzione con l'email ${user.email}: non c'è niente da copiare.`,
    };
  }
  const prodId = prod.id;
  const devId = user.id;

  const [schemaProd, schemaDev, dipProd, dipDev] = await Promise.all([
    colonneDi(dbProd),
    colonneDi(dbDev),
    dipendenzeDi(dbProd),
    dipendenzeDi(dbDev),
  ]);

  /*
    Si copiano solo le colonne che esistono da tutte e due le parti. Se dev è
    indietro di una migration, la copia va avanti con quello che c'è — ma lo
    dice, perché una colonna lasciata indietro è un dato che su dev manca.
  */
  const avvisi: string[] = [];
  const piano: { tabella: string; colonne: string[] }[] = [];
  for (const [tabella, colProd] of tabelleUtente(schemaProd)) {
    const colDev = schemaDev.get(tabella);
    if (!colDev) {
      avvisi.push(`${tabella}: la tabella non esiste su dev, non copiata. Manca una migration.`);
      continue;
    }
    const colonne = colProd.filter((c) => colDev.includes(c));
    const perse = colProd.filter((c) => !colDev.includes(c));
    if (perse.length > 0) {
      avvisi.push(`${tabella}: su dev mancano ${perse.join(", ")}, non copiate. Manca una migration.`);
    }
    piano.push({ tabella, colonne });
  }

  const ordine = ordinaPerDipendenze(
    piano.map((p) => p.tabella),
    [...dipProd, ...dipDev]
  );
  const colonnePer = new Map(piano.map((p) => [p.tabella, p.colonne]));

  // Via i miei dati attuali su dev (solo i miei), dalle figlie alle madri, in
  // un colpo solo: o se ne vanno tutti o nessuno.
  await dbDev.batch(
    [...ordine]
      .reverse()
      .map((t) => dbDev.prepare(`delete from ${t} where user_id = ?`).bind(devId))
  );

  const riepilogo: Record<string, number> = {};
  for (const tabella of ordine) {
    const colonne = colonnePer.get(tabella)!;
    const { results } = await dbProd
      .prepare(`select ${colonne.join(", ")} from ${tabella} where user_id = ?`)
      .bind(prodId)
      .all<Record<string, unknown>>();
    const righe = results ?? [];
    riepilogo[etichetta(tabella)] = righe.length;
    if (righe.length === 0) continue;

    const stmt = dbDev.prepare(
      `insert into ${tabella} (${colonne.join(", ")}) values (${colonne.map(() => "?").join(", ")})`
    );
    // Lotti da 100: ogni chiamata a D1 conta nel limite per richiesta, e con
    // lotti piccoli un utente con un anno di diario lo sfiorerebbe.
    const LOTTO = 100;
    for (let i = 0; i < righe.length; i += LOTTO) {
      await dbDev.batch(
        righe
          .slice(i, i + LOTTO)
          .map((r) =>
            stmt.bind(...colonne.map((c) => (c === "user_id" ? devId : r[c] ?? null)))
          )
      );
    }
  }

  // Il nome del profilo fa parte "del mio profilo": lo allineo a produzione.
  // Email, password, ruolo e stato dell'account su dev restano quelli di dev.
  await dbDev
    .prepare("update users set nome = ? where id = ?")
    .bind(prod.nome, devId)
    .run();

  // Il nome è nella barra laterale e i dati sono in ogni pagina dell'app.
  revalidatePath("/", "layout");
  return { ok: true, riepilogo, avvisi };
}
