"use client";

import { useActionState, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  aggiornaAbbonamentoAction,
  listRate,
  segnaRataPagataAction,
  segnaRataDaPagareAction,
  sospendiAbbonamentoAction,
  riattivaAbbonamentoAction,
  disdiciAbbonamentoAction,
  eliminaAbbonamentoAction,
  type AbbonamentoResult,
} from "../queries";
import { type Abbonamento, type Rata, frequenzaLabel, LABEL_STATO_ABBONAMENTO } from "../types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardTitle, Badge } from "@/core/components/ui";
import { Pause, Play, XCircle, Trash2, Check, Undo2 } from "lucide-react";

const initialState: AbbonamentoResult = {};
const inputClass =
  "rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

export function AbbonamentoDettaglio({ abbonamento }: { abbonamento: Abbonamento }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(aggiornaAbbonamentoAction, initialState);
  const [rate, setRate] = useState<Rata[] | null>(null);

  const caricaRate = useCallback(() => {
    listRate(abbonamento.id).then(setRate);
  }, [abbonamento.id]);

  useEffect(() => {
    caricaRate();
  }, [caricaRate]);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  async function handleSospendi() {
    await sospendiAbbonamentoAction(abbonamento.id);
    router.refresh();
  }
  async function handleRiattiva() {
    await riattivaAbbonamentoAction(abbonamento.id);
    router.refresh();
  }
  async function handleDisdici() {
    if (
      !confirm(
        `Disdire "${abbonamento.nome}"? Le rate già generate restano, ma non ne verranno create di nuove. L'operazione non è reversibile.`
      )
    )
      return;
    await disdiciAbbonamentoAction(abbonamento.id);
    router.refresh();
  }
  async function handleElimina() {
    if (
      !confirm(
        `Eliminare definitivamente "${abbonamento.nome}" e TUTTE le sue rate? L'operazione non è reversibile.`
      )
    )
      return;
    await eliminaAbbonamentoAction(abbonamento.id);
    router.push("/abbonamenti");
  }
  async function handlePaga(r: Rata) {
    await segnaRataPagataAction(r.id);
    caricaRate();
  }
  async function handleAnnullaPagamento(r: Rata) {
    await segnaRataDaPagareAction(r.id);
    caricaRate();
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge
            variant={
              abbonamento.stato === "attivo"
                ? "success"
                : abbonamento.stato === "sospeso"
                  ? "warning"
                  : "default"
            }
          >
            {LABEL_STATO_ABBONAMENTO[abbonamento.stato]}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {frequenzaLabel(abbonamento.frequenza)} · dal {formatDate(abbonamento.data_inizio)}
          </span>
        </div>

        <form action={formAction} className="max-w-md space-y-4">
          <input type="hidden" name="id" value={abbonamento.id} />
          <div className="flex flex-col gap-1">
            <label htmlFor="nome" className="text-sm font-medium">
              Nome
            </label>
            <input id="nome" name="nome" defaultValue={abbonamento.nome} required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="importo" className="text-sm font-medium">
              Importo per rata
            </label>
            <input
              id="importo"
              name="importo"
              type="number"
              step="0.01"
              min="0"
              defaultValue={abbonamento.importo}
              required
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground">
              Vale solo per le rate future: quelle già generate mantengono l&apos;importo storico.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="note" className="text-sm font-medium">
              Note
            </label>
            <textarea
              id="note"
              name="note"
              rows={2}
              defaultValue={abbonamento.note ?? ""}
              className={inputClass}
            />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Salvataggio…" : "Salva modifiche"}
          </button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Frequenza e data di inizio non sono modificabili: se sono sbagliate conviene
          eliminare l&apos;abbonamento e ricrearlo.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 border-t pt-4">
          {abbonamento.stato === "attivo" && (
            <button
              onClick={handleSospendi}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-accent"
            >
              <Pause className="h-4 w-4" />
              Sospendi
            </button>
          )}
          {abbonamento.stato === "sospeso" && (
            <button
              onClick={handleRiattiva}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-accent"
            >
              <Play className="h-4 w-4" />
              Riattiva
            </button>
          )}
          {abbonamento.stato !== "disdetto" && (
            <button
              onClick={handleDisdici}
              className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4" />
              Disdici
            </button>
          )}
          <button
            onClick={handleElimina}
            className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Elimina tutto
          </button>
        </div>
      </Card>

      <Card>
        <CardTitle>Rate</CardTitle>
        {rate === null ? (
          <p className="mt-3 text-sm text-muted-foreground">Caricamento…</p>
        ) : rate.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nessuna rata generata finora.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Scadenza</th>
                  <th className="px-4 py-2 text-right font-medium">Importo</th>
                  <th className="px-4 py-2 font-medium">Stato</th>
                  <th className="px-4 py-2 text-right font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {rate.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2">{formatDate(r.data_scadenza)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(r.importo)}</td>
                    <td className="px-4 py-2">
                      {r.stato === "pagata" ? (
                        <Badge variant="success">Pagata</Badge>
                      ) : (
                        <Badge>Da pagare</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.stato === "da_pagare" ? (
                        <button
                          title="Segna come pagata"
                          onClick={() => handlePaga(r)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-success"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          title="Annulla pagamento"
                          onClick={() => handleAnnullaPagamento(r)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
