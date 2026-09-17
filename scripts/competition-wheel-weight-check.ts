import assert from "node:assert/strict";
import { getStandingWheelPool } from "@/features/wheel/lib/simulation-helpers";
import { getPriorClubStanding } from "@/features/wheel/lib/previous-season-standing";

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

console.log("competition-wheel-weight-check: ok");
