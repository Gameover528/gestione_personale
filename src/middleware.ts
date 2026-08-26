import { NextResponse, type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const COOKIE_NAME = "session";

/**
 * Verifica la sessione su D1 ad ogni richiesta e protegge le rotte.
 * Utenti non autenticati vengono rediretti a /login.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = pathname.startsWith("/login") || pathname.startsWith("/auth");

  const sessionId = request.cookies.get(COOKIE_NAME)?.value;
  let authenticated = false;

  if (sessionId) {
    const { env } = await getCloudflareContext({ async: true });
    const row = await env.DB.prepare(
      "select 1 from sessions where id = ? and expires_at > datetime('now')"
    )
      .bind(sessionId)
      .first();
    authenticated = !!row;
  }

  if (!authenticated && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authenticated && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
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
