"use client";

import type { AnteprimaWidget } from "@/core/modules/types";
import { cn } from "@/lib/utils";

/**
 * Disegna l'anteprima di un widget a partire dalla sua descrizione dichiarativa.
 *
 * I dati sono inventati e fissi: l'anteprima serve a far vedere che forma avrà
 * il riquadro, e interrogare il database per ogni widget disponibile solo per
 * popolare un pannello di scelta costerebbe molto più di quanto valga.
 */
export function Anteprima({ spec }: { spec?: AnteprimaWidget }) {
  if (!spec) {
    return (
      <div className="flex h-24 items-center justify-center rounded-md bg-muted/60 text-xs text-muted-foreground">
        nessuna anteprima
      </div>
    );
  }

  if (spec.tipo === "numero") {
    return (
      <div className="rounded-md bg-muted/40 p-3">
        <p className="text-2xl font-semibold">{spec.valore}</p>
        {spec.nota && (
          <p className="mt-0.5 text-xs text-muted-foreground">{spec.nota}</p>
        )}
        {spec.barra !== undefined && (
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-accent">
            <div
              className="h-full rounded-full bg-success"
              style={{ width: `${Math.min(100, Math.max(0, spec.barra))}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  if (spec.tipo === "elenco") {
    return (
      <ul className="space-y-1.5 rounded-md bg-muted/40 p-3">
        {spec.righe.map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate">
              {r.testo}
              {r.nota && (
                <span className="text-muted-foreground"> · {r.nota}</span>
              )}
            </span>
            {r.badge && (
              <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
                {r.badge}
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (spec.tipo === "barre") {
    const max = Math.max(...spec.valori, spec.soglia ?? 0, 1);
    return (
      <div className="rounded-md bg-muted/40 p-3">
        <div className="relative flex h-24 items-end gap-1.5">
          {spec.soglia !== undefined && (
            <div
              className="absolute inset-x-0 border-t border-dashed border-destructive/70"
              style={{ bottom: `${(spec.soglia / max) * 100}%` }}
              aria-hidden
            />
          )}
          {spec.valori.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-primary"
              style={{ height: `${Math.max(2, (v / max) * 100)}%` }}
            />
          ))}
        </div>
        {spec.etichette && (
          <div className="mt-1 flex gap-1.5 text-[10px] text-muted-foreground">
            {spec.etichette.map((e, i) => (
              <span key={i} className="flex-1 text-center">
                {e}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-2 rounded-md bg-muted/40 p-3">
      {spec.voci.map((v, i) => (
        <li key={i}>
          <div className="flex items-baseline justify-between text-xs">
            <span>{v.nome}</span>
            <span className="font-medium">{v.valore}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-accent">
            <div
              className={cn(
                "h-full rounded-full",
                v.ok === false ? "bg-destructive" : "bg-success"
              )}
              style={{ width: `${Math.min(100, Math.max(0, v.perc))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
