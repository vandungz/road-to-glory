import assert from "node:assert/strict";
import {
  computeMarketValue,
  computePositionValueSnapshot,
  getBuyingPowerBand,
  getPositionAttributeWeights,
  leagueCompetitivenessScore,
  randomizeWageAnnual,
} from "@/lib/transfer-economy";
import { generateTransferMarketService } from "@/features/transfer/services/transfer.service";

const specialistStats = { sho: 95, pac: 85, pas: 60, dri: 80, def: 45, phy: 80 };
const balancedStats = { sho: 70, pac: 70, pas: 70, dri: 70, def: 70, phy: 70 };

for (const position of ["GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"]) {
  const total = Object.values(getPositionAttributeWeights(position)).reduce((sum, weight) => sum + weight, 0);
  assert.equal(total, 1, `${position} weights must cover all six attributes`);
}

const specialistValue = computePositionValueSnapshot("ST", specialistStats, 70);
const balancedValue = computePositionValueSnapshot("ST", balancedStats, 70);
assert.ok(
  specialistValue.effectivePositionOvr > balancedValue.effectivePositionOvr,
  "Position-specialist attributes must improve the shared player value",
);
assert.ok(
  computeMarketValue({
    ovr: 70,
    age: 24,
    matchRating: 7.2,
    contractYearsRemaining: 2,
    position: "ST",
    currentStats: specialistStats,
  }) > computeMarketValue({
    ovr: 70,
    age: 24,
    matchRating: 7.2,
    contractYearsRemaining: 2,
    position: "ST",
    currentStats: balancedStats,
  }),
  "Market value must follow positional value, not raw OVR alone",
);

assert.ok(
  leagueCompetitivenessScore(5, 1) > leagueCompetitivenessScore(2, 2),
  "A competitive league must score above a weak league independently of club prestige",
);

const sameBandLowQuote = randomizeWageAnnual({
  proposedWage: 350,
  prestige: 2,
  leagueTier: 2,
  randomSource: () => 0,
});
const sameBandHighQuote = randomizeWageAnnual({
  proposedWage: 350,
  prestige: 2,
  leagueTier: 2,
  randomSource: () => 0.999999,
});
const lowerPlusBand = getBuyingPowerBand(2, 2);
assert.notEqual(sameBandLowQuote, sameBandHighQuote, "Same-band clubs must support different annual wage quotes");
assert.ok(sameBandLowQuote >= lowerPlusBand.minWage && sameBandLowQuote <= lowerPlusBand.maxWage);
assert.ok(sameBandHighQuote >= lowerPlusBand.minWage && sameBandHighQuote <= lowerPlusBand.maxWage);

const clubs = [
  {
    id: "current",
    name: "Current Club",
    leagueId: "current-league",
    prestige: 3,
    leagueTier: 1,
    leaguePrestige: 3,
    leagueSize: 20,
  },
  {
    id: "competitive-low-prestige",
    name: "Competitive League Club",
    leagueId: "strong-league",
    prestige: 2,
    leagueTier: 1,
    leaguePrestige: 5,
    confederation: "UEFA",
    leagueSize: 20,
  },
  {
    id: "weak-league-club",
    name: "Weak League Club",
    leagueId: "weak-league",
    prestige: 3,
    leagueTier: 2,
    leaguePrestige: 2,
    confederation: "AFC",
    leagueSize: 20,
  },
];

const market = generateTransferMarketService({
  currentClubId: "current",
  currentClubPrestige: 3,
  currentClubLeagueTier: 1,
  currentOvr: 70,
  currentStats: specialistStats,
  currentAge: 24,
  retireAge: 34,
  matchRating: 7.2,
  goals: 12,
  assists: 4,
  cleanSheets: 0,
  position: "ST",
  contractYearsRemaining: 1,
  contractYearsTotal: 3,
  currentWageAnnual: 800,
  willingToMove: true,
  clubs,
});

assert.equal(market.valuation.positionWeightedRating, specialistValue.positionWeightedRating);
assert.ok(market.marketValue > 0, "The transfer checkpoint must produce a market value");
assert.equal(
  market.shortlist[0]?.clubId,
  "competitive-low-prestige",
  "League competitiveness must influence shortlist ranking without club hardcoding",
);

const coveredFinalSeasonMarket = generateTransferMarketService({
  currentClubId: "current",
  currentClubPrestige: 3,
  currentClubLeagueTier: 1,
  currentOvr: 70,
  currentStats: specialistStats,
  currentAge: 32,
  retireAge: 33,
  matchRating: 7.2,
  goals: 12,
  assists: 4,
  cleanSheets: 0,
  position: "ST",
  contractYearsRemaining: 1,
  contractYearsTotal: 3,
  currentWageAnnual: 800,
  willingToMove: true,
  clubs,
});

assert.equal(
  coveredFinalSeasonMarket.renewal,
  null,
  "A current contract covering the final career season must not produce a renewal offer",
);

console.log("transfer-economy-check: passed");
