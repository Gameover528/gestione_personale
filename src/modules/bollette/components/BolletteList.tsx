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
  TIPI,
  DIVISIONI,
  tipoLabel,
  quotaAltra,
} from "../types";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { Badge } from "@/core/components/ui";
import { FileText, Pencil, Trash2, Check, Split } from "lucide-react";

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
  const [anno, setAnno] = useState<string>(String(new Date().getFullYear()));

  const load = useCallback(() => {
    listBollette({
      tipo: tipo || undefined,
      stato: stato || undefined,
      divisione: divisione || undefined,
      anno: anno ? Number(anno) : undefined,
    }).then(setItems);
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
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Fornitore</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Scadenza</th>
                <th className="px-4 py-3 text-right font-medium">Importo</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3 font-medium">Divisione</th>
                <th className="px-4 py-3 text-right font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => {
                const gg = daysUntil(b.data_scadenza);
                return (
                  <tr key={b.id} className="border-t hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{b.fornitore}</td>
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
                            title="Apri PDF"
                            onClick={() => openAllegato(b.allegato_path!)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <FileText className="h-4 w-4" />
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
    </div>
  );
}
