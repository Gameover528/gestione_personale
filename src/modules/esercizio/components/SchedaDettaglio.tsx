"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Search, X, Play } from "lucide-react";
import {
  getScheda,
  aggiungiEsercizioScheda,
  eliminaEsercizioScheda,
  iniziaDaScheda,
  type SchedaConEsercizi,
} from "../schede";
import { listEsercizi } from "../queries";
import { cercaEsercizi, muscoliDisegnabili, type Esercizio } from "../types";
import { metEsercizio } from "../met";
import { NOME_MUSCOLO } from "../muscoli/tipi";
import { Miniatura } from "./Miniatura";
import { oggiIso } from "@/lib/utils";
import { useToast } from "@/core/components/Toast";
import { Card, CardTitle } from "@/core/components/ui";
import {
  IconButton,
  inputClass,
  bottoneClass,
  bottonePrimarioClass,
} from "@/core/components/controls";

/** Come si legge una voce di scheda: "4 × 8 a 60 kg", o durata/distanza. */
function descriviVoce(e: {
  serie: number;
  ripetizioni: number | null;
  peso_kg: number | null;
  durata_min: number | null;
  distanza_km: number | null;
}): string {
  const pezzi: string[] = [];
  if (e.ripetizioni) pezzi.push(`${e.serie} × ${e.ripetizioni}`);
  else pezzi.push(`${e.serie} serie`);
  if (e.peso_kg) pezzi.push(`a ${e.peso_kg} kg`);
  if (e.durata_min) pezzi.push(`${e.durata_min} min`);
  if (e.distanza_km) pezzi.push(`${e.distanza_km} km`);
  return pezzi.join(" ");
}

export function SchedaDettaglio({ id }: { id: string }) {
  const router = useRouter();
  const [dati, setDati] = useState<SchedaConEsercizi | null | "assente">(null);
  const [esercizi, setEsercizi] = useState<Esercizio[]>([]);
  const [scelto, setScelto] = useState<Esercizio | null>(null);
  const [avvio, setAvvio] = useState(false);
  const [data, setData] = useState(oggiIso());
  const toast = useToast();

  const load = useCallback(() => {
    getScheda(id).then((s) => setDati(s ?? "assente"));
  }, [id]);

  useEffect(() => {
    load();
    listEsercizi().then(setEsercizi);
  }, [load]);

  async function handleElimina(voceId: string, nome: string) {
    await eliminaEsercizioScheda(voceId);
    load();
    toast({ messaggio: `"${nome}" tolto dalla scheda` });
  }

  async function handleInizia() {
    setAvvio(true);
    try {
      const idAllenamento = await iniziaDaScheda(id, data);
      router.push(`/esercizio/allenamento/${idAllenamento}`);
    } finally {
      setAvvio(false);
    }
  }

  if (dati === null) {
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  }
  if (dati === "assente") {
    return (
      <p className="text-sm text-muted-foreground">Questa scheda non esiste più.</p>
    );
  }

  const serieTotali = dati.esercizi.reduce((s, e) => s + e.serie, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div>
          <h2 className="text-lg font-semibold">{dati.nome}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {dati.esercizi.length === 0
              ? "Nessun esercizio: aggiungine qui sotto."
              : `${dati.esercizi.length} eserciz${dati.esercizi.length === 1 ? "io" : "i"} · ${serieTotali} serie previste`}
          </p>
        </div>
        {/* La data sta accanto al pulsante e parte da oggi: il caso normale
            resta un tocco solo, ma si può registrare anche un allenamento di
            ieri o della settimana scorsa senza doverlo poi correggere. */}
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Giorno</span>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              aria-label="Giorno dell'allenamento da creare"
              className={inputClass}
            />
          </label>
          <button
            onClick={handleInizia}
            disabled={dati.esercizi.length === 0 || avvio}
            className={bottonePrimarioClass}
          >
            <Play className="h-4 w-4" />
            {avvio ? "Avvio…" : "Inizia questo allenamento"}
          </button>
        </div>
      </div>

      {dati.esercizi.length > 0 && (
        <ul className="space-y-2">
          {dati.esercizi.map((e) => (
            <li
              key={e.id}
              className="flex min-h-11 items-center justify-between gap-2 rounded-lg border bg-card p-3"
            >
              <div className="min-w-0">
                <span className="font-medium capitalize">{e.esercizio_nome}</span>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {descriviVoce(e)}
                </p>
              </div>
              <IconButton
                label={`Togli ${e.esercizio_nome} dalla scheda`}
                tono="distruttivo"
                onClick={() => handleElimina(e.id, e.esercizio_nome)}
              >
                <Trash2 className="h-5 w-5" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardTitle>Aggiungi un esercizio alla scheda</CardTitle>
        {scelto ? (
          <FormVoce
            schedaId={id}
            esercizio={scelto}
            onAggiunta={load}
            onCambia={() => setScelto(null)}
          />
        ) : (
          <SelettoreEsercizio esercizi={esercizi} onScelto={setScelto} />
        )}
      </Card>

      <p className="text-xs text-muted-foreground">
        La scheda è un programma: avviandola i numeri vengono copiati
        nell&apos;allenamento, dove puoi cambiarli senza toccare la scheda.
      </p>
    </div>
  );
}

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
          aria-label="Cerca l'esercizio da aggiungere alla scheda"
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

/** Quante serie e con quali numeri: è il "4x8 a 60 kg" scritto sulla scheda. */
function FormVoce({
  schedaId,
  esercizio,
  onAggiunta,
  onCambia,
}: {
  schedaId: string;
  esercizio: Esercizio;
  onAggiunta: () => void;
  onCambia: () => void;
}) {
  const cardio =
    metEsercizio(esercizio) >= 7 ||
    esercizio.parti_corpo.some((p) => p.toLowerCase() === "cardio");

  const [serie, setSerie] = useState("3");
  const [ripetizioni, setRipetizioni] = useState("");
  const [peso, setPeso] = useState("");
  const [durata, setDurata] = useState("");
  const [distanza, setDistanza] = useState("");
  const [inCorso, setInCorso] = useState(false);

  async function aggiungi() {
    setInCorso(true);
    try {
      await aggiungiEsercizioScheda(schedaId, {
        esercizio_id: esercizio.id,
        esercizio_fonte: esercizio.fonte,
        esercizio_nome: esercizio.nome,
        serie: serie ? Number(serie) : 1,
        ripetizioni: ripetizioni ? Number(ripetizioni) : null,
        peso_kg: peso ? Number(peso) : null,
        durata_min: durata ? Number(durata) : null,
        distanza_km: distanza ? Number(distanza) : null,
      });
      onCambia();
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

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Serie</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={serie}
            onChange={(e) => setSerie(e.target.value)}
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
        {inCorso ? "Aggiungo…" : "Aggiungi alla scheda"}
      </button>
    </div>
  );
}
