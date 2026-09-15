"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GiornoAllenamento } from "../allenamenti";
import { oggiIso, spostaGiorno } from "@/lib/utils";

function giorniDelPeriodo(giorni: number): string[] {
  const fine = oggiIso();
  const out: string[] = [];
  for (let i = giorni - 1; i >= 0; i--) out.push(spostaGiorno(fine, -i));
  return out;
}

function etichettaGiorno(iso: string): string {
  const [, m, g] = iso.split("-");
  return `${g}/${m}`;
}

/**
 * L'andamento dell'allenamento: quanto ci si è allenati e quanto si è bruciato.
 *
 * Il confronto con le calorie mangiate non sta qui ma nella sezione Cibo, dove
 * le due barre si leggono insieme: averne una copia anche in questa sezione
 * voleva dire disegnare lo stesso dato due volte.
 */
export function AndamentoAllenamenti({
  giorni,
  dati,
  giorniSettimana,
}: {
  giorni: number;
  /** Giorni con allenamenti, o null mentre si caricano. */
  dati: GiornoAllenamento[] | null;
  /**
   * Giorni a settimana che ci si è prefissati (0 = nessun obiettivo). Da
   * Impostazioni › Preferenze moduli.
   */
  giorniSettimana: number;
}) {
  const serie = useMemo(() => {
    const perData = new Map((dati ?? []).map((g) => [g.data, g]));
    return giorniDelPeriodo(giorni).map((data) => {
      const a = perData.get(data);
      return {
        data,
        label: etichettaGiorno(data),
        // I giorni senza allenamento valgono null e non zero, come già fatto
        // per i pasti: con zero il grafico disegna una barra invisibile su ogni
        // giorno vuoto e il passaggio del mouse annuncia "0 min" dove non c'è
        // niente da annunciare.
        minuti: a?.minuti || null,
      };
    });
  }, [dati, giorni]);

  const conDati = dati ?? [];
  const totali = useMemo(
    () => ({
      sessioni: conDati.reduce((s, g) => s + g.sessioni, 0),
      minuti: conDati.reduce((s, g) => s + g.minuti, 0),
      kcal: conDati.reduce((s, g) => s + g.kcal, 0),
    }),
    [conDati]
  );

  if (dati === null) {
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  }

  if (conDati.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nessun allenamento registrato in questo periodo.
        </p>
      </div>
    );
  }

  const perSettimana = (totali.sessioni / giorni) * 7;

  /**
   * Quanti giorni di allenamento ci si aspettava nel periodo, secondo
   * l'obiettivo settimanale. Senza obiettivo si resta sul semplice conteggio:
   * confrontare i giorni allenati con *tutti* i giorni del calendario darebbe
   * sempre percentuali basse e senza significato, perché nessuno si allena
   * sette giorni su sette.
   */
  const attesi = giorniSettimana > 0 ? Math.round((giorni / 7) * giorniSettimana) : 0;
  const aderenza =
    attesi > 0 ? Math.round((conDati.length / attesi) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Riquadro
          titolo="Allenamenti"
          valore={String(totali.sessioni)}
          nota={
            giorniSettimana > 0
              ? `${perSettimana.toFixed(1)} a settimana su ${giorniSettimana}`
              : `${perSettimana.toFixed(1)} a settimana`
          }
        />
        <Riquadro
          titolo="Tempo totale"
          valore={`${totali.minuti} min`}
          nota={
            totali.sessioni > 0
              ? `${Math.round(totali.minuti / totali.sessioni)} min a sessione`
              : "—"
          }
        />
        <Riquadro
          titolo="Calorie bruciate"
          valore={totali.kcal > 0 ? totali.kcal.toLocaleString("it-IT") : "—"}
          // Senza stima i motivi sono due — durata non indicata sugli
          // allenamenti, oppure peso corporeo mancante — e dirne uno solo manda
          // a cercare nel posto sbagliato.
          nota={
            totali.kcal > 0
              ? "stima sul periodo"
              : "servono la durata e il peso corporeo"
          }
        />
        <Riquadro
          titolo="Giorni con allenamento"
          valore={
            attesi > 0 ? `${conDati.length} / ${attesi}` : String(conDati.length)
          }
          nota={
            aderenza === null
              ? "imposta i giorni a settimana nelle preferenze"
              : `${aderenza}% di quanto ti eri prefissato`
          }
        />
      </div>

      {/*
        Il confronto fra mangiate e bruciate sta nella sezione Cibo, dove le
        calorie si leggono insieme al resto: tenerne una copia anche qui
        significava disegnare due volte lo stesso dato. Qui resta ciò che
        riguarda solo l'allenamento.
      */}
      <div className="rounded-lg border p-4">
        <p className="mb-3 text-sm font-semibold">Minuti di allenamento per giorno</p>
        <div
          role="img"
          aria-label={`Minuti di allenamento per giorno negli ultimi ${giorni} giorni, ${totali.minuti} minuti in totale.`}
          className="h-48 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis
                dataKey="label"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => [`${v} min`, "Allenamento"]} />
              <Bar
                isAnimationActive={false}
                dataKey="minuti"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Riquadro({
  titolo,
  valore,
  nota,
}: {
  titolo: string;
  valore: string;
  nota: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {titolo}
      </p>
      <p className="mt-1 text-xl font-semibold">{valore}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p>
    </div>
  );
}
