import { PageHeader } from "@/core/components/ui";
import { PiattiList } from "@/modules/alimentazione/components/PiattiList";

export default function PiattiPage() {
  return (
    <div>
      <PageHeader
        title="I miei piatti"
        description="Ricette composte: la somma dei valori degli ingredienti"
      />
      <PiattiList />
    </div>
  );
}
