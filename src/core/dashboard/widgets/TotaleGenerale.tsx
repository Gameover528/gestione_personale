"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listBollette } from "@/modules/bollette/queries";
import { totaleRatePagate } from "@/modules/abbonamenti/queries";
import { formatCurrency } from "@/lib/utils";

export default function TotaleGenerale() {
  const [totale, setTotale] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    Promise.all([
      listBollette({ stato: "pagata" }),
      totaleRatePagate(),
    ]).then(([bollette, rate]) => {
      const totBollette = bollette.reduce((s, b) => s + Number(b.importo), 0);
      setTotale(totBollette + rate.totale);
      setCount(bollette.length + rate.count);
    });
  }, []);

  return (
    <Link href="/consumi-costi" className="block">
      <p className="text-3xl font-semibold">
        {totale === null ? "…" : formatCurrency(totale)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {count} {count === 1 ? "costo già sostenuto" : "costi già sostenuti"} · bollette + abbonamenti
      </p>
    </Link>
  );
}
