import { createClient } from "@/lib/supabase/client";
import type {
  PastoDiario,
  PastoDiarioInput,
  Obiettivo,
  Nutriente,
  AlimentoRicerca,
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
