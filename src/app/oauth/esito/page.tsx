/**
 * Dove si finisce quando non si può tornare indietro.
 *
 * Capita in un caso solo: l'indirizzo di ritorno non è fra quelli ammessi, e
 * quindi rimandarci anche solo un messaggio d'errore sarebbe già un favore
 * fatto a chi l'ha scelto.
 */
export default async function EsitoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Richiesta non valida</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          L&apos;indirizzo a cui l&apos;applicazione voleva tornare non è fra
          quelli ammessi, quindi non è stato concesso niente.
        </p>
        <p className="mt-4 text-sm">
          <a href="/" className="text-primary hover:underline">
            Torna all&apos;app
          </a>
        </p>
      </div>
    </div>
  );
}
