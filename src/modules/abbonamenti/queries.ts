"use server";

import { getDb } from "@/lib/cf";
import { requireSessionUser } from "@/lib/auth/session";
import {
  prossimaData,
  oggiISO,
  type Abbonamento,
  type AbbonamentoInput,
  type Frequenza,
  type Rata,
} from "./types";
import { oggiIso } from "@/lib/utils";

const MAX_RATE_PER_GENERAZIONE = 2000; // rete di sicurezza contro loop involontari

/**
 * Genera (se mancanti) tutte le rate dovute fino ad oggi per un abbonamento attivo.
 * Idempotente: usa "insert or ignore" sul vincolo unique (abbonamento_id, data_scadenza),
 * quindi può essere richiamata ad ogni accesso senza creare doppioni.
 * Se l'abbonamento ha una data_ripresa (dopo una sospensione), le date precedenti
 * a quella soglia non vengono mai generate, anche se non esistevano già: la ripresa
 * non è retroattiva.
 */
async function generaRateMancanti(abbonamento: Abbonamento): Promise<void> {
  if (abbonamento.stato !== "attivo") return;

  const db = getDb();
  const oggi = oggiISO();
  const soglia = abbonamento.data_ripresa;

  const daCreare: string[] = [];
  let cursore = abbonamento.data_inizio;
  let iterazioni = 0;
  while (cursore <= oggi && iterazioni < MAX_RATE_PER_GENERAZIONE) {
    if (!soglia || cursore >= soglia) {
      daCreare.push(cursore);
    }
    cursore = prossimaData(cursore, abbonamento.frequenza);
    iterazioni++;
  }

  if (daCreare.length === 0) return;

  const stmt = db.prepare(
    `insert or ignore into abbonamento_rate (id, abbonamento_id, user_id, data_scadenza, importo, stato)
     values (?, ?, ?, ?, ?, 'da_pagare')`
  );
  await db.batch(
    daCreare.map((data) =>
      stmt.bind(crypto.randomUUID(), abbonamento.id, abbonamento.user_id, data, abbonamento.importo)
    )
  );
}

export async function listAbbonamenti(): Promise<Abbonamento[]> {
  const user = await requireSessionUser();
  const { results } = await getDb()
    .prepare("select * from abbonamenti where user_id = ? order by created_at asc")
    .bind(user.id)
    .all<Abbonamento>();

  const abbonamenti = results ?? [];
  for (const a of abbonamenti) {
    if (a.stato === "attivo") await generaRateMancanti(a);
  }
  return abbonamenti;
}

export async function getAbbonamento(id: string): Promise<Abbonamento | null> {
  const user = await requireSessionUser();
  const row = await getDb()
    .prepare("select * from abbonamenti where id = ? and user_id = ?")
    .bind(id, user.id)
    .first<Abbonamento>();
  if (!row) return null;
  if (row.stato === "attivo") await generaRateMancanti(row);
  return row;
}

export async function listRate(abbonamentoId: string): Promise<Rata[]> {
  const user = await requireSessionUser();
  const { results } = await getDb()
    .prepare(
      "select * from abbonamento_rate where abbonamento_id = ? and user_id = ? order by data_scadenza desc"
    )
    .bind(abbonamentoId, user.id)
    .all<Rata>();
  return results ?? [];
}

export interface AbbonamentoResult {
  error?: string;
  ok?: boolean;
}

export async function creaAbbonamentoAction(
  _prevState: AbbonamentoResult,
  formData: FormData
): Promise<AbbonamentoResult> {
  const user = await requireSessionUser();

  const nome = String(formData.get("nome") || "").trim();
  const importo = Number(formData.get("importo") || 0);
  const frequenza = String(formData.get("frequenza") || "mensile") as AbbonamentoInput["frequenza"];
  const data_inizio = String(formData.get("data_inizio") || "");
  const note = String(formData.get("note") || "").trim() || null;

  if (!nome) return { error: "Il nome è obbligatorio" };
  if (!(importo > 0)) return { error: "L'importo deve essere maggiore di 0" };
  if (!data_inizio) return { error: "La data di inizio è obbligatoria" };

  const id = crypto.randomUUID();
  await getDb()
    .prepare(
      `insert into abbonamenti (id, user_id, nome, importo, frequenza, data_inizio, stato, note)
       values (?, ?, ?, ?, ?, ?, 'attivo', ?)`
    )
    .bind(id, user.id, nome, importo, frequenza, data_inizio, note)
    .run();

  const creato = await getDb()
    .prepare("select * from abbonamenti where id = ?")
    .bind(id)
    .first<Abbonamento>();
  if (creato) await generaRateMancanti(creato); // backfill immediato se data_inizio è nel passato

  return { ok: true };
}

/** Modifica solo nome, importo e note: frequenza e data di inizio non sono modificabili una volta create le rate. */
export async function aggiornaAbbonamentoAction(
  _prevState: AbbonamentoResult,
  formData: FormData
): Promise<AbbonamentoResult> {
  const user = await requireSessionUser();
  const id = String(formData.get("id") || "");
  const nome = String(formData.get("nome") || "").trim();
  const importo = Number(formData.get("importo") || 0);
  const note = String(formData.get("note") || "").trim() || null;

  if (!nome) return { error: "Il nome è obbligatorio" };
  if (!(importo > 0)) return { error: "L'importo deve essere maggiore di 0" };

  const res = await getDb()
    .prepare("update abbonamenti set nome = ?, importo = ?, note = ? where id = ? and user_id = ?")
    .bind(nome, importo, note, id, user.id)
    .run();
  if (res.meta.changes === 0) return { error: "Abbonamento non trovato" };

  return { ok: true };
}

async function cambiaStato(id: string, stato: "attivo" | "sospeso" | "disdetto", ripresa: boolean) {
  const user = await requireSessionUser();
  await getDb()
    .prepare(
      ripresa
        ? "update abbonamenti set stato = ?, data_ripresa = ? where id = ? and user_id = ?"
        : "update abbonamenti set stato = ? where id = ? and user_id = ?"
    )
    .bind(...(ripresa ? [stato, oggiISO(), id, user.id] : [stato, id, user.id]))
    .run();
}

/** Sospende: le rate si fermano, ma l'abbonamento resta e può essere riattivato. */
export async function sospendiAbbonamentoAction(id: string): Promise<void> {
  await cambiaStato(id, "sospeso", false);
}

/** Riattiva un abbonamento sospeso: la generazione riparte da oggi, senza recuperare le rate saltate. */
export async function riattivaAbbonamentoAction(id: string): Promise<void> {
  await cambiaStato(id, "attivo", true);
}

/** Disdice l'abbonamento: le rate già generate restano, ma non ne verranno create di nuove. Definitivo. */
export async function disdiciAbbonamentoAction(id: string): Promise<void> {
  await cambiaStato(id, "disdetto", false);
}

/** Elimina l'abbonamento e, in cascata, tutte le sue rate. Irreversibile. */
export async function eliminaAbbonamentoAction(id: string): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare("delete from abbonamenti where id = ? and user_id = ?")
    .bind(id, user.id)
    .run();
}

/** Somma delle rate già pagate di tutti gli abbonamenti dell'utente. */
export async function totaleRatePagate(): Promise<{ totale: number; count: number }> {
  const user = await requireSessionUser();
  const row = await getDb()
    .prepare(
      `select coalesce(sum(importo), 0) as totale, count(*) as count
       from abbonamento_rate where user_id = ? and stato = 'pagata'`
    )
    .bind(user.id)
    .first<{ totale: number; count: number }>();
  return row ?? { totale: 0, count: 0 };
}

export async function segnaRataPagataAction(rataId: string): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare(
      "update abbonamento_rate set stato = 'pagata', data_pagamento = ? where id = ? and user_id = ?"
    )
    .bind(oggiISO(), rataId, user.id)
    .run();
}

export async function segnaRataDaPagareAction(rataId: string): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare(
      "update abbonamento_rate set stato = 'da_pagare', data_pagamento = null where id = ? and user_id = ?"
    )
    .bind(rataId, user.id)
    .run();
}

/** Una voce dell'elenco "prossime rate" mostrato in dashboard. */
export interface ProssimaRata {
  abbonamento_id: string;
  nome: string;
  data_scadenza: string;
  importo: number;
  /** Rata gia' scaduta e non ancora segnata come pagata. */
  arretrata: boolean;
}

export interface RiepilogoAbbonamenti {
  /** Spesa mensile equivalente degli abbonamenti attivi. */
  totaleMensile: number;
  attivi: number;
  prossime: ProssimaRata[];
}

/** Quanto pesa al mese un abbonamento, qualunque sia la sua frequenza. */
const AL_MESE: Record<Frequenza, number> = {
  settimanale: 52 / 12,
  mensile: 1,
  bimestrale: 1 / 2,
  trimestrale: 1 / 3,
  semestrale: 1 / 6,
  annuale: 1 / 12,
};

/**
 * Tutto quello che serve al riquadro degli abbonamenti in una chiamata sola:
 * spesa mensile, quanti sono attivi e cosa si paga adesso.
 *
 * Per ogni abbonamento attivo la "prossima rata" e' la piu' vecchia non
 * ancora pagata se ce n'e' una (quella che si deve davvero), altrimenti la
 * data del prossimo addebito, calcolata dall'ultima rata generata: le rate
 * esistono nel database solo fino a oggi, quindi il futuro va ricavato dalla
 * frequenza.
 */
export async function riepilogoAbbonamenti(
  limite = 4
): Promise<RiepilogoAbbonamenti> {
  const user = await requireSessionUser();
  const abbonamenti = await listAbbonamenti(); // genera anche le rate mancanti
  const attivi = abbonamenti.filter((a) => a.stato === "attivo");
  const db = getDb();

  const { results: daPagare } = await db
    .prepare(
      `select abbonamento_id, min(data_scadenza) as data_scadenza, importo
         from abbonamento_rate
        where user_id = ? and stato = 'da_pagare'
        group by abbonamento_id`
    )
    .bind(user.id)
    .all<{ abbonamento_id: string; data_scadenza: string; importo: number }>();

  const { results: ultime } = await db
    .prepare(
      `select abbonamento_id, max(data_scadenza) as ultima
         from abbonamento_rate
        where user_id = ?
        group by abbonamento_id`
    )
    .bind(user.id)
    .all<{ abbonamento_id: string; ultima: string }>();

  const arretrate = new Map((daPagare ?? []).map((r) => [r.abbonamento_id, r]));
  const ultimaRata = new Map((ultime ?? []).map((r) => [r.abbonamento_id, r.ultima]));
  const oggi = oggiIso();

  const prossime: ProssimaRata[] = attivi.map((a) => {
    const aperta = arretrate.get(a.id);
    if (aperta) {
      return {
        abbonamento_id: a.id,
        nome: a.nome,
        data_scadenza: aperta.data_scadenza,
        importo: Number(aperta.importo),
        arretrata: aperta.data_scadenza <= oggi,
      };
    }
    const ultima = ultimaRata.get(a.id);
    return {
      abbonamento_id: a.id,
      nome: a.nome,
      data_scadenza: ultima
        ? prossimaData(ultima, a.frequenza)
        : a.data_ripresa ?? a.data_inizio,
      importo: Number(a.importo),
      arretrata: false,
    };
  });

  prossime.sort((x, y) => x.data_scadenza.localeCompare(y.data_scadenza));

  return {
    totaleMensile: attivi.reduce(
      (s, a) => s + Number(a.importo) * (AL_MESE[a.frequenza] ?? 1),
      0
    ),
    attivi: attivi.length,
    prossime: prossime.slice(0, limite),
  };
}
