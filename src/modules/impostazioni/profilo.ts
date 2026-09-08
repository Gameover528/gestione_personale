"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/cf";
import { requireSessionUser } from "@/lib/auth/session";

export interface EsitoProfilo {
  error?: string;
  ok?: boolean;
}

const NOME_MAX = 40;

/**
 * Salva come la persona vuole essere chiamata. L'email resta l'identificativo
 * di accesso e non si cambia da qui.
 */
export async function salvaNomeAction(nome: string): Promise<EsitoProfilo> {
  const user = await requireSessionUser();
  const pulito = nome.trim().replace(/\s+/g, " ");

  if (pulito.length > NOME_MAX) {
    return { error: `Il nome non può superare ${NOME_MAX} caratteri.` };
  }

  await getDb()
    .prepare("update users set nome = ? where id = ?")
    .bind(pulito || null, user.id)
    .run();

  // Il nome compare nella barra laterale, presente in ogni pagina.
  revalidatePath("/", "layout");
  return { ok: true };
}
