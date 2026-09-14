import { Dumbbell, ListChecks } from "lucide-react";
import type { ModuleConfig } from "@/core/modules/types";

export const esercizioModule: ModuleConfig = {
  id: "esercizio",
  label: "Esercizio",
  icon: Dumbbell,
  basePath: "/esercizio",
  nav: [
    { label: "Esercizio", href: "/esercizio", icon: Dumbbell },
    // Gli esercizi che ti sei creato: sul desktop hanno una voce propria, su
    // telefono ci si arriva dalla pagina Esercizio (i posti in barra sono 5).
    {
      label: "Miei esercizi",
      labelBreve: "Miei",
      href: "/esercizio/miei",
      icon: ListChecks,
      fuoriBarra: true,
    },
  ],
};
