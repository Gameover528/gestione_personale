import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface DashboardWidgetDef {
  /** ID globale univoco, es. "bollette.totale-da-pagare". */
  id: string;
  title: string;
  /** Larghezza di default nella griglia (colonne su 3). */
  defaultSpan?: 1 | 2 | 3;
  /** Componente client renderizzato dentro una card della dashboard. */
  component: ComponentType;
}

export interface ModuleConfig {
  /** ID del modulo, es. "bollette". */
  id: string;
  label: string;
  icon: LucideIcon;
  /** Voci mostrate nella sidebar. */
  nav: NavItem[];
  /** Widget che il modulo mette a disposizione della dashboard. */
  widgets?: DashboardWidgetDef[];
}
