"use server";

import { getDb, getAllegatiKv } from "@/lib/cf";
import { requireSessionUser } from "@/lib/auth/session";
import { type Bolletta, type BollettaInput } from "./types";

export interface BolletteFilters {
  tipo?: string;
  stato?: string;
  divisione?: string;
}

export async function listBollette(
  filters: BolletteFilters = {}
): Promise<Bolletta[]> {
  const user = await requireSessionUser();

  const clauses = ["user_id = ?"];
  const params: unknown[] = [user.id];
  if (filters.tipo) { clauses.push("tipo = ?"); params.push(filters.tipo); }
  if (filters.stato) { clauses.push("stato = ?"); params.push(filters.stato); }
  if (filters.divisione) { clauses.push("divisione = ?"); params.push(filters.divisione); }

  const { results } = await getDb()
    .prepare(
      `select * from bollette where ${clauses.join(" and ")} order by data_scadenza desc`
    )
    .bind(...params)
    .all<Bolletta>();

  return results ?? [];
}

export async function getBolletta(id: string): Promise<Bolletta | null> {
  const user = await requireSessionUser();
  const row = await getDb()
    .prepare("select * from bollette where id = ? and user_id = ?")
    .bind(id, user.id)
    .first<Bolletta>();
  return row ?? null;
}

export async function createBolletta(input: BollettaInput): Promise<Bolletta> {
  const user = await requireSessionUser();
  const id = crypto.randomUUID();

  await getDb()
    .prepare(
      `insert into bollette
        (id, user_id, fornitore, tipo, importo, data_scadenza, stato, data_pagamento,
         periodo_inizio, periodo_fine, divisione, persone_tue, persone_altre,
         note, allegato_path, pagamento_path)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      user.id,
      input.fornitore,
      input.tipo,
      input.importo,
      input.data_scadenza,
      input.stato,
      input.data_pagamento,
      input.periodo_inizio,
      input.periodo_fine,
      input.divisione,
      input.persone_tue,
      input.persone_altre,
      input.note,
      input.allegato_path,
      input.pagamento_path
    )
    .run();

  const created = await getBolletta(id);
  if (!created) throw new Error("Creazione bolletta non riuscita");
  return created;
}

export async function updateBolletta(
  id: string,
  input: Partial<BollettaInput>
): Promise<Bolletta> {
  const user = await requireSessionUser();

  const fields = Object.keys(input);
  if (fields.length > 0) {
    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => (input as Record<string, unknown>)[f]);

    const res = await getDb()
      .prepare(
        `update bollette set ${setClause} where id = ? and user_id = ?`
      )
      .bind(...values, id, user.id)
      .run();

    if (res.meta.changes === 0) throw new Error("Bolletta non trovata");
  }

  const updated = await getBolletta(id);
  if (!updated) throw new Error("Bolletta non trovata");
  return updated;
}

export async function deleteBolletta(id: string): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare("delete from bollette where id = ? and user_id = ?")
    .bind(id, user.id)
    .run();
}

/** Carica un PDF su Workers KV e ritorna il path salvato (prefissato con l'id utente). */
export async function uploadAllegato(file: File): Promise<string> {
  const user = await requireSessionUser();

  const ext = file.name.split(".").pop() || "pdf";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  await getAllegatiKv().put(path, await file.arrayBuffer(), {
    metadata: { contentType: file.type || "application/pdf" },
  });

  return path;
}

/** URL (relativo, protetto da sessione) per aprire/scaricare l'allegato. */
export async function getAllegatoUrl(path: string): Promise<string | null> {
  const user = await requireSessionUser();
  if (!path.startsWith(`${user.id}/`)) return null;
  return `/api/allegati/${path}`;
}

export async function removeAllegato(path: string): Promise<void> {
  const user = await requireSessionUser();
  if (!path.startsWith(`${user.id}/`)) return;
  await getAllegatiKv().delete(path);
}
