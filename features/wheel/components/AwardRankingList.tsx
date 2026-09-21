"use client";

import { AWARD_LABELS, isDeprecatedAwardKey, type AwardRankingSnapshotInput, type AwardRankingEntry } from "@/types/awards";

interface Props {
  snapshots: AwardRankingSnapshotInput[];
  playerName?: string;
  compact?: boolean;
  showHeading?: boolean;
}

function metricText(awardKey: AwardRankingSnapshotInput["awardKey"], entry: AwardRankingEntry): string {
  const metrics = entry.metrics;
  const parts = awardKey === "league_golden_boot"
    ? [typeof metrics.goals === "number" ? `${metrics.goals} bàn` : null, typeof metrics.apps === "number" ? `${metrics.apps} trận` : null]
    : awardKey === "league_top_assist"
      ? [typeof metrics.assists === "number" ? `${metrics.assists} kiến tạo` : null, typeof metrics.apps === "number" ? `${metrics.apps} trận` : null]
      : awardKey === "league_golden_glove"
        ? [typeof metrics.cleanSheets === "number" ? `${metrics.cleanSheets} trận sạch lưới` : null, typeof metrics.apps === "number" ? `${metrics.apps} trận` : null]
        : [
            typeof metrics.rating === "number" ? `Rating ${metrics.rating.toFixed(2)}` : null,
            typeof metrics.goals === "number" && metrics.goals > 0 ? `${metrics.goals} bàn` : null,
            typeof metrics.assists === "number" && metrics.assists > 0 ? `${metrics.assists} kiến tạo` : null,
          ];
  return parts.join(" · ");
}

function scopeLabel(snapshot: AwardRankingSnapshotInput): string {
  return snapshot.scope === "career" ? "Cuộc đua danh hiệu mùa giải" : "Trong giải vô địch quốc gia";
}

export function AwardRankingList({ snapshots, playerName, compact = false, showHeading = true }: Props) {
  const visible = snapshots.filter((snapshot) => (
    snapshot.entries.length > 0 &&
    snapshot.awardKey !== "ballon_dor" &&
    !isDeprecatedAwardKey(snapshot.awardKey) &&
    snapshot.revealStage !== "ballon_dor_result"
  ));
  if (visible.length === 0) return <p className="football-modal-note">Chưa có bảng xếp hạng danh hiệu.</p>;
  return (
    <div className={`football-award-ranking-list${compact ? " is-compact" : ""}`}>
      {visible.map((snapshot) => (
        <section key={snapshot.snapshotKey} className={`football-award-ranking${showHeading ? "" : " is-inline"}`} aria-labelledby={showHeading ? `ranking-${snapshot.snapshotKey}` : undefined}>
          {showHeading && <div className="football-award-ranking__heading">
            <div><span className="football-eyebrow">{scopeLabel(snapshot)}</span><h4 id={`ranking-${snapshot.snapshotKey}`}>{AWARD_LABELS[snapshot.awardKey]}</h4></div>
            <span>{snapshot.status === "resolved" ? "Đã chốt" : "Đang đua"}</span>
          </div>}
          <ol>
            {snapshot.entries.slice(0, compact ? 3 : snapshot.awardKey === "league_best_xi" ? 11 : 10).map((entry, entryIndex) => {
              const current = entry.isCareerPlayer || (playerName && entry.name === playerName);
              const metrics = metricText(snapshot.awardKey, entry);
              return <li key={`${snapshot.snapshotKey}-${entry.candidateKey}-${entry.slotKey ?? ""}-${entry.rank}-${entryIndex}`} className={current ? "is-player" : undefined}>
                <strong className={entry.rank === 1 ? "is-leader" : undefined}>{entry.rank}</strong>
                <span><b>{entry.name}</b><small>{entry.clubName} · {entry.position}{metrics ? ` · ${metrics}` : ""}</small></span>
              </li>;
            })}
          </ol>
          {compact && snapshot.entries.length > 3 && <small className="football-award-ranking__more">+{snapshot.entries.length - 3} ứng viên trong bảng đầy đủ</small>}
        </section>
      ))}
    </div>
  );
}
