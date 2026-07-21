import { PageHeader } from "@/core/components/ui";
import { PiattoEditor } from "@/modules/alimentazione/components/PiattoEditor";

export default function NuovoPiattoPage() {
  return (
    <div>
      <PageHeader title="Nuovo piatto" />
      <PiattoEditor />
    </div>
  );
}
