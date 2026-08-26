import { PageHeader } from "@/core/components/ui";
import { DashboardGrid } from "@/core/dashboard/DashboardGrid";
import { macroAree, widgetsForMacroArea } from "@/core/modules/registry";

export default function AlimentazioneDashboardPage() {
  const area = macroAree.find((a) => a.id === "alimentazione")!;
  return (
    <div>
      <PageHeader
        title="Alimentazione"
        description="Il tuo riepilogo. Clicca Personalizza per riordinare, aggiungere o rimuovere widget."
      />
      <DashboardGrid macroAreaId={area.id} widgets={widgetsForMacroArea(area)} />
    </div>
  );
}
