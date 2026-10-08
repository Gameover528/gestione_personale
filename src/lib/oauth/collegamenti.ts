"use server";

import { getDb } from "@/lib/cf";
import { requireSessionUser } from "@/lib/auth/session";

/**
 * Le chat collegate al proprio account, per vederle e staccarle.
 *
 * Un permesso che non si può ritirare non è un permesso, è una cessione. Dare
 * accesso a una chat è facile — tre clic e un consenso — e deve essere
 * altrettanto facile tornare indietro, senza chiedere a nessuno.
 */

export interface Collegamento {
  sessione: string;
  creato: string;
  ultimoUso: string | null;
}

export async function listCollegamenti(): Promise<Collegamento[]> {
  const user = await requireSessionUser();
  const { results } = await getDb()
    .prepare(
      `select sessione,
              min(created_at) as creato,
              max(ultimo_uso) as ultimo_uso
         from oauth_token
        where user_id = ?
        group by sessione
        order by creato desc`
    )
    .bind(user.id)
    .all<{ sessione: string; creato: string; ultimo_uso: string | null }>();

  return (results ?? []).map((r) => ({
    sessione: r.sessione,
    creato: r.creato,
    ultimoUso: r.ultimo_uso,
  }));
}

/**
 * Stacca un collegamento: spariscono insieme il token d'accesso e quello di
 * rinnovo, quindi la chat smette di leggere subito e non può rifarsi un
 * accesso senza passare di nuovo dal consenso.
 *
 * Il filtro su `user_id` non è pignoleria: l'identificativo della sessione
 * arriva dal client, e senza quel filtro chiunque potrebbe staccare i
 * collegamenti di chiunque altro conoscendone il numero.
 */
export async function staccaCollegamento(sessione: string): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare("delete from oauth_token where sessione = ? and user_id = ?")
    .bind(sessione, user.id)
    .run();
}
