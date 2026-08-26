import { KeyRound, Users, Download, SlidersHorizontal } from "lucide-react";
import type { ModuleConfig } from "@/core/modules/types";

export const impostazioniModule: ModuleConfig = {
  id: "impostazioni",
  label: "Impostazioni",
  icon: SlidersHorizontal,
  basePath: "/impostazioni",
  nav: [
    { label: "Account e sicurezza", href: "/impostazioni/account", icon: KeyRound },
    { label: "Utenti", href: "/impostazioni/utenti", icon: Users, adminOnly: true },
    { label: "Backup dati", href: "/impostazioni/backup", icon: Download },
    { label: "Preferenze moduli", href: "/impostazioni/preferenze", icon: SlidersHorizontal },
  ],
};
