export type Ruolo = "superadmin" | "admin" | "utilizzatore";

/**
 * Stato di un account.
 *
 * `in_attesa` è chi si è registrato da sé e non è ancora stato approvato:
 * ha un account e una sessione, ma non vede niente dell'app oltre alla
 * schermata di attesa. È uno stato a parte e non "sospeso" perché le due cose
 * si raccontano in modo diverso — «stiamo guardando la tua richiesta» non è
 * «ti abbiamo tolto l'accesso» — e perché nell'elenco degli utenti le
 * richieste da esaminare devono stare in evidenza, non mescolate ai sospesi.
 */
export type StatoAccount = "attivo" | "in_attesa" | "sospeso" | "bloccato";

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
