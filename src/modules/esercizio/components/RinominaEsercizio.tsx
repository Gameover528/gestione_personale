"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { rinominaEsercizio } from "../queries";
import { inputClass, bottoneClass, bottonePrimarioClass } from "@/core/components/controls";

/**
 * Dà un nome tuo a un esercizio del catalogo.
 *
 * Il catalogo è in inglese e condiviso, quindi non si tocca: il nome scelto
 * vale solo per te. Gli esercizi che usi davvero sono pochi, e ribattezzarli
 * una volta costa meno che tradurne millecinquecento — e senza il rischio di
 * traduzioni automatiche storte.
 *
 * Il nome originale resta cercabile: se lo chiami "Panca piana", scrivendo
 * "bench" lo trovi lo stesso.
 */
export function RinominaEsercizio({
  id,
  nome,
  nomeOriginale,
}: {
  id: string;
  nome: string;
  /** Presente solo se è già stato rinominato. */
  nomeOriginale?: string | null;
}) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [valore, setValore] = useState(nome);
  const [inCorso, setInCorso] = useState(false);

  async function salva() {
    setInCorso(true);
    try {
      await rinominaEsercizio(id, valore);
      setAperto(false);
      router.refresh();
    } finally {
      setInCorso(false);
    }
  }

  async function ripristina() {
    setInCorso(true);
    try {
      await rinominaEsercizio(id, "");
      setAperto(false);
      router.refresh();
    } finally {
      setInCorso(false);
    }
  }

  if (!aperto) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setValore(nome);
            setAperto(true);
          }}
          className={bottoneClass}
        >
          <Pencil className="h-4 w-4" />
          {nomeOriginale ? "Cambia nome" : "Dagli un nome tuo"}
        </button>
        {nomeOriginale && (
          <span className="text-xs text-muted-foreground">
            nel catalogo: {nomeOriginale}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Come vuoi chiamarlo</span>
        <input
          value={valore}
          onChange={(e) => setValore(e.target.value)}
          placeholder="Panca piana con bilanciere"
          maxLength={80}
          className={inputClass}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button onClick={salva} disabled={inCorso} className={bottonePrimarioClass}>
          {inCorso ? "Salvo…" : "Salva"}
        </button>
        <button onClick={() => setAperto(false)} className={bottoneClass}>
          <X className="h-4 w-4" />
          Annulla
        </button>
        {nomeOriginale && (
          <button onClick={ripristina} disabled={inCorso} className={bottoneClass}>
            Torna a &laquo;{nomeOriginale}&raquo;
          </button>
        )}
      </div>
    </div>
  );
}
