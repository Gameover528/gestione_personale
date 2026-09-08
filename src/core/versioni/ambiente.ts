import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Ambiente } from "./changelog";

/**
 * Ambiente in cui sta girando l'app, per mostrare il registro versioni giusto.
 *
 * Arriva dalla variabile AMBIENTE definita in wrangler.jsonc: "dev" nel worker
 * di sviluppo (`wrangler deploy --env dev`), "prod" in quello di produzione.
 * In sviluppo locale non serve leggerla: se non siamo in una build di
 * produzione siamo per definizione su codice non rilasciato.
 *
 * La variabile viene letta in modo difensivo (senza tipizzarla nei tipi
 * generati da `wrangler types`, che vengono rigenerati dalla pipeline): se
 * manca si considera produzione, che è il caso più prudente da mostrare.
 */
export function getAmbiente(): Ambiente {
  if (process.env.NODE_ENV !== "production") return "dev";
  try {
    const { env } = getCloudflareContext();
    const valore = (env as unknown as Record<string, unknown>).AMBIENTE;
    return valore === "dev" ? "dev" : "prod";
  } catch {
    return "prod";
  }
}

export function etichettaAmbiente(a: Ambiente): string {
  return a === "dev" ? "Sviluppo" : "Produzione";
}
