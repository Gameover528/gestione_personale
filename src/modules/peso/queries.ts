"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/cf";
import { requireSessionUser } from "@/lib/auth/session";
import type { Pesata } from "./types";

/**
 * Le pagine da rinfrescare dopo una pesata.
 *
 * Non solo /peso: il peso entra nella stima delle calorie bruciate degli
 * allenamenti e nel calcolo degli obiettivi, quindi una pesata nuova cambia
 * numeri che si leggono altrove.
 */
function invalidaPeso() {
  revalidatePath("/peso", "layout");
  revalidatePath("/esercizio", "layout");
  revalidatePath("/alimentazione", "layout");
}

interface RigaPeso {
  id: string;
  data: string;
  peso_kg: number;
  nota: string | null;
}

function daRiga(r: RigaPeso): Pesata {
  return {
    id: r.id,
    data: r.data,
    peso_kg: Number(r.peso_kg),
    nota: r.nota,
  };
}

/**
 * Tutte le pesate, dalla più vecchia alla più recente.
 *
 * L'ordine cronologico è quello che serve sia al grafico sia alla ricerca
 * della pesata più vicina a una data; l'elenco a schermo, che le vuole al
 * contrario, le gira da sé — sono poche righe, non vale una seconda query.
 */
export async function listPesate(): Promise<Pesata[]> {
  const user = await requireSessionUser();
  const { results } = await getDb()
    .prepare(
      "select id, data, peso_kg, nota from pesi where user_id = ? order by data asc"
    )
    .bind(user.id)
    .all<RigaPeso>();
  return (results ?? []).map(daRiga);
}

/** L'ultima pesata registrata, per chi vuole solo "quanto peso adesso". */
export async function ultimaPesata(): Promise<Pesata | null> {
  const user = await requireSessionUser();
  const row = await getDb()
    .prepare(
      "select id, data, peso_kg, nota from pesi where user_id = ? order by data desc limit 1"
    )
    .bind(user.id)
    .first<RigaPeso>();
  return row ? daRiga(row) : null;
}

export interface PesataInput {
  data: string;
  peso_kg: number;
  nota: string | null;
}

/**
 * Registra una pesata. Se quel giorno ce n'è già una, la sostituisce.
 *
 * Non è una scorciatoia: una pesata al giorno è la regola della tabella, e chi
 * inserisce di nuovo lo stesso giorno quasi sempre sta correggendo un numero
 * sbagliato. Fargli prima cancellare la riga vecchia sarebbe un passaggio in
 * più per ottenere la stessa cosa.
 */
export async function salvaPesata(input: PesataInput): Promise<string> {
  const user = await requireSessionUser();
  const id = crypto.randomUUID();
  await getDb()
    .prepare(
      `insert into pesi (id, user_id, data, peso_kg, nota)
       values (?, ?, ?, ?, ?)
       on conflict (user_id, data) do update
         set peso_kg = excluded.peso_kg, nota = excluded.nota`
    )
    .bind(id, user.id, input.data, input.peso_kg, input.nota)
    .run();
  invalidaPeso();
  return id;
}

export async function eliminaPesata(id: string): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare("delete from pesi where id = ? and user_id = ?")
    .bind(id, user.id)
    .run();
  invalidaPeso();
}

/**
 * Rimette una pesata cancellata, con lo stesso id: è l'annulla del messaggio
 * che compare dopo la cancellazione.
 */
export async function ripristinaPesata(p: Pesata): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare(
      `insert into pesi (id, user_id, data, peso_kg, nota)
       values (?, ?, ?, ?, ?)
       on conflict (user_id, data) do update
         set peso_kg = excluded.peso_kg, nota = excluded.nota`
    )
    .bind(p.id, user.id, p.data, p.peso_kg, p.nota)
    .run();
  invalidaPeso();
}
