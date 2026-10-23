"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Eye, PenLine, Unplug } from "lucide-react";
import {
  listCollegamenti,
  staccaCollegamento,
  type Collegamento,
} from "@/lib/oauth/collegamenti";
import { Card, CardTitle } from "@/core/components/ui";
import { formatDate } from "@/lib/utils";
import { CLIENT_ID } from "@/lib/oauth/config";

/**
 * Le chat a cui si è dato accesso ai propri dati.
 *
 * Il riquadro c'è sempre. Prima compariva solo con almeno un collegamento, e
 * l'indirizzo da dare a claude.ai stava solo nella documentazione per chi
 * sviluppa: chi non l'aveva mai fatto non sapeva nemmeno che si potesse.
 * Vuoto, ora è la guida per farlo.
 *
 * OGNI RIGA DICE SE QUELLA CHAT PUÒ SCRIVERE, e non è un dettaglio: da quando
 * il permesso esiste, due collegamenti identici a vedersi possono essere uno
 * che guarda e uno che ti aggiunge pasti nel diario. Qui si decide se
 * staccarne uno, e non si può decidere senza sapere cosa fa.
 */
export function ChatCollegate() {
  const [righe, setRighe] = useState<Collegamento[] | null>(null);
  const [inCorso, setInCorso] = useState<string | null>(null);

  useEffect(() => {
    listCollegamenti()
      .then(setRighe)
      .catch(() => setRighe([]));
  }, []);

  async function stacca(sessione: string) {
    setInCorso(sessione);
    try {
      await staccaCollegamento(sessione);
      setRighe((prev) => (prev ?? []).filter((r) => r.sessione !== sessione));
    } finally {
      setInCorso(null);
    }
  }

  if (!righe) return null;

  if (righe.length === 0) {
    return (
      <Card>
        <CardTitle>Collega una chat di Claude</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Puoi chiedere a Claude cosa hai mangiato o come va il peso, e farti
          aiutare a segnare i pasti. La chat vede solo diario e peso, e la
          stacchi quando vuoi da qui.
        </p>
        <GuidaCollegamento />
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Chat collegate</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        Leggono il tuo diario alimentare e il registro del peso. Alcune possono
        anche scriverci, se gliel&apos;hai concesso: lo dice ogni riga. Nessuna
        vede il resto dell&apos;app.
      </p>
      <ul className="mt-3 divide-y">
        {righe.map((r) => (
          <li
            key={r.sessione}
            className="flex items-start justify-between gap-3 py-2.5 text-sm"
          >
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  Collegata il {formatDate(r.creato.slice(0, 10))}
                </span>
                {/*
                  Il permesso si legge come etichetta e non come icona sola:
                  un'icona va indovinata, e qui l'informazione è "questa cosa
                  può scrivere nei miei dati".
                */}
                {r.scrive ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-warning/50 bg-warning/10 px-2 py-0.5 text-xs font-medium">
                    <PenLine className="h-3 w-3 text-warning-testo" />
                    Legge e scrive
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    Solo lettura
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {r.ultimoUso
                  ? `usata l'ultima volta il ${formatDate(r.ultimoUso.slice(0, 10))}`
                  : "non ancora usata"}
              </span>
            </span>
            <button
              onClick={() => stacca(r.sessione)}
              disabled={inCorso === r.sessione}
              className="inline-flex shrink-0 items-center gap-2 rounded-md border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
            >
              <Unplug className="h-3.5 w-3.5" />
              {inCorso === r.sessione ? "Stacco…" : "Stacca"}
            </button>
          </li>
        ))}
      </ul>
      <details className="mt-3 border-t pt-2 text-sm">
        <summary className="cursor-pointer select-none py-2 font-medium">
          Collegarne un&apos;altra
        </summary>
        <GuidaCollegamento />
      </details>
    </Card>
  );
}

/**
 * I tre passi per collegare una chat, con i due valori da incollare pronti da
 * copiare. L'indirizzo si costruisce dal sito in cui si è (sviluppo o
 * produzione), così non si sbaglia ambiente; lo si legge dopo il montaggio
 * perché sul server window non c'è.
 */
function GuidaCollegamento() {
  const [origine, setOrigine] = useState("");
  useEffect(() => setOrigine(window.location.origin), []);
  const indirizzo = origine ? `${origine}/api/mcp` : "";

  return (
    <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm">
      <li>
        Su <strong>claude.ai</strong> apri Impostazioni › Connettori (in inglese
        Settings › Connectors) e scegli <em>Aggiungi connettore personalizzato</em>.
      </li>
      <li>
        Dagli un nome, per esempio «Gestione Personale», e come indirizzo incolla:
        <ValoreDaCopiare valore={indirizzo} etichetta="indirizzo" />
        Nelle impostazioni avanzate, come <em>Client ID</em> incolla:
        <ValoreDaCopiare valore={CLIENT_ID} etichetta="Client ID" />
        Il <em>Client secret</em> resta vuoto.
      </li>
      <li>
        Premi <em>Connetti</em>: si apre questa app, entri se serve e scegli
        Consenti. La pagina dice cosa potrà fare la chat: leggere, oppure anche
        aggiungere pasti e pesate.
      </li>
    </ol>
  );
}

function ValoreDaCopiare({ valore, etichetta }: { valore: string; etichetta: string }) {
  const [copiato, setCopiato] = useState(false);
  async function copia() {
    try {
      await navigator.clipboard.writeText(valore);
      setCopiato(true);
      window.setTimeout(() => setCopiato(false), 2000);
    } catch {
      // Appunti non disponibili: il valore resta selezionabile a mano.
    }
  }
  return (
    <span className="my-1.5 flex items-center gap-2">
      <code className="min-w-0 flex-1 select-all break-all rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
        {valore || "…"}
      </code>
      <button
        type="button"
        onClick={copia}
        disabled={!valore}
        aria-label={`Copia ${etichetta}`}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition hover:bg-accent disabled:opacity-50 lg:min-h-0 lg:py-1.5"
      >
        {copiato ? <Check className="h-3.5 w-3.5 text-success-testo" /> : <Copy className="h-3.5 w-3.5" />}
        {copiato ? "Copiato" : "Copia"}
      </button>
    </span>
  );
}
