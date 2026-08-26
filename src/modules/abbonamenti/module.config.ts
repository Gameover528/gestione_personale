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
      defaultSpan: 1,
      component: AbbonamentiAttivi,
    },
  ],
};
