import { createClient } from "@/lib/supabase/client";

const KEY = "dashboard";

/** Ritorna l'ordine dei widget visibili salvato, oppure null se non impostato. */
export async function getDashboardLayout(): Promise<string[] | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_preferences")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", KEY)
    .maybeSingle();

  if (error || !data) return null;
  const value = data.value as { widgets?: string[] } | null;
  return value?.widgets ?? null;
}

export async function saveDashboardLayout(widgetIds: string[]): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");

  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      key: KEY,
      value: { widgets: widgetIds },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,key" }
  );
  if (error) throw error;
}
