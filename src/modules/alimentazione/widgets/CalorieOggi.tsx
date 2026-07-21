"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listPasti, getObiettivi } from "../queries";
import { valoriPorzione, sommaValori } from "../types";
import { cn } from "@/lib/utils";

export default function CalorieOggi() {
  const [tot, setTot] = useState<number | null>(null);
  const [target, setTarget] = useState<{ valore: number; tipo: "min" | "max" } | null>(
    null
  );

  useEffect(() => {
    const oggi = new Date().toISOString().slice(0, 10);
    listPasti(oggi).then((p) =>
      setTot(sommaValori(p.map(valoriPorzione)).kcal)
    );
    getObiettivi().then((o) => {
      const k = o.find((x) => x.nutriente === "kcal");
      setTarget(k ? { valore: k.valore, tipo: k.tipo } : null);
    });
  }, []);

  const perc =
    target && target.valore > 0 && tot !== null
      ? Math.min(100, (tot / target.valore) * 100)
      : 0;
  const over = target ? (tot ?? 0) > target.valore : false;

  return (
    <Link href="/alimentazione" className="block">
      <p className="text-3xl font-semibold">
        {tot === null ? "…" : Math.round(tot)}{" "}
        <span className="text-base font-normal text-muted-foreground">kcal</span>
      </p>
      {target ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            obiettivo {target.tipo === "max" ? "max" : "min"}{" "}
            {Math.round(target.valore)} kcal
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-accent">
            <div
              className={cn(
                "h-full rounded-full",
                over ? "bg-destructive" : "bg-success"
              )}
              style={{ width: `${perc}%` }}
            />
          </div>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          nessun obiettivo impostato
        </p>
      )}
    </Link>
  );
}
