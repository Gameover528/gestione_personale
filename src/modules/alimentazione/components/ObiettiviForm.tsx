"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDatiCorporei, getObiettivi, saveObiettivi } from "../queries";
import {
  NUTRIENTI,
  type DatiCorporei,
  type Obiettivo,
  type Nutriente,
} from "../types";
import { CalcolaObiettivi } from "./CalcolaObiettivi";
import { NumberInput, inputClass } from "@/core/components/controls";
import { useToast } from "@/core/components/Toast";
import { parseNumero } from "@/lib/utils";

type Riga = { valore: string; tipo: "min" | "max" };

function righeDaObiettivi(list: Obiettivo[]): Record<Nutriente, Riga> {
  const righe = {} as Record<Nutriente, Riga>;
  for (const n of NUTRIENTI) righe[n.value] = { valore: "", tipo: n.defaultTipo };
  for (const o of list) righe[o.nutriente] = { valore: String(o.valore), tipo: o.tipo };
  return righe;
}

export function ObiettiviForm({
  embedded = false,
  iniziali,
  datiCorporeiIniziali,
}: {
  embedded?: boolean;
  /** Se assenti, vengono caricati dal client (uso incorporato nelle preferenze). */
  iniziali?: Obiettivo[];
  datiCorporeiIniziali?: DatiCorporei | null;
} = {}) {
  const router = useRouter();
  const toast = useToast();
  const [righe, setRighe] = useState<Record<Nutriente, Riga>>(() =>
    righeDaObiettivi(iniziali ?? [])
  );
  const [corpo, setCorpo] = useState<DatiCorporei | null>(
    datiCorporeiIniziali ?? null
  );
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (iniziali === undefined) getObiettivi().then((l) => setRighe(righeDaObiettivi(l)));
    if (datiCorporeiIniziali === undefined) getDatiCorporei().then(setCorpo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set(n: Nutriente, patch: Partial<Riga>) {
    setRighe((prev) => ({ ...prev, [n]: { ...prev[n], ...patch } }));
  }

  /** Riempie i campi con la proposta del calcolatore, senza salvare. */
  function applicaProposta(p: {
    kcal: number;
    proteine: number;
    grassi: number;
    carboidrati: number;
    fibre: number;
  }) {
    setRighe((prev) => ({
      ...prev,
      kcal: { valore: String(p.kcal), tipo: "max" },
      proteine: { valore: String(p.proteine), tipo: "min" },
      carboidrati: { valore: String(p.carboidrati), tipo: "max" },
      grassi: { valore: String(p.grassi), tipo: "max" },
      fibre: { valore: String(p.fibre), tipo: "min" },
    }));
  }

  async function handleSave() {
    setSalvando(true);
    const list: Obiettivo[] = NUTRIENTI.filter(
      (n) => parseNumero(righe[n.value].valore) > 0
    ).map((n) => ({
      nutriente: n.value,
      valore: parseNumero(righe[n.value].valore),
      tipo: righe[n.value].tipo,
    }));
    try {
      await saveObiettivi(list);
      toast({ messaggio: "Obiettivi salvati." });
      router.refresh();
    } catch {
      toast({ messaggio: "Errore durante il salvataggio.", tono: "errore" });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Imposta un valore giornaliero per nutriente. Tipo{" "}
        <strong>minimo</strong> = da raggiungere (superarlo va bene), tipo{" "}
        <strong>massimo</strong> = limite da non superare. Lascia 0 per non
        tracciarlo.
      </p>

      <CalcolaObiettivi iniziali={corpo} onProposta={applicaProposta} />

      <div className="space-y-2">
        {NUTRIENTI.map((n) => (
          <div
            key={n.value}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border p-3"
          >
            <span className="text-sm font-medium">
              {n.label}{" "}
              <span className="text-xs text-muted-foreground">({n.unita})</span>
            </span>
            <NumberInput
              value={righe[n.value].valore}
              onChange={(v) => set(n.value, { valore: v })}
              aria-label={`Obiettivo per ${n.label} in ${n.unita}`}
              placeholder="0"
              className="w-28"
            />
            <select
              value={righe[n.value].tipo}
              onChange={(e) =>
                set(n.value, { tipo: e.target.value as "min" | "max" })
              }
              aria-label={`Tipo di obiettivo per ${n.label}`}
              className={inputClass}
            >
              <option value="min">minimo</option>
              <option value="max">massimo</option>
            </select>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={salvando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Salvataggio…" : "Salva obiettivi"}
        </button>
        {!embedded && (
          <button
            onClick={() => router.back()}
            className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-accent"
          >
            Indietro
          </button>
        )}
      </div>
    </div>
  );
}
