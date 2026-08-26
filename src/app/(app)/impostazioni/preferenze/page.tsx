import { PageHeader } from "@/core/components/ui";
import { PreferenzeModuli } from "@/modules/impostazioni/components/PreferenzeModuli";

export default function PreferenzePage() {
  return (
    <div>
      <PageHeader
        title="Preferenze moduli"
        description="Valori di default per Bollette e Alimentazione."
      />
      <PreferenzeModuli />
    </div>
  );
}
