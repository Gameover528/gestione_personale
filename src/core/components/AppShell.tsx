import { Sidebar } from "./Sidebar";
import { HeaderMobile } from "./HeaderMobile";
import { BarraInferiore } from "./BarraInferiore";
import type { Ruolo } from "@/lib/auth/roles";

/**
 * Struttura dell'app.
 *
 * Su schermo grande la navigazione sta nella sidebar di sinistra; su telefono
 * sta in una barra in basso, con l'area corrente e il profilo
 * nell'intestazione. Due navigazioni diverse perché il pollice e il mouse non
 * raggiungono gli stessi punti dello schermo.
 */
export function AppShell({
  userEmail,
  userNome,
  ruolo,
  children,
}: {
  userEmail?: string;
  userNome?: string | null;
  ruolo?: Ruolo;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userEmail={userEmail} userNome={userNome} ruolo={ruolo} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <HeaderMobile userEmail={userEmail} userNome={userNome} />

        <main className="flex-1 overflow-y-auto">
          {/*
            pb-24 su telefono: l'ultima riga di una lista deve restare
            leggibile sopra la barra di navigazione, non finirci sotto.
          */}
          <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:pb-8">
            {children}
          </div>
        </main>
      </div>

      <BarraInferiore ruolo={ruolo} />
    </div>
  );
}
