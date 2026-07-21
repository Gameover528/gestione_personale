export type Pasto = "colazione" | "pranzo" | "cena" | "spuntino";

export const PASTI: { value: Pasto; label: string }[] = [
  { value: "colazione", label: "Colazione" },
  { value: "pranzo", label: "Pranzo" },
  { value: "cena", label: "Cena" },
  { value: "spuntino", label: "Spuntino" },
];

export type Nutriente =
  | "kcal"
  | "proteine"
  | "carboidrati"
  | "grassi"
  | "fibre"
  | "zuccheri"
  | "sale";

export const NUTRIENTI: {
  value: Nutriente;
  label: string;
  unita: string;
  defaultTipo: "min" | "max";
}[] = [
  { value: "kcal", label: "Calorie", unita: "kcal", defaultTipo: "max" },
  { value: "proteine", label: "Proteine", unita: "g", defaultTipo: "min" },
  { value: "carboidrati", label: "Carboidrati", unita: "g", defaultTipo: "max" },
  { value: "grassi", label: "Grassi", unita: "g", defaultTipo: "max" },
  { value: "fibre", label: "Fibre", unita: "g", defaultTipo: "min" },
  { value: "zuccheri", label: "Zuccheri", unita: "g", defaultTipo: "max" },
  { value: "sale", label: "Sale", unita: "g", defaultTipo: "max" },
];

export interface ValoriNutrizionali {
  kcal: number;
  proteine: number;
  carboidrati: number;
  grassi: number;
  fibre: number;
  zuccheri: number;
  sale: number;
}

export interface AlimentoRicerca {
  nome: string;
  marca: string;
  fonte: "off" | "usda" | "piatto";
  per100: ValoriNutrizionali;
}

export interface PastoDiario {
  id: string;
  user_id: string;
  data: string;
  pasto: Pasto;
  nome_alimento: string;
  marca: string | null;
  quantita_g: number;
  kcal_100: number;
  proteine_100: number;
  carboidrati_100: number;
  grassi_100: number;
  fibre_100: number;
  zuccheri_100: number;
  sale_100: number;
  fonte: string | null;
  created_at: string;
}

export interface PastoDiarioInput {
  data: string;
  pasto: Pasto;
  nome_alimento: string;
  marca: string | null;
  quantita_g: number;
  kcal_100: number;
  proteine_100: number;
  carboidrati_100: number;
  grassi_100: number;
  fibre_100: number;
  zuccheri_100: number;
  sale_100: number;
  fonte: string | null;
}

export interface Obiettivo {
  nutriente: Nutriente;
  valore: number;
  tipo: "min" | "max";
}

export interface ConValori100 {
  quantita_g: number;
  kcal_100: number;
  proteine_100: number;
  carboidrati_100: number;
  grassi_100: number;
  fibre_100: number;
  zuccheri_100: number;
  sale_100: number;
}

/** Valori effettivi in base alla quantita' in grammi (riga di diario o ingrediente). */
export function valoriPorzione(p: ConValori100): ValoriNutrizionali {
  const f = Number(p.quantita_g) / 100;
  return {
    kcal: Number(p.kcal_100) * f,
    proteine: Number(p.proteine_100) * f,
    carboidrati: Number(p.carboidrati_100) * f,
    grassi: Number(p.grassi_100) * f,
    fibre: Number(p.fibre_100) * f,
    zuccheri: Number(p.zuccheri_100) * f,
    sale: Number(p.sale_100) * f,
  };
}

export function sommaValori(list: ValoriNutrizionali[]): ValoriNutrizionali {
  return list.reduce(
    (a, v) => ({
      kcal: a.kcal + v.kcal,
      proteine: a.proteine + v.proteine,
      carboidrati: a.carboidrati + v.carboidrati,
      grassi: a.grassi + v.grassi,
      fibre: a.fibre + v.fibre,
      zuccheri: a.zuccheri + v.zuccheri,
      sale: a.sale + v.sale,
    }),
    { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0, fibre: 0, zuccheri: 0, sale: 0 }
  );
}

export interface Piatto {
  id: string;
  user_id: string;
  nome: string;
  created_at: string;
}

export interface PiattoIngrediente extends ConValori100 {
  id: string;
  piatto_id: string;
  user_id: string;
  nome_alimento: string;
  marca: string | null;
  fonte: string | null;
}

export interface PiattoConIngredienti extends Piatto {
  ingredienti: PiattoIngrediente[];
}

export function pesoPiatto(ings: ConValori100[]): number {
  return ings.reduce((s, i) => s + Number(i.quantita_g), 0);
}

export function totaliPiatto(ings: ConValori100[]): ValoriNutrizionali {
  return sommaValori(ings.map(valoriPorzione));
}

/** Valori del piatto normalizzati per 100 g (totale / peso * 100). */
export function per100Piatto(ings: ConValori100[]): ValoriNutrizionali {
  const peso = pesoPiatto(ings);
  const tot = totaliPiatto(ings);
  if (peso <= 0)
    return { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0, fibre: 0, zuccheri: 0, sale: 0 };
  const k = 100 / peso;
  return {
    kcal: tot.kcal * k,
    proteine: tot.proteine * k,
    carboidrati: tot.carboidrati * k,
    grassi: tot.grassi * k,
    fibre: tot.fibre * k,
    zuccheri: tot.zuccheri * k,
    sale: tot.sale * k,
  };
}

export function pastoLabel(p: Pasto) {
  return PASTI.find((x) => x.value === p)?.label ?? p;
}
