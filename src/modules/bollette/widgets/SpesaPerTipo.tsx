"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { listBollette } from "../queries";
import { TIPI, tipoColor, mesiPeriodo, type TipoBolletta } from "../types";
import { formatCurrency } from "@/lib/utils";

export default function SpesaPerTipo() {
  const [data, setData] = useState<
    { tipo: TipoBolletta; label: string; value: number }[] | null
  >(null);

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
    });
  }, []);

  if (data === null) return <p className="text-sm text-muted-foreground">…</p>;
  if (data.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        Nessun dato per l&apos;anno corrente.
      </p>
    );

  const totale = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <div className="mb-3 border-b pb-3">
        <p className="text-2xl font-semibold">{formatCurrency(totale)}</p>
        <p className="text-xs text-muted-foreground">
          Totale spese anno corrente (per periodo)
        </p>
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((d) => (
                <Cell key={d.tipo} fill={tipoColor(d.tipo)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, n) => [formatCurrency(v), n as string]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
