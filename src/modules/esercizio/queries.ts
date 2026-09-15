"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/cf";
import { requireSessionUser } from "@/lib/auth/session";
import type { Esercizio } from "./types";

/** Legge una colonna che contiene un array JSON, senza far saltare la pagina se è malformata. */
function elenco(v: unknown): string[] {
  if (typeof v !== "string") return [];
  try {
    const x = JSON.parse(v);
    return Array.isArray(x) ? x.map(String) : [];
  } catch {
    return [];
  }
}

interface RigaCatalogo {
  id: string;
  nome: string;
  gif_url: string | null;
  muscoli: string;
  muscoli_secondari: string;
  parti_corpo: string;
  attrezzi: string;
  istruzioni: string;
}

interface RigaPersonale {
  id: string;
  nome: string;
  muscoli: string;
  muscoli_secondari: string;
  attrezzo: string | null;
  note: string | null;
}

/** Riga del catalogo senza le colonne pesanti, per gli elenchi. */
interface RigaCatalogoLeggera {
  id: string;
  nome: string;
  muscoli: string;
  muscoli_secondari: string;
  parti_corpo: string;
  attrezzi: string;
  ha_gif: number;
}

/** Versione da elenco: senza istruzioni, e con un sì/no al posto del link alla GIF. */
function daCatalogoLeggero(r: RigaCatalogoLeggera): Esercizio {
  return {
    id: r.id,
    fonte: "catalogo",
    nome: r.nome,
    muscoli: elenco(r.muscoli),
    muscoli_secondari: elenco(r.muscoli_secondari),
    parti_corpo: elenco(r.parti_corpo),
    attrezzi: elenco(r.attrezzi),
    istruzioni: [],
    gif_url: null,
    ha_gif: !!r.ha_gif,
  };
}

function daCatalogo(r: RigaCatalogo): Esercizio {
  return {
    id: r.id,
    fonte: "catalogo",
    nome: r.nome,
    muscoli: elenco(r.muscoli),
    muscoli_secondari: elenco(r.muscoli_secondari),
    parti_corpo: elenco(r.parti_corpo),
    attrezzi: elenco(r.attrezzi),
    istruzioni: elenco(r.istruzioni),
    gif_url: r.gif_url,
  };
}

function daPersonale(r: RigaPersonale): Esercizio {
  return {
    id: r.id,
    fonte: "personale",
    nome: r.nome,
    muscoli: elenco(r.muscoli),
    muscoli_secondari: elenco(r.muscoli_secondari),
    parti_corpo: [],
    attrezzi: r.attrezzo ? [r.attrezzo] : [],
    istruzioni: [],
    gif_url: null,
    note: r.note,
  };
}

/**
 * Tutti gli esercizi: i propri prima, poi il catalogo condiviso.
 *
 * Si scarica tutto in un colpo perché il catalogo è fisso (1500 righe che non
 * cambiano mai) e la ricerca poi avviene nel browser: una chiamata sola invece
 * di una per ogni lettera digitata. È la lezione già imparata con gli alimenti.
 *
 * Ma "tutto" vuol dire tutto quello che serve a cercare, non tutte le colonne:
 * mandando anche istruzioni e link delle GIF la risposta arrivava a 1,18 MB e
 * il Worker sforava il limite di CPU (errore 1102). Quelle si leggono nella
 * scheda del singolo esercizio.
 */
export async function listEsercizi(): Promise<Esercizio[]> {
  const user = await requireSessionUser();
  const db = getDb();

  const [personali, catalogo] = await Promise.all([
    db
      .prepare(
        "select id, nome, muscoli, muscoli_secondari, attrezzo, note from esercizi where user_id = ? order by nome asc"
      )
      .bind(user.id)
      .all<RigaPersonale>(),
    // Niente istruzioni e niente gif_url: l'elenco serve a cercare e a
    // scegliere, e quelle due colonne pesano 848 KB sui 977 del catalogo —
    // il 78% solo le istruzioni, che qui non si mostrano mai. Si leggono
    // nella scheda del singolo esercizio, con getEsercizio.
    //
    // Non è un'ottimizzazione di lusso: con tutto il catalogo la risposta era
    // di 1,18 MB, e serializzarla superava il limite di CPU per richiesta del
    // Worker (errore 1102) ogni volta che si apriva un allenamento.
    db
      .prepare(
        `select id, nome, muscoli, muscoli_secondari, parti_corpo, attrezzi,
                gif_url is not null as ha_gif
           from esercizi_catalogo order by nome asc`
      )
      .all<RigaCatalogoLeggera>(),
  ]);

  // I nomi che l'utente ha dato agli esercizi del catalogo sostituiscono quelli
  // inglesi, ma l'originale resta in `nome_originale`: chi ha ribattezzato
  // "Barbell Bench Press" in "Panca piana" deve continuare a trovarlo anche
  // cercando in inglese.
  const nomi = await leggiNomi(user.id);
  const rinomina = (e: Esercizio): Esercizio => {
    const mio = nomi[e.id];
    return mio ? { ...e, nome: mio, nome_originale: e.nome } : e;
  };

  return [
    ...(personali.results ?? []).map(daPersonale),
    ...(catalogo.results ?? []).map(daCatalogoLeggero).map(rinomina),
  ];
}

/** Un singolo esercizio, cercato prima tra i propri e poi nel catalogo. */
export async function getEsercizio(id: string): Promise<Esercizio | null> {
  const user = await requireSessionUser();
  const db = getDb();

  const mio = await db
    .prepare(
      "select id, nome, muscoli, muscoli_secondari, attrezzo, note from esercizi where id = ? and user_id = ?"
    )
    .bind(id, user.id)
    .first<RigaPersonale>();
  if (mio) return daPersonale(mio);

  const c = await db
    .prepare(
      "select id, nome, gif_url, muscoli, muscoli_secondari, parti_corpo, attrezzi, istruzioni from esercizi_catalogo where id = ?"
    )
    .bind(id)
    .first<RigaCatalogo>();
  if (!c) return null;

  const e = daCatalogo(c);
  const rinominato = (await leggiNomi(user.id))[e.id];
  return rinominato
    ? { ...e, nome: rinominato, nome_originale: e.nome }
    : e;
}

export interface EsercizioInput {
  nome: string;
  muscoli: string[];
  muscoli_secondari: string[];
  attrezzo: string | null;
  note: string | null;
}

export async function creaEsercizio(input: EsercizioInput): Promise<string> {
  const user = await requireSessionUser();
  const id = crypto.randomUUID();
  await getDb()
    .prepare(
      `insert into esercizi (id, user_id, nome, muscoli, muscoli_secondari, attrezzo, note)
       values (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      user.id,
      input.nome,
      JSON.stringify(input.muscoli),
      JSON.stringify(input.muscoli_secondari),
      input.attrezzo,
      input.note
    )
    .run();
  revalidatePath("/esercizio", "layout");
  return id;
}

export async function eliminaEsercizio(id: string): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare("delete from esercizi where id = ? and user_id = ?")
    .bind(id, user.id)
    .run();
  revalidatePath("/esercizio", "layout");
}

/**
 * Reinserisce un esercizio personale eliminato, con lo stesso id: è l'annulla
 * offerto dal messaggio dopo la cancellazione.
 */
export async function ripristinaEsercizio(e: Esercizio): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare(
      `insert into esercizi (id, user_id, nome, muscoli, muscoli_secondari, attrezzo, note)
       values (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      e.id,
      user.id,
      e.nome,
      JSON.stringify(e.muscoli),
      JSON.stringify(e.muscoli_secondari),
      e.attrezzi[0] ?? null,
      e.note ?? null
    )
    .run();
  revalidatePath("/esercizio", "layout");
}

// ----------------------- Preferenze del modulo -----------------------

const CHIAVE_PREFERENZE = "esercizio:preferenze";

export interface PreferenzeEsercizio {
  /**
   * Quanti giorni a settimana ci si e' prefissati di allenarsi.
   *
   * Serve a dare un metro all'aderenza: "2 giorni su 30" non dice niente,
   * perche' nessuno si allena tutti i giorni. Con 4 giorni a settimana, su un
   * mese l'obiettivo diventa ~17 e il confronto ha un senso.
   *
   * Zero significa "non me lo sono prefissato": in quel caso l'aderenza non si
   * mostra, invece di inventare un bersaglio.
   */
  giorniSettimana: number;
}

// Non esportata: un file "use server" puo' esportare solo funzioni async.
const PREFERENZE_ESERCIZIO_DEFAULT: PreferenzeEsercizio = {
  giorniSettimana: 0,
};

export async function getPreferenzeEsercizio(): Promise<PreferenzeEsercizio> {
  const user = await requireSessionUser();
  const row = await getDb()
    .prepare("select value from user_preferences where user_id = ? and key = ?")
    .bind(user.id, CHIAVE_PREFERENZE)
    .first<{ value: string }>();
  if (!row) return PREFERENZE_ESERCIZIO_DEFAULT;
  try {
    const salvato = JSON.parse(row.value) as Partial<PreferenzeEsercizio>;
    const n = Number(salvato.giorniSettimana);
    return {
      giorniSettimana: Number.isFinite(n) ? Math.min(7, Math.max(0, Math.round(n))) : 0,
    };
  } catch {
    return PREFERENZE_ESERCIZIO_DEFAULT;
  }
}

export async function savePreferenzeEsercizio(
  pref: PreferenzeEsercizio
): Promise<void> {
  const user = await requireSessionUser();
  const giorniSettimana = Math.min(7, Math.max(0, Math.round(pref.giorniSettimana || 0)));
  await getDb()
    .prepare(
      `insert into user_preferences (user_id, key, value, updated_at)
       values (?, ?, ?, datetime('now'))
       on conflict (user_id, key) do update set value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(user.id, CHIAVE_PREFERENZE, JSON.stringify({ giorniSettimana }))
    .run();
}

// ----------------------- Nomi personalizzati -----------------------

const CHIAVE_NOMI = "esercizio:nomi";

/**
 * I nomi che l'utente ha dato agli esercizi del catalogo.
 *
 * Il catalogo e' in inglese e condiviso fra tutti, quindi non si tocca: qui si
 * tiene una mappa "id esercizio -> come lo chiamo io", per utente. Sta nelle
 * preferenze e non in una tabella sua perche' sono una manciata di voci (si
 * rinominano gli esercizi che si usano davvero, non 1500) e cosi' non serve
 * una migration.
 */
async function leggiNomi(userId: string): Promise<Record<string, string>> {
  const row = await getDb()
    .prepare("select value from user_preferences where user_id = ? and key = ?")
    .bind(userId, CHIAVE_NOMI)
    .first<{ value: string }>();
  if (!row) return {};
  try {
    const v = JSON.parse(row.value);
    return v && typeof v === "object" ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * Rinomina un esercizio del catalogo. Un nome vuoto toglie la
 * personalizzazione e fa tornare quello originale.
 */
export async function rinominaEsercizio(
  id: string,
  nome: string
): Promise<void> {
  const user = await requireSessionUser();
  const nomi = await leggiNomi(user.id);
  const pulito = nome.trim().replace(/\s+/g, " ").slice(0, 80);
  if (pulito) nomi[id] = pulito;
  else delete nomi[id];

  await getDb()
    .prepare(
      `insert into user_preferences (user_id, key, value, updated_at)
       values (?, ?, ?, datetime('now'))
       on conflict (user_id, key) do update set value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(user.id, CHIAVE_NOMI, JSON.stringify(nomi))
    .run();
  revalidatePath("/esercizio", "layout");
}
