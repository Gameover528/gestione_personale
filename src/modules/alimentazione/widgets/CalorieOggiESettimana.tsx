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
import { cn, oggiIso, spostaGiorno } from "@/lib/utils";

const GIORNI = 7;
const SIGLE = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

/**
 * Calorie di oggi e andamento della settimana in un unico riquadro: il numero
 * di oggi da solo dice poco senza il contesto dei giorni precedenti.
 */
export default function CalorieOggiESettimana() {
  const [dati, setDati] = useState<GiornoValori[] | null>(null);
  const [obKcal, setObKcal] = useState<Obiettivo | null>(null);

  useEffect(() => {
    // Una sola query copre entrambe le cose: oggi è l'ultimo dei 7 giorni.
    statistichePeriodo(GIORNI).then(setDati);
    getObiettivi().then((o) =>
      setObKcal(o.find((x) => x.nutriente === "kcal") ?? null)
    );
  }, []);

  if (dati === null) return <p className="text-sm text-muted-foreground">…</p>;

  const oggi = oggiIso();
  const perData = new Map(dati.map((g) => [g.data, g]));
  const kcalOggi = perData.get(oggi)?.kcal ?? 0;

  // Un giorno senza registrazioni resta vuoto: non è un giorno a zero calorie.
  const serie = Array.from({ length: GIORNI }, (_, i) => {
    const data = spostaGiorno(oggi, -(GIORNI - 1 - i));
    return {
      label: SIGLE[new Date(`${data}T00:00:00Z`).getUTCDay()],
      kcal: perData.get(data)?.kcal ?? null,
    };
  });

  const registrati = dati.length;
  const media =
    registrati > 0 ? dati.reduce((s, g) => s + g.kcal, 0) / registrati : 0;

  const target = obKcal && obKcal.valore > 0 ? obKcal : null;
  const perc = target ? Math.min(100, (kcalOggi / target.valore) * 100) : 0;
  const sopra = target ? kcalOggi > target.valore : false;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Oggi</p>
          <p className="text-3xl font-semibold">
            {Math.round(kcalOggi)}{" "}
            <span className="text-base font-normal text-muted-foreground">
              kcal
            </span>
          </p>
          {target ? (
            <p className="mt-1 text-sm text-muted-foreground">
              obiettivo {target.tipo === "max" ? "max" : "min"}{" "}
              {Math.round(target.valore)} kcal
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              nessun obiettivo impostato
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Media 7 giorni</p>
          <p className="text-xl font-semibold">
            {registrati > 0 ? Math.round(media) : "—"}{" "}
            <span className="text-sm font-normal text-muted-foreground">kcal</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {registrati > 0
              ? `su ${registrati} giorni registrati`
              : "nessun giorno registrato"}
          </p>
        </div>
      </div>

      {target && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
          <div
            className={cn(
              "h-full rounded-full",
              sopra ? "bg-destructive" : "bg-success"
            )}
            style={{ width: `${perc}%` }}
          />
        </div>
      )}

      <div
        role="img"
        aria-label={`Calorie degli ultimi 7 giorni: media ${Math.round(media)} kcal su ${registrati} giorni registrati, oggi ${Math.round(kcalOggi)} kcal.`}
        className="h-36 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={serie} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={false}
              // Include l'obiettivo nella scala, così la sua linea si vede sempre.
              domain={[0, (max: number) => Math.ceil(Math.max(max, target?.valore ?? 0))]}
            />
            <Tooltip formatter={(v: number) => [`${Math.round(v)} kcal`, "Calorie"]} />
            {target && (
              <ReferenceLine
                y={target.valore}
                stroke="hsl(var(--destructive))"
                strokeDasharray="4 4"
              />
            )}
            <Bar
              isAnimationActive={false}
              dataKey="kcal"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between text-sm">
        <Link href="/alimentazione" className="text-primary hover:underline">
          diario di oggi
        </Link>
        <Link
          href="/alimentazione/andamento"
          className="text-primary hover:underline"
        >
          andamento completo
        </Link>
      </div>
    </div>
  );
}
