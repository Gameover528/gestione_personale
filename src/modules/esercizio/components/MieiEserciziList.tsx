"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Trash2, ChevronRight, Dumbbell } from "lucide-react";
import { listEsercizi, eliminaEsercizio, ripristinaEsercizio } from "../queries";
import { muscoliDisegnabili, nomeAttrezzo, type Esercizio } from "../types";
import { NOME_MUSCOLO } from "../muscoli/tipi";
import { useToast } from "@/core/components/Toast";
import { IconButton, bottonePrimarioClass } from "@/core/components/controls";

/**
 * Gli esercizi creati dall'utente: si possono eliminare (con l'annulla), cosa
 * che per quelli del catalogo non ha senso.
 */
export function MieiEserciziList() {
  const [items, setItems] = useState<Esercizio[] | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    listEsercizi().then((tutti) =>
      setItems(tutti.filter((e) => e.fonte === "personale"))
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleElimina(e: Esercizio) {
    setItems((prev) => (prev ?? []).filter((x) => x.id !== e.id));
    try {
      await eliminaEsercizio(e.id);
    } catch {
      toast({ messaggio: "Errore durante l'eliminazione.", tono: "errore" });
      load();
      return;
    }
    toast({
      messaggio: `"${e.nome}" eliminato`,
      azione: {
        label: "Annulla",
        onClick: async () => {
          await ripristinaEsercizio(e);
          load();
        },
      },
    });
  }

  if (items === null) {
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/esercizio/miei/nuovo" className={`${bottonePrimarioClass} self-start`}>
        <Plus className="h-4 w-4" />
        Nuovo esercizio
      </Link>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Dumbbell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Qui finiscono gli esercizi che ti crei tu, per quello che il catalogo
            non ha. Compaiono nella ricerca insieme agli altri.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((e) => {
            const { primari } = muscoliDisegnabili(e);
            const attrezzi = e.attrezzi.map(nomeAttrezzo).join(", ");
            return (
              <li
                key={e.id}
                className="flex items-center gap-2 rounded-lg border bg-card p-3"
              >
                <Link
                  href={`/esercizio/catalogo/${e.id}`}
                  prefetch={false}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="font-medium capitalize">{e.nome}</span>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {primari.map((m) => NOME_MUSCOLO[m]).join(", ") ||
                        "Muscoli non indicati"}
                      {attrezzi && ` · ${attrezzi}`}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </Link>
                <IconButton
                  label={`Elimina ${e.nome}`}
                  tono="distruttivo"
                  onClick={() => handleElimina(e)}
                >
                  <Trash2 className="h-5 w-5" />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
