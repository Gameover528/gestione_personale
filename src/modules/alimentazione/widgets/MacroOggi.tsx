"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { listPasti } from "../queries";
import { valoriPorzione, sommaValori } from "../types";

export default function MacroOggi() {
  const [data, setData] = useState<
    { name: string; value: number; fill: string }[] | null
  >(null);

  useEffect(() => {
    const oggi = new Date().toISOString().slice(0, 10);
    listPasti(oggi).then((p) => {
      const t = sommaValori(p.map(valoriPorzione));
      setData([
        { name: "Proteine", value: Number(t.proteine.toFixed(1)), fill: "#10b981" },
        { name: "Carboidrati", value: Number(t.carboidrati.toFixed(1)), fill: "#3b82f6" },
        { name: "Grassi", value: Number(t.grassi.toFixed(1)), fill: "#f59e0b" },
      ]);
    });
  }, []);

  if (data === null) return <p className="text-sm text-muted-foreground">…</p>;
  const somma = data.reduce((s, d) => s + d.value, 0);
  if (somma === 0)
    return (
      <p className="text-sm text-muted-foreground">Nessun dato per oggi.</p>
    );

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number, n) => [`${v} g`, n as string]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
