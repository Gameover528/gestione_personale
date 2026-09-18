import { NextResponse, type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const COOKIE_NAME = "session";

/**
 * Intestazioni di sicurezza applicate a ogni risposta.
 *
 * - `frame-ancestors 'none'` / X-Frame-Options: la pagina non è
 *   incorniciabile, quindi niente clickjacking (nessuno può sovrapporre la
 *   nostra UI dentro un iframe su un altro sito).
 * - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`: chiudono i
 *   vettori classici (plugin, dirottamento del base href, invio di form verso
 *   domini esterni).
 * - `script-src` con nonce + `strict-dynamic`: eseguono solo gli script che
 *   portano il nonce di questa richiesta (lo script del tema in layout.tsx e
 *   quelli iniettati da Next, a cui Next aggiunge il nonce da solo leggendolo
 *   dalla CSP). Uno script iniettato da un ipotetico XSS, senza nonce, non
 *   parte. `style-src 'unsafe-inline'` resta perché i componenti usano
 *   attributi `style=""` inline (grafici, ecc.): l'iniezione di stile è molto
 *   meno pericolosa di quella di script.
 * - HSTS: dice al browser di usare sempre HTTPS per questo dominio.
 */

/**
 * Vero solo sotto `next dev`. Next sostituisce questa espressione con una
 * costante quando compila, quindi in produzione il ramo di sviluppo sparisce
 * dal bundle: non è una condizione valutata a ogni richiesta, e nessuno può
 * riattivarla dall'esterno.
 */
const SVILUPPO = process.env.NODE_ENV === "development";

function costruisciCsp(nonce: string): string {
  return [
    "default-src 'self'",
    /*
      In sviluppo serve `unsafe-eval`, e non è un cedimento: il server di
      sviluppo di Next costruisce i moduli e applica le modifiche a caldo
      valutando stringhe come codice. Senza, la CSP le blocca, React non si
      aggancia alla pagina e l'app resta un documento morto — i clic non fanno
      niente e funziona solo quello che i form sanno fare da soli inviandosi.
      Ci è già costato una verifica intera fatta a vuoto.

      Il nonce e `strict-dynamic` restano anche qui, così quello che si prova
      in locale è la stessa politica che va in produzione, meno questa deroga.
      In produzione la riga è esattamente quella di prima.
    */
    SVILUPPO
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    // Sempre in sviluppo: il ricaricamento a caldo passa da un websocket.
    SVILUPPO ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Niente `upgrade-insecure-requests`: in produzione è già tutto HTTPS (con
    // HSTS a rinforzo) e in locale (`next dev` su http://localhost) quella
    // direttiva forzerebbe l'upgrade a https rompendo le richieste.
  ].join("; ");
}

function applicaHeaderSicurezza(res: NextResponse, csp: string): NextResponse {
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  return res;
}

/**
 * Verifica la sessione su D1 ad ogni richiesta e protegge le rotte.
 * Utenti non autenticati vengono rediretti a /login.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Il manifest e' pubblico per forza: il browser lo scarica *prima* di
  // installare l'app, quando ancora non c'e' nessuna sessione. Rimandandolo al
  // login diventava irraggiungibile e l'app non si installava.
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname === "/manifest.webmanifest";

  // Nonce unico per richiesta: passa a Next tramite l'header di richiesta (da
  // cui Next lo estrae per i propri script) e allo stesso tempo nella CSP di
  // risposta (che il browser fa rispettare). layout.tsx lo rilegge da x-nonce.
  const nonce = btoa(crypto.randomUUID());
  const csp = costruisciCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const sessionId = request.cookies.get(COOKIE_NAME)?.value;
  let authenticated = false;

  if (sessionId) {
    const { env } = await getCloudflareContext({ async: true });
    const row = await env.DB.prepare(
      `select 1 from sessions s
       join users u on u.id = s.user_id
       where s.id = ? and s.expires_at > datetime('now') and u.stato = 'attivo'`
    )
      .bind(sessionId)
      .first();
    authenticated = !!row;
  }

  if (!authenticated && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return applicaHeaderSicurezza(NextResponse.redirect(url), csp);
  }

  if (authenticated && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/consumi-costi"; // tenuto in sync a mano con DEFAULT_AREA_HREF in registry.ts (evitiamo di importare la registry, pesante, nel middleware)
    return applicaHeaderSicurezza(NextResponse.redirect(url), csp);
  }

  return applicaHeaderSicurezza(
    NextResponse.next({ request: { headers: requestHeaders } }),
    csp
  );
}

export const config = {
  matcher: [
    /*
     * Applica a tutte le rotte tranne:
     * - _next/static, _next/image
     * - favicon e file statici (immagini, font, ecc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
