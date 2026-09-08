import { redirect } from "next/navigation";
import { PageHeader } from "@/core/components/ui";
import { ProfiloSettings } from "@/modules/impostazioni/components/ProfiloSettings";
import { getSessionUser } from "@/lib/auth/session";
import { getAspetto } from "@/core/theme/preferenze";

export default async function ProfiloPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { tema } = await getAspetto();

  return (
    <div>
      <PageHeader
        title="Impostazioni profilo"
        description="Chi sei nell'app, come la vedi e la sicurezza del tuo accesso"
      />
      <ProfiloSettings
        email={user.email}
        nomeIniziale={user.nome ?? ""}
        temaIniziale={tema}
      />
    </div>
  );
}
