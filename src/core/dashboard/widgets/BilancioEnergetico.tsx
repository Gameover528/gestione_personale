"use client";

import { useEffect, useState } from "react";
import { Flame, Utensils } from "lucide-react";
import { bilancioEnergetico, type BilancioEnergetico as Dati } from "../queries";

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
  const differenza = dati.obiettivo !== null ? netto - dati.obiettivo : null;
  const n = (v: number) => Math.round(v).toLocaleString("it-IT");

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold">{n(netto)}</span>
          <span className="text-sm text-muted-foreground">kcal nette oggi</span>
        </div>
        {differenza !== null && (
          <p className="mt-1 text-sm">
            {differenza <= 0 ? (
              <span className="text-muted-foreground">
                {n(Math.abs(differenza))} kcal sotto l&apos;obiettivo di{" "}
                {n(dati.obiettivo!)}
              </span>
            ) : (
              <span className="font-medium text-destructive">
                {n(differenza)} kcal oltre l&apos;obiettivo di {n(dati.obiettivo!)}
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

      {dati.bruciate > 0 && (
        <p className="text-xs text-muted-foreground">
          Le calorie bruciate sono una stima da durata, tipo di esercizio e peso
          corporeo: servono come ordine di grandezza.
        </p>
      )}
    </div>
  );
}
