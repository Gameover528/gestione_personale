import { PageHeader } from "@/core/components/ui";
import { DashboardGrid } from "@/core/dashboard/DashboardGrid";
import { macroAree, widgetsForMacroArea } from "@/core/modules/registry";

export default function ConsumiCostiDashboardPage() {
  const area = macroAree.find((a) => a.id === "consumi-costi")!;
  return (
    <div>
      <PageHeader
        title="Consumi e Costi"
        description="Il tuo riepilogo. Clicca Personalizza per riordinare, aggiungere o rimuovere widget."
      />
      <DashboardGrid macroAreaId={area.id} widgets={widgetsForMacroArea(area)} />
    </div>
  );
}
