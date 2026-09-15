"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronRight, Dumbbell, ClipboardList } from "lucide-react";
import {
  listAllenamenti,
  creaAllenamento,
  eliminaAllenamento,
  ripristinaAllenamento,
  getAllenamento,
  type AllenamentoRiepilogo,
} from "../allenamenti";
import { formatDate, oggiIso } from "@/lib/utils";
import { useToast } from "@/core/components/Toast";
import {
  IconButton,
  inputClass,
  bottonePrimarioClass,
  bottoneClass,
} from "@/core/components/controls";

export function AllenamentiList() {
  const [items, setItems] = useState<AllenamentoRiepilogo[] | null>(null);
  const [nuovoAperto, setNuovoAperto] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    listAllenamenti().then(setItems);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Elimina subito e offre l'annulla. Le serie si leggono prima: spariscono a
   * cascata, e senza di loro il ripristino restituirebbe una sessione vuota.
   */
  async function handleElimina(a: AllenamentoRiepilogo) {
    let completo;
    try {
      completo = await getAllenamento(a.id);
      setItems((prev) => (prev ?? []).filter((x) => x.id !== a.id));
      await eliminaAllenamento(a.id);
    } catch {
      toast({ messaggio: "Errore durante l'eliminazione.", tono: "errore" });
      load();
      return;
    }

    const serie = completo?.serie ?? [];
    toast({
      messaggio:
        serie.length > 0
          ? `Allenamento eliminato con ${serie.length} ${serie.length === 1 ? "serie" : "serie"}`
          : "Allenamento eliminato",
      azione: {
        label: "Annulla",
        onClick: async () => {
          if (completo) await ripristinaAllenamento(completo, serie);
          load();
        },
      },
    });
  }

  if (items === null) {
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {nuovoAperto ? (
        <FormNuovo
          onFatto={() => {
            setNuovoAperto(false);
            load();
          }}
          onAnnulla={() => setNuovoAperto(false)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setNuovoAperto(true)}
            className={bottonePrimarioClass}
          >
            <Plus className="h-4 w-4" />
            Nuovo allenamento
          </button>
          {/* Su telefono le schede non stanno in barra: qui è il punto in cui
              servono, perché è da qui che si parte per allenarsi. */}
          <Link href="/esercizio/schede" prefetch={false} className={bottoneClass}>
            <ClipboardList className="h-4 w-4" />
            Inizia da una scheda
          </Link>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Dumbbell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nessun allenamento registrato. Creane uno e aggiungici gli esercizi
            che hai fatto.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-lg border bg-card p-3"
            >
              <Link
                href={`/esercizio/allenamento/${a.id}`}
                prefetch={false}
                className="flex min-w-0 flex-1 items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    {a.nome || `Allenamento del ${formatDate(a.data)}`}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatDate(a.data)}
                    {a.durata_min ? ` · ${a.durata_min} min` : ""}
                    {a.esercizi > 0
                      ? ` · ${a.esercizi} eserciz${a.esercizi === 1 ? "io" : "i"}, ${a.serie} serie`
                      : " · nessun esercizio"}
                    {a.kcal ? ` · ~${a.kcal} kcal` : ""}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
              <IconButton
                label={`Elimina l'allenamento del ${formatDate(a.data)}`}
                tono="distruttivo"
                onClick={() => handleElimina(a)}
              >
                <Trash2 className="h-5 w-5" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Creazione rapida: la data è già oggi, il resto si può lasciare vuoto. */
function FormNuovo({
  onFatto,
  onAnnulla,
}: {
  onFatto: () => void;
  onAnnulla: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState(oggiIso());
  const [nome, setNome] = useState("");
  const [durata, setDurata] = useState("");
  const [inCorso, setInCorso] = useState(false);

  async function salva() {
    setInCorso(true);
    try {
      const id = await creaAllenamento({
        data,
        nome: nome.trim() || null,
        durata_min: durata ? Number(durata) : null,
        note: null,
      });
      onFatto();
      // Si apre subito la scheda: dopo aver creato la sessione la cosa che si
      // vuole fare è aggiungerci gli esercizi.
      router.push(`/esercizio/allenamento/${id}`);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-3">
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
          <span className="font-medium">Nome (facoltativo)</span>
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
            placeholder="60"
            className={inputClass}
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={salva} disabled={inCorso} className={bottonePrimarioClass}>
          {inCorso ? "Creo…" : "Crea e aggiungi esercizi"}
        </button>
        <button onClick={onAnnulla} className={bottoneClass}>
          Annulla
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        La durata serve a stimare le calorie: puoi metterla anche dopo.
      </p>
    </div>
  );
}
