import { PageHeader } from "@/core/components/ui";
import { BollettaForm } from "@/modules/bollette/components/BollettaForm";

export default function NuovaBollettaPage() {
  return (
    <div>
      <PageHeader title="Nuova bolletta" />
      <BollettaForm />
    </div>
  );
}
