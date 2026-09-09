import assert from "node:assert/strict";
import {
  resolveWheelCommandSchema,
} from "@/features/career/contracts/checkpoint.contract";
import {
  advanceCareerSeasonCommandSchema,
} from "@/features/career/contracts/season-transition.contract";
import {
  getWheelTypeForStep,
  resolveServerCareerWheel,
} from "@/features/career/services/server-wheel-resolver.service";
import { resolveCompetitionNextStep } from "@/features/wheel/lib/competition-transition";
import { resolveWeightedOutcome } from "@/lib/wheel-engine/spin-resolver";

const validCommand = {
  playerId: "00000000-0000-4000-8000-000000000001",
  seasonId: "00000000-0000-4000-8000-000000000002",
  stepKey: "standing",
  wheelType: "competition",
  expectedRevision: 1,
  idempotencyKey: "00000000-0000-4000-8000-000000000003",
};

assert.equal(resolveWheelCommandSchema.safeParse(validCommand).success, true);
assert.equal(
  resolveWheelCommandSchema.safeParse({ ...validCommand, outcome: "tampered" }).success,
  false,
);
assert.equal(resolveWheelCommandSchema.safeParse({ ...validCommand, expectedRevision: -1 }).success, false);

const validSeasonTransition = {
  playerId: validCommand.playerId,
  seasonId: validCommand.seasonId,
  expectedRevision: 4,
  idempotencyKey: validCommand.idempotencyKey,
  shopDecision: "completed",
};
assert.equal(advanceCareerSeasonCommandSchema.safeParse(validSeasonTransition).success, true);
assert.equal(
  advanceCareerSeasonCommandSchema.safeParse({ ...validSeasonTransition, outcome: "tampered" }).success,
  false,
);
assert.equal(
  advanceCareerSeasonCommandSchema.safeParse({ ...validSeasonTransition, shopDecision: "implicit" }).success,
  false,
);

assert.equal(
  resolveWeightedOutcome(
    [{ value: "first", weight: 50 }, { value: "second", weight: 50 }],
    () => 0,
  ),
  "first",
);
assert.equal(
  resolveWeightedOutcome(
    [{ value: "first", weight: 50 }, { value: "second", weight: 50 }],
    () => 0.999999,
  ),
  "second",
);
assert.equal(getWheelTypeForStep("standing"), "competition");
assert.equal(getWheelTypeForStep("unsupported"), null);

const resolverContext = {
    player: {
      id: "00000000-0000-4000-8000-000000000010",
      gameSessionId: "00000000-0000-4000-8000-000000000011",
      revision: 1,
      peakOvr: 70,
      currentAge: 21,
      currentStep: "standing",
      currentWheel: "career",
      checkpointVersion: 2,
      debutAge: 21,
      careerLengthYears: 15,
      position: "CM",
      nationality: "England",
      currentContinentalCup: "none",
      statsTimeline: [{ age: 21, ovr: 70, pac: 70, sho: 70, pas: 70, dri: 70, def: 60, phy: 70 }],
      clubStints: [],
      seasonHistory: {},
      hiddenStats: { luckRating: 10, professionalism: 10, personality: "Balanced" },
      shopInventory: [],
      isUnemployed: false,
      gameSession: { userId: "00000000-0000-4000-8000-000000000012" },
    },
    season: {
      id: "00000000-0000-4000-8000-000000000002",
      careerPlayerId: "00000000-0000-4000-8000-000000000010",
      seasonNumber: 1,
      age: 21,
      status: "in_progress",
      runtimeState: {},
    },
    choice: undefined,
    currentClub: {
      id: "club-1",
      name: "Test Club",
      leagueId: "league-1",
      leagueName: "Test League",
      leagueTier: 1,
      prestige: 3,
      continentalType: "none",
    },
    leagueSize: 18,
};

const resolution = resolveServerCareerWheel(resolverContext, "standing");

assert.equal(typeof resolution.outcome, "number");
assert.equal(resolution.nextStep, "domestic_cup");

const continentalSeasonResolution = resolveServerCareerWheel(
  {
    ...resolverContext,
    player: { ...resolverContext.player, currentStep: "domestic_cup", currentContinentalCup: "none" },
    season: { ...resolverContext.season, runtimeState: { continentalCupType: "UCL" } },
  },
  "domestic_cup",
);
assert.equal(
  continentalSeasonResolution.nextStep,
  "continental_cup",
  "domestic cup must advance to the season's assigned continental cup, not a stale player projection",
);

const continentalWheelResolution = resolveServerCareerWheel(
  {
    ...resolverContext,
    player: { ...resolverContext.player, currentStep: "continental_cup", currentContinentalCup: "none" },
    season: { ...resolverContext.season, runtimeState: { continentalCupType: "UCL" } },
  },
  "continental_cup",
);
assert.match(
  String(continentalWheelResolution.publicResult),
  /UEFA Champions League/,
  "continental wheel output must use the active season ticket, not the player projection",
);

const noContinentalSeasonResolution = resolveServerCareerWheel(
  {
    ...resolverContext,
    player: { ...resolverContext.player, currentStep: "domestic_cup", currentContinentalCup: "UCL" },
    season: { ...resolverContext.season, age: 21, runtimeState: { continentalCupType: "none" } },
  },
  "domestic_cup",
);
assert.equal(
  noContinentalSeasonResolution.nextStep,
  "season_stats",
  "a season without a continental ticket must not open a stale continental wheel",
);

assert.equal(
  resolveCompetitionNextStep({
    completedStep: "domestic_cup",
    authoritativeNextStep: "season_stats",
    legacyNextStep: "continental_cup",
    serverAuthoritative: true,
  }),
  "season_stats",
  "V2 must not fall back to a stale local continental ticket",
);
assert.equal(
  resolveCompetitionNextStep({
    completedStep: "domestic_cup",
    authoritativeNextStep: "transfer",
    legacyNextStep: "continental_cup",
    serverAuthoritative: true,
  }),
  null,
  "an invalid V2 competition transition must fail closed",
);
assert.equal(
  resolveCompetitionNextStep({
    completedStep: "continental_cup",
    authoritativeNextStep: "continental_cup",
    legacyNextStep: "season_stats",
    serverAuthoritative: true,
  }),
  null,
  "continental completion cannot loop back into a continental wheel",
);

const finalResolution = resolveServerCareerWheel(
  {
    ...resolverContext,
    player: { ...resolverContext.player, currentAge: 36, currentStep: "magnitude" },
    season: {
      ...resolverContext.season,
      age: 36,
      runtimeState: {
        yearEvolutionDirection: "increase",
        evolutionCount: 1,
        selectorIndex: 0,
        selectedStatsList: ["pas"],
      },
    },
  },
  "magnitude",
);
assert.equal(
  finalResolution.nextStep,
  "resolved",
  "The final season must close growth directly without opening transfer",
);
console.log("checkpoint contract/resolver checks passed");
