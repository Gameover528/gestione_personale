"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { macroAree, getMacroAreaForPath } from "@/core/modules/registry";
import { hrefAttivo, vociBarra, type VoceBarra } from "@/core/navigazione/barra";
import { cn } from "@/lib/utils";
import type { Ruolo } from "@/lib/auth/roles";

/**
 * Navigazione su telefono: le pagine dell'area in cui ci si trova, in basso,
 * a portata di pollice. Sul desktop resta la sidebar (qui è `lg:hidden`).
 *
 * Le voci cambiano con l'area — è il prezzo scelto per non seppellire nessuna
 * pagina sotto un secondo livello: l'area si cambia dall'intestazione.
 */
export function BarraInferiore({ ruolo }: { ruolo?: Ruolo }) {
  const pathname = usePathname();
  const area = getMacroAreaForPath(pathname) ?? macroAree[0];
  const voci = vociBarra(area, ruolo);
  const attivo = hrefAttivo(
    pathname,
    voci.map((v) => v.href)
  );

  return (
    <nav
      aria-label={`Navigazione ${area.label}`}
      /*
        pb-[env(safe-area-inset-bottom)]: sui telefoni con la barra gestuale
        l'ultima riga di pixel non è cliccabile, quindi la barra si alza da sé.
      */
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-card lg:hidden",
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <ul className="flex items-stretch">
        {voci.map((voce) => (
          <li key={voce.href} className="min-w-0 flex-1">
            <Voce voce={voce} attiva={attivo === voce.href} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Voce({ voce, attiva }: { voce: VoceBarra; attiva: boolean }) {
  const Icon = voce.icon;

  return (
    <Link
      href={voce.href}
      aria-current={attiva ? "page" : undefined}
      /*
        Niente precaricamento: la barra è sempre a schermo e ogni salvataggio
        invalida la cache del router, quindi le pagine non aperte verrebbero
        riscaricate dopo ogni modifica — la stessa spesa già tolta dalla
        sidebar. Si paga solo il primo tocco su una voce.
      */
      prefetch={false}
      /*
        Contenuto ancorato in basso (justify-end), non centrato: così le
        etichette di tutte le voci stanno sulla stessa linea, e il cerchio
        dell'azione principale — più grande — cresce verso l'alto invece di
        spingere la propria etichetta contro il bordo.
      */
      className={cn(
        "flex h-16 flex-col items-center justify-end gap-1 px-1 pb-2 transition",
        attiva ? "text-primary" : "text-muted-foreground active:bg-accent"
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full transition",
          // L'azione principale è un bersaglio pieno e più grande: si trova
          // senza guardare, che è il punto di averla al centro.
          voce.azione
            ? "h-10 w-10 bg-primary text-primary-foreground shadow-md"
            : "h-6 w-6"
        )}
      >
        <Icon className={voce.azione ? "h-6 w-6" : "h-5 w-5"} />
      </span>
      <span
        className={cn(
          "w-full truncate text-center text-[11px] leading-none",
          (attiva || voce.azione) && "font-semibold"
        )}
      >
        {voce.label}
      </span>
    </Link>
  );
}
