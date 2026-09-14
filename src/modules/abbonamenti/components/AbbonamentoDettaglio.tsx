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
  ripristinaAbbonamento,
  type AbbonamentoResult,
} from "../queries";
import { type Abbonamento, type Rata, frequenzaLabel, LABEL_STATO_ABBONAMENTO } from "../types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardTitle, Badge } from "@/core/components/ui";
import {
  IconButton,
  bottoneClass,
  bottonePrimarioClass,
  inputClass,
} from "@/core/components/controls";
import { useToast } from "@/core/components/Toast";
import { Pause, Play, XCircle, Trash2, Check, Undo2 } from "lucide-react";

const initialState: AbbonamentoResult = {};

export function AbbonamentoDettaglio({ abbonamento }: { abbonamento: Abbonamento }) {
  const router = useRouter();
  const toast = useToast();
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
  /**
   * Elimina e torna all'elenco, offrendo l'annulla nel messaggio: le rate
   * vengono lette prima perché la cancellazione se le porta via a cascata.
   */
  async function handleElimina() {
    const salvate = await listRate(abbonamento.id);
    await eliminaAbbonamentoAction(abbonamento.id);
    router.push("/abbonamenti");
    toast({
      messaggio:
        salvate.length > 0
          ? `"${abbonamento.nome}" eliminato con ${salvate.length} ${salvate.length === 1 ? "rata" : "rate"}`
          : `"${abbonamento.nome}" eliminato`,
      azione: {
        label: "Annulla",
        onClick: async () => {
          await ripristinaAbbonamento(abbonamento, salvate);
          router.push(`/abbonamenti/${abbonamento.id}`);
          router.refresh();
        },
      },
    });
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
            className={bottonePrimarioClass}
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
              className={bottoneClass}
            >
              <Pause className="h-4 w-4" />
              Sospendi
            </button>
          )}
          {abbonamento.stato === "sospeso" && (
            <button
              onClick={handleRiattiva}
              className={bottoneClass}
            >
              <Play className="h-4 w-4" />
              Riattiva
            </button>
          )}
          {abbonamento.stato !== "disdetto" && (
            <button
              onClick={handleDisdici}
              className={cn(bottoneClass, "border-destructive/40 text-destructive hover:bg-destructive/10")}
            >
              <XCircle className="h-4 w-4" />
              Disdici
            </button>
          )}
          <button
            onClick={handleElimina}
            className={cn(bottoneClass, "border-destructive/40 text-destructive hover:bg-destructive/10")}
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
          <>
            {/*
              Su telefono la tabella delle rate sbordava dallo schermo: qui
              ogni rata e' una riga con data, importo e stato, e il pulsante
              e' grande quanto un dito.
            */}
            <ul className="mt-3 divide-y rounded-lg border lg:hidden">
              {rate.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{formatDate(r.data_scadenza)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {formatCurrency(r.importo)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.stato === "pagata" ? (
                      <Badge variant="success">Pagata</Badge>
                    ) : (
                      <Badge>Da pagare</Badge>
                    )}
                    <AzioniRata r={r} onPaga={handlePaga} onAnnulla={handleAnnullaPagamento} />
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 hidden overflow-x-auto rounded-lg border lg:block">
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
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(r.importo)}
                      </td>
                      <td className="px-4 py-2">
                        {r.stato === "pagata" ? (
                          <Badge variant="success">Pagata</Badge>
                        ) : (
                          <Badge>Da pagare</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end">
                          <AzioniRata r={r} onPaga={handlePaga} onAnnulla={handleAnnullaPagamento} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/**
 * Le azioni di una rata, uguali nella lista e nella tabella. Sta fuori dal
 * componente che la usa: definita dentro, verrebbe rimontata a ogni ricarica
 * delle rate.
 */
function AzioniRata({
  r,
  onPaga,
  onAnnulla,
}: {
  r: Rata;
  onPaga: (r: Rata) => void;
  onAnnulla: (r: Rata) => void;
}) {
  return r.stato === "da_pagare" ? (
    <IconButton
      label={`Segna pagata la rata del ${formatDate(r.data_scadenza)}`}
      onClick={() => onPaga(r)}
    >
      <Check className="h-5 w-5" />
    </IconButton>
  ) : (
    <IconButton
      label={`Annulla il pagamento della rata del ${formatDate(r.data_scadenza)}`}
      onClick={() => onAnnulla(r)}
    >
      <Undo2 className="h-5 w-5" />
    </IconButton>
  );
}
