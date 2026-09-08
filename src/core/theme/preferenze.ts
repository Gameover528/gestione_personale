"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/cf";
import { getSessionUser, requireSessionUser } from "@/lib/auth/session";
import {
  ASPETTO_DEFAULT,
  coloreValido,
  temaValido,
  type Aspetto,
  type Tema,
} from "./tipi";

/**
 * Aspetto scelto dall'utente, salvato tra le preferenze (chiave "aspetto") e
 * quindi valido su tutti i dispositivi, non solo nel browser in cui è stato
 * impostato.
 */
const CHIAVE = "aspetto";

/** Aspetto dell'utente corrente; il default se non ha scelto o non è autenticato. */
export async function getAspetto(): Promise<Aspetto> {
  const user = await getSessionUser();
  if (!user) return ASPETTO_DEFAULT;

  const row = await getDb()
    .prepare("select value from user_preferences where user_id = ? and key = ?")
    .bind(user.id, CHIAVE)
    .first<{ value: string }>();
  if (!row) return ASPETTO_DEFAULT;

  try {
    const salvato = JSON.parse(row.value) as Partial<Aspetto>;
    return {
      tema: temaValido(salvato.tema) ? salvato.tema : ASPETTO_DEFAULT.tema,
      colore: coloreValido(salvato.colore),
    };
  } catch {
    return ASPETTO_DEFAULT;
  }
}

async function salvaAspetto(patch: Partial<Aspetto>): Promise<void> {
  const user = await requireSessionUser();
  const attuale = await getAspetto();
  await getDb()
    .prepare(
      `insert into user_preferences (user_id, key, value, updated_at)
       values (?, ?, ?, datetime('now'))
       on conflict (user_id, key) do update set value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(user.id, CHIAVE, JSON.stringify({ ...attuale, ...patch }))
    .run();

  // Tema e colore sono decisi nel layout radice: va invalidato tutto.
  revalidatePath("/", "layout");
}

export async function salvaTema(tema: Tema): Promise<void> {
  if (!temaValido(tema)) throw new Error("Tema non valido");
  await salvaAspetto({ tema });
}

/** Colore della palette; null torna a quella predefinita. */
export async function salvaColore(colore: string | null): Promise<void> {
  await salvaAspetto({ colore: coloreValido(colore) });
}
