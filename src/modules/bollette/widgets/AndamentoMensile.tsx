"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { listBollette } from "../queries";
import { formatCurrency } from "@/lib/utils";

const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

export default function AndamentoMensile() {
  const [data, setData] = useState<{ mese: string; totale: number }[] | null>(
    null
  );

  useEffect(() => {
    const anno = new Date().getFullYear();
    listBollette({ anno }).then((b) => {
      const totals = new Array(12).fill(0);
      for (const x of b) {
        const m = new Date(x.data_scadenza).getMonth();
        totals[m] += Number(x.importo);
      }
      setData(MESI.map((mese, i) => ({ mese, totale: totals[i] })));
    });
  }, []);

  if (data === null) return <p className="text-sm text-muted-foreground">…</p>;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis dataKey="mese" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Bar dataKey="totale" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
