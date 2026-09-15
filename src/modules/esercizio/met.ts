import type { Esercizio } from "./types";

/**
 * Stima delle calorie bruciate in un allenamento.
 *
 * Si usa il MET (Metabolic Equivalent of Task): un MET è il consumo a riposo, e
 * un'attività da 6 MET ne consuma sei volte tanto. La formula del Compendium of
 * Physical Activities è:
 *
 *     kcal = MET × peso in kg × ore
 *
 * Il peso arriva dai dati corporei già inseriti per gli obiettivi nutrizionali
 * (`alimentazione:corpo`): non c'è niente di nuovo da chiedere all'utente.
 *
 * Resta una **stima**, e va presentata come tale: a parità di esercizi e di
 * minuti, il consumo reale cambia col carico, col recupero fra le serie e con
 * la persona. Serve a dare un ordine di grandezza da mettere accanto alle
 * calorie mangiate, non a fare i conti in tasca al metabolismo.
 */

/** MET usato quando non si riesce a classificare l'esercizio: lavoro con pesi, sforzo moderato. */
const MET_PREDEFINITO = 5;

/**
 * MET per attrezzo. I valori vengono dal Compendium: le macchine cardio
 * consumano molto più del lavoro con i pesi, che è intervallato dai recuperi.
 */
const MET_ATTREZZO: Record<string, number> = {
  "stationary bike": 7,
  "elliptical machine": 5,
  "skierg machine": 7,
  "stepmill machine": 9,
  "upper body ergometer": 5,
  "sled machine": 8,
  rope: 8,
  tire: 8,
  "body weight": 4,
  band: 3.5,
  "resistance band": 3.5,
  barbell: 6,
  "olympic barbell": 6,
  "ez barbell": 5,
  "trap bar": 6,
  dumbbell: 5,
  kettlebell: 6,
  cable: 4.5,
  "leverage machine": 4.5,
  "smith machine": 5,
  hammer: 4.5,
  assisted: 3.5,
  weighted: 5,
  "medicine ball": 5,
  "stability ball": 3.5,
  "bosu ball": 4,
  roller: 3,
  "wheel roller": 4,
};

/** Il cardio si riconosce anche dalla parte del corpo, non solo dall'attrezzo. */
const MET_PARTE_CORPO: Record<string, number> = {
  cardio: 7,
};

/** MET di un singolo esercizio, dal suo attrezzo o dalla parte del corpo. */
export function metEsercizio(e: {
  attrezzi: string[];
  parti_corpo: string[];
}): number {
  for (const p of e.parti_corpo) {
    const m = MET_PARTE_CORPO[p.toLowerCase()];
    if (m) return m;
  }
  // Fra più attrezzi vince il più impegnativo: un esercizio con bilanciere e
  // panca è comunque lavoro col bilanciere.
  const valori = e.attrezzi
    .map((a) => MET_ATTREZZO[a.toLowerCase()])
    .filter((v): v is number => typeof v === "number");
  return valori.length > 0 ? Math.max(...valori) : MET_PREDEFINITO;
}

/**
 * MET medio di una sessione: la media degli esercizi svolti, o il predefinito
 * se la sessione non ne ha ancora nessuno.
 */
export function metMedio(esercizi: Pick<Esercizio, "attrezzi" | "parti_corpo">[]): number {
  if (esercizi.length === 0) return MET_PREDEFINITO;
  const somma = esercizi.reduce((s, e) => s + metEsercizio(e), 0);
  return somma / esercizi.length;
}

/**
 * Calorie stimate. Torna null quando manca il peso corporeo: meglio non
 * mostrare niente che mostrare un numero inventato su un peso di comodo.
 */
export function kcalStimate(
  met: number,
  pesoKg: number | null | undefined,
  durataMin: number | null | undefined
): number | null {
  if (!pesoKg || !durataMin || durataMin <= 0) return null;
  return Math.round(met * pesoKg * (durataMin / 60));
}
