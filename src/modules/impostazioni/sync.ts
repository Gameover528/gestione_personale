"use server";

import { getDb, getDbProd } from "@/lib/cf";
import { requireAdminUser } from "@/lib/auth/session";

export interface SyncResult {
  error?: string;
  ok?: boolean;
  riepilogo?: Record<string, number>;
}

/** Copia tutte le righe di una tabella dal DB prod al DB dev, a lotti (D1 ha un limite di dimensione per batch). */
async function copiaTabella(
  dbProd: D1Database,
  dbDev: D1Database,
  tabella: string,
  colonne: string[]
): Promise<number> {
  const { results } = await dbProd
    .prepare(`select ${colonne.join(", ")} from ${tabella}`)
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
      fetta.map((r) => stmt.bind(...colonne.map((c) => r[c] ?? null)))
    );
  }
  return righe.length;
}

/**
 * Sostituisce tutti i dati del database di sviluppo con una copia fresca di
 * quelli di produzione. Riservata al superadmin, funziona solo in ambiente
 * dev (dove esiste il binding DB_PROD).
 *
 * Cancella prima tutto da "users": per come sono definite le foreign key
 * (on delete cascade) questo ripulisce automaticamente anche sessioni,
 * bollette, abbonamenti/rate, diario, obiettivi, piatti/ingredienti e
 * preferenze. Le sessioni attive su dev (compresa quella di chi lancia la
 * sincronizzazione) vengono quindi invalidate: serve rifare login con le
 * credenziali di produzione dopo l'operazione.
 *
 * Non copia gli allegati PDF (restano su Workers KV, non toccati da qui):
 * i "path" copiati dalle bollette prod puntano a file che esistono solo
 * nel KV di produzione, quindi dopo la sincronizzazione non saranno apribili
 * da dev.
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

  await dbDev.prepare("delete from users").run();

  const riepilogo: Record<string, number> = {};
  riepilogo["Utenti"] = await copiaTabella(dbProd, dbDev, "users", [
    "id", "email", "password_hash", "created_at", "ruolo", "stato",
  ]);
  riepilogo["Bollette"] = await copiaTabella(dbProd, dbDev, "bollette", [
    "id", "user_id", "fornitore", "tipo", "importo", "data_scadenza", "stato",
    "data_pagamento", "note", "allegato_path", "pagamento_path", "divisione",
    "persone_tue", "persone_altre", "periodo_inizio", "periodo_fine", "created_at",
  ]);
  riepilogo["Preferenze"] = await copiaTabella(dbProd, dbDev, "user_preferences", [
    "user_id", "key", "value", "updated_at",
  ]);
  riepilogo["Diario pasti"] = await copiaTabella(dbProd, dbDev, "diario_pasti", [
    "id", "user_id", "data", "pasto", "nome_alimento", "marca", "quantita_g",
    "porzione_nome", "porzione_g",
    "kcal_100", "proteine_100", "carboidrati_100", "grassi_100", "fibre_100",
    "zuccheri_100", "sale_100", "fonte", "created_at",
  ]);
  riepilogo["Obiettivi nutrizionali"] = await copiaTabella(dbProd, dbDev, "obiettivi_nutrizionali", [
    "user_id", "nutriente", "valore", "tipo",
  ]);
  riepilogo["Piatti"] = await copiaTabella(dbProd, dbDev, "piatti", [
    "id", "user_id", "nome", "marca", "tipo", "porzione_nome", "porzione_g",
    "kcal_100", "proteine_100", "carboidrati_100", "grassi_100", "fibre_100",
    "zuccheri_100", "sale_100", "created_at",
  ]);
  riepilogo["Ingredienti piatti"] = await copiaTabella(dbProd, dbDev, "piatto_ingredienti", [
    "id", "piatto_id", "user_id", "nome_alimento", "marca", "quantita_g",
    "kcal_100", "proteine_100", "carboidrati_100", "grassi_100", "fibre_100",
    "zuccheri_100", "sale_100", "fonte",
  ]);
  riepilogo["Abbonamenti"] = await copiaTabella(dbProd, dbDev, "abbonamenti", [
    "id", "user_id", "nome", "importo", "frequenza", "data_inizio", "stato",
    "data_ripresa", "note", "created_at",
  ]);
  riepilogo["Rate abbonamenti"] = await copiaTabella(dbProd, dbDev, "abbonamento_rate", [
    "id", "abbonamento_id", "user_id", "data_scadenza", "importo", "stato",
    "data_pagamento", "created_at",
  ]);

  return { ok: true, riepilogo };
}
