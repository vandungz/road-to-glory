import assert from "node:assert/strict";
import { hydrateCurrentSeasonRecord } from "@/features/wheel/lib/season-record-hydration";

const hydrated = hydrateCurrentSeasonRecord({
  age: 17,
  clubName: "Newcastle United",
  leagueName: "Premier League",
  leagueId: "ENG1",
  continentalType: "UCL",
  nationality: "England",
  debutAge: 17,
  runtimeState: {
    standingResult: 13,
    domesticCupResult: "Round of 16",
  },
});

assert.equal(hydrated.standing, 13);
assert.equal(hydrated.domesticCup, "Round of 16");
assert.deepEqual(hydrated.continentalCup, { type: "UCL", result: "Chờ quay" });
assert.equal(hydrated.nationalTeam, null);

const merged = hydrateCurrentSeasonRecord({
  existing: {
    ...hydrated,
    standing: 12,
    domesticCup: "Winner",
  },
  age: 17,
  clubName: "Newcastle United",
  leagueName: "Premier League",
  leagueId: "ENG1",
  continentalType: "none",
  nationality: "England",
  debutAge: 17,
  runtimeState: { standingResult: 13 },
});

assert.equal(merged.standing, 13);
assert.equal(merged.domesticCup, "Winner");
assert.equal(merged.continentalCup?.type, "UCL");

console.log("season-record-hydration-check: passed");
