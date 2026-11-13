import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shared/AppShell";
import { ClassicLobbyIntro, ClassicLobbyContent } from "@/features/game/components/ClassicLobbyIntro";
import { getGameSessionsForUser } from "@/features/game/services/game-session.service";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ui = await getTranslations("ui");
  return { title: ui("classicSquads") + " | Football Life" };
}

export default async function ClassicLobbyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const sessions = await getGameSessionsForUser(user.id);

  return (
    <AppShell
      backHref="/"
      backLabel="modeSelect"
      className="football-classic-lobby-shell"
      headerIdentityMeta={<span>Classic</span>}
    >
      <section className="football-classic-lobby">
        <ClassicLobbyIntro sessionCount={sessions.length} />
        <ClassicLobbyContent sessions={sessions} />
      </section>
    </AppShell>
  );
}
