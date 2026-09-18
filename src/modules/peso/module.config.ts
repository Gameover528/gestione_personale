import { Scale } from "lucide-react";
import type { ModuleConfig } from "@/core/modules/types";

export const pesoModule: ModuleConfig = {
  id: "peso",
  label: "Peso",
  icon: Scale,
  basePath: "/peso",
  nav: [
    // Fuori barra: sul telefono i cinque posti sono già presi da Dashboard,
    // Diario, ＋, Esercizio e Andamento. Il peso si segna una volta ogni tanto,
    // non più volte al giorno come il cibo, quindi è il candidato giusto a
    // stare nel menu laterale e non nella barra.
    { label: "Peso", href: "/peso", icon: Scale, fuoriBarra: true },
  ],
};
