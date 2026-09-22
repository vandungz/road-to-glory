"use client";

import { useEffect, useState } from "react";
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

function ModeMeta({ mode, status, tone = "" }: { mode: string; status: string; tone?: string }) {
  return (
    <div className="football-home-mode__meta">
      <span>Chế độ {mode}</span>
      <i aria-hidden="true" />
      <span className={tone}>{status}</span>
    </div>
  );
}

function ModeArt() {
  return (
    <div className="football-home-mode__art" aria-hidden="true">
      <span className="football-home-mode__art-mark">CLASSIC</span>
      <span>Build a squad. Write a career.</span>
      <small>Football Life · full career mode</small>
    </div>
  );
}

export function Homepage({ sessions, isAuthenticated }: HomepageProps) {
  const [motionKey, setMotionKey] = useState(0);
  const activeSession = sessions.find((session) => session.status === "in_progress");
  const highestSquadRating = sessions.reduce<number | null>((highest, session) => (
    session.squadRating === null ? highest : highest === null ? session.squadRating : Math.max(highest, session.squadRating)
  ), null);

  useEffect(() => {
    const replay = () => setMotionKey((key) => key + 1);
    window.addEventListener("rtg:replay-motion", replay);
    return () => window.removeEventListener("rtg:replay-motion", replay);
  }, []);

  function continueCareer() {
    if (activeSession) window.location.href = `/classic/${activeSession.id}`;
  }

  return (
    <div className="football-homepage" key={motionKey}>
      <div className="football-homepage__head" data-anim>
        <span className="football-homepage__eyebrow">{isAuthenticated ? "Football Life lobby" : "Guest lobby"}</span>
        <h1>Hôm nay bạn chơi gì?</h1>
      </div>

      <div className="football-homepage__modes">
        <section className="football-home-mode football-home-mode--active" data-anim aria-labelledby="classic-mode-title">
          <div className="football-home-mode__content">
            <div className="football-home-mode__copy">
              <ModeMeta mode="01" status="Đang mở" tone="is-open" />
              <h2 id="classic-mode-title">Classic</h2>
              <p>Mười ba vòng quay tạo ra một cầu thủ, mười sáu mùa quyết định anh ta trở thành ai.</p>
            </div>

            <div className="football-home-mode__stats">
              <ModeStat label="Đội hình" value={sessions.length} />
              <ModeStat label="Squad OVR cao nhất" value={highestSquadRating ?? "—"} />
            </div>

            <div className="football-home-mode__actions">
              {activeSession ? (
                <Button size="lg" onClick={continueCareer}>Tiếp tục {activeSession.name}</Button>
              ) : isAuthenticated ? (
                <CreateGameDialog />
              ) : (
                <Link className="football-button football-button--primary football-button--lg" href="/login?next=/classic">Đăng nhập để chơi Classic</Link>
              )}
              <Link className="football-button football-button--outline football-button--lg" href="/classic">Tất cả đội hình</Link>
              <span>{activeSession ? `${activeSession.playerCount} / 11 cầu thủ đã draft` : "Chưa có đội hình đang dở"}</span>
            </div>
          </div>
          <ModeArt />
        </section>

        <section className="football-homepage__discover" data-anim aria-labelledby="discover-title">
          <div className="football-homepage__discover-head">
            <div>
              <span className="football-homepage__eyebrow">Khám phá</span>
              <h2 id="discover-title">Chơi theo nhịp của bạn</h2>
            </div>
            <span>Hai mode khác nhau · một hành trình bóng đá</span>
          </div>

          <div className="football-homepage__discover-grid">
            <section className="football-home-mode football-home-mode--quick" aria-labelledby="quick-mode-title">
              <div className="football-home-mode__copy">
                <ModeMeta mode="02" status="Guest · Đang mở" tone="is-open" />
                <h2 id="quick-mode-title">Quick Mode</h2>
                <p>Một career nhẹ hơn để quay wheel nhanh — không cần login và không lưu kết quả vào tài khoản.</p>
              </div>
              <div className="football-home-mode__quick-cta">
                <span>Guest friendly · chơi ngay</span>
                <Link className="football-button football-button--primary" href="/quick">Chơi Quick Mode mới</Link>
              </div>
            </section>

            <section className="football-home-mode football-home-mode--pvp" aria-labelledby="pvp-mode-title">
              <div className="football-home-mode__copy">
                <ModeMeta mode="03" status="Sắp ra mắt" tone="is-coming" />
                <h2 id="pvp-mode-title">PvP — Đối đầu</h2>
                <p>Đưa một đội hình bạn đã dựng ở Classic đi đấu với người chơi khác.</p>
              </div>
              <div className="football-home-mode__locked-action">
                <span>Đội hình Classic của bạn sẽ tự sẵn sàng</span>
                <span className="football-home-mode__locked-button">Sắp ra mắt</span>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
