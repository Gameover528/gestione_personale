"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listPiatti, deletePiatto } from "../queries";
import { type Piatto } from "../types";
import { Plus, Pencil, Trash2 } from "lucide-react";

export function PiattiList() {
  const router = useRouter();
  const [piatti, setPiatti] = useState<Piatto[] | null>(null);

  const load = useCallback(() => {
    listPiatti().then(setPiatti);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(p: Piatto) {
    if (!confirm(`Eliminare il piatto "${p.nome}"?`)) return;
    await deletePiatto(p.id);
    load();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Link
          href="/alimentazione/piatti/nuovo"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nuovo piatto
        </Link>
      </div>

      {piatti === null ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : piatti.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nessun piatto salvato. Creane uno con i suoi ingredienti.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {piatti.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <span className="min-w-0 truncate font-medium">{p.nome}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => router.push(`/alimentazione/piatti/${p.id}`)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Modifica"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                  title="Elimina"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
