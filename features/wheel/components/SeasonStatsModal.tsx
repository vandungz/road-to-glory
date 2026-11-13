"use client";

import { useAwardCopy } from "./useAwardCopy";
import { useTranslations } from "next-intl";
import type { CompetitionStats, SeasonRecord } from "@/types/game";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import { isDeprecatedAwardKey } from "@/types/awards";
import { useCompetitionNames } from "./useCompetitionNames";
import { useCompetitionResult } from "./useCompetitionResult";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { AwardRankingList } from "./AwardRankingList";
import { AwardBestXiPitch } from "./AwardBestXiPitch";

interface Props {
  record: SeasonRecord;
  yearSimResult: SimulatedSeasonResult;
  currentContinentalCup: string;
  onClose: () => void;
}

function CompetitionRow({ label, stats, result }: { label: string; stats?: CompetitionStats; result?: string }) {
  const ui = useTranslations("ui");
  if (!stats || stats.apps === 0) return null;
  return (
    <div className="football-competition-row">
      <div>
        <strong>{label}</strong>
        {result && <span>{result}</span>}
      </div>
      <small>
        {stats.apps} {ui("apps")} {stats.goals} {ui("goals")} {stats.assists} {ui("assists")}
        {stats.cleanSheets > 0 ? ui("cleanSheets", { v0: String(stats.cleanSheets) }) : ""} · Rating {stats.rating.toFixed(2)}
      </small>
    </div>
  );
}


function isRemovedAwardLabel(label: string): boolean {
  const normalized = label.toLowerCase();
  return normalized.includes("cầu thủ xuất sắc nhất") || normalized.includes("hậu vệ xuất sắc nhất");
}

export function SeasonStatsModal({ record, yearSimResult, currentContinentalCup, onClose }: Props) {
  const ui = useTranslations("ui");
  const awardCopy = useAwardCopy();
  const formatResult = useCompetitionResult();
  const names = useCompetitionNames();
  const cupResult = (result: string | null | undefined) => formatResult(result, "");
  const awards = yearSimResult.events.filter((event) => (
    event.type === "individual_award" && !isRemovedAwardLabel(event.label)
  ));
  const hasAwards = awards.length > 0 || yearSimResult.ballonDor.eligible;
  const rankingSnapshots = (yearSimResult.awardSimulation?.snapshots ?? []).filter((snapshot) => (
    snapshot.awardKey !== "ballon_dor" &&
    !isDeprecatedAwardKey(snapshot.awardKey) &&
    snapshot.revealStage !== "ballon_dor_result"
  ));

  return (
    <Modal open title={ui("seasonStats")} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose} closeLabel={ui("closeSeasonStats")}>
        {ui("seasonStats")}
      </ModalHeader>

      <ModalBody>
        <div className="football-season-stats">
          <div className="football-season-stats__heading">
            <span>{ui("seasonRecord")}</span>
            <strong>{names.clubName(record.clubName)}</strong>
            <small>{names.leagueName(record.leagueName)}</small>
          </div>

          <section>
            <h3 className="football-modal-section-label">{ui("seasonTotals")}</h3>
            <div className="football-data-list">
              <DataRow label={ui("appearances")} value={yearSimResult.apps} />
              <DataRow label={ui("goals2")} value={yearSimResult.goals} />
              <DataRow label={ui("assists2")} value={yearSimResult.assists} />
              {yearSimResult.cleanSheets > 0 && <DataRow label={ui("cleanSheets2")} value={yearSimResult.cleanSheets} />}
              <DataRow label={ui("averageRating")} value={yearSimResult.matchRating.toFixed(2)} />
            </div>
          </section>

          <section>
            <h3 className="football-modal-section-label">{ui("byCompetition")}</h3>
            <div className="football-competition-list">
              <CompetitionRow
                label={names.leagueName(record.leagueName)}
                stats={yearSimResult.leagueStats}
                result={record.standing != null ? ui("message", { v0: String(record.standing) }) : undefined}
              />
              <CompetitionRow
                label={names.domesticCupName(record.leagueName, record.leagueId)}
                stats={yearSimResult.domesticCupStats}
                result={cupResult(record.domesticCup)}
              />
              <CompetitionRow
                label={names.continentalCupName(record.continentalCup?.type ?? currentContinentalCup)}
                stats={yearSimResult.continentalStats}
                result={cupResult(record.continentalCup?.result)}
              />
              <CompetitionRow
                label={record.nationalTeam?.type ?? ui("nationalTeam")}
                stats={yearSimResult.nationalStats}
                result={cupResult(record.nationalTeam?.result)}
              />
            </div>
          </section>

          {hasAwards && (
            <section className="football-awards-section">
              <h3 className="football-modal-section-label">{ui("individualAwards")}</h3>
              {awards.map((award, index) => <Badge key={index} tone="accent">{awardCopy(award.label)}</Badge>)}
              {yearSimResult.ballonDor.eligible && (
                <div className="football-honour-note">{ui("spinToSeeYourBallonDorResult")}</div>
              )}
            </section>
          )}
          {rankingSnapshots.length > 0 ? (
            <section className="football-awards-section" aria-labelledby="award-ranking-title">
              <h3 id="award-ranking-title" className="football-modal-section-label">{ui("nomineeStandings")}</h3>
              {rankingSnapshots.map((snapshot) => snapshot.awardKey === "league_best_xi"
                ? <AwardBestXiPitch key={snapshot.snapshotKey} snapshot={snapshot} />
                : null)}
              <AwardRankingList snapshots={rankingSnapshots.filter((snapshot) => snapshot.awardKey !== "league_best_xi")} compact />
            </section>
          ) : null}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button onClick={onClose}>{ui("continueToPlayerDevelopment")}</Button>
      </ModalFooter>
    </Modal>
  );
}
