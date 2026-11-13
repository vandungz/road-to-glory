import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shared/AppShell";
import { Homepage } from "@/features/game/components/Homepage";
import { getGameSessionsForUser } from "@/features/game/services/game-session.service";

export const dynamic = "force-dynamic";

export default async function LobbyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const sessions = user ? await getGameSessionsForUser(user.id) : [];

  return (
    <AppShell
      className="football-homepage-shell" showAccountControls
      isAuthenticated={Boolean(user)}
    >
      <Homepage sessions={sessions} isAuthenticated={Boolean(user)} />
    </AppShell>
  );
}
