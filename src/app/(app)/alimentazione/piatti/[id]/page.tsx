import { PageHeader } from "@/core/components/ui";
import { PiattoEditor } from "@/modules/alimentazione/components/PiattoEditor";
import { getPiatto, listPiatti } from "@/modules/alimentazione/queries";

export default async function ModificaPiattoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Il piatto viene caricato lato server: l'editor si apre già compilato.
  // Con esso l'elenco degli altri piatti, che la ricerca degli ingredienti
  // propone senza chiamate mentre si scrive.
  const [piatto, piatti] = await Promise.all([
    getPiatto(id).catch(() => null),
    listPiatti(),
  ]);

  return (
    <div>
      <PageHeader title="Modifica piatto" />
      {piatto ? (
        <PiattoEditor initial={piatto} piatti={piatti} />
      ) : (
        <p className="text-sm text-destructive">Piatto non trovato</p>
      )}
    </div>
  );
}
