import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shared/AppShell";
import { ReplayMotionButton } from "@/components/shared/ReplayMotionButton";
import { Homepage } from "@/features/game/components/Homepage";
import { getGameSessionsForUser } from "@/features/game/services/game-session.service";

export const dynamic = "force-dynamic";

export default async function LobbyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const sessions = await getGameSessionsForUser(user!.id);

  return (
    <AppShell
      className="football-homepage-shell"
      userEmail={user?.email}
      footerAction={<ReplayMotionButton />}
    >
      <Homepage sessions={sessions} />
    </AppShell>
  );
}
