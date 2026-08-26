"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/cf";
import { verifyPassword, hashPassword } from "./password";
import {
  createSession,
  destroySession,
  requireSessionUser,
  getCurrentSessionId,
} from "./session";
import { DEFAULT_AREA_HREF } from "@/core/modules/registry";

export interface LoginResult {
  error?: string;
}

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

  const user = await getDb()
    .prepare("select id, password_hash, stato from users where email = ?")
    .bind(email)
    .first<{ id: string; password_hash: string; stato: string }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: "Credenziali non valide" };
  }

  if (user.stato === "bloccato") {
    return { error: "Questo account è stato bloccato. Contatta un amministratore." };
  }
  if (user.stato === "sospeso") {
    return { error: "Questo account è sospeso. Contatta un amministratore." };
  }

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
