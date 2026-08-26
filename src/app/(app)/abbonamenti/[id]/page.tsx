import { notFound } from "next/navigation";
import { PageHeader } from "@/core/components/ui";
import { getAbbonamento } from "@/modules/abbonamenti/queries";
import { AbbonamentoDettaglio } from "@/modules/abbonamenti/components/AbbonamentoDettaglio";

export default async function AbbonamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const abbonamento = await getAbbonamento(id);
  if (!abbonamento) notFound();

  return (
    <div>
      <PageHeader title={abbonamento.nome} />
      <AbbonamentoDettaglio abbonamento={abbonamento} />
    </div>
  );
}
