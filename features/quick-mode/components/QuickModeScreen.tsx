"use client";

import Link from "next/link";
import { RefreshCw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";
import { SpinnerWheel } from "@/features/wheel/components/SpinnerWheel";
import { useQuickMode } from "../hooks/useQuickMode";
import type { QuickClubOption, QuickLeagueOption } from "../types";

interface Props {
  leagues: QuickLeagueOption[];
  clubs: QuickClubOption[];
  isAuthenticated: boolean;
}

const SETUP_TOTAL = 12;

function valueLabel(value: unknown) {
  if (typeof value === "object" && value !== null && "name" in value) return String(value.name);
  if (value === "yes") return "CÓ";
  if (value === "no") return "KHÔNG";
  return String(value);
}

function wheelLabel(item: { label?: string; value: unknown }) {
  if (typeof item.value === "object" && item.value !== null && "description" in item.value) return item.label ?? valueLabel(item.value);
  return valueLabel(item.value);
}

export function QuickModeScreen({ leagues, clubs, isAuthenticated }: Props) {
  const quick = useQuickMode({ leagues, clubs });
  const { state, activeWheel } = quick;

  if (state.phase === "complete") return <QuickSummary quick={quick} isAuthenticated={isAuthenticated} />;

  if (!state.player.name.trim()) {
    return (
      <section className="football-quick-mode" data-anim>
        <div className="football-quick-empty">
          <span className="football-quick-mode__eyebrow">Quick Mode</span>
          <h1>Thiết lập cầu thủ trước</h1>
          <p>Chọn tên, quốc gia và vị trí để bắt đầu hành trình.</p>
          <Link className="football-button football-button--primary" href="/quick">Về trang setup</Link>
        </div>
      </section>
    );
  }

  const currentProgress = state.phase === "setup" ? state.setupStep : state.phase === "career" ? state.careerStep : state.finaleStep;
  const progressTotal = state.phase === "setup" ? SETUP_TOTAL : state.phase === "career" ? 12 : 6;
  const readyToSpin = Boolean(activeWheel && quick.hydrated && !quick.isSpinning);

  return (
    <section className="football-quick-mode football-quick-play" data-anim>
      <header className="football-quick-mode__intro football-quick-play__intro">
        <div>
          <span className="football-quick-mode__eyebrow">Quick Mode · Hành trình của bạn</span>
          <h1>{state.player.name}</h1>
        </div>
        <div className="football-quick-play__player">
          <strong>{quick.flag} {state.player.position}</strong>
          <span>{state.player.nationality}</span>
        </div>
      </header>

      <div className="football-quick-play__body">
        <QuickStatsTracker quick={quick} />
        <div className="football-quick-play__stage">
          <div className="football-quick-mode__stage-head">
            <div>
              <span className="football-quick-mode__stage-label">{state.phase === "setup" ? "Tạo cầu thủ" : state.phase === "career" ? `Sự nghiệp · CLB ${state.careerClubIndex + 1}` : "Chặng cuối"}</span>
              <h2>{activeWheel?.label ?? "Chuẩn bị wheel"}</h2>
            </div>
            <ProgressIndicator current={currentProgress} total={progressTotal} label="Tiến trình" />
          </div>

          {activeWheel && <SpinnerWheel isSpinning={quick.isSpinning} targetIndex={quick.targetIndex} onSpinComplete={quick.completeSpin} stakes={state.phase === "finale" ? "high" : "low"} items={activeWheel.items.map((item) => ({ label: wheelLabel(item), value: item.value, weight: item.weight, active: item.active }))} />}

          <div className="football-quick-mode__action">
            <Button size="lg" onClick={quick.spin} disabled={!readyToSpin} loading={quick.isSpinning}>
              <RotateCw aria-hidden="true" size={16} /> {quick.isSpinning ? "Đang quay…" : "Quay wheel"}
            </Button>
            {activeWheel && activeWheel.items.length === 0 && <span>Chưa có lựa chọn phù hợp với OVR hiện tại.</span>}
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickStatsTracker({ quick }: { quick: ReturnType<typeof useQuickMode> }) {
  const { state } = quick;
  const trait = state.player.trait;
  const yearsSpent = state.clubs.reduce((sum, club) => sum + club.seasons, 0);
  const traitModifiers = trait?.modifiers ?? {};

  return (
    <aside className="football-quick-play__tracker" aria-label="Thông tin và chỉ số cầu thủ">
      <div className="football-quick-play__tracker-head">
        <span>Player card</span>
        <strong>{quick.flag} {state.player.name}</strong>
        <small>{state.player.nationality} · {state.player.position}</small>
      </div>
      <div className="football-quick-play__tracker-ovr"><span>OVR hiện tại</span><strong>{quick.overall}</strong></div>
      <div className="football-quick-play__stats">
        <span className="football-quick-play__tracker-label">Chỉ số</span>
        {quick.statKeys.map((key) => {
          const bonus = traitModifiers[key] ?? 0;
          return (
            <div key={key}>
              <span>{quick.getQuickStatLabel(key)}</span>
              <strong>{state.player.stats[key] ?? "—"}</strong>
              {bonus > 0 && <em>+{bonus}</em>}
            </div>
          );
        })}
      </div>
      {trait && <div className="football-quick-play__trait"><span className="football-quick-play__tracker-label">Trait đặc biệt</span><strong>{trait.name}</strong><p>{trait.description}</p><small>{Object.entries(trait.modifiers).map(([key, value]) => `+${value} ${quick.getQuickStatLabel(key as Parameters<typeof quick.getQuickStatLabel>[0])}`).join(" · ")}</small></div>}
      <div className="football-quick-play__career-meta"><span>Sự nghiệp</span><strong>{yearsSpent} / {state.player.careerLength ?? "—"} năm</strong><small>{state.clubs.length} / {state.player.clubCount ?? "—"} CLB</small></div>
    </aside>
  );
}

function QuickSummary({ quick, isAuthenticated }: { quick: ReturnType<typeof useQuickMode>; isAuthenticated: boolean }) {
  const { state } = quick;
  const namedAwards = state.finale.otherAwardTypes;

  return (
    <section className="football-quick-mode football-quick-summary" data-anim>
      <div className="football-quick-summary__hero">
        <span className="football-quick-mode__eyebrow">Sự nghiệp đã hoàn tất</span>
        <h1>{state.player.name}</h1>
        <p>{state.player.nationality} · {state.player.position} · debut ở tuổi {state.player.debutAge}</p>
        <strong className="football-quick-summary__ovr">{quick.overall} OVR</strong>
      </div>
      <div className="football-quick-summary__grid">
        <div><span>Bàn thắng</span><strong>{state.finale.goals}</strong></div>
        <div><span>Kiến tạo</span><strong>{state.finale.assists}</strong></div>
        <div><span>Ballon d&apos;Or</span><strong>{state.finale.ballonDorWins ?? 0} lần</strong></div>
        <div><span>Số CLB</span><strong>{state.clubs.length}</strong></div>
      </div>
      <div className="football-quick-summary__journey-head"><span>Hành trình CLB</span><strong>{state.clubs.length} CLB</strong></div>
      <div className="football-quick-summary__journey" role="list" tabIndex={0} aria-label="Danh sách CLB trong sự nghiệp">
        {state.clubs.map((club) => (
          <div key={`${club.clubId}-${club.clubIndex}`} role="listitem">
            <span>CLB {String(club.clubIndex + 1).padStart(2, "0")} · {club.leagueName}</span>
            <strong>{club.clubName}</strong>
            <small>{club.seasons} mùa · {club.leagueTitles} giải · {club.domesticCups} cúp quốc nội · {club.internationalCups > 0 ? `${club.internationalCups} ${club.internationalCupType ?? "cúp quốc tế"}` : "0 cúp quốc tế"}</small>
          </div>
        ))}
      </div>
      {namedAwards.length > 0 && <div className="football-quick-summary__awards"><span>Giải cá nhân khác</span><strong>{namedAwards.join(" · ")}</strong></div>}
      <div className="football-quick-summary__actions">
        {!isAuthenticated && <div className="football-quick-summary__login-note"><strong>Khám phá Football Life đầy đủ hơn</strong><span>Đăng nhập để mở Classic Mode, lưu career dài hạn và dùng các tính năng dành cho tài khoản. Quick Mode này chỉ là một lượt chơi nhanh trong tab hiện tại, kết quả không được lưu vào tài khoản.</span><Link className="football-button football-button--primary" href="/login?next=/">Đăng nhập / Đăng ký</Link></div>}
        <Link className="football-button football-button--outline football-quick-summary__replay" href="/quick" onClick={quick.reset}><RefreshCw aria-hidden="true" size={14} /> Chơi Quick Mode mới</Link>
      </div>
    </section>
  );
}
