import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shared/AppShell";
import { ClassicLobbyIntro, ClassicLobbyContent } from "@/features/game/components/ClassicLobbyIntro";
import { getGameSessionsForUser } from "@/features/game/services/game-session.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đội hình Classic | Football Life",
};

export default async function ClassicLobbyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const sessions = await getGameSessionsForUser(user.id);

  return (
    <AppShell
      userEmail={user?.email}
      backHref="/"
      backLabel="Về chọn chế độ"
      className="football-classic-lobby-shell"
      headerIdentityMeta={<span>Classic</span>}
    >
      <section className="football-classic-lobby">
        <Link className="football-classic-lobby__back" href="/"><ChevronLeft aria-hidden="true" size={14} /> Chọn chế độ</Link>
        <ClassicLobbyIntro sessionCount={sessions.length} />
        <ClassicLobbyContent sessions={sessions} />
      </section>
    </AppShell>
  );
}
