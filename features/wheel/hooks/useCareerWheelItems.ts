"use client";

import { useEffect, useState } from "react";
import { getNationalContinentalCup } from "@/lib/wheel-engine/weight-calculator";
import { getStandingWheelPool, getContinentalCupLabel } from "../lib/simulation-helpers";

interface UseCareerWheelItemsProps {
  careerSubStep: string;
  isMounted: boolean;
  mode: string;
  currentContinentalCup: string;
  currentAge: number;
  playerNationality: string;
  currentClub: any;
  currentOvr: number;
  leagueSize: number;
  selectedStatsList: string[];
  position: string;
  yearSimResult: any;
  selectorIndex: number;
}

export function useCareerWheelItems({
  careerSubStep,
  isMounted,
  mode,
  currentContinentalCup,
  currentAge,
  playerNationality,
  currentClub,
  currentOvr,
  leagueSize,
  selectedStatsList,
  position,
  yearSimResult,
  selectorIndex,
}: UseCareerWheelItemsProps) {
  const [careerWheelItems, setCareerWheelItems] = useState<{ label: string; value: any }[]>([]);

  useEffect(() => {
    if (!isMounted || mode !== "career") return;

    let items: { label: string; value: any }[] = [];
    switch (careerSubStep) {
      case "dir_increase":
        items = [
          { label: "TĂNG CHỈ SỐ (YES)", value: "yes" },
          { label: "KHÔNG TĂNG (NO)", value: "no" },
        ];
        break;
      case "dir_decrease":
        items = [
          { label: "GIẢM CHỈ SỐ (YES)", value: "yes" },
          { label: "GIỮ NGUYÊN (NO)", value: "no" },
        ];
        break;
      case "count":
        items = [
          { label: "1 Chỉ Số", value: 1 },
          { label: "2 Chỉ Số", value: 2 },
          { label: "3 Chỉ Số", value: 3 },
          { label: "4 Chỉ Số", value: 4 },
        ];
        break;
      case "magnitude":
        items = [
          { label: "1 Điểm", value: 1 },
          { label: "2 Điểm", value: 2 },
          { label: "3 Điểm", value: 3 },
          { label: "4 Điểm", value: 4 },
          { label: "5 Điểm", value: 5 },
          { label: "6 Điểm", value: 6 },
        ];
        break;
      case "selector":
        const coreStats = [
          { key: "pac", name: "Pace (PAC)" },
          { key: "sho", name: "Shooting (SHO)" },
          { key: "pas", name: "Passing (PAS)" },
          { key: "dri", name: "Dribbling (DRI)" },
          { key: "def", name: "Defending (DEF)" },
          { key: "phy", name: "Physical (PHY)" },
        ];
        const currentSelectedList = selectorIndex === 0 ? [] : selectedStatsList;
        const available = coreStats.filter(c => !currentSelectedList.includes(c.key));
        items = available.map(c => ({
          value: c.key,
          label: c.name.toUpperCase(),
        }));
        break;
      case "standing":
        const standingPool = getStandingWheelPool(currentClub?.prestige ?? 3, currentOvr, leagueSize, yearSimResult?.apps ?? 38);
        items = standingPool.map((x) => ({
          label: x.value === 1 ? "🏆 VÔ ĐỊCH (HẠNG 1)" : x.value === 2 ? "🥈 Á QUÂN (HẠNG 2)" : `HẠNG ${x.value}`,
          value: x.value,
        }));
        break;
      case "domestic_cup":
        items = [
          { label: "Vô Địch Cup", value: "Winner" },
          { label: "Á Quân Cup", value: "Runner-Up" },
          { label: "Vào Bán Kết", value: "Semi-Finals" },
          { label: "Bị Loại Sớm", value: "Early Exit" },
        ];
        break;
      case "continental_cup":
        const nameLabel = getContinentalCupLabel(currentContinentalCup);
        items = [
          { label: `Vô Địch ${nameLabel}`, value: "Winner" },
          { label: `Á Quân ${nameLabel}`, value: "Runner-Up" },
          { label: `Bán Kết ${nameLabel}`, value: "Semi-Finals" },
          { label: `Vòng Bảng ${nameLabel}`, value: "Group Stage" },
        ];
        break;
      case "national_callup":
        items = [
          { label: `Được Triệu Tập Lên ĐTQG`, value: "called_up" },
          { label: `Không Được Gọi`, value: "missed" },
        ];
        break;
      case "national_tournament":
        const nationCupName = getNationalContinentalCup(playerNationality);
        const tourneyName = currentAge % 4 === 0 ? "FIFA World Cup" : nationCupName;
        items = [
          { label: `Vô Địch ${tourneyName} 🏆`, value: "Winner" },
          { label: `Á Quân ${tourneyName}`, value: "Runner-Up" },
          { label: `Bán Kết ${tourneyName}`, value: "Semi-Finals" },
          { label: `Vòng Bảng ${tourneyName}`, value: "Group Stage" },
        ];
    }
    setCareerWheelItems(items);
  }, [careerSubStep, isMounted, mode, currentContinentalCup, currentAge, playerNationality, currentClub, currentOvr, leagueSize, selectedStatsList, position, yearSimResult, selectorIndex]);

  return { careerWheelItems, setCareerWheelItems };
}
