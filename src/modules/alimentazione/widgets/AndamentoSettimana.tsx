"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getObiettivi, statistichePeriodo } from "../queries";
import type { GiornoValori, Obiettivo } from "../types";

const GIORNI = 7;
const SIGLE = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

/** Ultimi GIORNI giorni, oggi compreso. */
function ultimiGiorni(): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (GIORNI - 1));
  for (let i = 0; i < GIORNI; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export default function AndamentoSettimana() {
  const [dati, setDati] = useState<GiornoValori[] | null>(null);
  const [obKcal, setObKcal] = useState<Obiettivo | null>(null);

  useEffect(() => {
    statistichePeriodo(GIORNI).then(setDati);
    getObiettivi().then((o) =>
      setObKcal(o.find((x) => x.nutriente === "kcal") ?? null)
    );
  }, []);

  if (dati === null) return <p className="text-sm text-muted-foreground">…</p>;

  const perData = new Map(dati.map((g) => [g.data, g]));
  const serie = ultimiGiorni().map((data) => ({
    label: SIGLE[new Date(`${data}T00:00:00Z`).getUTCDay()],
    kcal: perData.get(data)?.kcal ?? 0,
  }));
  const registrati = dati.length;
  const media =
    registrati > 0
      ? dati.reduce((s, g) => s + g.kcal, 0) / registrati
      : 0;

  return (
    <Link href="/alimentazione/andamento" className="block">
      <p className="text-sm text-muted-foreground">
        {registrati > 0
          ? `Media ${Math.round(media)} kcal su ${registrati} giorni registrati`
          : "Nessun pasto registrato negli ultimi 7 giorni"}
      </p>
      <div className="mt-2 h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={serie} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={false}
              // Include l'obiettivo nella scala, così la sua linea si vede sempre.
              domain={[0, (max: number) => Math.ceil(Math.max(max, obKcal?.valore ?? 0))]}
            />
            <Tooltip formatter={(v: number) => [`${Math.round(v)} kcal`, "Calorie"]} />
            {obKcal && obKcal.valore > 0 && (
              <ReferenceLine
                y={obKcal.valore}
                stroke="hsl(var(--destructive))"
                strokeDasharray="4 4"
              />
            )}
            <Bar dataKey="kcal" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Link>
  );
}
