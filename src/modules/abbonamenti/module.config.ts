import { RefreshCw } from "lucide-react";
import type { ModuleConfig } from "@/core/modules/types";
import AbbonamentiAttivi from "./widgets/AbbonamentiAttivi";

export const abbonamentiModule: ModuleConfig = {
  id: "abbonamenti",
  label: "Abbonamenti",
  icon: RefreshCw,
  basePath: "/abbonamenti",
  nav: [{ label: "Abbonamenti", href: "/abbonamenti", icon: RefreshCw }],
  widgets: [
    {
      id: "abbonamenti.attivi",
      title: "Abbonamenti attivi",
      descrizione:
        "Quanto pesano al mese gli abbonamenti attivi, e quanti sono.",
      defaultSpan: 1,
      component: AbbonamentiAttivi,
      anteprima: {
        tipo: "numero",
        valore: "47,90 €/mese",
        nota: "6 abbonamenti attivi",
      },
    },
  ],
};
