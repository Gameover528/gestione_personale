"use server";

import { getDb } from "@/lib/cf";
import { getSessionUser } from "@/lib/auth/session";

const KEY = "dashboard";

/** Ritorna l'ordine dei widget visibili salvato, oppure null se non impostato. */
export async function getDashboardLayout(): Promise<string[] | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const row = await getDb()
    .prepare("select value from user_preferences where user_id = ? and key = ?")
    .bind(user.id, KEY)
    .first<{ value: string }>();

  if (!row) return null;
  try {
    const value = JSON.parse(row.value) as { widgets?: string[] };
    return value.widgets ?? null;
  } catch {
    return null;
  }
}

export async function saveDashboardLayout(widgetIds: string[]): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error("Non autenticato");

  await getDb()
    .prepare(
      `insert into user_preferences (user_id, key, value, updated_at)
       values (?, ?, ?, datetime('now'))
       on conflict (user_id, key) do update set value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(user.id, KEY, JSON.stringify({ widgets: widgetIds }))
    .run();
}
