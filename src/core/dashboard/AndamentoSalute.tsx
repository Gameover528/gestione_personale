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

const SEZIONI: { value: string; label: string }[] = [
  { value: "cibo", label: "Cibo" },
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
  ciboIniziale,
  allenamentiIniziali,
  obiettivi,
}: {
  giorniIniziali: number;
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
      <div className="flex flex-col gap-3">
        <TabBar
          items={PERIODI}
          value={String(giorni)}
          onChange={(v) => setGiorni(Number(v))}
          label="Periodo da mostrare"
        />
        <TabBar
          items={SEZIONI}
          value={sezione}
          onChange={setSezione}
          label="Cosa mostrare"
        />
      </div>

      {sezione === "cibo" ? (
        <AndamentoAlimentazione
          giorni={giorni}
          dati={cibo}
          obiettivi={obiettivi}
        />
      ) : (
        <AndamentoAllenamenti giorni={giorni} dati={allenamenti} cibo={cibo} />
      )}
    </div>
  );
}
