import assert from "node:assert/strict";
import { getHonourDisplayCategory, getHonourIdentity, getSpecificHonourLabel } from "@/features/career/lib/honour-display";

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

console.log("honours display checks passed");
