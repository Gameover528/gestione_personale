"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  listAbbonamenti,
  listRate,
  sospendiAbbonamentoAction,
  riattivaAbbonamentoAction,
  disdiciAbbonamentoAction,
  eliminaAbbonamentoAction,
  ripristinaAbbonamento,
} from "../queries";
import {
  type Abbonamento,
  frequenzaLabel,
  LABEL_STATO_ABBONAMENTO,
} from "../types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/core/components/ui";
import { IconButton } from "@/core/components/controls";
import { useToast } from "@/core/components/Toast";
import { Pause, Play, XCircle, Trash2, ChevronRight } from "lucide-react";

export function AbbonamentiList() {
  const [items, setItems] = useState<Abbonamento[] | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    listAbbonamenti().then(setItems);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSospendi(a: Abbonamento) {
    await sospendiAbbonamentoAction(a.id);
    load();
    toast({ messaggio: `"${a.nome}" sospeso` });
  }

  async function handleRiattiva(a: Abbonamento) {
    await riattivaAbbonamentoAction(a.id);
    load();
    toast({ messaggio: `"${a.nome}" riattivato` });
  }

  /**
   * Disdire non cancella niente (le rate generate restano), quindi si fa
   * subito e si offre di tornare indietro: riattivare è l'operazione opposta.
   */
  async function handleDisdici(a: Abbonamento) {
    await disdiciAbbonamentoAction(a.id);
    load();
    toast({
      messaggio: `"${a.nome}" disdetto: non verranno create nuove rate`,
      azione: {
        label: "Annulla",
        onClick: async () => {
          await riattivaAbbonamentoAction(a.id);
          load();
        },
      },
    });
  }

  /**
   * Elimina subito e offre l'annulla. Le rate vengono lette prima della
   * cancellazione perché spariscono a cascata: senza, il ripristino
   * restituirebbe un abbonamento senza storico.
   */
  async function handleElimina(a: Abbonamento) {
    let rate;
    try {
      rate = await listRate(a.id);
      setItems((prev) => (prev ?? []).filter((x) => x.id !== a.id));
      await eliminaAbbonamentoAction(a.id);
    } catch {
      toast({ messaggio: "Errore durante l'eliminazione.", tono: "errore" });
      load();
      return;
    }

    toast({
      messaggio:
        rate.length > 0
          ? `"${a.nome}" eliminato con ${rate.length} ${rate.length === 1 ? "rata" : "rate"}`
          : `"${a.nome}" eliminato`,
      azione: {
        label: "Annulla",
        onClick: async () => {
          await ripristinaAbbonamento(a, rate);
          load();
        },
      },
    });
  }

  if (items === null) {
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nessun abbonamento configurato.
        </p>
        <Link
          href="/abbonamenti/nuovo"
          className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          + Aggiungi il primo abbonamento
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li
          key={a.id}
          className="flex flex-col gap-2 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
        >
          <Link
            href={`/abbonamenti/${a.id}`}
            className="flex flex-1 items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{a.nome}</span>
                <Badge
                  variant={
                    a.stato === "attivo"
                      ? "success"
                      : a.stato === "sospeso"
                        ? "warning"
                        : "default"
                  }
                >
                  {LABEL_STATO_ABBONAMENTO[a.stato]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatCurrency(a.importo)} · {frequenzaLabel(a.frequenza)} · dal{" "}
                {formatDate(a.data_inizio)}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>

          {/*
            Bersagli da 44 px e un po' d'aria attorno a "Elimina": erano tre
            icone da 28 px a quattro pixel l'una dall'altra, e una delle tre
            cancella l'abbonamento con tutto lo storico.
          */}
          <div className="flex items-center justify-end gap-1 border-t pt-1 sm:border-0 sm:pt-0">
            {a.stato === "attivo" && (
              <IconButton
                label={`Sospendi ${a.nome}`}
                onClick={() => handleSospendi(a)}
              >
                <Pause className="h-5 w-5" />
              </IconButton>
            )}
            {a.stato === "sospeso" && (
              <IconButton
                label={`Riattiva ${a.nome}`}
                onClick={() => handleRiattiva(a)}
              >
                <Play className="h-5 w-5" />
              </IconButton>
            )}
            {a.stato !== "disdetto" && (
              <IconButton
                label={`Disdici ${a.nome}`}
                onClick={() => handleDisdici(a)}
              >
                <XCircle className="h-5 w-5" />
              </IconButton>
            )}
            <span className="ml-2">
              <IconButton
                label={`Elimina ${a.nome} e tutte le sue rate`}
                tono="distruttivo"
                onClick={() => handleElimina(a)}
              >
                <Trash2 className="h-5 w-5" />
              </IconButton>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
