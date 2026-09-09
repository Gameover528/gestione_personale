import { PageHeader } from "@/core/components/ui";
import { PiattoEditor } from "@/modules/alimentazione/components/PiattoEditor";
import { listPiatti } from "@/modules/alimentazione/queries";

export default async function NuovoPiattoPage() {
  // I piatti già salvati arrivano col resto della pagina: la ricerca degli
  // ingredienti li propone senza chiedere niente al server mentre si scrive.
  const piatti = await listPiatti();

  return (
    <div>
      <PageHeader title="Nuovo piatto" />
      <PiattoEditor piatti={piatti} />
    </div>
  );
}
