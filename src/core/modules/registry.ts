import type { ModuleConfig, DashboardWidgetDef, NavItem } from "./types";
import { bolletteModule } from "@/modules/bollette/module.config";
import { alimentazioneModule } from "@/modules/alimentazione/module.config";

/**
 * Registro centrale dei moduli.
 *
 * PER AGGIUNGERE UN NUOVO MODULO:
 * 1. Crea src/modules/<nome>/module.config.ts che esporta un ModuleConfig.
 * 2. Importalo qui e aggiungilo all'array `modules`.
 * Sidebar e dashboard si aggiornano da sole.
 */
export const modules: ModuleConfig[] = [bolletteModule, alimentazioneModule];

/** Tutte le voci di navigazione, raccolte dai moduli. */
export const allNavItems: NavItem[] = modules.flatMap((m) => m.nav);

/** Tutti i widget dashboard disponibili, raccolti dai moduli. */
export const allWidgets: DashboardWidgetDef[] = modules.flatMap(
  (m) => m.widgets ?? []
);

export function getWidget(id: string): DashboardWidgetDef | undefined {
  return allWidgets.find((w) => w.id === id);
}
