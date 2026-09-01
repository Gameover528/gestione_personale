import { PageHeader } from "@/core/components/ui";
import { PiattoEditor } from "@/modules/alimentazione/components/PiattoEditor";
import { getPiatto } from "@/modules/alimentazione/queries";

export default async function ModificaPiattoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Il piatto viene caricato lato server: l'editor si apre già compilato.
  let piatto = null;
  try {
    piatto = await getPiatto(id);
  } catch {
    piatto = null;
  }

  return (
    <div>
      <PageHeader title="Modifica piatto" />
      {piatto ? (
        <PiattoEditor initial={piatto} />
      ) : (
        <p className="text-sm text-destructive">Piatto non trovato</p>
      )}
    </div>
  );
}
