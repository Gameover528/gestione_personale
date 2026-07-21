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
  Legend,
  LabelList,
} from "recharts";
import { listPasti, getObiettivi } from "../queries";
import {
  NUTRIENTI,
  valoriPorzione,
  sommaValori,
  type Nutriente,
  type Obiettivo,
} from "../types";

// Nutrienti in grammi (le calorie stanno nel widget "Calorie di oggi").
const IN_GRAMMI: Nutriente[] = [
  "proteine",
  "carboidrati",
  "grassi",
  "fibre",
  "zuccheri",
  "sale",
];

type Riga = {
  nome: string;
  consumato: number;
  obiettivo: number | null;
  tipo: "min" | "max" | null;
};

export default function MacroOggi() {
  const [data, setData] = useState<Riga[] | null>(null);

  useEffect(() => {
    const oggi = new Date().toISOString().slice(0, 10);
    Promise.all([listPasti(oggi), getObiettivi()]).then(([pasti, obiettivi]) => {
      const tot = sommaValori(pasti.map(valoriPorzione));
      const obMap = new Map<Nutriente, Obiettivo>(
        obiettivi.map((o) => [o.nutriente, o])
      );
      const righe: Riga[] = IN_GRAMMI.map((n) => {
        const meta = NUTRIENTI.find((x) => x.value === n)!;
        const ob = obMap.get(n);
        return {
          nome: meta.label,
          consumato: Number(tot[n].toFixed(1)),
          obiettivo: ob && ob.valore > 0 ? Number(ob.valore) : null,
          tipo: ob ? ob.tipo : null,
        };
      }).filter((r) => r.consumato > 0 || r.obiettivo !== null);
      setData(righe);
    });
  }, []);

  if (data === null) return <p className="text-sm text-muted-foreground">…</p>;
  if (data.length === 0)
    return <p className="text-sm text-muted-foreground">Nessun dato per oggi.</p>;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis dataKey="nome" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis fontSize={11} tickLine={false} axisLine={false} unit="g" />
          <Tooltip formatter={(v: number, n) => [`${v} g`, n as string]} />
          <Legend />
          <Bar dataKey="consumato" name="Consumato" fill="#3b82f6" radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="consumato"
              position="top"
              fontSize={10}
              formatter={(v: number) => (v > 0 ? v : "")}
            />
          </Bar>
          <Bar
            dataKey="obiettivo"
            name="Obiettivo (min/max)"
            fill="#cbd5e1"
            radius={[4, 4, 0, 0]}
          >
            <LabelList
              dataKey="obiettivo"
              position="top"
              fontSize={10}
              formatter={(v: number) => (v ? v : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
