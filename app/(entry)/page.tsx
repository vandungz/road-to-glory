import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shared/AppShell";
import { LandingPage, landingMetadata } from "@/features/game/components/LandingPage";
import { Homepage } from "@/features/game/components/Homepage";
import { getGameSessionsForUser } from "@/features/game/services/game-session.service";

export const dynamic = "force-dynamic";

export const generateMetadata = () => landingMetadata("vi");

export default async function LobbyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <LandingPage />;

  const sessions = await getGameSessionsForUser(user.id);
  return (
    <AppShell className="football-homepage-shell" showAccountControls isAuthenticated>
      <Homepage sessions={sessions} isAuthenticated />
    </AppShell>
  );
}
