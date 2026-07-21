"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  listBollette,
  deleteBolletta,
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
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { Badge } from "@/core/components/ui";
import {
  FileText,
  CreditCard,
  Pencil,
  Trash2,
  Check,
  Split,
  FileDown,
} from "lucide-react";

const selectClass =
  "rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

export function BolletteList({
  initialStato,
  initialDivisione,
}: {
  initialStato?: string;
  initialDivisione?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Bolletta[] | null>(null);
  const [tipo, setTipo] = useState("");
  const [stato, setStato] = useState(initialStato ?? "");
  const [divisione, setDivisione] = useState(initialDivisione ?? "");
  const [anno, setAnno] = useState<string>("");

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

  const anni = Array.from(
    { length: 6 },
    (_, i) => new Date().getFullYear() - i
  );

  async function handleDelete(b: Bolletta) {
    if (!confirm(`Eliminare la bolletta di ${b.fornitore}?`)) return;
    if (b.allegato_path) await removeAllegato(b.allegato_path);
    await deleteBolletta(b.id);
    load();
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
      }) + " \u20AC";
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
      <div className="mb-4 flex flex-wrap gap-3">
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectClass}>
          <option value="">Tutti i tipi</option>
          {TIPI.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select value={stato} onChange={(e) => setStato(e.target.value)} className={selectClass}>
          <option value="">Tutti gli stati</option>
          <option value="da_pagare">Da pagare</option>
          <option value="pagata">Pagata</option>
        </select>
        <select
          value={divisione}
          onChange={(e) => setDivisione(e.target.value)}
          className={selectClass}
        >
          <option value="">Tutte le divisioni</option>
          {DIVISIONI.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <select value={anno} onChange={(e) => setAnno(e.target.value)} className={selectClass}>
          <option value="">Tutti gli anni</option>
          {anni.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
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
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Fornitore</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Scadenza</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Periodo</th>
                <th className="px-4 py-3 text-right font-medium">Importo</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Divisione</th>
                <th className="px-4 py-3 text-right font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => {
                const gg = daysUntil(b.data_scadenza);
                return (
                  <tr key={b.id} className="border-t hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium hidden sm:table-cell">{b.fornitore}</td>
                    <td className="px-4 py-3">{tipoLabel(b.tipo)}</td>
                    <td className="px-4 py-3">
                      {formatDate(b.data_scadenza)}
                      {b.stato === "da_pagare" && gg < 0 && (
                        <span className="ml-2">
                          <Badge variant="destructive">Scaduta</Badge>
                        </span>
                      )}
                      {b.stato === "da_pagare" && gg >= 0 && gg <= 7 && (
                        <span className="ml-2">
                          <Badge variant="warning">{gg}g</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground hidden sm:table-cell">
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
                    <td className="px-4 py-3 hidden sm:table-cell">
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
                      <div className="flex items-center justify-end gap-1">
                        {b.divisione === "da_dividere" && (
                          <button
                            title="Segna come divisa"
                            onClick={() => handleDivisa(b)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-success"
                          >
                            <Split className="h-4 w-4" />
                          </button>
                        )}
                        {b.allegato_path && (
                          <button
                            title="Apri PDF bolletta"
                            onClick={() => openAllegato(b.allegato_path!)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                        {b.pagamento_path && (
                          <button
                            title="Apri ricevuta pagamento"
                            onClick={() => openAllegato(b.pagamento_path!)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-success"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        )}
                        {b.stato === "da_pagare" && (
                          <button
                            title="Segna come pagata"
                            onClick={() => handlePay(b)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-success"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          title="Modifica"
                          onClick={() => router.push(`/bollette/${b.id}`)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="Elimina"
                          onClick={() => handleDelete(b)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={exportPdf}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-accent"
          >
            <FileDown className="h-4 w-4" />
            Esporta PDF ({items.length})
          </button>
        </div>
      )}
    </div>
  );
}
