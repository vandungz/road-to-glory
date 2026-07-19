"use client";

import { useEffect, useState } from "react";
import { getNationalContinentalCup, getNationalTier, getMainStatsByPosition } from "@/lib/wheel-engine/weight-calculator";
import {
  getStandingWheelPool,
  getContinentalCupLabel,
  getGrowthTier,
  getIncreaseGateWeight,
  getDecreaseGateWeight,
  getCountPool,
  getCountPoolBoosted,
  getMagnitudePool,
  getMagnitudePoolBoosted,
  getMagnitudeTierForDirection,
  getAgeProgressThresholds,
  getCareerProgress,
  getGrowthBoost,
} from "../lib/simulation-helpers";

interface UseCareerWheelItemsProps {
  careerSubStep: string;
  isMounted: boolean;
  mode: string;
  currentContinentalCup: string;
  currentAge: number;
  playerDebutAge: number;
  playerCareerLength: number;
  playerNationality: string;
  currentClub: any;
  currentOvr: number;
  leagueSize: number;
  lastYearStanding: number;
  selectedStatsList: string[];
  position: string;
  yearSimResult: any;
  selectorIndex: number;
  yearEvolutionDirection?: "increase" | "decrease" | "maintain" | null;
  currentStats: Record<string, number>;
  ballonDorNominationWeight: number;
  ballonDorRankWeights: number[];
}

export function useCareerWheelItems({
  careerSubStep,
  isMounted,
  mode,
  currentContinentalCup,
  currentAge,
  playerDebutAge,
  playerCareerLength,
  playerNationality,
  currentClub,
  currentOvr,
  leagueSize,
  lastYearStanding,
  selectedStatsList,
  position,
  yearSimResult,
  selectorIndex,
  yearEvolutionDirection,
  currentStats,
  ballonDorNominationWeight,
  ballonDorRankWeights,
}: UseCareerWheelItemsProps) {
  const [careerWheelItems, setCareerWheelItems] = useState<{ label: string; value: any; weight?: number }[]>([]);

  useEffect(() => {
    if (!isMounted || mode !== "career") return;

    const rating = yearSimResult?.matchRating ?? 7.0;
    let items: { label: string; value: any; weight?: number }[] = [];

    switch (careerSubStep) {
      case "dir_increase": {
        const { young, old } = getAgeProgressThresholds(position);
        const progress = getCareerProgress(currentAge, playerDebutAge, playerCareerLength);
        let { yes: yesW, no: noW } = getIncreaseGateWeight(getGrowthTier(rating));
        if (progress < young)      { yesW = Math.min(95, yesW + 10); noW = Math.max(5, noW - 10); }
        else if (progress >= old)  { yesW = Math.max(5, yesW - 10); noW = Math.min(95, noW + 10); }
        items = [
          { label: "TĂNG CHỈ SỐ (YES)", value: "yes", weight: yesW },
          { label: "KHÔNG TĂNG (NO)",    value: "no",  weight: noW  },
        ];
        break;
      }
      case "dir_decrease": {
        const { young, old } = getAgeProgressThresholds(position);
        const progress = getCareerProgress(currentAge, playerDebutAge, playerCareerLength);
        let { yes: yesW, no: noW } = getDecreaseGateWeight(getGrowthTier(rating));
        if (progress < young)      { yesW = Math.max(5, yesW - 20);  noW = Math.min(95, noW + 20); }
        else if (progress >= old)  { yesW = Math.min(95, yesW + 15); noW = Math.max(5, noW - 15); }
        items = [
          { label: "GIẢM CHỈ SỐ (YES)", value: "yes", weight: yesW },
          { label: "GIỮ NGUYÊN (NO)",   value: "no",  weight: noW  },
        ];
        break;
      }
      case "count": {
        const tier = getGrowthTier(rating);
        const isInc = yearEvolutionDirection === "increase";
        let pool = getCountPool(tier, isInc);
        if (isInc) {
          const { young } = getAgeProgressThresholds(position);
          const progress = getCareerProgress(currentAge, playerDebutAge, playerCareerLength);
          pool = getCountPoolBoosted(tier, getGrowthBoost(progress, young));
        }
        items = pool.map((p) => ({ label: `${p.value} Chỉ Số`, value: p.value, weight: p.weight }));
        break;
      }
      case "magnitude": {
        const isInc = yearEvolutionDirection === "increase";
        const tier = getMagnitudeTierForDirection(rating, isInc);
        let pool = getMagnitudePool(tier);
        if (isInc) {
          const { young } = getAgeProgressThresholds(position);
          const progress = getCareerProgress(currentAge, playerDebutAge, playerCareerLength);
          pool = getMagnitudePoolBoosted(tier, getGrowthBoost(progress, young));
        }
        items = pool.map((p) => ({ label: `${p.value} Điểm`, value: p.value, weight: p.weight }));
        break;
      }
      case "selector": {
        const coreStats = position === "GK"
          ? [
              { key: "div", name: "Diving (DIV)" },
              { key: "han", name: "Handling (HAN)" },
              { key: "kic", name: "Kicking (KIC)" },
              { key: "ref", name: "Reflexes (REF)" },
              { key: "spd", name: "Speed (SPD)" },
              { key: "pos", name: "Positioning (POS)" },
            ]
          : [
              { key: "pac", name: "Pace (PAC)" },
              { key: "sho", name: "Shooting (SHO)" },
              { key: "pas", name: "Passing (PAS)" },
              { key: "dri", name: "Dribbling (DRI)" },
              { key: "def", name: "Defending (DEF)" },
              { key: "phy", name: "Physical (PHY)" },
            ];
        const currentSelectedList = selectorIndex === 0 ? [] : selectedStatsList;
        const isIncrease = yearEvolutionDirection === "increase";
        const available = coreStats.filter((c) =>
          !currentSelectedList.includes(c.key) &&
          !(isIncrease && (currentStats[c.key] ?? 0) >= 99)
        );
        const mainStats = getMainStatsByPosition(position);
        items = available.map((c) => ({
          value: c.key,
          label: c.name.toUpperCase(),
          weight: mainStats.includes(c.key) ? 25 : 10,
        }));
        break;
      }
      case "standing": {
        const priorStanding = currentAge > playerDebutAge ? lastYearStanding : null;
        const standingPool = getStandingWheelPool(currentClub?.prestige ?? 3, currentOvr, leagueSize, yearSimResult?.apps ?? 38, priorStanding);
        items = standingPool.map((x) => ({
          label: x.value === 1 ? "🏆 VÔ ĐỊCH (HẠNG 1)" : x.value === 2 ? "🥈 Á QUÂN (HẠNG 2)" : `HẠNG ${x.value}`,
          value: x.value,
          weight: x.weight,
        }));
        break;
      }
      case "domestic_cup": {
        const prestige = currentClub?.prestige ?? 3;
        const wWin  = 5 + prestige * 3 + 2; // luckRating=10 default → floor(10/4)=2
        const wRun  = 8 + prestige * 3;
        const wSemi = 15 + prestige * 2;
        const wExit = Math.max(10, 72 - prestige * 8);
        items = [
          { label: "Vô Địch Cup",   value: "Winner",     weight: wWin  },
          { label: "Á Quân Cup",    value: "Runner-Up",  weight: wRun  },
          { label: "Vào Bán Kết",   value: "Semi-Finals", weight: wSemi },
          { label: "Bị Loại Sớm",  value: "Early Exit", weight: wExit },
        ];
        break;
      }
      case "continental_cup": {
        const nameLabel = getContinentalCupLabel(currentContinentalCup);
        const prestige  = currentClub?.prestige ?? 3;
        const wWin  = 3 + prestige * 3 + 2; // luck default=10
        const wRun  = 7 + prestige * 2;
        const wSemi = 15 + prestige * 2;
        const wGroup = Math.max(10, 75 - prestige * 7);
        items = [
          { label: `Vô Địch ${nameLabel}`,    value: "Winner",      weight: wWin   },
          { label: `Á Quân ${nameLabel}`,     value: "Runner-Up",   weight: wRun   },
          { label: `Bán Kết ${nameLabel}`,    value: "Semi-Finals", weight: wSemi  },
          { label: `Vòng Bảng ${nameLabel}`,  value: "Group Stage", weight: wGroup },
        ];
        break;
      }
      case "national_callup": {
        const tier   = getNationalTier(playerNationality);
        const midOvr = tier === 1 ? 80 : tier === 2 ? 75 : 70;
        const ovrDiff = currentOvr - midOvr;
        let wCall = Math.max(5, Math.min(90, 50 + ovrDiff * 2));
        if (rating >= 7.40)      wCall = Math.min(90, wCall + 20);
        else if (rating <= 6.50) wCall = Math.max(5,  wCall - 20);
        const wMiss = Math.max(5, 100 - wCall);
        items = [
          { label: "Được Triệu Tập Lên ĐTQG", value: "called_up", weight: wCall },
          { label: "Không Được Gọi",           value: "missed",    weight: wMiss },
        ];
        break;
      }
      case "ballon_dor_nomination": {
        const w = ballonDorNominationWeight;
        items = [
          { label: "ĐƯỢC ĐỀ CỬ TOP 10! 🏅", value: "yes", weight: w },
          { label: "Chưa được xét năm này", value: "no", weight: 100 - w },
        ];
        break;
      }
      case "ballon_dor_ranking": {
        const rankLabels = [
          "🏆 HẠNG #1 — BALLON D'OR!",
          "🥈 Hạng #2", "🥉 Hạng #3",
          "Hạng #4", "Hạng #5",
          "Hạng #6", "Hạng #7",
          "Hạng #8", "Hạng #9", "Hạng #10",
        ];
        items = ballonDorRankWeights.map((w, i) => ({
          label: rankLabels[i],
          value: i + 1,
          weight: w,
        }));
        break;
      }
      case "national_tournament": {
        const nationCupName = getNationalContinentalCup(playerNationality);
        const tourneyName   = currentAge % 4 === 0 ? "FIFA World Cup" : nationCupName;
        const ovr   = currentOvr;
        const wWin  = Math.max(1, 3  + 2 + Math.floor((ovr - 70) * 0.2));  // luck default=10
        const wRun  = Math.max(1, 7  + Math.floor((ovr - 70) * 0.2));
        const wSemi = 20;
        const wGroup = Math.max(10, 70 - Math.floor((ovr - 70) * 0.4));
        items = [
          { label: `Vô Địch ${tourneyName} 🏆`, value: "Winner",      weight: wWin   },
          { label: `Á Quân ${tourneyName}`,      value: "Runner-Up",   weight: wRun   },
          { label: `Bán Kết ${tourneyName}`,     value: "Semi-Finals", weight: wSemi  },
          { label: `Vòng Bảng ${tourneyName}`,   value: "Group Stage", weight: wGroup },
        ];
        break;
      }
    }
    setCareerWheelItems(items);
  }, [careerSubStep, isMounted, mode, currentContinentalCup, currentAge, playerDebutAge, playerCareerLength, playerNationality, currentClub, currentOvr, leagueSize, lastYearStanding, selectedStatsList, position, yearSimResult, selectorIndex, yearEvolutionDirection, currentStats, ballonDorNominationWeight, ballonDorRankWeights]);

  return { careerWheelItems, setCareerWheelItems };
}
