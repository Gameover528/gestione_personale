"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/cf";
import { verifyPassword } from "./password";
import { createSession, destroySession } from "./session";

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
    .prepare("select id, password_hash from users where email = ?")
    .bind(email)
    .first<{ id: string; password_hash: string }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: "Credenziali non valide" };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
