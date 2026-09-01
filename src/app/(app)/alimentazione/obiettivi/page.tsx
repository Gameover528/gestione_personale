import { PageHeader } from "@/core/components/ui";
import { ObiettiviForm } from "@/modules/alimentazione/components/ObiettiviForm";
import { getDatiCorporei, getObiettivi } from "@/modules/alimentazione/queries";

export default async function ObiettiviPage() {
  const [obiettivi, corpo] = await Promise.all([
    getObiettivi(),
    getDatiCorporei(),
  ]);

  return (
    <div>
      <PageHeader
        title="Obiettivi nutrizionali"
        description="Se non sai da quali numeri partire, fatteli calcolare dai tuoi dati"
      />
      <ObiettiviForm iniziali={obiettivi} datiCorporeiIniziali={corpo} />
    </div>
  );
}
