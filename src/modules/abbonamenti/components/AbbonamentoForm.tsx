"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { creaAbbonamentoAction, type AbbonamentoResult } from "../queries";
import { FREQUENZE, oggiISO } from "../types";

const initialState: AbbonamentoResult = {};
const inputClass =
  "rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

export function AbbonamentoForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(creaAbbonamentoAction, initialState);

  useEffect(() => {
    if (state.ok) router.push("/abbonamenti");
  }, [state.ok, router]);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="nome" className="text-sm font-medium">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          required
          placeholder="Es. Netflix, Assicurazione auto, Palestra…"
          className={inputClass}
        />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="importo" className="text-sm font-medium">
            Importo per rata
          </label>
          <input
            id="importo"
            name="importo"
            type="number"
            step="0.01"
            min="0"
            required
            className={inputClass}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="frequenza" className="text-sm font-medium">
            Frequenza
          </label>
          <select id="frequenza" name="frequenza" defaultValue="mensile" className={inputClass}>
            {FREQUENZE.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="data_inizio" className="text-sm font-medium">
          Data di inizio
        </label>
        <input
          id="data_inizio"
          name="data_inizio"
          type="date"
          defaultValue={oggiISO()}
          required
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">
          Se la scegli nel passato, le rate già scadute da allora a oggi verranno create
          subito automaticamente.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="note" className="text-sm font-medium">
          Note (facoltative)
        </label>
        <textarea id="note" name="note" rows={2} className={inputClass} />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Creazione…" : "Crea abbonamento"}
      </button>
    </form>
  );
}
