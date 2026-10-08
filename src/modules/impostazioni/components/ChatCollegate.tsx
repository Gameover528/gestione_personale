"use client";

import { useEffect, useState } from "react";
import { Unplug } from "lucide-react";
import {
  listCollegamenti,
  staccaCollegamento,
  type Collegamento,
} from "@/lib/oauth/collegamenti";
import { Card, CardTitle } from "@/core/components/ui";
import { formatDate } from "@/lib/utils";

/**
 * Le chat a cui si è dato accesso ai propri dati.
 *
 * Il riquadro compare solo se ce n'è almeno una: a chi non ha mai collegato
 * niente non direbbe niente, e una pagina di impostazioni piena di sezioni
 * vuote è una pagina che si smette di leggere.
 */
export function ChatCollegate() {
  const [righe, setRighe] = useState<Collegamento[] | null>(null);
  const [inCorso, setInCorso] = useState<string | null>(null);

  useEffect(() => {
    listCollegamenti()
      .then(setRighe)
      .catch(() => setRighe([]));
  }, []);

  async function stacca(sessione: string) {
    setInCorso(sessione);
    try {
      await staccaCollegamento(sessione);
      setRighe((prev) => (prev ?? []).filter((r) => r.sessione !== sessione));
    } finally {
      setInCorso(null);
    }
  }

  if (!righe || righe.length === 0) return null;

  return (
    <Card>
      <CardTitle>Chat collegate</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        Possono leggere il tuo diario alimentare e il registro del peso. Non
        possono scrivere niente né vedere il resto dell&apos;app.
      </p>
      <ul className="mt-3 divide-y">
        {righe.map((r) => (
          <li
            key={r.sessione}
            className="flex items-center justify-between gap-3 py-2 text-sm"
          >
            <span className="min-w-0">
              <span className="font-medium">
                Collegata il {formatDate(r.creato.slice(0, 10))}
              </span>
              <span className="block text-xs text-muted-foreground">
                {r.ultimoUso
                  ? `ultima lettura il ${formatDate(r.ultimoUso.slice(0, 10))}`
                  : "non ha ancora letto niente"}
              </span>
            </span>
            <button
              onClick={() => stacca(r.sessione)}
              disabled={inCorso === r.sessione}
              className="inline-flex shrink-0 items-center gap-2 rounded-md border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
            >
              <Unplug className="h-3.5 w-3.5" />
              {inCorso === r.sessione ? "Stacco…" : "Stacca"}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
