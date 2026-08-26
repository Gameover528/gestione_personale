"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, X } from "lucide-react";
import Link from "next/link";
import {
  macroAree,
  getMacroAreaForPath,
  hrefForMacroArea,
} from "@/core/modules/registry";
import { cn } from "@/lib/utils";
import type { Ruolo } from "@/lib/auth/roles";
import { ThemeToggle } from "@/core/theme/ThemeToggle";

/** Tra più href candidati che "matchano" il pathname, ritorna il più specifico (il più lungo). */
function hrefAttivo(pathname: string, hrefs: string[]): string | null {
  let migliore: string | null = null;
  for (const href of hrefs) {
    if (pathname === href || pathname.startsWith(href + "/")) {
      if (!migliore || href.length > migliore.length) migliore = href;
    }
  }
  return migliore;
}

export function Sidebar({
  userEmail,
  ruolo,
  mobileOpen = false,
  onClose,
}: {
  userEmail?: string;
  ruolo?: Ruolo;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const areaAttiva = getMacroAreaForPath(pathname) ?? macroAree[0];
  const AreaIcon = areaAttiva.icon;

  const candidati = [
    ...(areaAttiva.dashboardHref ? [areaAttiva.dashboardHref] : []),
    ...areaAttiva.moduli.flatMap((m) => m.nav.map((n) => n.href)),
  ];
  const attivo = hrefAttivo(pathname, candidati);

  function selezionaArea(id: string) {
    const area = macroAree.find((a) => a.id === id);
    setMenuOpen(false);
    if (!area) return;
    router.push(hrefForMacroArea(area));
    onClose?.();
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r bg-card transition-transform duration-200",
        "lg:static lg:z-auto lg:w-56 lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="relative px-3 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex flex-1 items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left transition hover:bg-accent"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <AreaIcon className="h-4 w-4" />
            </div>
            <span className="flex-1 truncate text-sm font-semibold">
              {areaAttiva.label}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                menuOpen && "rotate-180"
              )}
            />
          </button>
          <button
            onClick={onClose}
            aria-label="Chiudi menu"
            className="rounded p-1 text-muted-foreground hover:bg-accent lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
            <div className="absolute left-3 right-3 z-20 mt-2 overflow-hidden rounded-lg border bg-card py-1 shadow-lg">
              {macroAree.map((area) => {
                const Icon = area.icon;
                return (
                  <button
                    key={area.id}
                    onClick={() => selezionaArea(area.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-accent",
                      area.id === "impostazioni" && "border-t"
                    )}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {area.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {areaAttiva.dashboardHref && (
          <NavLink
            href={areaAttiva.dashboardHref}
            label="Dashboard"
            active={attivo === areaAttiva.dashboardHref}
            icon={<LayoutDashboard className="h-4 w-4" />}
            onNavigate={onClose}
          />
        )}

        {areaAttiva.moduli.map((mod) => {
          const voci = mod.nav.filter((item) => !item.adminOnly || ruolo === "admin" || ruolo === "superadmin");
          if (voci.length === 0) return null;
          return (
            <div key={mod.id} className="space-y-1">
              {areaAttiva.moduli.length > 1 && (
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {mod.label}
                </p>
              )}
              {voci.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    active={attivo === item.href}
                    icon={<Icon className="h-4 w-4" />}
                    onNavigate={onClose}
                  />
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t p-3">
        {userEmail && (
          <p className="mb-2 truncate px-3 text-xs text-muted-foreground">
            {userEmail}
          </p>
        )}
        <div className="flex items-center gap-2">
          <form action="/auth/signout" method="post" className="flex-1">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Esci
            </button>
          </form>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  label,
  active,
  icon,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
