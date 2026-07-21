import { createClient } from "@/lib/supabase/client";
import type {
  PastoDiario,
  PastoDiarioInput,
  Obiettivo,
  Nutriente,
  AlimentoRicerca,
  Piatto,
  PiattoIngrediente,
  PiattoConIngredienti,
} from "./types";

export async function listPasti(data: string): Promise<PastoDiario[]> {
  const supabase = createClient();
  const { data: rows, error } = await supabase
    .from("diario_pasti")
    .select("*")
    .eq("data", data)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (rows ?? []) as PastoDiario[];
}

export async function addPasto(input: PastoDiarioInput): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");
  const { error } = await supabase
    .from("diario_pasti")
    .insert({ ...input, user_id: user.id });
  if (error) throw error;
}

export async function deletePasto(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("diario_pasti").delete().eq("id", id);
  if (error) throw error;
}

export async function updatePasto(
  id: string,
  patch: { quantita_g?: number; pasto?: string }
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("diario_pasti")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function getObiettivi(): Promise<Obiettivo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("obiettivi_nutrizionali")
    .select("nutriente, valore, tipo");
  if (error) throw error;
  return (data ?? []).map((o) => ({
    nutriente: o.nutriente as Nutriente,
    valore: Number(o.valore),
    tipo: (o.tipo as "min" | "max") ?? "max",
  }));
}

export async function saveObiettivi(list: Obiettivo[]): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");
  const rows = list.map((o) => ({
    user_id: user.id,
    nutriente: o.nutriente,
    valore: o.valore,
    tipo: o.tipo,
  }));
  const { error } = await supabase
    .from("obiettivi_nutrizionali")
    .upsert(rows, { onConflict: "user_id,nutriente" });
  if (error) throw error;
}

export async function cercaAlimenti(q: string): Promise<AlimentoRicerca[]> {
  const res = await fetch(`/api/alimenti/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Errore nella ricerca");
  const data = await res.json();
  return (data.risultati ?? []) as AlimentoRicerca[];
}

// ----------------------- Piatti (ricette) -----------------------
export type IngredienteInput = Omit<
  PiattoIngrediente,
  "id" | "piatto_id" | "user_id"
>;

export async function listPiatti(): Promise<Piatto[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("piatti")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Piatto[];
}

export async function getPiatto(id: string): Promise<PiattoConIngredienti> {
  const supabase = createClient();
  const { data: piatto, error: e1 } = await supabase
    .from("piatti")
    .select("*")
    .eq("id", id)
    .single();
  if (e1) throw e1;
  const { data: ings, error: e2 } = await supabase
    .from("piatto_ingredienti")
    .select("*")
    .eq("piatto_id", id);
  if (e2) throw e2;
  return {
    ...(piatto as Piatto),
    ingredienti: (ings ?? []) as PiattoIngrediente[],
  };
}

export async function createPiatto(
  nome: string,
  ingredienti: IngredienteInput[]
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");

  const { data: piatto, error } = await supabase
    .from("piatti")
    .insert({ nome, user_id: user.id })
    .select()
    .single();
  if (error) throw error;

  if (ingredienti.length > 0) {
    const rows = ingredienti.map((i) => ({
      ...i,
      piatto_id: (piatto as Piatto).id,
      user_id: user.id,
    }));
    const { error: e2 } = await supabase
      .from("piatto_ingredienti")
      .insert(rows);
    if (e2) throw e2;
  }
}

export async function updatePiatto(
  id: string,
  nome: string,
  ingredienti: IngredienteInput[]
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");

  const { error } = await supabase
    .from("piatti")
    .update({ nome })
    .eq("id", id);
  if (error) throw error;

  await supabase.from("piatto_ingredienti").delete().eq("piatto_id", id);
  if (ingredienti.length > 0) {
    const rows = ingredienti.map((i) => ({
      ...i,
      piatto_id: id,
      user_id: user.id,
    }));
    const { error: e2 } = await supabase
      .from("piatto_ingredienti")
      .insert(rows);
    if (e2) throw e2;
  }
}

export async function deletePiatto(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("piatti").delete().eq("id", id);
  if (error) throw error;
}
