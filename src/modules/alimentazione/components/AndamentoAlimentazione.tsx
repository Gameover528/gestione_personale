"use client";

import { useMemo } from "react";
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
import {
  NUTRIENTI,
  VALORI_ZERO,
  type GiornoValori,
  type Nutriente,
  type Obiettivo,
} from "../types";
import { cn, oggiIso, spostaGiorno } from "@/lib/utils";

/** Elenco dei giorni del periodo, oggi compreso, in ordine cronologico. */
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

function fmt(nutriente: Nutriente, v: number) {
  return nutriente === "kcal" ? String(Math.round(v)) : v.toFixed(1);
}

export function AndamentoAlimentazione({
  giorni,
  dati,
  bruciate,
  obiettivi,
}: {
  /** Periodo scelto: lo comanda il genitore, che lo condivide con gli allenamenti. */
  giorni: number;
  /** Giorni registrati, o null mentre si caricano. Li carica il genitore. */
  dati: GiornoValori[] | null;
  /**
   * Calorie bruciate per giorno. Forma volutamente neutra invece del tipo del
   * modulo esercizio: qui serve solo "quel giorno, quante", e non vale
   * legare l'alimentazione a un altro modulo per due campi.
   */
  bruciate: { data: string; kcal: number }[] | null;
  obiettivi: Obiettivo[];
}) {

  /**
   * Serie per i grafici: un punto per ogni giorno del periodo.
   *
   * I giorni senza registrazioni valgono `null`, non zero: un giorno non
   * compilato non è un giorno in cui non si è mangiato, e disegnarlo a zero
   * faceva crollare le linee dei macronutrienti (e mostrava "0 kcal" nel
   * tooltip) per tutti i giorni saltati. Con null il grafico lascia il buco.
   */
  const serie = useMemo(() => {
    const perData = new Map((dati ?? []).map((g) => [g.data, g]));
    const perBruciate = new Map((bruciate ?? []).map((b) => [b.data, b.kcal]));
    return giorniDelPeriodo(giorni).map((data) => {
      const g = perData.get(data);
      const bruciato = perBruciate.get(data) ?? 0;
      const mangiato = g?.kcal ?? null;

      /**
       * Le bruciate si disegnano come barra sospesa che parte dalla cima delle
       * mangiate e scende: si legge quanto è entrato (la barra che sale) e
       * quanto ne è stato tolto (quella che torna giù), e dove finisce è il
       * netto della giornata.
       *
       * Quando non si è mangiato — o semplicemente non si è ancora segnato
       * niente — la partenza è zero e la barra scende sotto la linea, che è
       * esattamente quello che è successo.
       */
      const partenza = mangiato ?? 0;

      return {
        data,
        label: etichettaGiorno(data),
        kcal: mangiato,
        bruciate: bruciato || null,
        intervalloBruciate: bruciato ? [partenza, partenza - bruciato] : null,
        proteine: g?.proteine ?? null,
        carboidrati: g?.carboidrati ?? null,
        grassi: g?.grassi ?? null,
      };
    });
  }, [dati, bruciate, giorni]);

  /**
   * Estremi della scala: in basso il punto più profondo raggiunto dalle
   * bruciate (zero se non scendono mai sotto), in alto le mangiate o
   * l'obiettivo, altrimenti la sua linea resta fuori dal grafico proprio
   * quando lo si rispetta.
   */
  const scala = useMemo(() => {
    let basso = 0;
    let alto = 0;
    for (const p of serie) {
      if (p.kcal !== null) alto = Math.max(alto, p.kcal);
      if (p.intervalloBruciate) {
        alto = Math.max(alto, p.intervalloBruciate[0]);
        basso = Math.min(basso, p.intervalloBruciate[1]);
      }
    }
    return { basso: Math.floor(basso), alto: Math.ceil(alto) };
  }, [serie]);

  /** Giorni effettivamente registrati: la query ne restituisce solo quelli. */
  const conDati = dati ?? [];

  /**
   * Medie calcolate solo sui giorni registrati, non su tutto il periodo.
   *
   * Un giorno che non hai segnato non è un giorno in cui non hai mangiato:
   * contarlo come zero abbasserebbe la media di chi salta qualche giorno, e
   * direbbe una cosa falsa. Il divisore quindi non è il periodo, ed è per
   * questo che la casella dice a chiare lettere su quanti giorni sta contando.
   */
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
              nota={
                conDati.length === giorni
                  ? `Su tutti i ${giorni} giorni`
                  : `Sui ${conDati.length} giorni con dati, non sui ${giorni} del periodo`
              }
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
                  ? "Impostato negli obiettivi"
                  : "Nessun obiettivo impostato"
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
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">Calorie per giorno</p>
              <p className="text-xs text-muted-foreground">
                le bruciate scendono dalla cima delle mangiate
              </p>
            </div>
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
                    domain={[
                      scala.basso,
                      Math.ceil(Math.max(scala.alto, obKcal?.valore ?? 0)),
                    ]}
                  />
                  <Tooltip
                    formatter={(v: number | number[], nome: string, voce) => {
                      if (nome === "intervalloBruciate") {
                        const b = (voce?.payload as { bruciate?: number })?.bruciate;
                        return [`${Math.round(b ?? 0)} kcal`, "Bruciate (stima)"];
                      }
                      return [`${Math.round(v as number)} kcal`, "Mangiate"];
                    }}
                  />
                  {obKcal && obKcal.valore > 0 && (
                    <ReferenceLine
                      y={obKcal.valore}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="4 4"
                    />
                  )}
                  {/* Lo zero va segnato: senza, una barra che scende sotto non
                      si distingue da una corta. */}
                  {scala.basso < 0 && (
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  )}
                  <Bar
                    isAnimationActive={false}
                    dataKey="kcal"
                    fill="hsl(var(--serie-1))"
                    radius={[4, 4, 0, 0]}
                  />
                  {/* Barra sospesa: parte dalla cima delle mangiate e scende. */}
                  <Bar
                    isAnimationActive={false}
                    dataKey="intervalloBruciate"
                    fill="hsl(var(--serie-2))"
                    radius={[0, 0, 4, 4]}
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
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="proteine"
                    name="Proteine"
                    stroke="hsl(var(--serie-1))"
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                    strokeWidth={2}
                  />
                  <Line
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="carboidrati"
                    name="Carboidrati"
                    stroke="hsl(var(--serie-2))"
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                    strokeWidth={2}
                  />
                  <Line
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="grassi"
                    name="Grassi"
                    stroke="hsl(var(--serie-3))"
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Medie vs obiettivi */}
          {/* overflow-hidden: senza, l'intestazione grigia squadrata dipinge
              sopra gli angoli tondi del riquadro e li fa sembrare sporgenti. */}
          <div className="overflow-hidden rounded-lg border">
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
