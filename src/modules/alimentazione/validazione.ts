import type { ValoriNutrizionali } from "./types";

/**
 * Controlli di plausibilità sui valori nutrizionali.
 *
 * I dati arrivano da Open Food Facts e USDA, dove li inseriscono le persone, e
 * contengono errori: energia in kJ messa nel campo delle kcal, macronutrienti
 * che non tornano con le calorie dichiarate, valori del prodotto crudo
 * attribuiti a un piatto cotto.
 *
 * Qui non si corregge e non si scarta niente: si **segnala**. Un dato sbagliato
 * buttato via in silenzio sparisce senza che nessuno se ne accorga, mentre uno
 * segnalato resta visibile e la persona decide se correggerlo.
 *
 * Le funzioni sono pure e lavorano sui valori per 100 g: nessuna lettura dal
 * database, nessun campo salvato. Il controllo si rifà a ogni lettura, quindi
 * vale anche per le righe registrate prima che questi controlli esistessero, e
 * si aggiorna da sé appena si correggono i numeri — cosa che un campo salvato
 * in tabella non farebbe senza una migration e un ricalcolo di tutto lo storico.
 */

export type Problema = "kcal-incoerenti" | "macro-oltre-peso";

export interface EsitoValidazione {
  problemi: Problema[];
  /** Calorie che ci si aspetterebbe dai macronutrienti dichiarati. */
  kcalAttese: number;
  /** Scarto fra kcal dichiarate e attese, in percentuale (0-100+). */
  scartoPerc: number;
  /** Somma di proteine + carboidrati + grassi, in grammi per 100 g. */
  sommaMacro: number;
}

/**
 * Tolleranza sullo scarto fra calorie dichiarate e calorie ricavate dai
 * macronutrienti.
 *
 * Il 10% non è un numero a caso: misurato su 153 prodotti reali di Open Food
 * Facts, segnala il 5,2% delle voci — abbastanza raro da restare un segnale e
 * non diventare rumore di fondo, e abbastanza stretto da prendere gli errori
 * veri (un prodotto con 1559 "kcal" dichiarate contro 415 attese: erano kJ).
 */
const TOLLERANZA = 0.10;

/**
 * Fattori di Atwater: quante kcal rende un grammo di ciascun macronutriente.
 *
 * Le fibre non entrano nel conto di proposito. In teoria rendono ~2 kcal/g e
 * andrebbero aggiunte, ma nei dati reali i carboidrati dichiarati le includono
 * già molto spesso: sullo stesso campione, sommarle faceva salire le
 * segnalazioni dal 5,2% al 6,5% — cioè aggiungeva falsi allarmi invece di
 * toglierne.
 */
const KCAL_PER_GRAMMO = { proteine: 4, carboidrati: 4, grassi: 9 };

/** Sopra questa soglia i valori non sono improbabili: sono impossibili. */
const GRAMMI_IN_100G = 100;

export function valida(v: ValoriNutrizionali): EsitoValidazione {
  const kcal = Number(v.kcal) || 0;
  const proteine = Number(v.proteine) || 0;
  const carboidrati = Number(v.carboidrati) || 0;
  const grassi = Number(v.grassi) || 0;

  const kcalAttese =
    proteine * KCAL_PER_GRAMMO.proteine +
    carboidrati * KCAL_PER_GRAMMO.carboidrati +
    grassi * KCAL_PER_GRAMMO.grassi;

  const sommaMacro = proteine + carboidrati + grassi;
  const problemi: Problema[] = [];

  // Senza numeri non c'è niente da controllare: un alimento con tutti zeri
  // (acqua, tisana) non è un errore.
  const riferimento = Math.max(kcal, kcalAttese);
  const scarto = riferimento > 0 ? Math.abs(kcal - kcalAttese) / riferimento : 0;

  if (riferimento > 0 && scarto > TOLLERANZA) {
    problemi.push("kcal-incoerenti");
  }
  if (sommaMacro > GRAMMI_IN_100G) {
    problemi.push("macro-oltre-peso");
  }

  return {
    problemi,
    kcalAttese: Math.round(kcalAttese),
    scartoPerc: Math.round(scarto * 100),
    sommaMacro: Math.round(sommaMacro * 10) / 10,
  };
}

/** Scorciatoia: c'è qualcosa da segnalare? */
export function haProblemi(v: ValoriNutrizionali): boolean {
  return valida(v).problemi.length > 0;
}

/**
 * Il messaggio da mostrare, scritto per chi usa l'app: dice cosa non torna e
 * quanto, così si capisce se vale la pena correggere.
 */
export function messaggioProblemi(esito: EsitoValidazione): string | null {
  if (esito.problemi.length === 0) return null;

  const parti: string[] = [];
  if (esito.problemi.includes("macro-oltre-peso")) {
    parti.push(
      `proteine, carboidrati e grassi sommano ${esito.sommaMacro} g per 100 g di prodotto, il che è impossibile`
    );
  }
  if (esito.problemi.includes("kcal-incoerenti")) {
    parti.push(
      `le calorie dichiarate si discostano del ${esito.scartoPerc}% da quelle che risultano dai macronutrienti (circa ${esito.kcalAttese} kcal per 100 g)`
    );
  }

  return `Dati da verificare: ${parti.join("; ")}. Puoi correggerli a mano.`;
}

/**
 * Stessa verifica a partire dai valori per 100 g nella forma in cui stanno nel
 * database (`kcal_100`, `proteine_100`, ...).
 */
export function validaPer100(v: {
  kcal_100: number;
  proteine_100: number;
  carboidrati_100: number;
  grassi_100: number;
  fibre_100?: number;
  zuccheri_100?: number;
  sale_100?: number;
}): EsitoValidazione {
  return valida({
    kcal: Number(v.kcal_100),
    proteine: Number(v.proteine_100),
    carboidrati: Number(v.carboidrati_100),
    grassi: Number(v.grassi_100),
    fibre: Number(v.fibre_100 ?? 0),
    zuccheri: Number(v.zuccheri_100 ?? 0),
    sale: Number(v.sale_100 ?? 0),
  });
}
