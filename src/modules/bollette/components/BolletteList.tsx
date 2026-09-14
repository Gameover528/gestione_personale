"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  listBollette,
  deleteBolletta,
  ripristinaBolletta,
  updateBolletta,
  getAllegatoUrl,
  removeAllegato,
} from "../queries";
import {
  type Bolletta,
  type TipoBolletta,
  TIPI,
  DIVISIONI,
  tipoLabel,
  divisioneLabel,
  quotaAltra,
  periodoRicadeInAnno,
} from "../types";
import { formatCurrency, formatDate, daysUntil, cn } from "@/lib/utils";
import { Badge } from "@/core/components/ui";
import {
  IconButton,
  bottoneClass,
  inputClass,
} from "@/core/components/controls";
import { useToast } from "@/core/components/Toast";
import {
  FileText,
  CreditCard,
  Pencil,
  Trash2,
  Check,
  Split,
  FileDown,
  SlidersHorizontal,
} from "lucide-react";

/**
 * Quanto si aspetta prima di cancellare davvero gli allegati di una bolletta
 * eliminata: finché l'annulla è a schermo i file devono restare, altrimenti la
 * bolletta tornerebbe senza i suoi PDF. Un po' più lungo del messaggio (8 s).
 */
const ATTESA_PULIZIA_MS = 10_000;

export function BolletteList({
  initialStato,
  initialDivisione,
}: {
  initialStato?: string;
  initialDivisione?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<Bolletta[] | null>(null);
  const [tipo, setTipo] = useState("");
  const [stato, setStato] = useState(initialStato ?? "");
  const [divisione, setDivisione] = useState(initialDivisione ?? "");
  const [anno, setAnno] = useState<string>("");
  const [filtriAperti, setFiltriAperti] = useState(false);

  const load = useCallback(() => {
    listBollette({
      tipo: tipo || undefined,
      stato: stato || undefined,
      divisione: divisione || undefined,
    }).then((all) => {
      const y = anno ? Number(anno) : null;
      setItems(
        y === null
          ? all
          : all.filter((b) =>
              periodoRicadeInAnno(
                b.periodo_inizio,
                b.periodo_fine,
                b.data_scadenza,
                y
              )
            )
      );
    });
  }, [tipo, stato, divisione, anno]);

  useEffect(() => {
    load();
  }, [load]);

  const anni = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  const filtriAttivi = [tipo, stato, divisione, anno].filter(Boolean).length;

  /**
   * Elimina subito e offre l'annulla nel messaggio, come nel diario: chiedere
   * conferma prima rallenta ogni cancellazione, anche le tante volute.
   */
  async function handleDelete(b: Bolletta) {
    setItems((prev) => (prev ?? []).filter((x) => x.id !== b.id));
    try {
      await deleteBolletta(b.id);
    } catch {
      toast({ messaggio: "Errore durante l'eliminazione.", tono: "errore" });
      load();
      return;
    }

    const allegati = [b.allegato_path, b.pagamento_path].filter(
      (p): p is string => Boolean(p)
    );
    const pulizia = allegati.length
      ? setTimeout(() => {
          for (const path of allegati) void removeAllegato(path);
        }, ATTESA_PULIZIA_MS)
      : null;

    toast({
      messaggio: `Bolletta di ${b.fornitore} eliminata`,
      azione: {
        label: "Annulla",
        onClick: async () => {
          if (pulizia) clearTimeout(pulizia);
          await ripristinaBolletta(b);
          load();
        },
      },
    });
  }

  async function handlePay(b: Bolletta) {
    await updateBolletta(b.id, {
      stato: "pagata",
      data_pagamento: new Date().toISOString().slice(0, 10),
    });
    load();
  }

  async function handleDivisa(b: Bolletta) {
    await updateBolletta(b.id, { divisione: "divisa" });
    load();
  }

  async function openAllegato(path: string) {
    const url = await getAllegatoUrl(path);
    if (url) window.open(url, "_blank");
  }

  async function exportPdf() {
    if (!items || items.length === 0) return;
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const euro = (n: number) =>
      n.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " €";
    const periodo = (b: Bolletta) =>
      b.periodo_inizio || b.periodo_fine
        ? `${formatDate(b.periodo_inizio)} - ${formatDate(b.periodo_fine)}`
        : "-";

    const doc = new jsPDF({ orientation: "landscape" });
    const filtri: string[] = [];
    if (tipo) filtri.push(`Tipo: ${tipoLabel(tipo as TipoBolletta)}`);
    if (stato)
      filtri.push(`Stato: ${stato === "pagata" ? "Pagata" : "Da pagare"}`);
    if (divisione) filtri.push(`Divisione: ${divisioneLabel(divisione as never)}`);
    filtri.push(`Anno: ${anno || "tutti"}`);

    doc.setFontSize(16);
    doc.text("Bollette", 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(filtri.join("   -   "), 14, 22);

    const body = items.map((b) => [
      b.fornitore,
      tipoLabel(b.tipo),
      periodo(b),
      formatDate(b.data_scadenza),
      euro(b.importo),
      b.stato === "pagata" ? "Pagata" : "Da pagare",
      b.divisione === "da_dividere"
        ? `Da dividere (${euro(
            quotaAltra(b.importo, b.persone_tue, b.persone_altre)
          )})`
        : b.divisione === "divisa"
          ? "Divisa"
          : "-",
    ]);

    const totale = items.reduce((s, b) => s + Number(b.importo), 0);
    const totRecuperare = items
      .filter((b) => b.divisione === "da_dividere")
      .reduce(
        (s, b) => s + quotaAltra(b.importo, b.persone_tue, b.persone_altre),
        0
      );

    autoTable(doc, {
      startY: 26,
      head: [
        [
          "Fornitore",
          "Tipo",
          "Periodo",
          "Scadenza",
          "Importo",
          "Stato",
          "Divisione",
        ],
      ],
      body,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
      foot: [
        [
          "",
          "",
          "",
          "Totale",
          euro(totale),
          "",
          totRecuperare > 0 ? `Da recuperare: ${euro(totRecuperare)}` : "",
        ],
      ],
      footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
    });

    const oggi = new Date().toISOString().slice(0, 10);
    doc.save(`bollette_${oggi}.pdf`);
  }

  return (
    <div>
      {/*
        Su telefono i quattro filtri impilati occupavano tutta la prima
        schermata: si apre il pannello solo quando serve, e il numero dice
        quanti sono attivi senza doverlo aprire. Da schermo grande restano
        sempre in vista, dove lo spazio c'è.
      */}
      <div className="mb-4">
        <button
          onClick={() => setFiltriAperti((v) => !v)}
          aria-expanded={filtriAperti}
          className={cn(bottoneClass, "w-full sm:w-auto lg:hidden")}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtri{filtriAttivi > 0 ? ` (${filtriAttivi})` : ""}
        </button>

        <div
          className={cn(
            "mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-0 lg:flex lg:flex-wrap",
            !filtriAperti && "hidden lg:flex"
          )}
        >
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            aria-label="Filtra per tipo"
            className={inputClass}
          >
            <option value="">Tutti i tipi</option>
            {TIPI.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={stato}
            onChange={(e) => setStato(e.target.value)}
            aria-label="Filtra per stato"
            className={inputClass}
          >
            <option value="">Tutti gli stati</option>
            <option value="da_pagare">Da pagare</option>
            <option value="pagata">Pagata</option>
          </select>
          <select
            value={divisione}
            onChange={(e) => setDivisione(e.target.value)}
            aria-label="Filtra per divisione"
            className={inputClass}
          >
            <option value="">Tutte le divisioni</option>
            {DIVISIONI.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <select
            value={anno}
            onChange={(e) => setAnno(e.target.value)}
            aria-label="Filtra per anno"
            className={inputClass}
          >
            <option value="">Tutti gli anni</option>
            {anni.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {items === null ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nessuna bolletta trovata.
          </p>
          <Link
            href="/bollette/nuova"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            + Aggiungi la prima bolletta
          </Link>
        </div>
      ) : (
        <>
          {/*
            Sotto i 1024 px la tabella non ci sta: otto colonne in 341 px
            significavano nascondere il fornitore — cioè il nome della bolletta —
            e spingere i pulsanti fuori dallo schermo. Qui ogni bolletta è una
            scheda con le stesse informazioni, incolonnate.
          */}
          <ul className="space-y-3 lg:hidden">
            {items.map((b) => (
              <li key={b.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.fornitore}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {tipoLabel(b.tipo)} · {formatDate(b.data_scadenza)}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-semibold">
                    {formatCurrency(b.importo)}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {b.stato === "pagata" ? (
                    <Badge variant="success">Pagata</Badge>
                  ) : (
                    <Badge>Da pagare</Badge>
                  )}
                  <Scadenza b={b} />
                  {b.divisione === "da_dividere" && (
                    <Badge variant="warning">
                      Da dividere · recuperi{" "}
                      {formatCurrency(
                        quotaAltra(b.importo, b.persone_tue, b.persone_altre)
                      )}
                    </Badge>
                  )}
                  {b.divisione === "divisa" && (
                    <Badge variant="success">Divisa</Badge>
                  )}
                </div>

                {(b.periodo_inizio || b.periodo_fine) && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Periodo {formatDate(b.periodo_inizio)} →{" "}
                    {formatDate(b.periodo_fine)}
                  </p>
                )}

                <div className="mt-2 border-t pt-1">
                  <AzioniBolletta
                    b={b}
                    onDivisa={handleDivisa}
                    onApri={openAllegato}
                    onPaga={handlePay}
                    onModifica={(id) => router.push(`/bollette/${id}`)}
                    onElimina={handleDelete}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-lg border lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Fornitore</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Scadenza</th>
                  <th className="px-4 py-3 font-medium">Periodo</th>
                  <th className="px-4 py-3 text-right font-medium">Importo</th>
                  <th className="px-4 py-3 font-medium">Stato</th>
                  <th className="px-4 py-3 font-medium">Divisione</th>
                  <th className="px-4 py-3 text-right font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id} className="border-t hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{b.fornitore}</td>
                    <td className="px-4 py-3">{tipoLabel(b.tipo)}</td>
                    <td className="px-4 py-3">
                      {formatDate(b.data_scadenza)}
                      <span className="ml-2">
                        <Scadenza b={b} />
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {b.periodo_inizio || b.periodo_fine
                        ? `${formatDate(b.periodo_inizio)} → ${formatDate(
                            b.periodo_fine
                          )}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(b.importo)}
                    </td>
                    <td className="px-4 py-3">
                      {b.stato === "pagata" ? (
                        <Badge variant="success">Pagata</Badge>
                      ) : (
                        <Badge>Da pagare</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {b.divisione === "da_dividere" ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="warning">Da dividere</Badge>
                          <span className="text-xs text-muted-foreground">
                            recuperi{" "}
                            {formatCurrency(
                              quotaAltra(
                                b.importo,
                                b.persone_tue,
                                b.persone_altre
                              )
                            )}
                          </span>
                        </div>
                      ) : b.divisione === "divisa" ? (
                        <Badge variant="success">Divisa</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AzioniBolletta
                    b={b}
                    onDivisa={handleDivisa}
                    onApri={openAllegato}
                    onPaga={handlePay}
                    onModifica={(id) => router.push(`/bollette/${id}`)}
                    onElimina={handleDelete}
                  />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {items && items.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button onClick={exportPdf} className={bottoneClass}>
            <FileDown className="h-4 w-4" />
            Esporta PDF ({items.length})
          </button>
        </div>
      )}
    </div>
  );
}

/** Il pallino con i giorni alla scadenza, o "Scaduta". */
function Scadenza({ b }: { b: Bolletta }) {
  if (b.stato !== "da_pagare") return null;
  const gg = daysUntil(b.data_scadenza);
  if (gg < 0) return <Badge variant="destructive">Scaduta</Badge>;
  if (gg <= 7) return <Badge variant="warning">{gg}g</Badge>;
  return null;
}

/**
 * Le azioni di una bolletta, uguali nella scheda e nella tabella.
 *
 * Sta fuori dal componente che la usa: definita dentro, React la considera un
 * componente nuovo a ogni ricarica dell'elenco e la rimonta, perdendo il fuoco
 * di chi naviga da tastiera.
 */
function AzioniBolletta({
  b,
  onDivisa,
  onApri,
  onPaga,
  onModifica,
  onElimina,
}: {
  b: Bolletta;
  onDivisa: (b: Bolletta) => void;
  onApri: (path: string) => void;
  onPaga: (b: Bolletta) => void;
  onModifica: (id: string) => void;
  onElimina: (b: Bolletta) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {b.divisione === "da_dividere" && (
        <IconButton label="Segna come divisa" onClick={() => onDivisa(b)}>
          <Split className="h-5 w-5" />
        </IconButton>
      )}
      {b.allegato_path && (
        <IconButton
          label="Apri il PDF della bolletta"
          onClick={() => onApri(b.allegato_path!)}
        >
          <FileText className="h-5 w-5" />
        </IconButton>
      )}
      {b.pagamento_path && (
        <IconButton
          label="Apri la ricevuta di pagamento"
          onClick={() => onApri(b.pagamento_path!)}
        >
          <CreditCard className="h-5 w-5" />
        </IconButton>
      )}
      {b.stato === "da_pagare" && (
        <IconButton label="Segna come pagata" onClick={() => onPaga(b)}>
          <Check className="h-5 w-5" />
        </IconButton>
      )}
      <IconButton
        label={`Modifica la bolletta di ${b.fornitore}`}
        onClick={() => onModifica(b.id)}
      >
        <Pencil className="h-5 w-5" />
      </IconButton>
      <span className="ml-2">
        <IconButton
          label={`Elimina la bolletta di ${b.fornitore}`}
          tono="distruttivo"
          onClick={() => onElimina(b)}
        >
          <Trash2 className="h-5 w-5" />
        </IconButton>
      </span>
    </div>
  );
}
