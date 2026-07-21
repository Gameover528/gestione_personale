"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  cercaAlimenti,
  addPasto,
  listPiatti,
  getPiatto,
} from "../queries";
import {
  PASTI,
  type AlimentoRicerca,
  type Pasto,
  type Piatto,
  per100Piatto,
  pesoPiatto,
} from "../types";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const inputClass =
  "rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

export function RicercaAggiungi() {
  const router = useRouter();
  const params = useSearchParams();
  const oggi = new Date().toISOString().slice(0, 10);

  const [mode, setMode] = useState<"cerca" | "piatti">("cerca");
  const [q, setQ] = useState("");
  const [risultati, setRisultati] = useState<AlimentoRicerca[] | null>(null);
  const [cercando, setCercando] = useState(false);
  const [piatti, setPiatti] = useState<Piatto[] | null>(null);
  const [sel, setSel] = useState<AlimentoRicerca | null>(null);

  const [data, setData] = useState(params.get("data") || oggi);
  const [pasto, setPasto] = useState<Pasto>("pranzo");
  const [quantita, setQuantita] = useState("100");
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cambiaTab(m: "cerca" | "piatti") {
    setMode(m);
    setSel(null);
    if (m === "piatti" && piatti === null) listPiatti().then(setPiatti);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setCercando(true);
    setSel(null);
    try {
      setRisultati(await cercaAlimenti(q.trim()));
    } catch {
      setError("Errore nella ricerca. Riprova.");
    } finally {
      setCercando(false);
    }
  }

  async function selezionaPiatto(p: Piatto) {
    const full = await getPiatto(p.id);
    setSel({
      nome: full.nome,
      marca: "",
      fonte: "piatto",
      per100: per100Piatto(full.ingredienti),
    });
    setQuantita(String(Math.round(pesoPiatto(full.ingredienti))));
  }

  const grammi = parseFloat(quantita || "0");
  const f = grammi / 100;

  async function handleSave() {
    if (!sel) return;
    setSalvando(true);
    setError(null);
    try {
      await addPasto({
        data,
        pasto,
        nome_alimento: sel.nome,
        marca: sel.marca || null,
        quantita_g: grammi,
        kcal_100: sel.per100.kcal,
        proteine_100: sel.per100.proteine,
        carboidrati_100: sel.per100.carboidrati,
        grassi_100: sel.per100.grassi,
        fibre_100: sel.per100.fibre,
        zuccheri_100: sel.per100.zuccheri,
        sale_100: sel.per100.sale,
        fonte: sel.fonte,
      });
      router.push("/alimentazione");
      router.refresh();
    } catch {
      setError("Errore durante il salvataggio.");
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex gap-2">
        <button
          onClick={() => cambiaTab("cerca")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            mode === "cerca" ? "bg-primary text-primary-foreground" : "border"
          )}
        >
          Cerca alimento
        </button>
        <button
          onClick={() => cambiaTab("piatti")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            mode === "piatti" ? "bg-primary text-primary-foreground" : "border"
          )}
        >
          I miei piatti
        </button>
      </div>

      {mode === "cerca" && !sel && (
        <>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca un alimento (es. latte, pasta, pollo)…"
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
            <p className="text-sm text-muted-foreground">Ricerca in corso…</p>
          )}
          {risultati && !cercando && risultati.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nessun risultato. Prova con un nome piu' generico.
            </p>
          )}
          {risultati && risultati.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {risultati.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => setSel(r)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-accent"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium capitalize">
                        {r.nome}
                        {r.marca ? (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {r.marca}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(r.per100.kcal)} kcal / 100 g · fonte{" "}
                        {r.fonte === "off" ? "Open Food Facts" : "USDA"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {mode === "piatti" && !sel && (
        <>
          {piatti === null ? (
            <p className="text-sm text-muted-foreground">Caricamento…</p>
          ) : piatti.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun piatto salvato. Creane uno nella sezione Piatti.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {piatti.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => selezionaPiatto(p)}
                    className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-accent"
                  >
                    {p.nome}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {sel && (
        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <p className="font-medium capitalize">
              {sel.nome}
              {sel.marca ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {sel.marca}
                </span>
              ) : null}
              {sel.fonte === "piatto" ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · piatto
                </span>
              ) : null}
            </p>
            <button
              onClick={() => setSel(null)}
              className="text-sm text-primary hover:underline"
            >
              ← indietro
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Data</span>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Pasto</span>
              <select
                value={pasto}
                onChange={(e) => setPasto(e.target.value as Pasto)}
                className={inputClass}
              >
                {PASTI.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Quantita' (g)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={quantita}
                onChange={(e) => setQuantita(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <span className="font-semibold">
              {Math.round(sel.per100.kcal * f)} kcal
            </span>{" "}
            <span className="text-muted-foreground">
              · P {(sel.per100.proteine * f).toFixed(1)} g · C{" "}
              {(sel.per100.carboidrati * f).toFixed(1)} g · G{" "}
              {(sel.per100.grassi * f).toFixed(1)} g
            </span>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={salvando || grammi <= 0}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {salvando ? "Salvataggio…" : "Aggiungi al diario"}
            </button>
            <button
              onClick={() => router.push("/alimentazione")}
              className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-accent"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
