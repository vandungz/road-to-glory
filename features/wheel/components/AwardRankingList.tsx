"use client";

import { useTranslations } from "next-intl";
import { isDeprecatedAwardKey, TOP_TEN_LIMIT, type AwardRankingSnapshotInput } from "@/types/awards";
import { getPositionNumber } from "@/lib/position-number";

interface Props {
  snapshots: AwardRankingSnapshotInput[];
  playerName?: string;
  compact?: boolean;
  showHeading?: boolean;
}

export function AwardRankingList({ snapshots, playerName, compact = false, showHeading = true }: Props) {
  const ui = useTranslations("ui");
  const t = useTranslations("awards");
  const transfer = useTranslations("transfer");
  const visible = snapshots.filter((snapshot) => (
    snapshot.entries.length > 0 &&
    snapshot.awardKey !== "ballon_dor" &&
    !isDeprecatedAwardKey(snapshot.awardKey) &&
    snapshot.revealStage !== "ballon_dor_result"
  ));
  if (visible.length === 0) return <p className="football-modal-note">{ui("awardStandingsAreUnavailable")}</p>;
  return (
    <div className={`football-award-ranking-list${compact ? " is-compact" : ""}`}>
      {visible.map((snapshot) => (
        <section key={snapshot.snapshotKey} className={`football-award-ranking${showHeading ? "" : " is-inline"}`} aria-labelledby={showHeading ? `ranking-${snapshot.snapshotKey}` : undefined}>
          {showHeading && <div className="football-award-ranking__heading">
            <div><span className="football-eyebrow">{t(snapshot.scope === "career" ? "seasonRace" : "leagueRace")}</span><h4 id={`ranking-${snapshot.snapshotKey}`}>{t(snapshot.awardKey)}</h4></div>
            <span>{snapshot.status === "resolved" ? ui("final") : ui("inContention")}</span>
          </div>}
          <ol>
            {snapshot.entries.slice(0, compact ? 3 : snapshot.awardKey === "league_best_xi" ? 11 : TOP_TEN_LIMIT).map((entry, entryIndex) => {
              const current = entry.isCareerPlayer || (playerName && entry.name === playerName);
              const metrics = entry.metrics;
              const detail = [
                typeof metrics.rating === "number" ? `${ui("matchRating")} ${metrics.rating.toFixed(2)}` : null,
                typeof metrics.goals === "number" ? t("goalCount", { count: metrics.goals }) : null,
                typeof metrics.assists === "number" ? t("assistCount", { count: metrics.assists }) : null,
                typeof metrics.cleanSheets === "number" ? t("cleanSheetCount", { count: metrics.cleanSheets }) : null,
                typeof metrics.apps === "number" ? transfer("appCount", { count: metrics.apps }) : null,
              ].filter(Boolean).join(" · ");
              const visibleName = current ? entry.name : ui("message2", { v0: getPositionNumber(entry.position) });
              const metadata = current
                ? `${entry.clubName} · ${entry.position}`
                : `${entry.clubName}`;
              return <li key={`${snapshot.snapshotKey}-${entry.candidateKey}-${entry.slotKey ?? ""}-${entry.rank}-${entryIndex}`} className={current ? "is-player" : undefined}>
                <strong className={entry.rank === 1 ? "is-leader" : undefined}>{entry.rank}</strong>
                <span><b>{visibleName}</b><small>{metadata}{detail ? ` · ${detail}` : ""}</small></span>
              </li>;
            })}
          </ol>
          {compact && snapshot.entries.length > 3 && <small className="football-award-ranking__more">+{snapshot.entries.length - 3} {ui("nomineesInTheFullStandings")}</small>}
        </section>
      ))}
    </div>
  );
}
