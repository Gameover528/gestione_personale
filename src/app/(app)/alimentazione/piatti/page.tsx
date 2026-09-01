import { PageHeader } from "@/core/components/ui";
import { PiattiList } from "@/modules/alimentazione/components/PiattiList";
import { listPiatti } from "@/modules/alimentazione/queries";

export default async function PiattiPage() {
  const piatti = await listPiatti();
  return (
    <div>
      <PageHeader
        title="I miei piatti"
        description="Il tuo archivio personale: ricette con ingredienti oppure piatti e prodotti con i valori dell'etichetta. Compaiono nella ricerca quando aggiungi un pasto."
      />
      <PiattiList iniziali={piatti} />
    </div>
  );
}
