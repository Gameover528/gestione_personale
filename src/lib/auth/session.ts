import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/cf";

const COOKIE_NAME = "session";
const SESSION_DAYS = 30;

import { puoGestireUtenti, type Ruolo, type StatoAccount } from "./roles";

export interface SessionUser {
  id: string;
  email: string;
  /** Come la persona vuole essere chiamata; null se non l'ha impostato. */
  nome: string | null;
  ruolo: Ruolo;
  stato: StatoAccount;
}

/** Crea una sessione in D1 e imposta il cookie httpOnly. Da chiamare dopo un login riuscito. */
export async function createSession(userId: string): Promise<void> {
  const db = getDb();
  const id = crypto.randomUUID();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  // Occasione buona per togliere di mezzo le sessioni ormai scadute: senza,
  // restavano in tabella per sempre.
  await db
    .prepare("delete from sessions where expires_at <= datetime('now')")
    .run();

  // expires_at scritto nel formato di datetime('now') (spazio, niente T/Z né
  // millisecondi): così il confronto `s.expires_at > datetime('now')` in
  // middleware e getSessionUser è tra due valori nello stesso formato. Prima si
  // confrontava un ISO ("...T...Z") col formato SQLite, e funzionava solo per
  // il caso dell'anno che viene prima: fragile.
  await db
    .prepare(
      `insert into sessions (id, user_id, expires_at)
       values (?, ?, datetime('now', '+${SESSION_DAYS} days'))`
    )
    .bind(id, userId)
    .run();

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires,
  });
}

/** Invalida la sessione corrente (logout) e rimuove il cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const id = cookieStore.get(COOKIE_NAME)?.value;

  if (id) {
    await getDb().prepare("delete from sessions where id = ?").bind(id).run();
  }
  cookieStore.delete(COOKIE_NAME);
}

/** Utente autenticato corrente (Server Component / Server Action / Route Handler), o null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const id = cookieStore.get(COOKIE_NAME)?.value;
  if (!id) return null;

  const row = await getDb()
    .prepare(
      `select u.id as id, u.email as email, u.nome as nome, u.ruolo as ruolo, u.stato as stato
       from sessions s
       join users u on u.id = s.user_id
       where s.id = ? and s.expires_at > datetime('now')`
    )
    .bind(id)
    .first<SessionUser>();

  if (!row) return null;

  // Un account sospeso/bloccato perde la sessione immediatamente, ovunque.
  if (row.stato !== "attivo") {
    await getDb().prepare("delete from sessions where id = ?").bind(id).run();
    return null;
  }

  return row;
}

/**
 * Utente autenticato, per Server Action e query.
 *
 * Senza sessione valida rimanda al login invece di lanciare un errore: la
 * sessione può essere scaduta, revocata da un altro dispositivo o cancellata
 * (reset password, account sospeso) mentre una scheda è ancora aperta, e da lì
 * ogni azione tornava un errore 500 — all'utente "Application error", nei log
 * di Cloudflare una risposta 5xx. Tornare al login è la cosa che serve.
 */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** ID della sessione corrente (cookie), o null. Utile per escluderla da un "logout dagli altri dispositivi". */
export async function getCurrentSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

/** Variante per Server Action riservate a admin/superadmin: lancia se non autenticato o senza i permessi. */
export async function requireAdminUser(): Promise<SessionUser> {
  const user = await requireSessionUser();
  if (!puoGestireUtenti(user.ruolo)) {
    throw new Error("Permessi insufficienti");
  }
  return user;
}
