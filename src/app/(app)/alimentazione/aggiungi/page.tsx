import { Suspense } from "react";
import { PageHeader } from "@/core/components/ui";
import { RicercaAggiungi } from "@/modules/alimentazione/components/RicercaAggiungi";
import { listPiatti, listRecenti } from "@/modules/alimentazione/queries";

export default async function AggiungiAlimentoPage() {
  // Recenti e piatti sono già pronti al primo render: la scheda che si apre
  // per prima non deve aspettare una chiamata dal client.
  const [recenti, piatti] = await Promise.all([listRecenti(), listPiatti()]);

  return (
    <div>
      <PageHeader title="Aggiungi alimento" />
      <Suspense fallback={null}>
        <RicercaAggiungi recentiIniziali={recenti} piattiIniziali={piatti} />
      </Suspense>
    </div>
  );
}
