"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAbbonamenti } from "../queries";
import { formatCurrency } from "@/lib/utils";

export default function AbbonamentiAttivi() {
  const [totaleMensile, setTotaleMensile] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    listAbbonamenti().then((all) => {
      const attivi = all.filter((a) => a.stato === "attivo");
      setCount(attivi.length);
      const moltiplicatore: Record<string, number> = {
        settimanale: 52 / 12,
        mensile: 1,
        bimestrale: 1 / 2,
        trimestrale: 1 / 3,
        semestrale: 1 / 6,
        annuale: 1 / 12,
      };
      setTotaleMensile(
        attivi.reduce((s, a) => s + a.importo * (moltiplicatore[a.frequenza] ?? 1), 0)
      );
    });
  }, []);

  return (
    <Link href="/abbonamenti" className="block">
      <p className="text-3xl font-semibold">
        {totaleMensile === null ? "…" : formatCurrency(totaleMensile)}
        <span className="ml-1 text-sm font-normal text-muted-foreground">/mese</span>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {count} {count === 1 ? "abbonamento attivo" : "abbonamenti attivi"}
      </p>
    </Link>
  );
}
