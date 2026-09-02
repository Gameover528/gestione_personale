import { Utensils, ChefHat, TrendingUp } from "lucide-react";
import type { ModuleConfig } from "@/core/modules/types";
import CalorieOggiESettimana from "./widgets/CalorieOggiESettimana";
import MacroOggi from "./widgets/MacroOggi";
import MacroSettimana from "./widgets/MacroSettimana";

export const alimentazioneModule: ModuleConfig = {
  id: "alimentazione",
  label: "Alimentazione",
  icon: Utensils,
  basePath: "/alimentazione",
  nav: [
    { label: "Diario", href: "/alimentazione", icon: Utensils },
    { label: "Piatti", href: "/alimentazione/piatti", icon: ChefHat },
    { label: "Andamento", href: "/alimentazione/andamento", icon: TrendingUp },
  ],
  widgets: [
    {
      // Id storico: cambiandolo scomparirebbe dalle dashboard già personalizzate.
      id: "alimentazione.calorie-oggi",
      title: "Calorie: oggi e ultimi 7 giorni",
      defaultSpan: 2,
      component: CalorieOggiESettimana,
    },
    {
      id: "alimentazione.macro-oggi",
      title: "Valori di oggi vs obiettivi",
      defaultSpan: 2,
      component: MacroOggi,
    },
    {
      id: "alimentazione.macro-settimana",
      title: "Media macro degli ultimi 7 giorni",
      defaultSpan: 1,
      component: MacroSettimana,
    },
  ],
};
