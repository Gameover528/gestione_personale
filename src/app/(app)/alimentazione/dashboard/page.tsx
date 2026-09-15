import { PageHeader } from "@/core/components/ui";
import { DashboardGrid } from "@/core/dashboard/DashboardGrid";
import { macroAree, widgetsForMacroArea } from "@/core/modules/registry";

export default function SaluteDashboardPage() {
  // L'id resta "alimentazione" (chiave storica delle dashboard salvate), ma il
  // titolo segue l'etichetta dell'area, che ora comprende anche l'esercizio.
  const area = macroAree.find((a) => a.id === "alimentazione")!;
  return (
    <div>
      <PageHeader
        title={area.label}
        description="Il tuo riepilogo. Clicca Personalizza per riordinare, aggiungere o rimuovere widget."
      />
      <DashboardGrid macroAreaId={area.id} widgets={widgetsForMacroArea(area)} />
    </div>
  );
}
