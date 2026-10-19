"use server";

import { revalidatePath } from "next/cache";
import { getDb, getDbProd } from "@/lib/cf";
import { requireAdminUser } from "@/lib/auth/session";

export interface SyncResult {
  error?: string;
  ok?: boolean;
  riepilogo?: Record<string, number>;
  /** Cose che non si sono potute copiare, con il motivo: di solito una migration mancante su dev. */
  avvisi?: string[];
}

/*
  QUALI TABELLE SI COPIANO: TUTTE QUELLE CON `user_id`, TROVATE DAL DATABASE.

  Prima erano un elenco scritto a mano, e l'elenco si è fermato alle tabelle
  che esistevano quando è stato scritto: allenamenti, serie, schede ed esercizi
  personali (0008-0010) e il registro del peso (0011) non ci sono mai entrati.
  La sincronizzazione finiva senza errori e dichiarava "Fatto", e su dev
  mancavano tredici allenamenti su quindici — con loro le calorie bruciate, che
  si calcolano da allenamenti, serie e peso.

  Un elenco da aggiornare a ogni migration è un elenco che resta indietro. Così
  invece una tabella nuova si copia da sola, e si esclude a mano solo quello
  che non va copiato: l'errore possibile diventa "copiato qualcosa in più" su
  dev, che di produzione legge già tutto, invece di "perso qualcosa in
  silenzio".
*/

/**
 * Le tabelle con `user_id` che NON sono dati della persona ma il suo accesso.
 * Copiarle vorrebbe dire portare su dev sessioni e permessi di produzione: un
 * cookie o un token di produzione varrebbero anche lì.
 */
const ESCLUSE = new Set(["sessions", "oauth_codici", "oauth_token"]);

/** Nomi leggibili per il riepilogo; una tabella nuova compare col suo nome. */
const ETICHETTE: Record<string, string> = {
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

/*
  Le tabelle interne di D1 vanno escluse: il pragma su quelle è negato e
  l'intera query fallirebbe con SQLITE_AUTH. Stesso filtro di
  scripts/stato-migrazioni.mjs.
*/
const FILTRO_TABELLE =
  "m.type = 'table' and substr(m.name, 1, 1) <> '_'" +
  " and m.name not like 'sqlite%' and m.name not like 'd1%'";

/** Tabella -> colonne, letto dal database stesso. */
async function colonneDi(db: D1Database): Promise<Map<string, string[]>> {
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

/** Coppie figlia -> madre delle chiavi esterne. */
async function dipendenzeDi(db: D1Database): Promise<[string, string][]> {
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
 *
 * Con l'elenco a mano l'ordine era scritto a mano anch'esso, ed era il secondo
 * modo di sbagliare a ogni tabella nuova.
 */
function ordinaPerDipendenze(
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
  for (const [tabella, colProd] of schemaProd) {
    if (!colProd.includes("user_id") || ESCLUSE.has(tabella)) continue;
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
    riepilogo[ETICHETTE[tabella] ?? tabella] = righe.length;
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
