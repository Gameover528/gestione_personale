"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { statistichePeriodo } from "../queries";
import {
  NUTRIENTI,
  VALORI_ZERO,
  type GiornoValori,
  type Nutriente,
  type Obiettivo,
} from "../types";
import { TabBar } from "@/core/components/controls";
import { cn } from "@/lib/utils";

const PERIODI: { value: string; label: string }[] = [
  { value: "7", label: "7 giorni" },
  { value: "30", label: "30 giorni" },
  { value: "90", label: "90 giorni" },
];

/** Elenco dei giorni del periodo, oggi compreso, in ordine cronologico. */
function giorniDelPeriodo(giorni: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (giorni - 1));
  for (let i = 0; i < giorni; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function etichettaGiorno(iso: string): string {
  const [, m, g] = iso.split("-");
  return `${g}/${m}`;
}

function fmt(nutriente: Nutriente, v: number) {
  return nutriente === "kcal" ? String(Math.round(v)) : v.toFixed(1);
}

export function AndamentoAlimentazione({
  giorniIniziali,
  datiIniziali,
  obiettivi,
}: {
  giorniIniziali: number;
  datiIniziali: GiornoValori[];
  obiettivi: Obiettivo[];
}) {
  const [giorni, setGiorni] = useState(giorniIniziali);
  const [dati, setDati] = useState<GiornoValori[] | null>(datiIniziali);

  // Il periodo di partenza arriva già calcolato dal server; si ricarica solo
  // quando l'utente cambia periodo.
  const periodoMostrato = useRef(giorniIniziali);
  useEffect(() => {
    if (periodoMostrato.current === giorni) return;
    periodoMostrato.current = giorni;
    setDati(null);
    statistichePeriodo(giorni).then(setDati);
  }, [giorni]);

  /** Serie completa: i giorni senza registrazioni valgono zero. */
  const serie = useMemo(() => {
    const perData = new Map((dati ?? []).map((g) => [g.data, g]));
    return giorniDelPeriodo(giorni).map((data) => {
      const g = perData.get(data);
      return {
        data,
        label: etichettaGiorno(data),
        registrato: g !== undefined,
        ...(g ?? VALORI_ZERO),
      };
    });
  }, [dati, giorni]);

  const conDati = serie.filter((g) => g.registrato);

  /** Medie calcolate solo sui giorni effettivamente registrati. */
  const medie = useMemo(() => {
    const out = { ...VALORI_ZERO };
    if (conDati.length === 0) return out;
    for (const g of conDati) {
      for (const nu of NUTRIENTI) out[nu.value] += g[nu.value];
    }
    for (const nu of NUTRIENTI) out[nu.value] /= conDati.length;
    return out;
  }, [conDati]);

  const obKcal = obiettivi.find((o) => o.nutriente === "kcal");

  const aderenza = useMemo(() => {
    if (!obKcal || obKcal.valore <= 0 || conDati.length === 0) return null;
    const ok = conDati.filter((g) =>
      obKcal.tipo === "max" ? g.kcal <= obKcal.valore : g.kcal >= obKcal.valore
    ).length;
    return Math.round((ok / conDati.length) * 100);
  }, [obKcal, conDati]);

  return (
    <div className="space-y-6">
      <TabBar
        items={PERIODI}
        value={String(giorni)}
        onChange={(v) => setGiorni(Number(v))}
        label="Periodo da mostrare"
      />

      {dati === null ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : conDati.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nessun pasto registrato in questo periodo.
          </p>
        </div>
      ) : (
        <>
          {/* Sintesi */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Riquadro
              titolo="Media calorie"
              valore={`${Math.round(medie.kcal)} kcal`}
              nota={`su ${conDati.length} giorni registrati`}
            />
            <Riquadro
              titolo="Giorni registrati"
              valore={`${conDati.length} / ${giorni}`}
              nota={`${Math.round((conDati.length / giorni) * 100)}% del periodo`}
            />
            <Riquadro
              titolo="Obiettivo calorie"
              valore={
                obKcal && obKcal.valore > 0
                  ? `${obKcal.tipo === "max" ? "max" : "min"} ${Math.round(obKcal.valore)}`
                  : "—"
              }
              nota={
                obKcal && obKcal.valore > 0
                  ? "impostato negli obiettivi"
                  : "nessun obiettivo impostato"
              }
            />
            <Riquadro
              titolo="Giorni entro obiettivo"
              valore={aderenza === null ? "—" : `${aderenza}%`}
              nota={
                aderenza === null
                  ? "serve un obiettivo sulle calorie"
                  : "sui giorni registrati"
              }
            />
          </div>

          {/* Calorie giorno per giorno */}
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-semibold">Calorie per giorno</p>
            <div
              role="img"
              aria-label={`Calorie giorno per giorno negli ultimi ${giorni} giorni: media ${Math.round(medie.kcal)} kcal su ${conDati.length} giorni registrati. I valori sono riportati nella tabella qui sotto.`}
              className="h-64 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={serie}
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
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    // La scala comprende anche l'obiettivo, altrimenti la sua
                    // linea resta fuori dal grafico proprio quando lo si rispetta.
                    domain={[0, (max: number) => Math.ceil(Math.max(max, obKcal?.valore ?? 0))]}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${Math.round(v)} kcal`, "Calorie"]}
                  />
                  {obKcal && obKcal.valore > 0 && (
                    <ReferenceLine
                      y={obKcal.valore}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="4 4"
                    />
                  )}
                  <Bar
                    dataKey="kcal"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Macronutrienti */}
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-semibold">Macronutrienti (g per giorno)</p>
            <div
              role="img"
              aria-label={`Proteine, carboidrati e grassi giorno per giorno negli ultimi ${giorni} giorni. Medie: proteine ${medie.proteine.toFixed(0)} g, carboidrati ${medie.carboidrati.toFixed(0)} g, grassi ${medie.grassi.toFixed(0)} g.`}
              className="h-64 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={serie}
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
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)} g`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="proteine"
                    name="Proteine"
                    stroke="hsl(var(--success))"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="carboidrati"
                    name="Carboidrati"
                    stroke="hsl(var(--primary))"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="grassi"
                    name="Grassi"
                    stroke="hsl(var(--warning))"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Medie vs obiettivi */}
          <div className="rounded-lg border">
            <div className="border-b bg-muted px-4 py-2 text-sm font-semibold">
              Media giornaliera rispetto agli obiettivi
            </div>
            <ul className="divide-y">
              {NUTRIENTI.map((nu) => {
                const media = medie[nu.value];
                const ob = obiettivi.find((o) => o.nutriente === nu.value);
                const rispettato =
                  ob && ob.valore > 0
                    ? ob.tipo === "max"
                      ? media <= ob.valore
                      : media >= ob.valore
                    : null;
                return (
                  <li
                    key={nu.value}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                  >
                    <span>{nu.label}</span>
                    <span className="flex items-center gap-3">
                      <span className="font-medium">
                        {fmt(nu.value, media)} {nu.unita}
                      </span>
                      {ob && ob.valore > 0 ? (
                        <span
                          className={cn(
                            "text-xs",
                            rispettato ? "text-success" : "text-destructive"
                          )}
                        >
                          {ob.tipo === "max" ? "max" : "min"}{" "}
                          {fmt(nu.value, ob.valore)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          nessun obiettivo
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
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
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{titolo}</p>
      <p className="text-lg font-semibold">{valore}</p>
      <p className="text-xs text-muted-foreground">{nota}</p>
    </div>
  );
}
