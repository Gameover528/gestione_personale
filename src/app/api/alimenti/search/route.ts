import { NextResponse } from "next/server";
import type { AlimentoRicerca, ValoriNutrizionali } from "@/modules/alimentazione/types";

// Scarta nomi con alfabeti non latini (arabo, ebraico, cirillico, CJK, ecc.)
const NON_LATINO =
  /[֐-׿؀-ۿЀ-ӿ一-鿿぀-ヿ가-힯]/;

function n(v: unknown): number {
  const x = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(x) ? Number(x) : 0;
}

async function cercaOFF(q: string): Promise<AlimentoRicerca[]> {
  // Edizione italiana: prodotti venduti in Italia, nomi in italiano.
  const url =
    "https://it.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1" +
    "&page_size=20&sort_by=unique_scans_n&lc=it" +
    "&fields=product_name_it,product_name,brands,nutriments&search_terms=" +
    encodeURIComponent(q);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "GestionePersonale/1.0",
        "Accept-Language": "it",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const prodotti: any[] = data.products ?? [];
    return prodotti
      .map((p) => {
        const nome = String(p.product_name_it || p.product_name || "").trim();
        const nu = p.nutriments ?? {};
        const per100: ValoriNutrizionali = {
          kcal: n(nu["energy-kcal_100g"]),
          proteine: n(nu["proteins_100g"]),
          carboidrati: n(nu["carbohydrates_100g"]),
          grassi: n(nu["fat_100g"]),
          fibre: n(nu["fiber_100g"]),
          zuccheri: n(nu["sugars_100g"]),
          sale: n(nu["salt_100g"]),
        };
        return {
          nome,
          marca: p.brands ? String(p.brands).split(",")[0].trim() : "",
          fonte: "off" as const,
          per100,
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
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const foods: any[] = data.foods ?? [];
    return foods.map((f) => {
      const by = (num: string) =>
        n(
          (f.foodNutrients ?? []).find(
            (x: any) => String(x.nutrientNumber) === num
          )?.value
        );
      const sodio = by("1093"); // mg
      const per100: ValoriNutrizionali = {
        kcal: by("1008"),
        proteine: by("1003"),
        carboidrati: by("1005"),
        grassi: by("1004"),
        fibre: by("1079"),
        zuccheri: by("2000"),
        sale: (sodio * 2.5) / 1000,
      };
      return {
        nome: String(f.description ?? "").toLowerCase(),
        marca: f.brandOwner ? String(f.brandOwner) : "",
        fonte: "usda" as const,
        per100,
      };
    });
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ risultati: [] });

  const [off, usda] = await Promise.all([cercaOFF(q), cercaUSDA(q)]);
  const risultati = [...off, ...usda].slice(0, 30);
  return NextResponse.json({ risultati });
}

export const dynamic = "force-dynamic";
