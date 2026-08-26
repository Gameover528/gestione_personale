import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Binding D1 (definito in wrangler.jsonc come "DB"). */
export function getDb(): D1Database {
  const { env } = getCloudflareContext();
  return env.DB;
}

/** Binding Workers KV per gli allegati PDF (definito in wrangler.jsonc come "ALLEGATI"). */
export function getAllegatiKv(): KVNamespace {
  const { env } = getCloudflareContext();
  return env.ALLEGATI;
}

/**
 * Binding D1 verso il database di PRODUZIONE, presente solo nell'ambiente di
 * sviluppo (vedi wrangler.jsonc, env.dev). Ritorna null in produzione (dove
 * il binding non esiste) o in qualsiasi ambiente diverso da dev: chi lo usa
 * deve sempre gestire il caso null, così la sincronizzazione non può mai
 * scattare per sbaglio fuori da dev.
 */
export function getDbProd(): D1Database | null {
  const { env } = getCloudflareContext();
  return env.DB_PROD ?? null;
}
