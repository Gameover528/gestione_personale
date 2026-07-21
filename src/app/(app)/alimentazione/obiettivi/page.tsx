import { PageHeader } from "@/core/components/ui";
import { ObiettiviForm } from "@/modules/alimentazione/components/ObiettiviForm";

export default function ObiettiviPage() {
  return (
    <div>
      <PageHeader title="Obiettivi nutrizionali" />
      <ObiettiviForm />
    </div>
  );
}
