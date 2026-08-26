import { NextResponse } from "next/server";
import { getDb } from "@/lib/cf";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const db = getDb();

  const [bollette, preferenze, diario, obiettivi, piatti] = await Promise.all([
    db.prepare("select * from bollette where user_id = ?").bind(user.id).all(),
    db.prepare("select key, value, updated_at from user_preferences where user_id = ?").bind(user.id).all(),
    db.prepare("select * from diario_pasti where user_id = ?").bind(user.id).all(),
    db.prepare("select nutriente, valore, tipo from obiettivi_nutrizionali where user_id = ?").bind(user.id).all(),
    db.prepare("select * from piatti where user_id = ?").bind(user.id).all(),
  ]);

  const piattoIds = (piatti.results ?? []).map((p: any) => p.id);
  let ingredienti: unknown[] = [];
  if (piattoIds.length > 0) {
    const placeholders = piattoIds.map(() => "?").join(",");
    const res = await db
      .prepare(
        `select * from piatto_ingredienti where user_id = ? and piatto_id in (${placeholders})`
      )
      .bind(user.id, ...piattoIds)
      .all();
    ingredienti = res.results ?? [];
  }

  const backup = {
    esportato_il: new Date().toISOString(),
    email: user.email,
    bollette: bollette.results ?? [],
    preferenze: preferenze.results ?? [],
    diario_pasti: diario.results ?? [],
    obiettivi_nutrizionali: obiettivi.results ?? [],
    piatti: piatti.results ?? [],
    piatto_ingredienti: ingredienti,
  };

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="backup-gestione-personale-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}

export const dynamic = "force-dynamic";
