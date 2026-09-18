"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Trash2, Plus } from "lucide-react";
import {
  fmtPeso,
  fmtVariazione,
  giorniTra,
  tendenza,
  tendenzaUtile,
  variazione,
  type Pesata,
} from "../types";
import { eliminaPesata, ripristinaPesata, salvaPesata } from "../queries";
import { useToast } from "@/core/components/Toast";
import {
  IconButton,
  NumberInput,
  TabBar,
  bottonePrimarioClass,
  inputClass,
} from "@/core/components/controls";
import { formatDate, oggiIso, parseNumero } from "@/lib/utils";

const PERIODI: { value: string; label: string }[] = [
  { value: "30", label: "30 giorni" },
  { value: "90", label: "90 giorni" },
  { value: "365", label: "1 anno" },
  { value: "0", label: "Tutto" },
];

function etichettaGiorno(iso: string): string {
  const [, m, g] = iso.split("-");
  return `${g}/${m}`;
}

export function RegistroPeso({ iniziali }: { iniziali: Pesata[] }) {
  const router = useRouter();
  const toast = useToast();

  const [data, setData] = useState(oggiIso());
  const [peso, setPeso] = useState("");
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState("90");

  /** Le pesate del periodo scelto, in ordine cronologico (0 = tutte). */
  const nelPeriodo = useMemo(() => {
    const giorni = Number(periodo);
    if (!giorni) return iniziali;
    const oggi = oggiIso();
    return iniziali.filter((p) => giorniTra(p.data, oggi) < giorni);
  }, [iniziali, periodo]);

  /**
   * Punti del grafico: il peso segnato e la linea di tendenza.
   *
   * Si disegnano insieme perché da soli dicono cose diverse: i punti sono
   * quello che ha detto la bilancia, la tendenza è quello che sta succedendo.
   * Guardare solo i punti fa sembrare un risultato ogni oscillazione di un
   * giorno.
   */
  const conTendenza = useMemo(() => tendenzaUtile(nelPeriodo), [nelPeriodo]);

  const serie = useMemo(() => {
    const media = tendenza(nelPeriodo);
    return nelPeriodo.map((p, i) => ({
      label: etichettaGiorno(p.data),
      data: p.data,
      peso: p.peso_kg,
      tendenza: media[i],
    }));
  }, [nelPeriodo]);

  /**
   * Estremi della scala: mezzo chilo di margine sopra e sotto.
   *
   * Il peso non parte da zero. Una scala che parte da zero schiaccia mesi di
   * cambiamenti in una riga piatta, che è l'opposto di quello che serve qui.
   */
  const scala = useMemo(() => {
    if (nelPeriodo.length === 0) return { basso: 0, alto: 100 };
    const valori = nelPeriodo.map((p) => p.peso_kg);
    return {
      basso: Math.floor(Math.min(...valori) - 0.5),
      alto: Math.ceil(Math.max(...valori) + 0.5),
    };
  }, [nelPeriodo]);

  const var_ = useMemo(() => variazione(nelPeriodo), [nelPeriodo]);
  const ultima = iniziali.length > 0 ? iniziali[iniziali.length - 1] : null;

  /** Dal più recente: nell'elenco si cerca quasi sempre l'ultima. */
  const inElenco = useMemo(() => [...nelPeriodo].reverse(), [nelPeriodo]);

  const esistente = iniziali.find((p) => p.data === data);

  async function salva() {
    const kg = parseNumero(peso);
    if (!(kg > 0)) {
      setErrore("Indica quanto pesi.");
      return;
    }
    // Un errore di battitura tipo "705" invece di "70.5" falserebbe il grafico
    // e la stima delle calorie bruciate, e non è evidente da correggere dopo.
    if (kg < 20 || kg > 400) {
      setErrore("Il peso deve stare fra 20 e 400 kg.");
      return;
    }
    setSalvando(true);
    setErrore(null);
    try {
      await salvaPesata({ data, peso_kg: kg, nota: nota.trim() || null });
      setPeso("");
      setNota("");
      toast({
        messaggio: esistente
          ? `Pesata del ${formatDate(data)} aggiornata.`
          : "Pesata registrata.",
      });
      router.refresh();
    } catch {
      setErrore("Errore durante il salvataggio.");
    } finally {
      setSalvando(false);
    }
  }

  async function elimina(p: Pesata) {
    await eliminaPesata(p.id);
    router.refresh();
    toast({
      messaggio: `Pesata del ${formatDate(p.data)} eliminata.`,
      azione: {
        label: "Annulla",
        onClick: async () => {
          await ripristinaPesata(p);
          router.refresh();
        },
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Registrazione: in cima, perché è il motivo per cui si apre la pagina */}
      <div className="rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_auto_1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Giorno</span>
            <input
              type="date"
              value={data}
              max={oggiIso()}
              onChange={(e) => setData(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Peso (kg)</span>
            <NumberInput
              value={peso}
              onChange={setPeso}
              placeholder="70.5"
              aria-label="Peso in chilogrammi"
              className="w-28"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              Nota{" "}
              <span className="font-normal text-muted-foreground">
                (facoltativa)
              </span>
            </span>
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Es. dopo le feste, prima di colazione…"
              className={inputClass}
            />
          </label>
          <button
            onClick={salva}
            disabled={salvando}
            className={bottonePrimarioClass}
          >
            <Plus className="h-4 w-4" />
            {salvando ? "Salvo…" : esistente ? "Aggiorna" : "Registra"}
          </button>
        </div>
        {esistente && (
          <p className="mt-2 text-xs text-muted-foreground">
            Il {formatDate(data)} hai già segnato {fmtPeso(esistente.peso_kg)} kg:
            salvando lo sostituisci.
          </p>
        )}
        {errore && <p className="mt-2 text-sm text-destructive">{errore}</p>}
      </div>

      {iniziali.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nessuna pesata registrata. La prima serve a partire; è dalla seconda
            che il registro comincia a dire qualcosa.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <Riquadro
                titolo="Ultima pesata"
                valore={ultima ? `${fmtPeso(ultima.peso_kg)} kg` : "—"}
                nota={ultima ? formatDate(ultima.data) : ""}
              />
              <Riquadro
                titolo="Nel periodo"
                valore={var_ ? `${fmtVariazione(var_.kg)} kg` : "—"}
                nota={
                  var_
                    ? `in ${var_.giorni} giorni, su ${nelPeriodo.length} pesate`
                    : "serve più di una pesata"
                }
              />
            </div>
            <TabBar
              items={PERIODI}
              value={periodo}
              onChange={setPeriodo}
              label="Periodo da mostrare"
            />
          </div>

          {nelPeriodo.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Nessuna pesata in questo periodo.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">Andamento</p>
                {conTendenza && (
                  <p className="text-xs text-muted-foreground">
                    la linea chiara è la media dei sette giorni precedenti
                  </p>
                )}
              </div>
              <div
                role="img"
                aria-label={`Peso nel periodo scelto: ${nelPeriodo.length} pesate, da ${fmtPeso(nelPeriodo[0].peso_kg)} a ${fmtPeso(nelPeriodo[nelPeriodo.length - 1].peso_kg)} kg. I valori sono nell'elenco qui sotto.`}
                className="h-64 w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={serie}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      opacity={0.3}
                    />
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
                      domain={[scala.basso, scala.alto]}
                    />
                    <Tooltip
                      formatter={(v: number, nome: string) => [
                        `${fmtPeso(v)} kg`,
                        nome === "tendenza" ? "Tendenza" : "Pesata",
                      ]}
                    />
                    {/* La tendenza sotto e più sottile: è lo sfondo su cui si
                        leggono i punti, non il protagonista. */}
                    {conTendenza && (
                      <Line
                        isAnimationActive={false}
                        type="monotone"
                        dataKey="tendenza"
                        name="tendenza"
                        stroke="hsl(var(--serie-3))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                      />
                    )}
                    <Line
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="peso"
                      name="peso"
                      stroke="hsl(var(--serie-1))"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* overflow-hidden: l'intestazione squadrata dentro la cornice tonda. */}
          <div className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between border-b bg-muted px-4 py-2">
              <span className="text-sm font-semibold">Pesate</span>
              <span className="text-sm text-muted-foreground">
                {inElenco.length}
              </span>
            </div>
            <ul className="divide-y">
              {inElenco.map((p, i) => {
                // Differenza dalla pesata precedente in ordine di tempo, che
                // nell'elenco rovesciato è quella subito sotto.
                const precedente = inElenco[i + 1];
                const delta = precedente ? p.peso_kg - precedente.peso_kg : null;
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{fmtPeso(p.peso_kg)} kg</span>{" "}
                      <span className="text-muted-foreground">
                        · {formatDate(p.data)}
                      </span>
                      {p.nota && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {p.nota}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {/*
                        Grigio e non verde/rosso: salire di peso non e' un
                        errore e scendere non e' un successo: dipende da cosa
                        uno sta cercando di fare. Il segno dice la direzione,
                        il colore non aggiunge niente che non sia un giudizio.
                      */}
                      {delta !== null && delta !== 0 && (
                        <span className="text-xs text-muted-foreground">
                          {fmtVariazione(delta)}
                        </span>
                      )}
                      <IconButton
                        label={`Elimina la pesata del ${formatDate(p.data)}`}
                        onClick={() => elimina(p)}
                        tono="distruttivo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
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
