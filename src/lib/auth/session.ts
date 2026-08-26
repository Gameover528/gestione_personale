import { cookies } from "next/headers";
import { getDb } from "@/lib/cf";

const COOKIE_NAME = "session";
const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
}

/** Crea una sessione in D1 e imposta il cookie httpOnly. Da chiamare dopo un login riuscito. */
export async function createSession(userId: string): Promise<void> {
  const db = getDb();
  const id = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await db
    .prepare("insert into sessions (id, user_id, expires_at) values (?, ?, ?)")
    .bind(id, userId, expiresAt)
    .run();

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
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
      `select u.id as id, u.email as email
       from sessions s
       join users u on u.id = s.user_id
       where s.id = ? and s.expires_at > datetime('now')`
    )
    .bind(id)
    .first<SessionUser>();

  return row ?? null;
}

/** Variante per l'uso in Server Action: lancia se non autenticato. */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Non autenticato");
  return user;
}
