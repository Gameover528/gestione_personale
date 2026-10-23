"use client";

import { useEffect, useState } from "react";
import { StatoErrore } from "@/core/components/Dati";
import { listBollette } from "../queries";
import { TIPI, mesiPeriodo, type TipoBolletta } from "../types";
import { cn, formatCurrency } from "@/lib/utils";
import { barraValoreClass } from "@/core/components/controls";

export default function SpesaPerTipo() {
  const [data, setData] = useState<
    { tipo: TipoBolletta; label: string; value: number }[] | null
  >(null);
  const [errore, setErrore] = useState(false);
  const [giro, setGiro] = useState(0);

  useEffect(() => {
    const anno = new Date().getFullYear();
    listBollette().then((b) => {
      const map = new Map<TipoBolletta, number>();
      for (const x of b) {
        const mesi = mesiPeriodo(
          x.periodo_inizio,
          x.periodo_fine,
          x.data_scadenza
        );
        const quota = Number(x.importo) / mesi.length;
        const inAnno = mesi.filter((m) => m.anno === anno).length;
        if (inAnno > 0)
          map.set(x.tipo, (map.get(x.tipo) ?? 0) + quota * inAnno);
      }
      const rows = TIPI.map((t) => ({
        tipo: t.value,
        label: t.label,
        value: map.get(t.value) ?? 0,
      })).filter((r) => r.value > 0);
      setData(rows);
    }).catch(() => setErrore(true));
  }, [giro]);

  if (errore) {
    return (
      <StatoErrore
        compatto
        onRiprova={() => {
          setErrore(false);
          setGiro((g) => g + 1);
        }}
      />
    );
  }
  if (data === null) return <p className="text-sm text-muted-foreground">…</p>;
  if (data.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        Nessun dato per l&apos;anno corrente.
      </p>
    );

  const totale = data.reduce((s, d) => s + d.value, 0);
  const righe = [...data].sort((a, b) => b.value - a.value);

  return (
    <div>
      <div className="mb-3 border-b pb-3">
        <p className="text-2xl font-semibold">{formatCurrency(totale)}</p>
        <p className="text-xs text-muted-foreground">
          Totale spese anno corrente (per periodo)
        </p>
      </div>
      {/*
        Barre in un colore solo, dalla voce piu' cara. Prima era una ciambella
        con un colore fisso per tipo: sette colori da riconoscere senza
        legenda (il nome si leggeva solo passandoci sopra), e il gas in rosso
        sembrava un errore. Qui nome e importo stanno scritti accanto alla
        barra, che serve solo a confrontare.
      */}
      <ul className="space-y-2">
        {righe.map((d) => (
          <li key={d.tipo}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span>{d.label}</span>
              <span className="font-medium">{formatCurrency(d.value)}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-accent">
              <div
                className={cn(barraValoreClass, "bg-serie-1")}
                style={{ width: `${(d.value / righe[0].value) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
