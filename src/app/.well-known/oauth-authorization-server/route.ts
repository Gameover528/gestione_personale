import { NextResponse } from "next/server";
import { AMBITO } from "@/lib/oauth/config";

/**
 * Il biglietto da visita di chi rilascia i permessi (RFC 8414).
 *
 * Dice dove si chiede il consenso, dove si scambia il codice, e soprattutto
 * cosa si pretende da chi chiede: solo `code`, solo PKCE con S256, e nessuna
 * password del client.
 *
 * `code_challenge_methods_supported: ["S256"]` non è una dichiarazione di
 * gentilezza: senza PKCE un client pubblico come questo sarebbe attaccabile
 * intercettando il codice al ritorno, e dichiararlo qui è il modo in cui il
 * client sa che deve usarlo.
 *
 * Niente `registration_endpoint`: il client è uno solo e si configura a mano
 * ("usa il tuo client OAuth"), quindi non c'è niente da registrare al volo.
 */
export async function GET(req: Request) {
  const base = new URL(req.url).origin;
  return NextResponse.json(
    {
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/oauth/token`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      // Client pubblico: non manda nessuna password al token endpoint.
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: [AMBITO],
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
