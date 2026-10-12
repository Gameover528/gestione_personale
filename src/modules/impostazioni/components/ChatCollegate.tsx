"use client";

import { useEffect, useState } from "react";
import { Eye, PenLine, Unplug } from "lucide-react";
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
 *
 * OGNI RIGA DICE SE QUELLA CHAT PUÒ SCRIVERE, e non è un dettaglio: da quando
 * il permesso esiste, due collegamenti identici a vedersi possono essere uno
 * che guarda e uno che ti aggiunge pasti nel diario. Qui si decide se
 * staccarne uno, e non si può decidere senza sapere cosa fa.
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
        Leggono il tuo diario alimentare e il registro del peso. Alcune possono
        anche scriverci, se gliel&apos;hai concesso: lo dice ogni riga. Nessuna
        vede il resto dell&apos;app.
      </p>
      <ul className="mt-3 divide-y">
        {righe.map((r) => (
          <li
            key={r.sessione}
            className="flex items-start justify-between gap-3 py-2.5 text-sm"
          >
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  Collegata il {formatDate(r.creato.slice(0, 10))}
                </span>
                {/*
                  Il permesso si legge come etichetta e non come icona sola:
                  un'icona va indovinata, e qui l'informazione è "questa cosa
                  può scrivere nei miei dati".
                */}
                {r.scrive ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-warning/50 bg-warning/10 px-2 py-0.5 text-xs font-medium">
                    <PenLine className="h-3 w-3 text-warning" />
                    Legge e scrive
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    Solo lettura
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {r.ultimoUso
                  ? `usata l'ultima volta il ${formatDate(r.ultimoUso.slice(0, 10))}`
                  : "non ancora usata"}
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
