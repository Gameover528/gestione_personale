"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Trash2, Search, X, Flame } from "lucide-react";
import {
  getAllenamento,
  aggiungiSerie,
  eliminaSerie,
  ripristinaSerie,
  aggiornaAllenamento,
  type AllenamentoConSerie,
  type Serie,
} from "../allenamenti";
import { listEsercizi } from "../queries";
import { cercaEsercizi, type Esercizio } from "../types";
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

/** Come si descrive una serie: i pesi e le ripetizioni, o durata e distanza. */
function descriviSerie(s: Serie): string {
  const pezzi: string[] = [];
  if (s.ripetizioni) pezzi.push(`${s.ripetizioni} rip.`);
  if (s.peso_kg) pezzi.push(`${s.peso_kg} kg`);
  if (s.durata_min) pezzi.push(`${s.durata_min} min`);
  if (s.distanza_km) pezzi.push(`${s.distanza_km} km`);
  return pezzi.join(" × ") || "—";
}

export function AllenamentoDettaglio({ id }: { id: string }) {
  const [dati, setDati] = useState<AllenamentoConSerie | null | "assente">(null);
  const [esercizi, setEsercizi] = useState<Esercizio[]>([]);
  const [scelto, setScelto] = useState<Esercizio | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    getAllenamento(id).then((a) => setDati(a ?? "assente"));
  }, [id]);

  useEffect(() => {
    load();
    listEsercizi().then(setEsercizi);
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

  return (
    <div className="flex flex-col gap-4">
      <IntestazioneAllenamento dati={dati} onSalvato={load} />

      {gruppi.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nessun esercizio in questo allenamento. Cercane uno qui sotto e
          aggiungi la prima serie.
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
                  <li
                    key={s.id}
                    className="flex min-h-11 items-center justify-between gap-2 border-t pt-1 text-sm"
                  >
                    <span>
                      <span className="text-muted-foreground">{n + 1}.</span>{" "}
                      {descriviSerie(s)}
                    </span>
                    <IconButton
                      label={`Elimina la serie ${n + 1} di ${s.esercizio_nome}`}
                      tono="distruttivo"
                      onClick={() => handleEliminaSerie(s)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
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

  async function salva() {
    await aggiornaAllenamento(dati.id, {
      data: dati.data,
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
        <div className="grid gap-3 sm:grid-cols-2">
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
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition hover:bg-accent"
              >
                <span className="capitalize">{e.nome}</span>
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
  const cardio = metEsercizio(esercizio) >= 7 ||
    esercizio.parti_corpo.some((p) => p.toLowerCase() === "cardio");

  const [ripetizioni, setRipetizioni] = useState("");
  const [peso, setPeso] = useState("");
  const [durata, setDurata] = useState("");
  const [distanza, setDistanza] = useState("");
  const [inCorso, setInCorso] = useState(false);

  async function aggiungi() {
    setInCorso(true);
    try {
      await aggiungiSerie(allenamentoId, {
        esercizio_id: esercizio.id,
        esercizio_fonte: esercizio.fonte,
        esercizio_nome: esercizio.nome,
        ripetizioni: ripetizioni ? Number(ripetizioni) : null,
        peso_kg: peso ? Number(peso) : null,
        durata_min: durata ? Number(durata) : null,
        distanza_km: distanza ? Number(distanza) : null,
      });
      // I campi restano com'erano: le serie successive di solito ripetono gli
      // stessi numeri, e riscriverli ogni volta sarebbe una noia.
      onAggiunta();
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium capitalize">{esercizio.nome}</span>
        <button
          onClick={onCambia}
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          Cambia
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
        {inCorso ? "Aggiungo…" : "Aggiungi serie"}
      </button>
    </div>
  );
}
