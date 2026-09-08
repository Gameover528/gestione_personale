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
      descrizione:
        "Le calorie di oggi con l'obiettivo, la media della settimana e il grafico degli ultimi sette giorni.",
      defaultSpan: 2,
      // È l'informazione per cui si apre questa dashboard: sempre in testa.
      fisso: true,
      component: CalorieOggiESettimana,
      anteprima: {
        tipo: "barre",
        valori: [1850, 2100, 1600, 2300, 1950, 2050, 1700],
        etichette: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
        soglia: 2200,
      },
    },
    {
      id: "alimentazione.macro-oggi",
      title: "Valori di oggi vs obiettivi",
      descrizione:
        "Proteine, carboidrati, grassi e fibre di oggi messi a confronto con gli obiettivi.",
      defaultSpan: 2,
      component: MacroOggi,
      anteprima: {
        tipo: "barre",
        valori: [95, 120, 210, 250, 60, 70, 18, 30],
        etichette: ["Pro", "", "Carb", "", "Gras", "", "Fib", ""],
      },
    },
    {
      id: "alimentazione.macro-settimana",
      title: "Media macro degli ultimi 7 giorni",
      descrizione:
        "La media giornaliera dei macronutrienti sulla settimana, con gli obiettivi.",
      defaultSpan: 1,
      component: MacroSettimana,
      anteprima: {
        tipo: "progressi",
        voci: [
          { nome: "Proteine", valore: "112,0 g", perc: 93, ok: false },
          { nome: "Carboidrati", valore: "228,5 g", perc: 91 },
          { nome: "Grassi", valore: "64,2 g", perc: 92 },
        ],
      },
    },
  ],
};
