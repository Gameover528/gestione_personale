import { Utensils, ChefHat, TrendingUp } from "lucide-react";
import type { ModuleConfig } from "@/core/modules/types";
import CalorieOggi from "./widgets/CalorieOggi";
import MacroOggi from "./widgets/MacroOggi";
import AndamentoSettimana from "./widgets/AndamentoSettimana";

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
      id: "alimentazione.calorie-oggi",
      title: "Calorie di oggi",
      defaultSpan: 1,
      component: CalorieOggi,
    },
    {
      id: "alimentazione.macro-oggi",
      title: "Valori di oggi vs obiettivi",
      defaultSpan: 2,
      component: MacroOggi,
    },
    {
      id: "alimentazione.andamento-settimana",
      title: "Calorie degli ultimi 7 giorni",
      defaultSpan: 2,
      component: AndamentoSettimana,
    },
  ],
};
