import assert from "node:assert/strict";
import { getStandingWheelPool } from "@/features/wheel/lib/simulation-helpers";
import { getPriorClubStanding } from "@/features/wheel/lib/previous-season-standing";
import { getNationalTournamentWeights } from "@/features/wheel/lib/competition-simulation-weights";
import { buildNationalTournamentPool, type TeamWheelCtx } from "@/features/wheel/lib/wheel-team-params";
import { getCareerWheelPoolAndValue } from "@/features/wheel/lib/career-wheel-resolver";
import { computeEffectivePositionOvr } from "@/lib/transfer-economy";
import { resolveWeightedOutcome } from "@/lib/wheel-engine/spin-resolver";

function total(pool: Array<{ value: number; weight: number }>): number {
  return pool.reduce((sum, item) => sum + item.weight, 0);
}

function probability(pool: Array<{ value: number; weight: number }>, values: number[]): number {
  const selected = new Set(values);
  return pool
    .filter((item) => selected.has(item.value))
    .reduce((sum, item) => sum + item.weight, 0) / total(pool);
}

const lowerPrestige = getStandingWheelPool(4, 76, 20, null, null);
const highestPrestige = getStandingWheelPool(5, 83, 20, null, null);
assert(
  probability(highestPrestige, [1, 2, 3, 4]) > probability(lowerPrestige, [1, 2, 3, 4]),
  "higher club prestige must increase the league top-four probability",
);
assert(
  probability(highestPrestige, [15, 16, 17, 18, 19, 20]) < probability(lowerPrestige, [15, 16, 17, 18, 19, 20]),
  "higher club prestige must reduce the league bottom-six probability",
);

const sameClubPreviousSeason = getPriorClubStanding(
  { "20": { clubId: "club-a", leagueId: "league-a", standing: 3 } },
  21,
  18,
  "club-a",
  "league-a",
);
assert.equal(sameClubPreviousSeason, 3);

assert.equal(
  getPriorClubStanding(
    { "20": { clubId: "club-b", leagueId: "league-a", standing: 3 } },
    21,
    18,
    "club-a",
    "league-a",
  ),
  null,
  "a transfer to another club must not inherit the previous standing",
);
assert.equal(
  getPriorClubStanding(
    { "20": { clubId: "club-a", leagueId: "league-b", standing: 3 } },
    21,
    18,
    "club-a",
    "league-a",
  ),
  null,
  "a transfer to another league must not inherit the previous standing",
);
assert.equal(
  getPriorClubStanding(
    { "20": { clubId: "club-a", leagueId: "league-a", standing: 3 } },
    24,
    18,
    "club-a",
    "league-a",
  ),
  null,
  "only the immediately preceding season may influence the next season",
);
assert.equal(
  getPriorClubStanding(
    { "20": { leagueId: "league-a", standing: 3 } },
    21,
    18,
    "club-a",
    "league-a",
  ),
  null,
  "legacy records without club identity must fail closed",
);

const previousTop = getStandingWheelPool(5, 83, 20, null, 1);
const previousBottom = getStandingWheelPool(5, 83, 20, null, 20);
assert(previousTop[0].weight > previousBottom[0].weight, "a prior title must pull the next season toward the top");
assert(previousTop[19].weight < previousBottom[19].weight, "a prior bottom finish must pull the next season toward the bottom");

const weakerPlayer = getStandingWheelPool(5, 70, 20, null, null);
assert(
  probability(highestPrestige, [1, 2, 3, 4]) > probability(weakerPlayer, [1, 2, 3, 4]),
  "the existing player influence must remain active after the prestige update",
);

// The whole national side determines the result, rather than one player's gap to a call-up threshold.
for (const ovr of [1, 55, 70, 78, 85, 99]) {
  let priorWin = Infinity;
  let priorExit = 0;
  for (const tier of [1, 2, 3]) {
    for (const luck of [0, 10, 20]) {
      const weights = getNationalTournamentWeights(ovr, luck, tier, 1);
      assert(Object.values(weights).every((weight) => Number.isFinite(weight) && weight > 0));
      assert(Math.abs(Object.values(weights).reduce((sum, weight) => sum + weight, 0) - 100) < 1e-10);
    }
    const weights = getNationalTournamentWeights(ovr, 10, tier, 1);
    assert(weights.wWin < priorWin && weights.wGroup > priorExit);
    priorWin = weights.wWin; priorExit = weights.wGroup;
  }
}
assert(getNationalTournamentWeights(55, 0, 1).wWin > getNationalTournamentWeights(99, 20, 3).wWin);
assert(getNationalTournamentWeights(99, 10, 2).wWin > getNationalTournamentWeights(70, 10, 2).wWin);
assert(getNationalTournamentWeights(99, 10, 2).wWin - getNationalTournamentWeights(55, 10, 2).wWin < 1.5);
assert(getNationalTournamentWeights(78, 20, 2).wWin - getNationalTournamentWeights(78, 0, 2).wWin < 0.5);
assert(Object.values(getNationalTournamentWeights(NaN, Infinity, NaN, NaN)).every(Number.isFinite));

const stats = { pac: 80, sho: 82, pas: 76, dri: 83, def: 40, phy: 74 };
const team: TeamWheelCtx = { effPositionOvr: computeEffectivePositionOvr("ST", stats, 80), prestige: 3,
  leagueSize: 20, apps: null, priorStanding: null, luckRating: 10, playerNationality: "France", standingResult: null, position: "ST" };
const preview = buildNationalTournamentPool(team);
assert(preview.every((item) => item.weight > 0));
for (const year of [2026, 2027]) {
  for (const roll of [0, 0.05, 0.15, 0.29, 0.49, 0.7, 0.999999]) {
    const resolved = getCareerWheelPoolAndValue("national_tournament", {
      currentAge: 18 + year - 2026, playerDebutAge: 18, playerCareerLength: 18, currentOvr: 80,
      position: "ST", yearSimResult: null, hiddenStats: null, currentClub: null, leagueSize: 20,
      priorClubStanding: null, currentContinentalCup: "UCL", playerNationality: "France",
      selectedStatsList: [], selectorIndex: 0, yearEvolutionDirection: null, currentStats: stats,
      ballonDorNominationWeight: 0, ballonDorRankWeights: [],
    }, () => roll);
    assert.equal(resolved.result, resolveWeightedOutcome(preview, () => roll), "World Cup/continental resolver must agree with the shared preview pool");
    assert.equal(resolved.idx, preview.findIndex((item) => item.value === resolved.result));
  }
}
console.log("National baseline win % (tiers 1/2/3):", [1, 2, 3].map((tier) => getNationalTournamentWeights(78, 10, tier).wWin));
console.log("competition-wheel-weight-check: ok");
