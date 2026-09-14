"use client";

import { useState } from "react";
import { sincronizzaProdSuDevAction } from "../sync";
import { Card, CardTitle } from "@/core/components/ui";
import { RefreshCw } from "lucide-react";

export function SincronizzaProdSuDev() {
  const [in_corso, setInCorso] = useState(false);
  const [risultato, setRisultato] = useState<{
    error?: string;
    riepilogo?: Record<string, number>;
  } | null>(null);

  async function handleSync() {
    if (
      !confirm(
        "Sostituisce i TUOI dati su dev (bollette, abbonamenti, diario, piatti, " +
          "obiettivi, preferenze) con quelli del tuo account di produzione. " +
          "Gli altri profili di test su dev non vengono toccati. Continuare?"
      )
    )
      return;

    setInCorso(true);
    setRisultato(null);
    try {
      const res = await sincronizzaProdSuDevAction();
      setRisultato(res);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Card>
      <CardTitle>Porta i miei dati da produzione (solo superadmin)</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        Copia su dev i dati del tuo account presi da produzione (individuato dalla tua
        email), per testare con dati reali senza mai scrivere su produzione. Rimpiazza
        solo le tue righe: gli altri profili di test presenti su dev restano intatti, e
        la sessione resta valida (niente login da rifare). Funziona solo
        nell&apos;ambiente di sviluppo. Non copia gli allegati PDF (restano su Workers KV
        di produzione, quindi da dev non saranno apribili).
      </p>
      <button
        onClick={handleSync}
        disabled={in_corso}
        className="mt-3 inline-flex items-center gap-2 rounded-md border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
      >
        <RefreshCw className="h-4 w-4" />
        {in_corso ? "Sincronizzazione…" : "Sincronizza ora"}
      </button>

      {risultato?.error && (
        <p className="mt-3 text-sm text-destructive">{risultato.error}</p>
      )}
      {risultato?.riepilogo && (
        <div className="mt-3 text-sm text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Fatto:</p>
          <ul className="space-y-0.5">
            {Object.entries(risultato.riepilogo).map(([tabella, count]) => (
              <li key={tabella}>
                {tabella}: {count}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
