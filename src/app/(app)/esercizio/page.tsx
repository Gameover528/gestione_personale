import { PageHeader } from "@/core/components/ui";
import { AllenamentiList } from "@/modules/esercizio/components/AllenamentiList";

export default function AllenamentiPage() {
  return (
    <div>
      <PageHeader
        title="Allenamenti"
        description="Le sessioni che hai svolto, con gli esercizi, le serie e le calorie stimate."
      />
      <AllenamentiList />
    </div>
  );
}
