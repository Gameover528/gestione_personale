export type TipoBolletta =
  | "luce"
  | "gas"
  | "acqua"
  | "internet"
  | "telefono"
  | "rifiuti"
  | "altro";

export type StatoBolletta = "da_pagare" | "pagata";

export type StatoDivisione = "non_condivisa" | "da_dividere" | "divisa";

export interface Bolletta {
  id: string;
  user_id: string;
  fornitore: string;
  tipo: TipoBolletta;
  importo: number;
  data_scadenza: string;
  stato: StatoBolletta;
  data_pagamento: string | null;
  periodo_inizio: string | null;
  periodo_fine: string | null;
  divisione: StatoDivisione;
  persone_tue: number;
  persone_altre: number;
  note: string | null;
  allegato_path: string | null;
  pagamento_path: string | null;
  created_at: string;
}

export interface BollettaInput {
  fornitore: string;
  tipo: TipoBolletta;
  importo: number;
  data_scadenza: string;
  stato: StatoBolletta;
  data_pagamento: string | null;
  periodo_inizio: string | null;
  periodo_fine: string | null;
  divisione: StatoDivisione;
  persone_tue: number;
  persone_altre: number;
  note: string | null;
  allegato_path: string | null;
  pagamento_path: string | null;
}

export const TIPI: { value: TipoBolletta; label: string; color: string }[] = [
  { value: "luce", label: "Luce", color: "#f59e0b" },
  { value: "gas", label: "Gas", color: "#ef4444" },
  { value: "acqua", label: "Acqua", color: "#3b82f6" },
  { value: "internet", label: "Internet", color: "#8b5cf6" },
  { value: "telefono", label: "Telefono", color: "#10b981" },
  { value: "rifiuti", label: "Rifiuti", color: "#84cc16" },
  { value: "altro", label: "Altro", color: "#6b7280" },
];

export const DIVISIONI: { value: StatoDivisione; label: string }[] = [
  { value: "non_condivisa", label: "Non condivisa" },
  { value: "da_dividere", label: "Da dividere" },
  { value: "divisa", label: "Divisa" },
];

export function tipoLabel(t: TipoBolletta) {
  return TIPI.find((x) => x.value === t)?.label ?? t;
}

export function tipoColor(t: TipoBolletta) {
  return TIPI.find((x) => x.value === t)?.color ?? "#6b7280";
}

export function divisioneLabel(d: StatoDivisione) {
  return DIVISIONI.find((x) => x.value === d)?.label ?? d;
}

/**
 * Importo che l'altra famiglia deve recuperare (paghi sempre tu).
 * Quota altra famiglia = persone_altre / (persone_tue + persone_altre).
 */
export function quotaAltra(
  importo: number,
  personeTue: number,
  personeAltre: number
): number {
  const tot = personeTue + personeAltre;
  if (!tot || tot <= 0) return 0;
  return (importo * personeAltre) / tot;
}

/** Da una stringa "YYYY-MM-DD" ricava anno e mese (0-11), senza problemi di fuso. */
function annoMese(s: string): { anno: number; mese: number } {
  const [y, m] = s.split("-").map(Number);
  return { anno: y, mese: (m || 1) - 1 };
}

/**
 * Elenco dei mesi coperti dal periodo di riferimento (inizio-fine inclusi).
 * Se il periodo non e' compilato, usa il mese della scadenza come fallback.
 */
export function mesiPeriodo(
  inizio: string | null,
  fine: string | null,
  fallback: string
): { anno: number; mese: number }[] {
  const startS = inizio || fallback;
  const endS = fine || inizio || fallback;
  let { anno: y, mese: m } = annoMese(startS);
  const { anno: ey, mese: em } = annoMese(endS);
  if (ey < y || (ey === y && em < m)) return [{ anno: y, mese: m }];
  const out: { anno: number; mese: number }[] = [];
  while (y < ey || (y === ey && m <= em)) {
    out.push({ anno: y, mese: m });
    m++;
    if (m > 11) { m = 0; y++; }
    if (out.length > 120) break;
  }
  return out;
}

/** True se il periodo di riferimento ricade (anche parzialmente) nell'anno dato. */
export function periodoRicadeInAnno(
  inizio: string | null,
  fine: string | null,
  fallback: string,
  anno: number
): boolean {
  return mesiPeriodo(inizio, fine, fallback).some((x) => x.anno === anno);
}

export const STORAGE_BUCKET = "bollette";
