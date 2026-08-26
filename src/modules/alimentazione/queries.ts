"use server";

import { getDb } from "@/lib/cf";
import { requireSessionUser } from "@/lib/auth/session";
import type {
  PastoDiario,
  PastoDiarioInput,
  Obiettivo,
  Nutriente,
  AlimentoRicerca,
  Piatto,
  PiattoIngrediente,
  PiattoConIngredienti,
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

export async function addPasto(input: PastoDiarioInput): Promise<void> {
  const user = await requireSessionUser();
  const id = crypto.randomUUID();
  await getDb()
    .prepare(
      `insert into diario_pasti
        (id, user_id, data, pasto, nome_alimento, marca, quantita_g,
         kcal_100, proteine_100, carboidrati_100, grassi_100, fibre_100, zuccheri_100, sale_100, fonte)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      user.id,
      input.data,
      input.pasto,
      input.nome_alimento,
      input.marca,
      input.quantita_g,
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

async function cercaOFF(q: string): Promise<AlimentoRicerca[]> {
  const url =
    "https://it.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1" +
    "&page_size=20&sort_by=unique_scans_n&lc=it" +
    "&fields=product_name_it,product_name,brands,nutriments&search_terms=" +
    encodeURIComponent(q);
  try {
    const res = await fetchConRetry(url, {
      headers: { "User-Agent": "GestionePersonale/1.0", "Accept-Language": "it" },
    });
    const data = (await res.json()) as any;
    const prodotti: any[] = data.products ?? [];
    return prodotti
      .map((p) => {
        const nome = String(p.product_name_it || p.product_name || "").trim();
        const nu = p.nutriments ?? {};
        return {
          nome,
          marca: p.brands ? String(p.brands).split(",")[0].trim() : "",
          fonte: "off" as const,
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
  } catch {
    return [];
  }
}

async function cercaUSDA(q: string): Promise<AlimentoRicerca[]> {
  const key = process.env.USDA_API_KEY;
  if (!key) return [];
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
    return foods.map((f) => {
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
  } catch {
    return [];
  }
}

export async function cercaAlimenti(q: string): Promise<AlimentoRicerca[]> {
  const query = q.trim();
  if (query.length < 2) return [];

  const chiave = query.toLowerCase();
  const db = getDb();

  const cached = await db
    .prepare("select risultati from alimenti_cache where query = ?")
    .bind(chiave)
    .first<{ risultati: string }>();

  if (cached) {
    try {
      return JSON.parse(cached.risultati) as AlimentoRicerca[];
    } catch {
      // cache corrotta: ignora e ricerca dal vivo
    }
  }

  const [off, usda] = await Promise.all([cercaOFF(query), cercaUSDA(query)]);
  const risultati = [...off, ...usda].slice(0, 30);

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

  return risultati;
}

// ----------------------- Piatti (ricette) -----------------------
export type IngredienteInput = Omit<
  PiattoIngrediente,
  "id" | "piatto_id" | "user_id"
>;

export async function listPiatti(): Promise<Piatto[]> {
  const user = await requireSessionUser();
  const { results } = await getDb()
    .prepare("select * from piatti where user_id = ? order by nome asc")
    .bind(user.id)
    .all<Piatto>();
  return results ?? [];
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

export async function createPiatto(
  nome: string,
  ingredienti: IngredienteInput[]
): Promise<void> {
  const user = await requireSessionUser();
  const db = getDb();
  const id = crypto.randomUUID();

  await db
    .prepare("insert into piatti (id, user_id, nome) values (?, ?, ?)")
    .bind(id, user.id, nome)
    .run();

  await inserisciIngredienti(db, id, user.id, ingredienti);
}

export async function updatePiatto(
  id: string,
  nome: string,
  ingredienti: IngredienteInput[]
): Promise<void> {
  const user = await requireSessionUser();
  const db = getDb();

  await db
    .prepare("update piatti set nome = ? where id = ? and user_id = ?")
    .bind(nome, id, user.id)
    .run();

  await db
    .prepare("delete from piatto_ingredienti where piatto_id = ? and user_id = ?")
    .bind(id, user.id)
    .run();

  await inserisciIngredienti(db, id, user.id, ingredienti);
}

export async function deletePiatto(id: string): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare("delete from piatti where id = ? and user_id = ?")
    .bind(id, user.id)
    .run();
}
