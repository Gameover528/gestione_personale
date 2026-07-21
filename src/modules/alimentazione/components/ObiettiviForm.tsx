"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getObiettivi, saveObiettivi } from "../queries";
import { NUTRIENTI, type Obiettivo, type Nutriente } from "../types";

const inputClass =
  "rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

type Riga = { valore: string; tipo: "min" | "max" };

export function ObiettiviForm() {
  const router = useRouter();
  const [righe, setRighe] = useState<Record<Nutriente, Riga>>(() => {
    const init = {} as Record<Nutriente, Riga>;
    for (const n of NUTRIENTI) init[n.value] = { valore: "", tipo: n.defaultTipo };
    return init;
  });
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getObiettivi().then((list) => {
      setRighe((prev) => {
        const next = { ...prev };
        for (const o of list)
          next[o.nutriente] = { valore: String(o.valore), tipo: o.tipo };
        return next;
      });
    });
  }, []);

  function set(n: Nutriente, patch: Partial<Riga>) {
    setRighe((prev) => ({ ...prev, [n]: { ...prev[n], ...patch } }));
  }

  async function handleSave() {
    setSalvando(true);
    setMsg(null);
    const list: Obiettivo[] = NUTRIENTI.filter(
      (n) => parseFloat(righe[n.value].valore || "0") > 0
    ).map((n) => ({
      nutriente: n.value,
      valore: parseFloat(righe[n.value].valore),
      tipo: righe[n.value].tipo,
    }));
    try {
      await saveObiettivi(list);
      setMsg("Obiettivi salvati.");
      router.refresh();
    } catch {
      setMsg("Errore durante il salvataggio.");
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
            <input
              type="number"
              min="0"
              step="0.1"
              value={righe[n.value].valore}
              onChange={(e) => set(n.value, { valore: e.target.value })}
              className={`${inputClass} w-28`}
              placeholder="0"
            />
            <select
              value={righe[n.value].tipo}
              onChange={(e) =>
                set(n.value, { tipo: e.target.value as "min" | "max" })
              }
              className={inputClass}
            >
              <option value="min">minimo</option>
              <option value="max">massimo</option>
            </select>
          </div>
        ))}
      </div>

      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={salvando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Salvataggio…" : "Salva obiettivi"}
        </button>
        <button
          onClick={() => router.push("/alimentazione")}
          className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-accent"
        >
          Indietro
        </button>
      </div>
    </div>
  );
}
