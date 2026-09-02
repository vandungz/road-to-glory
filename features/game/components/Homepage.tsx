"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CreateGameDialog } from "./CreateGameDialog";
import type { GameSessionSummary } from "@/types/game";

interface HomepageProps {
  sessions: GameSessionSummary[];
}

function ModeStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rtg-home-mode__stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ModeMeta({ mode, status, tone = "" }: { mode: string; status: string; tone?: string }) {
  return (
    <div className="rtg-home-mode__meta">
      <span>Chế độ {mode}</span>
      <i aria-hidden="true" />
      <span className={tone}>{status}</span>
    </div>
  );
}

function ModeArt() {
  return (
    <div className="rtg-home-mode__art" role="img" aria-label="Ảnh minh họa Classic chưa được cấu hình">
      <span className="rtg-home-mode__art-mark" aria-hidden="true">▧</span>
      <span>Kéo ảnh Classic vào đây — thẻ Panini, sổ lưu niệm, tông ấm</span>
      <small>hoặc browse files</small>
    </div>
  );
}

export function Homepage({ sessions }: HomepageProps) {
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
    <div className="rtg-homepage" key={motionKey}>
      <div className="rtg-homepage__head" data-anim>
        <span className="rtg-homepage__eyebrow">Chào Marco</span>
        <h1>Hôm nay bạn chơi gì?</h1>
      </div>

      <div className="rtg-homepage__modes">
        <section className="rtg-home-mode rtg-home-mode--active" data-anim aria-labelledby="classic-mode-title">
          <div className="rtg-home-mode__content">
            <div className="rtg-home-mode__copy">
              <ModeMeta mode="01" status="Đang mở" tone="is-open" />
              <h2 id="classic-mode-title">Classic</h2>
              <p>Mười ba vòng quay tạo ra một cầu thủ, mười sáu mùa quyết định anh ta trở thành ai.</p>
            </div>

            <div className="rtg-home-mode__stats">
              <ModeStat label="Đội hình" value={sessions.length} />
              <ModeStat label="Squad OVR cao nhất" value={highestSquadRating ?? "—"} />
            </div>

            <div className="rtg-home-mode__actions">
              {activeSession ? (
                <Button size="lg" onClick={continueCareer}>Tiếp tục {activeSession.name}</Button>
              ) : (
                <CreateGameDialog />
              )}
              <Link className="rtg-button rtg-button--outline rtg-button--lg" href="/classic">Tất cả đội hình</Link>
              <span>{activeSession ? `${activeSession.playerCount} / 11 cầu thủ đã draft` : "Chưa có đội hình đang dở"}</span>
            </div>
          </div>
          <ModeArt />
        </section>

        <section className="rtg-home-mode rtg-home-mode--locked" data-anim aria-labelledby="pvp-mode-title">
          <div className="rtg-home-mode__copy">
            <ModeMeta mode="02" status="Sắp ra mắt" tone="is-coming" />
            <h2 id="pvp-mode-title">PvP — Đối đầu</h2>
            <p>Đưa một đội hình bạn đã dựng ở Classic đi đấu với người chơi khác.</p>
          </div>
          <div className="rtg-home-mode__locked-action">
            <span>Đội hình Classic của bạn sẽ tự sẵn sàng</span>
            <span className="rtg-home-mode__locked-button">Sắp ra mắt</span>
          </div>
        </section>
      </div>
    </div>
  );
}
