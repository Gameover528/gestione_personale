import { PageHeader } from "@/core/components/ui";
import { AndamentoSalute } from "@/core/dashboard/AndamentoSalute";
import { getObiettivi, statistichePeriodo } from "@/modules/alimentazione/queries";
import { andamentoAllenamenti } from "@/modules/esercizio/allenamenti";
import { getPreferenzeEsercizio } from "@/modules/esercizio/queries";

const GIORNI_INIZIALI = 30;

export default async function AndamentoPage() {
  const [cibo, allenamenti, obiettivi, preferenze] = await Promise.all([
    statistichePeriodo(GIORNI_INIZIALI),
    andamentoAllenamenti(GIORNI_INIZIALI),
    getObiettivi(),
    getPreferenzeEsercizio(),
  ]);

  return (
    <div>
      <PageHeader
        title="Andamento"
        description="Come sono andati cibo e allenamento nel tempo, confrontati con i tuoi obiettivi"
      />
      <AndamentoSalute
        giorniIniziali={GIORNI_INIZIALI}
        giorniSettimana={preferenze.giorniSettimana}
        ciboIniziale={cibo}
        allenamentiIniziali={allenamenti}
        obiettivi={obiettivi}
      />
    </div>
  );
}
