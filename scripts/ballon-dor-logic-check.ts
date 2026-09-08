import assert from "node:assert/strict";
import { evaluateBallonDor } from "@/features/season/services/ballon-dor.service";
import { shouldResumeSeasonStatsModal } from "@/features/wheel/lib/career-resume-state";

const cmStats = { pac: 93, sho: 88, pas: 97, dri: 94, def: 91, phy: 92 };
const strongCm = evaluateBallonDor({
  ovr: 96,
  position: "CM",
  currentStats: cmStats,
  apps: 42,
  expectedMatches: 57,
  goals: 18,
  assists: 22,
  cleanSheets: 12,
  matchRating: 8.65,
  standing: 1,
  leagueSize: 20,
  clubPrestige: 5,
  domesticCup: "Winner",
  continentalResult: "Winner",
  continentalType: "UCL",
});

assert.equal(strongCm.eligible, true);
assert.ok(strongCm.nominationWeight > 50);
assert.equal(strongCm.rankWeights.length, 10);
assert.equal(strongCm.rankWeights.reduce((sum, weight) => sum + weight, 0), 100);
assert.ok(strongCm.rankWeights.every((weight) => weight > 0));
assert.ok(strongCm.rankWeights[0] > strongCm.rankWeights[9]);
assert.ok(strongCm.evaluation!.positionScore > 0);
assert.equal(strongCm.evaluation!.role, "Tiền vệ trung tâm");

const belowOvrGate = evaluateBallonDor({
  ...strongCmInput(),
  ovr: 84,
  position: "CM",
});
assert.equal(belowOvrGate.eligible, false);
assert.equal(belowOvrGate.nominationWeight, 0);
assert.deepEqual(belowOvrGate.rankWeights, []);

const weakSeason = evaluateBallonDor({
  ovr: 85,
  position: "CM",
  currentStats: { pac: 65, sho: 65, pas: 65, dri: 65, def: 65, phy: 65 },
  apps: 20,
  expectedMatches: 50,
  goals: 1,
  assists: 2,
  cleanSheets: 1,
  matchRating: 7.0,
  standing: 12,
  leagueSize: 20,
  clubPrestige: 2,
  domesticCup: "Early Exit",
});
assert.equal(weakSeason.eligible, false);

const sameTotals = {
  ovr: 90,
  apps: 40,
  expectedMatches: 55,
  goals: 8,
  assists: 10,
  cleanSheets: 15,
  matchRating: 8.2,
  standing: 2,
  leagueSize: 20,
  clubPrestige: 4,
  domesticCup: "Semi-Finals",
};
const attacker = evaluateBallonDor({
  ...sameTotals,
  position: "ST",
  currentStats: { pac: 96, sho: 95, pas: 88, dri: 94, def: 70, phy: 90 },
});
const goalkeeper = evaluateBallonDor({
  ...sameTotals,
  position: "GK",
  currentStats: { div: 96, han: 95, kic: 88, ref: 94, spd: 70, pos: 90 },
});
assert.notEqual(attacker.evaluation!.roleOutputScore, goalkeeper.evaluation!.roleOutputScore);
assert.notEqual(attacker.evaluation!.effectivePositionRating, goalkeeper.evaluation!.effectivePositionRating);

assert.equal(shouldResumeSeasonStatsModal("ballon_dor_nomination", strongCm, "season_stats"), true);
assert.equal(shouldResumeSeasonStatsModal("dir_increase", strongCm, "season_stats"), true);
assert.equal(shouldResumeSeasonStatsModal("ballon_dor_ranking", strongCm, "ballon_dor_nomination"), false);
assert.equal(shouldResumeSeasonStatsModal("dir_increase", strongCm, "ballon_dor_ranking"), false);

function strongCmInput() {
  return {
    ovr: 96,
    position: "CM",
    currentStats: cmStats,
    apps: 42,
    expectedMatches: 57,
    goals: 18,
    assists: 22,
    cleanSheets: 12,
    matchRating: 8.65,
    standing: 1,
    leagueSize: 20,
    clubPrestige: 5,
    domesticCup: "Winner",
    continentalResult: "Winner",
    continentalType: "UCL",
  } as const;
}

console.log("ballon d'or logic checks passed");
