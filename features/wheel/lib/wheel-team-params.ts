// features/wheel/lib/wheel-team-params.ts
//
// Shared pool-builders for the 5 "team" wheels (standing, domestic_cup, continental_cup,
// national_callup, national_tournament). Both career-wheel-resolver.ts (resolve) and
// useCareerWheelItems.ts (preview) MUST call these instead of building pools independently
// — SoT core-growth-loop-fixes-design.md §3: two parallel implementations drifted at least
// twice (cup luck, then national_callup missing `position`/effPositionOvr), so the fix is
// structural (one function, two callers) rather than another one-off param patch.

import { getNationalTier } from "@/lib/wheel-engine/weight-calculator";
import {
  getStandingWheelPool,
  getDomesticCupWeights,
  getContinentalCupWeights,
  getNationalTournamentWeights,
  getNationalCallupWeights,
  getInfluenceProxy,
} from "./simulation-helpers";

export interface TeamWheelCtx {
  effPositionOvr: number;
  prestige: number;
  leagueSize: number;
  apps: number | null;
  /** Only used by buildStandingPool — already resolved by caller (null if debut season). */
  priorStanding: number | null;
  luckRating: number;
  playerNationality: string;
  /** Feeds the influence proxy (domestic/continental/national_tournament) + national_callup. */
  standingResult: number | null;
  position: string;
}

function influenceFor(ctx: TeamWheelCtx): number {
  return getInfluenceProxy(ctx.effPositionOvr, ctx.prestige, ctx.leagueSize, ctx.apps, ctx.standingResult);
}

export function buildStandingPool(ctx: TeamWheelCtx) {
  return getStandingWheelPool(ctx.prestige, ctx.effPositionOvr, ctx.leagueSize, ctx.apps, ctx.priorStanding);
}

export function buildDomesticCupPool(ctx: TeamWheelCtx) {
  const { wWin, wRun, wSemi, wQF, wR16, wR32, wExit } =
    getDomesticCupWeights(ctx.prestige, ctx.luckRating, ctx.effPositionOvr, influenceFor(ctx));
  return [
    { value: "Winner", weight: wWin },
    { value: "Runner-Up", weight: wRun },
    { value: "Semi-Finals", weight: wSemi },
    { value: "Quarter-Finals", weight: wQF },
    { value: "Round of 16", weight: wR16 },
    { value: "Round of 32", weight: wR32 },
    { value: "Early Exit", weight: wExit },
  ];
}

export function buildContinentalCupPool(ctx: TeamWheelCtx) {
  const { wWin, wRun, wSemi, wQF, wR16, wGroup } =
    getContinentalCupWeights(ctx.prestige, ctx.luckRating, ctx.effPositionOvr, influenceFor(ctx));
  return [
    { value: "Winner", weight: wWin },
    { value: "Runner-Up", weight: wRun },
    { value: "Semi-Finals", weight: wSemi },
    { value: "Quarter-Finals", weight: wQF },
    { value: "Round of 16", weight: wR16 },
    { value: "Group Stage", weight: wGroup },
  ];
}

function nationalMidOvr(playerNationality: string): number {
  const tier = getNationalTier(playerNationality);
  return tier === 1 ? 80 : tier === 2 ? 75 : 70;
}

export function buildNationalTournamentPool(ctx: TeamWheelCtx) {
  const midOvr = nationalMidOvr(ctx.playerNationality);
  const { wWin, wRun, wSemi, wQF, wR16, wGroup } =
    getNationalTournamentWeights(ctx.effPositionOvr, ctx.luckRating, midOvr, influenceFor(ctx));
  return [
    { value: "Winner", weight: wWin },
    { value: "Runner-Up", weight: wRun },
    { value: "Semi-Finals", weight: wSemi },
    { value: "Quarter-Finals", weight: wQF },
    { value: "Round of 16", weight: wR16 },
    { value: "Group Stage", weight: wGroup },
  ];
}

export function buildNationalCallupPool(ctx: TeamWheelCtx) {
  const midOvr = nationalMidOvr(ctx.playerNationality);
  const { wCall, wMiss } =
    getNationalCallupWeights(ctx.effPositionOvr, midOvr, ctx.standingResult, ctx.leagueSize, ctx.position);
  return [
    { value: "called_up", weight: wCall },
    { value: "missed", weight: wMiss },
  ];
}
