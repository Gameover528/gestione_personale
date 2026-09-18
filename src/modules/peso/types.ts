/**
 * Il registro del peso corporeo.
 *
 * Una riga per giorno. Il peso non è un dato del profilo come l'altezza: si
 * muove, e l'unica cosa che dice qualcosa è come si muove.
 */
export interface Pesata {
  id: string;
  data: string;
  peso_kg: number;
  nota: string | null;
}

/**
 * Il peso da usare per una certa data: la pesata più vicina, prima o dopo che
 * sia.
 *
 * "Più vicina" e non "l'ultima prima di quel giorno" perché un allenamento
 * registrato prima della prima pesata resterebbe senza peso, pur essendo a
 * pochi giorni da una misura perfettamente valida. A parità di distanza vince
 * quella precedente, che è già successa.
 *
 * `pesate` deve essere ordinato per data: non lo riordina, perché viene
 * chiamata una volta per ogni allenamento di un elenco.
 */
export function pesoAllaData(pesate: Pesata[], data: string): number | null {
  if (pesate.length === 0) return null;

  let migliore: Pesata | null = null;
  let distanzaMigliore = Infinity;
  for (const p of pesate) {
    const d = Math.abs(giorniTra(p.data, data));
    // `<` e non `<=`: a parità si tiene la prima incontrata, e l'elenco
    // arriva dal più vecchio al più recente.
    if (d < distanzaMigliore) {
      distanzaMigliore = d;
      migliore = p;
    }
  }
  return migliore?.peso_kg ?? null;
}

/** Giorni fra due date "AAAA-MM-GG" (negativi se la seconda è prima). */
export function giorniTra(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Quanto è cambiato il peso nel periodo, e in quanti giorni.
 *
 * Confronta la prima e l'ultima pesata **presenti nel periodo**, non il
 * periodo nominale: se hai scelto 90 giorni ma ti sei pesato solo nelle ultime
 * tre settimane, la variazione è quella delle tre settimane. Dire "-2 kg in 90
 * giorni" quando i dati coprono 21 giorni sarebbe inventare.
 */
export function variazione(
  pesate: Pesata[]
): { kg: number; giorni: number } | null {
  if (pesate.length < 2) return null;
  const prima = pesate[0];
  const ultima = pesate[pesate.length - 1];
  return {
    kg: ultima.peso_kg - prima.peso_kg,
    giorni: giorniTra(prima.data, ultima.data),
  };
}

/**
 * Media mobile a sette giorni, per la linea di tendenza.
 *
 * Il peso di un singolo giorno è rumore: acqua, sale, cosa si è mangiato la
 * sera prima. Su un grafico a punti nudi ogni oscillazione sembra un
 * risultato, e la direzione vera — l'unica cosa che interessa — si perde.
 * La media si calcola sui giorni realmente presenti nella finestra, quindi
 * regge anche chi si pesa una volta a settimana.
 */
export function tendenza(pesate: Pesata[]): (number | null)[] {
  return pesate.map((p, i) => {
    let somma = 0;
    let quante = 0;
    for (let j = i; j >= 0; j--) {
      if (giorniTra(pesate[j].data, p.data) > 6) break;
      somma += pesate[j].peso_kg;
      quante++;
    }
    return quante > 0 ? somma / quante : null;
  });
}

/**
 * Se la tendenza vale la pena di disegnarla.
 *
 * Chi si pesa una volta a settimana ha ogni finestra di sette giorni con un
 * punto solo dentro: la media coincide col peso e la linea sparisce sotto
 * quella dei punti, tranne dove due pesate capitano vicine — e lì spunta un
 * pezzo di linea dal nulla, che sembra un difetto. Meglio non disegnarla
 * affatto finché non ci sono pesate abbastanza fitte.
 */
export function tendenzaUtile(pesate: Pesata[]): boolean {
  for (let i = 1; i < pesate.length; i++) {
    let vicine = 1;
    for (let j = i - 1; j >= 0; j--) {
      if (giorniTra(pesate[j].data, pesate[i].data) > 6) break;
      vicine++;
    }
    if (vicine >= 3) return true;
  }
  return false;
}

/** Con una cifra decimale: è la precisione che danno le bilance. */
export function fmtPeso(kg: number): string {
  return kg.toFixed(1);
}

/** Variazione col segno esplicito: "+0.4" dice più di "0.4". */
export function fmtVariazione(kg: number): string {
  const segno = kg > 0 ? "+" : kg < 0 ? "−" : "";
  return `${segno}${Math.abs(kg).toFixed(1)}`;
}
