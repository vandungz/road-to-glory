import { notFound } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { Homepage } from "@/features/game/components/Homepage";
import { DesignPreview } from "./DesignPreview";
import { previewClassicSessions } from "./fixtures";

export default async function DesignPreviewPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view } = await searchParams;
  if (view === "Home") {
    return <AppShell className="football-homepage-shell" showAccountControls isAuthenticated>
      <Homepage sessions={previewClassicSessions} isAuthenticated />
    </AppShell>;
  }
  return <DesignPreview initialTab={view} />;
}
