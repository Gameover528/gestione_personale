"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/cf";
import { requireSessionUser } from "@/lib/auth/session";
import { oggiIso } from "@/lib/utils";
import type { FonteEsercizio } from "./types";

/**
 * Schede di allenamento: i programmi che si ripetono.
 *
 * Una scheda e' un modello, non una sessione. Avviarla crea un allenamento
 * nuovo copiandoci dentro le righe previste: da quel momento i due sono
 * indipendenti, quindi correggere la scheda non riscrive gli allenamenti gia'
 * fatti (e cancellarla non li porta via).
 */

export interface EsercizioScheda {
  id: string;
  esercizio_id: string;
  esercizio_fonte: FonteEsercizio;
  esercizio_nome: string;
  ordine: number;
  serie: number;
  ripetizioni: number | null;
  peso_kg: number | null;
  durata_min: number | null;
  distanza_km: number | null;
}

export interface Scheda {
  id: string;
  nome: string;
  note: string | null;
  created_at: string;
}

export interface SchedaConEsercizi extends Scheda {
  esercizi: EsercizioScheda[];
}

/** Riga di elenco: quante voci e quante serie in totale. */
export interface SchedaRiepilogo extends Scheda {
  voci: number;
  serie: number;
}

export async function listSchede(): Promise<SchedaRiepilogo[]> {
  const user = await requireSessionUser();
  const { results } = await getDb()
    .prepare(
      `select s.id, s.nome, s.note, s.created_at,
              count(e.id) as voci,
              coalesce(sum(e.serie), 0) as serie
         from schede s
         left join scheda_esercizi e on e.scheda_id = s.id
        where s.user_id = ?
        group by s.id
        order by s.nome asc`
    )
    .bind(user.id)
    .all<SchedaRiepilogo>();
  return (results ?? []).map((r) => ({
    ...r,
    voci: Number(r.voci ?? 0),
    serie: Number(r.serie ?? 0),
  }));
}

export async function getScheda(id: string): Promise<SchedaConEsercizi | null> {
  const user = await requireSessionUser();
  const db = getDb();

  const s = await db
    .prepare("select id, nome, note, created_at from schede where id = ? and user_id = ?")
    .bind(id, user.id)
    .first<Scheda>();
  if (!s) return null;

  const { results } = await db
    .prepare(
      `select id, esercizio_id, esercizio_fonte, esercizio_nome, ordine, serie,
              ripetizioni, peso_kg, durata_min, distanza_km
         from scheda_esercizi
        where scheda_id = ? and user_id = ?
        order by ordine asc, created_at asc`
    )
    .bind(id, user.id)
    .all<EsercizioScheda>();

  return { ...s, esercizi: results ?? [] };
}

export async function creaScheda(nome: string, note: string | null): Promise<string> {
  const user = await requireSessionUser();
  const id = crypto.randomUUID();
  await getDb()
    .prepare("insert into schede (id, user_id, nome, note) values (?, ?, ?, ?)")
    .bind(id, user.id, nome, note)
    .run();
  revalidatePath("/esercizio", "layout");
  return id;
}

export async function aggiornaScheda(
  id: string,
  nome: string,
  note: string | null
): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare("update schede set nome = ?, note = ? where id = ? and user_id = ?")
    .bind(nome, note, id, user.id)
    .run();
  revalidatePath("/esercizio", "layout");
}

export async function eliminaScheda(id: string): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare("delete from schede where id = ? and user_id = ?")
    .bind(id, user.id)
    .run();
  revalidatePath("/esercizio", "layout");
}

/** Reinserisce una scheda eliminata con le sue voci: l'annulla dopo la cancellazione. */
export async function ripristinaScheda(
  s: Scheda,
  esercizi: EsercizioScheda[]
): Promise<void> {
  const user = await requireSessionUser();
  const db = getDb();

  await db
    .prepare("insert into schede (id, user_id, nome, note, created_at) values (?, ?, ?, ?, ?)")
    .bind(s.id, user.id, s.nome, s.note, s.created_at)
    .run();

  if (esercizi.length === 0) return;
  const stmt = db.prepare(
    `insert into scheda_esercizi
      (id, scheda_id, user_id, esercizio_id, esercizio_fonte, esercizio_nome,
       ordine, serie, ripetizioni, peso_kg, durata_min, distanza_km)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  await db.batch(
    esercizi.map((e) =>
      stmt.bind(
        e.id,
        s.id,
        user.id,
        e.esercizio_id,
        e.esercizio_fonte,
        e.esercizio_nome,
        e.ordine,
        e.serie,
        e.ripetizioni,
        e.peso_kg,
        e.durata_min,
        e.distanza_km
      )
    )
  );
  revalidatePath("/esercizio", "layout");
}

export interface EsercizioSchedaInput {
  esercizio_id: string;
  esercizio_fonte: FonteEsercizio;
  esercizio_nome: string;
  serie: number;
  ripetizioni: number | null;
  peso_kg: number | null;
  durata_min: number | null;
  distanza_km: number | null;
}

/** Aggiunge una voce in coda. L'ordine lo decide il server, non il client. */
export async function aggiungiEsercizioScheda(
  schedaId: string,
  input: EsercizioSchedaInput
): Promise<void> {
  const user = await requireSessionUser();
  const db = getDb();

  const proprietario = await db
    .prepare("select 1 from schede where id = ? and user_id = ?")
    .bind(schedaId, user.id)
    .first();
  if (!proprietario) throw new Error("Scheda non trovata");

  const ultimo = await db
    .prepare(
      "select coalesce(max(ordine), -1) as ordine from scheda_esercizi where scheda_id = ?"
    )
    .bind(schedaId)
    .first<{ ordine: number }>();

  await db
    .prepare(
      `insert into scheda_esercizi
        (id, scheda_id, user_id, esercizio_id, esercizio_fonte, esercizio_nome,
         ordine, serie, ripetizioni, peso_kg, durata_min, distanza_km)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      schedaId,
      user.id,
      input.esercizio_id,
      input.esercizio_fonte,
      input.esercizio_nome,
      (ultimo?.ordine ?? -1) + 1,
      Math.max(1, input.serie),
      input.ripetizioni,
      input.peso_kg,
      input.durata_min,
      input.distanza_km
    )
    .run();
  revalidatePath("/esercizio", "layout");
}

export async function eliminaEsercizioScheda(id: string): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare("delete from scheda_esercizi where id = ? and user_id = ?")
    .bind(id, user.id)
    .run();
  revalidatePath("/esercizio", "layout");
}

/**
 * Avvia un allenamento da una scheda: crea la sessione e ci copia dentro le
 * serie previste, espandendo ogni voce nel numero di serie indicate ("4x8"
 * diventa quattro righe).
 *
 * I numeri vengono copiati, non collegati: durante l'allenamento si cambiano
 * carichi e ripetizioni senza toccare la scheda, che resta il programma.
 */
export async function iniziaDaScheda(
  schedaId: string,
  data?: string
): Promise<string> {
  const user = await requireSessionUser();
  const db = getDb();

  const scheda = await getScheda(schedaId);
  if (!scheda) throw new Error("Scheda non trovata");

  const idAllenamento = crypto.randomUUID();
  await db
    .prepare(
      "insert into allenamenti (id, user_id, data, nome, scheda_id) values (?, ?, ?, ?, ?)"
    )
    .bind(idAllenamento, user.id, data || oggiIso(), scheda.nome, scheda.id)
    .run();

  const righe: unknown[][] = [];
  let ordine = 0;
  for (const e of scheda.esercizi) {
    for (let i = 0; i < Math.max(1, e.serie); i++) {
      righe.push([
        crypto.randomUUID(),
        idAllenamento,
        user.id,
        e.esercizio_id,
        e.esercizio_fonte,
        e.esercizio_nome,
        ordine++,
        e.ripetizioni,
        e.peso_kg,
        e.durata_min,
        e.distanza_km,
      ]);
    }
  }

  if (righe.length > 0) {
    const stmt = db.prepare(
      `insert into allenamento_serie
        (id, allenamento_id, user_id, esercizio_id, esercizio_fonte, esercizio_nome,
         ordine, ripetizioni, peso_kg, durata_min, distanza_km)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    // A lotti: una scheda lunga puo' superare il limite di dimensione di un
    // singolo batch D1.
    const LOTTO = 50;
    for (let i = 0; i < righe.length; i += LOTTO) {
      await db.batch(righe.slice(i, i + LOTTO).map((r) => stmt.bind(...r)));
    }
  }

  revalidatePath("/esercizio", "layout");
  return idAllenamento;
}

/**
 * Aggiunge tutte le voci di una scheda a un allenamento gia' esistente,
 * accodandole a quello che c'e' gia'.
 *
 * E' il caso di chi richiama una scheda per non riscrivere tutto e poi corregge
 * solo carichi e ripetizioni, e di chi in una sessione ne unisce due. Diverso da
 * `iniziaDaScheda`, che l'allenamento lo crea da zero.
 */
export async function aggiungiSchedaAdAllenamento(
  allenamentoId: string,
  schedaId: string
): Promise<number> {
  const user = await requireSessionUser();
  const db = getDb();

  const proprietario = await db
    .prepare("select 1 from allenamenti where id = ? and user_id = ?")
    .bind(allenamentoId, user.id)
    .first();
  if (!proprietario) throw new Error("Allenamento non trovato");

  const scheda = await getScheda(schedaId);
  if (!scheda) throw new Error("Scheda non trovata");

  const ultimo = await db
    .prepare(
      "select coalesce(max(ordine), -1) as ordine from allenamento_serie where allenamento_id = ?"
    )
    .bind(allenamentoId)
    .first<{ ordine: number }>();

  let ordine = (ultimo?.ordine ?? -1) + 1;
  const righe: unknown[][] = [];
  for (const e of scheda.esercizi) {
    for (let i = 0; i < Math.max(1, e.serie); i++) {
      righe.push([
        crypto.randomUUID(),
        allenamentoId,
        user.id,
        e.esercizio_id,
        e.esercizio_fonte,
        e.esercizio_nome,
        ordine++,
        e.ripetizioni,
        e.peso_kg,
        e.durata_min,
        e.distanza_km,
      ]);
    }
  }
  if (righe.length === 0) return 0;

  const stmt = db.prepare(
    `insert into allenamento_serie
      (id, allenamento_id, user_id, esercizio_id, esercizio_fonte, esercizio_nome,
       ordine, ripetizioni, peso_kg, durata_min, distanza_km)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const LOTTO = 50;
  for (let i = 0; i < righe.length; i += LOTTO) {
    await db.batch(righe.slice(i, i + LOTTO).map((r) => stmt.bind(...r)));
  }

  revalidatePath("/esercizio", "layout");
  return righe.length;
}
