"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getBollettePreferenze,
  saveBollettePreferenze,
  type BollettePreferenze,
} from "../queries";
import { ObiettiviForm } from "@/modules/alimentazione/components/ObiettiviForm";
import {
  getPreferenzeEsercizio,
  savePreferenzeEsercizio,
} from "@/modules/esercizio/queries";
import { Card, CardTitle } from "@/core/components/ui";

export function PreferenzeModuli() {
  const [pref, setPref] = useState<BollettePreferenze>({
    persone_tue: 3,
    persone_altre: 2,
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [salvato, setSalvato] = useState(false);

  useEffect(() => {
    getBollettePreferenze().then((p) => {
      setPref(p);
      setLoaded(true);
    });
  }, []);

  async function salva(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSalvato(false);
    try {
      await saveBollettePreferenze(pref);
      setSalvato(true);
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
        {loaded && (
          <form onSubmit={salva} className="mt-3 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Persone (voi)</label>
              <input
                type="number"
                min={0}
                value={pref.persone_tue}
                onChange={(e) =>
                  setPref((p) => ({ ...p, persone_tue: Number(e.target.value) }))
                }
                className="w-24 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                Persone (altra famiglia)
              </label>
              <input
                type="number"
                min={0}
                value={pref.persone_altre}
                onChange={(e) =>
                  setPref((p) => ({
                    ...p,
                    persone_altre: Number(e.target.value),
                  }))
                }
                className="w-24 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Salvataggio…" : "Salva"}
            </button>
            {salvato && <span className="text-sm text-success">Salvato</span>}
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
  const [giorni, setGiorni] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [salvato, setSalvato] = useState(false);

  useEffect(() => {
    getPreferenzeEsercizio().then((p) => {
      setGiorni(p.giorniSettimana);
      setLoaded(true);
    });
  }, []);

  async function salva(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSalvato(false);
    try {
      await savePreferenzeEsercizio({ giorniSettimana: giorni });
      setSalvato(true);
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
      {loaded && (
        <form onSubmit={salva} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="giorni-allenamento" className="text-sm font-medium">
              Giorni a settimana
            </label>
            <input
              id="giorni-allenamento"
              type="number"
              min={0}
              max={7}
              value={giorni}
              onChange={(e) => setGiorni(Number(e.target.value))}
              className="w-24 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Salvataggio…" : "Salva"}
          </button>
          {salvato && <span className="text-sm text-success">Salvato</span>}
          <p className="w-full text-xs text-muted-foreground">
            Zero significa nessun obiettivo: l&apos;Andamento si limita a contare
            i giorni in cui ti sei allenato.
          </p>
        </form>
      )}
    </Card>
  );
}
