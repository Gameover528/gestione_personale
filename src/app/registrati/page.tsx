import { headers } from "next/headers";
import { turnstileSitekey } from "@/lib/auth/turnstile";
import { ModuloRegistrazione } from "./ModuloRegistrazione";

/**
 * Pagina server e non client: la chiave del sito e il nonce della richiesta si
 * leggono qui e scendono come proprietà. Il nonce in particolare cambia a ogni
 * richiesta e non esiste lato client.
 */
export default async function RegistratiPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <ModuloRegistrazione sitekey={turnstileSitekey()} nonce={nonce} />;
}
