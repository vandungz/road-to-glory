import { randomInt } from "node:crypto";
import { getCareerWheelPoolAndValue } from "@/features/wheel/lib/career-wheel-resolver";
import { evolvePlayerStatsService } from "@/features/player/services/stats-evolution.service";
import { isShopItemActiveForSeason, type ShopInventoryEntry } from "@/lib/shop-catalog";
import type { CurrentClub, HiddenStats, StatSnapshot } from "@/types/domain";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import { AWARD_MODEL_VERSION, AWARD_RESOLUTION_VERSION } from "@/types/awards";
import { getWheelTypeForStep } from "@/features/career/contracts/wheel-step.contract";

// Backwards-compatible server import for contract smoke checks and callers that
// already depended on this module. The mapping itself remains client-safe.
export { getWheelTypeForStep } from "@/features/career/contracts/wheel-step.contract";
import type {
  CheckpointJson,
  WheelCheckpointResolverContext,
  WheelResolution,
} from "./checkpoint.service";

type RuntimeState = {
  yearSimResult?: SimulatedSeasonResult | null;
  standingResult?: number | null;
  domesticCupResult?: string | null;
  continentalCupResult?: string | null;
  nationalCallupResult?: string | null;
  nationalTournamentResult?: string | null;
  selectedStatsList?: string[];
  selectorIndex?: number;
  yearEvolutionDirection?: "increase" | "decrease" | "maintain" | null;
  ballonDorNominationWeight?: number;
  ballonDorRankWeights?: number[];
  ballonDorRank?: number | null;
  evolvedStatsThisYear?: Array<{ stat: string; delta: number }>;
  evolutionCount?: number | null;
  lastWheel?: { stepKey: string; result: CheckpointJson };
};

const COMPETITION_STEPS = new Set([
  "standing",
  "domestic_cup",
  "continental_cup",
  "national_callup",
  "national_tournament",
]);

function emptyUnemployedSeasonResult(): SimulatedSeasonResult {
  const zeroCompetition = { apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 6.0 };
  return {
    apps: 0,
    goals: 0,
    assists: 0,
    matchRating: 6.0,
    cleanSheets: 0,
    events: [{ type: "unemployed", label: "Mùa thất nghiệp — không CLB" }],
    leagueStats: zeroCompetition,
    domesticCupStats: zeroCompetition,
    ballonDor: { eligible: false, nominationWeight: 0, rankWeights: [] },
    awardSimulation: {
      modelVersion: AWARD_MODEL_VERSION,
      resolutionVersion: AWARD_RESOLUTION_VERSION,
      candidateUniverseSize: 0,
      snapshots: [],
      honours: [],
      ballonDor: { eligible: false, nominationWeight: 0, rankWeights: [], snapshotKey: "" },
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asRuntimeState(value: unknown): RuntimeState {
  const state = asRecord(value);
  return {
    yearSimResult: state.yearSimResult as SimulatedSeasonResult | null | undefined,
    standingResult: typeof state.standingResult === "number" ? state.standingResult : null,
    domesticCupResult: typeof state.domesticCupResult === "string" ? state.domesticCupResult : null,
    continentalCupResult: typeof state.continentalCupResult === "string" ? state.continentalCupResult : null,
    nationalCallupResult: typeof state.nationalCallupResult === "string" ? state.nationalCallupResult : null,
    nationalTournamentResult: typeof state.nationalTournamentResult === "string" ? state.nationalTournamentResult : null,
    selectedStatsList: Array.isArray(state.selectedStatsList)
      ? state.selectedStatsList.filter((item): item is string => typeof item === "string")
      : [],
    selectorIndex: asNumber(state.selectorIndex, 0),
    yearEvolutionDirection:
      state.yearEvolutionDirection === "increase" || state.yearEvolutionDirection === "decrease" || state.yearEvolutionDirection === "maintain"
        ? state.yearEvolutionDirection
        : null,
    ballonDorNominationWeight: asNumber(state.ballonDorNominationWeight, 0),
    ballonDorRankWeights: Array.isArray(state.ballonDorRankWeights)
      ? state.ballonDorRankWeights.filter((item): item is number => typeof item === "number")
      : [],
    ballonDorRank: typeof state.ballonDorRank === "number" ? state.ballonDorRank : null,
    evolvedStatsThisYear: Array.isArray(state.evolvedStatsThisYear)
      ? state.evolvedStatsThisYear.filter(
          (item): item is { stat: string; delta: number } =>
            !!item && typeof item === "object" && typeof item.stat === "string" && typeof item.delta === "number",
        )
      : [],
    evolutionCount: typeof state.evolutionCount === "number" ? state.evolutionCount : null,
  };
}

function getSeasonContinentalCup(context: WheelCheckpointResolverContext): string {
  const seasonRuntime = asRecord(context.season.runtimeState);
  return typeof seasonRuntime.continentalCupType === "string"
    ? seasonRuntime.continentalCupType
    : context.player.currentContinentalCup;
}

function seasonHasContinentalCup(context: WheelCheckpointResolverContext): boolean {
  return getSeasonContinentalCup(context) !== "none";
}

function getCurrentStats(value: unknown, position: string): Record<string, number> {
  const latest = asRecord(asArray(value).at(-1));
  const keys = position === "GK"
    ? ["div", "han", "kic", "ref", "spd", "pos"]
    : ["pac", "sho", "pas", "dri", "def", "phy"];
  return Object.fromEntries(keys.map((key) => [key, asNumber(latest[key], 60)]));
}

function getCurrentOvr(value: unknown): number {
  return asNumber(asRecord(asArray(value).at(-1)).ovr, 60);
}

function getLastStanding(value: unknown, age: number): number {
  const previous = asRecord(asRecord(value)[String(age - 1)]);
  return asNumber(previous.standing, 10);
}

function getHiddenStats(value: unknown): HiddenStats {
  const stats = asRecord(value);
  return {
    luckRating: Math.max(1, Math.min(20, Math.round(asNumber(stats.luckRating, 10)))),
    professionalism: Math.max(1, Math.min(20, Math.round(asNumber(stats.professionalism, 10)))),
    personality: typeof stats.personality === "string" ? stats.personality : "Balanced",
  };
}

function getShopInventory(value: unknown): ShopInventoryEntry[] {
  return asArray(value).filter((item): item is ShopInventoryEntry => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const entry = item as Record<string, unknown>;
    return typeof entry.itemId === "string" &&
      typeof entry.purchasedAtAge === "number" &&
      typeof entry.appliedSeason === "number" &&
      typeof entry.consumed === "boolean";
  });
}

function getNextStep(
  stepKey: string,
  result: string | number,
  context: WheelCheckpointResolverContext,
  runtime: RuntimeState,
): string {
  const retireAge = context.player.debutAge + context.player.careerLengthYears;
  const isFinalSeason = context.season.age >= retireAge;
  const nextAfterGrowth = isFinalSeason ? "resolved" : "transfer";
  if (stepKey === "standing") return "domestic_cup";
  if (stepKey === "domestic_cup") {
    if (seasonHasContinentalCup(context)) return "continental_cup";
    return context.season.age % 2 === 0 ? "national_callup" : "season_stats";
  }
  if (stepKey === "continental_cup") {
    return context.season.age % 2 === 0 ? "national_callup" : "season_stats";
  }
  if (stepKey === "national_callup") {
    return result === "called_up" ? "national_tournament" : "season_stats";
  }
  if (stepKey === "national_tournament") return "season_stats";
  if (stepKey === "ballon_dor_nomination") {
    return result === "yes" ? "ballon_dor_ranking" : "dir_increase";
  }
  if (stepKey === "ballon_dor_ranking") return "dir_increase";
  if (stepKey === "dir_increase") return result === "yes" ? "count" : "dir_decrease";
  if (stepKey === "dir_decrease") return result === "yes" ? "count" : nextAfterGrowth;
  if (stepKey === "count") return "selector";
  if (stepKey === "selector") return "magnitude";
  if (stepKey === "magnitude") {
    const nextIndex = (runtime.selectorIndex ?? 0) + 1;
    return nextIndex < (runtime.evolutionCount ?? 1) ? "selector" : nextAfterGrowth;
  }
  throw new Error(`Unsupported career wheel step: ${stepKey}`);
}

function updateRuntimeState(
  stepKey: string,
  result: string | number,
  runtime: RuntimeState,
): CheckpointJson {
  const next: RuntimeState = {
    ...runtime,
    lastWheel: { stepKey, result },
  };
  if (stepKey === "standing") next.standingResult = result as number;
  if (stepKey === "domestic_cup") next.domesticCupResult = result as string;
  if (stepKey === "continental_cup") next.continentalCupResult = result as string;
  if (stepKey === "national_callup") next.nationalCallupResult = result as string;
  if (stepKey === "national_tournament") next.nationalTournamentResult = result as string;
  if (stepKey === "ballon_dor_ranking") next.ballonDorRank = result as number;
  if (stepKey === "dir_increase" && result === "yes") next.yearEvolutionDirection = "increase";
  if (stepKey === "dir_decrease") {
    next.yearEvolutionDirection = result === "yes" ? "decrease" : "maintain";
  }
  if (stepKey === "count") {
    next.evolutionCount = result as number;
    next.selectorIndex = 0;
    next.selectedStatsList = [];
    next.evolvedStatsThisYear = [];
  }
  if (stepKey === "selector") {
    next.selectedStatsList = [...(runtime.selectedStatsList ?? []), result as string];
  }
  if (stepKey === "magnitude") {
    next.evolvedStatsThisYear = [
      ...(runtime.evolvedStatsThisYear ?? []),
      {
        stat: runtime.selectedStatsList?.at(-1) ?? "unknown",
        delta: runtime.yearEvolutionDirection === "decrease" ? -(result as number) : result as number,
      },
    ];
    next.selectorIndex = (runtime.selectorIndex ?? 0) + 1;
  }
  return next as unknown as CheckpointJson;
}

/** Server-only resolver adapter. It never accepts outcome or weights from input. */
export function resolveServerCareerWheel(
  context: WheelCheckpointResolverContext,
  stepKey: string,
): WheelResolution {
  const wheelType = getWheelTypeForStep(stepKey);
  if (!wheelType) throw new Error(`Unsupported career wheel step: ${stepKey}`);

  const runtime = asRuntimeState(context.season.runtimeState);
  const statsTimeline = asArray(context.player.statsTimeline) as StatSnapshot[];
  const currentStats = getCurrentStats(statsTimeline, context.player.position);
  const currentAge = context.season.age;
  const currentClub = context.currentClub as CurrentClub | null;
  const inventory = getShopInventory(context.player.shopInventory);
  const { result, tempValue } = getCareerWheelPoolAndValue(
    stepKey,
    {
      currentAge,
      playerDebutAge: context.player.debutAge,
      playerCareerLength: context.player.careerLengthYears,
      currentOvr: getCurrentOvr(statsTimeline),
      position: context.player.position,
      yearSimResult: runtime.yearSimResult ?? (context.player.isUnemployed ? emptyUnemployedSeasonResult() : null),
      hiddenStats: getHiddenStats(context.player.hiddenStats),
      currentClub,
      leagueSize: context.leagueSize,
      lastYearStanding: getLastStanding(context.player.seasonHistory, currentAge),
      standingResult: runtime.standingResult ?? null,
      // The active season owns the ticket. The player projection may already
      // represent next season after a transfer/season transition.
      currentContinentalCup: getSeasonContinentalCup(context),
      playerNationality: context.player.nationality,
      selectedStatsList: runtime.selectedStatsList ?? [],
      selectorIndex: runtime.selectorIndex ?? 0,
      yearEvolutionDirection: runtime.yearEvolutionDirection ?? null,
      currentStats,
      ballonDorNominationWeight: runtime.ballonDorNominationWeight ?? 0,
      ballonDorRankWeights: runtime.ballonDorRankWeights ?? [],
      fitnessCoachActive: isShopItemActiveForSeason(inventory, "fitness_coach", currentAge),
      nationalCallupBoostActive: isShopItemActiveForSeason(inventory, "national_callup_boost", currentAge),
      eliteDevelopmentActive: isShopItemActiveForSeason(inventory, "elite_development_program", currentAge),
    },
    () => randomInt(0, 1_000_000) / 1_000_000,
  );

  if (result === null || typeof result === "boolean" || !COMPETITION_STEPS.has(stepKey) && typeof result !== "string" && typeof result !== "number") {
    throw new Error("Server wheel resolver returned an invalid outcome");
  }
  const nextStep = getNextStep(stepKey, result, context, runtime);
  const nextRuntime = updateRuntimeState(stepKey, result, runtime);
  const growthUpdate = resolveGrowthStatsUpdate(stepKey, result, context, runtime, statsTimeline);
  return {
    outcome: result,
    publicResult: tempValue ?? String(result),
    nextStep,
    seasonRuntimeState: nextRuntime,
    ...growthUpdate,
  };
}

function resolveGrowthStatsUpdate(
  stepKey: string,
  result: string | number,
  context: WheelCheckpointResolverContext,
  runtime: RuntimeState,
  statsTimeline: StatSnapshot[],
): Pick<WheelResolution, "statsTimeline" | "peakOvr"> {
  if (stepKey !== "magnitude" || typeof result !== "number") return {};

  const stat = runtime.selectedStatsList?.at(-1);
  const direction = runtime.yearEvolutionDirection;
  if (!stat || (direction !== "increase" && direction !== "decrease")) return {};

  const currentStats = getCurrentStats(statsTimeline, context.player.position);
  const evolution = {
    stat,
    delta: direction === "increase" ? result : -result,
  };
  const evolved = evolvePlayerStatsService({
    currentStats,
    position: context.player.position,
    evolutions: [evolution],
  });
  const updatedTimeline = statsTimeline.map((snapshot, index) => {
    const isCurrent = snapshot.age === context.season.age ||
      (index === statsTimeline.length - 1 && !statsTimeline.some((entry) => entry.age === context.season.age));
    return isCurrent ? { ...snapshot, ...evolved.nextStats, ovr: evolved.nextOvr } : snapshot;
  });

  return {
    statsTimeline: updatedTimeline as unknown as CheckpointJson,
    peakOvr: Math.max(context.player.peakOvr, evolved.nextOvr),
  };
}
