"use client";

import "./globals.css";

/**
 * L'ultima rete: un errore così grave da rompere anche la cornice dell'app
 * (il layout radice). Sostituisce tutta la pagina, quindi porta con sé html e
 * body, e non usa niente dell'app che potrebbe essere proprio la causa.
 * Prima al suo posto c'era la pagina inglese di Next.
 */
export default function ErroreGlobale({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it">
      <body className="bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-lg border bg-card p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold">L&apos;app non si è caricata</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Riprova fra un momento. Se l&apos;app è installata sul telefono e
              non riparte, chiudila e riaprila.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {/* Ricarica vera e non reset(): qui si è rotto il layout radice, e
                  ridisegnarlo con lo stesso contenuto riprodurrebbe l'errore. */}
              <button
                onClick={() => window.location.reload()}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Riprova
              </button>
              {/* Un <a> e non <Link>: qui il router dell'app potrebbe essere rotto. */}
              <a
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-accent"
              >
                Ricarica dall&apos;inizio
              </a>
            </div>
            {error.digest && (
              <p className="mt-4 text-xs text-muted-foreground">
                Codice dell&apos;errore: <span className="font-mono">{error.digest}</span>
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
