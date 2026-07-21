import { Utensils } from "lucide-react";
import type { ModuleConfig } from "@/core/modules/types";
import CalorieOggi from "./widgets/CalorieOggi";
import MacroOggi from "./widgets/MacroOggi";

export const alimentazioneModule: ModuleConfig = {
  id: "alimentazione",
  label: "Alimentazione",
  icon: Utensils,
  nav: [{ label: "Diario", href: "/alimentazione", icon: Utensils }],
  widgets: [
    {
      id: "alimentazione.calorie-oggi",
      title: "Calorie di oggi",
      defaultSpan: 1,
      component: CalorieOggi,
    },
    {
      id: "alimentazione.macro-oggi",
      title: "Macronutrienti di oggi",
      defaultSpan: 2,
      component: MacroOggi,
    },
  ],
};
