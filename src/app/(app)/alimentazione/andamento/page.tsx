import { PageHeader } from "@/core/components/ui";
import { AndamentoSalute } from "@/core/dashboard/AndamentoSalute";
import { getObiettivi, statistichePeriodo } from "@/modules/alimentazione/queries";
import { andamentoAllenamenti } from "@/modules/esercizio/allenamenti";

const GIORNI_INIZIALI = 30;

export default async function AndamentoPage() {
  const [cibo, allenamenti, obiettivi] = await Promise.all([
    statistichePeriodo(GIORNI_INIZIALI),
    andamentoAllenamenti(GIORNI_INIZIALI),
    getObiettivi(),
  ]);

  return (
    <div>
      <PageHeader
        title="Andamento"
        description="Come sono andati cibo e allenamento nel tempo, confrontati con i tuoi obiettivi"
      />
      <AndamentoSalute
        giorniIniziali={GIORNI_INIZIALI}
        ciboIniziale={cibo}
        allenamentiIniziali={allenamenti}
        obiettivi={obiettivi}
      />
    </div>
  );
}
