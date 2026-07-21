import { PageHeader } from "@/core/components/ui";
import { DiarioGiorno } from "@/modules/alimentazione/components/DiarioGiorno";

export default function AlimentazionePage() {
  return (
    <div>
      <PageHeader
        title="Diario alimentare"
        description="Registra i pasti e tieni d'occhio i tuoi obiettivi"
      />
      <DiarioGiorno />
    </div>
  );
}
