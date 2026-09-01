import type { Metadata, Viewport } from "next";
import "./globals.css";

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

const THEME_SCRIPT = `
(function () {
  try {
    var salvato = localStorage.getItem("tema");
    var scuro = salvato ? salvato === "scuro" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (scuro) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
