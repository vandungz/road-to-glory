import assert from "node:assert/strict";
import { CLUBS } from "@/prisma/data/clubs";
import { LEAGUES } from "@/prisma/data/leagues";
import { generateGlobalBallonRivals, globalAwardCandidateWeight, globalAwardPrestigeFactor, type GlobalAwardClub } from "@/features/season/services/global-award-candidates.service";
import { generateSyntheticLeagueCandidates } from "@/features/season/services/synthetic-league.service";
import { placeBallonDorPlayer } from "@/features/season/services/ballon-ranking";
import type { AwardRankingEntry } from "@/types/awards";
import { simulateAwardSeason } from "@/features/season/services/award-simulator.service";

function random(seed: number) { let state = seed; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; }
const leagues = new Map<string, (typeof LEAGUES)[number]>(LEAGUES.map((league) => [league.id, league]));
const clubs: GlobalAwardClub[] = CLUBS.map((club) => ({ ...club, league: leagues.get(club.leagueId)! }));
const byName = new Map(clubs.map((club) => [`${club.name}:${club.leagueId}`, club]));
assert(globalAwardCandidateWeight(5, 5, 100) > globalAwardCandidateWeight(3, 5, 100));
assert(globalAwardCandidateWeight(5, 5, 100) > globalAwardCandidateWeight(5, 3, 100));
assert(globalAwardCandidateWeight(5, 5, 120) > globalAwardCandidateWeight(5, 5, 100));
assert.deepEqual(generateGlobalBallonRivals([], "empty", random(5)), []);
const start = performance.now();
const draws = 100;
const sampleCount = draws * 10;
let prestigeTotal = 0;
let clubPrestigeTotal = 0, eliteCount = 0, weakCount = 0;
const seenLeagues = new Set<string>();
for (let seed = 1; seed <= draws; seed++) {
  const result = generateGlobalBallonRivals(clubs, "test-season", random(seed));
  assert.equal(result.length, 10);
  assert.equal(new Set(result.map((entry) => entry.candidateKey)).size, 10);
  assert.equal(new Set(result.map((entry) => `${entry.clubName}:${entry.position}`)).size, 10);
  const counts = new Map<string, number>();
  for (const entry of result) {
    const club = byName.get(`${entry.clubName}:${entry.candidateKey.split(":").at(-1)}`)!;
    assert(club && club.league.tier === 1);
    seenLeagues.add(club.leagueId);
    counts.set(club.leagueId, 1 + (counts.get(club.leagueId) ?? 0));
    assert(counts.get(club.leagueId)! <= 4);
    assert(result.filter((other) => other.clubName === entry.clubName).length <= 2);
    prestigeTotal += club.league.prestige;
    clubPrestigeTotal += club.prestige;
    if (club.prestige >= 4 && club.league.prestige >= 4) eliteCount++;
    if (club.prestige <= 3 && club.league.prestige <= 3) weakCount++;
  }
  assert(counts.size >= 3);
}
assert(seenLeagues.size > 5);
assert(prestigeTotal / sampleCount >= 4.6, "Global shortlist must favor high-prestige leagues");
assert(clubPrestigeTotal / sampleCount >= 4.2, "League prestige must not hide weak-club dominance");
assert(eliteCount / sampleCount >= 0.8, "At least 80% of sampled rivals should be strong clubs in strong leagues");
assert(weakCount > 0 && weakCount / sampleCount <= 0.035, "Weak clubs in weak leagues should be rare, but possible");
assert(globalAwardPrestigeFactor(5, 5) > globalAwardPrestigeFactor(5, 2));
assert(globalAwardPrestigeFactor(5, 5) > globalAwardPrestigeFactor(3, 5));
const balanced = generateSyntheticLeagueCandidates({ clubs: clubs.filter((club) => club.leagueId === "ENG1"), balancedClubPositions: true, randomSource: random(13) });
for (const club of clubs.filter((club) => club.leagueId === "ENG1")) {
  assert(balanced.some((candidate) => candidate.clubName === club.name && candidate.position === "ST"), "Every club needs an attacking candidate");
  assert(balanced.some((candidate) => candidate.clubName === club.name && candidate.position === "GK"));
}
const rivals = generateGlobalBallonRivals(clubs, "same-season", random(42));
assert.deepEqual(rivals, generateGlobalBallonRivals(clubs, "same-season", random(42)));
const localClubs = clubs.filter((club) => club.leagueId === "ITA1");
const makeSeason = (seed: number) => simulateAwardSeason({ globalClubs: clubs, age: 25, seasonId: "test-global", leagueTier: 1, randomSource: random(seed), player: {
  name: "My Player", position: "CM", ovr: 85, clubName: "Lazio", leagueId: "ITA1", leagueName: "Serie A", leaguePrestige: 4,
  leagueClubsCount: localClubs.length, leagueClubs: localClubs,
  leagueStats: { apps: 34, goals: 8, assists: 14, cleanSheets: 10, rating: 7.8 },
  domesticCupStats: { apps: 5, goals: 2, assists: 3, cleanSheets: 1, rating: 7.4 },
} });
const season = makeSeason(51);
const globalEntries = season.snapshots.find((snapshot) => snapshot.awardKey === "ballon_dor")!.entries;
assert.equal(globalEntries.length, 10);
assert(globalEntries.some((entry) => !localClubs.some((club) => club.name === entry.clubName)));
for (const snapshot of season.snapshots.filter((snapshot) => snapshot.scope === "league")) {
  assert(snapshot.entries.every((entry) => entry.isCareerPlayer || localClubs.some((club) => club.name === entry.clubName)), "League honours must not use global candidates");
}
let strongLeadingRivals = 0, weakLeadingRivals = 0;
for (let seed = 101; seed <= 130; seed++) {
  const firstRival = makeSeason(seed).snapshots.find((snapshot) => snapshot.awardKey === "ballon_dor")!.entries.find((entry) => !entry.isCareerPlayer)!;
  const club = byName.get(`${firstRival.clubName}:${firstRival.candidateKey.split(":").at(-1)}`)!;
  if (club.prestige >= 4 && club.league.prestige >= 4) strongLeadingRivals++;
  if (club.prestige <= 3 && club.league.prestige <= 3) weakLeadingRivals++;
}
assert(strongLeadingRivals >= 24, "Prestige must influence final rival ordering as well as shortlist selection");
assert(weakLeadingRivals <= 1, "Weak-league raw totals must not routinely win the global ranking");
console.log(`Leading rivals: ${strongLeadingRivals}/30 strong clubs/leagues, ${weakLeadingRivals}/30 weak clubs/leagues.`);
const entries: AwardRankingEntry[] = rivals.map((candidate, index) => ({ ...candidate, rank: index + 1, isCareerPlayer: false, metrics: {}, score: 100 - index, weight: 1, result: "ranked" }));
for (let rank = 1; rank <= 10; rank++) {
  const result = placeBallonDorPlayer(entries, rank, { candidateKey: "career:player", name: "My Player", position: "CM", clubName: "Lazio" });
  assert.equal(result.length, 10);
  assert.equal(result[rank - 1].isCareerPlayer, true);
  assert.equal(result[rank - 1].rank, rank);
  assert.equal(result.filter((entry) => entry.isCareerPlayer).length, 1);
  assert.deepEqual(result.map((entry) => entry.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(placeBallonDorPlayer(result, rank, { candidateKey: "career:player", name: "My Player", position: "CM", clubName: "Lazio" }), result);
}
console.log(`Global Ballon d'Or: ${seenLeagues.size} leagues; mean league/club prestige ${(prestigeTotal / sampleCount).toFixed(2)}/${(clubPrestigeTotal / sampleCount).toFixed(2)}; elite clubs/leagues ${eliteCount}/${sampleCount}; weak clubs/leagues ${weakCount}/${sampleCount}; ${(performance.now() - start).toFixed(0)}ms / ${draws} roster draws plus 30 full award simulations. All checks passed.`);
