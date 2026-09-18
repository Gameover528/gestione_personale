"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deletePasto,
  deletePasti,
  ripristinaPasto,
  updatePasto,
  copiaGiorno,
  listPasti,
} from "../queries";
import {
  PASTI,
  NUTRIENTI,
  type PastoDiario,
  type Pasto,
  type Obiettivo,
  type Nutriente,
  da100,
  fmtQuantita,
  numeroPorzioni,
  valoriPorzione,
  sommaValori,
} from "../types";
import { AvvisoDati } from "./AvvisoDati";
import { ObiettiviForm } from "./ObiettiviForm";
import { useToast } from "@/core/components/Toast";
import { Modale } from "@/core/components/Modale";
import { IconButton, NumberInput, ToggleChip } from "@/core/components/controls";
import {
  Trash2,
  Plus,
  Pencil,
  Check,
  X,
  CopyPlus,
  ChevronLeft,
  ChevronRight,
  Search,
  ChefHat,
  PencilLine,
  Target,
} from "lucide-react";
import { cn, formatDate, parseNumero, spostaGiorno } from "@/lib/utils";

/**
 * I riquadri dei totali in cima al diario: le fibre non hanno piu' un riquadro
 * proprio perche' sono conteggiate dentro i carboidrati, come fanno le altre
 * app. Restano visibili per riga e nel calcolo degli obiettivi.
 */
const NUTRIENTI_TOTALI = NUTRIENTI.filter((n) => n.value !== "fibre");

function fmt(nutriente: Nutriente, v: number) {
  return nutriente === "kcal" ? String(Math.round(v)) : v.toFixed(1);
}

const giornoFmt = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function etichettaGiorno(giorno: string, oggi: string): string {
  if (giorno === oggi) return "Oggi";
  if (giorno === spostaGiorno(oggi, -1)) return "Ieri";
  if (giorno === spostaGiorno(oggi, 1)) return "Domani";
  return giornoFmt.format(new Date(`${giorno}T00:00:00Z`));
}

/** Rotta del diario per un certo giorno (oggi resta l'URL pulito). */
export function hrefDiario(giorno: string, oggi: string): string {
  return giorno === oggi ? "/alimentazione" : `/alimentazione?data=${giorno}`;
}

export function DiarioGiorno({
  giorno,
  oggi,
  pastiIniziali,
  obiettiviIniziali,
}: {
  giorno: string;
  oggi: string;
  pastiIniziali: PastoDiario[];
  obiettiviIniziali: Obiettivo[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [inCorso, startTransition] = useTransition();

  // I pasti arrivano dal server. La copia locale serve solo per aggiornare
  // subito la lista dopo un'eliminazione, prima che il server risponda.
  const [pasti, setPasti] = useState<PastoDiario[]>(pastiIniziali);
  useEffect(() => {
    setPasti(pastiIniziali);
  }, [pastiIniziali]);

  const obiettivi = obiettiviIniziali;
  const totali = sommaValori(pasti.map(valoriPorzione));

  /** Cambia giorno passando dall'URL, così il giorno non si perde più. */
  function vaiAlGiorno(nuovo: string) {
    startTransition(() => {
      router.push(hrefDiario(nuovo, oggi), { scroll: false });
    });
  }

  async function handleDelete(r: PastoDiario) {
    setPasti((prev) => prev.filter((x) => x.id !== r.id));
    try {
      await deletePasto(r.id);
      toast({
        messaggio: `"${r.nome_alimento}" eliminato`,
        azione: {
          label: "Annulla",
          onClick: async () => {
            await ripristinaPasto(r);
          },
        },
      });
    } catch {
      toast({ messaggio: "Errore durante l'eliminazione.", tono: "errore" });
      router.refresh();
    }
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editG, setEditG] = useState("");
  const [editPasto, setEditPasto] = useState<Pasto>("pranzo");

  function startEdit(r: PastoDiario) {
    setEditingId(r.id);
    setEditG(String(r.quantita_g));
    setEditPasto(r.pasto);
  }
  async function saveEdit() {
    if (!editingId) return;
    await updatePasto(editingId, {
      quantita_g: parseNumero(editG),
      pasto: editPasto,
    });
    setEditingId(null);
  }

  function obiettivo(n: Nutriente) {
    return obiettivi.find((o) => o.nutriente === n);
  }

  const [obiettiviAperti, setObiettiviAperti] = useState(false);

  // ---- Copia da un altro giorno ----
  const [copiaAperta, setCopiaAperta] = useState(false);
  const [copiaDa, setCopiaDa] = useState(spostaGiorno(giorno, -1));
  const [copiaPasti, setCopiaPasti] = useState<Pasto[]>(PASTI.map((p) => p.value));
  const [copiando, setCopiando] = useState(false);
  /** Cosa c'è nel giorno scelto: `null` finché non è stato letto. */
  const [origine, setOrigine] = useState<PastoDiario[] | null>(null);

  function apriCopia() {
    setCopiaDa(spostaGiorno(giorno, -1));
    setCopiaPasti(PASTI.map((p) => p.value));
    setOrigine(null);
    setCopiaAperta(true);
  }

  /**
   * Legge il giorno di partenza per farlo vedere prima di copiarlo.
   *
   * Senza, l'unico modo di sapere cosa si stava portando via era premere
   * "Copia" e guardare il risultato: se il giorno era quello sbagliato restava
   * da disfare a mano. `annullato` evita che una risposta lenta sovrascriva
   * quella di una data scelta dopo.
   */
  useEffect(() => {
    if (!copiaAperta || copiaDa === giorno) {
      setOrigine(null);
      return;
    }
    let annullato = false;
    setOrigine(null);
    listPasti(copiaDa)
      .then((righe) => {
        if (!annullato) setOrigine(righe);
      })
      .catch(() => {
        if (!annullato) setOrigine([]);
      });
    return () => {
      annullato = true;
    };
  }, [copiaAperta, copiaDa, giorno]);

  /** Le righe che finirebbero davvero nel giorno corrente. */
  const daCopiare = (origine ?? []).filter((r) => copiaPasti.includes(r.pasto));

  function togglePastoCopia(p: Pasto) {
    setCopiaPasti((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function eseguiCopia() {
    setCopiando(true);
    try {
      const ids = await copiaGiorno(copiaDa, giorno, copiaPasti);
      if (ids.length === 0) {
        toast({
          messaggio: "Nessuna riga da copiare per i pasti scelti.",
          tono: "errore",
        });
        return;
      }
      setCopiaAperta(false);
      toast({
        messaggio:
          ids.length === 1 ? "Copiata 1 riga." : `Copiate ${ids.length} righe.`,
        azione: {
          label: "Annulla",
          onClick: async () => {
            await deletePasti(ids);
          },
        },
      });
    } catch {
      toast({ messaggio: "Errore durante la copia.", tono: "errore" });
    } finally {
      setCopiando(false);
    }
  }

  const hrefAggiungi = (pasto?: Pasto) =>
    `/alimentazione/aggiungi?data=${giorno}${pasto ? `&pasto=${pasto}` : ""}`;

  return (
    <div className={cn("space-y-6 pb-24 sm:pb-0", inCorso && "opacity-60")}>
      {/* Giorno mostrato: frecce e "Oggi" evitano di aprire il calendario */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconButton
            label="Giorno precedente"
            onClick={() => vaiAlGiorno(spostaGiorno(giorno, -1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </IconButton>
          <div className="text-center">
            <p className="text-sm font-semibold capitalize">
              {etichettaGiorno(giorno, oggi)}
            </p>
            <input
              type="date"
              value={giorno}
              onChange={(e) => vaiAlGiorno(e.target.value || oggi)}
              aria-label="Scegli il giorno"
              className="rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <IconButton
            label="Giorno successivo"
            onClick={() => vaiAlGiorno(spostaGiorno(giorno, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </IconButton>
          {giorno !== oggi && (
            <button
              onClick={() => vaiAlGiorno(oggi)}
              className="rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-accent"
            >
              Oggi
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={apriCopia}
            aria-expanded={copiaAperta}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-accent"
          >
            <CopyPlus className="h-4 w-4" />
            Copia giorno
          </button>
          {/*
            Qui restano le azioni, non la navigazione: "Andamento" e' una voce
            della barra in basso (su telefono) e del menu (su schermo grande),
            e ripeterla qui rubava una riga proprio alla pagina che si apre
            piu' spesso. "Obiettivi" invece non sta in nessuno dei due.

            Si apre in una finestra e non piu' come pagina a se': sistemare un
            obiettivo e' una parentesi di dieci secondi, e prima costava
            perdere il giorno che si stava guardando e tornare indietro.
            L'indirizzo /alimentazione/obiettivi resta valido per chi ce l'ha.
          */}
          <button
            onClick={() => setObiettiviAperti(true)}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-accent"
          >
            <Target className="h-4 w-4" />
            Obiettivi
          </button>
          <Link
            href={hrefAggiungi()}
            /* Solo da lg: sotto, l'azione e' il "+" al centro della barra. */
            className="hidden items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 lg:inline-flex"
          >
            <Plus className="h-4 w-4" />
            Aggiungi
          </Link>
        </div>
      </div>

      {/* Copia i pasti di un altro giorno in quello corrente */}
      {copiaAperta && (
        <Modale
          titolo="Copia un altro giorno"
          sottotitolo={`Le righe scelte vengono aggiunte a ${formatDate(giorno)}.`}
          icona={CopyPlus}
          onChiudi={() => setCopiaAperta(false)}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Giorno da cui copiare</span>
                <input
                  type="date"
                  value={copiaDa}
                  onChange={(e) => setCopiaDa(e.target.value)}
                  className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <button
                onClick={() => setCopiaDa(spostaGiorno(giorno, -1))}
                className="mt-6 text-sm text-primary hover:underline"
              >
                il giorno prima
              </button>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Quali pasti</p>
              <div className="flex flex-wrap gap-2">
                {PASTI.map((p) => (
                  <ToggleChip
                    key={p.value}
                    attivo={copiaPasti.includes(p.value)}
                    onClick={() => togglePastoCopia(p.value)}
                  >
                    {p.label}
                  </ToggleChip>
                ))}
              </div>
            </div>

            {/*
              Cosa si sta portando via, prima di portarlo via: senza questo
              elenco l'unico modo di accorgersi di aver scelto il giorno
              sbagliato era copiare e poi disfare.
            */}
            <AnteprimaCopia
              giorno={copiaDa}
              uguale={copiaDa === giorno}
              origine={origine}
              righe={daCopiare}
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={eseguiCopia}
                disabled={copiando || daCopiare.length === 0}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {copiando
                  ? "Copia…"
                  : daCopiare.length === 1
                    ? "Copia 1 voce"
                    : `Copia ${daCopiare.length} voci`}
              </button>
              <button
                onClick={() => setCopiaAperta(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-accent"
              >
                Annulla
              </button>
            </div>
          </div>
        </Modale>
      )}

      {obiettiviAperti && (
        <Modale
          titolo="Obiettivi nutrizionali"
          icona={Target}
          onChiudi={() => setObiettiviAperti(false)}
        >
          {/*
            `embedded` toglie il pulsante "Indietro", che qui non ha senso, ed
            e' lo stesso modo in cui il form e' gia' incastonato nelle
            preferenze dei moduli. I valori se li legge da solo.
          */}
          <ObiettiviForm embedded />
        </Modale>
      )}

      {/* Totali del giorno vs obiettivi */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {NUTRIENTI_TOTALI.map((nu) => {
          // I carboidrati in cima comprendono le fibre: e' la convenzione
          // americana, quella che usano le altre app di conteggio, e serve a
          // poter confrontare i numeri. Le etichette europee invece dichiarano
          // i carboidrati al netto delle fibre, ed e' quello che arriva da Open
          // Food Facts: e' la ragione per cui lo stesso pasto risultava avere
          // meno carboidrati qui che altrove.
          const tot =
            nu.value === "carboidrati"
              ? totali.carboidrati + totali.fibre
              : totali[nu.value];
          const ob = obiettivo(nu.value);
          let stato: "ok" | "over" | "under" | "none" = "none";
          if (ob && ob.valore > 0) {
            if (ob.tipo === "max") stato = tot <= ob.valore ? "ok" : "over";
            else stato = tot >= ob.valore ? "ok" : "under";
          }
          return (
            <div
              key={nu.value}
              className={cn(
                "rounded-lg border p-3",
                stato === "over" && "border-destructive/40 bg-destructive/5",
                stato === "ok" && "border-success/40 bg-success/5"
              )}
            >
              <p className="text-xs text-muted-foreground">{nu.label}</p>
              <p className="text-lg font-semibold">
                {fmt(nu.value, tot)}
                <span className="text-xs font-normal text-muted-foreground">
                  {" "}
                  {nu.unita}
                </span>
              </p>
              {ob && ob.valore > 0 && (
                <p className="text-xs text-muted-foreground">
                  {ob.tipo === "max" ? "max" : "min"} {fmt(nu.value, ob.valore)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Pasti raggruppati */}
      {pasti.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nessun alimento registrato per{" "}
            {etichettaGiorno(giorno, oggi).toLowerCase()}. Puoi aggiungerne uno
            in tre modi:
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href={`${hrefAggiungi()}&tab=cerca`}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-accent"
            >
              <Search className="h-4 w-4" />
              Cerca un alimento
            </Link>
            <Link
              href={`${hrefAggiungi()}&tab=piatti`}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-accent"
            >
              <ChefHat className="h-4 w-4" />
              Scegli un tuo piatto
            </Link>
            {/* `nuovo=1` apre subito la finestra per crearne uno a mano. */}
            <Link
              href={`${hrefAggiungi()}&nuovo=1`}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-accent"
            >
              <PencilLine className="h-4 w-4" />
              Inseriscilo a mano
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Oppure usa <strong>Copia giorno</strong> se hai mangiato come un
            altro giorno.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {PASTI.map((p) => {
            const righe = pasti.filter((x) => x.pasto === p.value);
            if (righe.length === 0) return null;
            const totPasto = sommaValori(righe.map(valoriPorzione));
            // `overflow-hidden` non e' decorazione: l'intestazione grigia qui
            // sotto e' un rettangolo squadrato appoggiato dentro un riquadro
            // con gli angoli tondi, e senza ritaglio dipinge sopra gli angoli
            // facendoli sembrare sporgenti. Vale anche per l'ultima riga in
            // basso, che oggi non si vede solo perche' non ha sfondo.
            return (
              <div key={p.value} className="overflow-hidden rounded-lg border">
                <div className="flex items-center justify-between border-b bg-muted px-4 py-2">
                  <span className="text-sm font-semibold">{p.label}</span>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    {Math.round(totPasto.kcal)} kcal
                    <Link
                      href={hrefAggiungi(p.value)}
                      aria-label={`Aggiungi a ${p.label.toLowerCase()}`}
                      title={`Aggiungi a ${p.label.toLowerCase()}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-accent hover:text-foreground"
                    >
                      <Plus className="h-4 w-4" />
                    </Link>
                  </span>
                </div>
                <ul>
                  {righe.map((r) => {
                    const v = valoriPorzione(r);
                    const inEdit = editingId === r.id;
                    const porzioni = numeroPorzioni(r);
                    return (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-3 border-t px-2 py-1 text-sm first:border-t-0 sm:px-4 sm:py-2"
                      >
                        <div className="min-w-0 flex-1 pl-2">
                          <p className="flex items-center gap-1.5 truncate font-medium">
                            {/* Vale anche per le righe registrate prima che
                                questi controlli esistessero: il controllo si
                                rifà a ogni lettura, non è un campo salvato. */}
                            <AvvisoDati valori={da100(r)} />
                            <span className="truncate">
                              {r.nome_alimento}
                              {r.marca ? (
                                <span className="text-muted-foreground">
                                  {" "}
                                  · {r.marca}
                                </span>
                              ) : null}
                            </span>
                          </p>
                          {inEdit ? (
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <NumberInput
                                value={editG}
                                onChange={setEditG}
                                aria-label="Quantità in grammi"
                                className="w-24 py-1"
                              />
                              <span className="text-xs text-muted-foreground">
                                g
                                {porzioni > 0 && r.porzione_g
                                  ? ` (1 ${r.porzione_nome ?? "porzione"} = ${Math.round(r.porzione_g)} g)`
                                  : ""}
                              </span>
                              <select
                                value={editPasto}
                                onChange={(e) =>
                                  setEditPasto(e.target.value as Pasto)
                                }
                                aria-label="Pasto"
                                className="rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
                              >
                                {PASTI.map((pp) => (
                                  <option key={pp.value} value={pp.value}>
                                    {pp.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {fmtQuantita(r)} · {Math.round(v.kcal)} kcal · P{" "}
                              {v.proteine.toFixed(1)} · C {v.carboidrati.toFixed(1)}{" "}
                              · G {v.grassi.toFixed(1)}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center">
                          {inEdit ? (
                            <>
                              <IconButton label="Salva" onClick={saveEdit}>
                                <Check className="h-5 w-5" />
                              </IconButton>
                              <IconButton
                                label="Annulla modifica"
                                onClick={() => setEditingId(null)}
                              >
                                <X className="h-5 w-5" />
                              </IconButton>
                            </>
                          ) : (
                            <>
                              <IconButton
                                label={`Modifica ${r.nome_alimento}`}
                                onClick={() => startEdit(r)}
                              >
                                <Pencil className="h-5 w-5" />
                              </IconButton>
                              <IconButton
                                label={`Elimina ${r.nome_alimento}`}
                                tono="distruttivo"
                                onClick={() => handleDelete(r)}
                              >
                                <Trash2 className="h-5 w-5" />
                              </IconButton>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/*
        Su telefono l'azione principale e' il "+" al centro della barra in
        basso: un pulsante flottante qui gli finirebbe sopra.
      */}
    </div>
  );
}

/**
 * L'elenco di quello che la copia porterebbe via.
 *
 * Distingue i tre casi che sembrano uguali e non lo sono: sto ancora leggendo,
 * quel giorno e' vuoto, oppure i pasti che hai spuntato non contengono niente.
 * Dire "nessuna riga" in tutti e tre lascerebbe a indovinare quale sia.
 */
function AnteprimaCopia({
  giorno,
  uguale,
  origine,
  righe,
}: {
  giorno: string;
  uguale: boolean;
  origine: PastoDiario[] | null;
  righe: PastoDiario[];
}) {
  const cornice = "rounded-md border bg-muted/40 p-3 text-sm";

  if (uguale) {
    return (
      <p className={cn(cornice, "text-muted-foreground")}>
        Scegli un giorno diverso da quello che stai guardando.
      </p>
    );
  }
  if (origine === null) {
    return (
      <p className={cn(cornice, "text-muted-foreground")}>
        Leggo il {formatDate(giorno)}…
      </p>
    );
  }
  if (origine.length === 0) {
    return (
      <p className={cn(cornice, "text-muted-foreground")}>
        Il {formatDate(giorno)} non ha niente di segnato.
      </p>
    );
  }
  if (righe.length === 0) {
    return (
      <p className={cn(cornice, "text-muted-foreground")}>
        Nei pasti scelti non c&apos;è niente. Prova a spuntarne altri.
      </p>
    );
  }

  const totale = sommaValori(righe.map(valoriPorzione));

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex items-center justify-between border-b bg-muted px-3 py-2 text-sm">
        <span className="font-medium">Verrà copiato</span>
        <span className="text-muted-foreground">
          {Math.round(totale.kcal)} kcal
        </span>
      </div>
      {/* Oltre una certa lunghezza scorre: la finestra non deve allungarsi
          all'infinito su un giorno pieno. */}
      <ul className="max-h-48 divide-y overflow-y-auto">
        {PASTI.filter((p) => righe.some((r) => r.pasto === p.value)).map((p) => (
          <li key={p.value} className="px-3 py-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {p.label}
            </p>
            <ul className="mt-1 space-y-0.5">
              {righe
                .filter((r) => r.pasto === p.value)
                .map((r) => (
                  <li
                    key={r.id}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate">{r.nome_alimento}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {fmtQuantita(r)}
                    </span>
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
