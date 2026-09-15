import { normalizzaMuscoli, type Muscolo } from "./muscoli/tipi";
import { espandi } from "./traduzioni";

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
  /**
   * Nome originale del catalogo, presente solo quando l'utente l'ha
   * rinominato: resta cercabile, così chi ha ribattezzato "Barbell Bench
   * Press" in "Panca piana" continua a trovarlo anche scrivendo in inglese.
   */
  nome_originale?: string | null;
  /** Nomi grezzi come li scrive la fonte: la traduzione in gruppi disegnabili è a parte. */
  muscoli: string[];
  muscoli_secondari: string[];
  attrezzi: string[];
  parti_corpo: string[];
  istruzioni: string[];
  gif_url: string | null;
  /** Negli elenchi il link non viaggia: basta sapere se una GIF esiste. */
  ha_gif?: boolean;
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

  /**
   * Si cerca per parole e non come unica stringa, e ogni parola viene espansa
   * nelle sue forme inglesi: il catalogo è in inglese ma chi cerca scrive
   * "panca piana", non "bench press". Chi scrive già in inglese non perde
   * niente, perché l'espansione tiene sempre anche la parola originale.
   */
  const token = q.split(/\s+/).filter(Boolean).map(espandi);

  /** Quante parole cercate trovano riscontro nel nome, e quante altrove. */
  function riscontri(e: Esercizio): { nome: number; altrove: number } {
    const nome = e.nome.toLowerCase();
    const contorno = [e.nome_originale ?? "", ...e.attrezzi, ...e.muscoli, ...e.muscoli_secondari]
      .join(" ")
      .toLowerCase();
    let inNome = 0;
    let fuori = 0;
    for (const forme of token) {
      if (forme.some((f) => nome.includes(f))) inNome++;
      else if (forme.some((f) => contorno.includes(f))) fuori++;
    }
    return { nome: inNome, altrove: fuori };
  }

  const valutati = esercizi
    .map((e) => ({ e, r: riscontri(e) }))
    .filter((x) => x.r.nome + x.r.altrove > 0);

  // Prima chi soddisfa TUTTE le parole cercate: "panca manubri" deve dare la
  // panca con manubri, non tutto ciò che contiene "panca". Se nessuno le
  // soddisfa tutte si ripiega su chi ne prende di più, invece di non dare
  // niente.
  const complete = valutati.filter((x) => x.r.nome + x.r.altrove === token.length);
  const base = complete.length > 0 ? complete : valutati;

  return base
    .sort((a, b) => {
      // A parità, conta più un riscontro nel nome che nell'attrezzo.
      const pa = a.r.nome * 2 + a.r.altrove;
      const pb = b.r.nome * 2 + b.r.altrove;
      if (pa !== pb) return pb - pa;
      const na = a.e.nome.toLowerCase();
      const nb = b.e.nome.toLowerCase();
      // A parità di riscontri vince il nome più corto: "Cable Lateral Raise" è
      // l'esercizio che si cercava, "Assisted Lying Leg Raise With Lateral
      // Throw Down" contiene le stesse parole ma è un'altra cosa. Le parole in
      // più sono quasi sempre roba che allontana dal termine cercato.
      if (na.length !== nb.length) return na.length - nb.length;
      return na.localeCompare(nb);
    })
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
