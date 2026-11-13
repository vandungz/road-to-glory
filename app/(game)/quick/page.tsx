import type { Metadata } from "next";
import { AppShell } from "@/components/shared/AppShell";
import { QuickModeSetupScreen } from "@/features/quick-mode/components/QuickModeSetupScreen";
import { getQuickModeOptions } from "@/features/quick-mode/lib/quick-mode-options";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quick Mode | Football Life",
};

export default function QuickModePage() {
  const { leagues, clubs } = getQuickModeOptions();

  return (
    <AppShell
      className="football-quick-mode-shell"
      backHref="/"
      backLabel="modeSelect"
    >
      <QuickModeSetupScreen leagues={leagues} clubs={clubs} />
    </AppShell>
  );
}
