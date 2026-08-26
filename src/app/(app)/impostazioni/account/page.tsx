import { PageHeader } from "@/core/components/ui";
import { AccountSettings } from "@/modules/impostazioni/components/AccountSettings";

export default function AccountPage() {
  return (
    <div>
      <PageHeader
        title="Account e sicurezza"
        description="Password e sessioni attive."
      />
      <AccountSettings />
    </div>
  );
}
