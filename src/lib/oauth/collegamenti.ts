"use server";

import { getDb } from "@/lib/cf";
import { requireSessionUser } from "@/lib/auth/session";
import { puoScrivere } from "@/lib/oauth/config";

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
  /** Qualunque uso, non solo una lettura: `ultimo_uso` si aggiorna a ogni chiamata. */
  ultimoUso: string | null;
  /**
   * Se quel collegamento può anche scrivere.
   *
   * È l'unica cosa che distingue davvero due collegamenti, e va vista senza
   * aprire niente: la stessa riga può essere una chat che guarda e una che
   * aggiunge pasti al tuo diario.
   */
  scrive: boolean;
}

export async function listCollegamenti(): Promise<Collegamento[]> {
  const user = await requireSessionUser();
  const { results } = await getDb()
    .prepare(
      /*
        `max(ambito)`: i due token di una sessione nascono con lo stesso
        permesso, ma se mai divergessero si mostra il più largo — dire a
        qualcuno che una chat legge soltanto, mentre scrive, è l'errore da
        non fare. "lettura scrittura" > "lettura" anche in ordine alfabetico.
      */
      `select sessione,
              min(created_at) as creato,
              max(ultimo_uso) as ultimo_uso,
              max(ambito) as ambito
         from oauth_token
        where user_id = ?
        group by sessione
        order by creato desc`
    )
    .bind(user.id)
    .all<{
      sessione: string;
      creato: string;
      ultimo_uso: string | null;
      ambito: string;
    }>();

  return (results ?? []).map((r) => ({
    sessione: r.sessione,
    creato: r.creato,
    ultimoUso: r.ultimo_uso,
    scrive: puoScrivere(r.ambito),
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
