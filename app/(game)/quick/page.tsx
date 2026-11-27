import type { Metadata } from "next";
import { AppShell } from "@/components/shared/AppShell";
import { QuickModeSetupScreen } from "@/features/quick-mode/components/QuickModeSetupScreen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quick Mode | Football Life",
};

export default function QuickModePage() {

  return (
    <AppShell
      className="football-quick-mode-shell"
      backHref="/"
      backLabel="modeSelect"
    >
      <QuickModeSetupScreen />
    </AppShell>
  );
}
