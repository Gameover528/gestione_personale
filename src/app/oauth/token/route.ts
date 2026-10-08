import { NextResponse } from "next/server";
import { AMBITO, CLIENT_ID } from "@/lib/oauth/config";
import {
  consumaCodice,
  creaToken,
  nuovaSessione,
  pkceCorrisponde,
  rinnova,
} from "@/lib/oauth/token";

/**
 * Lo scambio: un codice (o un rinnovo) diventa un token d'accesso.
 *
 * È l'unico punto in cui si creano permessi, quindi è il punto in cui i
 * controlli non si saltano. I tre che contano davvero:
 *
 *  - il codice si consuma comunque, anche quando poi si rifiuta: presentato
 *    una volta, non vale più;
 *  - `redirect_uri` deve essere **lo stesso** dichiarato chiedendo il consenso,
 *    altrimenti un codice ottenuto per un ritorno varrebbe per un altro;
 *  - PKCE: chi scambia il codice deve dimostrare di essere lo stesso che l'ha
 *    chiesto. Senza, chiunque intercetti il codice al ritorno può spenderlo.
 */

/** Gli errori hanno la forma prevista da OAuth, non una nostra. */
function errore(codice: string, stato = 400) {
  return NextResponse.json(
    { error: codice },
    { status: stato, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  // Il token endpoint parla form-urlencoded: è quello che manda Claude e
  // quello che la specifica impone di accettare.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errore("invalid_request");
  }
  const campo = (k: string) => String(form.get(k) ?? "");

  if (campo("client_id") !== CLIENT_ID) return errore("invalid_client", 401);

  const tipo = campo("grant_type");

  // ---- Rinnovo: il token vecchio muore, ne nasce una coppia nuova ----
  if (tipo === "refresh_token") {
    const coppia = await rinnova(campo("refresh_token"));
    if (!coppia) return errore("invalid_grant");
    return NextResponse.json(
      {
        access_token: coppia.accesso,
        refresh_token: coppia.rinnovo,
        token_type: "Bearer",
        expires_in: coppia.scadeFra,
        scope: AMBITO,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (tipo !== "authorization_code") return errore("unsupported_grant_type");

  const codice = campo("code");
  const verifier = campo("code_verifier");
  const redirectUri = campo("redirect_uri");
  if (!codice || !verifier) return errore("invalid_request");

  // Consuma: da qui in poi, qualunque cosa succeda, quel codice è bruciato.
  const risolto = await consumaCodice(codice);
  if (!risolto) return errore("invalid_grant");

  if (risolto.redirectUri !== redirectUri) return errore("invalid_grant");
  if (!(await pkceCorrisponde(verifier, risolto.codeChallenge))) {
    return errore("invalid_grant");
  }

  const coppia = await creaToken(risolto.userId, nuovaSessione());
  return NextResponse.json(
    {
      access_token: coppia.accesso,
      refresh_token: coppia.rinnovo,
      token_type: "Bearer",
      expires_in: coppia.scadeFra,
      scope: AMBITO,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
