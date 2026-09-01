"use server";

import { getDb } from "@/lib/cf";
import { requireSessionUser } from "@/lib/auth/session";
import {
  da100,
  scalaValori,
  piattoComeAlimento,
  VALORI_ZERO,
  type Valori100,
  type PastoDiario,
  type PastoDiarioInput,
  type Obiettivo,
  type Nutriente,
  type AlimentoRicerca,
  type Pasto,
  type Piatto,
  type PiattoInput,
  type PiattoConValori,
  type PiattoIngrediente,
  type PiattoConIngredienti,
  type ValoriNutrizionali,
  type GiornoValori,
  type DatiCorporei,
} from "./types";

export async function listPasti(data: string): Promise<PastoDiario[]> {
  const user = await requireSessionUser();
  const { results } = await getDb()
    .prepare(
      "select * from diario_pasti where user_id = ? and data = ? order by created_at asc"
    )
    .bind(user.id, data)
    .all<PastoDiario>();
  return results ?? [];
}

const COLONNE_PASTO = [
  "pasto",
  "nome_alimento",
  "marca",
  "quantita_g",
  "porzione_nome",
  "porzione_g",
  "kcal_100",
  "proteine_100",
  "carboidrati_100",
  "grassi_100",
  "fibre_100",
  "zuccheri_100",
  "sale_100",
  "fonte",
] as const;

export async function addPasto(input: PastoDiarioInput): Promise<void> {
  const user = await requireSessionUser();
  const id = crypto.randomUUID();
  await getDb()
    .prepare(
      `insert into diario_pasti
        (id, user_id, data, pasto, nome_alimento, marca, quantita_g, porzione_nome, porzione_g,
         kcal_100, proteine_100, carboidrati_100, grassi_100, fibre_100, zuccheri_100, sale_100, fonte)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      user.id,
      input.data,
      input.pasto,
      input.nome_alimento,
      input.marca,
      input.quantita_g,
      input.porzione_nome,
      input.porzione_g,
      input.kcal_100,
      input.proteine_100,
      input.carboidrati_100,
      input.grassi_100,
      input.fibre_100,
      input.zuccheri_100,
      input.sale_100,
      input.fonte
    )
    .run();
}

export async function deletePasto(id: string): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare("delete from diario_pasti where id = ? and user_id = ?")
    .bind(id, user.id)
    .run();
}

export async function updatePasto(
  id: string,
  patch: { quantita_g?: number; pasto?: string }
): Promise<void> {
  const user = await requireSessionUser();
  const fields = Object.keys(patch);
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => (patch as Record<string, unknown>)[f]);
  await getDb()
    .prepare(`update diario_pasti set ${setClause} where id = ? and user_id = ?`)
    .bind(...values, id, user.id)
    .run();
}

/**
 * Copia in un altro giorno i pasti indicati (uno, alcuni o tutti): serve per
 * "ho mangiato come ieri" senza reinserire riga per riga. Ritorna gli id delle
 * righe create, così chi chiama può offrire un annulla.
 */
export async function copiaGiorno(
  da: string,
  a: string,
  pasti: Pasto[]
): Promise<string[]> {
  const user = await requireSessionUser();
  if (pasti.length === 0) return [];
  const db = getDb();

  const segnaposti = pasti.map(() => "?").join(", ");
  const { results } = await db
    .prepare(
      `select ${COLONNE_PASTO.join(", ")}
         from diario_pasti
        where user_id = ? and data = ? and pasto in (${segnaposti})
        order by created_at asc`
    )
    .bind(user.id, da, ...pasti)
    .all<Record<string, unknown>>();

  const righe = results ?? [];
  if (righe.length === 0) return [];

  const stmt = db.prepare(
    `insert into diario_pasti (id, user_id, data, ${COLONNE_PASTO.join(", ")})
     values (?, ?, ?, ${COLONNE_PASTO.map(() => "?").join(", ")})`
  );
  const ids = righe.map(() => crypto.randomUUID());
  await db.batch(
    righe.map((r, i) =>
      stmt.bind(ids[i], user.id, a, ...COLONNE_PASTO.map((c) => r[c] ?? null))
    )
  );
  return ids;
}

/** Elimina più righe di diario in un colpo (usata per annullare una copia). */
export async function deletePasti(ids: string[]): Promise<void> {
  const user = await requireSessionUser();
  if (ids.length === 0) return;
  const db = getDb();
  const stmt = db.prepare("delete from diario_pasti where id = ? and user_id = ?");
  await db.batch(ids.map((id) => stmt.bind(id, user.id)));
}

/**
 * Reinserisce una riga eliminata mantenendo id e data di creazione: così
 * l'annulla riporta il diario esattamente come era, anche nell'ordine.
 */
export async function ripristinaPasto(riga: PastoDiario): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare(
      `insert into diario_pasti (id, user_id, data, ${COLONNE_PASTO.join(", ")}, created_at)
       values (?, ?, ?, ${COLONNE_PASTO.map(() => "?").join(", ")}, ?)`
    )
    .bind(
      riga.id,
      user.id,
      riga.data,
      ...COLONNE_PASTO.map(
        (c) => (riga as unknown as Record<string, unknown>)[c] ?? null
      ),
      riga.created_at
    )
    .run();
}

/**
 * Cerca una riga già registrata per lo stesso alimento nello stesso pasto:
 * serve a proporre di sommare la quantità invece di creare un doppione.
 */
export async function trovaPastoEsistente(
  data: string,
  pasto: Pasto,
  nome_alimento: string,
  marca: string | null
): Promise<PastoDiario | null> {
  const user = await requireSessionUser();
  const riga = await getDb()
    .prepare(
      `select * from diario_pasti
        where user_id = ? and data = ? and pasto = ?
          and lower(nome_alimento) = lower(?)
          and coalesce(marca, '') = coalesce(?, '')
        order by created_at desc
        limit 1`
    )
    .bind(user.id, data, pasto, nome_alimento, marca)
    .first<PastoDiario>();
  return riga ?? null;
}

/**
 * Alimenti usati piu' di recente, uno per nome+marca, con l'ultima quantita'
 * e porzione usate: permette di riaggiungere una voce ricorrente in un tap.
 *
 * Le colonne "nude" accanto a max(created_at) sono prese dalla riga con il
 * valore massimo: e' un comportamento garantito da SQLite quando l'unica
 * aggregazione della query e' un min() o max().
 */
interface RigaRecente extends Valori100 {
  nome_alimento: string;
  marca: string | null;
  fonte: string | null;
  quantita_g: number;
  porzione_nome: string | null;
  porzione_g: number | null;
  ultimo: string;
}

export async function listRecenti(limite = 20): Promise<AlimentoRicerca[]> {
  const user = await requireSessionUser();
  const { results } = await getDb()
    .prepare(
      `select nome_alimento, marca, fonte, quantita_g, porzione_nome, porzione_g,
              kcal_100, proteine_100, carboidrati_100, grassi_100,
              fibre_100, zuccheri_100, sale_100,
              max(created_at) as ultimo
         from diario_pasti
        where user_id = ?
        group by nome_alimento, coalesce(marca, '')
        order by ultimo desc
        limit ?`
    )
    .bind(user.id, limite)
    .all<RigaRecente>();

  return (results ?? []).map((r) => ({
    nome: r.nome_alimento,
    marca: r.marca ?? "",
    fonte: r.fonte ?? "manuale",
    per100: da100(r),
    porzione_nome: r.porzione_nome,
    porzione_g: r.porzione_g,
    quantita_default_g: Number(r.quantita_g),
  }));
}

/**
 * Totali giorno per giorno negli ultimi `giorni` giorni (oggi incluso).
 * I giorni senza registrazioni non compaiono: chi disegna il grafico li
 * riempie a zero.
 */
export async function statistichePeriodo(giorni: number): Promise<GiornoValori[]> {
  const user = await requireSessionUser();
  const oggi = new Date();
  const inizio = new Date(oggi);
  inizio.setUTCDate(inizio.getUTCDate() - (Math.max(1, giorni) - 1));

  const { results } = await getDb()
    .prepare(
      `select data,
              sum(quantita_g * kcal_100)        / 100 as kcal,
              sum(quantita_g * proteine_100)    / 100 as proteine,
              sum(quantita_g * carboidrati_100) / 100 as carboidrati,
              sum(quantita_g * grassi_100)      / 100 as grassi,
              sum(quantita_g * fibre_100)       / 100 as fibre,
              sum(quantita_g * zuccheri_100)    / 100 as zuccheri,
              sum(quantita_g * sale_100)        / 100 as sale
         from diario_pasti
        where user_id = ? and data >= ? and data <= ?
        group by data
        order by data asc`
    )
    .bind(user.id, inizio.toISOString().slice(0, 10), oggi.toISOString().slice(0, 10))
    .all<GiornoValori>();

  return (results ?? []).map((g) => ({
    data: g.data,
    kcal: Number(g.kcal),
    proteine: Number(g.proteine),
    carboidrati: Number(g.carboidrati),
    grassi: Number(g.grassi),
    fibre: Number(g.fibre),
    zuccheri: Number(g.zuccheri),
    sale: Number(g.sale),
  }));
}

export async function getObiettivi(): Promise<Obiettivo[]> {
  const user = await requireSessionUser();
  const { results } = await getDb()
    .prepare(
      "select nutriente, valore, tipo from obiettivi_nutrizionali where user_id = ?"
    )
    .bind(user.id)
    .all<{ nutriente: string; valore: number; tipo: string }>();
  return (results ?? []).map((o: { nutriente: string; valore: number; tipo: string }) => ({
    nutriente: o.nutriente as Nutriente,
    valore: Number(o.valore),
    tipo: (o.tipo as "min" | "max") ?? "max",
  }));
}

export async function saveObiettivi(list: Obiettivo[]): Promise<void> {
  const user = await requireSessionUser();
  const db = getDb();
  const statements = list.map((o) =>
    db
      .prepare(
        `insert into obiettivi_nutrizionali (user_id, nutriente, valore, tipo)
         values (?, ?, ?, ?)
         on conflict (user_id, nutriente) do update set valore = excluded.valore, tipo = excluded.tipo`
      )
      .bind(user.id, o.nutriente, o.valore, o.tipo)
  );
  if (statements.length > 0) await db.batch(statements);
}

// Scarta nomi con alfabeti non latini (arabo, ebraico, cirillico, CJK, ecc.)
const NON_LATINO =
  /[֐-׿؀-ۿЀ-ӿ一-鿿぀-ヿ가-힯]/;

/**
 * Fetch con retry: Open Food Facts in particolare risponde in modo
 * incostante, quindi ritentiamo un paio di volte con una breve attesa
 * prima di arrendersi (il risultato, una volta ottenuto, finisce in
 * cache e non richiede più questa chiamata per lo stesso termine).
 */
async function fetchConRetry(
  url: string,
  options?: RequestInit,
  tentativi = 3,
  attesaMs = 400
): Promise<Response> {
  let ultimoErrore: unknown;
  for (let i = 0; i < tentativi; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      ultimoErrore = new Error(`HTTP ${res.status}`);
    } catch (err) {
      ultimoErrore = err;
    }
    if (i < tentativi - 1) {
      await new Promise((r) => setTimeout(r, attesaMs));
    }
  }
  throw ultimoErrore;
}

function n(v: unknown): number {
  const x = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(x) ? Number(x) : 0;
}

/** Porzione dichiarata da Open Food Facts, se plausibile (in grammi). */
function porzioneOFF(p: Record<string, unknown>): number | null {
  const g = n(p.serving_quantity);
  return g >= 5 && g <= 2000 ? Math.round(g) : null;
}

/**
 * Esito di una fonte esterna. `errore` distingue "non ha risposto" da
 * "ha risposto che non c'e' niente": all'utente vanno detti in modo diverso.
 */
interface EsitoFonte {
  risultati: AlimentoRicerca[];
  errore: boolean;
}

async function cercaOFF(q: string): Promise<EsitoFonte> {
  const url =
    "https://it.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1" +
    "&page_size=20&sort_by=unique_scans_n&lc=it" +
    "&fields=product_name_it,product_name,brands,serving_quantity,nutriments&search_terms=" +
    encodeURIComponent(q);
  try {
    const res = await fetchConRetry(url, {
      headers: { "User-Agent": "GestionePersonale/1.0", "Accept-Language": "it" },
    });
    const data = (await res.json()) as any;
    const prodotti: any[] = data.products ?? [];
    const risultati = prodotti
      .map((p) => {
        const nome = String(p.product_name_it || p.product_name || "").trim();
        const nu = p.nutriments ?? {};
        const porzione = porzioneOFF(p);
        return {
          nome,
          marca: p.brands ? String(p.brands).split(",")[0].trim() : "",
          fonte: "off" as const,
          porzione_nome: porzione ? "porzione" : null,
          porzione_g: porzione,
          per100: {
            kcal: n(nu["energy-kcal_100g"]),
            proteine: n(nu["proteins_100g"]),
            carboidrati: n(nu["carbohydrates_100g"]),
            grassi: n(nu["fat_100g"]),
            fibre: n(nu["fiber_100g"]),
            zuccheri: n(nu["sugars_100g"]),
            sale: n(nu["salt_100g"]),
          },
        };
      })
      .filter((a) => a.nome && a.per100.kcal > 0 && !NON_LATINO.test(a.nome));
    return { risultati, errore: false };
  } catch {
    return { risultati: [], errore: true };
  }
}

async function cercaUSDA(q: string): Promise<EsitoFonte> {
  const key = process.env.USDA_API_KEY;
  // Chiave non configurata: la fonte non e' disponibile, ma non e' un errore.
  if (!key) return { risultati: [], errore: false };
  const url =
    "https://api.nal.usda.gov/fdc/v1/foods/search?pageSize=15" +
    "&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)" +
    "&api_key=" +
    encodeURIComponent(key) +
    "&query=" +
    encodeURIComponent(q);
  try {
    const res = await fetchConRetry(url);
    const data = (await res.json()) as any;
    const foods: any[] = data.foods ?? [];
    const risultati = foods.map((f) => {
      const by = (num: string) =>
        n((f.foodNutrients ?? []).find((x: any) => String(x.nutrientNumber) === num)?.value);
      const sodio = by("1093");
      return {
        nome: String(f.description ?? "").toLowerCase(),
        marca: f.brandOwner ? String(f.brandOwner) : "",
        fonte: "usda" as const,
        per100: {
          kcal: by("1008"),
          proteine: by("1003"),
          carboidrati: by("1005"),
          grassi: by("1004"),
          fibre: by("1079"),
          zuccheri: by("2000"),
          sale: (sodio * 2.5) / 1000,
        },
      };
    });
    return { risultati, errore: false };
  } catch {
    return { risultati: [], errore: true };
  }
}

export interface RisultatiEsterni {
  risultati: AlimentoRicerca[];
  /**
   * Vero quando non ci sono risultati perche' una fonte non ha risposto:
   * "nessun risultato" e "servizio non raggiungibile" richiedono messaggi
   * (e reazioni) diversi da parte di chi cerca.
   */
  irraggiungibile: boolean;
}

/**
 * Prima fase della ricerca: solo il proprio database di piatti. E' una query
 * locale, risponde subito, e ha la precedenza perche' e' dato personale e
 * verificato. Le fonti esterne arrivano dopo, con cercaAlimentiEsterni.
 */
export async function cercaAlimentiMiei(q: string): Promise<AlimentoRicerca[]> {
  const user = await requireSessionUser();
  const query = q.trim();
  if (query.length < 2) return [];
  return cercaPiattiPersonali(user.id, query);
}

/**
 * Seconda fase: Open Food Facts e USDA, passando dalla cache condivisa in
 * `alimenti_cache` (i dati nutrizionali non sono personali).
 */
export async function cercaAlimentiEsterni(q: string): Promise<RisultatiEsterni> {
  await requireSessionUser();
  const query = q.trim();
  if (query.length < 2) return { risultati: [], irraggiungibile: false };

  const chiave = query.toLowerCase();
  const db = getDb();

  const cached = await db
    .prepare("select risultati from alimenti_cache where query = ?")
    .bind(chiave)
    .first<{ risultati: string }>();

  if (cached) {
    try {
      return {
        risultati: JSON.parse(cached.risultati) as AlimentoRicerca[],
        irraggiungibile: false,
      };
    } catch {
      // cache corrotta: ignora e ricerca dal vivo
    }
  }

  const [off, usda] = await Promise.all([cercaOFF(query), cercaUSDA(query)]);
  const risultati = [...off.risultati, ...usda.risultati].slice(0, 30);

  // Salva in cache solo risultati non vuoti: se le API sono state
  // irraggiungibili non vogliamo bloccare per sempre un termine valido.
  if (risultati.length > 0) {
    await db
      .prepare(
        `insert into alimenti_cache (query, risultati, updated_at)
         values (?, ?, datetime('now'))
         on conflict (query) do update set risultati = excluded.risultati, updated_at = excluded.updated_at`
      )
      .bind(chiave, JSON.stringify(risultati))
      .run();
  }

  return {
    risultati,
    irraggiungibile: risultati.length === 0 && (off.errore || usda.errore),
  };
}

// ----------------------- Piatti (database personale) -----------------------
export type IngredienteInput = Omit<
  PiattoIngrediente,
  "id" | "piatto_id" | "user_id"
>;

/**
 * Riga di `piatti` con i totali degli ingredienti già aggregati in SQL:
 * evita una query per piatto quando serve l'elenco con i valori.
 */
interface PiattoAggregato extends Piatto {
  ing_peso: number;
  ing_kcal: number;
  ing_proteine: number;
  ing_carboidrati: number;
  ing_grassi: number;
  ing_fibre: number;
  ing_zuccheri: number;
  ing_sale: number;
}

const SELECT_PIATTI_CON_VALORI = `
  select p.*,
         coalesce(sum(i.quantita_g), 0)                       as ing_peso,
         coalesce(sum(i.quantita_g * i.kcal_100), 0)        / 100 as ing_kcal,
         coalesce(sum(i.quantita_g * i.proteine_100), 0)    / 100 as ing_proteine,
         coalesce(sum(i.quantita_g * i.carboidrati_100), 0) / 100 as ing_carboidrati,
         coalesce(sum(i.quantita_g * i.grassi_100), 0)      / 100 as ing_grassi,
         coalesce(sum(i.quantita_g * i.fibre_100), 0)       / 100 as ing_fibre,
         coalesce(sum(i.quantita_g * i.zuccheri_100), 0)    / 100 as ing_zuccheri,
         coalesce(sum(i.quantita_g * i.sale_100), 0)        / 100 as ing_sale
    from piatti p
    left join piatto_ingredienti i on i.piatto_id = p.id
`;

function risolviPiatto(r: PiattoAggregato): PiattoConValori {
  const {
    ing_peso,
    ing_kcal,
    ing_proteine,
    ing_carboidrati,
    ing_grassi,
    ing_fibre,
    ing_zuccheri,
    ing_sale,
    ...piatto
  } = r;

  if (piatto.tipo === "diretto") {
    return {
      ...piatto,
      per100: da100(piatto),
      peso_g: Number(piatto.porzione_g ?? 0),
    };
  }

  const peso = Number(ing_peso ?? 0);
  const totali: ValoriNutrizionali = {
    kcal: Number(ing_kcal),
    proteine: Number(ing_proteine),
    carboidrati: Number(ing_carboidrati),
    grassi: Number(ing_grassi),
    fibre: Number(ing_fibre),
    zuccheri: Number(ing_zuccheri),
    sale: Number(ing_sale),
  };
  return {
    ...piatto,
    per100: peso > 0 ? scalaValori(totali, 100 / peso) : { ...VALORI_ZERO },
    peso_g: peso,
  };
}

export async function listPiatti(): Promise<PiattoConValori[]> {
  const user = await requireSessionUser();
  const { results } = await getDb()
    .prepare(`${SELECT_PIATTI_CON_VALORI} where p.user_id = ? group by p.id order by p.nome asc`)
    .bind(user.id)
    .all<PiattoAggregato>();
  return (results ?? []).map(risolviPiatto);
}

/** Piatti personali il cui nome (o marca) contiene il termine cercato. */
async function cercaPiattiPersonali(
  userId: string,
  query: string
): Promise<AlimentoRicerca[]> {
  // I caratteri jolly di LIKE vanno neutralizzati, altrimenti "100%" o "a_b"
  // cercherebbero qualcosa di diverso da quello che l'utente ha scritto.
  const termine = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const { results } = await getDb()
    .prepare(
      `${SELECT_PIATTI_CON_VALORI}
        where p.user_id = ?
          and (p.nome like ? escape '\\' or coalesce(p.marca, '') like ? escape '\\')
        group by p.id
        order by p.nome asc
        limit 15`
    )
    .bind(userId, termine, termine)
    .all<PiattoAggregato>();

  return (results ?? []).map(risolviPiatto).map(piattoComeAlimento);
}

export async function getPiatto(id: string): Promise<PiattoConIngredienti> {
  const user = await requireSessionUser();
  const db = getDb();

  const piatto = await db
    .prepare("select * from piatti where id = ? and user_id = ?")
    .bind(id, user.id)
    .first<Piatto>();
  if (!piatto) throw new Error("Piatto non trovato");

  const { results } = await db
    .prepare("select * from piatto_ingredienti where piatto_id = ? and user_id = ?")
    .bind(id, user.id)
    .all<PiattoIngrediente>();

  return { ...piatto, ingredienti: results ?? [] };
}

async function inserisciIngredienti(
  db: D1Database,
  piattoId: string,
  userId: string,
  ingredienti: IngredienteInput[]
) {
  if (ingredienti.length === 0) return;
  const statements = ingredienti.map((i) =>
    db
      .prepare(
        `insert into piatto_ingredienti
          (id, piatto_id, user_id, nome_alimento, marca, quantita_g,
           kcal_100, proteine_100, carboidrati_100, grassi_100, fibre_100, zuccheri_100, sale_100, fonte)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        piattoId,
        userId,
        i.nome_alimento,
        i.marca,
        i.quantita_g,
        i.kcal_100,
        i.proteine_100,
        i.carboidrati_100,
        i.grassi_100,
        i.fibre_100,
        i.zuccheri_100,
        i.sale_100,
        i.fonte
      )
  );
  await db.batch(statements);
}

/** Valori per 100 g da salvare sulla riga del piatto: solo se e' di tipo diretto. */
function valoriDaSalvare(input: PiattoInput): ValoriNutrizionali {
  return input.tipo === "diretto" ? input.valori100 : { ...VALORI_ZERO };
}

export async function createPiatto(
  input: PiattoInput,
  ingredienti: IngredienteInput[]
): Promise<string> {
  const user = await requireSessionUser();
  const db = getDb();
  const id = crypto.randomUUID();
  const v = valoriDaSalvare(input);

  await db
    .prepare(
      `insert into piatti
        (id, user_id, nome, marca, tipo, porzione_nome, porzione_g,
         kcal_100, proteine_100, carboidrati_100, grassi_100, fibre_100, zuccheri_100, sale_100)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      user.id,
      input.nome,
      input.marca,
      input.tipo,
      input.porzione_nome,
      input.porzione_g,
      v.kcal,
      v.proteine,
      v.carboidrati,
      v.grassi,
      v.fibre,
      v.zuccheri,
      v.sale
    )
    .run();

  if (input.tipo === "composto") {
    await inserisciIngredienti(db, id, user.id, ingredienti);
  }
  return id;
}

export async function updatePiatto(
  id: string,
  input: PiattoInput,
  ingredienti: IngredienteInput[]
): Promise<void> {
  const user = await requireSessionUser();
  const db = getDb();
  const v = valoriDaSalvare(input);

  await db
    .prepare(
      `update piatti
          set nome = ?, marca = ?, tipo = ?, porzione_nome = ?, porzione_g = ?,
              kcal_100 = ?, proteine_100 = ?, carboidrati_100 = ?, grassi_100 = ?,
              fibre_100 = ?, zuccheri_100 = ?, sale_100 = ?
        where id = ? and user_id = ?`
    )
    .bind(
      input.nome,
      input.marca,
      input.tipo,
      input.porzione_nome,
      input.porzione_g,
      v.kcal,
      v.proteine,
      v.carboidrati,
      v.grassi,
      v.fibre,
      v.zuccheri,
      v.sale,
      id,
      user.id
    )
    .run();

  // Gli ingredienti vengono riscritti da zero; per un piatto diretto la
  // cancellazione ripulisce quelli eventualmente rimasti da quando era composto.
  await db
    .prepare("delete from piatto_ingredienti where piatto_id = ? and user_id = ?")
    .bind(id, user.id)
    .run();

  if (input.tipo === "composto") {
    await inserisciIngredienti(db, id, user.id, ingredienti);
  }
}

export async function deletePiatto(id: string): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare("delete from piatti where id = ? and user_id = ?")
    .bind(id, user.id)
    .run();
}

/**
 * Reinserisce un piatto eliminato con i suoi ingredienti, conservando gli id
 * originali (serve all'annulla dopo l'eliminazione dalla lista).
 */
export async function ripristinaPiatto(
  piatto: PiattoConIngredienti
): Promise<void> {
  const user = await requireSessionUser();
  const db = getDb();

  await db
    .prepare(
      `insert into piatti
        (id, user_id, nome, marca, tipo, porzione_nome, porzione_g,
         kcal_100, proteine_100, carboidrati_100, grassi_100, fibre_100, zuccheri_100, sale_100, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      piatto.id,
      user.id,
      piatto.nome,
      piatto.marca,
      piatto.tipo,
      piatto.porzione_nome,
      piatto.porzione_g,
      piatto.kcal_100,
      piatto.proteine_100,
      piatto.carboidrati_100,
      piatto.grassi_100,
      piatto.fibre_100,
      piatto.zuccheri_100,
      piatto.sale_100,
      piatto.created_at
    )
    .run();

  if (piatto.ingredienti.length === 0) return;
  const stmt = db.prepare(
    `insert into piatto_ingredienti
      (id, piatto_id, user_id, nome_alimento, marca, quantita_g,
       kcal_100, proteine_100, carboidrati_100, grassi_100, fibre_100, zuccheri_100, sale_100, fonte)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  await db.batch(
    piatto.ingredienti.map((i) =>
      stmt.bind(
        i.id,
        piatto.id,
        user.id,
        i.nome_alimento,
        i.marca,
        i.quantita_g,
        i.kcal_100,
        i.proteine_100,
        i.carboidrati_100,
        i.grassi_100,
        i.fibre_100,
        i.zuccheri_100,
        i.sale_100,
        i.fonte
      )
    )
  );
}

// ----------------------- Dati corporei (calcolo obiettivi) -----------------------
const CHIAVE_CORPO = "alimentazione:corpo";

/** Dati usati per proporre gli obiettivi, salvati tra le preferenze utente. */
export async function getDatiCorporei(): Promise<DatiCorporei | null> {
  const user = await requireSessionUser();
  const row = await getDb()
    .prepare("select value from user_preferences where user_id = ? and key = ?")
    .bind(user.id, CHIAVE_CORPO)
    .first<{ value: string }>();
  if (!row) return null;
  try {
    return JSON.parse(row.value) as DatiCorporei;
  } catch {
    return null;
  }
}

export async function saveDatiCorporei(dati: DatiCorporei): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare(
      `insert into user_preferences (user_id, key, value, updated_at)
       values (?, ?, ?, datetime('now'))
       on conflict (user_id, key) do update set value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(user.id, CHIAVE_CORPO, JSON.stringify(dati))
    .run();
}
