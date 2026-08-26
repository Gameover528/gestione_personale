import { redirect } from "next/navigation";
import { PageHeader } from "@/core/components/ui";
import { requireSessionUser } from "@/lib/auth/session";
import { puoGestireUtenti } from "@/lib/auth/roles";
import { listUtenti } from "@/modules/impostazioni/queries";
import { UtentiSettings } from "@/modules/impostazioni/components/UtentiSettings";

export default async function UtentiPage() {
  const user = await requireSessionUser();
  if (!puoGestireUtenti(user.ruolo)) {
    redirect("/impostazioni/account");
  }

  const utenti = await listUtenti();
  return (
    <div>
      <PageHeader
        title="Utenti"
        description="Account che possono accedere a questa app."
      />
      <UtentiSettings utenti={utenti} utenteCorrenteId={user.id} ruoloRichiedente={user.ruolo} />
    </div>
  );
}
