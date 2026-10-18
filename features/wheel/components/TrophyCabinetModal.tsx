"use client";

import { Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import type { SeasonRecord } from "@/types/game";
import { isDeprecatedAwardKey } from "@/types/awards";
import { getHonourDisplayCategory, getHonourIdentity, getHonourResultLabel, getSpecificHonourLabel, normalizeHonourResult, type HonourDisplayCategory, type HonourResult } from "@/features/career/lib/honour-display";
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
  category: HonourDisplayCategory;
  type: "league" | "cup" | "continental" | "award" | "national";
  title: string;
  season: string;
  clubName: string;
  result?: HonourResult;
}

const TYPE_LABELS: Record<TrophyItem["type"], string> = {
  league: "Giải VĐQG",
  cup: "Cúp quốc gia",
  continental: "Cúp lục địa",
  award: "Danh hiệu cá nhân",
  national: "Đội tuyển quốc gia",
};

export function TrophyCabinetModal({ seasonRecords, playerName, playerNationality, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<HonourDisplayCategory>("club");
  const trophyList = useMemo(() => {
    const trophies: TrophyItem[] = [];
    const seen = new Set<string>();
    const add = (trophy: TrophyItem) => {
      if (seen.has(trophy.id)) return;
      seen.add(trophy.id);
      trophies.push(trophy);
    };

    Object.keys(seasonRecords).map(Number).sort((a, b) => a - b).forEach((age) => {
      const rec = seasonRecords[age];
      if (!rec) return;
      const season = `Tuổi ${age}`;
      const clubName = rec.clubName || "CLB";
      const context = {
        leagueId: rec.leagueId,
        leagueName: rec.leagueName,
        continentalType: rec.continentalCup?.type,
        nationalTeamType: rec.nationalTeam?.type,
      };
      const visibleHonours = (rec.honours ?? []).filter((honour) => !isDeprecatedAwardKey(honour.awardKey));
      const canonicalKeys = new Set(visibleHonours.map((honour) => `${honour.awardKey}:${normalizeHonourResult(honour.result)}`));
      if ((rec.standing === 1 || rec.standing === 2) && !canonicalKeys.has(`league_title:${rec.standing === 2 ? "runner_up" : "winner"}`)) {
        const result = rec.standing === 2 ? "runner_up" as const : "winner" as const;
        add({ id: `${age}:league_title:${result}`, category: "club", type: "league", title: getHonourResultLabel(getSpecificHonourLabel("league_title", "Vô địch giải quốc gia", context), result), season, clubName, result });
      }
      if ((rec.domesticCup === "Winner" || rec.domesticCup === "Runner-Up") && !canonicalKeys.has(`domestic_cup_title:${rec.domesticCup === "Runner-Up" ? "runner_up" : "winner"}`)) {
        const result = rec.domesticCup === "Runner-Up" ? "runner_up" as const : "winner" as const;
        add({ id: `${age}:domestic_cup_title:${result}`, category: "club", type: "cup", title: getHonourResultLabel(getSpecificHonourLabel("domestic_cup_title", "Vô địch Cúp quốc gia", context), result), season, clubName, result });
      }
      if ((rec.continentalCup?.result === "Winner" || rec.continentalCup?.result === "Runner-Up") && !canonicalKeys.has(`continental_title:${rec.continentalCup.result === "Runner-Up" ? "runner_up" : "winner"}`)) {
        const result = rec.continentalCup.result === "Runner-Up" ? "runner_up" as const : "winner" as const;
        add({ id: `${age}:continental_title:${result}`, category: "club", type: "continental", title: getHonourResultLabel(getSpecificHonourLabel("continental_title", "Vô địch cúp châu lục", context), result), season, clubName, result });
      }
      if ((rec.nationalTeam?.result === "Winner" || rec.nationalTeam?.result === "Runner-Up") && !canonicalKeys.has(`national_team_title:${rec.nationalTeam.result === "Runner-Up" ? "runner_up" : "winner"}`)) {
        const result = rec.nationalTeam.result === "Runner-Up" ? "runner_up" as const : "winner" as const;
        add({ id: `${age}:national_team_title:${result}`, category: "club", type: "national", title: getHonourResultLabel(getSpecificHonourLabel("national_team_title", "Vô địch giải quốc tế", context), result), season, clubName: playerNationality || "Đội tuyển quốc gia", result });
      }

      visibleHonours.forEach((honour) => {
        const category = getHonourDisplayCategory(honour.awardKey);
        const type: TrophyItem["type"] = honour.awardKey === "league_title"
          ? "league"
          : honour.awardKey === "domestic_cup_title"
            ? "cup"
            : honour.awardKey === "continental_title"
              ? "continental"
              : honour.awardKey === "national_team_title"
                ? "national"
                : "award";
        const result = normalizeHonourResult(honour.result);
        const title = getHonourResultLabel(getSpecificHonourLabel(honour.awardKey, honour.label, context), result);
        const rankLabel = honour.rank && honour.rank > 1 ? ` · hạng ${honour.rank}` : "";
        add({
          id: `${age}:${getHonourIdentity(honour.awardKey, title, honour.slotKey, result)}`,
          category,
          type,
          title: `${title}${rankLabel}`,
          season,
          clubName: type === "national" ? playerNationality || "Đội tuyển quốc gia" : clubName,
          result,
        });
      });

      // Only a season-scoped winner is valid here. Never use the cumulative
      // achievements.ballonDor counter as a per-season award signal.
      if (rec.ballonDorResult === 1 && !canonicalKeys.has("ballon_dor:winner")) {
        add({ id: `${age}:ballon_dor`, category: "individual", type: "award", title: "Quả Bóng Vàng (Ballon d'Or)", season, clubName });
      }
    });
    return trophies;
  }, [playerNationality, seasonRecords]);

  const visibleTrophies = trophyList.filter((trophy) => trophy.category === activeTab);
  const clubCount = trophyList.filter((trophy) => trophy.category === "club").length;
  const individualCount = trophyList.filter((trophy) => trophy.category === "individual").length;

  return (
    <Modal open title={`Tủ danh hiệu của ${playerName}`} onClose={onClose} size="md" variant="inverse" className="football-trophy-modal">
      <ModalHeader onClose={onClose} closeLabel="Đóng tủ danh hiệu">Tổng thành tích ({trophyList.length})</ModalHeader>
      <div className="football-trophy-tabs" role="tablist" aria-label="Phân loại danh hiệu">
        {(["club", "individual"] as const).map((tab) => {
          const isActive = activeTab === tab;
          const count = tab === "club" ? clubCount : individualCount;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`trophy-tab-${tab}`}
              aria-selected={isActive}
              aria-controls="trophy-panel"
              className={isActive ? "is-active" : undefined}
              onClick={() => setActiveTab(tab)}
            >
              <span>{tab === "club" ? "Danh hiệu CLB" : "Danh hiệu cá nhân"}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>
      <ModalBody id="trophy-panel" role="tabpanel" aria-labelledby={`trophy-tab-${activeTab}`} className="football-trophy-modal__body">
        {visibleTrophies.length === 0 ? (
          <div className="football-empty-state football-empty-state--inverse"><Trophy size={28} aria-hidden="true" /><p>Chưa mở khóa danh hiệu nào.</p><span>Hãy tiếp tục các mùa giải để xây dựng di sản.</span></div>
        ) : (
          visibleTrophies.map((trophy) => (
            <div className={`football-trophy-row${trophy.result === "runner_up" ? " is-runner-up" : ""}`} key={trophy.id}>
              <div className="football-trophy-row__mark"><Trophy size={18} aria-hidden="true" /></div>
              <div className="football-trophy-row__copy"><span>{TYPE_LABELS[trophy.type]}</span><strong>{trophy.title}</strong><small>{trophy.clubName}</small></div>
              <time>{trophy.season}</time>
            </div>
          ))
        )}
      </ModalBody>
      <ModalFooter><Button variant="outline" fullWidth onClick={onClose}>Đóng tủ danh hiệu</Button></ModalFooter>
    </Modal>
  );
}
