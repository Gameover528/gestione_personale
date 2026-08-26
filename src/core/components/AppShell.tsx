"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { macroAree, getMacroAreaForPath } from "@/core/modules/registry";
import type { Ruolo } from "@/lib/auth/roles";

export function AppShell({
  userEmail,
  ruolo,
  children,
}: {
  userEmail?: string;
  ruolo?: Ruolo;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const areaAttiva = getMacroAreaForPath(pathname) ?? macroAree[0];

  return (
    <div className="flex h-screen overflow-hidden">
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <Sidebar
        userEmail={userEmail}
        ruolo={ruolo}
        mobileOpen={open}
        onClose={() => setOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Apri menu"
            className="rounded p-1 hover:bg-accent"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-semibold">{areaAttiva.label}</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
