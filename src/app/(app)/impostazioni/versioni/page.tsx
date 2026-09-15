import { PageHeader } from "@/core/components/ui";
import { RegistroVersioni } from "@/core/versioni/RegistroVersioni";
import { getAmbiente } from "@/core/versioni/ambiente";
import { RILASCI, NON_RILASCIATO } from "@/core/versioni/changelog";

export default function VersioniPage() {
  const ambiente = getAmbiente();

  return (
    <div>
      <PageHeader
        title="Versioni"
        description="Cosa è cambiato, rilascio per rilascio"
      />
      <RegistroVersioni
        ambiente={ambiente}
        rilasci={RILASCI}
        // In produzione non si mostra il lavoro ancora su sviluppo: chi legge
        // lì vuole sapere cosa sta usando, non cosa arriverà.
        nonRilasciato={ambiente === "dev" ? NON_RILASCIATO : null}
      />
    </div>
  );
}
