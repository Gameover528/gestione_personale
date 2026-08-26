import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/core/components/ui";
import { AbbonamentiList } from "@/modules/abbonamenti/components/AbbonamentiList";

export default function AbbonamentiPage() {
  return (
    <div>
      <PageHeader
        title="Abbonamenti"
        description="Spese ricorrenti: le rate vengono generate automaticamente in base alla frequenza scelta."
        action={
          <Link
            href="/abbonamenti/nuovo"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nuovo abbonamento
          </Link>
        }
      />
      <AbbonamentiList />
    </div>
  );
}
