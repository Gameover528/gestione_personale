"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listPiatti, deletePiatto, getPiatto, ripristinaPiatto } from "../queries";
import { type PiattoConValori } from "../types";
import { Badge } from "@/core/components/ui";
import { IconButton } from "@/core/components/controls";
import { useToast } from "@/core/components/Toast";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function PiattiList({ iniziali }: { iniziali: PiattoConValori[] }) {
  const router = useRouter();
  const toast = useToast();
  const [piatti, setPiatti] = useState<PiattoConValori[]>(iniziali);
  const [filtro, setFiltro] = useState("");

  const visibili = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return piatti;
    return piatti.filter((p) =>
      `${p.nome} ${p.marca ?? ""}`.toLowerCase().includes(q)
    );
  }, [piatti, filtro]);

  async function ricarica() {
    setPiatti(await listPiatti());
  }

  /**
   * Elimina subito e offre l'annulla nel toast: il piatto (con i suoi
   * ingredienti) viene letto prima, così può essere ripristinato identico.
   */
  async function handleDelete(p: PiattoConValori) {
    try {
      const completo = await getPiatto(p.id);
      setPiatti((prev) => prev.filter((x) => x.id !== p.id));
      await deletePiatto(p.id);
      toast({
        messaggio: `"${p.nome}" eliminato`,
        azione: {
          label: "Annulla",
          onClick: async () => {
            await ripristinaPiatto(completo);
            ricarica();
          },
        },
      });
    } catch {
      toast({ messaggio: "Errore durante l'eliminazione.", tono: "errore" });
      ricarica();
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtra per nome o marca…"
            aria-label="Filtra i piatti"
            className={cn(
              "w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none",
              "focus:ring-2 focus:ring-primary"
            )}
          />
        </div>
        <Link
          href="/alimentazione/piatti/nuovo"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nuovo piatto
        </Link>
      </div>

      {piatti.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nessun piatto salvato. Creane uno con i suoi ingredienti, oppure
            inserendo direttamente i valori di un&apos;etichetta.
          </p>
        </div>
      ) : visibili.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessun piatto corrisponde al filtro.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {visibili.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 px-2 py-2 sm:px-4"
            >
              <div className="min-w-0 pl-2">
                <p className="truncate font-medium">
                  {p.nome}
                  {p.marca ? (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {p.marca}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span>{Math.round(p.per100.kcal)} kcal / 100 g</span>
                  <span>
                    P {p.per100.proteine.toFixed(1)} · C{" "}
                    {p.per100.carboidrati.toFixed(1)} · G{" "}
                    {p.per100.grassi.toFixed(1)}
                  </span>
                  {p.porzione_g ? (
                    <span>
                      1 {p.porzione_nome?.trim() || "porzione"} ={" "}
                      {Math.round(p.porzione_g)} g ·{" "}
                      {Math.round((p.per100.kcal * p.porzione_g) / 100)} kcal
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Badge variant={p.tipo === "composto" ? "default" : "success"}>
                  {p.tipo === "composto" ? "ricetta" : "valori propri"}
                </Badge>
                <IconButton
                  label={`Modifica ${p.nome}`}
                  onClick={() => router.push(`/alimentazione/piatti/${p.id}`)}
                >
                  <Pencil className="h-5 w-5" />
                </IconButton>
                <IconButton
                  label={`Elimina ${p.nome}`}
                  tono="distruttivo"
                  onClick={() => handleDelete(p)}
                >
                  <Trash2 className="h-5 w-5" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
