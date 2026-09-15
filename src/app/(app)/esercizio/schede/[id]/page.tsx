import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SchedaDettaglio } from "@/modules/esercizio/components/SchedaDettaglio";

export default async function SchedaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/esercizio/schede"
        className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Schede
      </Link>
      <SchedaDettaglio id={id} />
    </div>
  );
}
