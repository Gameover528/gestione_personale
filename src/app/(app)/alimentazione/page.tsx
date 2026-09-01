import { PageHeader } from "@/core/components/ui";
import { DiarioGiorno } from "@/modules/alimentazione/components/DiarioGiorno";
import { getObiettivi, listPasti } from "@/modules/alimentazione/queries";

export default async function AlimentazionePage() {
  // I dati del giorno corrente arrivano già dal server: la pagina si apre
  // piena invece di mostrare "Caricamento…" e poi riempirsi.
  const oggi = new Date().toISOString().slice(0, 10);
  const [pasti, obiettivi] = await Promise.all([
    listPasti(oggi),
    getObiettivi(),
  ]);

  return (
    <div>
      <PageHeader
        title="Diario alimentare"
        description="Registra i pasti e tieni d'occhio i tuoi obiettivi"
      />
      <DiarioGiorno
        dataIniziale={oggi}
        pastiIniziali={pasti}
        obiettiviIniziali={obiettivi}
      />
    </div>
  );
}
