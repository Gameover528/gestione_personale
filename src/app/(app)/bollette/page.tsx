import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/core/components/ui";
import { BolletteList } from "@/modules/bollette/components/BolletteList";

export default async function BollettePage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string }>;
}) {
  const { stato } = await searchParams;

  return (
    <div>
      <PageHeader
        title="Bollette"
        description="Gestisci le tue utenze e scadenze"
        action={
          <Link
            href="/bollette/nuova"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nuova bolletta
          </Link>
        }
      />
      <BolletteList initialStato={stato} />
    </div>
  );
}
