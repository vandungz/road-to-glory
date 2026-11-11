"use client";

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
  const activeSession = sessions.find((session) => session.status === "in_progress");
  const highestSquadRating = sessions.reduce<number | null>((highest, session) => (
    session.squadRating === null ? highest : highest === null ? session.squadRating : Math.max(highest, session.squadRating)
  ), null);

  function continueCareer() {
    if (activeSession) window.location.href = `/classic/${activeSession.id}`;
  }

  return (
    <div className="football-homepage">
      <div className="football-homepage__head" data-anim>
        <h1>Hôm nay bạn chơi gì?</h1>
      </div>

      <div className="football-homepage__modes">
        <section className="football-home-mode football-home-mode--active" data-anim aria-labelledby="classic-mode-title">
          <div className="football-home-mode__content">
            <div className="football-home-mode__copy">
              <h2 id="classic-mode-title">Classic</h2>
              <p>Draft 11 cầu thủ và theo dõi từng sự nghiệp qua các mùa giải.</p>
            </div>

            {sessions.length > 0 && <div className="football-home-mode__stats">
              <ModeStat label="Đội hình" value={sessions.length} />
              {highestSquadRating !== null && <ModeStat label="OVR đội hình cao nhất" value={highestSquadRating} />}
              {activeSession && <ModeStat label="Đã draft" value={`${activeSession.playerCount}/11`} />}
            </div>}

            <div className="football-home-mode__actions">
              {activeSession ? (
                <Button size="lg" onClick={continueCareer}>Tiếp tục {activeSession.name}</Button>
              ) : isAuthenticated ? (
                <CreateGameDialog />
              ) : (
                <Link className="football-button football-button--primary football-button--lg" href="/login?next=/classic">Đăng nhập để chơi Classic</Link>
              )}
              {isAuthenticated && <Link className="football-button football-button--outline football-button--lg" href="/classic">Tất cả đội hình</Link>}
            </div>
          </div>
          <div className="football-home-mode__art" aria-hidden="true"><EditorialArt asset="heritage-run" priority /></div>
        </section>

        <div className="football-homepage__discover football-homepage__discover-grid" data-anim>
            <section className="football-home-mode football-home-mode--quick" aria-labelledby="quick-mode-title">
              <div className="football-home-mode__copy">
                <h2 id="quick-mode-title">Quick Mode</h2>
                <p>Chơi nhanh, không cần tài khoản.</p>
              </div>
              <div className="football-home-mode__quick-cta">
                <Link className="football-button football-button--outline" href="/quick">Chơi Quick Mode</Link>
              </div>
            </section>

            <section className="football-home-mode football-home-mode--pve" aria-labelledby="pve-mode-title">
              <div className="football-home-mode__copy">
                <h2 id="pve-mode-title">PvE Tournament</h2>
                <p>Thi đấu bằng đội hình Classic đã hoàn thành.</p>
              </div>
              <div className="football-home-mode__locked-action">
                <Link className="football-button football-button--outline" href="/pve">Vào giải đấu</Link>
              </div>
            </section>
        </div>
      </div>
    </div>
  );
}
