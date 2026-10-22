import Link from "next/link";
import { SearchX } from "lucide-react";
import { bottonePrimarioClass } from "@/core/components/controls";

/**
 * Quando una pagina dell'app chiama notFound(): un allenamento, una bolletta
 * o un esercizio che non esiste più, o un link vecchio.
 *
 * Sta dentro la cornice dell'app, così da qui si naviga come da ogni altra
 * pagina. Prima si vedeva "404 This page could not be found", in inglese e
 * senza menu.
 */
export default function NonTrovataNellApp() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="h-6 w-6" />
      </span>
      <div>
        <h1 className="text-xl font-semibold">Non c&apos;è più, o non c&apos;è mai stato</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Quello che cerchi è stato cancellato, oppure il link è sbagliato.
        </p>
      </div>
      <Link href="/" className={bottonePrimarioClass}>
        Torna all&apos;inizio
      </Link>
    </div>
  );
}
