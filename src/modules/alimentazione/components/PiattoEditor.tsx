"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPiatto, updatePiatto, type IngredienteInput } from "../queries";
import {
  NUTRIENTI,
  VALORI_ZERO,
  da100,
  type AlimentoRicerca,
  type Nutriente,
  type PiattoConIngredienti,
  type TipoPiatto,
  type ValoriNutrizionali,
  totaliPiatto,
  pesoPiatto,
  per100Piatto,
  scalaValori,
  valoriPorzione,
} from "../types";
import { useRicercaAlimenti } from "./useRicercaAlimenti";
import { RicercaFeedback } from "./RicercaFeedback";
import {
  IconButton,
  NumberField,
  NumberInput,
  TabBar,
  inputClass,
} from "@/core/components/controls";
import { Search, Trash2 } from "lucide-react";
import { cn, parseNumero } from "@/lib/utils";

type CampiValori = Record<Nutriente, string>;

const CAMPI_VUOTI: CampiValori = {
  kcal: "",
  proteine: "",
  carboidrati: "",
  grassi: "",
  fibre: "",
  zuccheri: "",
  sale: "",
};

const TIPI: { value: TipoPiatto; label: string }[] = [
  { value: "composto", label: "Somma degli ingredienti" },
  { value: "diretto", label: "Valori inseriti a mano" },
];

const BASI: { value: "100" | "porzione"; label: string }[] = [
  { value: "100", label: "per 100 g" },
  { value: "porzione", label: "per porzione" },
];

const FONTI_INGREDIENTE: { value: "cerca" | "manuale"; label: string }[] = [
  { value: "cerca", label: "Cerca" },
  { value: "manuale", label: "Manuale" },
];

function campiDaValori(v: ValoriNutrizionali): CampiValori {
  const arrotonda = (x: number) =>
    x === 0 ? "" : String(Math.round(x * 100) / 100);
  return {
    kcal: arrotonda(v.kcal),
    proteine: arrotonda(v.proteine),
    carboidrati: arrotonda(v.carboidrati),
    grassi: arrotonda(v.grassi),
    fibre: arrotonda(v.fibre),
    zuccheri: arrotonda(v.zuccheri),
    sale: arrotonda(v.sale),
  };
}

function valoriDaCampi(c: CampiValori): ValoriNutrizionali {
  return {
    kcal: parseNumero(c.kcal),
    proteine: parseNumero(c.proteine),
    carboidrati: parseNumero(c.carboidrati),
    grassi: parseNumero(c.grassi),
    fibre: parseNumero(c.fibre),
    zuccheri: parseNumero(c.zuccheri),
    sale: parseNumero(c.sale),
  };
}

export function PiattoEditor({ initial }: { initial?: PiattoConIngredienti }) {
  const router = useRouter();
  const ricerca = useRicercaAlimenti();

  const [nome, setNome] = useState(initial?.nome ?? "");
  const [marca, setMarca] = useState(initial?.marca ?? "");
  const [tipo, setTipo] = useState<TipoPiatto>(initial?.tipo ?? "composto");

  const [porzioneNome, setPorzioneNome] = useState(initial?.porzione_nome ?? "");
  const [porzioneG, setPorzioneG] = useState(
    initial?.porzione_g != null ? String(initial.porzione_g) : ""
  );

  // Valori diretti: si possono inserire per 100 g (come le etichette europee)
  // oppure per porzione (come spesso è scritto sui prodotti confezionati).
  const [base, setBase] = useState<"100" | "porzione">("100");
  const [campi, setCampi] = useState<CampiValori>(
    initial?.tipo === "diretto" ? campiDaValori(da100(initial)) : CAMPI_VUOTI
  );

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

  const [modoIngrediente, setModoIngrediente] = useState<"cerca" | "manuale">(
    "cerca"
  );

  // ingrediente inserito a mano
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
  const grammiPorzione = parseNumero(porzioneG);

  /** Valori per 100 g risultanti da quello che è stato inserito. */
  const per100: ValoriNutrizionali =
    tipo === "composto"
      ? per100Piatto(ingredienti)
      : base === "100"
        ? valoriDaCampi(campi)
        : grammiPorzione > 0
          ? scalaValori(valoriDaCampi(campi), 100 / grammiPorzione)
          : { ...VALORI_ZERO };

  function aggiungiDaRicerca(r: AlimentoRicerca) {
    setIngredienti((prev) => [
      ...prev,
      {
        nome_alimento: r.nome,
        marca: r.marca || null,
        quantita_g: r.porzione_g && r.porzione_g > 0 ? r.porzione_g : 100,
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
        quantita_g: parseNumero(mGrammi),
        kcal_100: parseNumero(mKcal),
        proteine_100: parseNumero(mPro),
        carboidrati_100: parseNumero(mCarb),
        grassi_100: parseNumero(mGras),
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
        i === idx ? { ...it, quantita_g: parseNumero(v) } : it
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
    if (tipo === "composto" && ingredienti.length === 0) {
      setError("Aggiungi almeno un ingrediente.");
      return;
    }
    if (tipo === "diretto") {
      if (base === "porzione" && !(grammiPorzione > 0)) {
        setError(
          "Per inserire i valori per porzione indica quanti grammi pesa una porzione."
        );
        return;
      }
      if (per100.kcal <= 0) {
        setError("Indica almeno le calorie.");
        return;
      }
    }

    setSalvando(true);
    setError(null);
    const input = {
      nome: nome.trim(),
      marca: marca.trim() || null,
      tipo,
      valori100: per100,
      porzione_nome: porzioneNome.trim() || null,
      porzione_g: grammiPorzione > 0 ? grammiPorzione : null,
    };
    try {
      if (initial) await updatePiatto(initial.id, input, ingredienti);
      else await createPiatto(input, ingredienti);
      router.push("/alimentazione/piatti");
      router.refresh();
    } catch {
      setError("Errore durante il salvataggio.");
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Nome</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Es. Pasta al pomodoro della mensa"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            Marca{" "}
            <span className="font-normal text-muted-foreground">
              (facoltativa)
            </span>
          </span>
          <input
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            placeholder="Es. Barilla"
            className={inputClass}
          />
        </label>
      </div>

      {/* Tipo di piatto */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Come sono definiti i valori</span>
        <TabBar
          items={TIPI}
          value={tipo}
          onChange={setTipo}
          label="Tipo di piatto"
        />
        <p className="text-xs text-muted-foreground">
          {tipo === "composto"
            ? "Il piatto è una ricetta: i valori si calcolano dagli ingredienti."
            : "Il piatto ha i suoi valori nutrizionali, presi da un'etichetta o già noti."}
        </p>
      </div>

      {tipo === "composto" ? (
        <>
          {/* Ingredienti */}
          <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b bg-muted px-4 py-2">
              <span className="text-sm font-semibold">Ingredienti</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(totali.kcal)} kcal · {Math.round(peso)} g
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
                      className="flex items-center gap-2 border-t px-2 py-2 text-sm first:border-t-0 sm:px-4"
                    >
                      <span className="min-w-0 flex-1 truncate pl-2">
                        {it.nome_alimento}
                      </span>
                      <NumberInput
                        value={String(it.quantita_g)}
                        onChange={(v) => setGrammi(idx, v)}
                        aria-label={`Grammi di ${it.nome_alimento}`}
                        className="w-20"
                      />
                      <span className="w-16 text-right text-muted-foreground">
                        {Math.round(v.kcal)} kcal
                      </span>
                      <IconButton
                        label={`Rimuovi ${it.nome_alimento}`}
                        tono="distruttivo"
                        onClick={() => rimuovi(idx)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Aggiungi ingrediente */}
          <div className="space-y-3 rounded-lg border p-4">
            <TabBar
              items={FONTI_INGREDIENTE}
              value={modoIngrediente}
              onChange={setModoIngrediente}
              label="Come aggiungere l'ingrediente"
            />

            {modoIngrediente === "cerca" ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={ricerca.q}
                    onChange={(e) => ricerca.setQ(e.target.value)}
                    placeholder="Cerca ingrediente…"
                    aria-label="Cerca ingrediente"
                    className={cn(inputClass, "w-full pl-9")}
                  />
                </div>
                {ricerca.risultati.length > 0 && (
                  <ul className="max-h-60 divide-y overflow-y-auto rounded-md border">
                    {ricerca.risultati.map((r, i) => (
                      <li key={`${r.fonte}-${i}-${r.nome}`}>
                        <button
                          onClick={() => aggiungiDaRicerca(r)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <span
                            className={cn(
                              "truncate",
                              r.fonte !== "piatto" &&
                                r.fonte !== "manuale" &&
                                "capitalize"
                            )}
                          >
                            {r.nome}
                          </span>
                          <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                            {Math.round(r.per100.kcal)} kcal/100g
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <RicercaFeedback
                  stato={ricerca.stato}
                  cercato={ricerca.cercato}
                  risultati={ricerca.risultati.length}
                  onRiprova={ricerca.riprova}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <input
                    value={mNome}
                    onChange={(e) => setMNome(e.target.value)}
                    placeholder="Nome"
                    aria-label="Nome dell'ingrediente"
                    className={cn(inputClass, "col-span-2 sm:col-span-3")}
                  />
                  <NumberField label="Grammi" value={mGrammi} onChange={setMGrammi} />
                  <NumberField label="kcal/100g" value={mKcal} onChange={setMKcal} />
                  <NumberField
                    label="Proteine/100g"
                    value={mPro}
                    onChange={setMPro}
                  />
                  <NumberField label="Carbo/100g" value={mCarb} onChange={setMCarb} />
                  <NumberField label="Grassi/100g" value={mGras} onChange={setMGras} />
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
        </>
      ) : (
        /* Valori diretti */
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">I valori che inserisco sono</span>
            <TabBar
              items={BASI}
              value={base}
              onChange={setBase}
              label="Base dei valori inseriti"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {NUTRIENTI.map((nu) => (
              <NumberField
                key={nu.value}
                label={`${nu.label} (${nu.unita})`}
                value={campi[nu.value]}
                onChange={(v) => setCampi((prev) => ({ ...prev, [nu.value]: v }))}
              />
            ))}
          </div>

          {base === "porzione" && (
            <p className="text-xs text-muted-foreground">
              {grammiPorzione > 0
                ? `Salvati come ${Math.round(per100.kcal)} kcal / 100 g (porzione di ${Math.round(grammiPorzione)} g).`
                : "Indica sotto quanti grammi pesa una porzione, altrimenti non è possibile convertire i valori."}
            </p>
          )}
        </div>
      )}

      {/* Porzione standard */}
      <div className="space-y-3 rounded-lg border p-4">
        <div>
          <span className="text-sm font-medium">Porzione standard</span>
          <p className="text-xs text-muted-foreground">
            Facoltativa: se la imposti puoi registrare il piatto per porzioni
            invece che in grammi.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground">
              Nome (es. piatto, fetta, barretta)
            </span>
            <input
              value={porzioneNome}
              onChange={(e) => setPorzioneNome(e.target.value)}
              placeholder="piatto"
              className={inputClass}
            />
          </label>
          <NumberField
            label="Peso di 1 porzione (g)"
            value={porzioneG}
            onChange={setPorzioneG}
          />
        </div>
        {tipo === "composto" && peso > 0 && (
          <button
            onClick={() => setPorzioneG(String(Math.round(peso)))}
            className="text-sm text-primary hover:underline"
          >
            usa il peso totale degli ingredienti ({Math.round(peso)} g)
          </button>
        )}
      </div>

      <div className="rounded-md bg-muted/40 p-3 text-sm">
        <span className="font-semibold">{Math.round(per100.kcal)} kcal / 100 g</span>{" "}
        <span className="text-muted-foreground">
          · P {per100.proteine.toFixed(1)} · C {per100.carboidrati.toFixed(1)} · G{" "}
          {per100.grassi.toFixed(1)}
          {grammiPorzione > 0
            ? ` · 1 ${porzioneNome.trim() || "porzione"} = ${Math.round(
                (per100.kcal * grammiPorzione) / 100
              )} kcal`
            : ""}
        </span>
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
