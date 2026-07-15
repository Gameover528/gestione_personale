"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listBollette } from "../queries";
import { type Bolletta, quotaAltra, tipoLabel } from "../types";
import { formatCurrency } from "@/lib/utils";

export default function DaRecuperare() {
  const [items, setItems] = useState<Bolletta[] | null>(null);

  useEffect(() => {
    listBollette({ divisione: "da_dividere" }).then(setItems);
  }, []);

  if (items === null)
    return <p className="text-sm text-muted-foreground">…</p>;

  const totale = items.reduce(
    (s, b) => s + quotaAltra(b.importo, b.persone_tue, b.persone_altre),
    0
  );

  return (
    <Link href="/bollette?divisione=da_dividere" className="block">
      <p className="text-3xl font-semibold">{formatCurrency(totale)}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        da recuperare · {items.length}{" "}
        {items.length === 1 ? "bolletta da dividere" : "bollette da dividere"}
      </p>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2 border-t pt-3">
          {items.slice(0, 4).map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">
                {b.fornitore}{" "}
                <span className="text-xs">({tipoLabel(b.tipo)})</span>
              </span>
              <span className="font-medium">
                {formatCurrency(
                  quotaAltra(b.importo, b.persone_tue, b.persone_altre)
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
