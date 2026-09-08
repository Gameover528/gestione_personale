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
}

export const ASPETTO_DEFAULT: Aspetto = { tema: "sistema" };

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
