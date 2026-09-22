import type { Metadata } from "next";
import { AppShell } from "@/components/shared/AppShell";
import { createClient } from "@/lib/supabase/server";
import { QuickModeScreen } from "@/features/quick-mode/components/QuickModeScreen";
import { getQuickModeOptions } from "@/features/quick-mode/lib/quick-mode-options";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quick Mode · Career | Football Life",
};

export default async function QuickModePlayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { leagues, clubs } = getQuickModeOptions();

  return (
    <AppShell
      className="football-quick-mode-shell"
      userEmail={user?.email}
      backHref="/quick"
      backLabel="Về setup"
    >
      <QuickModeScreen leagues={leagues} clubs={clubs} isAuthenticated={Boolean(user)} />
    </AppShell>
  );
}
