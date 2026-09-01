"use client";

import { useEffect, useRef, useState } from "react";
import { cercaAlimentiEsterni, cercaAlimentiMiei } from "../queries";
import type { AlimentoRicerca } from "../types";

export type StatoRicerca = "fermo" | "caricando" | "ok" | "irraggiungibile";

/**
 * Ricerca alimenti in due fasi, mentre si scrive.
 *
 * I piatti personali sono una query locale e compaiono subito; Open Food Facts
 * e USDA arrivano dopo e possono non arrivare affatto — in quel caso lo stato
 * diventa "irraggiungibile", che va detto in modo diverso da "nessun risultato".
 */
export function useRicercaAlimenti(pausaMs = 400) {
  const [q, setQ] = useState("");
  const [cercato, setCercato] = useState("");
  const [miei, setMiei] = useState<AlimentoRicerca[]>([]);
  const [esterni, setEsterni] = useState<AlimentoRicerca[]>([]);
  const [stato, setStato] = useState<StatoRicerca>("fermo");
  const richiesta = useRef(0);

  async function cerca(termine: string) {
    const token = ++richiesta.current;
    setCercato(termine);
    setStato("caricando");
    setEsterni([]);
    try {
      const locali = await cercaAlimentiMiei(termine);
      if (token === richiesta.current) setMiei(locali);
    } catch {
      if (token === richiesta.current) setMiei([]);
    }
    try {
      const esito = await cercaAlimentiEsterni(termine);
      if (token !== richiesta.current) return;
      setEsterni(esito.risultati);
      setStato(esito.irraggiungibile ? "irraggiungibile" : "ok");
    } catch {
      if (token === richiesta.current) setStato("irraggiungibile");
    }
  }

  useEffect(() => {
    const termine = q.trim();
    if (termine.length < 2) {
      richiesta.current++;
      setCercato("");
      setMiei([]);
      setEsterni([]);
      setStato("fermo");
      return;
    }
    const timer = setTimeout(() => cerca(termine), pausaMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, pausaMs]);

  return {
    q,
    setQ,
    /** Termine di cui si stanno mostrando i risultati ("" se nessuna ricerca). */
    cercato,
    risultati: [...miei, ...esterni],
    stato,
    cerca,
    riprova: () => {
      if (cercato) cerca(cercato);
    },
  };
}
