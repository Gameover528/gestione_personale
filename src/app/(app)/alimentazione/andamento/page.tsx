import { PageHeader } from "@/core/components/ui";
import { AndamentoAlimentazione } from "@/modules/alimentazione/components/AndamentoAlimentazione";
import { getObiettivi, statistichePeriodo } from "@/modules/alimentazione/queries";

const GIORNI_INIZIALI = 30;

export default async function AndamentoPage() {
  const [dati, obiettivi] = await Promise.all([
    statistichePeriodo(GIORNI_INIZIALI),
    getObiettivi(),
  ]);

  return (
    <div>
      <PageHeader
        title="Andamento"
        description="Calorie e macronutrienti nel tempo, confrontati con i tuoi obiettivi"
      />
      <AndamentoAlimentazione
        giorniIniziali={GIORNI_INIZIALI}
        datiIniziali={dati}
        obiettivi={obiettivi}
      />
    </div>
  );
}
