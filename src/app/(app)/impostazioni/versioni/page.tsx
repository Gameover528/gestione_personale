import { PageHeader } from "@/core/components/ui";
import { RegistroVersioni } from "@/core/versioni/RegistroVersioni";
import { getAmbiente } from "@/core/versioni/ambiente";
import { RILASCI, devInclusi, type Rilascio } from "@/core/versioni/changelog";

export default function VersioniPage() {
  const ambiente = getAmbiente();

  // Le voci dev raccolte da ogni rilascio di produzione, risolte qui perche'
  // il componente client riceva solo dati semplici.
  const devPerVersione: Record<string, Rilascio[]> = {};
  for (const r of RILASCI) {
    const dev = devInclusi(r);
    if (dev.length > 0) devPerVersione[r.versione] = dev;
  }

  return (
    <div>
      <PageHeader
        title="Versioni"
        description="Cosa è cambiato, rilascio per rilascio, nell'ambiente in cui stai navigando"
      />
      <RegistroVersioni
        ambiente={ambiente}
        rilasci={RILASCI}
        devPerVersione={devPerVersione}
      />
    </div>
  );
}
