import { EditorialRail } from "@/components/shared/EditorialArt";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import type { PveSessionCard } from "@/types/pve";
import { PVE_LINEUP_SIZE } from "@/types/pve";
import { roundLabel } from "@/features/pve/services/pve-engine.service";

function SessionCard({ session }: { session: PveSessionCard }) {
  const isComplete = session.tournamentStatus === "champion";
  const isStarted = session.tournamentStatus !== null;
  const isReplay = session.tournamentStatus === "eliminated" || isComplete;
  return (
    <Link href={`/pve/${session.gameId}`} className="football-pve-lobby__session">
      <div className="football-pve-lobby__session-copy">
        <span className="football-pve-lobby__session-meta">{session.formation} · {PVE_LINEUP_SIZE} cầu thủ · {session.squadRating ?? "—"} OVR</span>
        <h2>{session.name}</h2>
        <span className="football-pve-lobby__session-status">{isComplete ? "Đã vô địch" : isStarted ? roundLabel(session.tournamentStatus!) : "Chưa bắt đầu"}</span>
      </div>
      <span className="football-pve-lobby__session-action"><span>{isReplay ? "Chơi lại" : isStarted ? "Tiếp tục giải" : "Bắt đầu giải"}</span><ArrowRight aria-hidden="true" size={18} /></span>
    </Link>
  );
}

export function PveLobby({ sessions }: { sessions: PveSessionCard[] }) {
  return (
    <section className="football-pve-lobby">
      <Link className="football-pve-lobby__back" href="/"><ArrowRight aria-hidden="true" size={14} className="is-back" /> Chọn chế độ</Link>
      <div className="football-pve-lobby__intro">
        <div>
          <h1>Chọn đội hình dự giải</h1>
          <p>Dùng đội hình Classic đã hoàn thành để tham gia giải PvE.</p>
        </div>
      </div>
      <div className="football-editorial-content football-pve-lobby__content">
      {sessions.length > 0 ? (
        <div className="football-pve-lobby__list" aria-label="Đội hình Classic đã hoàn thành">
          {sessions.map((session) => <SessionCard key={session.gameId} session={session} />)}
        </div>
      ) : (
        <div className="football-pve-lobby__empty"><Trophy aria-hidden="true" size={24} /><h2>Chưa có đội hình đủ điều kiện</h2><p>Hoàn thành đủ 11 cầu thủ trong Classic trước khi bước vào giải.</p><Link className="football-button football-button--primary" href="/classic">Mở Classic</Link></div>
      )}
      <EditorialRail asset="free-kick" />
      </div>
    </section>
  );
}
