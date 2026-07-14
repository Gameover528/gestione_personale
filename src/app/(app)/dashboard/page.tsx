import { PageHeader } from "@/core/components/ui";
import { DashboardGrid } from "@/core/dashboard/DashboardGrid";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Il tuo riepilogo. Clicca Personalizza per riordinare, aggiungere o rimuovere widget."
      />
      <DashboardGrid />
    </div>
  );
}
