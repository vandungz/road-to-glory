"use client";

import type { CompetitionStats, SeasonRecord } from "@/types/game";
import { getDomesticCupName, getContinentalCupLabel } from "../lib/simulation-helpers";
import { restoreArchivedCompetitionRecord } from "../lib/season-record-hydration";
import { getCompetitionResultLabel } from "../lib/competition-result-labels";
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

function getResult(type: Competition, record: SeasonRecord, continentalCup: string) {
  switch (type) {
    case "league":
      return { title: record.leagueName || "Giải VĐQG", result: record.standing === 1 ? "Winner" : record.standing ? `Hạng ${record.standing}` : null, stats: record.leagueStats };
    case "cup":
      return { title: getDomesticCupName(record.leagueName, record.leagueId), result: record.domesticCup, journey: record.domesticCupJourney, stats: record.domesticCupStats };
    case "continental":
      return { title: getContinentalCupLabel(record.continentalCup?.type ?? continentalCup), result: record.continentalCup?.result, journey: record.continentalCupJourney, stats: record.continentalStats };
    case "national":
      return { title: record.nationalTeam?.type || "Đội tuyển quốc gia", result: record.nationalTeam?.result ?? (record.nationalTeam?.callup === "Chờ gọi" ? null : record.nationalTeam?.callup), journey: record.nationalTeamJourney, stats: record.nationalStats };
  }
}

function StatsList({ stats }: { stats: CompetitionStats }) {
  const rows = [
    ["Ra sân", stats.apps], ["Bàn thắng", stats.goals], ["Kiến tạo", stats.assists],
    ["Giữ sạch lưới", stats.cleanSheets], ["Điểm phong độ", stats.rating.toFixed(2)],
  ] as const;
  return <dl className="football-season-result__stats">{rows.map(([label, value]) => (
    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
  ))}</dl>;
}

export function SeasonResultModal({ type, record, currentContinentalCup, playerNationality, playerDebutAge, isArchived, onClose }: Props) {
  const { title, result, journey, stats } = getResult(
    type,
    type === "national" ? restoreArchivedCompetitionRecord(record, playerNationality, playerDebutAge) : record,
    currentContinentalCup,
  );
  const isLeague = type === "league";
  const detailTitle = isLeague ? "Bảng xếp hạng" : "Hành trình";
  const emptyMessage = type === "national" && result === "Không được gọi"
    ? "Cầu thủ không tham dự giải này."
    : isArchived ? "Mùa giải này chưa lưu dữ liệu chi tiết." : "Chưa có dữ liệu chi tiết.";

  return (
    <Modal open title={title} onClose={onClose} size="lg" className="football-season-result-modal">
      <ModalHeader onClose={onClose} closeLabel="Đóng kết quả">{title}</ModalHeader>
      <ModalBody className="football-season-result__body">
        <section className="football-season-result__summary" aria-label="Kết quả và thống kê">
          <div>
            <p className="football-season-result__team">
              {type === "national" ? <><NationFlag nationality={playerNationality} /> {playerNationality}</> : record.clubName}
            </p>
            <p className="football-season-result__outcome" data-champion={result === "Winner"}>
              {getCompetitionResultLabel(result, "Chưa có kết quả")}
            </p>
          </div>
          <EditorialArt asset={art[type]} className="football-season-result__art" />
          <div>
            <h3 className="football-season-result__label">Thống kê giải đấu</h3>
            {stats ? <StatsList stats={stats} /> : <p className="football-modal-note">{isArchived
              ? "Mùa giải này chưa lưu thống kê."
              : type === "national" && result === "Không được gọi" ? "Không ra sân." : "Có sau khi kết thúc mùa giải."}</p>}
          </div>
        </section>
        <section className="football-season-result__details" aria-label={detailTitle} tabIndex={0}>
          <h3>{detailTitle}</h3>
          {isLeague && record.leagueTable?.length ? (
            <table className="football-season-result__table">
              <thead><tr><th scope="col">Hạng</th><th scope="col">CLB</th><th scope="col">Điểm</th></tr></thead>
              <tbody>{record.leagueTable.map((row, index) => (
                <tr key={`${row.clubId}-${index}`} className="football-season-result__rank-row"
                  data-player-club={row.clubId === record.clubId || row.name === record.clubName}>
                  <td>{index + 1}</td><th scope="row">{row.name}</th><td>{row.points}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : journey?.length ? (
            <ol className="football-season-result__journey">{journey.map((item, index) => (
              <li key={`${index}-${item}`}>{item.replace(/[🏆🥈🥉⚡⚽❌🛡️]/gu, "").replace(/\s{2,}/g, " ").trim()}</li>
            ))}</ol>
          ) : <p className="football-modal-note">{emptyMessage}</p>}
        </section>
      </ModalBody>
      <ModalFooter><Button onClick={onClose}>{isArchived ? "Đóng" : "Tiếp tục hành trình"}</Button></ModalFooter>
    </Modal>
  );
}
