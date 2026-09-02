"use client";

import { Trophy } from "lucide-react";
import type { SeasonRecord } from "@/types/game";
import { getDomesticCupName, getContinentalCupLabel } from "../lib/simulation-helpers";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface Props {
  seasonRecords: Record<number, SeasonRecord>;
  playerName: string;
  playerNationality: string;
  onClose: () => void;
}

interface TrophyItem {
  id: string;
  type: "league" | "cup" | "continental" | "award" | "national";
  title: string;
  season: string;
  clubName: string;
}

const TYPE_LABELS: Record<TrophyItem["type"], string> = {
  league: "Giải VĐQG",
  cup: "Cúp quốc gia",
  continental: "Cúp lục địa",
  award: "Danh hiệu cá nhân",
  national: "Đội tuyển quốc gia",
};

export function TrophyCabinetModal({ seasonRecords, playerName, playerNationality, onClose }: Props) {
  const trophyList: TrophyItem[] = [];
  Object.keys(seasonRecords).map(Number).sort((a, b) => a - b).forEach((age) => {
    const rec = seasonRecords[age];
    if (!rec) return;
    const season = `Tuổi ${age}`;
    const clubName = rec.clubName || "CLB";
    if (rec.standing === 1) trophyList.push({ id: `league_${age}`, type: "league", title: `Vô địch ${rec.leagueName || "Giải VĐQG"}`, season, clubName });
    if (rec.domesticCup === "Winner") trophyList.push({ id: `cup_${age}`, type: "cup", title: `Vô địch ${getDomesticCupName(rec.leagueName, rec.leagueId)}`, season, clubName });
    if (rec.continentalCup?.result === "Winner") trophyList.push({ id: `continental_${age}`, type: "continental", title: `Vô địch ${getContinentalCupLabel(rec.continentalCup.type)}`, season, clubName });
    if (rec.ballonDorResult === 1 || rec.achievements?.ballonDor) trophyList.push({ id: `ballondor_${age}`, type: "award", title: "Quả Bóng Vàng (Ballon d'Or)", season, clubName });
    if (rec.nationalTeam?.result === "Winner") trophyList.push({ id: `national_${age}`, type: "national", title: `Vô địch ${rec.nationalTeam.type || "Cúp quốc tế"}`, season, clubName: playerNationality || "Đội tuyển quốc gia" });
  });

  return (
    <Modal open title={`Tủ danh hiệu của ${playerName}`} onClose={onClose} size="md" variant="inverse" className="rtg-trophy-modal">
      <ModalHeader onClose={onClose} closeLabel="Đóng tủ danh hiệu">Tổng danh hiệu ({trophyList.length})</ModalHeader>
      <ModalBody className="rtg-trophy-modal__body">
        {trophyList.length === 0 ? (
          <div className="rtg-empty-state rtg-empty-state--inverse"><Trophy size={28} aria-hidden="true" /><p>Chưa mở khóa danh hiệu nào.</p><span>Hãy tiếp tục các mùa giải để xây dựng di sản.</span></div>
        ) : (
          trophyList.map((trophy) => (
            <div className="rtg-trophy-row" key={trophy.id}>
              <div className="rtg-trophy-row__mark"><Trophy size={18} aria-hidden="true" /></div>
              <div className="rtg-trophy-row__copy"><span>{TYPE_LABELS[trophy.type]}</span><strong>{trophy.title}</strong><small>{trophy.clubName}</small></div>
              <time>{trophy.season}</time>
            </div>
          ))
        )}
      </ModalBody>
      <ModalFooter><Button variant="outline" fullWidth onClick={onClose}>Đóng tủ danh hiệu</Button></ModalFooter>
    </Modal>
  );
}
