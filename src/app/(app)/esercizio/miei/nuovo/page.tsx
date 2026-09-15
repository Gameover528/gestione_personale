import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/core/components/ui";
import { FormEsercizio } from "@/modules/esercizio/components/FormEsercizio";

export default function NuovoEsercizioPage() {
  return (
    <div>
      <Link
        href="/esercizio/miei"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        I miei esercizi
      </Link>
      <PageHeader
        title="Nuovo esercizio"
        description="Per quello che il catalogo non copre. Scegli i muscoli dai gruppi che la mappa sa illuminare: l'anteprima ti mostra subito il risultato."
      />
      <FormEsercizio />
    </div>
  );
}
