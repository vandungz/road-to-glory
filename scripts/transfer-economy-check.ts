import assert from "node:assert/strict";
import { CLUBS } from "@/prisma/data/clubs";
import { LEAGUES } from "@/prisma/data/leagues";
import { quoteInboundTerms, recentTransferForm } from "@/features/transfer/services/transfer-inbound-terms";
import {
  computeMarketValue,
  computeClubTransferFee,
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

const marketParams: Parameters<typeof generateTransferMarketService>[0] = {
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
};
const market = generateTransferMarketService(marketParams);
const deterministicParams = { ...marketParams, randomSource: () => 0.4, wageRandomSource: () => 0.4 };
assert.deepEqual(generateTransferMarketService({ ...deterministicParams, willingToMove: false }), generateTransferMarketService({ ...deterministicParams, willingToMove: true }), "Legacy opt-out must not change the always-available transfer market");

assert.equal(market.valuation.positionWeightedRating, specialistValue.positionWeightedRating);
assert.ok(market.marketValue > 0, "The transfer checkpoint must produce a market value");
const feeQuotes = clubs
  .filter((club) => club.id !== "current")
  .map((club) => computeClubTransferFee({
    marketValue: market.marketValue,
    mandatoryBuyout: market.mandatoryBuyout,
    prestige: club.prestige,
    leagueTier: club.leagueTier,
    leaguePrestige: club.leaguePrestige,
    expectedAppsRatio: 0.55,
    clubIdentity: club.id,
  }));
assert.notEqual(feeQuotes[0], feeQuotes[1], "Different destination clubs must not share one hardcoded transfer fee");

const sameBandQuotes = ["club-alpha", "club-beta", "club-gamma"].map((clubIdentity) => computeClubTransferFee({
  marketValue: 3_000,
  mandatoryBuyout: 3_400,
  prestige: 2,
  leagueTier: 1,
  leaguePrestige: 5,
  expectedAppsRatio: 0.55,
  clubIdentity,
}));
assert.equal(new Set(sameBandQuotes).size, 3, "Same-band clubs must still receive distinct identity-based fee quotes");
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

const realClubs = CLUBS.map((club) => {
  const league = LEAGUES.find(({ id }) => id === club.leagueId)!;
  return {
    ...club, leagueTier: league.tier, leaguePrestige: league.prestige, leagueName: league.name,
    leagueCountry: league.country, confederation: league.confederation,
    leagueSize: CLUBS.filter(({ leagueId }) => leagueId === league.id).length,
  };
});
const feyenoord = realClubs.find(({ id }) => id === "feyenoord")!;
const youngPlayer = {
  ...marketParams, clubs: realClubs, currentAge: 21, currentOvr: 65, currentStats: undefined,
  currentClubPrestige: 2, currentClubId: "groningen", currentSeasonApps: 28,
  matchRating: 6.8, goals: 7, assists: 3,
};
const strongHistory = [
  { matchRating: 8.1, goals: 18, assists: 8, apps: 32 },
  { matchRating: 7.9, goals: 16, assists: 7, apps: 30 },
];
assert.equal(recentTransferForm(youngPlayer, [null, { matchRating: 10, apps: 0 }]).matchRating, 6.8);
assert.equal(recentTransferForm({ ...youngPlayer, apps: 0 }, [strongHistory[0]]).matchRating, 8.1);

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function sampleWindows(previousSeasons?: typeof strongHistory) {
  const randomSource = seededRandom(202526);
  const tiers = new Set<number>();
  const leagues = new Set<string>();
  let stepUpWindows = 0;
  let offerWindows = 0;
  let eliteWindows = 0;
  let feyenoordWindows = 0;
  let mixedWindows = 0;
  for (let i = 0; i < 500; i += 1) {
    const result = generateTransferMarketService({ ...youngPlayer, previousSeasons, randomSource });
    if (result.inbound.length > 0) offerWindows += 1;
    if (result.inbound.some(({ prestige }) => prestige >= 4)) stepUpWindows += 1;
    if (result.inbound.some(({ prestige }) => prestige === 5)) eliteWindows += 1;
    if (result.inbound.some(({ clubId }) => clubId === feyenoord.id)) feyenoordWindows += 1;
    if (new Set(result.inbound.map(({ prestige }) => prestige)).size > 1 &&
        new Set(result.inbound.map(({ leagueId }) => leagueId)).size > 1) mixedWindows += 1;
    assert.ok(result.inbound.length <= 3);
    assert.equal(new Set(result.inbound.map(({ clubId }) => clubId)).size, result.inbound.length);
    for (const offer of result.inbound) {
      const club = realClubs.find(({ id }) => id === offer.clubId)!;
      const band = getBuyingPowerBand(offer.prestige, offer.leagueTier);
      tiers.add(offer.prestige);
      leagues.add(offer.leagueId);
      assert.notEqual(offer.clubId, youngPlayer.currentClubId);
      assert.ok(offer.transferFee >= result.mandatoryBuyout && offer.transferFee <= band.maxFee);
      assert.ok(offer.wageAnnual >= band.minWage && offer.wageAnnual <= band.maxWage);
      assert.ok(offer.expectedLeagueApps >= 1 && offer.expectedLeagueApps <= (club.leagueSize - 1) * 2);
    }
  }
  return { offerWindows, stepUpWindows, eliteWindows, feyenoordWindows, mixedWindows, tiers: tiers.size, leagues: leagues.size };
}

const average = sampleWindows();
const proven = sampleWindows(strongHistory);
assert.ok(average.stepUpWindows > 0 && average.stepUpWindows < average.offerWindows / 2);
assert.ok(proven.stepUpWindows > average.stepUpWindows);
assert.ok(proven.eliteWindows < proven.stepUpWindows / 2);
assert.ok(proven.feyenoordWindows > 0);
assert.ok(proven.mixedWindows > proven.offerWindows / 2);
assert.ok(proven.tiers >= 4 && proven.leagues >= 10);

const feyenoordOnly = { ...youngPlayer, clubs: [feyenoord], previousSeasons: strongHistory };
const freeAgent = generateTransferMarketService({ ...feyenoordOnly, isUnemployed: true, randomSource: () => 0 });
assert.equal(freeAgent.inbound[0]?.kind, "free_agent");
assert.equal(freeAgent.inbound[0]?.transferFee, 0);

const quote = { club: feyenoord, effectiveOvr: 65, matchRating: 7.2, marketValue: 2_000, feeFloor: 2_000, feeRoll: 0.5, wageRoll: 0.5 };
const rotation = quoteInboundTerms(quote);
const regular = quoteInboundTerms({ ...quote, effectiveOvr: 80 });
const betterRoll = quoteInboundTerms({ ...quote, feeRoll: 0.99, wageRoll: 0.99 });
assert.ok(rotation.expectedLeagueApps < regular.expectedLeagueApps);
assert.ok(rotation.wageAnnual < regular.wageAnnual);
assert.ok(betterRoll.wageAnnual > rotation.wageAnnual && betterRoll.transferFee > rotation.transferFee);
const feyenoordFeeCap = getBuyingPowerBand(feyenoord.prestige, feyenoord.leagueTier).maxFee;
assert.equal(quoteInboundTerms({ ...quote, feeFloor: feyenoordFeeCap, feeRoll: 0.99 }).transferFee, feyenoordFeeCap);
console.log("transfer-economy-check: passed", { average, proven, feyenoordRotation: rotation, feyenoordRegular: regular });
