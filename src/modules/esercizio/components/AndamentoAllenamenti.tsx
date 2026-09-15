"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GiornoAllenamento } from "../allenamenti";
import type { GiornoValori } from "@/modules/alimentazione/types";
import { oggiIso, spostaGiorno } from "@/lib/utils";

function giorniDelPeriodo(giorni: number): string[] {
  const fine = oggiIso();
  const out: string[] = [];
  for (let i = giorni - 1; i >= 0; i--) out.push(spostaGiorno(fine, -i));
  return out;
}

function etichettaGiorno(iso: string): string {
  const [, m, g] = iso.split("-");
  return `${g}/${m}`;
}

/**
 * L'andamento dell'allenamento, e il confronto con quello che si è mangiato.
 *
 * Il grafico "mangiate contro bruciate" è la ragione per cui cibo ed esercizio
 * stanno nella stessa area: da soli i due moduli non possono disegnarlo.
 */
export function AndamentoAllenamenti({
  giorni,
  dati,
  cibo,
}: {
  giorni: number;
  /** Giorni con allenamenti, o null mentre si caricano. */
  dati: GiornoAllenamento[] | null;
  /** Giorni con pasti registrati, per il confronto energetico. */
  cibo: GiornoValori[] | null;
}) {
  const serie = useMemo(() => {
    const perData = new Map((dati ?? []).map((g) => [g.data, g]));
    const perCibo = new Map((cibo ?? []).map((g) => [g.data, g]));
    return giorniDelPeriodo(giorni).map((data) => {
      const a = perData.get(data);
      const c = perCibo.get(data);
      return {
        data,
        label: etichettaGiorno(data),
        minuti: a?.minuti ?? 0,
        // Le bruciate si disegnano in negativo: sotto la linea dello zero si
        // legge a colpo d'occhio cosa entra e cosa esce.
        bruciate: a?.kcal ? -a.kcal : 0,
        mangiate: c?.kcal ?? null,
      };
    });
  }, [dati, cibo, giorni]);

  const conDati = dati ?? [];
  const totali = useMemo(
    () => ({
      sessioni: conDati.reduce((s, g) => s + g.sessioni, 0),
      minuti: conDati.reduce((s, g) => s + g.minuti, 0),
      kcal: conDati.reduce((s, g) => s + g.kcal, 0),
    }),
    [conDati]
  );

  if (dati === null) {
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  }

  if (conDati.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nessun allenamento registrato in questo periodo.
        </p>
      </div>
    );
  }

  const perSettimana = (totali.sessioni / giorni) * 7;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Riquadro
          titolo="Allenamenti"
          valore={String(totali.sessioni)}
          nota={`${perSettimana.toFixed(1)} a settimana`}
        />
        <Riquadro
          titolo="Tempo totale"
          valore={`${totali.minuti} min`}
          nota={
            totali.sessioni > 0
              ? `${Math.round(totali.minuti / totali.sessioni)} min a sessione`
              : "—"
          }
        />
        <Riquadro
          titolo="Calorie bruciate"
          valore={totali.kcal > 0 ? totali.kcal.toLocaleString("it-IT") : "—"}
          // Senza stima i motivi sono due — durata non indicata sugli
          // allenamenti, oppure peso corporeo mancante — e dirne uno solo manda
          // a cercare nel posto sbagliato.
          nota={
            totali.kcal > 0
              ? "stima sul periodo"
              : "servono la durata e il peso corporeo"
          }
        />
        <Riquadro
          titolo="Giorni con allenamento"
          valore={`${conDati.length} / ${giorni}`}
          nota={`${Math.round((conDati.length / giorni) * 100)}% del periodo`}
        />
      </div>

      <div className="rounded-lg border p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">Mangiate contro bruciate</p>
          <p className="text-xs text-muted-foreground">
            le bruciate sono una stima, disegnate sotto lo zero
          </p>
        </div>
        <div
          role="img"
          aria-label={`Confronto fra calorie mangiate e calorie bruciate negli ultimi ${giorni} giorni: ${totali.kcal} kcal bruciate in totale su ${totali.sessioni} allenamenti.`}
          className="h-64 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={serie}
              stackOffset="sign"
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis
                dataKey="label"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: number, nome: string) => [
                  `${Math.abs(Math.round(v))} kcal`,
                  nome === "mangiate" ? "Mangiate" : "Bruciate",
                ]}
              />
              <Legend
                formatter={(v: string) =>
                  v === "mangiate" ? "Mangiate" : "Bruciate (stima)"
                }
              />
              <Bar
                isAnimationActive={false}
                dataKey="mangiate"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                isAnimationActive={false}
                dataKey="bruciate"
                fill="hsl(var(--warning))"
                radius={[0, 0, 4, 4]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <p className="mb-3 text-sm font-semibold">Minuti di allenamento per giorno</p>
        <div
          role="img"
          aria-label={`Minuti di allenamento per giorno negli ultimi ${giorni} giorni, ${totali.minuti} minuti in totale.`}
          className="h-48 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis
                dataKey="label"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => [`${v} min`, "Allenamento"]} />
              <Bar
                isAnimationActive={false}
                dataKey="minuti"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Riquadro({
  titolo,
  valore,
  nota,
}: {
  titolo: string;
  valore: string;
  nota: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {titolo}
      </p>
      <p className="mt-1 text-xl font-semibold">{valore}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p>
    </div>
  );
}
