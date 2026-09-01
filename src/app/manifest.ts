import type { MetadataRoute } from "next";

/**
 * Manifest per l'installazione come app (PWA). Serve soprattutto da telefono:
 * il diario alimentare si compila in piedi, non alla scrivania, e installata
 * l'app parte a schermo pieno senza barra del browser.
 *
 * Nota: non c'è service worker, quindi non funziona offline — è installabile,
 * non offline-first.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gestione Personale",
    short_name: "Gestione",
    description: "Bollette, abbonamenti e diario alimentare in un unico posto",
    lang: "it",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Aggiungi un pasto",
        short_name: "Aggiungi pasto",
        url: "/alimentazione/aggiungi",
      },
      { name: "Diario alimentare", short_name: "Diario", url: "/alimentazione" },
    ],
  };
}
