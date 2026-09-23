"use client";

import { useEffect, useRef } from "react";

/**
 * Il widget di Turnstile.
 *
 * Carica lo script di Cloudflare una volta sola e disegna il riquadro dentro
 * un div nostro. Il token che produce viaggia in un campo nascosto chiamato
 * `cf-turnstile-response`, che è il nome che il server si aspetta.
 *
 * Lo script porta il `nonce` della richiesta: la CSP ammette solo script con
 * quel nonce, e `strict-dynamic` fa passare quelli che lui carica per conto
 * suo. Il riquadro vive in un iframe di challenges.cloudflare.com, che è
 * consentito da `frame-src` nel middleware.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opzioni: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SORGENTE =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function Turnstile({
  sitekey,
  nonce,
}: {
  sitekey: string;
  nonce?: string;
}) {
  const contenitore = useRef<HTMLDivElement>(null);
  const reso = useRef<string | null>(null);

  useEffect(() => {
    let annullato = false;

    function disegna() {
      if (annullato || !contenitore.current || !window.turnstile) return;
      // In sviluppo React monta due volte: senza questa guardia comparirebbero
      // due riquadri, e il secondo token sovrascriverebbe il primo.
      if (reso.current) return;
      reso.current = window.turnstile.render(contenitore.current, {
        sitekey,
        theme: "auto",
      });
    }

    if (window.turnstile) {
      disegna();
    } else {
      // Uno script solo anche se il componente viene rimontato.
      let script = document.querySelector<HTMLScriptElement>(
        'script[data-turnstile="1"]'
      );
      if (!script) {
        script = document.createElement("script");
        script.src = SORGENTE;
        script.async = true;
        script.defer = true;
        script.dataset.turnstile = "1";
        if (nonce) script.nonce = nonce;
        document.head.appendChild(script);
      }
      script.addEventListener("load", disegna);
    }

    return () => {
      annullato = true;
      if (reso.current && window.turnstile) {
        window.turnstile.remove(reso.current);
        reso.current = null;
      }
    };
  }, [sitekey, nonce]);

  return <div ref={contenitore} className="min-h-[65px]" />;
}
