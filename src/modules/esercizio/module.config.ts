import { Dumbbell, ListChecks, Search } from "lucide-react";
import type { ModuleConfig } from "@/core/modules/types";
import RiepilogoAllenamento from "./widgets/RiepilogoAllenamento";

export const esercizioModule: ModuleConfig = {
  id: "esercizio",
  label: "Esercizio",
  icon: Dumbbell,
  basePath: "/esercizio",
  nav: [
    // La pagina principale sono gli allenamenti svolti: è quello che si apre
    // per registrare o rivedere, mentre il catalogo si consulta di rado.
    { label: "Esercizio", href: "/esercizio", icon: Dumbbell },
    // Catalogo e esercizi propri restano nella sidebar del desktop: in barra i
    // posti sono cinque e li prendono Riepilogo, Cibo, ＋, Esercizio, Andamento.
    {
      label: "Catalogo esercizi",
      labelBreve: "Catalogo",
      href: "/esercizio/catalogo",
      icon: Search,
      fuoriBarra: true,
    },
    {
      label: "Miei esercizi",
      labelBreve: "Miei",
      href: "/esercizio/miei",
      icon: ListChecks,
      fuoriBarra: true,
    },
  ],
  widgets: [
    {
      id: "esercizio.riepilogo",
      title: "Allenamenti degli ultimi 7 giorni",
      descrizione:
        "Quante sessioni hai fatto, quanti minuti e le calorie stimate bruciate.",
      defaultSpan: 1,
      component: RiepilogoAllenamento,
      anteprima: {
        tipo: "elenco",
        righe: [
          { testo: "3 allenamenti", nota: "ultimi 7 giorni" },
          { testo: "145 minuti", nota: "~1.240 kcal stimate" },
        ],
      },
    },
  ],
};
