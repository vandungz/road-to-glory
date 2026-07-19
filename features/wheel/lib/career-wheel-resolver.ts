// features/wheel/lib/career-wheel-resolver.ts

import { resolveWeightedOutcome } from "@/lib/wheel-engine/spin-resolver";
import { getNationalTier, getNationalContinentalCup, getMainStatsByPosition } from "@/lib/wheel-engine/weight-calculator";
import { getFlagEmoji } from "@/types/squad";
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
} from "./simulation-helpers";

interface CareerWheelContext {
  currentAge: number;
  playerDebutAge: number;
  playerCareerLength: number;
  currentOvr: number;
  position: string;
  yearSimResult: any;
  hiddenStats: any;
  currentClub: any;
  leagueSize: number;
  lastYearStanding: number;
  currentContinentalCup: string;
  playerNationality: string;
  selectedStatsList: string[];
  selectorIndex: number;
  yearEvolutionDirection: "increase" | "decrease" | "maintain" | null;
  currentStats: Record<string, number>;
  ballonDorNominationWeight: number;
  ballonDorRankWeights: number[];
}

export function getCareerWheelPoolAndValue(subStep: string, ctx: CareerWheelContext) {
  let result: any = null;
  let idx = -1;
  let tempValue: string | null = null;

  if (subStep === "dir_increase") {
    const rating = ctx.yearSimResult?.matchRating ?? 7.0;
    const tier = getGrowthTier(rating);
    let { yes: yesW, no: noW } = getIncreaseGateWeight(tier);
    const { young, old } = getAgeProgressThresholds(ctx.position);
    const progress = getCareerProgress(ctx.currentAge, ctx.playerDebutAge, ctx.playerCareerLength);

    if (progress < young) {
      yesW = Math.min(95, yesW + 10);
      noW = Math.max(5, noW - 10);
    } else if (progress >= old) {
      yesW = Math.max(5, yesW - 10);
      noW = Math.min(95, noW + 10);
    }

    const pool = [
      { value: "yes", weight: yesW },
      { value: "no", weight: noW },
    ];
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = result === "yes" ? "TĂNG CHỈ SỐ: YES" : "TĂNG CHỈ SỐ: NO";
  }
  else if (subStep === "dir_decrease") {
    const rating = ctx.yearSimResult?.matchRating ?? 7.0;
    const tier = getGrowthTier(rating);
    let { yes: yesW, no: noW } = getDecreaseGateWeight(tier);
    const { young, old } = getAgeProgressThresholds(ctx.position);
    const progress = getCareerProgress(ctx.currentAge, ctx.playerDebutAge, ctx.playerCareerLength);

    if (progress < young) {
      yesW = Math.max(5, yesW - 20);
      noW = Math.min(95, noW + 20);
    } else if (progress >= old) {
      yesW = Math.min(95, yesW + 15);
      noW = Math.max(5, noW - 15);
    }

    const pool = [
      { value: "yes", weight: yesW },
      { value: "no", weight: noW },
    ];
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = result === "yes" ? "GIẢM CHỈ SỐ: YES" : "GIỮ NGUYÊN CHỈ SỐ";
  }
  else if (subStep === "count") {
    const rating = ctx.yearSimResult?.matchRating ?? 7.0;
    const tier = getGrowthTier(rating);
    const isInc = ctx.yearEvolutionDirection === "increase";
    let pool = getCountPool(tier, isInc);
    if (isInc) {
      const { young } = getAgeProgressThresholds(ctx.position);
      const progress = getCareerProgress(ctx.currentAge, ctx.playerDebutAge, ctx.playerCareerLength);
      pool = getCountPoolBoosted(tier, getGrowthBoost(progress, young));
    }
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
      !(isIncrease && (ctx.currentStats[c.key] ?? 0) >= 99)
    );
    const mainStats = getMainStatsByPosition(ctx.position);
    const pool = available.map(c => ({
      value: c.key,
      label: c.name.toUpperCase(),
      weight: mainStats.includes(c.key) ? 25 : 10,
    }));
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    const matchedName = coreStats.find(c => c.key === result)?.name ?? result;
    tempValue = matchedName.toUpperCase();
  }
  else if (subStep === "magnitude") {
    const rating = ctx.yearSimResult?.matchRating ?? 7.0;
    const isInc = ctx.yearEvolutionDirection === "increase";
    const tier = getMagnitudeTierForDirection(rating, isInc);
    let pool = getMagnitudePool(tier);
    if (isInc) {
      const { young } = getAgeProgressThresholds(ctx.position);
      const progress = getCareerProgress(ctx.currentAge, ctx.playerDebutAge, ctx.playerCareerLength);
      pool = getMagnitudePoolBoosted(tier, getGrowthBoost(progress, young));
    }

    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = `${isInc ? "+" : "-"}${result} Điểm`;
  }
  else if (subStep === "standing") {
    // Chỉ áp dụng quán tính mùa trước nếu đây KHÔNG phải mùa debut (mùa đầu tiên
    // chưa có thành tích thật, lastYearStanding lúc đó chỉ là placeholder mặc định).
    const priorStanding = ctx.currentAge > ctx.playerDebutAge ? ctx.lastYearStanding : null;
    const standingPool = getStandingWheelPool(ctx.currentClub?.prestige ?? 3, ctx.currentOvr, ctx.leagueSize, ctx.yearSimResult?.apps ?? 38, priorStanding);
    result = resolveWeightedOutcome(standingPool);
    idx = standingPool.findIndex((x) => x.value === result);
    tempValue = result === 1 ? "🏆 VÔ ĐỊCH! (HẠNG 1)" : result === 2 ? "🥈 Á QUÂN (HẠNG 2)" : `HẠNG #${result}`;
  }
  else if (subStep === "domestic_cup") {
    const prestige = ctx.currentClub?.prestige ?? 3;
    const luck = ctx.hiddenStats?.luckRating ?? 10;

    const wWin = 5 + prestige * 3 + Math.floor(luck / 4);
    const wRun = 8 + prestige * 3;
    const wSemi = 15 + prestige * 2;
    const wExit = Math.max(10, 72 - prestige * 8);

    const pool = [
      { value: "Winner", weight: wWin },
      { value: "Runner-Up", weight: wRun },
      { value: "Semi-Finals", weight: wSemi },
      { value: "Early Exit", weight: wExit },
    ];
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = result === "Winner" ? "Vô Địch Cup 🏆" : result === "Runner-Up" ? "Á Quân Cup" : result === "Semi-Finals" ? "Bán Kết" : "Bị Loại Sớm";
  }
  else if (subStep === "continental_cup") {
    const prestige = ctx.currentClub?.prestige ?? 3;
    const luck = ctx.hiddenStats?.luckRating ?? 10;

    const wWin = 3 + prestige * 3 + Math.floor(luck / 4);
    const wRun = 7 + prestige * 2;
    const wSemi = 15 + prestige * 2;
    const wGroup = Math.max(10, 75 - prestige * 7);

    const pool = [
      { value: "Winner", weight: wWin },
      { value: "Runner-Up", weight: wRun },
      { value: "Semi-Finals", weight: wSemi },
      { value: "Group Stage", weight: wGroup },
    ];
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    
    const cupLabel = getContinentalCupLabel(ctx.currentContinentalCup);
    tempValue = result === "Winner" ? `Vô Địch ${cupLabel} 🏆` : result === "Runner-Up" ? `Á Quân ${cupLabel}` : result === "Semi-Finals" ? `Bán Kết ${cupLabel}` : `Vòng Bảng ${cupLabel}`;
  }
  else if (subStep === "national_callup") {
    const tier = getNationalTier(ctx.playerNationality);
    // midOvr = điểm "trung bình" của tier, không phải hard gate
    // OVR cao hơn midOvr → xác suất được gọi tăng dần, thấp hơn → giảm dần
    const midOvr = tier === 1 ? 80 : tier === 2 ? 75 : 70;
    const ovrDiff = ctx.currentOvr - midOvr; // âm = dưới mức trung bình, dương = trên

    // Mỗi điểm OVR trên/dưới mid → +/-2 weight, clamp [5, 90]
    let wCall = Math.max(5, Math.min(90, 50 + ovrDiff * 2));

    if (ctx.yearSimResult) {
      if (ctx.yearSimResult.matchRating >= 7.40) wCall = Math.min(90, wCall + 20);
      else if (ctx.yearSimResult.matchRating <= 6.50) wCall = Math.max(5, wCall - 20);
    }
    const wMiss = Math.max(5, 100 - wCall);

    const pool = [
      { value: "called_up", weight: wCall },
      { value: "missed", weight: wMiss },
    ];
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = result === "called_up" ? `ĐƯỢC TRIỆU TẬP ĐTQG! ${getFlagEmoji(ctx.playerNationality)}` : "Không được gọi";
  }
  else if (subStep === "national_tournament") {
    const luck = ctx.hiddenStats?.luckRating ?? 10;
    const ovr = ctx.currentOvr;

    const wWin = 3 + Math.floor(luck / 4) + Math.floor((ovr - 70) * 0.2);
    const wRun = 7 + Math.floor((ovr - 70) * 0.2);
    const wSemi = 20;
    const wGroup = Math.max(10, 70 - Math.floor((ovr - 70) * 0.4));

    const pool = [
      { value: "Winner", weight: Math.max(1, wWin) },
      { value: "Runner-Up", weight: Math.max(1, wRun) },
      { value: "Semi-Finals", weight: wSemi },
      { value: "Group Stage", weight: wGroup },
    ];
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    
    const nationCup = getNationalContinentalCup(ctx.playerNationality);
    const currentYear = 2026 + (ctx.currentAge - ctx.playerDebutAge);
    const tourney = currentYear % 4 === 2 ? "FIFA World Cup" : nationCup;
    tempValue = result === "Winner" ? `VÔ ĐỊCH ${tourney}! 🏆` : result === "Runner-Up" ? `Á Quân ${tourney}` : result === "Semi-Finals" ? `Bán Kết ${tourney}` : `Vòng Bảng ${tourney}`;
  }

  else if (subStep === "ballon_dor_nomination") {
    const w = ctx.ballonDorNominationWeight;
    const pool = [
      { value: "yes", weight: w },
      { value: "no", weight: 100 - w },
    ];
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = result === "yes" ? "ĐƯỢC ĐỀ CỬ TOP 10 QBV! 🏅" : "Năm này chưa được xét";
  }
  else if (subStep === "ballon_dor_ranking") {
    const pool = ctx.ballonDorRankWeights.map((w, i) => ({ value: i + 1, weight: w }));
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = result === 1 ? "🏆 HẠNG #1 — BALLON D'OR!" : `HẠNG #${result} TRONG TOP 10`;
  }

  return { result, idx, tempValue };
}
