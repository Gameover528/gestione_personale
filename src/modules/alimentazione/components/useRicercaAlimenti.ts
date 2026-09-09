"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cercaAlimentiEsterni } from "../queries";
import {
  cercaTraIPiatti,
  type AlimentoRicerca,
  type PiattoConValori,
} from "../types";

export type StatoRicerca = "fermo" | "caricando" | "ok" | "irraggiungibile";

/**
 * Pausa prima di interrogare le fonti esterne.
 *
 * Ogni ricerca esterna è una chiamata al worker che a sua volta chiama Open
 * Food Facts e USDA: mentre si scrive "mozzarella fiorfiore" le pause naturali
 * di mezzo secondo ne facevano partire una per pezzo di parola ("mo",
 * "mozzarella", "mozzarella fior"...). Aspettare che la scrittura si fermi
 * davvero costa mezzo secondo in più solo alla prima ricerca di un termine.
 */
const PAUSA_ESTERNI_MS = 1100;

/**
 * Ricerca alimenti in due fasi, mentre si scrive.
 *
 * I piatti personali si filtrano nel browser (sono già stati caricati con la
 * pagina) e compaiono a ogni lettera, senza nessuna chiamata; Open Food Facts
 * e USDA arrivano dopo e possono non arrivare affatto — in quel caso lo stato
 * diventa "irraggiungibile", che va detto in modo diverso da "nessun
 * risultato".
 *
 * I risultati esterni dei termini già cercati restano in memoria per tutta la
 * visita: correggere una parola, cancellare e riscrivere o tornare su un
 * alimento cercato poco prima non rifà nessuna chiamata.
 */
export function useRicercaAlimenti({
  piatti,
  escludiPiattoId,
}: {
  /** I propri piatti, già caricati dalla pagina: sono la prima fase. */
  piatti: PiattoConValori[];
  /** Piatto da non proporre: quello che si sta modificando. */
  escludiPiattoId?: string;
}) {
  const [q, setQ] = useState("");
  const [cercato, setCercato] = useState("");
  const [esterni, setEsterni] = useState<AlimentoRicerca[]>([]);
  const [stato, setStato] = useState<StatoRicerca>("fermo");

  /**
   * Termine di cui si stanno mostrando i risultati: le risposte che arrivano
   * per un termine diverso (perché nel frattempo si è continuato a scrivere)
   * vanno scartate.
   */
  const attuale = useRef("");
  const memoria = useRef(new Map<string, AlimentoRicerca[]>());
  /**
   * Termini già chiesti alle fonti esterne (in corso o conclusi): premere
   * invio mentre la pausa sta scadendo non deve far partire la stessa ricerca
   * due volte. Un termine che è andato male viene tolto, così "Riprova"
   * può ritentarlo.
   */
  const chiesti = useRef(new Set<string>());

  const termine = q.trim();
  const miei = useMemo(
    () =>
      termine.length >= 2
        ? cercaTraIPiatti(piatti, termine, escludiPiattoId)
        : [],
    [piatti, termine, escludiPiattoId]
  );

  const chiediEsterni = useCallback(async (t: string, riprova = false) => {
    const chiave = t.toLowerCase();
    if (!riprova && chiesti.current.has(chiave)) return;
    chiesti.current.add(chiave);
    try {
      const esito = await cercaAlimentiEsterni(t);
      // In memoria solo gli esiti buoni: un "non hanno risposto" va ritentato.
      if (esito.irraggiungibile) chiesti.current.delete(chiave);
      else memoria.current.set(chiave, esito.risultati);
      if (attuale.current !== t) return;
      setEsterni(esito.risultati);
      setStato(esito.irraggiungibile ? "irraggiungibile" : "ok");
    } catch {
      chiesti.current.delete(chiave);
      if (attuale.current === t) setStato("irraggiungibile");
    }
  }, []);

  /** Ricerca immediata di un termine (invio nel campo, oppure "Riprova"). */
  const cerca = useCallback(
    (t: string, ignoraMemoria = false) => {
      const pulito = t.trim();
      if (pulito.length < 2) return;
      attuale.current = pulito;
      setCercato(pulito);
      setStato("caricando");
      if (ignoraMemoria) memoria.current.delete(pulito.toLowerCase());
      chiediEsterni(pulito, ignoraMemoria);
    },
    [chiediEsterni]
  );

  useEffect(() => {
    attuale.current = termine;

    if (termine.length < 2) {
      setCercato("");
      setEsterni([]);
      setStato("fermo");
      return;
    }

    const noti = memoria.current.get(termine.toLowerCase());
    setCercato(termine);
    setEsterni(noti ?? []);
    setStato(noti ? "ok" : "caricando");
    if (noti) return;

    const timer = setTimeout(() => chiediEsterni(termine), PAUSA_ESTERNI_MS);
    return () => clearTimeout(timer);
  }, [termine, chiediEsterni]);

  return {
    q,
    setQ,
    /** Termine di cui si stanno mostrando i risultati ("" se nessuna ricerca). */
    cercato,
    risultati: [...miei, ...esterni],
    stato,
    cerca,
    riprova: () => {
      if (cercato) cerca(cercato, true);
    },
  };
}
