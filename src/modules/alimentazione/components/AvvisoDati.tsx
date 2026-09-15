"use client";

import { AlertTriangle } from "lucide-react";
import type { ValoriNutrizionali } from "../types";
import { valida, messaggioProblemi } from "../validazione";

/**
 * Il triangolino accanto a un alimento con valori che non tornano.
 *
 * È volutamente un avviso e non un blocco: i dati vengono da archivi pubblici
 * compilati da altre persone, sbagliano di continuo, e impedire di registrare
 * un pasto perché un archivio esterno ha scritto male un numero sarebbe peggio
 * del problema. Chi legge vede che quel valore è da guardare, e lo corregge se
 * gli interessa.
 *
 * Il motivo sta nel `title` e in un testo per i lettori di schermo: un'icona
 * rossa senza spiegazione dice che c'è un problema ma non quale.
 */
export function AvvisoDati({
  valori,
  className = "",
}: {
  /** Valori per 100 g dell'alimento. */
  valori: ValoriNutrizionali;
  className?: string;
}) {
  const esito = valida(valori);
  const messaggio = messaggioProblemi(esito);
  if (!messaggio) return null;

  return (
    <span
      title={messaggio}
      className={`inline-flex shrink-0 items-center text-warning ${className}`}
    >
      <AlertTriangle className="h-4 w-4" aria-hidden />
      <span className="sr-only">{messaggio}</span>
    </span>
  );
}

/**
 * La versione estesa, per le pagine di dettaglio dove c'è spazio per dire
 * cos'è che non torna senza doverci passare sopra col mouse.
 */
export function AvvisoDatiEsteso({ valori }: { valori: ValoriNutrizionali }) {
  const esito = valida(valori);
  const messaggio = messaggioProblemi(esito);
  if (!messaggio) return null;

  return (
    <div className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <p>{messaggio}</p>
    </div>
  );
}
