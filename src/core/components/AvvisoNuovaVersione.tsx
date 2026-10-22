"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

/** La build di questo codice, scritta da next.config.mjs al momento della compilazione. */
const BUILD = process.env.ID_BUILD;

/** Non più di un controllo al minuto, qualunque cosa lo chieda. */
const INTERVALLO_MIN_MS = 60_000;
const CONTROLLO_PERIODICO_MS = 5 * 60_000;

/**
 * "È uscita una nuova versione: aggiorna."
 *
 * PERCHÉ SERVE. A ogni pubblicazione cambiano gli identificativi delle server
 * action e i file JavaScript. L'app installata sul telefono resta aperta per
 * giorni, col codice vecchio: dopo un rilascio ogni salvataggio chiama
 * un'azione che il server non conosce più ("Failed to find Server Action") e
 * fallisce, finché l'utente non chiude e riapre l'app — cosa che nessuno gli
 * dice di fare.
 *
 * COME. Il codice in esecuzione conosce la propria build; /api/versione dice
 * quella pubblicata. Se sono diverse compare l'avviso. Si controlla quando
 * l'app torna in primo piano (il caso tipico: la si riapre dal telefono),
 * ogni cinque minuti mentre è visibile, e subito dopo un errore che ha la
 * faccia del codice vecchio.
 *
 * Non ricarica da sé: chi sta compilando un modulo perderebbe quello che ha
 * scritto. Lo si propone, e si ricarica al tocco.
 */
export function AvvisoNuovaVersione() {
  const [nuova, setNuova] = useState(false);

  useEffect(() => {
    if (!BUILD) return;
    let ultimo = 0;

    async function controlla(forza = false) {
      if (document.visibilityState !== "visible") return;
      const ora = Date.now();
      if (!forza && ora - ultimo < INTERVALLO_MIN_MS) return;
      ultimo = ora;
      try {
        const res = await fetch("/api/versione", { cache: "no-store" });
        const { build } = (await res.json()) as { build?: string };
        if (build && build !== BUILD) setNuova(true);
      } catch {
        // Rete assente o sessione scaduta: niente da dire, si riprova dopo.
      }
    }

    const suVisibilita = () => void controlla();
    const suErrore = (e: PromiseRejectionEvent | ErrorEvent) => {
      const r = "reason" in e ? e.reason : e.error;
      const testo = String(r?.message ?? r?.name ?? ("message" in e ? e.message : ""));
      if (/Server Action|ChunkLoadError|Loading chunk|dynamically imported module/i.test(testo)) {
        void controlla(true);
      }
    };

    document.addEventListener("visibilitychange", suVisibilita);
    window.addEventListener("unhandledrejection", suErrore);
    window.addEventListener("error", suErrore);
    const periodico = window.setInterval(suVisibilita, CONTROLLO_PERIODICO_MS);
    return () => {
      document.removeEventListener("visibilitychange", suVisibilita);
      window.removeEventListener("unhandledrejection", suErrore);
      window.removeEventListener("error", suErrore);
      window.clearInterval(periodico);
    };
  }, []);

  /*
    IN ALTO, NON IN BASSO. In basso stava sopra la barra di navigazione e
    finiva addosso a tutto quello che vive lì: i toast con "Annulla" (un tocco
    su "Aggiorna" poteva annullare una cancellazione), le ultime voci del
    foglio "Vai a" e il fondo di ogni pagina, che non scorreva abbastanza per
    uscirne. In alto, sotto l'intestazione, non incontra niente di tutto
    questo; z-40 lo lascia sotto i fogli e le finestre (z-50), che quando sono
    aperti devono stare davanti. "Più tardi" lo chiude: tornerà al controllo
    successivo.

    La regione role="status" resta sempre nella pagina e si riempie quando
    serve: una regione che compare già piena molti lettori di schermo non la
    annunciano.
  */
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-4 top-[4.25rem] z-40 mx-auto max-w-md lg:inset-x-auto lg:right-4 lg:top-4"
    >
      {nuova && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-lg border bg-card p-3 text-sm shadow-lg">
          <span className="flex-1">È uscita una nuova versione dell&apos;app.</span>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground transition hover:opacity-90 lg:min-h-0"
          >
            <RefreshCw className="h-4 w-4" />
            Aggiorna
          </button>
          <button
            onClick={() => setNuova(false)}
            aria-label="Più tardi"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent lg:h-8 lg:w-8"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
