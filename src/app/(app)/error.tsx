"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { bottoneClass, bottonePrimarioClass } from "@/core/components/controls";

/**
 * Quando una pagina dell'app va in errore.
 *
 * Prima non c'era: si vedeva la pagina inglese di Next, "Application error: a
 * server-side exception has occurred", senza menu e senza un modo di uscirne.
 * Nell'app installata sul telefono, a schermo intero, non c'è nemmeno il tasto
 * indietro del browser: l'unica via era chiudere l'app.
 *
 * Questa sta dentro la cornice dell'app (barra in basso, intestazione), quindi
 * si può sempre andare altrove. "Riprova" rifà la pagina senza ricaricare
 * tutto; il codice in fondo è quello che Cloudflare registra nei log, e
 * serve a chi deve capire cos'è successo.
 */
export default function ErrorePagina({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  /*
    reset() da solo ridisegna la pagina con quello che il server aveva già
    mandato, errore compreso: per una pagina che legge il database, toccare
    "Riprova" mostrava di nuovo lo stesso errore anche a guasto passato.
    refresh() la richiede davvero al server, e reset() la ridisegna.
  */
  function riprova() {
    avvia(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <div>
        <h1 className="text-xl font-semibold">Qualcosa non ha funzionato</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La pagina non si è caricata. Di solito basta riprovare; se succede
          ancora, il problema è nostro e non dei tuoi dati.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={riprova} disabled={inCorso} className={bottonePrimarioClass}>
          <RotateCcw className={inCorso ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {inCorso ? "Riprovo…" : "Riprova"}
        </button>
        <Link href="/" className={bottoneClass}>
          Torna all&apos;inizio
        </Link>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground">
          Codice dell&apos;errore: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </div>
  );
}
