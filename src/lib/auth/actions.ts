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
import { verificaTurnstile } from "./turnstile";
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

/**
 * Login. Gli account arrivano da `registratiAction` o dallo script di seed, e
 * in entrambi i casi possono essere in attesa di approvazione.
 */
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

  // Chi aspetta l'approvazione entra lo stesso, ma nella sua schermata: è il
  // modo di sapere a che punto è senza doverlo chiedere a qualcuno.
  redirect(user.stato === "in_attesa" ? "/in-attesa" : DEFAULT_AREA_HREF);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export interface RegistrazioneResult {
  error?: string;
}

/**
 * Registrazione libera, ma con l'ultima parola a chi amministra.
 *
 * L'account nasce `in_attesa`: esiste, ha una sessione e una schermata che
 * dice di aspettare, e non vede un solo dato dell'app finché qualcuno non lo
 * approva. Le due difese sono diverse e servono a cose diverse — Turnstile
 * ferma i programmi automatici, l'approvazione ferma le persone che non
 * conosci — e nessuna delle due da sola basterebbe.
 *
 * La sessione si crea subito, prima dell'approvazione, di proposito: senza,
 * chi si registra non avrebbe modo di sapere a che punto è, e riproverebbe a
 * iscriversi convinto che la prima volta non fosse andata.
 */
export async function registratiAction(
  _prevState: RegistrazioneResult,
  formData: FormData
): Promise<RegistrazioneResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const conferma = String(formData.get("passwordConferma") || "");
  const nome = String(formData.get("nome") || "").trim();
  const token = String(formData.get("cf-turnstile-response") || "");

  // Controllo volutamente permissivo: qui non si sta verificando che la
  // casella esista — per quello servirebbe un'email di conferma, che senza un
  // dominio proprio non si può mandare — ma solo che non sia una riga vuota o
  // palesemente non un indirizzo.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { error: "Indirizzo email non valido" };
  }
  if (password.length < 8) {
    return { error: "La password deve avere almeno 8 caratteri" };
  }
  if (password !== conferma) {
    return { error: "Le due password non coincidono" };
  }
  if (nome.length < 2) {
    return { error: "Scrivi come ti chiami: serve a chi deve approvarti" };
  }

  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    null;

  // Stesso freno del login, chiave separata: un IP che tempesta di
  // registrazioni non deve potersi bloccare da solo anche l'accesso, e
  // viceversa.
  const chiave = ip ? `reg:${ip}` : `reg:${email}`;
  const limite = await controllaLimiteLogin(chiave);
  if (limite.bloccato) {
    return {
      error: `Troppe registrazioni da qui. Riprova tra circa ${limite.riprovaTraMin} minuti.`,
    };
  }

  if (!(await verificaTurnstile(token, ip))) {
    await registraFallimentoLogin(chiave);
    return {
      error:
        "Non è stato possibile verificare che tu non sia un programma automatico. Ricarica la pagina e riprova; se continua, le registrazioni sono chiuse e devi farti creare l'accesso da chi amministra.",
    };
  }

  const db = getDb();
  const esistente = await db
    .prepare("select 1 from users where email = ?")
    .bind(email)
    .first();

  /*
    Email già presente: lo si dice, e non è una svista.

    Il primo tentativo era rispondere come se fosse andata bene, per non
    trasformare il modulo in uno strumento per scoprire chi ha un account qui —
    la stessa ragione per cui il login risponde sempre "Credenziali non valide".
    Ma qui non funziona: una registrazione riuscita porta alla schermata di
    attesa, un doppione no, e quella differenza si vede a occhio nudo. Restava
    una discrezione finta, pagata con un modulo che a chi ha solo sbagliato a
    digitare sembra rotto.

    Fra le due, meglio quella onesta: si dice com'è e si indica la strada. Il
    freno per IP resta, così l'elenco delle email registrate non si può
    comunque ricavare provandole a raffica.
  */
  if (esistente) {
    await registraFallimentoLogin(chiave);
    return {
      error:
        "Questo indirizzo ha già un accesso. Entra dalla pagina di accesso, o usa un altro indirizzo.",
    };
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      `insert into users (id, email, password_hash, nome, ruolo, stato)
       values (?, ?, ?, ?, 'utilizzatore', 'in_attesa')`
    )
    .bind(id, email, await hashPassword(password), nome)
    .run();

  await createSession(id);
  redirect("/in-attesa");
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
