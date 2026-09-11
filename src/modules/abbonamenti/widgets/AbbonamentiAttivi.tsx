"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { riepilogoAbbonamenti, type RiepilogoAbbonamenti } from "../queries";
import { Badge } from "@/core/components/ui";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";

/**
 * Spesa mensile degli abbonamenti e cosa si paga adesso.
 *
 * Il solo totale lasciava il riquadro quasi vuoto (una cifra e una riga), e
 * in una griglia a righe allineate quel vuoto diventava alto quanto il
 * riquadro più alto della riga. L'elenco delle prossime rate è il dato che
 * mancava davvero: dice quando esce il prossimo addebito.
 */
export default function AbbonamentiAttivi() {
  const [dati, setDati] = useState<RiepilogoAbbonamenti | null>(null);

  useEffect(() => {
    riepilogoAbbonamenti().then(setDati);
  }, []);

  return (
    <div>
      <Link href="/abbonamenti" className="block">
        <p className="text-3xl font-semibold">
          {dati === null ? "…" : formatCurrency(dati.totaleMensile)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            /mese
          </span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {dati?.attivi ?? 0}{" "}
          {dati?.attivi === 1 ? "abbonamento attivo" : "abbonamenti attivi"}
        </p>
      </Link>

      {dati !== null && dati.prossime.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Prossime rate
          </p>
          <ul className="space-y-2">
            {dati.prossime.map((r) => {
              const gg = daysUntil(r.data_scadenza);
              return (
                <li
                  key={r.abbonamento_id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.data_scadenza)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-medium">
                      {formatCurrency(r.importo)}
                    </span>
                    {r.arretrata ? (
                      <Badge variant="destructive">da pagare</Badge>
                    ) : gg <= 7 ? (
                      <Badge variant="warning">{gg}g</Badge>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
