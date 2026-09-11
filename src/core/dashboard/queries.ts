"use server";

import { listBollette, totaleBollettePagate } from "@/modules/bollette/queries";
import { totaleRatePagate } from "@/modules/abbonamenti/queries";
import type { Bolletta } from "@/modules/bollette/types";

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
