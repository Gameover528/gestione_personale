"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/cf";
import { requireSessionUser } from "@/lib/auth/session";
import { oggiIso } from "@/lib/utils";
import { getDatiCorporei } from "@/modules/alimentazione/queries";
import { listPesate } from "@/modules/peso/queries";
import { pesoAllaData } from "@/modules/peso/types";
import { metMedio, kcalStimate } from "./met";
import type { FonteEsercizio } from "./types";

/**
 * Gli allenamenti svolti e le serie che li compongono.
 *
 * Le serie portano con sé il nome dell'esercizio (`esercizio_nome`) invece di
 * limitarsi a puntarlo: il catalogo può cambiare e un esercizio personale può
 * essere cancellato, ma un allenamento già fatto deve restare leggibile per
 * sempre. L'id resta comunque, per poter riaprire la scheda quando c'è ancora.
 */

export interface Serie {
  id: string;
  esercizio_id: string;
  esercizio_fonte: FonteEsercizio;
  esercizio_nome: string;
  ordine: number;
  ripetizioni: number | null;
  peso_kg: number | null;
  durata_min: number | null;
  distanza_km: number | null;
}

export interface Allenamento {
  id: string;
  data: string;
  nome: string | null;
  durata_min: number | null;
  note: string | null;
  created_at: string;
}

export interface AllenamentoConSerie extends Allenamento {
  serie: Serie[];
  /** Stima: null se manca il peso corporeo o la durata. */
  kcal: number | null;
}

/** Riga di elenco: quel che serve per la lista senza caricare tutte le serie. */
export interface AllenamentoRiepilogo extends Allenamento {
  esercizi: number;
  serie: number;
  kcal: number | null;
}

/**
 * Il peso corporeo da usare per stimare le calorie, allenamento per
 * allenamento.
 *
 * Non è più un numero solo. Con il peso "attuale" del profilo, le bruciate di
 * un allenamento di due mesi fa venivano ricalcolate ogni volta con il peso di
 * oggi: chi cala di otto chili si vedeva riscrivere all'indietro tutta la
 * storia. Ora ogni allenamento usa la pesata più vicina alla sua data, e il
 * peso del profilo resta come ripiego per chi il registro non lo compila.
 *
 * Si legge tutto in una volta e si restituisce una funzione, perché serve una
 * volta per ogni riga di un elenco: rileggere il registro per ognuna sarebbe
 * una query per allenamento.
 */
async function pesoPerData(): Promise<(data: string) => number | null> {
  const [pesate, dati] = await Promise.all([listPesate(), getDatiCorporei()]);
  const ripiego = dati?.peso_kg ?? null;
  return (data: string) => pesoAllaData(pesate, data) ?? ripiego;
}

/**
 * Attrezzi e parti del corpo degli esercizi usati, per stimare il MET medio.
 * Una query sola per tutto l'elenco invece di una per allenamento.
 */
async function attributiEsercizi(
  ids: string[]
): Promise<Map<string, { attrezzi: string[]; parti_corpo: string[] }>> {
  const mappa = new Map<string, { attrezzi: string[]; parti_corpo: string[] }>();
  if (ids.length === 0) return mappa;

  const segnaposti = ids.map(() => "?").join(",");
  const { results } = await getDb()
    .prepare(
      `select id, attrezzi, parti_corpo from esercizi_catalogo where id in (${segnaposti})`
    )
    .bind(...ids)
    .all<{ id: string; attrezzi: string; parti_corpo: string }>();

  const leggi = (v: string): string[] => {
    try {
      const x = JSON.parse(v);
      return Array.isArray(x) ? x.map(String) : [];
    } catch {
      return [];
    }
  };

  for (const r of results ?? []) {
    mappa.set(r.id, {
      attrezzi: leggi(r.attrezzi),
      parti_corpo: leggi(r.parti_corpo),
    });
  }
  return mappa;
}

export async function listAllenamenti(limite = 30): Promise<AllenamentoRiepilogo[]> {
  const user = await requireSessionUser();
  const db = getDb();

  const { results } = await db
    .prepare(
      `select a.id, a.data, a.nome, a.durata_min, a.note, a.created_at,
              count(s.id) as serie,
              count(distinct s.esercizio_id) as esercizi
         from allenamenti a
         left join allenamento_serie s on s.allenamento_id = a.id
        where a.user_id = ?
        group by a.id
        order by a.data desc, a.created_at desc
        limit ?`
    )
    .bind(user.id, limite)
    .all<AllenamentoRiepilogo>();

  const righe = results ?? [];
  if (righe.length === 0) return [];

  // Gli esercizi di tutti gli allenamenti dell'elenco, in una query sola.
  const { results: usati } = await db
    .prepare(
      `select distinct allenamento_id, esercizio_id
         from allenamento_serie
        where user_id = ? and allenamento_id in (${righe.map(() => "?").join(",")})`
    )
    .bind(user.id, ...righe.map((r) => r.id))
    .all<{ allenamento_id: string; esercizio_id: string }>();

  const peso = await pesoPerData();
  const attributi = await attributiEsercizi([
    ...new Set((usati ?? []).map((u) => u.esercizio_id)),
  ]);

  const perAllenamento = new Map<string, string[]>();
  for (const u of usati ?? []) {
    const arr = perAllenamento.get(u.allenamento_id) ?? [];
    arr.push(u.esercizio_id);
    perAllenamento.set(u.allenamento_id, arr);
  }

  return righe.map((r) => {
    const ids = perAllenamento.get(r.id) ?? [];
    const es = ids
      .map((id) => attributi.get(id))
      .filter((x): x is { attrezzi: string[]; parti_corpo: string[] } => !!x);
    return {
      ...r,
      esercizi: Number(r.esercizi ?? 0),
      serie: Number(r.serie ?? 0),
      kcal: kcalStimate(metMedio(es), peso(r.data), r.durata_min),
    };
  });
}

export async function getAllenamento(
  id: string
): Promise<AllenamentoConSerie | null> {
  const user = await requireSessionUser();
  const db = getDb();

  const a = await db
    .prepare(
      "select id, data, nome, durata_min, note, created_at from allenamenti where id = ? and user_id = ?"
    )
    .bind(id, user.id)
    .first<Allenamento>();
  if (!a) return null;

  const { results } = await db
    .prepare(
      `select id, esercizio_id, esercizio_fonte, esercizio_nome, ordine,
              ripetizioni, peso_kg, durata_min, distanza_km
         from allenamento_serie
        where allenamento_id = ? and user_id = ?
        order by ordine asc, created_at asc`
    )
    .bind(id, user.id)
    .all<Serie>();

  const serie = results ?? [];
  const peso = await pesoPerData();
  const attributi = await attributiEsercizi([
    ...new Set(serie.map((s) => s.esercizio_id)),
  ]);
  const es = [...new Set(serie.map((s) => s.esercizio_id))]
    .map((x) => attributi.get(x))
    .filter((x): x is { attrezzi: string[]; parti_corpo: string[] } => !!x);

  return { ...a, serie, kcal: kcalStimate(metMedio(es), peso(a.data), a.durata_min) };
}

export interface AllenamentoInput {
  data: string;
  nome: string | null;
  durata_min: number | null;
  note: string | null;
}

export async function creaAllenamento(input: AllenamentoInput): Promise<string> {
  const user = await requireSessionUser();
  const id = crypto.randomUUID();
  await getDb()
    .prepare(
      "insert into allenamenti (id, user_id, data, nome, durata_min, note) values (?, ?, ?, ?, ?, ?)"
    )
    .bind(
      id,
      user.id,
      input.data || oggiIso(),
      input.nome,
      input.durata_min,
      input.note
    )
    .run();
  revalidatePath("/esercizio", "layout");
  return id;
}

export async function aggiornaAllenamento(
  id: string,
  input: AllenamentoInput
): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare(
      "update allenamenti set data = ?, nome = ?, durata_min = ?, note = ? where id = ? and user_id = ?"
    )
    .bind(input.data, input.nome, input.durata_min, input.note, id, user.id)
    .run();
  revalidatePath("/esercizio", "layout");
}

export async function eliminaAllenamento(id: string): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare("delete from allenamenti where id = ? and user_id = ?")
    .bind(id, user.id)
    .run();
  revalidatePath("/esercizio", "layout");
}

/**
 * Reinserisce un allenamento eliminato con tutte le sue serie: è l'annulla
 * offerto dal messaggio dopo la cancellazione. Le serie vanno ripristinate qui
 * perché la cancellazione se le porta via a cascata.
 */
export async function ripristinaAllenamento(
  a: Allenamento,
  serie: Serie[]
): Promise<void> {
  const user = await requireSessionUser();
  const db = getDb();

  await db
    .prepare(
      `insert into allenamenti (id, user_id, data, nome, durata_min, note, created_at)
       values (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(a.id, user.id, a.data, a.nome, a.durata_min, a.note, a.created_at)
    .run();

  if (serie.length === 0) return;
  const stmt = db.prepare(
    `insert into allenamento_serie
      (id, allenamento_id, user_id, esercizio_id, esercizio_fonte, esercizio_nome,
       ordine, ripetizioni, peso_kg, durata_min, distanza_km)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  await db.batch(
    serie.map((s) =>
      stmt.bind(
        s.id,
        a.id,
        user.id,
        s.esercizio_id,
        s.esercizio_fonte,
        s.esercizio_nome,
        s.ordine,
        s.ripetizioni,
        s.peso_kg,
        s.durata_min,
        s.distanza_km
      )
    )
  );
  revalidatePath("/esercizio", "layout");
}

export interface SerieInput {
  esercizio_id: string;
  esercizio_fonte: FonteEsercizio;
  esercizio_nome: string;
  ripetizioni: number | null;
  peso_kg: number | null;
  durata_min: number | null;
  distanza_km: number | null;
}

/**
 * Aggiunge una o piu' serie uguali in coda.
 *
 * `quante` esiste perche' le serie di un esercizio sono quasi sempre identiche:
 * registrare "4 x 8 a 60 kg" deve costare un gesto, non quattro.
 *
 * L'ordine si calcola qui e non lo manda il client: due schede aperte sullo
 * stesso allenamento darebbero lo stesso numero.
 */
export async function aggiungiSerie(
  allenamentoId: string,
  input: SerieInput,
  quante = 1
): Promise<void> {
  const user = await requireSessionUser();
  const db = getDb();

  const proprietario = await db
    .prepare("select 1 from allenamenti where id = ? and user_id = ?")
    .bind(allenamentoId, user.id)
    .first();
  if (!proprietario) throw new Error("Allenamento non trovato");

  const ultimo = await db
    .prepare(
      "select coalesce(max(ordine), -1) as ordine from allenamento_serie where allenamento_id = ?"
    )
    .bind(allenamentoId)
    .first<{ ordine: number }>();

  // Limite di sicurezza: il numero arriva dal client e una svista in un campo
  // numerico non deve poter generare migliaia di righe.
  const numero = Math.min(Math.max(1, Math.floor(quante)), 20);
  const partenza = (ultimo?.ordine ?? -1) + 1;

  const stmt = db.prepare(
    `insert into allenamento_serie
      (id, allenamento_id, user_id, esercizio_id, esercizio_fonte, esercizio_nome,
       ordine, ripetizioni, peso_kg, durata_min, distanza_km)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  await db.batch(
    Array.from({ length: numero }, (_, i) =>
      stmt.bind(
        crypto.randomUUID(),
        allenamentoId,
        user.id,
        input.esercizio_id,
        input.esercizio_fonte,
        input.esercizio_nome,
        partenza + i,
        input.ripetizioni,
        input.peso_kg,
        input.durata_min,
        input.distanza_km
      )
    )
  );
  revalidatePath("/esercizio", "layout");
}

/**
 * Corregge i numeri di una serie gia' registrata: e' il gesto che rende utile
 * partire da una scheda, dove i carichi sono quelli previsti e quasi mai quelli
 * effettivamente sollevati.
 */
export async function aggiornaSerie(
  id: string,
  valori: {
    ripetizioni: number | null;
    peso_kg: number | null;
    durata_min: number | null;
    distanza_km: number | null;
  }
): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare(
      `update allenamento_serie
          set ripetizioni = ?, peso_kg = ?, durata_min = ?, distanza_km = ?
        where id = ? and user_id = ?`
    )
    .bind(
      valori.ripetizioni,
      valori.peso_kg,
      valori.durata_min,
      valori.distanza_km,
      id,
      user.id
    )
    .run();
  revalidatePath("/esercizio", "layout");
}

export async function eliminaSerie(id: string): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare("delete from allenamento_serie where id = ? and user_id = ?")
    .bind(id, user.id)
    .run();
  revalidatePath("/esercizio", "layout");
}

/** Reinserisce una serie eliminata, con lo stesso id e la stessa posizione. */
export async function ripristinaSerie(
  allenamentoId: string,
  s: Serie
): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare(
      `insert into allenamento_serie
        (id, allenamento_id, user_id, esercizio_id, esercizio_fonte, esercizio_nome,
         ordine, ripetizioni, peso_kg, durata_min, distanza_km)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      s.id,
      allenamentoId,
      user.id,
      s.esercizio_id,
      s.esercizio_fonte,
      s.esercizio_nome,
      s.ordine,
      s.ripetizioni,
      s.peso_kg,
      s.durata_min,
      s.distanza_km
    )
    .run();
  revalidatePath("/esercizio", "layout");
}

/**
 * Riepilogo per la dashboard: quanto ci si è allenati negli ultimi giorni.
 * Una chiamata sola, come gli altri riquadri.
 */
export interface RiepilogoAllenamento {
  sessioni: number;
  minuti: number;
  kcal: number;
  /** Calorie bruciate oggi, per il bilancio energetico. */
  kcalOggi: number;
}

export async function riepilogoAllenamento(
  giorni = 7
): Promise<RiepilogoAllenamento> {
  const elenco = await listAllenamenti(100);
  const oggi = oggiIso();
  const inizio = new Date(`${oggi}T00:00:00Z`);
  inizio.setUTCDate(inizio.getUTCDate() - (Math.max(1, giorni) - 1));
  const dal = inizio.toISOString().slice(0, 10);

  const nelPeriodo = elenco.filter((a) => a.data >= dal && a.data <= oggi);
  return {
    sessioni: nelPeriodo.length,
    minuti: nelPeriodo.reduce((s, a) => s + (a.durata_min ?? 0), 0),
    kcal: nelPeriodo.reduce((s, a) => s + (a.kcal ?? 0), 0),
    kcalOggi: elenco
      .filter((a) => a.data === oggi)
      .reduce((s, a) => s + (a.kcal ?? 0), 0),
  };
}

/** Un giorno dell'andamento: quanto ci si e' allenati e quanto si e' bruciato. */
export interface GiornoAllenamento {
  data: string;
  sessioni: number;
  minuti: number;
  kcal: number;
}

/**
 * Allenamenti giorno per giorno, per i grafici dell'andamento.
 *
 * Si parte dall'elenco gia' completo di stime invece di rifare i conti in SQL:
 * le calorie dipendono dal MET degli esercizi svolti, che sta nel codice e non
 * nel database. Gli allenamenti di una persona sono poche centinaia all'anno,
 * quindi aggregare qui non costa niente.
 */
export async function andamentoAllenamenti(
  giorni: number
): Promise<GiornoAllenamento[]> {
  const elenco = await listAllenamenti(500);
  const fine = oggiIso();
  const inizio = new Date(`${fine}T00:00:00Z`);
  inizio.setUTCDate(inizio.getUTCDate() - (Math.max(1, giorni) - 1));
  const dal = inizio.toISOString().slice(0, 10);

  const perGiorno = new Map<string, GiornoAllenamento>();
  for (const a of elenco) {
    if (a.data < dal || a.data > fine) continue;
    const g = perGiorno.get(a.data) ?? {
      data: a.data,
      sessioni: 0,
      minuti: 0,
      kcal: 0,
    };
    g.sessioni += 1;
    g.minuti += a.durata_min ?? 0;
    g.kcal += a.kcal ?? 0;
    perGiorno.set(a.data, g);
  }

  return [...perGiorno.values()].sort((x, y) => x.data.localeCompare(y.data));
}
