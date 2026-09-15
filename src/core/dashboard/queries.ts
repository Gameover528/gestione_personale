"use server";

import { listBollette, totaleBollettePagate } from "@/modules/bollette/queries";
import { totaleRatePagate } from "@/modules/abbonamenti/queries";
import type { Bolletta } from "@/modules/bollette/types";
import { riepilogoSettimana } from "@/modules/alimentazione/queries";
import { riepilogoAllenamento } from "@/modules/esercizio/allenamenti";
import { oggiIso } from "@/lib/utils";

export interface RiepilogoCosti {
  daPagare: { totale: number; count: number; prossime: Bolletta[] };
  giaPagato: { totale: number; count: number };
}

/**
 * Il riquadro principale di Consumi e Costi in una chiamata sola.
 *
 * Mette insieme dati di due moduli, quindi sta qui e non dentro uno dei due:
 * le funzioni dei moduli vengono chiamate da server a server, senza altri
 * giri di rete. Tenerle separate significava tre richieste al worker per
 * disegnare un riquadro.
 */
export async function riepilogoCosti(limite = 5): Promise<RiepilogoCosti> {
  const [daPagare, bollettePagate, ratePagate] = await Promise.all([
    listBollette({ stato: "da_pagare" }),
    totaleBollettePagate(),
    totaleRatePagate(),
  ]);

  const prossime = [...daPagare]
    .sort((a, b) => a.data_scadenza.localeCompare(b.data_scadenza))
    .slice(0, limite);

  return {
    daPagare: {
      totale: daPagare.reduce((s, b) => s + Number(b.importo), 0),
      count: daPagare.length,
      prossime,
    },
    giaPagato: {
      totale: bollettePagate.totale + ratePagate.totale,
      count: bollettePagate.count + ratePagate.count,
    },
  };
}

// ----------------------- Area Salute: bilancio energetico -----------------------

export interface BilancioEnergetico {
  /** Calorie mangiate oggi. */
  mangiate: number;
  /** Calorie bruciate oggi allenandosi (stima). */
  bruciate: number;
  /** Obiettivo giornaliero di kcal, se impostato. */
  obiettivo: number | null;
}

/**
 * Mangiato contro bruciato, oggi: e' il motivo per cui Alimentazione ed
 * Esercizio stanno nella stessa area, e l'unico punto in cui i due moduli si
 * sommano davvero.
 *
 * Come per riepilogoCosti, le due funzioni dei moduli si chiamano da server a
 * server: una richiesta sola dal browser invece di due.
 */
export async function bilancioEnergetico(): Promise<BilancioEnergetico> {
  const [cibo, allenamento] = await Promise.all([
    riepilogoSettimana(1),
    riepilogoAllenamento(1),
  ]);

  const oggi = oggiIso();
  const giorno = cibo.giorni.find((g) => g.data === oggi);
  const obiettivoKcal = cibo.obiettivi.find((o) => o.nutriente === "kcal");

  return {
    mangiate: Math.round(giorno?.kcal ?? 0),
    bruciate: allenamento.kcalOggi,
    obiettivo: obiettivoKcal ? Math.round(obiettivoKcal.valore) : null,
  };
}
