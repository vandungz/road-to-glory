"use client";

import { useState, type ReactNode } from "react";
import type { SeasonRecord } from "@/types/game";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import { AWARD_LABELS, isDeprecatedAwardKey, type AwardRankingSnapshotInput } from "@/types/awards";
import { getContinentalCupLabel, getDomesticCupName, getSeasonYearString } from "../lib/simulation-helpers";
import { getCompetitionResultLabel } from "../lib/competition-result-labels";
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
}

function resultLabel(result: string | null | undefined) {
  return getCompetitionResultLabel(result, "—");
}

function getStandingLabel(record: SeasonRecord) {
  if (!record.standing) return "—";
  return record.standing === 1 ? "Vô địch" : `Hạng ${record.standing}`;
}

function SummaryMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rtg-season-close__metric">
      <span>{label}</span>
      <strong className={accent ? "is-accent" : undefined}>{value}</strong>
    </div>
  );
}

function SeasonStat({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rtg-season-close__stat">
      <span>{label}</span>
      <strong className={accent ? "is-positive" : undefined}>{value}</strong>
    </div>
  );
}

function AwardItem({ title, detail, accent = false }: { title: string; detail: string; accent?: boolean }) {
  return (
    <div className={`rtg-season-close__award${accent ? " is-accent" : ""}`}>
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
    <section className="rtg-season-close__accordion-item">
      <h3>
        <button
          type="button"
          className="rtg-season-close__accordion-trigger"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
        >
          <span><small>{eyebrow}</small><strong>{title}</strong></span>
          <i aria-hidden="true">{open ? "−" : "+"}</i>
        </button>
      </h3>
      <Expandable open={open} id={`${id}-panel`} className="rtg-season-close__accordion-panel">
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

export function SeasonRecapModal({ record, yearSimResult, currentContinentalCup, playerDebutAge, onClose }: Props) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ stats: true, honours: true });
  const season = getSeasonYearString(record.age, playerDebutAge);
  const continentalName = record.continentalCup?.type
    ? getContinentalCupLabel(record.continentalCup.type)
    : currentContinentalCup !== "none" ? getContinentalCupLabel(currentContinentalCup) : "Cúp châu lục";
  const nationalResult = record.nationalTeam?.result;
  const hasNationalResult = Boolean(nationalResult && nationalResult !== "Chờ quay");
  const summaryMetrics = [
    { label: "Kết quả VĐQG", value: getStandingLabel(record) },
    { label: "Cúp quốc gia", value: resultLabel(record.domesticCup) },
    {
      label: "Cúp châu lục",
      value: record.continentalCup ? resultLabel(record.continentalCup.result) : "—",
      accent: record.continentalCup?.result === "Winner",
    },
    ...(hasNationalResult
      ? [{
          label: "Tuyển quốc gia",
          value: resultLabel(nationalResult),
          accent: nationalResult === "Winner",
        }]
      : []),
  ];
  const individualAwards = yearSimResult.events?.filter((event) => (
    event.type === "individual_award" && !isRemovedAwardLabel(event.label)
  )) ?? [];
  const awards = [
    ...(record.standing === 1 ? [{ title: `Vô địch ${record.leagueName || "giải quốc gia"}`, detail: record.clubName, accent: true }] : []),
    ...(record.domesticCup === "Winner" ? [{ title: getDomesticCupName(record.leagueName, record.leagueId), detail: `Vô địch · ${record.clubName}` }] : []),
    ...(record.continentalCup?.result === "Winner" ? [{ title: continentalName, detail: `Vô địch · ${record.clubName}` }] : []),
    ...(nationalResult === "Winner" ? [{ title: record.nationalTeam?.type || "Giải đấu quốc tế", detail: "Vô địch cùng đội tuyển", accent: true }] : []),
    ...individualAwards.map((award) => ({ title: award.label, detail: `Mùa ${record.age}` })),
  ];
  const seasonAwardSnapshots = (yearSimResult.awardSimulation?.snapshots ?? []).filter(isVisibleSeasonAward);
  const rankingSnapshots = seasonAwardSnapshots.filter((snapshot) => snapshot.awardKey !== "league_best_xi");
  const bestXiSnapshot = seasonAwardSnapshots.find((snapshot) => snapshot.awardKey === "league_best_xi");
  const toggleSection = (key: string) => setOpenSections((current) => ({ ...current, [key]: !current[key] }));

  return (
    <Modal open title={`Mùa giải khép lại · ${season}`} onClose={onClose} size="md" className="rtg-season-close-modal">
      <ModalHeader onClose={onClose} closeLabel="Đóng tổng kết" eyebrow={`Kết quả mùa giải · ${record.clubName} · tuổi ${record.age}`}>
        Mùa giải khép lại
      </ModalHeader>

      <ModalBody>
        <section className="rtg-season-close__metrics" data-count={summaryMetrics.length} aria-label="Kết quả mùa giải">
          {summaryMetrics.map((metric) => <SummaryMetric key={metric.label} {...metric} />)}
        </section>

        <div className="rtg-season-close__accordion">
          <AccordionSection id="season-stats" eyebrow="Hiệu suất" title="Số liệu mùa giải" open={Boolean(openSections.stats)} onToggle={() => toggleSection("stats")}>
            <div className="rtg-season-close__stats">
              <SeasonStat label="Ra sân" value={yearSimResult.apps} />
              <SeasonStat label="Bàn thắng" value={yearSimResult.goals} />
              <SeasonStat label="Kiến tạo" value={yearSimResult.assists} />
              <SeasonStat label="Clean Sheet" value={yearSimResult.cleanSheets} />
              <SeasonStat label="Điểm phong độ" value={yearSimResult.matchRating.toFixed(2)} accent />
            </div>
          </AccordionSection>

          <AccordionSection id="season-honours" eyebrow="Thành tích" title="Danh hiệu nhận được" open={Boolean(openSections.honours)} onToggle={() => toggleSection("honours")}>
            <div className="rtg-season-close__awards">
              {awards.length > 0 ? awards.map((award, index) => <AwardItem key={`${award.title}-${index}`} {...award} />) : <p className="rtg-modal-note">Chưa có danh hiệu mùa này.</p>}
            </div>
          </AccordionSection>

          {rankingSnapshots.map((snapshot) => (
            <AccordionSection
              key={snapshot.snapshotKey}
              id={`season-award-${snapshot.awardKey}`}
              eyebrow="Cuộc đua trong giải vô địch quốc gia"
              title={AWARD_LABELS[snapshot.awardKey]}
              open={Boolean(openSections[snapshot.awardKey])}
              onToggle={() => toggleSection(snapshot.awardKey)}
            >
              <AwardRankingList snapshots={[snapshot]} showHeading={false} />
            </AccordionSection>
          ))}

          {bestXiSnapshot && (
            <AccordionSection id="season-best-xi" eyebrow="Cuộc đua trong giải vô địch quốc gia" title="Đội hình tiêu biểu" open={Boolean(openSections.league_best_xi)} onToggle={() => toggleSection("league_best_xi")}>
              <AwardBestXiPitch snapshot={bestXiSnapshot} />
            </AccordionSection>
          )}
        </div>
      </ModalBody>

      <ModalFooter className="rtg-season-close__footer">
        <Button size="lg" onClick={onClose}>Tiếp tục phát triển chỉ số</Button>
      </ModalFooter>
    </Modal>
  );
}
