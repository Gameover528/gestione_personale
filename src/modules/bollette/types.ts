export type TipoBolletta =
  | "luce"
  | "gas"
  | "acqua"
  | "internet"
  | "telefono"
  | "rifiuti"
  | "altro";

export type StatoBolletta = "da_pagare" | "pagata";

export interface Bolletta {
  id: string;
  user_id: string;
  fornitore: string;
  tipo: TipoBolletta;
  importo: number;
  data_scadenza: string;
  stato: StatoBolletta;
  data_pagamento: string | null;
  note: string | null;
  allegato_path: string | null;
  created_at: string;
}

export interface BollettaInput {
  fornitore: string;
  tipo: TipoBolletta;
  importo: number;
  data_scadenza: string;
  stato: StatoBolletta;
  data_pagamento: string | null;
  note: string | null;
  allegato_path: string | null;
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

export function tipoLabel(t: TipoBolletta) {
  return TIPI.find((x) => x.value === t)?.label ?? t;
}

export function tipoColor(t: TipoBolletta) {
  return TIPI.find((x) => x.value === t)?.color ?? "#6b7280";
}

export const STORAGE_BUCKET = "bollette";
