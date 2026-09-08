import { Receipt } from "lucide-react";
import type { ModuleConfig } from "@/core/modules/types";
import DaPagareEScadenze from "./widgets/DaPagareEScadenze";
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
      // "Totale da pagare" e "Prossime scadenze" erano due widget separati che
      // facevano la stessa interrogazione: uniti e resi fissi, perché sono
      // l'informazione per cui si apre questa dashboard.
      id: "bollette.da-pagare-scadenze",
      title: "Da pagare e prossime scadenze",
      descrizione:
        "Quanto c'è da pagare in tutto e le cinque bollette che scadono per prime.",
      defaultSpan: 2,
      fisso: true,
      component: DaPagareEScadenze,
      anteprima: {
        tipo: "elenco",
        righe: [
          { testo: "1.240,00 € · 4 bollette da pagare" },
          { testo: "Enel", nota: "luce · 12/09/2026", badge: "5g" },
          { testo: "Acea", nota: "acqua · 20/09/2026" },
        ],
      },
    },
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
