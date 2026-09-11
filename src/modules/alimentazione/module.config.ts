import { Utensils, ChefHat, TrendingUp, Plus } from "lucide-react";
import type { ModuleConfig } from "@/core/modules/types";
import CalorieOggiESettimana from "./widgets/CalorieOggiESettimana";
import MacroOggi from "./widgets/MacroOggi";

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
  // Registrare un alimento e' cio' che si fa piu' spesso in tutta l'app:
  // sulla barra del telefono e' il pulsante centrale.
  azionePrincipale: {
    label: "Aggiungi",
    href: "/alimentazione/aggiungi",
    icon: Plus,
  },
  widgets: [
    {
      // Id storico: cambiandolo scomparirebbe dalle dashboard già personalizzate.
      id: "alimentazione.calorie-oggi",
      title: "Calorie e macro: oggi e ultimi 7 giorni",
      descrizione:
        "Le calorie di oggi con l'obiettivo, il grafico della settimana e, di fianco, la media giornaliera dei macronutrienti.",
      defaultSpan: 3,
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
  ],
};
