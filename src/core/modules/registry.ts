import { Wallet } from "lucide-react";
import type {
  ModuleConfig,
  MacroAreaConfig,
  DashboardWidgetDef,
  NavItem,
} from "./types";
import { bolletteModule } from "@/modules/bollette/module.config";
import { abbonamentiModule } from "@/modules/abbonamenti/module.config";
import { alimentazioneModule } from "@/modules/alimentazione/module.config";
import { impostazioniModule } from "@/modules/impostazioni/module.config";
import TotaleGenerale from "@/core/dashboard/widgets/TotaleGenerale";

/**
 * Registro centrale delle macro-aree.
 *
 * PER AGGIUNGERE UN NUOVO MODULO A UNA MACRO-AREA ESISTENTE:
 * 1. Crea src/modules/<nome>/module.config.ts che esporta un ModuleConfig
 *    (con un basePath univoco, es. "/nome").
 * 2. Aggiungilo all'array `moduli` della macro-area giusta qui sotto.
 *
 * PER AGGIUNGERE UNA NUOVA MACRO-AREA:
 * Aggiungi una voce a `macroAree` con id, label, icon, dashboardHref
 * (rotta della sua dashboard, o omettilo se non ne ha una) e i suoi moduli.
 * Sidebar, menu a tendina e dashboard si aggiornano da sole.
 */
export const macroAree: MacroAreaConfig[] = [
  {
    id: "consumi-costi",
    label: "Consumi e Costi",
    icon: Wallet,
    dashboardHref: "/consumi-costi",
    moduli: [bolletteModule, abbonamentiModule],
    widgets: [
      {
        id: "consumi-costi.totale-generale",
        title: "Totale generale già pagato",
        defaultSpan: 1,
        component: TotaleGenerale,
      },
    ],
  },
  {
    id: "alimentazione",
    label: "Alimentazione",
    icon: alimentazioneModule.icon,
    dashboardHref: "/alimentazione/dashboard",
    moduli: [alimentazioneModule],
  },
  {
    id: "impostazioni",
    label: "Impostazioni",
    icon: impostazioniModule.icon,
    moduli: [impostazioniModule],
  },
];

/** Rotta di destinazione di default (es. redirect dopo il login). */
export const DEFAULT_AREA_HREF = macroAree[0].dashboardHref ?? macroAree[0].moduli[0].nav[0].href;

/** Tutti i moduli, di tutte le macro-aree. */
export const modules: ModuleConfig[] = macroAree.flatMap((a) => a.moduli);

/** Tutte le voci di navigazione, raccolte dai moduli. */
export const allNavItems: NavItem[] = modules.flatMap((m) => m.nav);

/** Tutti i widget dashboard disponibili, raccolti dai moduli. */
export const allWidgets: DashboardWidgetDef[] = [
  ...macroAree.flatMap((a) => a.widgets ?? []),
  ...modules.flatMap((m) => m.widgets ?? []),
];

export function getWidget(id: string): DashboardWidgetDef | undefined {
  return allWidgets.find((w) => w.id === id);
}

/** Widget disponibili per la dashboard di una specifica macro-area. */
export function widgetsForMacroArea(area: MacroAreaConfig): DashboardWidgetDef[] {
  return [...(area.widgets ?? []), ...area.moduli.flatMap((m) => m.widgets ?? [])];
}

/** Determina la macro-area corrente in base al percorso, per la sidebar. */
export function getMacroAreaForPath(pathname: string): MacroAreaConfig | undefined {
  function matches(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }
  return macroAree.find(
    (area) =>
      (area.dashboardHref && matches(area.dashboardHref)) ||
      area.moduli.some((m) => matches(m.basePath))
  );
}

/** Rotta a cui andare selezionando una macro-area dal menu. */
export function hrefForMacroArea(area: MacroAreaConfig): string {
  return area.dashboardHref ?? area.moduli[0]?.nav[0]?.href ?? "/";
}
