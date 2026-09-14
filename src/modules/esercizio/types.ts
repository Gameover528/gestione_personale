import { normalizzaMuscoli, type Muscolo } from "./muscoli/tipi";

/**
 * Un esercizio, da qualunque parte arrivi.
 *
 * `fonte` distingue i due mondi: "catalogo" sono i 1500 esercizi condivisi
 * presi da ExerciseDB, "personale" quelli che l'utente si e' creato. Servono
 * insieme nella stessa lista e nella stessa ricerca, ma vivono in tabelle
 * diverse (il catalogo non ha un proprietario).
 */
export type FonteEsercizio = "catalogo" | "personale";

export interface Esercizio {
  id: string;
  fonte: FonteEsercizio;
  nome: string;
  /** Nomi grezzi come li scrive la fonte: la traduzione in gruppi disegnabili è a parte. */
  muscoli: string[];
  muscoli_secondari: string[];
  attrezzi: string[];
  parti_corpo: string[];
  istruzioni: string[];
  gif_url: string | null;
  note?: string | null;
}

/** I muscoli di un esercizio, già tradotti nei gruppi che la mappa sa accendere. */
export interface MuscoliEsercizio {
  primari: Muscolo[];
  secondari: Muscolo[];
}

/**
 * Traduce i nomi grezzi nei gruppi disegnabili, togliendo dai secondari quelli
 * già presenti tra i primari: un muscolo acceso due volte con due intensità
 * diverse mostrerebbe la meno importante.
 */
export function muscoliDisegnabili(e: {
  muscoli: string[];
  muscoli_secondari: string[];
}): MuscoliEsercizio {
  const primari = normalizzaMuscoli(e.muscoli);
  const secondari = normalizzaMuscoli(e.muscoli_secondari).filter(
    (m) => !primari.includes(m)
  );
  return { primari, secondari };
}

/**
 * Ricerca nel catalogo già caricato, senza passare dal server.
 *
 * Gli esercizi sono 1500 e non cambiano mai: si scaricano una volta e si
 * filtrano qui mentre si scrive. È la stessa scelta fatta per i piatti
 * (`cercaTraIPiatti`), e per lo stesso motivo: una chiamata al worker per ogni
 * lettera digitata è la cosa che aveva fatto esplodere il conto delle
 * invocazioni.
 *
 * L'ordine premia chi inizia col termine cercato, poi chi ce l'ha come parola
 * intera: cercando "curl" ci si aspetta "curl" e non "biceps curl machine" in
 * cima.
 */
export function cercaEsercizi(
  esercizi: Esercizio[],
  query: string,
  limite = 30
): Esercizio[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const punteggio = (e: Esercizio): number => {
    const nome = e.nome.toLowerCase();
    if (nome === q) return 0;
    if (nome.startsWith(q)) return 1;
    if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(nome)) return 2;
    if (nome.includes(q)) return 3;
    // Ultimo criterio: l'attrezzo o il muscolo, così "dumbbell" o "chest"
    // restituiscono qualcosa anche se non compaiono nel nome.
    if (e.attrezzi.some((a) => a.toLowerCase().includes(q))) return 4;
    if ([...e.muscoli, ...e.muscoli_secondari].some((m) => m.toLowerCase().includes(q)))
      return 5;
    return 99;
  };

  return esercizi
    .map((e) => ({ e, p: punteggio(e) }))
    .filter((x) => x.p < 99)
    .sort((a, b) => a.p - b.p || a.e.nome.localeCompare(b.e.nome))
    .slice(0, limite)
    .map((x) => x.e);
}

/** Etichette italiane per gli attrezzi più comuni del catalogo (che è in inglese). */
const NOME_ATTREZZO: Record<string, string> = {
  "body weight": "Corpo libero",
  barbell: "Bilanciere",
  dumbbell: "Manubri",
  cable: "Cavi",
  band: "Elastico",
  "resistance band": "Elastico",
  kettlebell: "Kettlebell",
  "leverage machine": "Macchina",
  "smith machine": "Multipower",
  "olympic barbell": "Bilanciere olimpico",
  "ez barbell": "Bilanciere sagomato",
  "medicine ball": "Palla medica",
  "stability ball": "Fitball",
  "stationary bike": "Cyclette",
  "elliptical machine": "Ellittica",
  rope: "Corda",
  roller: "Rullo",
  "trap bar": "Trap bar",
  weighted: "Con sovraccarico",
  assisted: "Assistito",
  hammer: "Hammer",
  sled: "Slitta",
  "sled machine": "Slitta",
  tire: "Pneumatico",
  wheel: "Ruota",
  "wheel roller": "Ruota per addominali",
  bosu: "Bosu",
  "bosu ball": "Bosu",
  "skierg machine": "SkiErg",
  "stepmill machine": "Stepper",
  "upper body ergometer": "Ergometro braccia",
};

export function nomeAttrezzo(a: string): string {
  return NOME_ATTREZZO[a.toLowerCase()] ?? a;
}
