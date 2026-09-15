"use client";

import type { Esercizio } from "../types";

/**
 * L'immagine dell'esercizio, piccola.
 *
 * Serve a capire di quale esercizio si tratta senza aprirne la scheda: i nomi
 * del catalogo sono in inglese e si somigliano moltissimo fra loro ("incline",
 * "decline", "close-grip", "reverse grip"), e il disegno toglie ogni dubbio
 * mentre si sceglie.
 *
 * Passa dalla nostra rotta e non dal CDN esterno: la CSP consente immagini solo
 * da `self`, e cosi' ogni GIF si scarica una volta sola e poi vive su KV.
 */
export function Miniatura({
  esercizio,
  lato = 40,
}: {
  esercizio: Pick<Esercizio, "id" | "gif_url">;
  lato?: number;
}) {
  if (!esercizio.gif_url) {
    return (
      <span
        aria-hidden
        className="flex shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground"
        style={{ width: lato, height: lato }}
      >
        —
      </span>
    );
  }
  return (
    // Niente <Image> di Next: e' gia' dimensionata, ed e' una GIF animata, che
    // l'ottimizzatore non tratta.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/esercizio-gif/${esercizio.id}`}
      alt=""
      width={lato}
      height={lato}
      loading="lazy"
      className="shrink-0 rounded bg-muted object-cover"
      style={{ width: lato, height: lato }}
    />
  );
}
