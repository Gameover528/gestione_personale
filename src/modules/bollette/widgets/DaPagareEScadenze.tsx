"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listBollette } from "../queries";
import { type Bolletta, tipoLabel } from "../types";
import { Badge } from "@/core/components/ui";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";

/**
 * Quanto c'è da pagare e cosa scade per primo, in un unico riquadro.
 *
 * Erano due widget separati che facevano la stessa interrogazione: guardarli
 * insieme è il modo in cui si usano (il totale dice quanto, l'elenco dice
 * quando), e così il dato viene chiesto una volta sola.
 */
export default function DaPagareEScadenze() {
  const [bollette, setBollette] = useState<Bolletta[] | null>(null);

  useEffect(() => {
    listBollette({ stato: "da_pagare" }).then(setBollette);
  }, []);

  if (bollette === null)
    return <p className="text-sm text-muted-foreground">…</p>;

  const totale = bollette.reduce((s, b) => s + Number(b.importo), 0);
  const prossime = [...bollette]
    .sort(
      (a, b) =>
        new Date(a.data_scadenza).getTime() - new Date(b.data_scadenza).getTime()
    )
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Link href="/bollette?stato=da_pagare" className="block">
        <p className="text-3xl font-semibold">{formatCurrency(totale)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {bollette.length}{" "}
          {bollette.length === 1 ? "bolletta da pagare" : "bollette da pagare"}
        </p>
      </Link>

      <div className="sm:border-l sm:pl-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Prossime scadenze
        </p>
        {prossime.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessuna scadenza in sospeso 🎉
          </p>
        ) : (
          <ul className="space-y-2">
            {prossime.map((b) => {
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
