"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronRight, Play, ClipboardList } from "lucide-react";
import {
  listSchede,
  creaScheda,
  eliminaScheda,
  ripristinaScheda,
  getScheda,
  iniziaDaScheda,
  type SchedaRiepilogo,
} from "../schede";
import { useToast } from "@/core/components/Toast";
import {
  IconButton,
  inputClass,
  bottoneClass,
  bottonePrimarioClass,
} from "@/core/components/controls";

export function SchedeList() {
  const router = useRouter();
  const [items, setItems] = useState<SchedaRiepilogo[] | null>(null);
  const [nuovaAperta, setNuovaAperta] = useState(false);
  const [nome, setNome] = useState("");
  const [avvio, setAvvio] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    listSchede().then(setItems);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function crea() {
    if (!nome.trim()) return;
    const id = await creaScheda(nome.trim(), null);
    setNome("");
    setNuovaAperta(false);
    router.push(`/esercizio/schede/${id}`);
  }

  async function handleElimina(s: SchedaRiepilogo) {
    let completa;
    try {
      completa = await getScheda(s.id);
      setItems((prev) => (prev ?? []).filter((x) => x.id !== s.id));
      await eliminaScheda(s.id);
    } catch {
      toast({ messaggio: "Errore durante l'eliminazione.", tono: "errore" });
      load();
      return;
    }
    toast({
      messaggio: `Scheda "${s.nome}" eliminata`,
      azione: {
        label: "Annulla",
        onClick: async () => {
          if (completa) await ripristinaScheda(completa, completa.esercizi);
          load();
        },
      },
    });
  }

  /** Avviare una scheda crea l'allenamento e ci porta dentro: è il gesto del giorno. */
  async function handleInizia(s: SchedaRiepilogo) {
    setAvvio(s.id);
    try {
      const id = await iniziaDaScheda(s.id);
      router.push(`/esercizio/allenamento/${id}`);
    } finally {
      setAvvio(null);
    }
  }

  if (items === null) {
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {nuovaAperta ? (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">Nome della scheda</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Spinta A"
              className={inputClass}
            />
          </label>
          <div className="flex gap-2">
            <button onClick={crea} className={bottonePrimarioClass}>
              Crea
            </button>
            <button onClick={() => setNuovaAperta(false)} className={bottoneClass}>
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setNuovaAperta(true)}
          className={`${bottonePrimarioClass} self-start`}
        >
          <Plus className="h-4 w-4" />
          Nuova scheda
        </button>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Una scheda è un allenamento che si ripete: la prepari una volta e poi
            la avvii, e gli esercizi sono già tutti lì.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center"
            >
              <Link
                href={`/esercizio/schede/${s.id}`}
                prefetch={false}
                className="flex min-w-0 flex-1 items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium">{s.nome}</div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {s.voci === 0
                      ? "Nessun esercizio"
                      : `${s.voci} eserciz${s.voci === 1 ? "io" : "i"} · ${s.serie} serie previste`}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
              <div className="flex items-center gap-1 border-t pt-1 sm:border-0 sm:pt-0">
                <button
                  onClick={() => handleInizia(s)}
                  disabled={s.voci === 0 || avvio === s.id}
                  className={bottoneClass}
                >
                  <Play className="h-4 w-4" />
                  {avvio === s.id ? "Avvio…" : "Inizia"}
                </button>
                <span className="ml-2">
                  <IconButton
                    label={`Elimina la scheda ${s.nome}`}
                    tono="distruttivo"
                    onClick={() => handleElimina(s)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </IconButton>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
