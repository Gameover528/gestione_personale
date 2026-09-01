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

export const VALORI_ZERO: ValoriNutrizionali = {
  kcal: 0,
  proteine: 0,
  carboidrati: 0,
  grassi: 0,
  fibre: 0,
  zuccheri: 0,
  sale: 0,
};

/** Gli stessi nutrienti come sono salvati su database: sempre per 100 g. */
export interface Valori100 {
  kcal_100: number;
  proteine_100: number;
  carboidrati_100: number;
  grassi_100: number;
  fibre_100: number;
  zuccheri_100: number;
  sale_100: number;
}

export function da100(v: Valori100): ValoriNutrizionali {
  return {
    kcal: Number(v.kcal_100),
    proteine: Number(v.proteine_100),
    carboidrati: Number(v.carboidrati_100),
    grassi: Number(v.grassi_100),
    fibre: Number(v.fibre_100),
    zuccheri: Number(v.zuccheri_100),
    sale: Number(v.sale_100),
  };
}

export function a100(v: ValoriNutrizionali): Valori100 {
  return {
    kcal_100: v.kcal,
    proteine_100: v.proteine,
    carboidrati_100: v.carboidrati,
    grassi_100: v.grassi,
    fibre_100: v.fibre,
    zuccheri_100: v.zuccheri,
    sale_100: v.sale,
  };
}

export interface AlimentoRicerca {
  nome: string;
  marca: string;
  /** off | usda | piatto | manuale (le righe di diario possono averne altre). */
  fonte: string;
  per100: ValoriNutrizionali;
  /** Piatto personale di origine, se la voce viene dal proprio database. */
  piatto_id?: string | null;
  /** Porzione standard, se conosciuta: "1 <porzione_nome> = <porzione_g> g". */
  porzione_nome?: string | null;
  porzione_g?: number | null;
  /** Quantita' da proporre nel form (es. l'ultima usata, per i recenti). */
  quantita_default_g?: number | null;
}

export function fonteLabel(fonte: string | null | undefined): string {
  switch (fonte) {
    case "off":
      return "Open Food Facts";
    case "usda":
      return "USDA";
    case "piatto":
      return "piatto mio";
    case "manuale":
      return "inserito a mano";
    default:
      return fonte ?? "";
  }
}

export interface PastoDiario extends Valori100 {
  id: string;
  user_id: string;
  data: string;
  pasto: Pasto;
  nome_alimento: string;
  marca: string | null;
  quantita_g: number;
  porzione_nome: string | null;
  porzione_g: number | null;
  fonte: string | null;
  created_at: string;
}

export interface PastoDiarioInput extends Valori100 {
  data: string;
  pasto: Pasto;
  nome_alimento: string;
  marca: string | null;
  quantita_g: number;
  porzione_nome: string | null;
  porzione_g: number | null;
  fonte: string | null;
}

export interface Obiettivo {
  nutriente: Nutriente;
  valore: number;
  tipo: "min" | "max";
}

export interface ConValori100 extends Valori100 {
  quantita_g: number;
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
    { ...VALORI_ZERO }
  );
}

export function scalaValori(v: ValoriNutrizionali, k: number): ValoriNutrizionali {
  return {
    kcal: v.kcal * k,
    proteine: v.proteine * k,
    carboidrati: v.carboidrati * k,
    grassi: v.grassi * k,
    fibre: v.fibre * k,
    zuccheri: v.zuccheri * k,
    sale: v.sale * k,
  };
}

/**
 * Un piatto del proprio database personale.
 *
 * - tipo "composto": i valori per 100 g si ricavano dagli ingredienti
 *   (le colonne *_100 qui sono a 0 e non vanno lette);
 * - tipo "diretto": i valori per 100 g sono quelli salvati nelle colonne
 *   *_100 e il piatto non ha ingredienti.
 */
export type TipoPiatto = "composto" | "diretto";

export interface Piatto extends Valori100 {
  id: string;
  user_id: string;
  nome: string;
  marca: string | null;
  tipo: TipoPiatto;
  porzione_nome: string | null;
  porzione_g: number | null;
  created_at: string;
}

/** Piatto con i valori nutrizionali già risolti, qualunque sia il tipo. */
export interface PiattoConValori extends Piatto {
  per100: ValoriNutrizionali;
  /** Peso di riferimento: somma degli ingredienti, o la porzione se dichiarata. */
  peso_g: number;
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

/** Dati anagrafici di un piatto, senza ingredienti (usati in create/update). */
export interface PiattoInput {
  nome: string;
  marca: string | null;
  tipo: TipoPiatto;
  /** Significativi solo se tipo === "diretto". */
  valori100: ValoriNutrizionali;
  porzione_nome: string | null;
  porzione_g: number | null;
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
  if (peso <= 0) return { ...VALORI_ZERO };
  return scalaValori(totaliPiatto(ings), 100 / peso);
}

/** Valori per 100 g di un piatto, sia composto che diretto. */
export function per100DiPiatto(p: PiattoConIngredienti): ValoriNutrizionali {
  return p.tipo === "diretto" ? da100(p) : per100Piatto(p.ingredienti);
}

/** Peso di riferimento di un piatto: ingredienti se composto, porzione se diretto. */
export function pesoDiPiatto(p: PiattoConIngredienti): number {
  return p.tipo === "diretto"
    ? Number(p.porzione_g ?? 0)
    : pesoPiatto(p.ingredienti);
}

export function piattoComeAlimento(p: PiattoConValori): AlimentoRicerca {
  return {
    nome: p.nome,
    marca: p.marca ?? "",
    fonte: "piatto",
    per100: p.per100,
    piatto_id: p.id,
    porzione_nome: p.porzione_nome,
    porzione_g: p.porzione_g ?? (p.peso_g > 0 ? p.peso_g : null),
    quantita_default_g: p.peso_g > 0 ? p.peso_g : null,
  };
}

export interface ConPorzione {
  quantita_g: number;
  porzione_nome: string | null;
  porzione_g: number | null;
}

/** Numero di porzioni corrispondente alla quantita' in grammi (0 se non applicabile). */
export function numeroPorzioni(p: ConPorzione): number {
  const g = Number(p.porzione_g ?? 0);
  return g > 0 ? Number(p.quantita_g) / g : 0;
}

function numeroBreve(v: number): string {
  const arrotondato = Math.round(v * 10) / 10;
  return Number.isInteger(arrotondato)
    ? String(arrotondato)
    : arrotondato.toFixed(1).replace(".", ",");
}

/** Etichetta della quantita': "350 g" oppure "1,5 piatto · 525 g". */
/**
 * Plurale del nome di una porzione: "2 fette", non "2 fetta".
 * Regola sulle desinenze italiane (fetta→fette, piatto→piatti,
 * bicchiere→bicchieri); i nomi che finiscono in consonante o vocale
 * accentata (yogurt, caffe') restano invariati, come in italiano.
 */
export function pluralePorzione(nome: string, quantita: number): string {
  if (quantita === 1) return nome;
  const ultima = nome.slice(-1).toLowerCase();
  if (ultima === "a") return `${nome.slice(0, -1)}e`;
  if (ultima === "o" || ultima === "e") return `${nome.slice(0, -1)}i`;
  return nome;
}

export function fmtQuantita(p: ConPorzione): string {
  const grammi = `${Math.round(Number(p.quantita_g))} g`;
  const n = numeroPorzioni(p);
  if (n <= 0) return grammi;
  const nome = p.porzione_nome?.trim() || "porz.";
  return `${numeroBreve(n)} ${pluralePorzione(nome, n)} · ${grammi}`;
}

/** Totali di un singolo giorno, come li restituisce la query delle statistiche. */
export interface GiornoValori extends ValoriNutrizionali {
  data: string;
}

export function pastoLabel(p: Pasto) {
  return PASTI.find((x) => x.value === p)?.label ?? p;
}

/** Pasto piu' probabile in base all'ora: evita di dover cambiare la tendina. */
export function pastoSuggerito(ora: number = new Date().getHours()): Pasto {
  if (ora < 11) return "colazione";
  if (ora < 15) return "pranzo";
  if (ora < 18) return "spuntino";
  return "cena";
}

// ----------------------- Calcolo degli obiettivi -----------------------

export interface DatiCorporei {
  sesso: "uomo" | "donna";
  eta: number;
  peso_kg: number;
  altezza_cm: number;
  /** Fattore di attivita' fisica (LAF), vedi ATTIVITA. */
  attivita: number;
  obiettivo: "perdere" | "mantenere" | "aumentare";
}

export const ATTIVITA: { valore: number; label: string }[] = [
  { valore: 1.2, label: "Sedentario (ufficio, niente sport)" },
  { valore: 1.375, label: "Leggermente attivo (1-3 allenamenti a settimana)" },
  { valore: 1.55, label: "Moderatamente attivo (3-5 a settimana)" },
  { valore: 1.725, label: "Molto attivo (6-7 a settimana)" },
  { valore: 1.9, label: "Lavoro fisico o doppi allenamenti" },
];

export const OBIETTIVI_PESO: {
  valore: DatiCorporei["obiettivo"];
  label: string;
}[] = [
  { valore: "perdere", label: "Perdere peso" },
  { valore: "mantenere", label: "Mantenere" },
  { valore: "aumentare", label: "Aumentare massa" },
];

/** Metabolismo basale secondo Mifflin-St Jeor (la formula piu' usata oggi). */
export function metabolismoBasale(d: DatiCorporei): number {
  const base = 10 * d.peso_kg + 6.25 * d.altezza_cm - 5 * d.eta;
  return d.sesso === "uomo" ? base + 5 : base - 161;
}

/**
 * Obiettivi proposti a partire dai dati corporei: sono una stima di partenza
 * ragionevole, da correggere a mano in base a come si risponde nel tempo.
 *
 * - calorie: metabolismo basale x attivita', con -15% per perdere peso e
 *   +10% per aumentare la massa;
 * - proteine: 1,6-2,0 g per kg di peso secondo l'obiettivo;
 * - grassi: 25% delle calorie; carboidrati: quello che resta;
 * - fibre: 14 g ogni 1000 kcal (indicazione OMS/EFSA).
 */
export function obiettiviProposti(d: DatiCorporei): {
  kcal: number;
  proteine: number;
  grassi: number;
  carboidrati: number;
  fibre: number;
} {
  const mantenimento = metabolismoBasale(d) * d.attivita;
  const fattore =
    d.obiettivo === "perdere" ? 0.85 : d.obiettivo === "aumentare" ? 1.1 : 1;
  const kcal = Math.round((mantenimento * fattore) / 10) * 10;

  const gPerKg =
    d.obiettivo === "perdere" ? 2 : d.obiettivo === "aumentare" ? 1.8 : 1.6;
  const proteine = Math.round(d.peso_kg * gPerKg);
  const grassi = Math.round((kcal * 0.25) / 9);
  const carboidrati = Math.max(
    0,
    Math.round((kcal - proteine * 4 - grassi * 9) / 4)
  );
  const fibre = Math.round((kcal / 1000) * 14);

  return { kcal, proteine, grassi, carboidrati, fibre };
}
