import { PageGuide } from "@/features/onboarding/GuideProvider";
import { useTranslations } from "next-intl";
import { EditorialRail } from "@/components/shared/EditorialArt";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import type { PveSessionCard } from "@/types/pve";
import { PVE_LINEUP_SIZE } from "@/types/pve";

function SessionCard({ session }: { session: PveSessionCard }) {
  const ui = useTranslations("ui");
  const t = useTranslations("pve");
  const isComplete = session.tournamentStatus === "champion";
  const isStarted = session.tournamentStatus !== null;
  const isReplay = session.tournamentStatus === "eliminated" || isComplete;
  return (
    <Link href={`/pve/${session.gameId}`} className="football-pve-lobby__session">
      <div className="football-pve-lobby__session-copy">
        <span className="football-pve-lobby__session-meta">{session.formation} · {PVE_LINEUP_SIZE} {ui("players2")} {session.squadRating ?? "—"} OVR</span>
        <h2>{session.name}</h2>
        <span className="football-pve-lobby__session-status">{isComplete ? ui("champions") : isStarted ? t(session.tournamentStatus!) : ui("notStarted")}</span>
      </div>
      <span className="football-pve-lobby__session-action"><span>{isReplay ? ui("replay") : isStarted ? ui("resumeTournament") : ui("startTournament")}</span><ArrowRight aria-hidden="true" size={18} /></span>
    </Link>
  );
}

export function PveLobby({ sessions }: { sessions: PveSessionCard[] }) {
  const ui = useTranslations("ui");
  return (
    <section className="football-pve-lobby">
      <PageGuide id="pve" />
      <Link className="football-pve-lobby__back" href="/"><ArrowRight aria-hidden="true" size={14} className="is-back" /> {ui("gameModes")}</Link>
      <div className="football-pve-lobby__intro">
        <div>
          <h1>{ui("chooseASquad")}</h1>
          <p>{ui("enterWithACompletedClassicSquad")}</p>
        </div>
      </div>
      <div className="football-editorial-content football-pve-lobby__content" data-guide="pve-squads">
      {sessions.length > 0 ? (
        <div className="football-pve-lobby__list" aria-label={ui("completedClassicSquads")}>
          {sessions.map((session) => <SessionCard key={session.gameId} session={session} />)}
        </div>
      ) : (
        <div className="football-pve-lobby__empty"><Trophy aria-hidden="true" size={24} /><h2>{ui("noEligibleSquads")}</h2><p>{ui("fillAll11SlotsInClassicToEnter")}</p><Link className="football-button football-button--primary" href="/classic">{ui("openClassic")}</Link></div>
      )}
      <EditorialRail asset="free-kick" />
      </div>
    </section>
  );
}
