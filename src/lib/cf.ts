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
