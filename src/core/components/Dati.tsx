"use client";

import { useCallback, useEffect, useState, type DependencyList } from "react";
import { RotateCcw } from "lucide-react";

/**
 * Leggere dei dati al montaggio, sapendo anche quando la lettura fallisce.
 *
 * PERCHÉ ESISTE. Il modo di caricare usato in giro per l'app era
 * `funzione().then(setDati)`, senza `.catch`: se la chiamata falliva (rete
 * assente, D1 che non risponde, sessione scaduta), i dati restavano null e il
 * riquadro restava su "Caricamento…" per sempre. Sembrava che i dati non ci
 * fossero, e non c'era niente da toccare. Ventisei punti così.
 *
 * Restituisce i dati (null finché non arrivano), se c'è stato un errore e una
 * funzione per riprovare. Una risposta che arriva dopo che le dipendenze sono
 * cambiate viene ignorata: non sovrascrive quella più recente.
 */
export function useDati<T>(
  carica: () => Promise<T>,
  dipendenze: DependencyList
): { dati: T | null; errore: boolean; riprova: () => void; aggiorna: (d: T) => void } {
  const [dati, setDati] = useState<T | null>(null);
  const [errore, setErrore] = useState(false);
  const [giro, setGiro] = useState(0);

  useEffect(() => {
    let attuale = true;
    setErrore(false);
    carica()
      .then((d) => {
        if (attuale) setDati(d);
      })
      .catch(() => {
        if (attuale) setErrore(true);
      });
    return () => {
      attuale = false;
    };
    // `carica` cambia a ogni render: contano le dipendenze dichiarate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dipendenze, giro]);

  const riprova = useCallback(() => setGiro((g) => g + 1), []);
  return { dati, errore, riprova, aggiorna: setDati };
}

/**
 * Cosa si vede quando una lettura fallisce: una frase in italiano, senza gergo
 * tecnico, e "Riprova". Prima, dove l'errore era gestito, i messaggi parlavano
 * di "migration del database", che a chi usa l'app non dice niente.
 */
export function StatoErrore({
  onRiprova,
  compatto = false,
}: {
  onRiprova: () => void;
  /** Per i riquadri piccoli della dashboard: una riga sola. */
  compatto?: boolean;
}) {
  return (
    <div
      role="alert"
      className={
        compatto
          ? "flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          : "flex flex-col items-start gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
      }
    >
      <span>Non riesco a caricare i dati. Controlla la connessione e riprova.</span>
      <button
        type="button"
        onClick={onRiprova}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 font-medium text-foreground transition hover:bg-accent lg:min-h-0 lg:py-1.5"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Riprova
      </button>
    </div>
  );
}
