import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestione Personale",
  description: "Il mio spazio personale modulare",
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
