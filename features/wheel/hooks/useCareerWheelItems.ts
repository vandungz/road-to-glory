"use client";

import { useMemo } from "react";
import { getNationalContinentalCup, getMainStatsByPosition } from "@/lib/wheel-engine/weight-calculator";
import {
  getContinentalCupLabel,
  getNationalTournamentName,
  isOldDualClock,
} from "../lib/simulation-helpers";
import {
  getEffectiveIncreaseGate,
  getEffectiveDecreaseGate,
  getEffectiveCountPool,
  getEffectiveMagnitudePool,
  getSelectorStatWeight,
} from "../lib/growth-balance";
import { computeEffectivePositionOvr } from "@/lib/transfer-economy";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import type { CurrentClub } from "@/types/domain";
import {
  buildStandingPool,
  buildDomesticCupPool,
  buildContinentalCupPool,
  buildNationalCallupPool,
  buildNationalTournamentPool,
  type TeamWheelCtx,
} from "../lib/wheel-team-params";

interface UseCareerWheelItemsProps {
  careerSubStep: string;
  isMounted: boolean;
  mode: string;
  currentContinentalCup: string;
  currentAge: number;
  playerDebutAge: number;
  playerCareerLength: number;
  playerNationality: string;
  currentClub: CurrentClub | null;
  currentOvr: number;
  leagueSize: number;
  priorClubStanding: number | null;
  standingResult?: number | null;
  selectedStatsList: string[];
  position: string;
  yearSimResult: SimulatedSeasonResult | null;
  selectorIndex: number;
  yearEvolutionDirection?: "increase" | "decrease" | "maintain" | null;
  currentStats: Record<string, number>;
  ballonDorNominationWeight: number;
  ballonDorRankWeights: number[];
  luckRating?: number;
  /** docs/core-currency-shop-design.md §6.2 — must equal the resolve's value (career-wheel-resolver.ts). */
  fitnessCoachActive?: boolean;
  nationalCallupBoostActive?: boolean;
  eliteDevelopmentActive?: boolean;
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
  priorClubStanding,
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
  fitnessCoachActive,
  nationalCallupBoostActive,
  eliteDevelopmentActive,
}: UseCareerWheelItemsProps) {
  const careerWheelItems = useMemo(() => {
    if (!isMounted || mode !== "career") return [];

    const rating = yearSimResult?.matchRating ?? 7.0;
    const prestige = currentClub?.prestige ?? 3;
    // SoT §7.10 — wheel weights use effPositionOvr (position-specific ability, §12.1);
    // SoT §3 — shared ctx for the 5 team wheels, must exactly mirror career-wheel-resolver.ts.
    const effPositionOvr = computeEffectivePositionOvr(position, currentStats, currentOvr);
    const teamCtx: TeamWheelCtx = {
      effPositionOvr,
      prestige,
      leagueSize,
      apps: yearSimResult?.apps ?? null,
      priorStanding: priorClubStanding,
      luckRating,
      playerNationality,
      standingResult,
      position,
      nationalCallupBoostActive,
    };
    let items: { label: string; value: string | number; weight?: number }[] = [];

    switch (careerSubStep) {
      case "dir_increase": {
        const { yes: yesW, no: noW } = getEffectiveIncreaseGate({
          rating, position, currentAge, debutAge: playerDebutAge,
          careerLength: playerCareerLength, currentOvr,
          seasonApps: yearSimResult?.apps ?? null,
          seasonGoals: yearSimResult?.goals ?? null,
          seasonAssists: yearSimResult?.assists ?? null,
          seasonCleanSheets: yearSimResult?.cleanSheets ?? null,
          eliteDevelopmentActive,
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
          fitnessCoachActive,
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
          fitnessCoachActive,
          eliteDevelopmentActive,
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
        const isOld = isOldDualClock(currentAge, playerDebutAge, playerCareerLength, position);
        items = available.map((c) => ({
          value: c.key,
          label: c.name.toUpperCase(),
          weight: getSelectorStatWeight(mainStats.includes(c.key), !!isIncrease, isOld, eliteDevelopmentActive),
        }));
        break;
      }
      case "standing": {
        const standingPool = buildStandingPool(teamCtx);
        items = standingPool.map((x) => ({
          label: x.value === 1 ? "VÔ ĐỊCH (HẠNG 1)" : x.value === 2 ? "Á QUÂN (HẠNG 2)" : `HẠNG ${x.value}`,
          value: x.value,
          weight: x.weight,
        }));
        break;
      }
      case "domestic_cup": {
        const pool = buildDomesticCupPool(teamCtx);
        items = pool.map((p) => ({
          label:
            p.value === "Winner" ? "VÔ ĐỊCH CUP" :
            p.value === "Runner-Up" ? "Á QUÂN CUP" :
            p.value === "Semi-Finals" ? "BÁN KẾT" :
            p.value === "Quarter-Finals" ? "TỨ KẾT" :
            p.value === "Round of 16" ? "VÒNG 1/8" :
            p.value === "Round of 32" ? "VÒNG 1/16" : "BỊ LOẠI SỚM",
          value: p.value,
          weight: p.weight,
        }));
        break;
      }
      case "continental_cup": {
        // Fail closed while an invalid/stale transition is being recovered.
        if (currentContinentalCup === "none") break;
        const nameLabel = getContinentalCupLabel(currentContinentalCup);
        const pool = buildContinentalCupPool(teamCtx);
        items = pool.map((p) => ({
          label:
            p.value === "Winner" ? `VÔ ĐỊCH ${nameLabel}` :
            p.value === "Runner-Up" ? `Á QUÂN ${nameLabel}` :
            p.value === "Semi-Finals" ? `BÁN KẾT` :
            p.value === "Quarter-Finals" ? `TỨ KẾT` :
            p.value === "Round of 16" ? `VÒNG 1/8` : `VÒNG BẢNG`,
          value: p.value,
          weight: p.weight,
        }));
        break;
      }
      case "national_callup": {
        const pool = buildNationalCallupPool(teamCtx);
        items = pool.map((p) => ({
          label: p.value === "called_up" ? "Được Triệu Tập Lên ĐTQG" : "Không Được Gọi",
          value: p.value,
          weight: p.weight,
        }));
        break;
      }
      case "ballon_dor_nomination": {
        const w = ballonDorNominationWeight;
        items = [
          { label: "ĐƯỢC ĐỀ CỬ TOP 10", value: "yes", weight: w },
          { label: "Chưa được xét năm này", value: "no", weight: 100 - w },
        ];
        break;
      }
      case "ballon_dor_ranking": {
        const rankLabels = [
          "HẠNG #1 — BALLON D'OR!",
          "Hạng #2", "Hạng #3",
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
        const pool = buildNationalTournamentPool(teamCtx);
        items = pool.map((p) => ({
          label:
            p.value === "Winner" ? `VÔ ĐỊCH ${tourneyName}` :
            p.value === "Runner-Up" ? `Á QUÂN ${tourneyName}` :
            p.value === "Semi-Finals" ? `BÁN KẾT` :
            p.value === "Quarter-Finals" ? `TỨ KẾT` :
            p.value === "Round of 16" ? `VÒNG 1/8` : `VÒNG BẢNG`,
          value: p.value,
          weight: p.weight,
        }));
        break;
      }
    }
    return items;
  }, [
    careerSubStep, isMounted, mode, currentContinentalCup, currentAge, playerDebutAge,
    playerCareerLength, playerNationality, currentClub, currentOvr, leagueSize,
    priorClubStanding, standingResult, selectedStatsList, position, yearSimResult,
    selectorIndex, yearEvolutionDirection, currentStats, ballonDorNominationWeight,
    ballonDorRankWeights, luckRating, fitnessCoachActive, nationalCallupBoostActive, eliteDevelopmentActive,
  ]);

  return { careerWheelItems };
}
