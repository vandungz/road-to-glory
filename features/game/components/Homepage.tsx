"use client";

import { PageGuide } from "@/features/onboarding/GuideProvider";
import { useTranslations } from "next-intl";
import { EditorialArt } from "@/components/shared/EditorialArt";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CreateGameDialog } from "./CreateGameDialog";
import type { GameSessionSummary } from "@/types/game";

interface HomepageProps {
  sessions: GameSessionSummary[];
  isAuthenticated: boolean;
}

function ModeStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="football-home-mode__stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function Homepage({ sessions, isAuthenticated }: HomepageProps) {
  const ui = useTranslations("ui");
  const activeSession = sessions.find((session) => session.status === "in_progress");
  const highestSquadRating = sessions.reduce<number | null>((highest, session) => (
    session.squadRating === null ? highest : highest === null ? session.squadRating : Math.max(highest, session.squadRating)
  ), null);

  function continueCareer() {
    if (activeSession) window.location.href = `/classic/${activeSession.id}`;
  }

  return (
    <div className="football-homepage">
      <PageGuide id="home" />
      <div className="football-homepage__head">
        <h1>{ui("chooseAMode")}</h1>
      </div>

      <div className="football-homepage__modes" data-guide="home-modes">
        <section className="football-home-mode football-home-mode--active" aria-labelledby="classic-mode-title">
          <div className="football-home-mode__content">
            <div className="football-home-mode__copy">
              <h2 id="classic-mode-title">Classic</h2>
              <p>{ui("draft11PlayersAndPlayThroughTheirCareersSeasonBySeason")}</p>
            </div>

            {sessions.length > 0 && <div className="football-home-mode__stats">
              <ModeStat label={ui("squads")} value={sessions.length} />
              {highestSquadRating !== null && <ModeStat label={ui("highestSquadOvr")} value={highestSquadRating} />}
              {activeSession && <ModeStat label={ui("drafted")} value={`${activeSession.playerCount}/11`} />}
            </div>}

            <div className="football-home-mode__actions">
              {activeSession ? (
                <Button size="lg" onClick={continueCareer}>{ui("resumeNamed", { name: activeSession.name })}</Button>
              ) : isAuthenticated ? (
                <CreateGameDialog />
              ) : (
                <Link className="football-button football-button--primary football-button--lg" href="/login?next=/classic">{ui("signInToPlayClassic")}</Link>
              )}
              {isAuthenticated && <Link className="football-button football-button--outline football-button--lg" href="/classic">{ui("allSquads")}</Link>}
            </div>
          </div>
          <div className="football-home-mode__art" aria-hidden="true"><EditorialArt asset="heritage-run" priority /></div>
        </section>

        <div className="football-homepage__discover football-homepage__discover-grid">
            <section className="football-home-mode football-home-mode--quick" aria-labelledby="quick-mode-title">
              <div className="football-home-mode__copy">
                <h2 id="quick-mode-title">Quick Mode</h2>
                <p>{ui("playWithoutAnAccount2")}</p>
              </div>
              <div className="football-home-mode__quick-cta">
                <Link className="football-button football-button--outline" href="/quick">{ui("playQuickMode")}</Link>
              </div>
            </section>

            <section className="football-home-mode football-home-mode--pve" aria-labelledby="pve-mode-title">
              <div className="football-home-mode__copy">
                <h2 id="pve-mode-title">PvE Tournament</h2>
                <p>{ui("competeWithACompletedClassicSquad")}</p>
              </div>
              <div className="football-home-mode__locked-action">
                <Link className="football-button football-button--outline" href="/pve">{ui("enterTournament")}</Link>
              </div>
            </section>
        </div>
      </div>
    </div>
  );
}
