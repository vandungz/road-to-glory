// features/wheel/lib/career-wheel-resolver.ts

import { resolveWeightedOutcome } from "@/lib/wheel-engine/spin-resolver";
import { getNationalContinentalCup, getMainStatsByPosition } from "@/lib/wheel-engine/weight-calculator";
import { getFlagEmoji } from "@/types/squad";
import {
  getContinentalCupLabel,
  getNationalTournamentName,
  isOldDualClock,
} from "./simulation-helpers";
import {
  getEffectiveIncreaseGate,
  getEffectiveDecreaseGate,
  getEffectiveCountPool,
  getEffectiveMagnitudePool,
  getSelectorStatWeight,
} from "./growth-balance";
import { computeEffectivePositionOvr } from "@/lib/transfer-economy";
import {
  buildStandingPool,
  buildDomesticCupPool,
  buildContinentalCupPool,
  buildNationalCallupPool,
  buildNationalTournamentPool,
  type TeamWheelCtx,
} from "./wheel-team-params";
import type { CurrentClub, HiddenStats } from "@/types/domain";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";


interface CareerWheelContext {
  currentAge: number;
  playerDebutAge: number;
  playerCareerLength: number;
  currentOvr: number;
  position: string;
  yearSimResult: SimulatedSeasonResult | null;
  hiddenStats: HiddenStats | null;
  currentClub: CurrentClub | null;
  leagueSize: number;
  lastYearStanding: number;
  standingResult?: number | null;
  currentContinentalCup: string;
  playerNationality: string;
  selectedStatsList: string[];
  selectorIndex: number;
  yearEvolutionDirection: "increase" | "decrease" | "maintain" | null;
  currentStats: Record<string, number>;
  ballonDorNominationWeight: number;
  ballonDorRankWeights: number[];
  /** docs/core-currency-shop-design.md §6.2 — must equal the preview's value (useCareerWheelItems.ts). */
  fitnessCoachActive?: boolean;
  nationalCallupBoostActive?: boolean;
  eliteDevelopmentActive?: boolean;
}

export function getCareerWheelPoolAndValue(subStep: string, ctx: CareerWheelContext) {
  let result: string | number | null = null;
  let idx = -1;
  let tempValue: string | null = null;

  const rating = ctx.yearSimResult?.matchRating ?? 7.0;
  const prestige = ctx.currentClub?.prestige ?? 3;
  // SoT §7.10 — wheel weights use effPositionOvr (position-specific ability, §12.1)
  const effPositionOvr = computeEffectivePositionOvr(ctx.position, ctx.currentStats, ctx.currentOvr);
  // SoT §3 — shared ctx for the 5 team wheels; useCareerWheelItems.ts (preview) builds the
  // exact same shape and calls the exact same buildXPool functions from wheel-team-params.ts.
  const teamCtx: TeamWheelCtx = {
    effPositionOvr,
    prestige,
    leagueSize: ctx.leagueSize,
    apps: ctx.yearSimResult?.apps ?? null,
    priorStanding: ctx.currentAge > ctx.playerDebutAge ? ctx.lastYearStanding : null,
    luckRating: ctx.hiddenStats?.luckRating ?? 10,
    playerNationality: ctx.playerNationality,
    standingResult: ctx.standingResult ?? null,
    position: ctx.position,
    nationalCallupBoostActive: ctx.nationalCallupBoostActive,
  };

  if (subStep === "dir_increase") {
    const { yes: yesW, no: noW } = getEffectiveIncreaseGate({
      rating,
      position: ctx.position,
      currentAge: ctx.currentAge,
      debutAge: ctx.playerDebutAge,
      careerLength: ctx.playerCareerLength,
      currentOvr: ctx.currentOvr,
      seasonApps: ctx.yearSimResult?.apps ?? null,
      seasonGoals: ctx.yearSimResult?.goals ?? null,
      seasonAssists: ctx.yearSimResult?.assists ?? null,
      seasonCleanSheets: ctx.yearSimResult?.cleanSheets ?? null,
      eliteDevelopmentActive: ctx.eliteDevelopmentActive,
    });
    const pool = [
      { value: "yes", weight: yesW },
      { value: "no", weight: noW },
    ];
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = result === "yes" ? "TĂNG CHỈ SỐ: YES" : "TĂNG CHỈ SỐ: NO";
  }
  else if (subStep === "dir_decrease") {
    const { yes: yesW, no: noW } = getEffectiveDecreaseGate({
      rating,
      position: ctx.position,
      currentAge: ctx.currentAge,
      debutAge: ctx.playerDebutAge,
      careerLength: ctx.playerCareerLength,
      seasonApps: ctx.yearSimResult?.apps ?? null,
    });
    const pool = [
      { value: "yes", weight: yesW },
      { value: "no", weight: noW },
    ];
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = result === "yes" ? "GIẢM CHỈ SỐ: YES" : "GIỮ NGUYÊN CHỈ SỐ";
  }
  else if (subStep === "count") {
    const isInc = ctx.yearEvolutionDirection === "increase";
    const pool = getEffectiveCountPool({
      rating,
      isIncrease: isInc,
      position: ctx.position,
      currentAge: ctx.currentAge,
      debutAge: ctx.playerDebutAge,
      careerLength: ctx.playerCareerLength,
      currentOvr: ctx.currentOvr,
      seasonApps: ctx.yearSimResult?.apps ?? null,
      fitnessCoachActive: ctx.fitnessCoachActive,
    });
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = `${result} Chỉ Số`;
  }
  else if (subStep === "selector") {
    const coreStats = ctx.position === "GK"
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
    const currentSelectedList = ctx.selectorIndex === 0 ? [] : ctx.selectedStatsList;
    const isIncrease = ctx.yearEvolutionDirection === "increase";
    const available = coreStats.filter(c =>
      !currentSelectedList.includes(c.key) &&
      !(isIncrease && (ctx.currentStats[c.key] ?? 0) >= 99) &&
      !(!isIncrease && (ctx.currentStats[c.key] ?? 0) <= 10)
    );
    const mainStats = getMainStatsByPosition(ctx.position);
    const isOld = isOldDualClock(ctx.currentAge, ctx.playerDebutAge, ctx.playerCareerLength, ctx.position);
    const pool = available.map(c => ({
      value: c.key,
      label: c.name.toUpperCase(),
      weight: getSelectorStatWeight(mainStats.includes(c.key), isIncrease, isOld, ctx.eliteDevelopmentActive),
    }));
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    const matchedName = coreStats.find(c => c.key === result)?.name ?? result;
    tempValue = matchedName.toUpperCase();
  }
  else if (subStep === "magnitude") {
    const isInc = ctx.yearEvolutionDirection === "increase";
    const pool = getEffectiveMagnitudePool({
      rating,
      isIncrease: isInc,
      position: ctx.position,
      currentAge: ctx.currentAge,
      debutAge: ctx.playerDebutAge,
      careerLength: ctx.playerCareerLength,
      currentOvr: ctx.currentOvr,
      seasonApps: ctx.yearSimResult?.apps ?? null,
      fitnessCoachActive: ctx.fitnessCoachActive,
      eliteDevelopmentActive: ctx.eliteDevelopmentActive,
    });
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = `${isInc ? "+" : "-"}${result} Điểm`;
  }
  else if (subStep === "standing") {
    const standingPool = buildStandingPool(teamCtx);
    result = resolveWeightedOutcome(standingPool);
    idx = standingPool.findIndex((x) => x.value === result);
    tempValue = result === 1 ? "VÔ ĐỊCH (HẠNG 1)" : result === 2 ? "Á QUÂN (HẠNG 2)" : `HẠNG #${result}`;
  }
  else if (subStep === "domestic_cup") {
    const pool = buildDomesticCupPool(teamCtx);
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue =
      result === "Winner" ? "VÔ ĐỊCH CUP!" :
      result === "Runner-Up" ? "Á QUÂN CUP" :
      result === "Semi-Finals" ? "BÁN KẾT" :
      result === "Quarter-Finals" ? "TỨ KẾT" :
      result === "Round of 16" ? "VÒNG 1/8" :
      result === "Round of 32" ? "VÒNG 1/16" : "BỊ LOẠI SỚM";
  }
  else if (subStep === "continental_cup") {
    const pool = buildContinentalCupPool(teamCtx);
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    const cupLabel = getContinentalCupLabel(ctx.currentContinentalCup);
    tempValue =
      result === "Winner" ? `VÔ ĐỊCH ${cupLabel}!` :
      result === "Runner-Up" ? `Á QUÂN ${cupLabel}` :
      result === "Semi-Finals" ? `BÁN KẾT ${cupLabel}` :
      result === "Quarter-Finals" ? `TỨ KẾT ${cupLabel}` :
      result === "Round of 16" ? `VÒNG 1/8 ${cupLabel}` : `VÒNG BẢNG ${cupLabel}`;
  }
  else if (subStep === "national_callup") {
    const pool = buildNationalCallupPool(teamCtx);
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = result === "called_up" ? `ĐƯỢC TRIỆU TẬP ĐTQG! ${getFlagEmoji(ctx.playerNationality)}` : "Không được gọi";
  }
  else if (subStep === "national_tournament") {
    const pool = buildNationalTournamentPool(teamCtx);
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    const tourney = getNationalTournamentName(
      ctx.playerNationality, ctx.currentAge, ctx.playerDebutAge, getNationalContinentalCup,
    );
    tempValue =
      result === "Winner" ? `VÔ ĐỊCH ${tourney}!` :
      result === "Runner-Up" ? `Á QUÂN ${tourney}` :
      result === "Semi-Finals" ? `BÁN KẾT ${tourney}` :
      result === "Quarter-Finals" ? `TỨ KẾT ${tourney}` :
      result === "Round of 16" ? `VÒNG 1/8 ${tourney}` : `VÒNG BẢNG ${tourney}`;
  }
  else if (subStep === "ballon_dor_nomination") {
    const w = ctx.ballonDorNominationWeight;
    const pool = [
      { value: "yes", weight: w },
      { value: "no", weight: 100 - w },
    ];
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = result === "yes" ? "ĐƯỢC ĐỀ CỬ TOP 10 QBV" : "Năm này chưa được xét";
  }
  else if (subStep === "ballon_dor_ranking") {
    const pool = ctx.ballonDorRankWeights.map((w, i) => ({ value: i + 1, weight: w }));
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = result === 1 ? "HẠNG #1 — BALLON D'OR!" : `HẠNG #${result} TRONG TOP 10`;
  }

  return { result, idx, tempValue };
}
