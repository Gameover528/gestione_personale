"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getObiettivi, statistichePeriodo } from "../queries";
import {
  NUTRIENTI,
  VALORI_ZERO,
  type GiornoValori,
  type Nutriente,
  type Obiettivo,
} from "../types";
import { cn } from "@/lib/utils";

const GIORNI = 7;

/** Nutrienti in grammi: le calorie stanno nel riquadro dedicato. */
const MOSTRATI: Nutriente[] = ["proteine", "carboidrati", "grassi", "fibre"];

/**
 * Media dei macronutrienti sugli ultimi giorni, confrontata con gli obiettivi.
 * Completa il riquadro "di oggi": un singolo giorno oscilla molto, la media
 * settimanale dice se l'impostazione dei pasti sta funzionando.
 */
export default function MacroSettimana() {
  const [dati, setDati] = useState<GiornoValori[] | null>(null);
  const [obiettivi, setObiettivi] = useState<Obiettivo[]>([]);

  useEffect(() => {
    statistichePeriodo(GIORNI).then(setDati);
    getObiettivi().then(setObiettivi);
  }, []);

  if (dati === null) return <p className="text-sm text-muted-foreground">…</p>;

  const registrati = dati.length;
  if (registrati === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessun pasto registrato negli ultimi {GIORNI} giorni.
      </p>
    );
  }

  // Medie sui soli giorni registrati, come nella pagina Andamento.
  const medie = { ...VALORI_ZERO };
  for (const g of dati) for (const nu of NUTRIENTI) medie[nu.value] += g[nu.value];
  for (const nu of NUTRIENTI) medie[nu.value] /= registrati;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Media al giorno su {registrati}{" "}
        {registrati === 1 ? "giorno registrato" : "giorni registrati"}
      </p>

      <ul className="space-y-2.5">
        {MOSTRATI.map((n) => {
          const meta = NUTRIENTI.find((x) => x.value === n)!;
          const media = medie[n];
          const ob = obiettivi.find((o) => o.nutriente === n);
          const target = ob && ob.valore > 0 ? ob : null;
          const rispettato = target
            ? target.tipo === "max"
              ? media <= target.valore
              : media >= target.valore
            : null;
          const perc = target
            ? Math.min(100, (media / target.valore) * 100)
            : 0;

          return (
            <li key={n}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span>{meta.label}</span>
                <span className="flex items-baseline gap-2">
                  <span className="font-semibold">
                    {media.toFixed(1)}
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}
                      {meta.unita}
                    </span>
                  </span>
                  {target ? (
                    <span
                      className={cn(
                        "text-xs",
                        rispettato ? "text-success" : "text-destructive"
                      )}
                    >
                      {target.tipo === "max" ? "max" : "min"}{" "}
                      {target.valore.toFixed(0)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      nessun obiettivo
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-accent">
                <div
                  className={cn(
                    "h-full rounded-full",
                    target
                      ? rispettato
                        ? "bg-success"
                        : "bg-destructive"
                      : "bg-muted-foreground/40"
                  )}
                  // Senza obiettivo la barra non ha un riferimento: resta piena
                  // in grigio, come indicatore neutro.
                  style={{ width: `${target ? perc : 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <Link
        href="/alimentazione/andamento"
        className="inline-block text-sm text-primary hover:underline"
      >
        andamento completo
      </Link>
    </div>
  );
}
