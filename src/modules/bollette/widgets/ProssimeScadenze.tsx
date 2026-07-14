"use client";

import { useEffect, useState } from "react";
import { listBollette } from "../queries";
import { type Bolletta, tipoLabel } from "../types";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { Badge } from "@/core/components/ui";

export default function ProssimeScadenze() {
  const [items, setItems] = useState<Bolletta[] | null>(null);

  useEffect(() => {
    listBollette({ stato: "da_pagare" }).then((b) => {
      const sorted = [...b].sort(
        (a, c) =>
          new Date(a.data_scadenza).getTime() -
          new Date(c.data_scadenza).getTime()
      );
      setItems(sorted.slice(0, 5));
    });
  }, []);

  if (items === null) return <p className="text-sm text-muted-foreground">…</p>;
  if (items.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        Nessuna scadenza in sospeso 🎉
      </p>
    );

  return (
    <ul className="space-y-2">
      {items.map((b) => {
        const gg = daysUntil(b.data_scadenza);
        return (
          <li key={b.id} className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">{b.fornitore}</p>
              <p className="text-xs text-muted-foreground">
                {tipoLabel(b.tipo)} · {formatDate(b.data_scadenza)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{formatCurrency(b.importo)}</span>
              {gg < 0 ? (
                <Badge variant="destructive">Scaduta</Badge>
              ) : gg <= 7 ? (
                <Badge variant="warning">{gg}g</Badge>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
