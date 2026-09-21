"use client";

import type { CompetitionStats, SeasonRecord } from "@/types/game";
import { getDomesticCupName, getContinentalCupLabel } from "../lib/simulation-helpers";
import { getCompetitionResultLabel } from "../lib/competition-result-labels";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { ResultBanner } from "@/components/ui/ResultBanner";

interface Props {
  type: "league" | "cup" | "continental" | "national";
  record: SeasonRecord;
  currentContinentalCup: string;
  playerDebutAge: number;
  onClose: () => void;
}

function getCupResultLabel(result: string | null | undefined) {
  return getCompetitionResultLabel(result, "Chưa có kết quả");
}

function StatsList({ stats }: { stats: CompetitionStats }) {
  const rows = [
    ["Trận", stats.apps], ["Bàn thắng", stats.goals], ["Kiến tạo", stats.assists],
    ...(stats.cleanSheets > 0 ? [["Sạch lưới", stats.cleanSheets]] : []),
    ["Match rating", stats.rating.toFixed(2)],
  ] as Array<[string, string | number]>;
  return <div className="football-modal-data-list">{rows.map(([label, value]) => <DataRow key={label} label={label} value={value} />)}</div>;
}

export function SeasonResultModal({ type, record, currentContinentalCup, onClose }: Props) {
  let title = "";
  let result = "";
  let journey: string[] = [];
  let stats: CompetitionStats | undefined;
  let champion = false;
  if (type === "league") {
    title = record.leagueName || "Giải VĐQG";
    result = record.standing ? (record.standing === 1 ? "Vô địch" : `Hạng ${record.standing}`) : "Chưa có kết quả";
    champion = record.standing === 1;
    stats = record.leagueStats;
  } else if (type === "cup") {
    title = getDomesticCupName(record.leagueName, record.leagueId); result = getCupResultLabel(record.domesticCup); journey = record.domesticCupJourney ?? []; champion = record.domesticCup === "Winner"; stats = record.domesticCupStats;
  } else if (type === "continental") {
    title = getContinentalCupLabel(record.continentalCup?.type ?? currentContinentalCup); result = getCupResultLabel(record.continentalCup?.result); journey = record.continentalCupJourney ?? []; champion = record.continentalCup?.result === "Winner"; stats = record.continentalStats;
  } else {
    title = record.nationalTeam?.type ?? "Đội tuyển quốc gia"; result = record.nationalTeam?.result ? getCupResultLabel(record.nationalTeam.result) : record.nationalTeam?.callup === "Không được gọi" ? "Không được gọi" : "Chưa có kết quả"; journey = record.nationalTeamJourney ?? []; champion = record.nationalTeam?.result === "Winner"; stats = record.nationalStats;
  }

  return (
    <Modal open title={`Kết quả ${title}`} onClose={onClose} size="sm" className="football-season-result-modal">
      <ModalHeader onClose={onClose} closeLabel="Đóng kết quả">{title}</ModalHeader>
      <ModalBody>
        <ResultBanner tone={champion ? "honour" : "default"}>{result}</ResultBanner>
        {stats ? <section className="football-modal-section"><span className="football-eyebrow">Thống kê giải đấu</span><StatsList stats={stats} /></section> : <p className="football-modal-note">Thống kê chi tiết sẽ có sau khi kết thúc mùa giải.</p>}
        {type === "league" && record.leagueTable && record.leagueTable.length > 0 && (
          <section className="football-modal-section"><span className="football-eyebrow">Bảng xếp hạng</span><div className="football-mini-table">{record.leagueTable.map((row, index) => { const isPlayer = String(row.name).toLowerCase() === record.clubName.toLowerCase(); return <div key={`${row.name}-${index}`} className={`football-mini-table__row${isPlayer ? " is-player" : ""}`}><span>{index + 1}</span><strong>{row.name}</strong><span>{row.points} điểm</span></div>; })}</div></section>
        )}
        {journey.length > 0 && <section className="football-modal-section"><span className="football-eyebrow">Hành trình</span><div className="football-journey-list">{journey.map((item, index) => <p key={`${item}-${index}`}>{cleanNarrative(item)}</p>)}</div></section>}
      </ModalBody>
      <ModalFooter><Button fullWidth onClick={onClose}>Tiếp tục hành trình</Button></ModalFooter>
    </Modal>
  );
}

function cleanNarrative(value: string) {
  return value.replace(/[🏆🥈🥉⚡⚽❌🛡️]/gu, "").replace(/\s{2,}/g, " ").trim();
}
