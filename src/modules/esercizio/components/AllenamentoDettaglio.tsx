"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Trash2, Search, X, Flame, ClipboardList } from "lucide-react";
import {
  getAllenamento,
  aggiungiSerie,
  aggiornaSerie,
  eliminaSerie,
  ripristinaSerie,
  aggiornaAllenamento,
  type AllenamentoConSerie,
  type Serie,
} from "../allenamenti";
import { listSchede, aggiungiSchedaAdAllenamento, type SchedaRiepilogo } from "../schede";
import { listEsercizi } from "../queries";
import { cercaEsercizi, muscoliDisegnabili, type Esercizio } from "../types";
import { NOME_MUSCOLO } from "../muscoli/tipi";
import { Miniatura } from "./Miniatura";
import { metEsercizio } from "../met";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/core/components/Toast";
import { Card, CardTitle } from "@/core/components/ui";
import {
  IconButton,
  inputClass,
  bottoneClass,
  bottonePrimarioClass,
} from "@/core/components/controls";

/** Un esercizio è "cardio" se il suo impegno o la parte del corpo lo dicono. */
function isCardio(e: Pick<Esercizio, "attrezzi" | "parti_corpo">): boolean {
  return (
    metEsercizio(e) >= 7 ||
    e.parti_corpo.some((p) => p.toLowerCase() === "cardio")
  );
}

export function AllenamentoDettaglio({ id }: { id: string }) {
  const [dati, setDati] = useState<AllenamentoConSerie | null | "assente">(null);
  const [esercizi, setEsercizi] = useState<Esercizio[]>([]);
  const [schede, setSchede] = useState<SchedaRiepilogo[]>([]);
  const [scelto, setScelto] = useState<Esercizio | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    getAllenamento(id).then((a) => setDati(a ?? "assente"));
  }, [id]);

  useEffect(() => {
    load();
    listEsercizi().then(setEsercizi);
    listSchede().then(setSchede);
  }, [load]);

  async function handleEliminaSerie(s: Serie) {
    setDati((prev) =>
      prev && prev !== "assente"
        ? { ...prev, serie: prev.serie.filter((x) => x.id !== s.id) }
        : prev
    );
    await eliminaSerie(s.id);
    toast({
      messaggio: `Serie di "${s.esercizio_nome}" eliminata`,
      azione: {
        label: "Annulla",
        onClick: async () => {
          await ripristinaSerie(id, s);
          load();
        },
      },
    });
  }

  if (dati === null) {
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  }
  if (dati === "assente") {
    return (
      <p className="text-sm text-muted-foreground">
        Questo allenamento non esiste più.
      </p>
    );
  }

  // Le serie si mostrano raggruppate per esercizio: è il modo in cui si legge
  // un allenamento ("panca: 4 serie"), non una fila piatta di righe.
  const gruppi: { nome: string; id: string; serie: Serie[] }[] = [];
  for (const s of dati.serie) {
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.id === s.esercizio_id) ultimo.serie.push(s);
    else gruppi.push({ nome: s.esercizio_nome, id: s.esercizio_id, serie: [s] });
  }

  const perId = new Map(esercizi.map((e) => [e.id, e]));

  return (
    <div className="flex flex-col gap-4">
      <IntestazioneAllenamento dati={dati} onSalvato={load} />

      {gruppi.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nessun esercizio in questo allenamento. Aggiungine uno qui sotto, o
          richiama una scheda intera.
        </p>
      ) : (
        <ul className="space-y-3">
          {gruppi.map((g, i) => (
            <li key={`${g.id}-${i}`} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/esercizio/catalogo/${g.id}`}
                  prefetch={false}
                  className="font-medium capitalize hover:underline"
                >
                  {g.nome}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {g.serie.length} serie
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {g.serie.map((s, n) => (
                  <RigaSerie
                    key={s.id}
                    serie={s}
                    numero={n + 1}
                    cardio={
                      perId.has(s.esercizio_id)
                        ? isCardio(perId.get(s.esercizio_id)!)
                        : s.durata_min !== null || s.distanza_km !== null
                    }
                    onElimina={() => handleEliminaSerie(s)}
                    onSalvato={load}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {schede.length > 0 && (
        <AggiungiScheda
          allenamentoId={id}
          schede={schede}
          onAggiunta={(n, nome) => {
            load();
            toast({ messaggio: `${n} serie aggiunte dalla scheda "${nome}"` });
          }}
        />
      )}

      <Card>
        <CardTitle>Aggiungi un esercizio</CardTitle>
        {scelto ? (
          <FormSerie
            allenamentoId={id}
            esercizio={scelto}
            onAggiunta={load}
            onCambia={() => setScelto(null)}
          />
        ) : (
          <SelettoreEsercizio esercizi={esercizi} onScelto={setScelto} />
        )}
      </Card>
    </div>
  );
}

/**
 * Una serie, coi numeri modificabili sul posto.
 *
 * Si salvano lasciando il campo, senza pulsanti: partendo da una scheda i
 * carichi previsti quasi mai coincidono con quelli sollevati davvero, e
 * correggerli deve costare quanto scriverli.
 */
function RigaSerie({
  serie,
  numero,
  cardio,
  onElimina,
  onSalvato,
}: {
  serie: Serie;
  numero: number;
  cardio: boolean;
  onElimina: () => void;
  onSalvato: () => void;
}) {
  const [a, setA] = useState(
    (cardio ? serie.durata_min : serie.ripetizioni)?.toString() ?? ""
  );
  const [b, setB] = useState(
    (cardio ? serie.distanza_km : serie.peso_kg)?.toString() ?? ""
  );

  async function salva() {
    const na = a ? Number(a) : null;
    const nb = b ? Number(b) : null;
    const invariato = cardio
      ? na === serie.durata_min && nb === serie.distanza_km
      : na === serie.ripetizioni && nb === serie.peso_kg;
    if (invariato) return;

    await aggiornaSerie(serie.id, {
      ripetizioni: cardio ? serie.ripetizioni : na,
      peso_kg: cardio ? serie.peso_kg : nb,
      durata_min: cardio ? na : serie.durata_min,
      distanza_km: cardio ? nb : serie.distanza_km,
    });
    onSalvato();
  }

  const campo =
    "h-9 w-16 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary";

  return (
    <li className="flex min-h-11 items-center gap-2 border-t pt-1 text-sm">
      <span className="w-5 shrink-0 text-muted-foreground">{numero}.</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={a}
        onChange={(e) => setA(e.target.value)}
        onBlur={salva}
        aria-label={
          cardio
            ? `Durata in minuti della serie ${numero}`
            : `Ripetizioni della serie ${numero}`
        }
        className={campo}
      />
      <span className="text-muted-foreground">{cardio ? "min" : "rip."}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={cardio ? "0.1" : "0.5"}
        value={b}
        onChange={(e) => setB(e.target.value)}
        onBlur={salva}
        aria-label={
          cardio
            ? `Distanza in chilometri della serie ${numero}`
            : `Carico in chilogrammi della serie ${numero}`
        }
        className={campo}
      />
      <span className="text-muted-foreground">{cardio ? "km" : "kg"}</span>
      <span className="ml-auto">
        <IconButton
          label={`Elimina la serie ${numero} di ${serie.esercizio_nome}`}
          tono="distruttivo"
          onClick={onElimina}
        >
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </span>
    </li>
  );
}

/** Richiama una scheda intera dentro l'allenamento in corso. */
function AggiungiScheda({
  allenamentoId,
  schede,
  onAggiunta,
}: {
  allenamentoId: string;
  schede: SchedaRiepilogo[];
  onAggiunta: (serie: number, nome: string) => void;
}) {
  const [scelta, setScelta] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const utilizzabili = schede.filter((s) => s.voci > 0);
  if (utilizzabili.length === 0) return null;

  async function aggiungi() {
    const scheda = utilizzabili.find((s) => s.id === scelta);
    if (!scheda) return;
    setInCorso(true);
    try {
      const n = await aggiungiSchedaAdAllenamento(allenamentoId, scheda.id);
      setScelta("");
      onAggiunta(n, scheda.nome);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Card>
      <CardTitle>Richiama una scheda</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        Aggiunge tutti i suoi esercizi qui sotto, coi numeri previsti: poi
        correggi solo carichi e ripetizioni.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <select
          value={scelta}
          onChange={(e) => setScelta(e.target.value)}
          aria-label="Scheda da aggiungere"
          className={`${inputClass} flex-1`}
        >
          <option value="">Scegli una scheda…</option>
          {utilizzabili.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} ({s.serie} serie)
            </option>
          ))}
        </select>
        <button
          onClick={aggiungi}
          disabled={!scelta || inCorso}
          className={bottoneClass}
        >
          <ClipboardList className="h-4 w-4" />
          {inCorso ? "Aggiungo…" : "Aggiungi"}
        </button>
      </div>
    </Card>
  );
}

/** Data, nome e durata modificabili sul posto: la durata guida la stima delle calorie. */
function IntestazioneAllenamento({
  dati,
  onSalvato,
}: {
  dati: AllenamentoConSerie;
  onSalvato: () => void;
}) {
  const [modifica, setModifica] = useState(false);
  const [nome, setNome] = useState(dati.nome ?? "");
  const [durata, setDurata] = useState(dati.durata_min?.toString() ?? "");
  const [data, setData] = useState(dati.data);

  async function salva() {
    await aggiornaAllenamento(dati.id, {
      data: data || dati.data,
      nome: nome.trim() || null,
      durata_min: durata ? Number(durata) : null,
      note: dati.note,
    });
    setModifica(false);
    onSalvato();
  }

  if (modifica) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {/* La data si corregge anche dopo: un allenamento si registra spesso
              a fine giornata o il giorno dopo, e sbagliarla non deve
              costringere a rifare tutto da capo. */}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Data</span>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Petto e tricipiti"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Durata (min)</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={durata}
              onChange={(e) => setDurata(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={salva} className={bottonePrimarioClass}>
            Salva
          </button>
          <button onClick={() => setModifica(false)} className={bottoneClass}>
            Annulla
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold">
          {dati.nome || `Allenamento del ${formatDate(dati.data)}`}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {formatDate(dati.data)}
          {dati.durata_min ? ` · ${dati.durata_min} min` : " · durata non indicata"}
        </p>
        {dati.kcal !== null ? (
          <p className="mt-1 inline-flex items-center gap-1 text-sm">
            <Flame className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">~{dati.kcal} kcal</span>
            <span className="text-muted-foreground">stimate</span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            {dati.durata_min
              ? "Per stimare le calorie serve il peso corporeo in Alimentazione › Obiettivi."
              : "Indica la durata per avere una stima delle calorie."}
          </p>
        )}
      </div>
      <button onClick={() => setModifica(true)} className={bottoneClass}>
        Modifica
      </button>
    </div>
  );
}

/** Ricerca fra gli esercizi già caricati: nessuna chiamata mentre si scrive. */
function SelettoreEsercizio({
  esercizi,
  onScelto,
}: {
  esercizi: Esercizio[];
  onScelto: (e: Esercizio) => void;
}) {
  const [query, setQuery] = useState("");
  const risultati = useMemo(
    () => cercaEsercizi(esercizi, query, 8),
    [esercizi, query]
  );

  return (
    <div className="mt-3 flex flex-col gap-2">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca l'esercizio…"
          aria-label="Cerca l'esercizio da aggiungere"
          className={`${inputClass} w-full pl-9`}
        />
      </label>
      {risultati.length > 0 && (
        <ul className="space-y-1">
          {risultati.map((e) => (
            <li key={`${e.fonte}-${e.id}`}>
              <button
                onClick={() => onScelto(e)}
                className="flex min-h-11 w-full items-center gap-3 rounded-md border p-2 text-left text-sm transition hover:bg-accent"
              >
                <Miniatura esercizio={e} lato={40} />
                <span className="min-w-0 flex-1">
                  <span className="block capitalize">{e.nome}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {muscoliDisegnabili(e)
                      .primari.map((m) => NOME_MUSCOLO[m])
                      .join(", ") || "Muscoli non indicati"}
                  </span>
                </span>
                <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * I campi cambiano col tipo di esercizio: per il cardio ripetizioni e carico
 * non vogliono dire niente, e chiederli comunque sarebbe solo rumore.
 */
function FormSerie({
  allenamentoId,
  esercizio,
  onAggiunta,
  onCambia,
}: {
  allenamentoId: string;
  esercizio: Esercizio;
  onAggiunta: () => void;
  onCambia: () => void;
}) {
  const cardio = isCardio(esercizio);
  const { primari, secondari } = muscoliDisegnabili(esercizio);

  const [quante, setQuante] = useState("3");
  const [ripetizioni, setRipetizioni] = useState("");
  const [peso, setPeso] = useState("");
  const [durata, setDurata] = useState("");
  const [distanza, setDistanza] = useState("");
  const [inCorso, setInCorso] = useState(false);

  async function aggiungi() {
    setInCorso(true);
    try {
      await aggiungiSerie(
        allenamentoId,
        {
          esercizio_id: esercizio.id,
          esercizio_fonte: esercizio.fonte,
          esercizio_nome: esercizio.nome,
          ripetizioni: ripetizioni ? Number(ripetizioni) : null,
          peso_kg: peso ? Number(peso) : null,
          durata_min: durata ? Number(durata) : null,
          distanza_km: distanza ? Number(distanza) : null,
        },
        quante ? Number(quante) : 1
      );
      onAggiunta();
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Miniatura esercizio={esercizio} lato={56} />
        <div className="min-w-0 flex-1">
          <span className="block font-medium capitalize">{esercizio.nome}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {[...primari, ...secondari].map((m) => NOME_MUSCOLO[m]).join(", ") ||
              "Muscoli non indicati"}
          </span>
        </div>
        <button
          onClick={onCambia}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          Cambia
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Quante serie</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            value={quante}
            onChange={(e) => setQuante(e.target.value)}
            className={inputClass}
          />
        </label>
        {cardio ? (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Durata (min)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={durata}
                onChange={(e) => setDurata(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Distanza (km)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={distanza}
                onChange={(e) => setDistanza(e.target.value)}
                className={inputClass}
              />
            </label>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Ripetizioni</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={ripetizioni}
                onChange={(e) => setRipetizioni(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Carico (kg)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.5"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                className={inputClass}
              />
            </label>
          </>
        )}
      </div>

      <button
        onClick={aggiungi}
        disabled={inCorso}
        className={`${bottonePrimarioClass} self-start`}
      >
        <Plus className="h-4 w-4" />
        {inCorso ? "Aggiungo…" : `Aggiungi ${quante || 1} serie`}
      </button>
    </div>
  );
}
