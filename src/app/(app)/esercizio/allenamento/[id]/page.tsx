import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AllenamentoDettaglio } from "@/modules/esercizio/components/AllenamentoDettaglio";

export default async function AllenamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/esercizio"
        className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Allenamenti
      </Link>
      <AllenamentoDettaglio id={id} />
    </div>
  );
}
