import { PageHeader } from "@/core/components/ui";
import { EserciziList } from "@/modules/esercizio/components/EserciziList";

export default function EsercizioPage() {
  return (
    <div>
      <PageHeader
        title="Esercizio"
        description="Cerca un esercizio per vedere quali muscoli lavora, con quale attrezzo e come si esegue."
      />
      <EserciziList />
    </div>
  );
}
