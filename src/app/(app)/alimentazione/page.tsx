import { PageHeader } from "@/core/components/ui";
import { DiarioGiorno } from "@/modules/alimentazione/components/DiarioGiorno";
import { getObiettivi, listPasti } from "@/modules/alimentazione/queries";
import { oggiIso } from "@/lib/utils";

const GIORNO_VALIDO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Il giorno mostrato sta nell'URL (?data=YYYY-MM-DD), non nello stato del
 * client: così sopravvive alle navigazioni (aggiungi un alimento e torni allo
 * stesso giorno), al tasto indietro e a un link condiviso.
 */
export default async function AlimentazionePage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const { data } = await searchParams;
  const oggi = oggiIso();
  const giorno = data && GIORNO_VALIDO.test(data) ? data : oggi;

  const [pasti, obiettivi] = await Promise.all([
    listPasti(giorno),
    getObiettivi(),
  ]);

  return (
    <div>
      <PageHeader
        title="Diario alimentare"
        description="Registra i pasti e tieni d'occhio i tuoi obiettivi"
      />
      <DiarioGiorno
        giorno={giorno}
        oggi={oggi}
        pastiIniziali={pasti}
        obiettiviIniziali={obiettivi}
      />
    </div>
  );
}
