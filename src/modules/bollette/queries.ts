import { createClient } from "@/lib/supabase/client";
import {
  type Bolletta,
  type BollettaInput,
  STORAGE_BUCKET,
} from "./types";

export interface BolletteFilters {
  tipo?: string;
  stato?: string;
  divisione?: string;
  /** anno (es. 2026) applicato a data_scadenza */
  anno?: number;
}

export async function listBollette(
  filters: BolletteFilters = {}
): Promise<Bolletta[]> {
  const supabase = createClient();
  let query = supabase
    .from("bollette")
    .select("*")
    .order("data_scadenza", { ascending: false });

  if (filters.tipo) query = query.eq("tipo", filters.tipo);
  if (filters.stato) query = query.eq("stato", filters.stato);
  if (filters.divisione) query = query.eq("divisione", filters.divisione);
  if (filters.anno) {
    query = query
      .gte("data_scadenza", `${filters.anno}-01-01`)
      .lte("data_scadenza", `${filters.anno}-12-31`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Bolletta[];
}

export async function getBolletta(id: string): Promise<Bolletta | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bollette")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Bolletta;
}

export async function createBolletta(input: BollettaInput): Promise<Bolletta> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");

  const { data, error } = await supabase
    .from("bollette")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data as Bolletta;
}

export async function updateBolletta(
  id: string,
  input: Partial<BollettaInput>
): Promise<Bolletta> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bollette")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Bolletta;
}

export async function deleteBolletta(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("bollette").delete().eq("id", id);
  if (error) throw error;
}

/** Carica un PDF nello storage e ritorna il path salvato. */
export async function uploadAllegato(file: File): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");

  const ext = file.name.split(".").pop() || "pdf";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

/** URL firmato temporaneo per aprire/scaricare l'allegato. */
export async function getAllegatoUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export async function removeAllegato(path: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}
