"use client";

import { useEffect, useRef, useState } from "react";
import { statistichePeriodo } from "@/modules/alimentazione/queries";
import { andamentoAllenamenti } from "@/modules/esercizio/allenamenti";
import type { GiornoValori, Obiettivo } from "@/modules/alimentazione/types";
import type { GiornoAllenamento } from "@/modules/esercizio/allenamenti";
import { AndamentoAlimentazione } from "@/modules/alimentazione/components/AndamentoAlimentazione";
import { AndamentoAllenamenti } from "@/modules/esercizio/components/AndamentoAllenamenti";
import { TabBar } from "@/core/components/controls";

const PERIODI: { value: string; label: string }[] = [
  { value: "7", label: "7 giorni" },
  { value: "30", label: "30 giorni" },
  { value: "90", label: "90 giorni" },
];

// Il valore resta "cibo" (è solo una chiave interna); l'etichetta dice
// "Alimentazione", che è il nome della sezione ovunque nell'app.
const SEZIONI: { value: string; label: string }[] = [
  { value: "cibo", label: "Alimentazione" },
  { value: "allenamento", label: "Allenamento" },
];

/**
 * L'andamento dell'area Salute: cibo e allenamento sotto lo stesso periodo.
 *
 * Il selettore del periodo sta qui e non dentro le due sezioni: due selettori
 * indipendenti sulla stessa pagina si contraddicono, e confrontare mangiate e
 * bruciate su intervalli diversi non vorrebbe dire niente. Per lo stesso motivo
 * i dati si caricano una volta sola qui e scendono come proprietà: la sezione
 * allenamento ha bisogno anche delle calorie mangiate.
 */
export function AndamentoSalute({
  giorniIniziali,
  giorniSettimana,
  ciboIniziale,
  allenamentiIniziali,
  obiettivi,
}: {
  giorniIniziali: number;
  /** Giorni a settimana prefissati (0 = nessun obiettivo), da Preferenze moduli. */
  giorniSettimana: number;
  ciboIniziale: GiornoValori[];
  allenamentiIniziali: GiornoAllenamento[];
  obiettivi: Obiettivo[];
}) {
  const [giorni, setGiorni] = useState(giorniIniziali);
  const [sezione, setSezione] = useState("cibo");
  const [cibo, setCibo] = useState<GiornoValori[] | null>(ciboIniziale);
  const [allenamenti, setAllenamenti] = useState<GiornoAllenamento[] | null>(
    allenamentiIniziali
  );

  // Il periodo di partenza arriva già calcolato dal server: si ricarica solo
  // quando l'utente lo cambia.
  const periodoMostrato = useRef(giorniIniziali);
  useEffect(() => {
    if (periodoMostrato.current === giorni) return;
    periodoMostrato.current = giorni;
    setCibo(null);
    setAllenamenti(null);
    statistichePeriodo(giorni).then(setCibo);
    andamentoAllenamenti(giorni).then(setAllenamenti);
  }, [giorni]);

  return (
    <div className="space-y-6">
      {/*
        Cosa guardare a sinistra, per quanto tempo a destra: una riga sola,
        perché sono due scelte dello stesso gesto e impilate occupavano due
        righe piene sopra i grafici. Su schermo stretto tornano su due righe da
        sole (flex-wrap), col periodo sotto.
      */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabBar
          items={SEZIONI}
          value={sezione}
          onChange={setSezione}
          label="Cosa mostrare"
        />
        <TabBar
          items={PERIODI}
          value={String(giorni)}
          onChange={(v) => setGiorni(Number(v))}
          label="Periodo da mostrare"
        />
      </div>

      {sezione === "cibo" ? (
        <AndamentoAlimentazione
          giorni={giorni}
          dati={cibo}
          // Il grafico delle calorie mostra anche quelle bruciate: qui bastano
          // giorno e quantità, non tutto il riepilogo dell'allenamento.
          bruciate={
            allenamenti?.map((a) => ({ data: a.data, kcal: a.kcal })) ?? null
          }
          obiettivi={obiettivi}
        />
      ) : (
        <AndamentoAllenamenti
          giorni={giorni}
          dati={allenamenti}
          giorniSettimana={giorniSettimana}
        />
      )}
    </div>
  );
}
