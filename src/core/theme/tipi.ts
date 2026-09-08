import { ID_STILE_TEMA, cssTema } from "./palette";

/**
 * Tipi e costanti dell'aspetto, in un file separato dalle azioni server:
 * un modulo "use server" può esportare soltanto funzioni async.
 */

export type Tema = "chiaro" | "scuro" | "sistema";

export const TEMI: { value: Tema; label: string }[] = [
  { value: "chiaro", label: "Chiaro" },
  { value: "scuro", label: "Scuro" },
  { value: "sistema", label: "Come il sistema" },
];

export interface Aspetto {
  tema: Tema;
  /** Colore scelto in formato "#rrggbb"; null = palette predefinita. */
  colore: string | null;
}

export const ASPETTO_DEFAULT: Aspetto = { tema: "sistema", colore: null };

/** Accetta solo "#rrggbb": qualunque altra cosa torna al colore predefinito. */
export function coloreValido(c: unknown): string | null {
  return typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c.trim())
    ? c.trim().toLowerCase()
    : null;
}

export function temaValido(t: unknown): t is Tema {
  return t === "chiaro" || t === "scuro" || t === "sistema";
}

/**
 * Applica il tema al documento senza attendere il server, così il cambio è
 * immediato. Da usare solo lato client.
 */
export function applicaTema(t: Tema): void {
  const html = document.documentElement;
  html.setAttribute("data-tema", t);
  const scuro =
    t === "scuro" ||
    (t === "sistema" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  html.classList.toggle("dark", scuro);
  try {
    // Serve alla pagina di accesso, dove non c'è un utente da cui leggere.
    if (t === "sistema") localStorage.removeItem("tema");
    else localStorage.setItem("tema", t);
  } catch {
    // storage non disponibile: la scelta resta salvata sul profilo
  }
}

/**
 * Applica il colore scelto senza attendere il server, sostituendo il foglio di
 * stile che il layout radice genera lato server. Da usare solo lato client.
 */
export function applicaColore(hex: string | null): void {
  const css = cssTema(coloreValido(hex));
  let stile = document.getElementById(ID_STILE_TEMA);
  if (!css) {
    stile?.remove();
    return;
  }
  if (!stile) {
    stile = document.createElement("style");
    stile.id = ID_STILE_TEMA;
    document.head.appendChild(stile);
  }
  stile.textContent = css;
}
