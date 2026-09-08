import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Se true, la voce è visibile solo per ruolo admin/superadmin. */
  adminOnly?: boolean;
}

/**
 * Anteprima di un widget con dati inventati, mostrata nel pannello di
 * aggiunta: serve a capire che aspetto avrà, non a mostrare dati veri (che
 * richiederebbero di interrogare il database per ogni widget disponibile).
 */
export type AnteprimaWidget =
  | { tipo: "numero"; valore: string; nota?: string; barra?: number }
  | { tipo: "elenco"; righe: { testo: string; nota?: string; badge?: string }[] }
  | { tipo: "barre"; valori: number[]; etichette?: string[]; soglia?: number }
  | {
      tipo: "progressi";
      voci: { nome: string; valore: string; perc: number; ok?: boolean }[];
    };

export interface DashboardWidgetDef {
  /** ID globale univoco, es. "bollette.totale-da-pagare". */
  id: string;
  title: string;
  /** Larghezza di default nella griglia (colonne su 3). */
  defaultSpan?: 1 | 2 | 3;
  /** Componente client renderizzato dentro una card della dashboard. */
  component: ComponentType;
  /** Una riga che spiega cosa mostra, nel pannello di aggiunta. */
  descrizione?: string;
  /**
   * Widget essenziale per la sua area: sta sempre in testa alla dashboard e
   * non si può rimuovere né spostare. Serve a garantire che l'informazione
   * principale dell'area sia sempre sotto gli occhi.
   */
  fisso?: boolean;
  /** Anteprima con dati di esempio per il pannello di aggiunta. */
  anteprima?: AnteprimaWidget;
}

export interface ModuleConfig {
  /** ID del modulo, es. "bollette". */
  id: string;
  label: string;
  icon: LucideIcon;
  /** Radice delle rotte del modulo, es. "/bollette". Usata per capire in che macro-area ci si trova. */
  basePath: string;
  /** Voci mostrate nella sidebar. */
  nav: NavItem[];
  /** Widget che il modulo mette a disposizione della dashboard. */
  widgets?: DashboardWidgetDef[];
}

export interface MacroAreaConfig {
  /** ID macro-area, es. "consumi-costi". Usato anche come chiave delle preferenze dashboard. */
  id: string;
  label: string;
  icon: LucideIcon;
  /**
   * Rotta della dashboard dedicata a questa macro-area (widget riordinabili).
   * Se assente (es. Impostazioni), l'area non ha una dashboard: selezionandola
   * si va alla prima voce di navigazione del primo modulo.
   */
  dashboardHref?: string;
  moduli: ModuleConfig[];
  /** Widget "trasversali" della macro-area, non legati a un singolo modulo (es. un totale che somma più moduli). */
  widgets?: DashboardWidgetDef[];
}
