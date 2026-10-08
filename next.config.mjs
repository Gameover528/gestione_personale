import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Abilita, in dev locale, l'accesso alle risorse Cloudflare (bindings, ecc.)
// tramite lo stesso runtime usato in produzione su Workers.
initOpenNextCloudflareForDev();

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
  },
};

export default nextConfig;
