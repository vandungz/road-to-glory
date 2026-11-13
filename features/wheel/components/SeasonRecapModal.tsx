"use client";

import { useAwardCopy } from "./useAwardCopy";
import { useTranslations } from "next-intl";
import { EditorialArt } from "@/components/shared/EditorialArt";
import { useState, type ReactNode } from "react";
import type { SeasonRecord } from "@/types/game";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import { AWARD_LABELS, isDeprecatedAwardKey, type AwardRankingSnapshotInput } from "@/types/awards";
import { getSeasonYearString } from "../lib/simulation-helpers";
import { useCompetitionNames } from "./useCompetitionNames";
import { useCompetitionResult } from "./useCompetitionResult";
import { Button } from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Expandable } from "@/components/ui/Expandable";
import { AwardRankingList } from "./AwardRankingList";
import { AwardBestXiPitch } from "./AwardBestXiPitch";

interface Props {
  record: SeasonRecord;
  yearSimResult: SimulatedSeasonResult;
  currentContinentalCup: string;
  playerDebutAge: number;
  onClose: () => void;
  nextIsNomination?: boolean;
}

function SummaryMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="football-season-close__metric">
      <span>{label}</span>
      <strong className={accent ? "is-accent" : undefined}>{value}</strong>
    </div>
  );
}

function SeasonStat({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="football-season-close__stat">
      <span>{label}</span>
      <strong className={accent ? "is-positive" : undefined}>{value}</strong>
    </div>
  );
}

function AwardItem({ title, detail, accent = false }: { title: string; detail: string; accent?: boolean }) {
  return (
    <div className={`football-season-close__award${accent ? " is-accent" : ""}`}>
      <i aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function AccordionSection({ id, eyebrow, title, open, onToggle, children }: {
  id: string;
  eyebrow: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="football-season-close__accordion-item">
      <h3>
        <button
          type="button"
          className="football-season-close__accordion-trigger"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
        >
          <span><small>{eyebrow}</small><strong>{title}</strong></span>
          <i aria-hidden="true">{open ? "−" : "+"}</i>
        </button>
      </h3>
      <Expandable open={open} id={`${id}-panel`} className="football-season-close__accordion-panel">
        {children}
      </Expandable>
    </section>
  );
}

function isVisibleSeasonAward(snapshot: AwardRankingSnapshotInput): boolean {
  return snapshot.awardKey !== "ballon_dor" &&
    !isDeprecatedAwardKey(snapshot.awardKey) &&
    snapshot.revealStage !== "ballon_dor_result" &&
    snapshot.entries.length > 0;
}

function isRemovedAwardLabel(label: string): boolean {
  const normalized = label.toLowerCase();
  return normalized.includes("cầu thủ xuất sắc nhất") || normalized.includes("hậu vệ xuất sắc nhất");
}

export function SeasonRecapModal({ record, yearSimResult, currentContinentalCup, playerDebutAge, onClose, nextIsNomination = false }: Props) {
  const ui = useTranslations("ui");
  const awardCopy = useAwardCopy();
  const formatResult = useCompetitionResult();
  const names = useCompetitionNames();
  const resultLabel = (result: string | null | undefined) => formatResult(result, "—");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ stats: true, honours: true });
  const season = getSeasonYearString(record.age, playerDebutAge);
  const continentalName = record.continentalCup?.type
    ? names.continentalCupName(record.continentalCup.type)
    : currentContinentalCup !== "none" ? names.continentalCupName(currentContinentalCup) : ui("continentalCup");
  const nationalResult = record.nationalTeam?.result;
  const hasNationalResult = Boolean(nationalResult && nationalResult !== "Chờ quay");
  const summaryMetrics = [
    { label: ui("domesticLeague"), value: resultLabel(record.standing === 1 ? "Winner" : record.standing ? `Hạng ${record.standing}` : null) },
    { label: ui("domesticCup"), value: resultLabel(record.domesticCup) },
    {
      label: ui("continentalCup"),
      value: record.continentalCup ? resultLabel(record.continentalCup.result) : "—",
      accent: record.continentalCup?.result === "Winner",
    },
    ...(hasNationalResult
      ? [{
          label: ui("nationalTeam"),
          value: resultLabel(nationalResult),
          accent: nationalResult === "Winner",
        }]
      : []),
  ];
  const individualAwards = yearSimResult.events?.filter((event) => (
    event.type === "individual_award" && !isRemovedAwardLabel(event.label)
  )) ?? [];
  const awards = [
    ...(record.standing === 1 ? [{ title: names.leagueName(record.leagueName), detail: `${resultLabel("Winner")} · ${names.clubName(record.clubName)}`, accent: true }] : []),
    ...(record.domesticCup === "Winner" ? [{ title: names.domesticCupName(record.leagueName, record.leagueId), detail: `${resultLabel("Winner")} · ${names.clubName(record.clubName)}` }] : []),
    ...(record.continentalCup?.result === "Winner" ? [{ title: continentalName, detail: `${resultLabel("Winner")} · ${names.clubName(record.clubName)}` }] : []),
    ...(nationalResult === "Winner" ? [{ title: record.nationalTeam?.type || ui("nationalTeam"), detail: resultLabel("Winner"), accent: true }] : []),
    ...individualAwards.map((award) => ({ title: awardCopy(award.label), detail: `${ui("age")} ${record.age}` })),
  ];
  const seasonAwardSnapshots = (yearSimResult.awardSimulation?.snapshots ?? []).filter(isVisibleSeasonAward);
  const rankingSnapshots = seasonAwardSnapshots.filter((snapshot) => snapshot.awardKey !== "league_best_xi");
  const bestXiSnapshot = seasonAwardSnapshots.find((snapshot) => snapshot.awardKey === "league_best_xi");
  const toggleSection = (key: string) => setOpenSections((current) => ({ ...current, [key]: !current[key] }));

  return (
    <Modal open title={ui("seasonReview", { v0: String(season) })} onClose={onClose} size="md" className="football-season-close-modal">
      <ModalHeader onClose={onClose} closeLabel={ui("closeSeasonReview")} eyebrow={ui("seasonResultsAge", { v0: names.clubName(record.clubName), v1: String(record.age) })}>
        {ui("seasonReview2")}
      </ModalHeader>

      <div className="football-season-close__layout">
        <EditorialArt asset="match-duel" className="football-editorial-art--recap" />
      <ModalBody>
        <section className="football-season-close__metrics" data-count={summaryMetrics.length} aria-label={ui("seasonResults")}>
          {summaryMetrics.map((metric) => <SummaryMetric key={metric.label} {...metric} />)}
        </section>

        <div className="football-season-close__accordion">
          <AccordionSection id="season-stats" eyebrow={ui("performance")} title={ui("seasonStats2")} open={Boolean(openSections.stats)} onToggle={() => toggleSection("stats")}>
            <div className="football-season-close__stats">
              <SeasonStat label={ui("appearances2")} value={yearSimResult.apps} />
              <SeasonStat label={ui("goals2")} value={yearSimResult.goals} />
              <SeasonStat label={ui("assists2")} value={yearSimResult.assists} />
              <SeasonStat label={ui("cleanSheetLabel")} value={yearSimResult.cleanSheets} />
              <SeasonStat label={ui("matchRating")} value={yearSimResult.matchRating.toFixed(2)} accent />
            </div>
          </AccordionSection>

          <AccordionSection id="season-honours" eyebrow={ui("honours2")} title={ui("honoursWon")} open={Boolean(openSections.honours)} onToggle={() => toggleSection("honours")}>
            <div className="football-season-close__awards">
              {awards.length > 0 ? awards.map((award, index) => <AwardItem key={`${award.title}-${index}`} {...award} />) : <p className="football-modal-note">{ui("noHonoursThisSeason")}</p>}
            </div>
          </AccordionSection>

          {rankingSnapshots.map((snapshot) => (
            <AccordionSection
              key={snapshot.snapshotKey}
              id={`season-award-${snapshot.awardKey}`}
              eyebrow={ui("leagueAwards")}
              title={awardCopy(AWARD_LABELS[snapshot.awardKey], snapshot.awardKey)}
              open={Boolean(openSections[snapshot.awardKey])}
              onToggle={() => toggleSection(snapshot.awardKey)}
            >
              <AwardRankingList snapshots={[snapshot]} showHeading={false} />
            </AccordionSection>
          ))}

          {bestXiSnapshot && (
            <AccordionSection id="season-best-xi" eyebrow={ui("leagueAwards")} title={ui("teamOfTheSeason")} open={Boolean(openSections.league_best_xi)} onToggle={() => toggleSection("league_best_xi")}>
              <AwardBestXiPitch snapshot={bestXiSnapshot} />
            </AccordionSection>
          )}
        </div>
      </ModalBody>
      </div>

      <ModalFooter className="football-season-close__footer">
        <Button size="lg" onClick={onClose}>{ui(nextIsNomination ? "openBallonDorNomination" : "continueToPlayerDevelopment")}</Button>
      </ModalFooter>
    </Modal>
  );
}
