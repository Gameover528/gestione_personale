import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Abilita, in dev locale, l'accesso alle risorse Cloudflare (bindings, ecc.)
// tramite lo stesso runtime usato in produzione su Workers.
initOpenNextCloudflareForDev();

/**
 * Chi è questa build: il commit da cui nasce.
 *
 * NON un'ora. Questo file viene valutato più volte durante una stessa build —
 * da ogni worker che compila, client e server separatamente — e new Date()
 * dava a ciascuno un valore diverso: misurato, 12:50:17 nel codice del
 * telefono e 12:49:58 in quello del server. Col controllo di versione
 * (AvvisoNuovaVersione) vorrebbe dire "è uscita una nuova versione" a tutti,
 * sempre. Il commit invece è lo stesso per chiunque lo legga.
 *
 * In CI c'è GITHUB_SHA; in locale lo si chiede a git. Senza nessuno dei due
 * resta vuoto, e il controllo di versione semplicemente non parte: meglio
 * nessun avviso che un avviso falso.
 */
function idBuild() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  const git = (comando) =>
    execSync(comando, { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 }).toString();
  try {
    const commit = git("git rev-parse HEAD").trim();
    /*
      Da un PC si può pubblicare con modifiche non ancora committate
      (npm run deploy:dev): il commit sarebbe lo stesso della build già
      pubblicata dalla CI, e l'avviso di nuova versione non partirebbe proprio
      quando le server action sono cambiate. Un'impronta delle modifiche è
      uguale per tutti i worker della stessa build, a differenza di un'ora.
    */
    const stato = git("git status --porcelain");
    if (!stato.trim()) return commit;
    const impronta = createHash("sha256")
      .update(stato)
      .update(git("git diff HEAD"))
      .digest("hex")
      .slice(0, 12);
    return `${commit}-${impronta}`;
  } catch {
    return "";
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * La data in cui questo codice è stato compilato.
   *
   * Serve alla pagina Versioni per dire quanto è vecchio quello che si sta
   * guardando su sviluppo. Prima era una stringa scritta a mano nel registro,
   * e si è rivelata il tipo di campo che nessuno aggiorna: è rimasta ferma al
   * 18 settembre mentre sotto si accumulavano tre settimane di lavoro, e a chi
   * leggeva diceva una cosa falsa.
   *
   * Qui invece non c'è niente da ricordarsi: la pipeline compila a ogni push,
   * quindi questa data è la data della pubblicazione. Next la sostituisce con
   * una costante al momento della build, quindi non costa niente a runtime.
   */
  env: {
    DATA_BUILD: new Date().toISOString().slice(0, 10),
    /**
     * Identifica la build. Il client lo confronta con quello del server
     * (/api/versione) per accorgersi di essere rimasto indietro dopo una
     * pubblicazione: vedi AvvisoNuovaVersione e idBuild() qui sopra.
     */
    ID_BUILD: idBuild(),
  },
};

export default nextConfig;
