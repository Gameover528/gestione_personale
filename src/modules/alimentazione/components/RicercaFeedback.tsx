"use client";

import { Loader2, RefreshCw } from "lucide-react";
import type { StatoRicerca } from "./useRicercaAlimenti";

/**
 * Messaggi di stato della ricerca. Tiene distinti i tre casi che l'utente
 * deve poter capire: sto ancora cercando, non ho trovato niente, le fonti
 * esterne non hanno risposto (e allora ha senso riprovare).
 */
export function RicercaFeedback({
  stato,
  cercato,
  risultati,
  onRiprova,
}: {
  stato: StatoRicerca;
  cercato: string;
  risultati: number;
  onRiprova: () => void;
}) {
  if (!cercato) return null;

  return (
    <>
      {stato === "caricando" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cerco anche su Open Food Facts…
        </p>
      )}

      {stato === "irraggiungibile" && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-warning/50 bg-warning/5 px-3 py-2 text-sm">
          <span>
            Gli archivi esterni non hanno risposto: il problema è la connessione
            o il servizio, non la tua ricerca.
          </span>
          <button
            onClick={onRiprova}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-medium transition hover:bg-accent"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Riprova
          </button>
        </div>
      )}

      {stato === "ok" && risultati === 0 && (
        <p className="text-sm text-muted-foreground">
          Nessun risultato per «{cercato}». Prova con un nome piu&apos; generico,
          oppure inseriscilo a mano.
        </p>
      )}
    </>
  );
}
