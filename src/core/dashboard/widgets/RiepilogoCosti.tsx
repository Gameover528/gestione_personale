"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { riepilogoCosti, type RiepilogoCosti as Dati } from "../queries";
import { tipoLabel } from "@/modules/bollette/types";
import { Badge } from "@/core/components/ui";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";

/**
 * Il riquadro principale dell'area: quanto c'è da pagare, quanto è già stato
 * speso in tutto e cosa scade per primo.
 *
 * I tre dati erano due riquadri separati, ma si leggono insieme — "devo
 * ancora X, ne ho già spesi Y, il prossimo scade il Z" — e adesso arrivano
 * con una sola richiesta invece di tre.
 */
export default function RiepilogoCosti() {
  const [dati, setDati] = useState<Dati | null>(null);

  useEffect(() => {
    riepilogoCosti().then(setDati);
  }, []);

  if (dati === null) return <p className="text-sm text-muted-foreground">…</p>;

  const { daPagare, giaPagato } = dati;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)]">
      <Link href="/bollette?stato=da_pagare" className="block">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Da pagare
        </p>
        <p className="mt-1 text-3xl font-semibold">
          {formatCurrency(daPagare.totale)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {daPagare.count}{" "}
          {daPagare.count === 1 ? "bolletta da pagare" : "bollette da pagare"}
        </p>
      </Link>

      <Link href="/consumi-costi" className="block lg:border-l lg:pl-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Già pagato
        </p>
        <p className="mt-1 text-3xl font-semibold">
          {formatCurrency(giaPagato.totale)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {giaPagato.count}{" "}
          {giaPagato.count === 1 ? "costo sostenuto" : "costi sostenuti"} ·
          bollette + abbonamenti
        </p>
      </Link>

      <div className="sm:col-span-2 lg:col-span-1 lg:border-l lg:pl-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Prossime scadenze
        </p>
        {daPagare.prossime.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessuna scadenza in sospeso 🎉
          </p>
        ) : (
          <ul className="space-y-2">
            {daPagare.prossime.map((b) => {
              const gg = daysUntil(b.data_scadenza);
              return (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.fornitore}</p>
                    <p className="text-xs text-muted-foreground">
                      {tipoLabel(b.tipo)} · {formatDate(b.data_scadenza)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-medium">
                      {formatCurrency(b.importo)}
                    </span>
                    {gg < 0 ? (
                      <Badge variant="destructive">Scaduta</Badge>
                    ) : gg <= 7 ? (
                      <Badge variant="warning">{gg}g</Badge>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
