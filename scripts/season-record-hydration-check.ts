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
  runtimeState: { standingResult: 13, continentalCupType: "UCL" },
});

assert.equal(merged.standing, 13);
assert.equal(merged.domesticCup, "Winner");
assert.equal(merged.continentalCup?.type, "UCL");
assert.equal(merged.continentalCup?.result, "Chờ quay", "stale record must not pre-fill an unplayed continental cup result");

const noTicket = hydrateCurrentSeasonRecord({
  existing: hydrated,
  age: 17,
  clubName: "Newcastle United",
  leagueName: "Premier League",
  leagueId: "ENG1",
  continentalType: "none",
  nationality: "England",
  debutAge: 17,
  runtimeState: { continentalCupType: "none" },
});
assert.equal(noTicket.continentalCup, null, "a season without a continental ticket must not inherit a previous cup result");

console.log("season-record-hydration-check: passed");
