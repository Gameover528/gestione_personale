import { PageHeader } from "@/core/components/ui";
import { listPesate } from "@/modules/peso/queries";
import { RegistroPeso } from "@/modules/peso/components/RegistroPeso";

export default async function PesoPage() {
  const pesate = await listPesate();

  return (
    <div>
      <PageHeader
        title="Peso"
        description="Segna quanto pesi e guarda dove sta andando, non dove è oggi"
      />
      <RegistroPeso iniziali={pesate} />
    </div>
  );
}
