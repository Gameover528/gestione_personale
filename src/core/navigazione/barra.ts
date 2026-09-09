import { LayoutDashboard } from "lucide-react";
import type { MacroAreaConfig, NavItem } from "@/core/modules/types";
import { puoGestireUtenti, type Ruolo } from "@/lib/auth/roles";

/**
 * Quante voci può mostrare la barra di navigazione su telefono.
 *
 * Cinque è il limite pratico di una barra in basso: sotto i 360 px di
 * larghezza una sesta colonna riduce l'etichetta a due parole tagliate e il
 * bersaglio del dito sotto i 44 px. Superata la soglia va deciso cosa scende
 * di un livello, non stretta un'altra colonna.
 */
export const MAX_VOCI_BARRA = 5;

export interface VoceBarra {
  label: string;
  href: string;
  icon: NavItem["icon"];
  /**
   * Azione principale dell'area (il "＋"): sta al centro, in rilievo, perché
   * è la cosa che si fa più spesso — non una pagina da consultare.
   */
  azione?: boolean;
}

/** Etichetta da usare in barra: quella corta se il modulo ne dichiara una. */
function etichetta(voce: NavItem): string {
  return voce.labelBreve ?? voce.label;
}

/**
 * Le voci della barra di un'area: il riepilogo (se l'area ha una dashboard),
 * le pagine dei suoi moduli e, al centro, l'azione principale.
 *
 * La barra si costruisce dal registro dei moduli, non da un elenco a parte:
 * aggiungere un modulo o una pagina aggiorna la navigazione da sé, come già
 * accade per la sidebar.
 */
export function vociBarra(area: MacroAreaConfig, ruolo?: Ruolo): VoceBarra[] {
  const voci: VoceBarra[] = [];

  if (area.dashboardHref) {
    voci.push({
      label: "Riepilogo",
      href: area.dashboardHref,
      icon: LayoutDashboard,
    });
  }

  for (const modulo of area.moduli) {
    for (const voce of modulo.nav) {
      if (voce.adminOnly && !(ruolo && puoGestireUtenti(ruolo))) continue;
      voci.push({ label: etichetta(voce), href: voce.href, icon: voce.icon });
    }
  }

  // L'azione principale va al centro: è il punto più comodo per il pollice.
  const azione = area.moduli.find((m) => m.azionePrincipale)?.azionePrincipale;
  if (azione) {
    voci.splice(Math.ceil(voci.length / 2), 0, {
      label: etichetta(azione),
      href: azione.href,
      icon: azione.icon,
      azione: true,
    });
  }

  if (process.env.NODE_ENV !== "production" && voci.length > MAX_VOCI_BARRA) {
    // Non taglio in silenzio: quali voci sacrificare è una decisione di
    // progetto, e va presa guardando l'area, non dal codice che disegna.
    console.warn(
      `[navigazione] L'area "${area.id}" ha ${voci.length} voci di barra ` +
        `(massimo ${MAX_VOCI_BARRA}): decidi cosa spostare in una pagina interna.`
    );
  }

  return voci;
}

/**
 * Tra più href che corrispondono al percorso corrente ritorna il più
 * specifico: "/alimentazione/piatti" vince su "/alimentazione", altrimenti
 * il diario risulterebbe attivo su tutte le pagine dell'area.
 */
export function hrefAttivo(pathname: string, hrefs: string[]): string | null {
  let migliore: string | null = null;
  for (const href of hrefs) {
    if (pathname === href || pathname.startsWith(href + "/")) {
      if (!migliore || href.length > migliore.length) migliore = href;
    }
  }
  return migliore;
}
