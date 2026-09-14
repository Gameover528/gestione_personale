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
    db
      .prepare(
        "select id, nome, gif_url, muscoli, muscoli_secondari, parti_corpo, attrezzi, istruzioni from esercizi_catalogo order by nome asc"
      )
      .all<RigaCatalogo>(),
  ]);

  return [
    ...(personali.results ?? []).map(daPersonale),
    ...(catalogo.results ?? []).map(daCatalogo),
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
  return c ? daCatalogo(c) : null;
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
