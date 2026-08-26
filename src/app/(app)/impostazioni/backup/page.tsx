import { Download } from "lucide-react";
import { Card, CardTitle, PageHeader } from "@/core/components/ui";
import { requireSessionUser } from "@/lib/auth/session";
import { SincronizzaProdSuDev } from "@/modules/impostazioni/components/SincronizzaProdSuDev";

export default async function BackupPage() {
  const user = await requireSessionUser();

  return (
    <div>
      <PageHeader
        title="Backup dati"
        description="Scarica una copia dei tuoi dati."
      />
      <div className="space-y-6">
        <Card>
          <CardTitle>Esporta i tuoi dati</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Genera un file JSON con tutte le tue bollette, il diario alimentare,
            i piatti e le preferenze. Non include gli allegati PDF (restano su
            Workers KV).
          </p>
          <a
            href="/api/backup"
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Download className="h-4 w-4" />
            Scarica backup (JSON)
          </a>
        </Card>

        {user.ruolo === "superadmin" && <SincronizzaProdSuDev />}
      </div>
    </div>
  );
}
