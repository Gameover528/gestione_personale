import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestione Personale",
  description: "Il mio spazio personale modulare",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
