import { notFound } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { ClassicLobbyIntro, ClassicLobbyContent } from "@/features/game/components/ClassicLobbyIntro";
import { SquadDashboard } from "@/features/squad/components/SquadDashboard";
import { FORMATION_SLOTS } from "@/types/squad";
import { previewClassicSessions, previewPlayers } from "../design-preview/fixtures";

export default async function ClassicPreviewPage({ searchParams }: { searchParams: Promise<{ view?: string; used?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view, used } = await searchParams;
  if (view === "squad" || view === "complete") {
    const completed = view === "complete";
    const formation = completed ? "3-5-2" : "4-3-3";
    const slots = FORMATION_SLOTS[formation];
    const players = completed
      ? previewPlayers.map((player, index) => ({ ...player, position: slots[index].position }))
      : previewPlayers.filter((player) => [2, 4, 6, 8, 9, 10].includes(player.slotIndex));
    return <AppShell className="football-squad-board-shell" backHref="/dev/classic-preview" backLabel="squads">
      <SquadDashboard gameId="design-preview" managementPreview playerMoveUsed={used === "1"} formation={formation} status={completed ? "completed" : "in_progress"} squadRating={83}
        sessionName="Đội hình thử nghiệm" players={players} slots={slots} inProgressSlots={completed ? [] : [0]} />
    </AppShell>;
  }
  return <AppShell className="football-classic-lobby-shell" headerIdentityMeta="Classic" backHref="/" backLabel="modeSelect">
    <section className="football-classic-lobby">
      <ClassicLobbyIntro sessionCount={previewClassicSessions.length} />
      <ClassicLobbyContent sessions={previewClassicSessions} />
    </section>
  </AppShell>;
}
