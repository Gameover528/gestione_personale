"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getDb } from "@/lib/cf";
import { verifyPassword, hashPassword } from "./password";
import {
  createSession,
  destroySession,
  requireSessionUser,
  getCurrentSessionId,
} from "./session";
import {
  controllaLimiteLogin,
  registraFallimentoLogin,
  azzeraLimiteLogin,
} from "./rateLimit";
import { DEFAULT_AREA_HREF } from "@/core/modules/registry";

export interface LoginResult {
  error?: string;
}

/**
 * Hash "civetta" in formato valido (salt:hash PBKDF2): quando l'email non
 * esiste lo confrontiamo lo stesso, così il tempo di risposta è identico a
 * quello di un'email esistente con password sbagliata. Senza, la differenza di
 * tempo (una derivazione PBKDF2 da 100k iterazioni in meno) direbbe a un
 * estraneo quali email sono registrate. Non corrisponde a nessuna password.
 */
const HASH_CIVETTA =
  "a4d42566cd6193842e66e75f23444fa6:577301fa04857e79ffbd22f0a873067211a9bd7a319d7cab5cadb014e40e969d";

const ERRORE_CREDENZIALI = "Credenziali non valide";

/** Login: nessuna registrazione pubblica, gli account si creano con lo script di seed. */
export async function loginAction(
  _prevState: LoginResult,
  formData: FormData
): Promise<LoginResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) {
    return { error: "Email e password sono obbligatorie" };
  }

  // Chiave del freno anti-forza-bruta: l'IP di chi tenta (così non si può
  // bloccare l'accesso a un account altrui a raffica), l'email come ripiego.
  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    null;
  const chiave = ip ? `ip:${ip}` : `email:${email}`;

  const limite = await controllaLimiteLogin(chiave);
  if (limite.bloccato) {
    return {
      error: `Troppi tentativi. Riprova tra circa ${limite.riprovaTraMin} minuti.`,
    };
  }

  const user = await getDb()
    .prepare("select id, password_hash, stato from users where email = ?")
    .bind(email)
    .first<{ id: string; password_hash: string; stato: string }>();

  // Si verifica sempre una password, anche senza utente (contro l'hash
  // civetta): stesso costo, stesso tempo, nessuna fuga d'informazione.
  const passwordOk = await verifyPassword(
    password,
    user?.password_hash ?? HASH_CIVETTA
  );

  if (!user || !passwordOk) {
    await registraFallimentoLogin(chiave);
    return { error: ERRORE_CREDENZIALI };
  }

  // Solo ORA, a password corretta, si può dire perché l'accesso è negato:
  // rivelarlo prima permetterebbe di sapere che l'account esiste senza
  // conoscerne la password.
  if (user.stato === "bloccato") {
    return { error: "Questo account è stato bloccato. Contatta un amministratore." };
  }
  if (user.stato === "sospeso") {
    return { error: "Questo account è sospeso. Contatta un amministratore." };
  }

  await azzeraLimiteLogin(chiave);
  await createSession(user.id);
  redirect(DEFAULT_AREA_HREF);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export interface ImpostazioneResult {
  error?: string;
  ok?: boolean;
}

/** Cambio password per l'utente loggato: richiede la password attuale. */
export async function changePasswordAction(
  _prevState: ImpostazioneResult,
  formData: FormData
): Promise<ImpostazioneResult> {
  const user = await requireSessionUser();
  const attuale = String(formData.get("passwordAttuale") || "");
  const nuova = String(formData.get("passwordNuova") || "");
  const conferma = String(formData.get("passwordConferma") || "");

  if (nuova.length < 6) {
    return { error: "La nuova password deve avere almeno 6 caratteri" };
  }
  if (nuova !== conferma) {
    return { error: "Le due password non coincidono" };
  }

  const row = await getDb()
    .prepare("select password_hash from users where id = ?")
    .bind(user.id)
    .first<{ password_hash: string }>();

  if (!row || !(await verifyPassword(attuale, row.password_hash))) {
    return { error: "Password attuale non corretta" };
  }

  const nuovoHash = await hashPassword(nuova);
  await getDb()
    .prepare("update users set password_hash = ? where id = ?")
    .bind(nuovoHash, user.id)
    .run();

  return { ok: true };
}

/** Disconnette tutte le sessioni dell'utente tranne quella corrente (es. dispositivo smarrito). */
export async function revokeOtherSessionsAction(): Promise<{ rimosse: number }> {
  const user = await requireSessionUser();
  const currentId = await getCurrentSessionId();

  const res = await getDb()
    .prepare(
      currentId
        ? "delete from sessions where user_id = ? and id != ?"
        : "delete from sessions where user_id = ?"
    )
    .bind(...(currentId ? [user.id, currentId] : [user.id]))
    .run();

  return { rimosse: res.meta.changes ?? 0 };
}
