"use client";

import { useState } from "react";
import { Badge } from "@/core/components/ui";
import { TabBar } from "@/core/components/controls";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { etichettaAmbiente } from "./ambiente";
import type { Ambiente, Rilascio } from "./changelog";

type Filtro = "ambiente" | "tutti";

/**
 * Registro delle versioni. Mostra per default i rilasci dell'ambiente in cui
 * si sta navigando: su sviluppo il dettaglio di ogni pubblicazione, in
 * produzione la voce che riassume il periodo (espandibile per vedere le
 * versioni di sviluppo che contiene).
 */
export function RegistroVersioni({
  ambiente,
  rilasci,
  devPerVersione,
}: {
  ambiente: Ambiente;
  rilasci: Rilascio[];
  /** Per ogni rilascio di produzione, le voci dev che raccoglie. */
  devPerVersione: Record<string, Rilascio[]>;
}) {
  const [filtro, setFiltro] = useState<Filtro>("ambiente");
  const [aperti, setAperti] = useState<string[]>([]);

  const visibili =
    filtro === "ambiente"
      ? rilasci.filter((r) => r.ambiente === ambiente)
      : rilasci;

  function toggle(versione: string) {
    setAperti((prev) =>
      prev.includes(versione)
        ? prev.filter((v) => v !== versione)
        : [...prev, versione]
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Stai usando l&apos;ambiente di{" "}
          <strong>{etichettaAmbiente(ambiente).toLowerCase()}</strong>
          {visibili[0] ? (
            <>
              , versione <strong>{visibili[0].versione}</strong>
            </>
          ) : null}
          .
        </p>
        <TabBar
          label="Quali versioni mostrare"
          value={filtro}
          onChange={setFiltro}
          items={[
            { value: "ambiente", label: "Questo ambiente" },
            { value: "tutti", label: "Tutti gli ambienti" },
          ]}
        />
      </div>

      {visibili.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessun rilascio registrato per questo ambiente.
        </p>
      ) : (
        <ol className="space-y-4">
          {visibili.map((r, i) => {
            const dev = devPerVersione[r.versione] ?? [];
            const aperto = aperti.includes(r.versione);
            return (
              <li key={r.versione} className="rounded-lg border">
                <div className="flex flex-wrap items-center gap-2 border-b bg-muted px-4 py-2">
                  <span className="font-semibold">{r.versione}</span>
                  {filtro === "tutti" && (
                    <Badge variant={r.ambiente === "prod" ? "success" : "default"}>
                      {etichettaAmbiente(r.ambiente)}
                    </Badge>
                  )}
                  {i === 0 && filtro === "ambiente" && (
                    <Badge variant="success">in uso</Badge>
                  )}
                  <span className="ml-auto text-sm text-muted-foreground">
                    {formatDate(r.data)}
                  </span>
                </div>

                <div className="space-y-3 px-4 py-3">
                  <p className="font-medium">{r.titolo}</p>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                    {r.punti.map((p, k) => (
                      <li key={k}>{p}</li>
                    ))}
                  </ul>

                  {dev.length > 0 && (
                    <div className="rounded-md border">
                      <button
                        onClick={() => toggle(r.versione)}
                        aria-expanded={aperto}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition hover:bg-accent"
                      >
                        {aperto ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        Contiene {dev.length}{" "}
                        {dev.length === 1
                          ? "versione di sviluppo"
                          : "versioni di sviluppo"}
                      </button>
                      {aperto && (
                        <ul className="divide-y border-t">
                          {dev.map((d) => (
                            <li key={d.versione} className="px-3 py-2 text-sm">
                              <p className="flex flex-wrap items-baseline gap-2">
                                <span className="font-medium">{d.versione}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(d.data)}
                                </span>
                              </p>
                              <p className="text-muted-foreground">{d.titolo}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className={cn("text-xs text-muted-foreground")}>
        Le versioni con il suffisso <code>-dev</code> sono pubblicazioni
        sull&apos;ambiente di sviluppo; quando il lavoro passa in produzione
        diventano un&apos;unica versione che le riassume.
      </p>
    </div>
  );
}
