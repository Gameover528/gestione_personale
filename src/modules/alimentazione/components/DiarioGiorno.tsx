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
} from "../queries";
import {
  PASTI,
  NUTRIENTI,
  type PastoDiario,
  type Pasto,
  type Obiettivo,
  type Nutriente,
  fmtQuantita,
  numeroPorzioni,
  valoriPorzione,
  sommaValori,
} from "../types";
import { useToast } from "@/core/components/Toast";
import { IconButton, NumberInput, ToggleChip } from "@/core/components/controls";
import {
  Trash2,
  Plus,
  Pencil,
  Check,
  X,
  CopyPlus,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Search,
  ChefHat,
  PencilLine,
} from "lucide-react";
import { cn, formatDate, parseNumero, spostaGiorno } from "@/lib/utils";

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

  // ---- Copia da un altro giorno ----
  const [copiaAperta, setCopiaAperta] = useState(false);
  const [copiaDa, setCopiaDa] = useState(spostaGiorno(giorno, -1));
  const [copiaPasti, setCopiaPasti] = useState<Pasto[]>(PASTI.map((p) => p.value));
  const [copiando, setCopiando] = useState(false);

  function apriCopia() {
    setCopiaDa(spostaGiorno(giorno, -1));
    setCopiaPasti(PASTI.map((p) => p.value));
    setCopiaAperta((v) => !v);
  }

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
          <Link
            href="/alimentazione/andamento"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-accent"
          >
            <TrendingUp className="h-4 w-4" />
            Andamento
          </Link>
          <Link
            href="/alimentazione/obiettivi"
            className="rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-accent"
          >
            Obiettivi
          </Link>
          <Link
            href={hrefAggiungi()}
            className="hidden items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 sm:inline-flex"
          >
            <Plus className="h-4 w-4" />
            Aggiungi
          </Link>
        </div>
      </div>

      {/* Copia i pasti di un altro giorno in quello corrente */}
      {copiaAperta && (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">
            Porta in questo giorno ({formatDate(giorno)}) i pasti di:
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={copiaDa}
              onChange={(e) => setCopiaDa(e.target.value)}
              aria-label="Giorno da cui copiare"
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => setCopiaDa(spostaGiorno(giorno, -1))}
              className="text-sm text-primary hover:underline"
            >
              il giorno prima
            </button>
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
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={eseguiCopia}
              disabled={copiando || copiaPasti.length === 0 || copiaDa === giorno}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {copiando ? "Copia…" : "Copia"}
            </button>
            <button
              onClick={() => setCopiaAperta(false)}
              className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-accent"
            >
              Annulla
            </button>
            {copiaDa === giorno && (
              <span className="text-sm text-muted-foreground">
                Scegli un giorno diverso da quello corrente.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Totali del giorno vs obiettivi */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {NUTRIENTI.map((nu) => {
          const tot = totali[nu.value];
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
            <Link
              href={`${hrefAggiungi()}&tab=manuale`}
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
            return (
              <div key={p.value} className="rounded-lg border">
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
                          <p className="truncate font-medium">
                            {r.nome_alimento}
                            {r.marca ? (
                              <span className="text-muted-foreground">
                                {" "}
                                · {r.marca}
                              </span>
                            ) : null}
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

      {/* Su telefono l'azione principale sta a portata di pollice */}
      <Link
        href={hrefAggiungi()}
        aria-label="Aggiungi alimento"
        className="fixed bottom-4 right-4 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-90 sm:hidden"
      >
        <Plus className="h-5 w-5" />
        Aggiungi
      </Link>
    </div>
  );
}
