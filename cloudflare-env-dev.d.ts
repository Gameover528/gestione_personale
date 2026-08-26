/// <reference types="@cloudflare/workers-types" />

/**
 * Estende l'interfaccia CloudflareEnv generata da `wrangler types`
 * (cloudflare-env.d.ts, rigenerata automaticamente e non versionata) con il
 * binding presente solo nell'ambiente di sviluppo: un accesso al database D1
 * di produzione, di sola lettura per convenzione (nel codice non ci si scrive
 * mai), usato solo dalla sincronizzazione dati riservata al superadmin.
 * Non esiste in produzione: nel codice va sempre trattato come possibilmente
 * assente (env.DB_PROD può essere undefined).
 */
interface CloudflareEnv {
  DB_PROD?: D1Database;
}
