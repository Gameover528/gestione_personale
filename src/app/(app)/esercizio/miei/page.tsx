import { PageHeader } from "@/core/components/ui";
import { EserciziList } from "@/modules/esercizio/components/EserciziList";

export default function MieiEserciziPage() {
  return (
    <div>
      <PageHeader
        title="I miei esercizi"
        description="Gli esercizi che ti sei creato, per quello che il catalogo non copre. Compaiono nella ricerca insieme a quelli del catalogo."
      />
      <EserciziList soloMiei />
    </div>
  );
}
