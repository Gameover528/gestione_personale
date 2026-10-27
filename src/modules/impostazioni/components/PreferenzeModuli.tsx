"use client";

import { useEffect, useState, type FormEvent } from "react";
import { StatoErrore } from "@/core/components/Dati";
import {
  getBollettePreferenze,
  saveBollettePreferenze,
} from "../queries";
import { ObiettiviForm } from "@/modules/alimentazione/components/ObiettiviForm";
import {
  getPreferenzeEsercizio,
  savePreferenzeEsercizio,
} from "@/modules/esercizio/queries";
import { Card, CardTitle } from "@/core/components/ui";
import { inputClass, bottonePrimarioClass } from "@/core/components/controls";
import { useToast } from "@/core/components/Toast";
import { cn } from "@/lib/utils";
import { PERSONE_MAX } from "@/modules/bollette/types";

/** Un intero dentro l'intervallo, o null: "" e "2,5" non diventano piu' 0 e 2. */
function intero(testo: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(testo.trim())) return null;
  const n = Number(testo);
  return n >= min && n <= max ? n : null;
}

export function PreferenzeModuli() {
  const toast = useToast();
  // Testo, non numero: un campo svuotato resta vuoto invece di diventare 0.
  const [pref, setPref] = useState({ persone_tue: "3", persone_altre: "2" });
  const [invalido, setInvalido] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [salvato, setSalvato] = useState(false);
  // Se la lettura fallisce lo si dice: prima la sezione restava vuota, senza
  // modulo e senza spiegazione.
  const [errore, setErrore] = useState(false);
  const [giro, setGiro] = useState(0);

  useEffect(() => {
    setErrore(false);
    getBollettePreferenze()
      .then((p) => {
        setPref({ persone_tue: String(p.persone_tue), persone_altre: String(p.persone_altre) });
        setLoaded(true);
      })
      .catch(() => setErrore(true));
  }, [giro]);

  async function salva(e: FormEvent) {
    e.preventDefault();
    setSalvato(false);
    const tue = intero(pref.persone_tue, 1, PERSONE_MAX);
    const altre = intero(pref.persone_altre, 1, PERSONE_MAX);
    if (tue === null || altre === null) {
      setInvalido(true);
      // Il focus sul campo da correggere fa rileggere l'errore anche al
      // secondo tentativo, quando l'avviso e' gia' a video e non cambia.
      document.getElementById(tue === null ? "persone-tue" : "persone-altre")?.focus();
      return;
    }
    setInvalido(false);
    setSaving(true);
    try {
      await saveBollettePreferenze({ persone_tue: tue, persone_altre: altre });
      setSalvato(true);
    } catch {
      // Prima un salvataggio fallito non diceva niente: sembrava andato.
      toast({ messaggio: "Non sono riuscito a salvare. Controlla la connessione e riprova.", tono: "errore" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Bollette — divisione di default</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Valori proposti automaticamente quando crei una nuova bolletta da
          dividere con un&apos;altra famiglia.
        </p>
        {errore && (
          <div className="mt-3">
            <StatoErrore onRiprova={() => setGiro((g) => g + 1)} />
          </div>
        )}
        {loaded && (
          <form onSubmit={salva} className="mt-3 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="persone-tue" className="text-sm font-medium">
                Persone (voi)
              </label>
              <input
                id="persone-tue"
                type="text"
                inputMode="numeric"
                value={pref.persone_tue}
                onChange={(e) => setPref((p) => ({ ...p, persone_tue: e.target.value }))}
                aria-invalid={invalido && intero(pref.persone_tue, 1, PERSONE_MAX) === null}
                aria-describedby={invalido ? "persone-errore" : undefined}
                className={cn(inputClass, "w-24")}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="persone-altre" className="text-sm font-medium">
                Persone (altra famiglia)
              </label>
              <input
                id="persone-altre"
                type="text"
                inputMode="numeric"
                value={pref.persone_altre}
                onChange={(e) => setPref((p) => ({ ...p, persone_altre: e.target.value }))}
                aria-invalid={invalido && intero(pref.persone_altre, 1, PERSONE_MAX) === null}
                aria-describedby={invalido ? "persone-errore" : undefined}
                className={cn(inputClass, "w-24")}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className={bottonePrimarioClass}
            >
              {saving ? "Salvataggio…" : "Salva"}
            </button>
            <span role="status" className="text-sm text-success-testo">
              {salvato ? "Salvato" : ""}
            </span>
            {invalido && (
              <p id="persone-errore" role="alert" className="w-full text-sm text-destructive">
                Scrivi un numero intero da 1 a {PERSONE_MAX} in tutti e due i campi.
              </p>
            )}
          </form>
        )}
      </Card>

      <Card>
        <CardTitle>Alimentazione — obiettivi nutrizionali</CardTitle>
        <div className="mt-3">
          <ObiettiviForm embedded />
        </div>
      </Card>

      <GiorniAllenamento />
    </div>
  );
}

/**
 * Quanti giorni a settimana ci si è prefissati di allenarsi.
 *
 * Serve a dare un metro all'aderenza nell'Andamento: "2 giorni su 30" non dice
 * niente, perché nessuno si allena tutti i giorni del mese. Con un obiettivo,
 * il confronto diventa "2 su 17" e ha un senso.
 */
function GiorniAllenamento() {
  const toast = useToast();
  const [giorni, setGiorni] = useState("0");
  const [invalido, setInvalido] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [salvato, setSalvato] = useState(false);
  const [errore, setErrore] = useState(false);
  const [giro, setGiro] = useState(0);

  useEffect(() => {
    setErrore(false);
    getPreferenzeEsercizio()
      .then((p) => {
        setGiorni(String(p.giorniSettimana));
        setLoaded(true);
      })
      .catch(() => setErrore(true));
  }, [giro]);

  async function salva(e: FormEvent) {
    e.preventDefault();
    setSalvato(false);
    const n = intero(giorni, 0, 7);
    if (n === null) {
      setInvalido(true);
      document.getElementById("giorni-allenamento")?.focus();
      return;
    }
    setInvalido(false);
    setSaving(true);
    try {
      await savePreferenzeEsercizio({ giorniSettimana: n });
      setSalvato(true);
    } catch {
      toast({ messaggio: "Non sono riuscito a salvare. Controlla la connessione e riprova.", tono: "errore" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardTitle>Esercizio — giorni di allenamento a settimana</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        Quante volte a settimana conti di allenarti. L&apos;Andamento userà
        questo numero per dirti quanto ti sei avvicinato al programma, invece di
        confrontare i giorni allenati con tutti quelli del calendario.
      </p>
      {errore && (
        <div className="mt-3">
          <StatoErrore onRiprova={() => setGiro((g) => g + 1)} />
        </div>
      )}
      {loaded && (
        <form onSubmit={salva} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="giorni-allenamento" className="text-sm font-medium">
              Giorni a settimana
            </label>
            <input
              id="giorni-allenamento"
              type="text"
              inputMode="numeric"
              value={giorni}
              onChange={(e) => setGiorni(e.target.value)}
              aria-invalid={invalido}
              aria-describedby={invalido ? "giorni-errore" : undefined}
              className={cn(inputClass, "w-24")}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className={bottonePrimarioClass}
          >
            {saving ? "Salvataggio…" : "Salva"}
          </button>
          <span role="status" className="text-sm text-success-testo">
            {salvato ? "Salvato" : ""}
          </span>
          {invalido && (
            <p id="giorni-errore" role="alert" className="w-full text-sm text-destructive">
              Scrivi un numero intero da 0 a 7.
            </p>
          )}
          <p className="w-full text-xs text-muted-foreground">
            Zero significa nessun obiettivo: l&apos;Andamento si limita a contare
            i giorni in cui ti sei allenato.
          </p>
        </form>
      )}
    </Card>
  );
}
