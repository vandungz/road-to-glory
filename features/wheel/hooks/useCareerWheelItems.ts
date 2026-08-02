"use client";

import { useEffect, useState } from "react";
import { getNationalContinentalCup, getNationalTier, getMainStatsByPosition } from "@/lib/wheel-engine/weight-calculator";
import {
  getStandingWheelPool,
  getContinentalCupLabel,
  getNationalTournamentName,
  getDomesticCupWeights,
  getContinentalCupWeights,
  getNationalTournamentWeights,
  getNationalCallupWeights,
  getInfluenceProxy,
  getAgeProgressThresholds,
  getCareerProgress,
} from "../lib/simulation-helpers";
import {
  getEffectiveIncreaseGate,
  getEffectiveDecreaseGate,
  getEffectiveCountPool,
  getEffectiveMagnitudePool,
  getSelectorStatWeight,
} from "../lib/growth-balance";

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
  standingResult?: number | null;
  selectedStatsList: string[];
  position: string;
  yearSimResult: any;
  selectorIndex: number;
  yearEvolutionDirection?: "increase" | "decrease" | "maintain" | null;
  currentStats: Record<string, number>;
  ballonDorNominationWeight: number;
  ballonDorRankWeights: number[];
  luckRating?: number;
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
  standingResult = null,
  selectedStatsList,
  position,
  yearSimResult,
  selectorIndex,
  yearEvolutionDirection,
  currentStats,
  ballonDorNominationWeight,
  ballonDorRankWeights,
  luckRating = 10,
}: UseCareerWheelItemsProps) {
  const [careerWheelItems, setCareerWheelItems] = useState<{ label: string; value: any; weight?: number }[]>([]);

  useEffect(() => {
    if (!isMounted || mode !== "career") return;

    const rating = yearSimResult?.matchRating ?? 7.0;
    const prestige = currentClub?.prestige ?? 3;
    const influence = getInfluenceProxy(
      currentOvr, prestige, leagueSize, yearSimResult?.apps ?? null,
    );
    let items: { label: string; value: any; weight?: number }[] = [];

    switch (careerSubStep) {
      case "dir_increase": {
        const { yes: yesW, no: noW } = getEffectiveIncreaseGate({
          rating, position, currentAge, debutAge: playerDebutAge,
          careerLength: playerCareerLength, currentOvr,
          seasonApps: yearSimResult?.apps ?? null,
          seasonGoals: yearSimResult?.goals ?? null,
          seasonAssists: yearSimResult?.assists ?? null,
          seasonCleanSheets: yearSimResult?.cleanSheets ?? null,
        });
        items = [
          { label: "TĂNG CHỈ SỐ (YES)", value: "yes", weight: yesW },
          { label: "KHÔNG TĂNG (NO)", value: "no", weight: noW },
        ];
        break;
      }
      case "dir_decrease": {
        const { yes: yesW, no: noW } = getEffectiveDecreaseGate({
          rating, position, currentAge, debutAge: playerDebutAge,
          careerLength: playerCareerLength,
          seasonApps: yearSimResult?.apps ?? null,
        });
        items = [
          { label: "GIẢM CHỈ SỐ (YES)", value: "yes", weight: yesW },
          { label: "GIỮ NGUYÊN (NO)", value: "no", weight: noW },
        ];
        break;
      }
      case "count": {
        const isInc = yearEvolutionDirection === "increase";
        const pool = getEffectiveCountPool({
          rating, isIncrease: !!isInc, position, currentAge,
          debutAge: playerDebutAge, careerLength: playerCareerLength, currentOvr,
          seasonApps: yearSimResult?.apps ?? null,
        });
        items = pool.map((p) => ({ label: `${p.value} Chỉ Số`, value: p.value, weight: p.weight }));
        break;
      }
      case "magnitude": {
        const isInc = yearEvolutionDirection === "increase";
        const pool = getEffectiveMagnitudePool({
          rating, isIncrease: !!isInc, position, currentAge,
          debutAge: playerDebutAge, careerLength: playerCareerLength, currentOvr,
          seasonApps: yearSimResult?.apps ?? null,
        });
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
          !(isIncrease && (currentStats[c.key] ?? 0) >= 99) &&
          !(!isIncrease && (currentStats[c.key] ?? 0) <= 10)
        );
        const mainStats = getMainStatsByPosition(position);
        const { old } = getAgeProgressThresholds(position);
        const progress = getCareerProgress(currentAge, playerDebutAge, playerCareerLength);
        items = available.map((c) => ({
          value: c.key,
          label: c.name.toUpperCase(),
          weight: getSelectorStatWeight(mainStats.includes(c.key), !!isIncrease, progress, old),
        }));
        break;
      }
      case "standing": {
        const priorStanding = currentAge > playerDebutAge ? lastYearStanding : null;
        const standingPool = getStandingWheelPool(
          prestige, currentOvr, leagueSize, yearSimResult?.apps ?? null, priorStanding,
        );
        items = standingPool.map((x) => ({
          label: x.value === 1 ? "🏆 VÔ ĐỊCH (HẠNG 1)" : x.value === 2 ? "🥈 Á QUÂN (HẠNG 2)" : `HẠNG ${x.value}`,
          value: x.value,
          weight: x.weight,
        }));
        break;
      }
      case "domestic_cup": {
        const { wWin, wRun, wSemi, wQF, wR16, wR32, wExit } = getDomesticCupWeights(
          prestige, luckRating, currentOvr, influence,
        );
        items = [
          { label: "🏆 VÔ ĐỊCH CUP", value: "Winner", weight: wWin },
          { label: "🥈 Á QUÂN CUP", value: "Runner-Up", weight: wRun },
          { label: "🥉 BÁN KẾT", value: "Semi-Finals", weight: wSemi },
          { label: "⚡ TỨ KẾT", value: "Quarter-Finals", weight: wQF },
          { label: "🛡️ VÒNG 1/8", value: "Round of 16", weight: wR16 },
          { label: "⚽ VÒNG 1/16", value: "Round of 32", weight: wR32 },
          { label: "❌ BỊ LOẠI SỚM", value: "Early Exit", weight: wExit },
        ];
        break;
      }
      case "continental_cup": {
        const nameLabel = getContinentalCupLabel(currentContinentalCup);
        const { wWin, wRun, wSemi, wQF, wR16, wGroup } = getContinentalCupWeights(
          prestige, luckRating, currentOvr, influence,
        );
        items = [
          { label: `🏆 VÔ ĐỊCH ${nameLabel}`, value: "Winner", weight: wWin },
          { label: `🥈 Á QUÂN ${nameLabel}`, value: "Runner-Up", weight: wRun },
          { label: `🥉 BÁN KẾT`, value: "Semi-Finals", weight: wSemi },
          { label: `⚡ TỨ KẾT`, value: "Quarter-Finals", weight: wQF },
          { label: `🛡️ VÒNG 1/8`, value: "Round of 16", weight: wR16 },
          { label: `❌ VÒNG BẢNG`, value: "Group Stage", weight: wGroup },
        ];
        break;
      }
      case "national_callup": {
        const tier = getNationalTier(playerNationality);
        const midOvr = tier === 1 ? 80 : tier === 2 ? 75 : 70;
        const { wCall, wMiss } = getNationalCallupWeights(
          currentOvr, midOvr, standingResult, leagueSize,
        );
        items = [
          { label: "Được Triệu Tập Lên ĐTQG", value: "called_up", weight: wCall },
          { label: "Không Được Gọi", value: "missed", weight: wMiss },
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
        const tourneyName = getNationalTournamentName(
          playerNationality, currentAge, playerDebutAge, getNationalContinentalCup,
        );
        const nationTier = getNationalTier(playerNationality);
        const midOvr = nationTier === 1 ? 80 : nationTier === 2 ? 75 : 70;
        const { wWin, wRun, wSemi, wQF, wR16, wGroup } = getNationalTournamentWeights(
          currentOvr, luckRating, midOvr, influence,
        );
        items = [
          { label: `🏆 VÔ ĐỊCH ${tourneyName}`, value: "Winner", weight: wWin },
          { label: `🥈 Á QUÂN ${tourneyName}`, value: "Runner-Up", weight: wRun },
          { label: `🥉 BÁN KẾT`, value: "Semi-Finals", weight: wSemi },
          { label: `⚡ TỨ KẾT`, value: "Quarter-Finals", weight: wQF },
          { label: `🛡️ VÒNG 1/8`, value: "Round of 16", weight: wR16 },
          { label: `❌ VÒNG BẢNG`, value: "Group Stage", weight: wGroup },
        ];
        break;
      }
    }
    setCareerWheelItems(items);
  }, [
    careerSubStep, isMounted, mode, currentContinentalCup, currentAge, playerDebutAge,
    playerCareerLength, playerNationality, currentClub, currentOvr, leagueSize,
    lastYearStanding, standingResult, selectedStatsList, position, yearSimResult,
    selectorIndex, yearEvolutionDirection, currentStats, ballonDorNominationWeight,
    ballonDorRankWeights, luckRating,
  ]);

  return { careerWheelItems, setCareerWheelItems };
}
