export type Ruolo = "superadmin" | "admin" | "utilizzatore";
export type StatoAccount = "attivo" | "sospeso" | "bloccato";

/** Admin e superadmin possono gestire gli altri account. */
export function puoGestireUtenti(ruolo: Ruolo): boolean {
  return ruolo === "superadmin" || ruolo === "admin";
}

/** Solo il superadmin può agire su un account superadmin (di fatto: nessuno, non essendoci azioni dedicate). */
export function puoModificare(richiedente: Ruolo, target: Ruolo): boolean {
  if (target === "superadmin") return false; // un superadmin non è mai modificabile/bloccabile da UI
  if (!puoGestireUtenti(richiedente)) return false;
  return true;
}
