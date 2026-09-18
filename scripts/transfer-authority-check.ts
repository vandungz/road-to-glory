import assert from "node:assert/strict";
import {
  getTransferMarketSchema,
  resolveTransferNegotiationSchema,
  searchTransferClubsSchema,
} from "@/features/career/contracts/transfer-market.contract";
import { resolveApproachService } from "@/features/transfer/services/transfer.service";
import { findPendingTransferNegotiation } from "@/features/career/services/transfer-market-authority.shared";
import { computeWageAgreementChance, computeWageOptions } from "@/lib/salary-negotiation";
import { applyTransferFeeDealChance, computeApproachAcceptChance, type TransferFeeDealOption } from "@/lib/transfer-economy";
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
    feeOption: "standard",
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

const persistedOffer = {
  kind: "transfer" as const,
  clubId: "sunderland",
  clubName: "Sunderland",
  leagueId: "league-a",
  leagueName: "Test League",
  prestige: 3,
  leagueTier: 1,
  transferFee: 3_660,
  wageAnnual: 883,
  contractYears: 3,
  expectedLeagueApps: 31,
  reason: "Tìm môi trường đá chính",
  canAffordBuyout: true,
};
const rehydrated = findPendingTransferNegotiation(
  [{ input: { kind: "approach", clubId: "sunderland" }, result: { accepted: true, acceptChance: 0.72, offer: persistedOffer } }],
  { transferNegotiation: { sunderland: { failedWageOptions: ["higher"] } } },
);
assert.deepEqual(rehydrated, { offer: persistedOffer, failedWageOptions: ["higher"] });
assert.deepEqual(
  findPendingTransferNegotiation(
    [],
    { transferPendingOffer: { offer: persistedOffer }, transferNegotiation: { sunderland: { failedWageOptions: ["higher"] } } },
  ),
  { offer: persistedOffer, failedWageOptions: ["higher"] },
);
assert.equal(
  findPendingTransferNegotiation(
    [{ input: { kind: "approach", clubId: "sunderland" }, result: { accepted: true, acceptChance: 0.72, offer: persistedOffer } }],
    { transferNegotiation: { sunderland: { failedWageOptions: ["higher"], cancelled: true } } },
  ),
  null,
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
const chance = applyTransferFeeDealChance(baseChance, "standard");
const wageOptions = computeWageOptions({ baseWage: 1_000, minWage: 800, maxWage: 4_000 });
assert.ok(wageOptions.lower.wageAnnual < wageOptions.standard.wageAnnual);
assert.ok(wageOptions.higher.wageAnnual > wageOptions.standard.wageAnnual);
assert.ok(applyTransferFeeDealChance(baseChance, "discount") > chance);
assert.ok(applyTransferFeeDealChance(baseChance, "premium") < chance);
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
  feeOption: "standard" as TransferFeeDealOption,
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
  feeOption: "discount",
  clientAcceptChance: applyTransferFeeDealChance(baseChance, "discount"),
  randomSource: () => 0,
});
assert.equal(lowerApproach.accepted, true);
if (lowerApproach.accepted) assert.equal(lowerApproach.offer.wageAnnual, approach.previewWage);
const higherApproach = resolveApproachService({
  ...approach,
  feeOption: "premium",
  clientAcceptChance: applyTransferFeeDealChance(baseChance, "premium"),
  randomSource: () => 0,
});
assert.equal(higherApproach.accepted, true);
if (higherApproach.accepted) assert.equal(higherApproach.offer.wageAnnual, approach.previewWage);
assert.ok(computeWageAgreementChance({
  option: "standard",
  baseWage: 1_000,
  clubPrestige: 3,
  leagueTier: 1,
  expectedLeagueApps: 20,
}) < 1, "Final wage negotiation must not be guaranteed");
console.log("transfer-authority-check: passed");
