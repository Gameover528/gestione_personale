import { PageHeader } from "@/core/components/ui";
import { SchedeList } from "@/modules/esercizio/components/SchedeList";

export default function SchedePage() {
  return (
    <div>
      <PageHeader
        title="Schede"
        description="I programmi che si ripetono: preparali una volta e avviali quando ti alleni, con gli esercizi già pronti."
      />
      <SchedeList />
    </div>
  );
}
