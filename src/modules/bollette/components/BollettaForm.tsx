"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBolletta,
  updateBolletta,
  uploadAllegato,
  removeAllegato,
} from "../queries";
import {
  type Bolletta,
  type BollettaInput,
  type TipoBolletta,
  type StatoBolletta,
  type StatoDivisione,
  TIPI,
  DIVISIONI,
  quotaAltra,
} from "../types";
import { formatCurrency } from "@/lib/utils";

const inputClass =
  "rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

export function BollettaForm({ initial }: { initial?: Bolletta }) {
  const router = useRouter();
  const editing = Boolean(initial);

  const [fornitore, setFornitore] = useState(initial?.fornitore ?? "");
  const [tipo, setTipo] = useState<TipoBolletta>(initial?.tipo ?? "luce");
  const [importo, setImporto] = useState(
    initial ? String(initial.importo) : ""
  );
  const [dataScadenza, setDataScadenza] = useState(
    initial?.data_scadenza ?? ""
  );
  const [stato, setStato] = useState<StatoBolletta>(
    initial?.stato ?? "da_pagare"
  );
  const [dataPagamento, setDataPagamento] = useState(
    initial?.data_pagamento ?? ""
  );
  const [divisione, setDivisione] = useState<StatoDivisione>(
    initial?.divisione ?? "non_condivisa"
  );
  const [personeTue, setPersoneTue] = useState(
    initial ? String(initial.persone_tue) : "3"
  );
  const [personeAltre, setPersoneAltre] = useState(
    initial ? String(initial.persone_altre) : "2"
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [allegatoPath, setAllegatoPath] = useState<string | null>(
    initial?.allegato_path ?? null
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      let path = allegatoPath;
      if (file) {
        if (file.type !== "application/pdf") {
          throw new Error("L'allegato deve essere un PDF.");
        }
        path = await uploadAllegato(file);
      }

      const payload: BollettaInput = {
        fornitore: fornitore.trim(),
        tipo,
        importo: parseFloat(importo || "0"),
        data_scadenza: dataScadenza,
        stato,
        data_pagamento: stato === "pagata" ? dataPagamento || null : null,
        divisione,
        persone_tue:
          divisione === "non_condivisa" ? 3 : parseInt(personeTue || "0", 10),
        persone_altre:
          divisione === "non_condivisa" ? 2 : parseInt(personeAltre || "0", 10),
        note: note.trim() || null,
        allegato_path: path,
      };

      if (editing && initial) {
        await updateBolletta(initial.id, payload);
      } else {
        await createBolletta(payload);
      }
      router.push("/bollette");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il salvataggio");
      setSaving(false);
    }
  }

  async function handleRemoveAllegato() {
    if (allegatoPath) await removeAllegato(allegatoPath);
    setAllegatoPath(null);
    setFile(null);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Fornitore">
          <input
            required
            value={fornitore}
            onChange={(e) => setFornitore(e.target.value)}
            className={inputClass}
            placeholder="Es. Enel, Iren…"
          />
        </Field>
        <Field label="Tipo">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoBolletta)}
            className={inputClass}
          >
            {TIPI.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Importo (€)">
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={importo}
            onChange={(e) => setImporto(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Data scadenza">
          <input
            required
            type="date"
            value={dataScadenza}
            onChange={(e) => setDataScadenza(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Stato">
          <select
            value={stato}
            onChange={(e) => setStato(e.target.value as StatoBolletta)}
            className={inputClass}
          >
            <option value="da_pagare">Da pagare</option>
            <option value="pagata">Pagata</option>
          </select>
        </Field>
        {stato === "pagata" && (
          <Field label="Data pagamento">
            <input
              type="date"
              value={dataPagamento ?? ""}
              onChange={(e) => setDataPagamento(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}
        <Field label="Divisione spesa">
          <select
            value={divisione}
            onChange={(e) => setDivisione(e.target.value as StatoDivisione)}
            className={inputClass}
          >
            {DIVISIONI.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {divisione !== "non_condivisa" && (
        <div className="rounded-md border bg-muted/40 p-4">
          <p className="mb-3 text-sm font-medium">
            Ripartizione quota (paghi tu, recuperi la quota altrui)
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Persone tue">
              <input
                type="number"
                min="0"
                value={personeTue}
                onChange={(e) => setPersoneTue(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Persone altra famiglia">
              <input
                type="number"
                min="0"
                value={personeAltre}
                onChange={(e) => setPersoneAltre(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Da recuperare dall&apos;altra famiglia:{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(
                quotaAltra(
                  parseFloat(importo || "0"),
                  parseInt(personeTue || "0", 10),
                  parseInt(personeAltre || "0", 10)
                )
              )}
            </span>
          </p>
        </div>
      )}

      <Field label="Note">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={inputClass}
          rows={3}
        />
      </Field>

      <Field label="Allegato PDF">
        {allegatoPath ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">PDF allegato</span>
            <button
              type="button"
              onClick={handleRemoveAllegato}
              className="text-destructive hover:underline"
            >
              Rimuovi
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        )}
      </Field>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Salvataggio…" : editing ? "Salva modifiche" : "Crea bolletta"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-accent"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
