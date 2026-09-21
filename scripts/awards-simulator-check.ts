import assert from "node:assert/strict";
import { simulateAwardSeason } from "@/features/season/services/award-simulator.service";
import { generateSyntheticLeagueCandidates } from "@/features/season/services/synthetic-league.service";
import { isDeprecatedAwardKey, type AwardRankingEntry } from "@/types/awards";

function seededSource(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const testPlayer = {
  id: "00000000-0000-0000-0000-000000000002",
  name: "Test CAM",
  position: "CAM",
  ovr: 90,
  currentStats: { pac: 88, sho: 86, pas: 94, dri: 92, def: 70, phy: 80 },
  luckRating: 20,
  professionalism: 18,
  clubId: "test-club",
  clubName: "Test Club",
  leagueId: "TEST1",
  leagueName: "Test League",
  leaguePrestige: 5,
  leagueClubsCount: 20,
  leagueClubs: [
    { id: "mufc", name: "Manchester United", prestige: 5 },
    { id: "arsenal", name: "Arsenal", prestige: 5 },
    { id: "liverpool", name: "Liverpool", prestige: 5 },
    { id: "chelsea", name: "Chelsea", prestige: 4 },
    { id: "spurs", name: "Tottenham Hotspur", prestige: 4 },
    { id: "city", name: "Manchester City", prestige: 5 },
    { id: "villa", name: "Aston Villa", prestige: 4 },
    { id: "newcastle", name: "Newcastle United", prestige: 4 },
    { id: "westham", name: "West Ham United", prestige: 3 },
    { id: "everton", name: "Everton", prestige: 3 },
    { id: "brighton", name: "Brighton", prestige: 3 },
    { id: "palace", name: "Crystal Palace", prestige: 3 },
    { id: "fulham", name: "Fulham", prestige: 3 },
    { id: "brentford", name: "Brentford", prestige: 3 },
    { id: "forest", name: "Nottingham Forest", prestige: 3 },
    { id: "bournemouth", name: "Bournemouth", prestige: 3 },
    { id: "leicester", name: "Leicester City", prestige: 3 },
    { id: "wolves", name: "Wolverhampton Wanderers", prestige: 3 },
    { id: "ipswich", name: "Ipswich Town", prestige: 2 },
    { id: "southampton", name: "Southampton", prestige: 2 },
  ],
  standing: 1,
  domesticCupResult: "Winner",
  continentalResult: "Winner",
  continentalType: "UCL",
  leagueStats: { apps: 34, goals: 10, assists: 22, cleanSheets: 5, rating: 8.25 },
  domesticCupStats: { apps: 6, goals: 20, assists: 1, cleanSheets: 0, rating: 7.2 },
  expectedMatches: 53,
};

const result = simulateAwardSeason({
  seasonId: "00000000-0000-0000-0000-000000000001",
  age: 25,
  formation: "4-3-3",
  randomSource: seededSource(11),
  player: testPlayer,
});
assert.ok(result.candidateUniverseSize >= 40, "award universe must model a real league field, not a fixed 21-player shortlist");
const defaultFormationResult = simulateAwardSeason({
  seasonId: "00000000-0000-0000-0000-000000000006",
  age: 25,
  randomSource: () => 0.5,
  player: testPlayer,
});
const defaultFormationXi = defaultFormationResult.snapshots.find((snapshot) => snapshot.awardKey === "league_best_xi");
assert.equal(defaultFormationXi?.formation, "4-3-3", "Best XI must default to a 4-3-3 formation");
assert.equal(defaultFormationXi?.entries.length, 11, "default 4-3-3 Best XI must fill every pitch slot");

const goldenBoot = result.snapshots.find((snapshot) => snapshot.awardKey === "league_golden_boot");
assert.ok(goldenBoot, "Golden Boot snapshot must exist");
assert.ok(goldenBoot.entries.every((entry) => Number(entry.metrics.apps ?? 0) >= 18), "Golden Boot candidates need a realistic league sample");
assert.ok(goldenBoot.entries.every((entry) => Number(entry.metrics.goals ?? 0) >= 10), "Golden Boot candidates need at least 10 league goals");
assert.equal(goldenBoot.entries.length, 10, "Golden Boot must always expose exactly 10 qualified candidates");
const topAssist = result.snapshots.find((snapshot) => snapshot.awardKey === "league_top_assist");
assert.ok(topAssist, "Top Assist snapshot must exist");
assert.ok(topAssist.entries.every((entry) => Number(entry.metrics.assists ?? 0) >= 10), "Top Assist candidates need at least 10 league assists");
assert.equal(topAssist.entries.length, 10, "Top Assist must always expose exactly 10 qualified candidates");
const ballonSnapshot = result.snapshots.find((snapshot) => snapshot.awardKey === "ballon_dor");
assert.ok(ballonSnapshot, "Ballon d'Or candidate snapshot must exist");
assert.equal(ballonSnapshot.revealStage, "ballon_dor_result", "Ballon d'Or ranking must wait for the Ballon d'Or result screen");
assert.ok(!result.snapshots.some((snapshot) => isDeprecatedAwardKey(snapshot.awardKey)), "Deprecated position/general awards must not be emitted as season awards");

const cbResult = simulateAwardSeason({
  seasonId: "00000000-0000-0000-0000-000000000003",
  age: 19,
  formation: "3-5-2",
  randomSource: seededSource(12),
  player: {
    ...result.ballonDor,
    id: "00000000-0000-0000-0000-000000000004",
    name: "Test CB",
    position: "CB",
    ovr: 74,
    currentStats: { pac: 65, sho: 50, pas: 65, dri: 55, def: 82, phy: 78 },
    clubName: "Defensive Club",
    leagueStats: { apps: 34, goals: 1, assists: 0, cleanSheets: 14, rating: 7.1 },
    domesticCupStats: { apps: 4, goals: 0, assists: 0, cleanSheets: 1, rating: 6.9 },
    leaguePrestige: 3,
    leagueClubsCount: 20,
    leagueClubs: testPlayer.leagueClubs,
    standing: 8,
    domesticCupResult: "Quarter-Finals",
    clubId: "defensive-club",
    leagueId: "TEST2",
    leagueName: "Test League",
  },
});
const cbGoldenBoot = cbResult.snapshots.find((snapshot) => snapshot.awardKey === "league_golden_boot");
const cbTopAssist = cbResult.snapshots.find((snapshot) => snapshot.awardKey === "league_top_assist");
if (cbGoldenBoot) {
  assert.ok(cbGoldenBoot.entries.every((entry) => Number(entry.metrics.goals ?? 0) >= 10), "CB Golden Boot entries must meet the 10-goal floor");
  assert.equal(cbGoldenBoot.entries.length, 10, "CB Golden Boot must still expose 10 qualified candidates");
  assert.notEqual(cbGoldenBoot.entries[0]?.position, "CB", "a realistic CB output must not win Golden Boot by default");
  assert.ok(!cbGoldenBoot.entries.slice(0, 3).some((entry) => entry.isCareerPlayer), "CB must not be a default Golden Boot leader");
}
if (cbTopAssist) {
  assert.ok(cbTopAssist.entries.every((entry) => Number(entry.metrics.assists ?? 0) >= 10), "CB Top Assist entries must meet the 10-assist floor");
  assert.equal(cbTopAssist.entries.length, 10, "CB Top Assist must still expose 10 qualified candidates");
  assert.notEqual(cbTopAssist.entries[0]?.position, "CB", "a realistic CB output must not win Top Assist by default");
  assert.ok(!cbTopAssist.entries.slice(0, 3).some((entry) => entry.isCareerPlayer), "CB must not be a default Top Assist leader");
}

const bestXi = result.snapshots.find((snapshot) => snapshot.awardKey === "league_best_xi");
if (bestXi) {
  assert.equal(bestXi.entries.length, 11, "Best XI must provide one candidate per formation slot");
  const candidateKeys = bestXi.entries.map((entry) => entry.candidateKey);
  assert.equal(new Set(candidateKeys).size, candidateKeys.length, "Best XI cannot select one candidate twice");
}

for (const [index, formation] of (["4-4-2", "3-5-2"] as const).entries()) {
  const formationResult = simulateAwardSeason({
    seasonId: `00000000-0000-0000-0000-00000000000${5 + index}`,
    age: 25,
    formation,
    randomSource: () => 0.5,
    player: testPlayer,
  });
  const formationXi = formationResult.snapshots.find((snapshot) => snapshot.awardKey === "league_best_xi");
  assert.ok(formationXi, `${formation} Best XI snapshot must exist`);
  assert.equal(formationXi.entries.length, 11, `${formation} Best XI must fill every pitch slot`);
  assert.equal(new Set(formationXi.entries.map((entry) => entry.slotKey)).size, 11, `${formation} Best XI slots must be unique`);
}

for (let seed = 1; seed <= 100; seed += 1) {
  const stressResult = simulateAwardSeason({
    seasonId: `best-xi-stress-${seed}`,
    age: 25,
    formation: "4-3-3",
    randomSource: seededSource(seed),
    player: testPlayer,
  });
  const stressXi = stressResult.snapshots.find((snapshot) => snapshot.awardKey === "league_best_xi");
  assert.equal(stressXi?.entries.length, 11, "Best XI must never leave a pitch slot blank across seeded seasons");
}

for (const snapshot of result.snapshots) {
  const maxEntries = snapshot.awardKey === "league_best_xi" ? 11 : 10;
  assert.ok(snapshot.entries.length <= maxEntries, "ranking snapshots must be bounded");
  assert.ok(snapshot.entries.every((entry) => entry.rank >= 1 && entry.rank <= maxEntries), "ranking ranks must be bounded");
  const candidateKeys = snapshot.entries.map((entry) => entry.candidateKey);
  assert.equal(new Set(candidateKeys).size, candidateKeys.length, `${snapshot.awardKey} cannot contain duplicate candidates`);
}

const syntheticA = generateSyntheticLeagueCandidates({ seasonId: "invariant", leagueTier: 1, clubs: testPlayer.leagueClubs, randomSource: seededSource(17) });
const syntheticB = generateSyntheticLeagueCandidates({ seasonId: "invariant", leagueTier: 1, clubs: testPlayer.leagueClubs, randomSource: seededSource(17) });
assert.deepEqual(syntheticA, syntheticB, "same season context and seed must replay the same synthetic league");
assert.ok(new Set(syntheticA.map((candidate) => candidate.clubName)).size >= 8, "synthetic candidates must span multiple clubs");
const leagueClubNames = new Set(testPlayer.leagueClubs.map((club) => club.name));
assert.ok(syntheticA.every((candidate) => leagueClubNames.has(candidate.clubName)), "synthetic candidates must belong to the player's current league");
assert.ok(Math.min(...syntheticA.map((candidate) => candidate.leagueStats.apps)) < 18, "synthetic universe must include rotation/injury-limited players");
assert.ok(Math.max(...syntheticA.map((candidate) => candidate.leagueStats.apps)) >= 18, "synthetic universe must include eligible starters");

const lowOvrResult = simulateAwardSeason({
  seasonId: "ovr-independence",
  age: 25,
  formation: "4-3-3",
  randomSource: seededSource(31),
  player: { ...testPlayer, ovr: 72 },
});
const highOvrResult = simulateAwardSeason({
  seasonId: "ovr-independence",
  age: 25,
  formation: "4-3-3",
  randomSource: seededSource(31),
  player: { ...testPlayer, ovr: 94 },
});
for (const lowSnapshot of lowOvrResult.snapshots) {
  const highSnapshot = highOvrResult.snapshots.find((snapshot) => snapshot.awardKey === lowSnapshot.awardKey);
  if (!highSnapshot) continue;
  for (const lowEntry of lowSnapshot.entries.filter((entry) => !entry.isCareerPlayer)) {
    const matchingEntry: AwardRankingEntry | undefined = highSnapshot.entries.find((candidateEntry: AwardRankingEntry) => candidateEntry.candidateKey === lowEntry.candidateKey);
    if (matchingEntry) assert.deepEqual(matchingEntry.metrics, lowEntry.metrics, `${lowEntry.candidateKey} must not be anchored to user OVR`);
  }
}

for (const snapshot of result.snapshots.filter((entry) => entry.scope === "league")) {
  assert.ok(
    snapshot.entries.every((entry) => entry.isCareerPlayer || leagueClubNames.has(entry.clubName)),
    `${snapshot.awardKey} must not contain a club outside the player's current league`,
  );
}

console.log("awards simulator checks passed");
