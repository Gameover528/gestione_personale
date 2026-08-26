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
        "Questo SOVRASCRIVE tutti i dati dell'ambiente di sviluppo con una copia fresca di quelli di produzione. " +
          "Tutto ciò che c'è ora su dev (bollette, abbonamenti, diario, ecc. di test) verrà perso. " +
          "Dopo l'operazione dovrai rifare login su dev con le tue credenziali di produzione. Continuare?"
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
      <CardTitle>Sincronizza dati da produzione (solo superadmin)</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        Sostituisce tutti i dati di questo ambiente (dev) con una copia fresca di quelli
        di produzione, per testare con dati reali senza mai scrivere su produzione.
        Funziona solo nell&apos;ambiente di sviluppo. Non copia gli allegati PDF (restano
        su Workers KV di produzione). Dopo la sincronizzazione le sessioni attive su dev
        vengono invalidate: serve rifare login con le credenziali di produzione.
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
