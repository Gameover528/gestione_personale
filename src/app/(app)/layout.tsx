import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { AppShell } from "@/core/components/AppShell";
import { ToastProvider } from "@/core/components/Toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) redirect("/login");

  return (
    <ToastProvider>
      <AppShell userEmail={user.email} ruolo={user.ruolo}>
        {children}
      </AppShell>
    </ToastProvider>
  );
}
