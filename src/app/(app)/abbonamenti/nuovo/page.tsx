import { PageHeader } from "@/core/components/ui";
import { AbbonamentoForm } from "@/modules/abbonamenti/components/AbbonamentoForm";

export default function NuovoAbbonamentoPage() {
  return (
    <div>
      <PageHeader title="Nuovo abbonamento" />
      <AbbonamentoForm />
    </div>
  );
}
