"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  cercaAlimenti,
  createPiatto,
  updatePiatto,
  type IngredienteInput,
} from "../queries";
import {
  type AlimentoRicerca,
  type PiattoConIngredienti,
  totaliPiatto,
  pesoPiatto,
  valoriPorzione,
} from "../types";
import { Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const inputClass =
  "rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

export function PiattoEditor({ initial }: { initial?: PiattoConIngredienti }) {
  const router = useRouter();
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [ingredienti, setIngredienti] = useState<IngredienteInput[]>(
    initial?.ingredienti.map((i) => ({
      nome_alimento: i.nome_alimento,
      marca: i.marca,
      quantita_g: i.quantita_g,
      kcal_100: i.kcal_100,
      proteine_100: i.proteine_100,
      carboidrati_100: i.carboidrati_100,
      grassi_100: i.grassi_100,
      fibre_100: i.fibre_100,
      zuccheri_100: i.zuccheri_100,
      sale_100: i.sale_100,
      fonte: i.fonte,
    })) ?? []
  );

  const [mode, setMode] = useState<"cerca" | "manuale">("cerca");
  const [q, setQ] = useState("");
  const [risultati, setRisultati] = useState<AlimentoRicerca[] | null>(null);
  const [cercando, setCercando] = useState(false);

  // manuale
  const [mNome, setMNome] = useState("");
  const [mGrammi, setMGrammi] = useState("100");
  const [mKcal, setMKcal] = useState("");
  const [mPro, setMPro] = useState("");
  const [mCarb, setMCarb] = useState("");
  const [mGras, setMGras] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totali = totaliPiatto(ingredienti);
  const peso = pesoPiatto(ingredienti);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setCercando(true);
    try {
      setRisultati(await cercaAlimenti(q.trim()));
    } finally {
      setCercando(false);
    }
  }

  function aggiungiDaRicerca(r: AlimentoRicerca) {
    setIngredienti((prev) => [
      ...prev,
      {
        nome_alimento: r.nome,
        marca: r.marca || null,
        quantita_g: 100,
        kcal_100: r.per100.kcal,
        proteine_100: r.per100.proteine,
        carboidrati_100: r.per100.carboidrati,
        grassi_100: r.per100.grassi,
        fibre_100: r.per100.fibre,
        zuccheri_100: r.per100.zuccheri,
        sale_100: r.per100.sale,
        fonte: r.fonte,
      },
    ]);
  }

  function aggiungiManuale() {
    if (!mNome.trim()) return;
    setIngredienti((prev) => [
      ...prev,
      {
        nome_alimento: mNome.trim(),
        marca: null,
        quantita_g: parseFloat(mGrammi || "0"),
        kcal_100: parseFloat(mKcal || "0"),
        proteine_100: parseFloat(mPro || "0"),
        carboidrati_100: parseFloat(mCarb || "0"),
        grassi_100: parseFloat(mGras || "0"),
        fibre_100: 0,
        zuccheri_100: 0,
        sale_100: 0,
        fonte: "manuale",
      },
    ]);
    setMNome("");
    setMGrammi("100");
    setMKcal("");
    setMPro("");
    setMCarb("");
    setMGras("");
  }

  function setGrammi(idx: number, v: string) {
    setIngredienti((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, quantita_g: parseFloat(v || "0") } : it
      )
    );
  }

  function rimuovi(idx: number) {
    setIngredienti((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!nome.trim()) {
      setError("Dai un nome al piatto.");
      return;
    }
    if (ingredienti.length === 0) {
      setError("Aggiungi almeno un ingrediente.");
      return;
    }
    setSalvando(true);
    setError(null);
    try {
      if (initial) await updatePiatto(initial.id, nome.trim(), ingredienti);
      else await createPiatto(nome.trim(), ingredienti);
      router.push("/alimentazione/piatti");
      router.refresh();
    } catch {
      setError("Errore durante il salvataggio.");
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Nome del piatto</span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Es. Pasta al pomodoro della mensa"
          className={inputClass}
        />
      </label>

      {/* Ingredienti */}
      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b bg-muted px-4 py-2">
          <span className="text-sm font-semibold">Ingredienti</span>
          <span className="text-sm text-muted-foreground">
            {Math.round(totali.kcal)} kcal · {peso} g
          </span>
        </div>
        {ingredienti.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            Nessun ingrediente. Aggiungline qui sotto.
          </p>
        ) : (
          <ul>
            {ingredienti.map((it, idx) => {
              const v = valoriPorzione(it);
              return (
                <li
                  key={idx}
                  className="flex items-center gap-3 border-t px-4 py-2 text-sm first:border-t-0"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {it.nome_alimento}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={it.quantita_g}
                    onChange={(e) => setGrammi(idx, e.target.value)}
                    className={`${inputClass} w-20`}
                  />
                  <span className="w-16 text-right text-muted-foreground">
                    {Math.round(v.kcal)} kcal
                  </span>
                  <button
                    onClick={() => rimuovi(idx)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                    title="Rimuovi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Aggiungi ingrediente */}
      <div className="rounded-lg border p-4">
        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setMode("cerca")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              mode === "cerca" ? "bg-primary text-primary-foreground" : "border"
            )}
          >
            Cerca
          </button>
          <button
            onClick={() => setMode("manuale")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              mode === "manuale" ? "bg-primary text-primary-foreground" : "border"
            )}
          >
            Manuale
          </button>
        </div>

        {mode === "cerca" ? (
          <div className="space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cerca ingrediente…"
                className={cn(inputClass, "flex-1")}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                <Search className="h-4 w-4" />
                Cerca
              </button>
            </form>
            {cercando && (
              <p className="text-sm text-muted-foreground">Ricerca…</p>
            )}
            {risultati && (
              <ul className="max-h-60 divide-y overflow-y-auto rounded-md border">
                {risultati.length === 0 && (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    Nessun risultato.
                  </li>
                )}
                {risultati.map((r, i) => (
                  <li key={i}>
                    <button
                      onClick={() => aggiungiDaRicerca(r)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span className="truncate capitalize">{r.nome}</span>
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                        {Math.round(r.per100.kcal)} kcal/100g
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <input
                value={mNome}
                onChange={(e) => setMNome(e.target.value)}
                placeholder="Nome"
                className={cn(inputClass, "col-span-2 sm:col-span-3")}
              />
              <NumField label="Grammi" value={mGrammi} onChange={setMGrammi} />
              <NumField label="kcal/100g" value={mKcal} onChange={setMKcal} />
              <NumField label="Proteine/100g" value={mPro} onChange={setMPro} />
              <NumField label="Carbo/100g" value={mCarb} onChange={setMCarb} />
              <NumField label="Grassi/100g" value={mGras} onChange={setMGras} />
            </div>
            <button
              onClick={aggiungiManuale}
              className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-accent"
            >
              Aggiungi ingrediente
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={salvando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Salvataggio…" : "Salva piatto"}
        </button>
        <button
          onClick={() => router.push("/alimentazione/piatti")}
          className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-accent"
        >
          Annulla
        </button>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}
