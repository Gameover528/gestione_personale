export type Frequenza =
  | "settimanale"
  | "mensile"
  | "bimestrale"
  | "trimestrale"
  | "semestrale"
  | "annuale";

export type StatoAbbonamento = "attivo" | "sospeso" | "disdetto";
export type StatoRata = "da_pagare" | "pagata";

export interface Abbonamento {
  id: string;
  user_id: string;
  nome: string;
  importo: number;
  frequenza: Frequenza;
  data_inizio: string;
  stato: StatoAbbonamento;
  data_ripresa: string | null;
  note: string | null;
  created_at: string;
}

export interface AbbonamentoInput {
  nome: string;
  importo: number;
  frequenza: Frequenza;
  data_inizio: string;
  note: string | null;
}

export interface Rata {
  id: string;
  abbonamento_id: string;
  user_id: string;
  data_scadenza: string;
  importo: number;
  stato: StatoRata;
  data_pagamento: string | null;
  created_at: string;
}

export const FREQUENZE: { value: Frequenza; label: string }[] = [
  { value: "settimanale", label: "Settimanale" },
  { value: "mensile", label: "Mensile" },
  { value: "bimestrale", label: "Bimestrale" },
  { value: "trimestrale", label: "Trimestrale" },
  { value: "semestrale", label: "Semestrale" },
  { value: "annuale", label: "Annuale" },
];

export function frequenzaLabel(f: Frequenza): string {
  return FREQUENZE.find((x) => x.value === f)?.label ?? f;
}

export const LABEL_STATO_ABBONAMENTO: Record<StatoAbbonamento, string> = {
  attivo: "Attivo",
  sospeso: "Sospeso",
  disdetto: "Disdetto",
};

/** Giorno del mese "clampato" all'ultimo giorno valido di quel mese (es. 31 gennaio + 1 mese -> 28/29 febbraio). */
function ultimoGiornoMese(anno: number, meseIndex0: number): number {
  return new Date(anno, meseIndex0 + 1, 0).getDate();
}

/**
 * Data successiva in base alla frequenza, da una stringa "YYYY-MM-DD".
 * Per le frequenze basate sui mesi, mantiene il giorno originale del ciclo
 * (clampato a fine mese quando necessario) invece di lasciare che l'aggiunta
 * mesi "scivoli" (bug comune di Date.setMonth con i mesi corti).
 */
export function prossimaData(dataISO: string, frequenza: Frequenza): string {
  const [y, m, d] = dataISO.split("-").map(Number);
  if (frequenza === "settimanale") {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + 7);
    return dt.toISOString().slice(0, 10);
  }

  const mesiDaAggiungere: Record<Exclude<Frequenza, "settimanale">, number> = {
    mensile: 1,
    bimestrale: 2,
    trimestrale: 3,
    semestrale: 6,
    annuale: 12,
  };
  const n = mesiDaAggiungere[frequenza];

  const meseIndex0Totale = (m - 1) + n;
  const nuovoAnno = y + Math.floor(meseIndex0Totale / 12);
  const nuovoMeseIndex0 = meseIndex0Totale % 12;
  const nuovoGiorno = Math.min(d, ultimoGiornoMese(nuovoAnno, nuovoMeseIndex0));

  const mm = String(nuovoMeseIndex0 + 1).padStart(2, "0");
  const dd = String(nuovoGiorno).padStart(2, "0");
  return `${nuovoAnno}-${mm}-${dd}`;
}

/** Data odierna in formato "YYYY-MM-DD" (fuso del server, coerente col resto dell'app). */
export function oggiISO(): string {
  return new Date().toISOString().slice(0, 10);
}
