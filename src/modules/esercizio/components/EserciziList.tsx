"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight, Dumbbell } from "lucide-react";
import { listEsercizi } from "../queries";
import {
  cercaEsercizi,
  muscoliDisegnabili,
  nomeAttrezzo,
  type Esercizio,
} from "../types";
import { NOME_MUSCOLO } from "../muscoli/tipi";
import { inputClass } from "@/core/components/controls";

/**
 * Elenco e ricerca degli esercizi.
 *
 * Il catalogo si scarica una volta sola all'apertura e poi si filtra qui: 1500
 * righe che non cambiano mai non giustificano una chiamata al worker per ogni
 * lettera digitata (è l'errore che avevamo già fatto con gli alimenti).
 */
export function EserciziList({ soloMiei = false }: { soloMiei?: boolean }) {
  const [tutti, setTutti] = useState<Esercizio[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    listEsercizi().then(setTutti);
  }, []);

  const elenco = useMemo(() => {
    if (!tutti) return [];
    const base = soloMiei ? tutti.filter((e) => e.fonte === "personale") : tutti;
    if (query.trim().length < 2) {
      // Senza ricerca: i propri esercizi per primi, poi un assaggio del catalogo.
      return soloMiei ? base : base.slice(0, 40);
    }
    return cercaEsercizi(base, query);
  }, [tutti, query, soloMiei]);

  if (tutti === null) {
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  }

  const miei = tutti.filter((e) => e.fonte === "personale").length;

  return (
    <div className="flex flex-col gap-4">
      {!soloMiei && (
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca fra 1500 esercizi: nome, attrezzo o muscolo…"
            aria-label="Cerca un esercizio"
            className={`${inputClass} w-full pl-9`}
          />
        </label>
      )}

      {elenco.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {soloMiei
            ? "Non hai ancora creato esercizi tuoi."
            : query.trim().length >= 2
              ? "Nessun esercizio trovato."
              : "Scrivi almeno due lettere per cercare."}
        </p>
      ) : (
        <ul className="space-y-2">
          {elenco.map((e) => (
            <li key={`${e.fonte}-${e.id}`}>
              <VoceEsercizio esercizio={e} />
            </li>
          ))}
        </ul>
      )}

      {!soloMiei && query.trim().length < 2 && (
        <p className="text-xs text-muted-foreground">
          {miei > 0
            ? `${miei} esercizi tuoi, più il catalogo condiviso.`
            : "Mostrati i primi del catalogo: cerca per trovare il resto."}
        </p>
      )}
    </div>
  );
}

function VoceEsercizio({ esercizio }: { esercizio: Esercizio }) {
  const { primari } = muscoliDisegnabili(esercizio);
  const attrezzi = esercizio.attrezzi.map(nomeAttrezzo).join(", ");

  return (
    <Link
      href={`/esercizio/catalogo/${esercizio.id}`}
      // Senza questo Next precarica ogni riga dei risultati: misurato, sono
      // 14 richieste al worker per una ricerca di cinque lettere, e l'elenco
      // cambia a ogni tasto. La scheda si apre comunque in fretta, e qui si
      // scorre molto piu' di quanto si apra.
      prefetch={false}
      className="flex min-h-11 items-center justify-between gap-3 rounded-lg border bg-card p-3 transition hover:bg-accent"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium capitalize">{esercizio.nome}</span>
          {esercizio.fonte === "personale" && (
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium">
              tuo
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {primari.map((m) => NOME_MUSCOLO[m]).join(", ") || "Muscoli non indicati"}
          {attrezzi && ` · ${attrezzi}`}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** Riquadro vuoto con invito, usato dalla pagina "Miei esercizi". */
export function NessunEsercizioProprio() {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <Dumbbell className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">
        Qui finiscono gli esercizi che ti crei tu, per quello che il catalogo non ha.
      </p>
    </div>
  );
}
