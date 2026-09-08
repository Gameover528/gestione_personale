"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { salvaTema } from "./preferenze";
import { applicaTema } from "./tipi";
import { cn } from "@/lib/utils";

/**
 * Interruttore rapido chiaro/scuro. La scelta viene salvata tra le preferenze
 * dell'utente (quindi vale su tutti i dispositivi); resta anche nel browser
 * perché la pagina di accesso, dove non c'è nessun utente, possa rispettarla.
 *
 * L'opzione "come il sistema" sta nella pagina del profilo: qui un interruttore
 * a due stati sarebbe ambiguo.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [scuro, setScuro] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setScuro(document.documentElement.classList.contains("dark"));
    setPronto(true);
  }, []);

  async function toggle() {
    const nuovo = !scuro;
    setScuro(nuovo);
    // Applica subito, senza attendere il server.
    applicaTema(nuovo ? "scuro" : "chiaro");
    try {
      await salvaTema(nuovo ? "scuro" : "chiaro");
    } catch {
      // se il salvataggio non riesce il tema resta valido per questa sessione
    }
  }

  if (!pronto) {
    // Evita un flash del bottone nello stato sbagliato prima dell'idratazione.
    return <div className={cn("h-9 w-9", className)} />;
  }

  return (
    <button
      onClick={toggle}
      aria-label={scuro ? "Passa al tema chiaro" : "Passa al tema scuro"}
      title={scuro ? "Passa al tema chiaro" : "Passa al tema scuro"}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground",
        className
      )}
    >
      {scuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
