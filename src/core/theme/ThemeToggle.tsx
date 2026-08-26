"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "tema";

function applyTema(scuro: boolean) {
  document.documentElement.classList.toggle("dark", scuro);
}

export function ThemeToggle({ className }: { className?: string }) {
  const [scuro, setScuro] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setScuro(document.documentElement.classList.contains("dark"));
    setPronto(true);
  }, []);

  function toggle() {
    const nuovo = !scuro;
    setScuro(nuovo);
    applyTema(nuovo);
    try {
      localStorage.setItem(STORAGE_KEY, nuovo ? "scuro" : "chiaro");
    } catch {
      // storage non disponibile: il tema resta valido solo per questa sessione di navigazione
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
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground",
        className
      )}
    >
      {scuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
