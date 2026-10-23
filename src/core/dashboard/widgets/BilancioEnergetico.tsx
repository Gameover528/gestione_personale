"use client";

import { useEffect, useState } from "react";
import { Flame, Utensils } from "lucide-react";
import { bilancioEnergetico, type BilancioEnergetico as Dati } from "../queries";
import { esitoObiettivo } from "@/modules/alimentazione/types";

/**
 * Mangiato contro bruciato, oggi.
 *
 * È il riquadro che giustifica l'unione di Alimentazione ed Esercizio in una
 * sola area: nessuno dei due moduli da solo può dirlo. Il netto è quello che
 * conta davvero, e l'obiettivo (se impostato) dice se si sta dentro.
 */
export default function BilancioEnergeticoWidget() {
  const [dati, setDati] = useState<Dati | null>(null);

  useEffect(() => {
    bilancioEnergetico().then(setDati);
  }, []);

  if (!dati) {
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  }

  const netto = dati.mangiate - dati.bruciate;
  const n = (v: number) => Math.round(v).toLocaleString("it-IT");

  /*
    L'obiettivo si confronta con le calorie MANGIATE, come fa il diario.
    Prima qui si confrontava il netto (mangiate meno bruciate): ma un obiettivo
    calcolato dall'app comprende già l'attività fisica dichiarata, allenamenti
    compresi, e togliere anche quelli li contava due volte — chi si allenava
    credeva di avere più margine di quello vero, e lo stesso giorno il diario
    e la dashboard davano esiti opposti. Il netto resta, come informazione.
  */
  const ob = dati.obiettivo;
  const esito = ob ? esitoObiettivo(dati.mangiate, ob) : null;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold">{n(netto)}</span>
          <span className="text-sm text-muted-foreground">kcal nette oggi</span>
        </div>
        {ob && (
          <p className="mt-1 text-sm">
            {ob.tipo === "max" ? (
              esito === "oltre" ? (
                <span className="font-medium text-destructive">
                  Hai mangiato {n(dati.mangiate - ob.valore)} kcal oltre il massimo
                  di {n(ob.valore)}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Ne restano {n(ob.valore - dati.mangiate)} sul massimo di{" "}
                  {n(ob.valore)} kcal
                </span>
              )
            ) : esito === "ok" ? (
              <span className="font-medium text-success-testo">
                Minimo di {n(ob.valore)} kcal raggiunto
              </span>
            ) : (
              <span className="text-muted-foreground">
                Ne mancano {n(ob.valore - dati.mangiate)} per il minimo di{" "}
                {n(ob.valore)} kcal
              </span>
            )}
          </p>
        )}
      </div>

      <dl className="flex flex-col gap-1 border-t pt-2 text-sm">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 shrink-0 text-muted-foreground" />
          <dt className="text-muted-foreground">Mangiate</dt>
          <dd className="ml-auto font-medium">{n(dati.mangiate)} kcal</dd>
        </div>
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 shrink-0 text-muted-foreground" />
          <dt className="text-muted-foreground">Bruciate allenandoti</dt>
          <dd className="ml-auto font-medium">
            {dati.bruciate > 0 ? `− ${n(dati.bruciate)} kcal` : "0 kcal"}
          </dd>
        </div>
      </dl>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none py-1">Come lo calcoliamo</summary>
        <p className="mt-1">
          Il netto è quello che hai mangiato meno quello che hai bruciato
          allenandoti. L&apos;obiettivo invece si confronta con quello che hai
          mangiato, come nel diario: se l&apos;hai calcolato qui, comprende già
          l&apos;attività fisica che hai indicato, allenamenti compresi, e
          sottrarli di nuovo li conterebbe due volte. Le calorie bruciate sono
          una stima da durata, tipo di esercizio e peso: servono come ordine di
          grandezza.
        </p>
      </details>
    </div>
  );
}
