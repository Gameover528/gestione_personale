"use server";

import { revalidatePath } from "next/cache";
import { getDb, getDbProd } from "@/lib/cf";
import { requireAdminUser } from "@/lib/auth/session";

export interface SyncResult {
  error?: string;
  ok?: boolean;
  riepilogo?: Record<string, number>;
}

/**
 * Tabelle dei dati di un utente, ciascuna con le sue colonne. Tutte hanno una
 * colonna `user_id`: è quella su cui si filtra per prendere/cancellare solo le
 * righe di una persona, ed è quella che va rimappata quando si copiano i dati
 * da un ambiente all'altro (l'id dello stesso utente su prod e su dev può
 * essere diverso, visto che i due account non vengono più uniti).
 */
const TABELLE: { nome: string; etichetta: string; colonne: string[] }[] = [
  {
    nome: "bollette",
    etichetta: "Bollette",
    colonne: [
      "id", "user_id", "fornitore", "tipo", "importo", "data_scadenza", "stato",
      "data_pagamento", "note", "allegato_path", "pagamento_path", "divisione",
      "persone_tue", "persone_altre", "periodo_inizio", "periodo_fine", "created_at",
    ],
  },
  {
    nome: "user_preferences",
    etichetta: "Preferenze",
    colonne: ["user_id", "key", "value", "updated_at"],
  },
  {
    nome: "diario_pasti",
    etichetta: "Diario pasti",
    colonne: [
      "id", "user_id", "data", "pasto", "nome_alimento", "marca", "quantita_g",
      "porzione_nome", "porzione_g",
      "kcal_100", "proteine_100", "carboidrati_100", "grassi_100", "fibre_100",
      "zuccheri_100", "sale_100", "fonte", "created_at",
    ],
  },
  {
    nome: "obiettivi_nutrizionali",
    etichetta: "Obiettivi nutrizionali",
    colonne: ["user_id", "nutriente", "valore", "tipo"],
  },
  {
    nome: "piatti",
    etichetta: "Piatti",
    colonne: [
      "id", "user_id", "nome", "marca", "tipo", "porzione_nome", "porzione_g",
      "kcal_100", "proteine_100", "carboidrati_100", "grassi_100", "fibre_100",
      "zuccheri_100", "sale_100", "created_at",
    ],
  },
  {
    nome: "piatto_ingredienti",
    etichetta: "Ingredienti piatti",
    colonne: [
      "id", "piatto_id", "user_id", "nome_alimento", "marca", "quantita_g",
      "kcal_100", "proteine_100", "carboidrati_100", "grassi_100", "fibre_100",
      "zuccheri_100", "sale_100", "fonte",
    ],
  },
  {
    nome: "abbonamenti",
    etichetta: "Abbonamenti",
    colonne: [
      "id", "user_id", "nome", "importo", "frequenza", "data_inizio", "stato",
      "data_ripresa", "note", "created_at",
    ],
  },
  {
    nome: "abbonamento_rate",
    etichetta: "Rate abbonamenti",
    colonne: [
      "id", "abbonamento_id", "user_id", "data_scadenza", "importo", "stato",
      "data_pagamento", "created_at",
    ],
  },
];

/**
 * Ordine in cui cancellare le righe dell'utente su dev: prima le tabelle
 * "figlie" (ingredienti, rate) poi le altre, così non si dipende dal cascade.
 * Tutte le tabelle hanno `user_id`, quindi si cancella filtrando su quello: si
 * toccano solo le righe di questo utente, mai quelle degli altri profili.
 */
const ORDINE_CANCELLAZIONE = [
  "piatto_ingredienti",
  "abbonamento_rate",
  "bollette",
  "diario_pasti",
  "obiettivi_nutrizionali",
  "user_preferences",
  "piatti",
  "abbonamenti",
];

/**
 * Copia in dev le righe di UNA tabella appartenenti a un utente di produzione,
 * riscrivendo `user_id` con l'id che lo stesso utente ha su dev. Gli altri id
 * (chiave primaria, piatto_id, abbonamento_id) restano identici: sono UUID e
 * restano coerenti tra loro, e le righe del richiedente su dev sono già state
 * rimosse, quindi non ci sono collisioni.
 */
async function copiaDatiUtente(
  dbProd: D1Database,
  dbDev: D1Database,
  tabella: string,
  colonne: string[],
  prodId: string,
  devId: string
): Promise<number> {
  const { results } = await dbProd
    .prepare(`select ${colonne.join(", ")} from ${tabella} where user_id = ?`)
    .bind(prodId)
    .all<Record<string, unknown>>();
  const righe = results ?? [];
  if (righe.length === 0) return 0;

  const placeholders = colonne.map(() => "?").join(", ");
  const stmt = dbDev.prepare(
    `insert into ${tabella} (${colonne.join(", ")}) values (${placeholders})`
  );

  const LOTTO = 50;
  for (let i = 0; i < righe.length; i += LOTTO) {
    const fetta = righe.slice(i, i + LOTTO);
    await dbDev.batch(
      fetta.map((r) =>
        stmt.bind(
          ...colonne.map((c) => (c === "user_id" ? devId : r[c] ?? null))
        )
      )
    );
  }
  return righe.length;
}

/**
 * Porta su dev i dati del PROPRIO account presi da produzione, senza toccare
 * nient'altro. Riservata al superadmin, funziona solo in ambiente dev (dove
 * esiste il binding DB_PROD).
 *
 * A differenza di prima non svuota più l'intero ambiente: cancella solo le
 * righe di questo utente (individuato per email, l'id può differire tra prod e
 * dev) e le rimpiazza con quelle di produzione. Tutti gli altri profili di test
 * presenti su dev restano intatti, e non toccando la tabella account la
 * sessione resta valida — niente più login da rifare.
 *
 * Non copia gli allegati PDF (restano su Workers KV di produzione): i "path"
 * copiati dalle bollette puntano a file che esistono solo nel KV di prod,
 * quindi da dev non saranno apribili.
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

  // Via i miei dati attuali su dev (solo i miei), poi copio quelli di prod.
  for (const tabella of ORDINE_CANCELLAZIONE) {
    await dbDev
      .prepare(`delete from ${tabella} where user_id = ?`)
      .bind(devId)
      .run();
  }

  const riepilogo: Record<string, number> = {};
  for (const { nome, etichetta, colonne } of TABELLE) {
    riepilogo[etichetta] = await copiaDatiUtente(
      dbProd,
      dbDev,
      nome,
      colonne,
      prodId,
      devId
    );
  }

  // Il nome del profilo fa parte "del mio profilo": lo allineo a produzione.
  // Email, password, ruolo e stato dell'account su dev restano quelli di dev.
  await dbDev
    .prepare("update users set nome = ? where id = ?")
    .bind(prod.nome, devId)
    .run();

  // Il nome è nella barra laterale e i dati sono in ogni pagina dell'app.
  revalidatePath("/", "layout");
  return { ok: true, riepilogo };
}
