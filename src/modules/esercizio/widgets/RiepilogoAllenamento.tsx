"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dumbbell, Flame, Timer } from "lucide-react";
import { riepilogoAllenamento, type RiepilogoAllenamento as Dati } from "../allenamenti";

/**
 * Quanto ci si è allenati negli ultimi sette giorni.
 *
 * Una chiamata sola: il riepilogo arriva già calcolato dal server, come gli
 * altri riquadri dopo il lavoro sulle invocazioni del worker.
 */
export default function RiepilogoAllenamentoWidget() {
  const [dati, setDati] = useState<Dati | null>(null);

  useEffect(() => {
    riepilogoAllenamento(7).then(setDati);
  }, []);

  if (!dati) {
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  }

  if (dati.sessioni === 0) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted-foreground">
          Nessun allenamento negli ultimi 7 giorni.
        </p>
        <Link
          href="/esercizio"
          prefetch={false}
          className="text-sm font-medium text-primary hover:underline"
        >
          Registra un allenamento
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold">{dati.sessioni}</span>
        <span className="text-sm text-muted-foreground">
          {dati.sessioni === 1 ? "allenamento" : "allenamenti"} in 7 giorni
        </span>
      </div>

      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 shrink-0 text-muted-foreground" />
          <dt className="text-muted-foreground">Tempo</dt>
          <dd className="ml-auto font-medium">{dati.minuti} min</dd>
        </div>
        {dati.kcal > 0 && (
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 shrink-0 text-muted-foreground" />
            <dt className="text-muted-foreground">Bruciate (stima)</dt>
            <dd className="ml-auto font-medium">
              {dati.kcal.toLocaleString("it-IT")} kcal
            </dd>
          </div>
        )}
        {dati.kcalOggi > 0 && (
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 shrink-0 text-muted-foreground" />
            <dt className="text-muted-foreground">Di cui oggi</dt>
            <dd className="ml-auto font-medium">
              {dati.kcalOggi.toLocaleString("it-IT")} kcal
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
