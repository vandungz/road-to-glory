"use client";

import Link from "next/link";
import { RefreshCw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SpinnerWheel } from "@/features/wheel/components/SpinnerWheel";
import { NationFlag } from "@/components/shared/NationFlag";
import { PlayerPortrait } from "@/features/player/components/PlayerPortrait";
import { useQuickMode } from "../hooks/useQuickMode";
import type { QuickClubOption, QuickLeagueOption, QuickPlayer } from "../types";

interface Props {
  leagues: QuickLeagueOption[];
  clubs: QuickClubOption[];
  isAuthenticated: boolean;
}

const WHEEL_TITLES: Record<string, string> = {
  "debut-age": "Tuổi ra mắt",
  "trait-gate": "Có đặc tính cầu thủ?",
  trait: "Đặc tính cầu thủ",
  league: "Giải đấu",
  club: "Chọn CLB",
  "ballon-dor": "Số lần đoạt Quả bóng vàng",
};

function valueLabel(value: unknown) {
  if (typeof value === "object" && value !== null && "name" in value) return String(value.name);
  if (value === "yes") return "Có";
  if (value === "no") return "Không";
  return String(value);
}

function formatInternationalCups(types: string[]) {
  const counts = types.reduce<Record<string, number>>((result, type) => ({ ...result, [type]: (result[type] ?? 0) + 1 }), {});
  return Object.entries(counts).map(([type, count]) => count > 1 ? `${count}× ${type}` : type).join(", ");
}

function PlayerIdentity({ player }: { player: QuickPlayer }) {
  return <span className="football-quick-player-meta">
    <span aria-hidden="true"><NationFlag nationality={player.nationality} /></span>
    <span>{player.nationality}</span>
    <span>{player.position}</span>
  </span>;
}

export function QuickModeScreen({ leagues, clubs, isAuthenticated }: Props) {
  const quick = useQuickMode({ leagues, clubs });
  const { state, activeWheel } = quick;

  if (!quick.hydrated) return <p role="status">Đang tải lượt chơi…</p>;
  if (state.phase === "complete") return <QuickSummary quick={quick} isAuthenticated={isAuthenticated} />;

  if (!state.player.name.trim()) {
    return (
      <section className="football-quick-mode">
        <div className="football-quick-empty">
          <h1>Thiết lập cầu thủ</h1>
          <Link className="football-button football-button--primary" href="/quick">Về thiết lập</Link>
        </div>
      </section>
    );
  }

  const draft = state.clubDraft;
  const context = state.phase === "career" ? draft.clubName ?? draft.leagueName : null;
  const phase = state.phase === "setup" ? "Tạo cầu thủ" : state.phase === "career" ? `CLB ${state.careerClubIndex + 1} / ${state.player.clubCount}` : "Kết quả sự nghiệp";
  const title = draft.improvementTarget ? `Nâng ${quick.getQuickStatLabel(draft.improvementTarget)}`
    : activeWheel ? WHEEL_TITLES[activeWheel.key] ?? activeWheel.label : "Vòng quay";
  const hasOptions = Boolean((activeWheel?.spinItems ?? activeWheel?.items)?.length);

  return (
    <section className="football-quick-mode football-quick-play">
      <QuickStatsTracker quick={quick} />
      <div className="football-quick-play__stage">
        <header className="football-quick-mode__stage-head">
          <h1>{title}</h1>
          <div className="football-quick-play__context">
            <span>{phase}</span>
            {context && <strong>{context}</strong>}
          </div>
        </header>

        <div className="football-quick-play__controls">
          <div className="football-quick-play__wheel">
            {activeWheel && hasOptions
              ? <SpinnerWheel isSpinning={quick.isSpinning} targetIndex={quick.targetIndex} onSpinComplete={quick.completeSpin}
                  idleLabel={null} stakes={state.phase === "finale" ? "high" : "low"}
                  items={activeWheel.items.map((item) => ({
                    label: activeWheel.key === "improvement-stat" ? item.label ?? valueLabel(item.value) : valueLabel(item.value),
                    value: item.value,
                    weight: activeWheel.key.startsWith("stat-") ? 1 : item.weight,
                    active: item.active,
                  }))} />
              : <p role="status">Vòng quay này chưa có lựa chọn.</p>}
          </div>
          <div className="football-quick-mode__action">
            <Button size="lg" onClick={quick.spin} disabled={!hasOptions || quick.isSpinning} loading={quick.isSpinning} aria-busy={quick.isSpinning}>
              {!quick.isSpinning && <RotateCw aria-hidden="true" size={16} />}
              {quick.isSpinning ? "Đang quay…" : "Quay vòng"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickStatsTracker({ quick }: { quick: ReturnType<typeof useQuickMode> }) {
  const { state, stats, statKeys } = quick;
  const { player } = state;
  const revealedStats = statKeys.filter((key) => stats[key] !== undefined);
  const yearsSpent = state.clubs.reduce((sum, club) => sum + club.seasons, 0);
  const justFinishedClub = state.phase === "career" ? state.careerStep === 0 : state.phase === "finale" && state.finaleStep === 0;
  const improvements = justFinishedClub ? state.clubs.at(-1)?.improvements ?? [] : state.clubDraft.improvements;

  return (
    <aside className="football-quick-play__tracker" data-nation={player.nationality.replace(/\s+/g, "")} aria-label="Thông tin và chỉ số cầu thủ" tabIndex={0}>
      <header className="football-quick-play__tracker-head">
        <div className="football-quick-portrait-identity">
          <PlayerPortrait portraitId={player.portraitId} loop />
          <div><strong>{player.name}</strong><PlayerIdentity player={player} /></div>
        </div>
        <div className="football-quick-play__trait" aria-live="polite" aria-atomic="true">
          {player.trait && <><span>Đặc tính</span><strong>{player.trait.name}</strong></>}
        </div>
      </header>
      {revealedStats.length === statKeys.length && <div className="football-quick-play__tracker-ovr"><span>OVR</span><strong>{quick.overall}</strong></div>}
      {revealedStats.length > 0 && <dl className="football-quick-play__stats" aria-label="Chỉ số">
        {revealedStats.map((key) => {
          const delta = improvements.find((item) => item.stat === key)?.delta ?? 0;
          const label = quick.getQuickStatLabel(key);
          return <div key={key}>
            <dt>{label}</dt>
            <dd aria-live="polite" aria-atomic="true" aria-label={`${label}: ${stats[key]}${delta > 0 ? `, tăng ${delta}` : ""}`}>
              {delta > 0 && <span className="football-quick-play__stat-gain">+{delta}</span>}
              <span>{stats[key]}</span>
            </dd>
          </div>;
        })}
      </dl>}
      {player.debutAge !== null && <dl className="football-quick-play__career-meta">
        <div><dt>Tuổi ra mắt</dt><dd>{player.debutAge}</dd></div>
        {player.careerLength !== null && <div><dt>{state.phase === "setup" ? "Sự nghiệp" : "Số mùa đã chơi"}</dt><dd>{state.phase === "setup" ? `${player.careerLength} mùa` : `${yearsSpent} / ${player.careerLength}`}</dd></div>}
      </dl>}
    </aside>
  );
}

function QuickSummary({ quick, isAuthenticated }: { quick: ReturnType<typeof useQuickMode>; isAuthenticated: boolean }) {
  const { state } = quick;
  const namedAwards = state.finale.otherAwardTypes;

  return (
    <section className="football-quick-mode football-quick-summary">
      <header className="football-quick-summary__hero">
        <div className="football-quick-summary__identity" data-nation={state.player.nationality.replace(/\s+/g, "")}>
          <PlayerPortrait portraitId={state.player.portraitId} animate={false} />
          <div>
            <h1>Sự nghiệp đã hoàn tất</h1>
            <div><strong>{state.player.name}</strong><PlayerIdentity player={state.player} /></div>
          </div>
        </div>
        <div className="football-quick-summary__ovr"><span>OVR</span><strong>{quick.overall}</strong></div>
      </header>
      <dl className="football-quick-summary__totals">
        <div><dt>Số trận ra sân</dt><dd>{state.finale.appearances ?? "—"}</dd></div>
        <div><dt>Bàn thắng</dt><dd>{state.finale.goals}</dd></div>
        <div><dt>Kiến tạo</dt><dd>{state.finale.assists}</dd></div>
        <div><dt>Trận giữ sạch lưới</dt><dd>{state.finale.cleanSheets ?? "—"}</dd></div>
        <div><dt>Quả bóng vàng</dt><dd>{state.finale.ballonDorWins ?? 0}</dd></div>
      </dl>
      <div className="football-quick-summary__records" role="region" tabIndex={0} aria-label="Chi tiết sự nghiệp">
        <table className="football-quick-summary__journey">
          <caption>Hành trình qua các CLB</caption>
          <thead><tr>
            <th scope="col">CLB</th><th scope="col">Số mùa</th><th scope="col">VĐQG</th><th scope="col">Cúp quốc nội</th><th scope="col">Cúp quốc tế</th>
          </tr></thead>
          <tbody>
            {state.clubs.map((club) => (
              <tr key={`${club.clubId}-${club.clubIndex}`}>
                <th scope="row"><strong>{club.clubName}</strong><small>{club.leagueName}</small></th>
                <td>{club.seasons}</td>
                <td>{club.leagueTitles}</td>
                <td>{club.domesticCups}</td>
                <td>{club.internationalCups}{club.internationalCupTypes.length > 0 && <small>{formatInternationalCups(club.internationalCupTypes)}</small>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {namedAwards.length > 0 && <div className="football-quick-summary__awards"><h2>Giải cá nhân khác</h2><p>{namedAwards.join(", ")}</p></div>}
      </div>
      <div className="football-quick-summary__actions">
        {!isAuthenticated && <Link className="football-button football-button--outline" href="/login?next=/">Đăng nhập để chơi Classic</Link>}
        <Link className="football-button football-button--primary" href="/quick" onClick={quick.reset}><RefreshCw aria-hidden="true" size={14} /> Chơi Quick Mode mới</Link>
      </div>
    </section>
  );
}
