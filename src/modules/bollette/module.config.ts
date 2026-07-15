import { Receipt } from "lucide-react";
import type { ModuleConfig } from "@/core/modules/types";
import TotaleDaPagare from "./widgets/TotaleDaPagare";
import ProssimeScadenze from "./widgets/ProssimeScadenze";
import SpesaPerTipo from "./widgets/SpesaPerTipo";
import AndamentoMensile from "./widgets/AndamentoMensile";
import DaRecuperare from "./widgets/DaRecuperare";

export const bolletteModule: ModuleConfig = {
  id: "bollette",
  label: "Bollette",
  icon: Receipt,
  nav: [{ label: "Bollette", href: "/bollette", icon: Receipt }],
  widgets: [
    {
      id: "bollette.totale-da-pagare",
      title: "Totale da pagare",
      defaultSpan: 1,
      component: TotaleDaPagare,
    },
    {
      id: "bollette.prossime-scadenze",
      title: "Prossime scadenze",
      defaultSpan: 1,
      component: ProssimeScadenze,
    },
    {
      id: "bollette.da-recuperare",
      title: "Da recuperare (altra famiglia)",
      defaultSpan: 1,
      component: DaRecuperare,
    },
    {
      id: "bollette.spesa-per-tipo",
      title: "Spesa per tipo (anno corrente)",
      defaultSpan: 1,
      component: SpesaPerTipo,
    },
    {
      id: "bollette.andamento-mensile",
      title: "Andamento mensile (anno corrente)",
      defaultSpan: 2,
      component: AndamentoMensile,
    },
  ],
};
