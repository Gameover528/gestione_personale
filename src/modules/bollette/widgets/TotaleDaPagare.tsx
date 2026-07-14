"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listBollette } from "../queries";
import { formatCurrency } from "@/lib/utils";

export default function TotaleDaPagare() {
  const [totale, setTotale] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    listBollette({ stato: "da_pagare" }).then((b) => {
      setTotale(b.reduce((s, x) => s + Number(x.importo), 0));
      setCount(b.length);
    });
  }, []);

  return (
    <Link href="/bollette?stato=da_pagare" className="block">
      <p className="text-3xl font-semibold">
        {totale === null ? "…" : formatCurrency(totale)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {count} {count === 1 ? "bolletta da pagare" : "bollette da pagare"}
      </p>
    </Link>
  );
}
