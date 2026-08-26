import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Abilita, in dev locale, l'accesso alle risorse Cloudflare (bindings, ecc.)
// tramite lo stesso runtime usato in produzione su Workers.
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
