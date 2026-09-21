import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shared/AppShell";
import { CreateGameDialog } from "@/features/game/components/CreateGameDialog";
import { GameList } from "@/features/game/components/GameList";
import { getGameSessionsForUser } from "@/features/game/services/game-session.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đội hình Classic | Football Life",
};

export default async function ClassicLobbyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const sessions = await getGameSessionsForUser(user!.id);

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
        <div className="football-classic-lobby__intro">
          <div className="football-classic-lobby__intro-copy">
            <span className="football-classic-lobby__eyebrow">02 · Danh sách đội hình</span>
            <h1>Đội hình của bạn</h1>
            <span className="football-classic-lobby__status"><i aria-hidden="true" /> Đang có · {sessions.length} đội hình</span>
          </div>
          <CreateGameDialog />
        </div>
        <GameList sessions={sessions} />
      </section>
    </AppShell>
  );
}
