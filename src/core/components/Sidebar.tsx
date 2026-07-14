"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, LayoutDashboard, LogOut } from "lucide-react";
import { modules } from "@/core/modules/registry";
import { cn } from "@/lib/utils";

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-card">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LayoutGrid className="h-5 w-5" />
        </div>
        <span className="font-semibold">Gestione Personale</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        <NavLink
          href="/dashboard"
          label="Dashboard"
          active={isActive("/dashboard")}
          icon={<LayoutDashboard className="h-4 w-4" />}
        />

        {modules.map((mod) => (
          <div key={mod.id} className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {mod.label}
            </p>
            {mod.nav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={isActive(item.href)}
                  icon={<Icon className="h-4 w-4" />}
                />
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        {userEmail && (
          <p className="mb-2 truncate px-3 text-xs text-muted-foreground">
            {userEmail}
          </p>
        )}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Esci
          </button>
        </form>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
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
