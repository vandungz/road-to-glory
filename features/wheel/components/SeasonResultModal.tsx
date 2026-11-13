"use client";

import { useTranslations } from "next-intl";
import type { CompetitionStats, SeasonRecord } from "@/types/game";
import { restoreArchivedCompetitionRecord } from "../lib/season-record-hydration";
import { useCompetitionJourney } from "./useCompetitionJourney";
import { useCompetitionNames } from "./useCompetitionNames";
import { useCompetitionResult } from "./useCompetitionResult";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EditorialArt } from "@/components/shared/EditorialArt";
import { NationFlag } from "@/components/shared/NationFlag";

type Competition = "league" | "cup" | "continental" | "national";

interface Props {
  type: Competition;
  record: SeasonRecord;
  currentContinentalCup: string;
  playerDebutAge: number;
  playerNationality: string;
  isArchived?: boolean;
  onClose: () => void;
}

const art = { league: "pitch-overview", cup: "match-duel", continental: "air-control", national: "free-kick" } as const;

function getResult(type: Competition, record: SeasonRecord, continentalCup: string, names: ReturnType<typeof useCompetitionNames>) {
  switch (type) {
    case "league":
      return { title: names.leagueName(record.leagueName), result: record.standing === 1 ? "Winner" : record.standing ? `Hạng ${record.standing}` : null, stats: record.leagueStats };
    case "cup":
      return { title: names.domesticCupName(record.leagueName, record.leagueId), result: record.domesticCup, journey: record.domesticCupJourney, stats: record.domesticCupStats };
    case "continental":
      return { title: names.continentalCupName(record.continentalCup?.type ?? continentalCup), result: record.continentalCup?.result, journey: record.continentalCupJourney, stats: record.continentalStats };
    case "national":
      return { title: record.nationalTeam?.type || null, result: record.nationalTeam?.result ?? (record.nationalTeam?.callup === "Chờ gọi" ? null : record.nationalTeam?.callup), journey: record.nationalTeamJourney, stats: record.nationalStats };
  }
}

function StatsList({ stats }: { stats: CompetitionStats }) {
  const ui = useTranslations("ui");
  const t = useTranslations("competition");
  const rows = [
    [ui("appearances3"), stats.apps], [ui("goals"), stats.goals], [ui("assists"), stats.assists],
    [t("cleanSheets"), stats.cleanSheets], [ui("matchRating"), stats.rating.toFixed(2)],
  ] as const;
  return <dl className="football-season-result__stats">{rows.map(([label, value]) => (
    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
  ))}</dl>;
}

export function SeasonResultModal({ type, record, currentContinentalCup, playerNationality, playerDebutAge, isArchived, onClose }: Props) {
  const ui = useTranslations("ui");
  const t = useTranslations("competition");
  const resultLabel = useCompetitionResult();
  const names = useCompetitionNames();
  const formatJourney = useCompetitionJourney();
  const { title: savedTitle, result, journey, stats } = getResult(
    type,
    type === "national" ? restoreArchivedCompetitionRecord(record, playerNationality, playerDebutAge) : record,
    currentContinentalCup,
    names,
  );
  const title = savedTitle ?? ui(type === "national" ? "nationalTeam" : "domesticLeague");
  const isLeague = type === "league";
  const detailTitle = t(isLeague ? "standings" : "journey");
  const emptyMessage = type === "national" && result === "Không được gọi"
    ? t("notEntered")
    : t(isArchived ? "archiveEmpty" : "empty");

  return (
    <Modal open title={title} onClose={onClose} size="lg" className="football-season-result-modal">
      <ModalHeader onClose={onClose} closeLabel={ui("closeResults")}>{title}</ModalHeader>
      <ModalBody className="football-season-result__body">
        <section className="football-season-result__summary" aria-label={ui("resultAndStats")}>
          <div>
            <p className="football-season-result__team">
              {type === "national" ? <><NationFlag nationality={playerNationality} /> {playerNationality}</> : record.clubName}
            </p>
            <p className="football-season-result__outcome" data-champion={result === "Winner"}>
              {resultLabel(result)}
            </p>
          </div>
          <EditorialArt asset={art[type]} className="football-season-result__art" />
          <div>
            <h3 className="football-season-result__label">{ui("competitionStats")}</h3>
            {stats ? <StatsList stats={stats} /> : <p className="football-modal-note">{isArchived
              ? ui("noStatsWereSavedForThisSeason")
              : type === "national" && result === "Không được gọi" ? ui("noAppearances") : ui("availableAtTheEndOfTheSeason")}</p>}
          </div>
        </section>
        <section className="football-season-result__details" aria-label={detailTitle} tabIndex={0}>
          <h3>{detailTitle}</h3>
          {isLeague && record.leagueTable?.length ? (
            <table className="football-season-result__table">
              <thead><tr><th scope="col">{ui("rank")}</th><th scope="col">{t("club")}</th><th scope="col">{ui("points")}</th></tr></thead>
              <tbody>{record.leagueTable.map((row, index) => (
                <tr key={`${row.clubId}-${index}`} className="football-season-result__rank-row"
                  data-player-club={row.clubId === record.clubId || row.name === record.clubName}>
                  <td>{index + 1}</td><th scope="row">{row.name}</th><td>{row.points}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : journey?.length ? (
            <ol className="football-season-result__journey">{journey.map((item, index) => (
              <li key={`${index}-${item}`}>{formatJourney(item, type === "national")}</li>
            ))}</ol>
          ) : <p className="football-modal-note">{emptyMessage}</p>}
        </section>
      </ModalBody>
      <ModalFooter><Button onClick={onClose}>{isArchived ? ui("close") : ui("continue")}</Button></ModalFooter>
    </Modal>
  );
}
