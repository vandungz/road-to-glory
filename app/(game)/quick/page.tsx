import type { Metadata } from "next";
import { AppShell } from "@/components/shared/AppShell";
import { createClient } from "@/lib/supabase/server";
import { QuickModeSetupScreen } from "@/features/quick-mode/components/QuickModeSetupScreen";
import { getQuickModeOptions } from "@/features/quick-mode/lib/quick-mode-options";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quick Mode | Football Life",
};

export default async function QuickModePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { leagues, clubs } = getQuickModeOptions();

  return (
    <AppShell
      className="football-quick-mode-shell"
      userEmail={user?.email}
      backHref="/"
      backLabel="Về chọn chế độ"
    >
      <QuickModeSetupScreen leagues={leagues} clubs={clubs} isAuthenticated={Boolean(user)} />
    </AppShell>
  );
}
