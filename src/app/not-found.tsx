import Link from "next/link";

/**
 * Un indirizzo che non corrisponde a nessuna pagina. Fuori dalla cornice
 * dell'app perché può arrivarci anche chi non è entrato: "Torna all'inizio"
 * porta all'app o al login, secondo i casi.
 */
export default function NonTrovata() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Pagina non trovata</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          L&apos;indirizzo non corrisponde a nessuna pagina. Forse è un link
          vecchio, o c&apos;è un errore di battitura.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Torna all&apos;inizio
        </Link>
      </div>
    </div>
  );
}
