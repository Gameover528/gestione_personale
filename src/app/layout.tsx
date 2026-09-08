import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getAspetto } from "@/core/theme/preferenze";
import { ID_STILE_TEMA, cssTema } from "@/core/theme/palette";

export const metadata: Metadata = {
  title: "Gestione Personale",
  description: "Il mio spazio personale modulare",
  manifest: "/manifest.webmanifest",
  applicationName: "Gestione Personale",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Gestione",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  // Il colore della barra di sistema segue il tema scelto.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

/**
 * Decide il tema prima che la pagina venga disegnata.
 *
 * Il tema scelto arriva dal server (preferenza dell'utente, quindi valida su
 * tutti i dispositivi) come attributo data-tema: se è "chiaro" o "scuro" la
 * classe è già applicata lato server e non c'è nessun lampo. Con "sistema", o
 * quando non si è autenticati, decide questo script leggendo l'impostazione
 * del sistema operativo — e come ultima spiaggia quella salvata nel browser,
 * che copre la pagina di accesso.
 */
const THEME_SCRIPT = `
(function () {
  var html = document.documentElement;
  var t = html.getAttribute("data-tema");
  if (!t || t === "sistema") {
    var salvato = null;
    try { salvato = localStorage.getItem("tema"); } catch (e) {}
    var scuro = t === "sistema" || !salvato
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : salvato === "scuro";
    html.classList.toggle("dark", scuro);
  }
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tema, colore } = await getAspetto();
  // La palette derivata dal colore scelto: resa qui, quindi la pagina nasce
  // già col colore giusto e non "cambia colore" dopo l'idratazione.
  const css = cssTema(colore);

  return (
    <html
      lang="it"
      data-tema={tema}
      className={tema === "scuro" ? "dark" : undefined}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {css && (
          <style id={ID_STILE_TEMA} dangerouslySetInnerHTML={{ __html: css }} />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
