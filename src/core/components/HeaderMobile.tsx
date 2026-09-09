"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, LogOut, SlidersHorizontal, UserCog } from "lucide-react";
import {
  macroAree,
  getMacroAreaForPath,
  hrefForMacroArea,
} from "@/core/modules/registry";
import { ThemeToggle } from "@/core/theme/ThemeToggle";
import { cn, iniziali } from "@/lib/utils";

/**
 * Intestazione su telefono: a sinistra l'area (si toccano il nome e la
 * freccia per cambiarla), a destra il profilo.
 *
 * Con la navigazione spostata in basso qui non serve più il menu a panino:
 * quello che stava nel pannello scorrevole — cambio area, profilo, tema,
 * uscita — sta in due fogli che salgono dal basso, dove arriva il pollice.
 */
export function HeaderMobile({
  userEmail,
  userNome,
}: {
  userEmail?: string;
  userNome?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [aperto, setAperto] = useState<"aree" | "profilo" | null>(null);

  const area = getMacroAreaForPath(pathname) ?? macroAree[0];
  const AreaIcon = area.icon;

  function vaiAll(id: string) {
    const scelta = macroAree.find((a) => a.id === id);
    setAperto(null);
    if (scelta) router.push(hrefForMacroArea(scelta));
  }

  return (
    <header className="flex items-center justify-between gap-2 border-b bg-card px-3 py-2 lg:hidden">
      <button
        onClick={() => setAperto("aree")}
        aria-expanded={aperto === "aree"}
        aria-label={`Sezione: ${area.label}. Cambia sezione`}
        className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 transition active:bg-accent"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <AreaIcon className="h-4 w-4" />
        </span>
        <span className="truncate font-semibold">{area.label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <button
        onClick={() => setAperto("profilo")}
        aria-expanded={aperto === "profilo"}
        aria-label="Profilo e impostazioni"
        className="flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {iniziali(userNome, userEmail)}
        </span>
      </button>

      {aperto === "aree" && (
        <Foglio titolo="Vai a" onChiudi={() => setAperto(null)}>
          {macroAree.map((a) => {
            const Icon = a.icon;
            const corrente = a.id === area.id;
            return (
              <button
                key={a.id}
                onClick={() => vaiAll(a.id)}
                aria-current={corrente ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition active:bg-accent",
                  corrente && "font-semibold text-primary"
                )}
              >
                <Icon className="h-5 w-5" />
                {a.label}
              </button>
            );
          })}
        </Foglio>
      )}

      {aperto === "profilo" && (
        <Foglio onChiudi={() => setAperto(null)}>
          <div className="flex items-center gap-3 border-b px-4 pb-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {iniziali(userNome, userEmail)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {userNome?.trim() || userEmail || "Profilo"}
              </span>
              {userNome?.trim() && userEmail && (
                <span className="block truncate text-xs text-muted-foreground">
                  {userEmail}
                </span>
              )}
            </span>
            <ThemeToggle />
          </div>

          <Link
            href="/impostazioni/profilo"
            onClick={() => setAperto(null)}
            className="flex items-center gap-3 px-4 py-3 text-sm transition active:bg-accent"
          >
            <UserCog className="h-5 w-5 text-muted-foreground" />
            Impostazioni profilo
          </Link>
          <Link
            href="/impostazioni/preferenze"
            onClick={() => setAperto(null)}
            className="flex items-center gap-3 px-4 py-3 text-sm transition active:bg-accent"
          >
            <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
            Preferenze moduli
          </Link>
          <form action="/auth/signout" method="post" className="border-t">
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition active:bg-accent"
            >
              <LogOut className="h-5 w-5 text-muted-foreground" />
              Esci
            </button>
          </form>
        </Foglio>
      )}
    </header>
  );
}

/**
 * Foglio che sale dal basso: un menu ancorato in cima allo schermo
 * costringerebbe a spostare la mano proprio nell'interfaccia pensata per il
 * pollice.
 */
function Foglio({
  titolo,
  onChiudi,
  children,
}: {
  titolo?: string;
  onChiudi: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onChiudi();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onChiudi]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label="Chiudi"
        onClick={onChiudi}
        className="absolute inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titolo ?? "Profilo"}
        className="relative max-h-[80vh] overflow-y-auto rounded-t-2xl border-t bg-card pb-[env(safe-area-inset-bottom)] pt-3 shadow-xl"
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted" aria-hidden />
        {titolo && (
          <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {titolo}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
