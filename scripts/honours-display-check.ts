import assert from "node:assert/strict";
import { getHonourDisplayCategory, getHonourIdentity, getHonourResultLabel, getSpecificHonourLabel } from "@/features/career/lib/honour-display";
import { getHonourRows } from "@/features/player/lib/honour-summary";

assert.equal(
  getSpecificHonourLabel("domestic_cup_title", "Vô địch cúp quốc gia", { leagueId: "ENG1", leagueName: "Premier League" }),
  "Vô địch FA Cup",
);
assert.equal(
  getSpecificHonourLabel("continental_title", "Vô địch cúp châu lục", { continentalType: "UCL" }),
  "Vô địch UEFA Champions League",
);
assert.equal(
  getSpecificHonourLabel("league_title", "Vô địch giải quốc gia", { leagueName: "Premier League" }),
  "Vô địch Premier League",
);
assert.equal(getHonourDisplayCategory("domestic_cup_title"), "club");
assert.equal(getHonourDisplayCategory("league_best_xi", "individual_award"), "individual");
assert.equal(
  getHonourIdentity("domestic_cup_title", "Vô địch FA Cup", null),
  getHonourIdentity("domestic_cup_title", "Vô địch cúp quốc gia", null),
  "same season award identity must not depend on the presentation label",
);
assert.equal(getHonourResultLabel("Vô địch UEFA Europa League", "runner_up"), "Á quân UEFA Europa League");
const fallbackRows = getHonourRows(undefined, {
  "24": {
    leagueName: "Test League",
    standing: 2,
    continentalCup: { type: "UEL", result: "Runner-Up" },
  },
});
assert.ok(fallbackRows.some((row) => row.result === "runner_up" && row.label === "Á quân Test League"), "league runner-up must be displayed from legacy season history");
assert.ok(fallbackRows.some((row) => row.result === "runner_up" && row.label === "Á quân UEFA Europa League"), "continental runner-up must be displayed from legacy season history");
const mergedRows = getHonourRows(undefined, {
  "24": { leagueName: "Test League", continentalCup: { type: "UEL", result: "Runner-Up" } },
}, [{
  id: "honour-1", seasonId: "season-1", age: 24, seasonLabel: "Tuổi 24", category: "team_trophy",
  awardKey: "league_title", scope: "league", scopeKey: "TEST1", slotKey: null, rank: null,
  result: "winner", label: "Vô địch Test League", clubName: "Test Club", metrics: {}, source: "season_simulation",
}]);
assert.ok(mergedRows.some((row) => row.label === "Vô địch Test League"), "canonical honours must remain visible");
assert.ok(mergedRows.some((row) => row.label === "Á quân UEFA Europa League"), "history-only continental honours must not be hidden by canonical honours");

console.log("honours display checks passed");
