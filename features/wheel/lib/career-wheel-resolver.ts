// features/wheel/lib/career-wheel-resolver.ts

import { resolveWeightedOutcome } from "@/lib/wheel-engine/spin-resolver";
import { getNationalTier, getNationalContinentalCup } from "@/lib/wheel-engine/weight-calculator";
import { getFlagEmoji } from "@/types/squad";
import { getStandingWheelPool, getContinentalCupLabel } from "./simulation-helpers";

interface CareerWheelContext {
  currentAge: number;
  playerDebutAge: number;
  currentOvr: number;
  position: string;
  yearSimResult: any;
  hiddenStats: any;
  currentClub: any;
  leagueSize: number;
  currentContinentalCup: string;
  playerNationality: string;
  selectedStatsList: string[];
  selectorIndex: number;
  yearEvolutionDirection: "increase" | "decrease" | "maintain" | null;
}

export function getCareerWheelPoolAndValue(subStep: string, ctx: CareerWheelContext) {
  let result: any = null;
  let idx = -1;
  let tempValue: string | null = null;

  if (subStep === "dir_increase") {
    let yesW = 40;
    let noW = 60;
    const rating = ctx.yearSimResult?.matchRating ?? 7.0;

    if (rating >= 7.50) {
      yesW = 80; noW = 20;
    } else if (rating >= 7.00) {
      yesW = 60; noW = 40;
    } else if (rating >= 6.40) {
      yesW = 40; noW = 60;
    } else {
      yesW = 5; noW = 95;
    }

    if (ctx.currentAge <= 22) {
      yesW = Math.min(95, yesW + 10);
      noW = Math.max(5, noW - 10);
    } else if (ctx.currentAge >= 30) {
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
    let yesW = 30;
    let noW = 70;
    const rating = ctx.yearSimResult?.matchRating ?? 7.0;

    if (rating <= 6.30) {
      yesW = 70; noW = 30;
    } else if (rating < 6.80) {
      yesW = 30; noW = 70;
    } else {
      yesW = 5; noW = 95;
    }

    if (ctx.currentAge <= 22) {
      yesW = Math.max(5, yesW - 20);
      noW = Math.min(95, noW + 20);
    } else if (ctx.currentAge >= 30) {
      yesW = Math.min(95, yesW + 15);
      noW = Math.max(5, noW - 15);
    }

    const pool = [
      { value: "yes", weight: yesW },
      { value: "no", weight: noW },
    ];
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = result === "yes" ? "GIẢM CHỈ SỐ: YES" : "GIỮ NGUYÊN: YES";
  }
  else if (subStep === "count") {
    const pool = [
      { value: 1, weight: 45 },
      { value: 2, weight: 35 },
      { value: 3, weight: 15 },
      { value: 4, weight: 5 },
    ];
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
    const available = coreStats.filter(c => !currentSelectedList.includes(c.key));
    const pool = available.map(c => {
      let w = 10;
      if (ctx.position === "GK") {
        if (["ref", "div"].includes(c.key)) w = 25;
      } else if (["ST", "LW", "RW"].includes(ctx.position)) {
        if (["sho", "pac", "dri"].includes(c.key)) w = 25;
      } else if (["CB", "LB", "RB"].includes(ctx.position)) {
        if (["def", "phy"].includes(c.key)) w = 25;
      } else {
        if (["pas", "dri"].includes(c.key)) w = 25;
      }
      return {
        value: c.key,
        label: c.name.toUpperCase(),
        weight: w,
      };
    });
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    const matchedName = coreStats.find(c => c.key === result)?.name ?? result;
    tempValue = matchedName.toUpperCase();
  }
  else if (subStep === "magnitude") {
    const rating = ctx.yearSimResult?.matchRating ?? 7.0;
    const isInc = ctx.yearEvolutionDirection === "increase";
    
    let pool = [];
    if (isInc) {
      if (rating >= 7.60) {
        pool = [
          { value: 1, weight: 3 },
          { value: 2, weight: 7 },
          { value: 3, weight: 15 },
          { value: 4, weight: 25 },
          { value: 5, weight: 35 },
          { value: 6, weight: 15 },
        ];
      } else if (rating >= 6.80) {
        pool = [
          { value: 1, weight: 10 },
          { value: 2, weight: 25 },
          { value: 3, weight: 35 },
          { value: 4, weight: 20 },
          { value: 5, weight: 8 },
          { value: 6, weight: 2 },
        ];
      } else {
        pool = [
          { value: 1, weight: 50 },
          { value: 2, weight: 30 },
          { value: 3, weight: 12 },
          { value: 4, weight: 5 },
          { value: 5, weight: 2 },
          { value: 6, weight: 1 },
        ];
      }
    } else {
      if (rating <= 6.20) {
        pool = [
          { value: 1, weight: 3 },
          { value: 2, weight: 7 },
          { value: 3, weight: 15 },
          { value: 4, weight: 25 },
          { value: 5, weight: 35 },
          { value: 6, weight: 15 },
        ];
      } else if (rating < 6.80) {
        pool = [
          { value: 1, weight: 15 },
          { value: 2, weight: 30 },
          { value: 3, weight: 35 },
          { value: 4, weight: 15 },
          { value: 5, weight: 4 },
          { value: 6, weight: 1 },
        ];
      } else {
        pool = [
          { value: 1, weight: 60 },
          { value: 2, weight: 25 },
          { value: 3, weight: 10 },
          { value: 4, weight: 3 },
          { value: 5, weight: 1 },
          { value: 6, weight: 1 },
        ];
      }
    }
    
    result = resolveWeightedOutcome(pool);
    idx = pool.findIndex((x) => x.value === result);
    tempValue = `${isInc ? "+" : "-"}${result} Điểm`;
  }
  else if (subStep === "standing") {
    const standingPool = getStandingWheelPool(ctx.currentClub?.prestige ?? 3, ctx.currentOvr, ctx.leagueSize, ctx.yearSimResult?.apps ?? 38);
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

  return { result, idx, tempValue };
}
