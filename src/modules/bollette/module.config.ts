import { Receipt } from "lucide-react";
import type { ModuleConfig } from "@/core/modules/types";
import SpesaPerTipo from "./widgets/SpesaPerTipo";
import AndamentoMensile from "./widgets/AndamentoMensile";
import DaRecuperare from "./widgets/DaRecuperare";

export const bolletteModule: ModuleConfig = {
  id: "bollette",
  label: "Bollette",
  icon: Receipt,
  basePath: "/bollette",
  nav: [{ label: "Bollette", href: "/bollette", icon: Receipt }],
  widgets: [
    {
      id: "bollette.da-recuperare",
      title: "Da recuperare (altra famiglia)",
      descrizione:
        "La quota delle bollette condivise che l'altra famiglia deve ancora restituire.",
      defaultSpan: 1,
      component: DaRecuperare,
      anteprima: {
        tipo: "numero",
        valore: "312,50 €",
        nota: "da recuperare · 3 bollette da dividere",
      },
    },
    {
      id: "bollette.spesa-per-tipo",
      title: "Spesa per tipo (anno corrente)",
      descrizione:
        "Come si divide la spesa dell'anno tra luce, gas, acqua e il resto.",
      defaultSpan: 1,
      component: SpesaPerTipo,
      anteprima: {
        tipo: "progressi",
        voci: [
          { nome: "Luce", valore: "820 €", perc: 100 },
          { nome: "Gas", valore: "610 €", perc: 74 },
          { nome: "Acqua", valore: "240 €", perc: 29 },
        ],
      },
    },
    {
      id: "bollette.andamento-mensile",
      title: "Andamento mensile (anno corrente)",
      descrizione:
        "Quanto è costato ogni mese, con la spesa dei periodi lunghi divisa sui mesi che copre.",
      defaultSpan: 2,
      component: AndamentoMensile,
      anteprima: {
        tipo: "barre",
        valori: [120, 180, 90, 210, 160, 140],
        etichette: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu"],
      },
    },
  ],
};
