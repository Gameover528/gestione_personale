import {
  UserCog,
  Users,
  Download,
  SlidersHorizontal,
  History,
} from "lucide-react";
import type { ModuleConfig } from "@/core/modules/types";

export const impostazioniModule: ModuleConfig = {
  id: "impostazioni",
  label: "Impostazioni",
  icon: SlidersHorizontal,
  basePath: "/impostazioni",
  nav: [
    { label: "Profilo", href: "/impostazioni/profilo", icon: UserCog },
    { label: "Utenti", href: "/impostazioni/utenti", icon: Users, adminOnly: true },
    {
      label: "Backup dati",
      labelBreve: "Backup",
      href: "/impostazioni/backup",
      icon: Download,
    },
    {
      label: "Preferenze moduli",
      labelBreve: "Preferenze",
      href: "/impostazioni/preferenze",
      icon: SlidersHorizontal,
    },
    { label: "Versioni", href: "/impostazioni/versioni", icon: History },
  ],
};
