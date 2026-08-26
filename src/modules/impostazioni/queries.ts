"use server";

import { getDb } from "@/lib/cf";
import { requireSessionUser, requireAdminUser } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { puoModificare, type Ruolo, type StatoAccount } from "@/lib/auth/roles";

export interface UtenteInfo {
  id: string;
  email: string;
  created_at: string;
  ruolo: Ruolo;
  stato: StatoAccount;
}

/** Elenco di tutti gli account. Riservato ad admin/superadmin. */
export async function listUtenti(): Promise<UtenteInfo[]> {
  await requireAdminUser();
  const { results } = await getDb()
    .prepare(
      "select id, email, created_at, ruolo, stato from users order by created_at asc"
    )
    .all<UtenteInfo>();
  return results ?? [];
}

export interface CreaUtenteResult {
  error?: string;
  ok?: boolean;
}

/** Crea un nuovo account dalla UI (alternativa a scripts/seed-users.mjs da terminale). Riservato ad admin/superadmin. */
export async function creaUtenteAction(
  _prevState: CreaUtenteResult,
  formData: FormData
): Promise<CreaUtenteResult> {
  await requireAdminUser();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !email.includes("@")) {
    return { error: "Email non valida" };
  }
  if (password.length < 6) {
    return { error: "La password deve avere almeno 6 caratteri" };
  }

  const esistente = await getDb()
    .prepare("select id from users where email = ?")
    .bind(email)
    .first();
  if (esistente) {
    return { error: "Esiste già un account con questa email" };
  }

  const id = crypto.randomUUID();
  const hash = await hashPassword(password);
  await getDb()
    .prepare("insert into users (id, email, password_hash, ruolo, stato) values (?, ?, ?, 'utilizzatore', 'attivo')")
    .bind(id, email, hash)
    .run();

  return { ok: true };
}

export interface AzioneUtenteResult {
  error?: string;
  ok?: boolean;
}

/** Cambia lo stato (attivo/sospeso/bloccato) di un account. Riservato ad admin/superadmin; mai su un superadmin o su se stessi. */
export async function impostaStatoUtenteAction(
  targetId: string,
  nuovoStato: StatoAccount
): Promise<AzioneUtenteResult> {
  const richiedente = await requireAdminUser();

  if (targetId === richiedente.id) {
    return { error: "Non puoi modificare lo stato del tuo stesso account." };
  }

  const target = await getDb()
    .prepare("select ruolo from users where id = ?")
    .bind(targetId)
    .first<{ ruolo: Ruolo }>();

  if (!target || !puoModificare(richiedente.ruolo, target.ruolo)) {
    return { error: "Non hai i permessi per modificare questo account." };
  }

  await getDb()
    .prepare("update users set stato = ? where id = ?")
    .bind(nuovoStato, targetId)
    .run();

  // Se l'account viene sospeso/bloccato, chiudi subito tutte le sue sessioni attive.
  if (nuovoStato !== "attivo") {
    await getDb().prepare("delete from sessions where user_id = ?").bind(targetId).run();
  }

  return { ok: true };
}

/** Promuove/retrocede un account tra "utilizzatore" e "admin". Riservato al superadmin; mai su un superadmin. */
export async function impostaRuoloUtenteAction(
  targetId: string,
  nuovoRuolo: "admin" | "utilizzatore"
): Promise<AzioneUtenteResult> {
  const richiedente = await requireAdminUser();

  if (richiedente.ruolo !== "superadmin") {
    return { error: "Solo il superadmin può cambiare il ruolo di un account." };
  }
  if (targetId === richiedente.id) {
    return { error: "Non puoi modificare il ruolo del tuo stesso account." };
  }

  const target = await getDb()
    .prepare("select ruolo from users where id = ?")
    .bind(targetId)
    .first<{ ruolo: Ruolo }>();

  if (!target || target.ruolo === "superadmin") {
    return { error: "Non è possibile modificare un account superadmin." };
  }

  await getDb()
    .prepare("update users set ruolo = ? where id = ?")
    .bind(nuovoRuolo, targetId)
    .run();

  return { ok: true };
}

// ----------------------- Preferenze modulo Bollette -----------------------
const CHIAVE_PREFERENZE_BOLLETTE = "bollette-defaults";

export interface BollettePreferenze {
  persone_tue: number;
  persone_altre: number;
}

const DEFAULT_BOLLETTE_PREFERENZE: BollettePreferenze = {
  persone_tue: 3,
  persone_altre: 2,
};

export async function getBollettePreferenze(): Promise<BollettePreferenze> {
  const user = await requireSessionUser();
  const row = await getDb()
    .prepare("select value from user_preferences where user_id = ? and key = ?")
    .bind(user.id, CHIAVE_PREFERENZE_BOLLETTE)
    .first<{ value: string }>();

  if (!row) return DEFAULT_BOLLETTE_PREFERENZE;
  try {
    return { ...DEFAULT_BOLLETTE_PREFERENZE, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_BOLLETTE_PREFERENZE;
  }
}

export async function saveBollettePreferenze(
  preferenze: BollettePreferenze
): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .prepare(
      `insert into user_preferences (user_id, key, value, updated_at)
       values (?, ?, ?, datetime('now'))
       on conflict (user_id, key) do update set value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(user.id, CHIAVE_PREFERENZE_BOLLETTE, JSON.stringify(preferenze))
    .run();
}
