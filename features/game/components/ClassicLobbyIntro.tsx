import { EditorialRail } from "@/components/shared/EditorialArt";
import { CreateGameDialog } from "./CreateGameDialog";
import { GameList } from "./GameList";
import type { GameSessionSummary } from "@/types/game";

export function ClassicLobbyIntro({ sessionCount }: { sessionCount: number }) {
  return <div className="football-classic-lobby__intro">
    <div className="football-classic-lobby__intro-copy">
      <h1>Đội hình của bạn</h1>
      <span className="football-classic-lobby__status">{sessionCount} đội hình</span>
    </div>
    <CreateGameDialog />
  </div>;
}

export function ClassicLobbyContent({ sessions }: { sessions: GameSessionSummary[] }) {
  return <div className="football-editorial-content football-classic-lobby__content">
    <GameList sessions={sessions} />
    <EditorialRail asset="volley-control" />
  </div>;
}
