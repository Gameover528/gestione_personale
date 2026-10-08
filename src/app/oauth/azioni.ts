"use server";

import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/auth/session";
import { ambitiRichiesti, redirectUriAmmesso } from "@/lib/oauth/config";
import { creaCodice } from "@/lib/oauth/token";

/**
 * La decisione presa sulla pagina del consenso.
 *
 * I parametri arrivano da campi nascosti, cioè dal client, quindi si
 * ricontrolla tutto: che l'indirizzo di ritorno sia ancora fra quelli
 * ammessi e che la sfida PKCE ci sia. Che fossero già stati controllati
 * disegnando la pagina non conta niente — fra il disegno e l'invio c'è un
 * giro di rete, e in mezzo può esserci chiunque.
 */
export async function autorizza(formData: FormData): Promise<void> {
  const utente = await requireSessionUser();

  const redirectUri = String(formData.get("redirect_uri") || "");
  const state = String(formData.get("state") || "");
  const challenge = String(formData.get("code_challenge") || "");
  // Si rinormalizza: l'ambito arriva da un campo nascosto, cioe' dal client.
  const ambito = ambitiRichiesti(String(formData.get("scope") || "")).join(" ");
  const decisione = String(formData.get("decisione") || "");

  // Indirizzo non ammesso: non si rimanda niente da nessuna parte.
  if (!redirectUriAmmesso(redirectUri)) {
    redirect("/oauth/esito?stato=indirizzo");
  }

  const u = new URL(redirectUri);
  if (state) u.searchParams.set("state", state);

  if (decisione !== "consenti") {
    // Il rifiuto si comunica: il client deve poter dire "non hai accettato"
    // invece di restare ad aspettare.
    u.searchParams.set("error", "access_denied");
    redirect(u.toString());
  }

  if (!challenge) {
    u.searchParams.set("error", "invalid_request");
    redirect(u.toString());
  }

  const codice = await creaCodice(utente.id, challenge, redirectUri, ambito);
  u.searchParams.set("code", codice);
  redirect(u.toString());
}
