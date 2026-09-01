"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addPasto,
  createPiatto,
  listRecenti,
  trovaPastoEsistente,
  updatePasto,
} from "../queries";
import {
  NUTRIENTI,
  PASTI,
  a100,
  fonteLabel,
  fmtQuantita,
  pastoSuggerito,
  piattoComeAlimento,
  pluralePorzione,
  type AlimentoRicerca,
  type Nutriente,
  type Pasto,
  type PastoDiario,
  type PiattoConValori,
  type ValoriNutrizionali,
} from "../types";
import {
  NumberField,
  NumberInput,
  TabBar,
  inputClass,
} from "@/core/components/controls";
import { useRicercaAlimenti } from "./useRicercaAlimenti";
import { RicercaFeedback } from "./RicercaFeedback";
import { Search, Plus, Check } from "lucide-react";
import { cn, parseNumero } from "@/lib/utils";

type Modo = "recenti" | "cerca" | "piatti" | "manuale";

const TABS: { value: Modo; label: string }[] = [
  { value: "recenti", label: "Recenti" },
  { value: "cerca", label: "Cerca" },
  { value: "piatti", label: "I miei piatti" },
  { value: "manuale", label: "A mano" },
];

const MODI: Modo[] = ["recenti", "cerca", "piatti", "manuale"];

type Esito = "ok" | "duplicato" | "errore";

interface Duplicato {
  riga: PastoDiario;
  alimento: AlimentoRicerca;
  grammi: number;
  conPorzione: boolean;
  /** Se l'alimento va anche salvato tra i piatti una volta risolto il doppione. */
  salvaPiatto: boolean;
}

export function RicercaAggiungi({
  recentiIniziali,
  piattiIniziali,
}: {
  recentiIniziali: AlimentoRicerca[];
  piattiIniziali: PiattoConValori[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const oggi = new Date().toISOString().slice(0, 10);

  const [data, setData] = useState(params.get("data") || oggi);
  const [pasto, setPasto] = useState<Pasto>(() => {
    const p = params.get("pasto") as Pasto | null;
    return p && PASTI.some((x) => x.value === p) ? p : pastoSuggerito();
  });

  const [modo, setModo] = useState<Modo>(() => {
    const t = params.get("tab") as Modo | null;
    if (t && MODI.includes(t)) return t;
    return recentiIniziali.length > 0 ? "recenti" : "cerca";
  });

  const [recenti, setRecenti] = useState(recentiIniziali);

  // Ricerca in due fasi (piatti miei subito, fonti esterne dopo): la logica
  // sta nell'hook, condivisa con l'editor dei piatti.
  const ricerca = useRicercaAlimenti();

  const [sel, setSel] = useState<AlimentoRicerca | null>(null);
  /**
   * Vero solo per un alimento appena scritto a mano in questa schermata: le
   * righe di diario riproposte tra i recenti hanno anch'esse fonte "manuale",
   * ma sono già nell'archivio e non vanno risalvate come nuovo piatto.
   */
  const [manualeNuovo, setManualeNuovo] = useState(false);
  const [salvaComePiatto, setSalvaComePiatto] = useState(true);
  const piattoSalvato = useRef(false);
  const [unita, setUnita] = useState<"g" | "porzioni">("g");
  const [quantita, setQuantita] = useState("100");
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aggiunti, setAggiunti] = useState<string[]>([]);
  const [duplicato, setDuplicato] = useState<Duplicato | null>(null);

  function cambiaTab(m: Modo) {
    setModo(m);
    setSel(null);
    setError(null);
    setDuplicato(null);
  }

  /** Prepara il form di dettaglio per l'alimento scelto. */
  function seleziona(a: AlimentoRicerca, appenaScrittoAMano = false) {
    setSel(a);
    setError(null);
    setDuplicato(null);
    setManualeNuovo(appenaScrittoAMano);
    piattoSalvato.current = false;
    const porzione = Number(a.porzione_g ?? 0);
    const perPorzioni = porzione > 0;
    setUnita(perPorzioni ? "porzioni" : "g");
    setQuantita(
      perPorzioni
        ? arrotonda(Number(a.quantita_default_g ?? porzione) / porzione)
        : arrotonda(Number(a.quantita_default_g ?? 100))
    );
  }

  const porzioneG = Number(sel?.porzione_g ?? 0);
  const valoreQuantita = parseNumero(quantita);
  const grammi =
    unita === "porzioni" && porzioneG > 0
      ? valoreQuantita * porzioneG
      : valoreQuantita;
  const f = grammi / 100;

  /** Cambia unita' mantenendo la stessa quantita' reale in grammi. */
  function convertiUnita(nuova: "g" | "porzioni") {
    if (nuova === unita || porzioneG <= 0) return;
    setQuantita(nuova === "g" ? arrotonda(grammi) : arrotonda(grammi / porzioneG));
    setUnita(nuova);
  }

  /**
   * Salva l'alimento tra i piatti, se richiesto. Il "se richiesto" arriva come
   * parametro e non dallo stato: dentro la stessa azione lo stato non è ancora
   * aggiornato, e un errore qui creerebbe piatti doppi.
   */
  async function salvaPiattoSeServe(a: AlimentoRicerca, richiesto: boolean) {
    if (!richiesto || piattoSalvato.current) return;
    piattoSalvato.current = true;
    await createPiatto(
      {
        nome: a.nome,
        marca: a.marca || null,
        tipo: "diretto",
        valori100: a.per100,
        porzione_nome: a.porzione_nome ?? null,
        porzione_g: a.porzione_g ?? null,
      },
      []
    );
  }

  /**
   * Inserisce una riga di diario. Se lo stesso alimento è già nel pasto
   * e non si è chiesto di forzare, non inserisce nulla e segnala il doppione:
   * decide l'utente se sommare le quantità o tenere due righe separate.
   */
  async function inserisci(
    a: AlimentoRicerca,
    quantita_g: number,
    conPorzione: boolean,
    forzato: boolean,
    salvaPiatto: boolean
  ): Promise<Esito> {
    if (!(quantita_g > 0)) {
      setError("Indica una quantita' maggiore di zero.");
      return "errore";
    }
    if (!forzato) {
      const esistente = await trovaPastoEsistente(
        data,
        pasto,
        a.nome,
        a.marca || null
      );
      if (esistente) {
        setDuplicato({
          riga: esistente,
          alimento: a,
          grammi: quantita_g,
          conPorzione,
          salvaPiatto,
        });
        return "duplicato";
      }
    }
    const usaPorzione = conPorzione && Number(a.porzione_g ?? 0) > 0;
    await addPasto({
      data,
      pasto,
      nome_alimento: a.nome,
      marca: a.marca || null,
      quantita_g,
      porzione_nome: usaPorzione ? a.porzione_nome ?? "porzione" : null,
      porzione_g: usaPorzione ? Number(a.porzione_g) : null,
      ...a100(a.per100),
      fonte: a.fonte,
    });
    await salvaPiattoSeServe(a, salvaPiatto);
    setAggiunti((prev) => [...prev, a.nome]);
    return "ok";
  }

  /** Aggiunta in un tap dalla lista dei recenti, con l'ultima quantita' usata. */
  async function aggiuntaRapida(a: AlimentoRicerca) {
    setSalvando(true);
    setError(null);
    try {
      const g = Number(a.quantita_default_g ?? a.porzione_g ?? 100);
      // Un recente è già nell'archivio: non va risalvato come nuovo piatto.
      const esito = await inserisci(a, g, true, false, false);
      if (esito === "ok") {
        listRecenti().then(setRecenti);
        router.refresh();
      }
    } catch {
      setError("Errore durante il salvataggio.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleSave() {
    if (!sel) return;
    setSalvando(true);
    setError(null);
    try {
      const esito = await inserisci(
        sel,
        grammi,
        unita === "porzioni",
        false,
        manualeNuovo && salvaComePiatto
      );
      if (esito !== "ok") {
        setSalvando(false);
        return;
      }
      router.push("/alimentazione");
      router.refresh();
    } catch {
      setError("Errore durante il salvataggio.");
      setSalvando(false);
    }
  }

  // ---- Risoluzione del doppione ----
  async function sommaAlDuplicato() {
    if (!duplicato) return;
    setSalvando(true);
    try {
      await updatePasto(duplicato.riga.id, {
        quantita_g: Number(duplicato.riga.quantita_g) + duplicato.grammi,
      });
      await salvaPiattoSeServe(duplicato.alimento, duplicato.salvaPiatto);
      setAggiunti((prev) => [...prev, duplicato.alimento.nome]);
      setDuplicato(null);
      setSel(null);
      listRecenti().then(setRecenti);
      router.refresh();
    } catch {
      setError("Errore durante il salvataggio.");
    } finally {
      setSalvando(false);
    }
  }

  async function aggiungiComunque() {
    if (!duplicato) return;
    setSalvando(true);
    try {
      await inserisci(
        duplicato.alimento,
        duplicato.grammi,
        duplicato.conPorzione,
        true,
        duplicato.salvaPiatto
      );
      setDuplicato(null);
      setSel(null);
      listRecenti().then(setRecenti);
      router.refresh();
    } catch {
      setError("Errore durante il salvataggio.");
    } finally {
      setSalvando(false);
    }
  }


  return (
    <div className="max-w-2xl space-y-5">
      {/* Dove finisce quello che aggiungo: sempre visibile */}
      <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Giorno</span>
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
      </div>

      {aggiunti.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-success/40 bg-success/5 px-3 py-2 text-sm">
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            Aggiunti: {aggiunti.join(", ")}
          </span>
          <button
            onClick={() => {
              router.push("/alimentazione");
              router.refresh();
            }}
            className="font-medium text-primary hover:underline"
          >
            vai al diario
          </button>
        </div>
      )}

      {/* Doppione: sommare o tenere due righe? */}
      {duplicato && (
        <div className="space-y-3 rounded-lg border border-warning/50 bg-warning/5 p-4">
          <p className="text-sm">
            <strong>{duplicato.alimento.nome}</strong> è già in{" "}
            {PASTI.find((p) => p.value === pasto)?.label.toLowerCase()} di questo
            giorno: {fmtQuantita(duplicato.riga)}.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={sommaAlDuplicato}
              disabled={salvando}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              Somma: {Math.round(Number(duplicato.riga.quantita_g))} +{" "}
              {Math.round(duplicato.grammi)} ={" "}
              {Math.round(Number(duplicato.riga.quantita_g) + duplicato.grammi)} g
            </button>
            <button
              onClick={aggiungiComunque}
              disabled={salvando}
              className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
            >
              Aggiungi una riga a parte
            </button>
            <button
              onClick={() => setDuplicato(null)}
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent"
            >
              Lascia stare
            </button>
          </div>
        </div>
      )}

      <TabBar
        items={TABS}
        value={modo}
        onChange={cambiaTab}
        label="Come aggiungere l'alimento"
      />

      {modo === "recenti" && !sel && (
        <>
          {recenti.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Niente di recente: cerca un alimento o inseriscilo a mano.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {recenti.map((r, i) => (
                <li key={i} className="flex items-center gap-2">
                  <button
                    onClick={() => seleziona(r)}
                    className="min-w-0 flex-1 px-4 py-3 text-left text-sm hover:bg-accent"
                  >
                    <RigaAlimento a={r} ultimaVolta />
                  </button>
                  <button
                    onClick={() => aggiuntaRapida(r)}
                    disabled={salvando}
                    aria-label={`Aggiungi ${r.nome} con l'ultima quantità usata`}
                    title="Aggiungi con l'ultima quantita' usata"
                    className="mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {modo === "cerca" && !sel && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (ricerca.q.trim().length >= 2) ricerca.cerca(ricerca.q.trim());
            }}
            role="search"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={ricerca.q}
                onChange={(e) => ricerca.setQ(e.target.value)}
                placeholder="Cerca un alimento (es. latte, pasta, pollo)…"
                aria-label="Cerca un alimento"
                className={cn(inputClass, "w-full pl-9")}
              />
            </div>
          </form>
          <p className="text-xs text-muted-foreground">
            I tuoi piatti salvati compaiono per primi, subito; gli alimenti di
            Open Food Facts e USDA arrivano un attimo dopo.
          </p>

          {ricerca.risultati.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {ricerca.risultati.map((r, i) => (
                <li key={`${r.fonte}-${i}-${r.nome}`}>
                  <button
                    onClick={() => seleziona(r)}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-accent"
                  >
                    <RigaAlimento a={r} />
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
        </>
      )}

      {modo === "piatti" && !sel && (
        <>
          {piattiIniziali.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun piatto salvato. Creane uno nella sezione Piatti.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {piattiIniziali.map((p) => {
                const a = piattoComeAlimento(p);
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => seleziona(a)}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-accent"
                    >
                      <RigaAlimento a={a} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {modo === "manuale" && !sel && (
        <FormManuale
          onContinua={(a) => {
            seleziona(a, true);
            setSalvaComePiatto(true);
          }}
        />
      )}

      {sel && (
        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <p
              className={cn(
                "font-medium",
                sel.fonte !== "piatto" && sel.fonte !== "manuale" && "capitalize"
              )}
            >
              {sel.nome}
              {sel.marca ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {sel.marca}
                </span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.round(sel.per100.kcal)} kcal / 100 g · {fonteLabel(sel.fonte)}
            </p>
            <button
              onClick={() => setSel(null)}
              className="mt-1 text-sm text-primary hover:underline"
            >
              ← indietro
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Quantita&apos;</span>
              <NumberInput
                value={quantita}
                onChange={setQuantita}
                className="w-28"
              />
            </label>
            {porzioneG > 0 ? (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Unita&apos;</span>
                <TabBar
                  label="Unità di misura"
                  value={unita}
                  onChange={convertiUnita}
                  items={[
                    {
                      value: "porzioni",
                      label: `${pluralePorzione(sel.porzione_nome?.trim() || "porzione", 2)} da ${Math.round(porzioneG)} g`,
                    },
                    { value: "g", label: "grammi" },
                  ]}
                />
              </div>
            ) : (
              <span className="pb-2 text-sm text-muted-foreground">grammi</span>
            )}
          </div>

          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <span className="font-semibold">
              {Math.round(sel.per100.kcal * f)} kcal
            </span>{" "}
            <span className="text-muted-foreground">
              · {Math.round(grammi)} g · P {(sel.per100.proteine * f).toFixed(1)} g ·
              C {(sel.per100.carboidrati * f).toFixed(1)} g · G{" "}
              {(sel.per100.grassi * f).toFixed(1)} g
            </span>
          </div>

          {manualeNuovo && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={salvaComePiatto}
                onChange={(e) => setSalvaComePiatto(e.target.checked)}
                className="h-4 w-4"
              />
              Salva anche tra i miei piatti, per riusarlo
            </label>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={salvando || !(grammi > 0)}
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

function arrotonda(v: number): string {
  if (!Number.isFinite(v)) return "0";
  return String(Math.round(v * 100) / 100);
}

function RigaAlimento({
  a,
  ultimaVolta = false,
}: {
  a: AlimentoRicerca;
  /** Nella lista dei recenti la quantita' proposta e' quella usata l'ultima volta. */
  ultimaVolta?: boolean;
}) {
  const porzione = Number(a.porzione_g ?? 0);
  const dettaglio =
    ultimaVolta && a.quantita_default_g
      ? `ultima volta ${quantitaLeggibile(a, Number(a.quantita_default_g))}`
      : porzione > 0
        ? `1 ${a.porzione_nome?.trim() || "porzione"} = ${Math.round(porzione)} g`
        : "";
  return (
    <>
      <span
        className={cn(
          "block truncate font-medium",
          // I nomi delle fonti esterne arrivano in minuscolo; quelli scritti
          // dall'utente vanno lasciati come li ha scritti.
          a.fonte !== "piatto" && a.fonte !== "manuale" && "capitalize"
        )}
      >
        {a.nome}
        {a.marca ? (
          <span className="font-normal text-muted-foreground"> · {a.marca}</span>
        ) : null}
      </span>
      <span className="text-xs text-muted-foreground">
        {Math.round(a.per100.kcal)} kcal / 100 g · {fonteLabel(a.fonte)}
        {dettaglio ? ` · ${dettaglio}` : ""}
      </span>
    </>
  );
}

/** "1,5 piatto (525 g)" se c'e' una porzione, altrimenti "525 g". */
function quantitaLeggibile(a: AlimentoRicerca, grammi: number): string {
  const porzione = Number(a.porzione_g ?? 0);
  if (porzione <= 0) return `${Math.round(grammi)} g`;
  const n = Math.round((grammi / porzione) * 10) / 10;
  const nome = pluralePorzione(a.porzione_nome?.trim() || "porzione", n);
  return `${String(n).replace(".", ",")} ${nome} (${Math.round(grammi)} g)`;
}

/** Inserimento di un alimento non presente in nessun archivio. */
function FormManuale({
  onContinua,
}: {
  onContinua: (a: AlimentoRicerca) => void;
}) {
  const [nome, setNome] = useState("");
  const [marca, setMarca] = useState("");
  const [porzioneNome, setPorzioneNome] = useState("");
  const [porzioneG, setPorzioneG] = useState("");
  const [campi, setCampi] = useState<Record<Nutriente, string>>({
    kcal: "",
    proteine: "",
    carboidrati: "",
    grassi: "",
    fibre: "",
    zuccheri: "",
    sale: "",
  });
  const [errore, setErrore] = useState<string | null>(null);

  function continua() {
    if (!nome.trim()) {
      setErrore("Indica il nome dell'alimento.");
      return;
    }
    const per100: ValoriNutrizionali = {
      kcal: parseNumero(campi.kcal),
      proteine: parseNumero(campi.proteine),
      carboidrati: parseNumero(campi.carboidrati),
      grassi: parseNumero(campi.grassi),
      fibre: parseNumero(campi.fibre),
      zuccheri: parseNumero(campi.zuccheri),
      sale: parseNumero(campi.sale),
    };
    if (per100.kcal <= 0) {
      setErrore("Indica almeno le calorie per 100 g.");
      return;
    }
    const g = parseNumero(porzioneG);
    onContinua({
      nome: nome.trim(),
      marca: marca.trim(),
      fonte: "manuale",
      per100,
      porzione_nome: g > 0 ? porzioneNome.trim() || "porzione" : null,
      porzione_g: g > 0 ? g : null,
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">
        Valori <span className="font-medium">per 100 g</span>, come sulle
        etichette.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome"
          aria-label="Nome dell'alimento"
          className={inputClass}
        />
        <input
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
          placeholder="Marca (facoltativa)"
          aria-label="Marca"
          className={inputClass}
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-muted-foreground">
            Porzione (facoltativa): nome
          </span>
          <input
            value={porzioneNome}
            onChange={(e) => setPorzioneNome(e.target.value)}
            placeholder="fetta, barretta, piatto…"
            className={inputClass}
          />
        </label>
        <NumberField
          label="Peso porzione (g)"
          value={porzioneG}
          onChange={setPorzioneG}
        />
      </div>
      {errore && <p className="text-sm text-destructive">{errore}</p>}
      <button
        onClick={continua}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
      >
        Continua
      </button>
    </div>
  );
}
