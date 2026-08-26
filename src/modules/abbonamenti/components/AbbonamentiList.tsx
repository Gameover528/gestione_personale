"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  listAbbonamenti,
  sospendiAbbonamentoAction,
  riattivaAbbonamentoAction,
  disdiciAbbonamentoAction,
  eliminaAbbonamentoAction,
} from "../queries";
import { type Abbonamento, frequenzaLabel, LABEL_STATO_ABBONAMENTO } from "../types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/core/components/ui";
import { Pause, Play, XCircle, Trash2, ChevronRight } from "lucide-react";

export function AbbonamentiList() {
  const [items, setItems] = useState<Abbonamento[] | null>(null);

  const load = useCallback(() => {
    listAbbonamenti().then(setItems);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSospendi(a: Abbonamento) {
    await sospendiAbbonamentoAction(a.id);
    load();
  }

  async function handleRiattiva(a: Abbonamento) {
    await riattivaAbbonamentoAction(a.id);
    load();
  }

  async function handleDisdici(a: Abbonamento) {
    if (
      !confirm(
        `Disdire "${a.nome}"? Le rate già generate restano, ma non ne verranno create di nuove. L'operazione non è reversibile.`
      )
    )
      return;
    await disdiciAbbonamentoAction(a.id);
    load();
  }

  async function handleElimina(a: Abbonamento) {
    if (
      !confirm(
        `Eliminare definitivamente "${a.nome}" e TUTTE le sue rate (anche quelle già pagate)? L'operazione non è reversibile.`
      )
    )
      return;
    await eliminaAbbonamentoAction(a.id);
    load();
  }

  if (items === null) {
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm text-muted-foreground">Nessun abbonamento configurato.</p>
        <Link href="/abbonamenti/nuovo" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          + Aggiungi il primo abbonamento
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href={`/abbonamenti/${a.id}`} className="flex flex-1 items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{a.nome}</span>
                <Badge
                  variant={a.stato === "attivo" ? "success" : a.stato === "sospeso" ? "warning" : "default"}
                >
                  {LABEL_STATO_ABBONAMENTO[a.stato]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatCurrency(a.importo)} · {frequenzaLabel(a.frequenza)} · dal {formatDate(a.data_inizio)}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>

          <div className="flex items-center justify-end gap-1 sm:justify-normal">
            {a.stato === "attivo" && (
              <button
                title="Sospendi"
                onClick={() => handleSospendi(a)}
                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-warning"
              >
                <Pause className="h-4 w-4" />
              </button>
            )}
            {a.stato === "sospeso" && (
              <button
                title="Riattiva"
                onClick={() => handleRiattiva(a)}
                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-success"
              >
                <Play className="h-4 w-4" />
              </button>
            )}
            {a.stato !== "disdetto" && (
              <button
                title="Disdici"
                onClick={() => handleDisdici(a)}
                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
            <button
              title="Elimina definitivamente"
              onClick={() => handleElimina(a)}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
