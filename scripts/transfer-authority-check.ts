import assert from "node:assert/strict";
import {
  getTransferMarketSchema,
  resolveTransferNegotiationSchema,
  searchTransferClubsSchema,
} from "@/features/career/contracts/transfer-market.contract";
import {
  resolveApproachService,
} from "@/features/transfer/services/transfer.service";
import { applyWageDealChance, computeWageOptions } from "@/lib/salary-negotiation";
import { computeApproachAcceptChance } from "@/lib/transfer-economy";
import { estimateAppsRatio } from "@/lib/club-fit";

const context = {
  playerId: "00000000-0000-4000-8000-000000000001",
  seasonId: "00000000-0000-4000-8000-000000000002",
  expectedRevision: 4,
};

assert.equal(getTransferMarketSchema.safeParse(context).success, true);
assert.equal(getTransferMarketSchema.parse(context).willingToMove, true);
assert.equal(getTransferMarketSchema.safeParse({ ...context, willingToMove: false }).success, true);
assert.equal(
  getTransferMarketSchema.safeParse({ ...context, currentOvr: 99 }).success,
  false,
);
assert.equal(
  searchTransferClubsSchema.safeParse({ ...context, page: 1, pageSize: 8 }).success,
  true,
);
assert.equal(
  resolveTransferNegotiationSchema.safeParse({
    ...context,
    kind: "approach",
    clubId: "club-a",
    wageOption: "standard",
  }).success,
  true,
);
assert.equal(
  resolveTransferNegotiationSchema.safeParse({
    ...context,
    kind: "approach",
    clubId: "club-a",
    previewFee: 1,
  }).success,
  false,
);

const baseChance = computeApproachAcceptChance({
  ovr: 70,
  effPositionOvr: 70,
  age: 24,
  matchRating: 7.2,
  destPrestige: 3,
  destLeagueTier: 1,
  expectedAppsRatio: estimateAppsRatio(70, 3),
});
const chance = applyWageDealChance(baseChance, "standard");
const wageOptions = computeWageOptions({ baseWage: 1_000, minWage: 800, maxWage: 4_000 });
assert.ok(wageOptions.lower.wageAnnual < wageOptions.standard.wageAnnual);
assert.ok(wageOptions.higher.wageAnnual > wageOptions.standard.wageAnnual);
assert.ok(applyWageDealChance(baseChance, "lower") > chance);
assert.ok(applyWageDealChance(baseChance, "higher") < chance);
const approach = {
  clubId: "club-a",
  clubName: "Test Club",
  leagueId: "league-a",
  leagueName: "Test League",
  prestige: 3,
  leagueTier: 1,
  previewFee: 0,
  previewWage: 1_000,
  previewYears: 3,
  wageOption: "standard" as const,
  clientAcceptChance: chance,
  currentOvr: 70,
  effPositionOvr: 70,
  currentAge: 24,
  matchRating: 7.2,
  contractYearsRemaining: 0,
  isUnemployed: true,
  influenceScore: 0,
};

assert.equal(resolveApproachService({ ...approach, randomSource: () => 0 }).accepted, true);
assert.equal(resolveApproachService({ ...approach, randomSource: () => 0.999999 }).accepted, false);
const lowerApproach = resolveApproachService({
  ...approach,
  wageOption: "lower",
  clientAcceptChance: applyWageDealChance(baseChance, "lower"),
  randomSource: () => 0,
});
assert.equal(lowerApproach.accepted, true);
if (lowerApproach.accepted) assert.equal(lowerApproach.offer.wageAnnual, wageOptions.lower.wageAnnual);
const higherApproach = resolveApproachService({
  ...approach,
  wageOption: "higher",
  clientAcceptChance: applyWageDealChance(baseChance, "higher"),
  randomSource: () => 0,
});
assert.equal(higherApproach.accepted, true);
if (higherApproach.accepted) assert.equal(higherApproach.offer.wageAnnual, wageOptions.higher.wageAnnual);
console.log("transfer-authority-check: passed");
