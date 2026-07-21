import { Suspense } from "react";
import { PageHeader } from "@/core/components/ui";
import { RicercaAggiungi } from "@/modules/alimentazione/components/RicercaAggiungi";

export default function AggiungiAlimentoPage() {
  return (
    <div>
      <PageHeader title="Aggiungi alimento" />
      <Suspense fallback={null}>
        <RicercaAggiungi />
      </Suspense>
    </div>
  );
}
