import assert from "node:assert/strict";
import { CLUBS } from "@/prisma/data/clubs";
import { LEAGUES } from "@/prisma/data/leagues";
import { continentalOpponentTypes, tournamentConfederation } from "@/features/season/services/competition-opponents";
import { clubJourneyStrength, drawJourneyOpponents, journeyOpponentWeight, journeyRounds } from "@/features/season/services/journey-opponents";
import { generateContinentalCupJourneyService, generateDomesticCupJourneyService, generateNationalTeamJourneyService, type ClubCupInfo } from "@/features/season/services/cup-journey.service";

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

const leagues = new Map<string, (typeof LEAGUES)[number]>(LEAGUES.map((league) => [league.id, league]));
const clubs: ClubCupInfo[] = CLUBS.map((club) => ({ ...club, league: leagues.get(club.leagueId) }));
assert.deepEqual(continentalOpponentTypes("UCL"), ["UCL"]);
assert.deepEqual(continentalOpponentTypes("UEL"), ["UEL"]);
assert.deepEqual(continentalOpponentTypes("UECL"), ["UECL"]);
assert.deepEqual(continentalOpponentTypes("Libertadores"), ["Libertadores"]);
assert.deepEqual(continentalOpponentTypes("none"), []);
assert.deepEqual(continentalOpponentTypes("invalid"), []);
assert.deepEqual(continentalOpponentTypes("Sudamericana"), ["Libertadores", "Sudamericana"]);
assert.equal(tournamentConfederation("UEFA Euro"), "UEFA");
assert.equal(tournamentConfederation("FIFA World Cup"), undefined);
assert(clubJourneyStrength({ prestige: 4, league: { prestige: 5 } }) > clubJourneyStrength({ prestige: 4, league: { prestige: 2 } }));
assert.equal(clubJourneyStrength({ prestige: 4 }), 4);
for (let round = 0; round <= 5; round++) {
  for (let strength = 1; strength <= 5; strength++) assert(journeyOpponentWeight(strength, round) > 0);
}
assert(journeyOpponentWeight(5, 5) / journeyOpponentWeight(1, 5) > journeyOpponentWeight(5, 0) / journeyOpponentWeight(1, 0));

// Exercise real reference rosters and all outcome branches, preserving the wheel's result.
for (const type of ["UCL", "UEL", "UECL", "Libertadores", "Sudamericana", "AFC_CL", "CAF_CL", "CONCACAF_CC"]) {
  const allowed = continentalOpponentTypes(type);
  const roster = clubs.filter((club) => allowed.includes(club.continentalType));
  assert(roster.length >= 5, `${type}: reference roster must support four distinct opponents`);
  const player = roster[0];
  for (const result of ["Group Stage", "Round of 16", "Quarter-Finals", "Semi-Finals", "Runner-Up", "Winner"]) {
    const params = { result, playerClubId: player.id, playerClubPrestige: player.prestige, cupName: type, opponents: roster };
    const journey = generateContinentalCupJourneyService({ ...params, randomSource: seededRandom(1234) });
    assert.deepEqual(journey, generateContinentalCupJourneyService({ ...params, randomSource: seededRandom(1234) }));
    assert.equal(journey.length, 1 + journeyRounds(result, false).length);
    const opponents = journey.filter((line) => line.includes("trước CLB"));
    assert.equal(opponents.length, new Set(opponents.map((line) => line.split("trước CLB ")[1].split(/ \(| —/)[0])).size);
    assert(opponents.every((line) => !line.includes(`trước CLB ${player.name}`)));
    assert(opponents.every((line) => roster.some((club) => club.id !== player.id && line.includes(`trước CLB ${club.name}`))));
    if (result === "Winner") assert.match(journey.at(-1)!, /Thắng.*VÔ ĐỊCH/);
    else if (result !== "Group Stage") assert.match(journey.at(-1)!, /Thua/);
  }
  const pool = roster.filter((club) => club.id !== player.id);
  let early = 0, final = 0;
  const random = seededRandom(414);
  for (let trial = 0; trial < 5000; trial++) {
    const drawn = drawJourneyOpponents(pool, [2, 3, 4, 5], clubJourneyStrength, random);
    assert.equal(new Set(drawn.map((team) => team.id)).size, 4);
    early += clubJourneyStrength(drawn[0]); final += clubJourneyStrength(drawn[3]);
  }
  assert(final / 5000 > early / 5000, `${type}: late opponents should be stronger on average`);
  console.log(`${type}: mean strength R16 ${(early / 5000).toFixed(2)}, final ${(final / 5000).toFixed(2)}`);
}

const domestic = clubs.filter((club) => leagues.get(club.leagueId)?.country === "England");
for (const result of ["Early Exit", "Round of 32", "Round of 16", "Quarter-Finals", "Semi-Finals", "Runner-Up", "Winner"]) {
  const journey = generateDomesticCupJourneyService({ result, playerClubId: domestic[0].id, playerClubPrestige: domestic[0].prestige, opponents: domestic, randomSource: seededRandom(99) });
  assert.equal(journey.length, journeyRounds(result, true).length);
  assert.match(journey.at(-1)!, result === "Winner" ? /Thắng.*VÔ ĐỊCH/ : /Thua/);
}
const nations = Array.from({ length: 12 }, (_, index) => ({ id: `nation-${index}`, name: `Nation ${index}`, nationality: `Nation ${index}`, confederation: "UEFA", tier: 1 + index % 3 }));
for (const result of ["Group Stage", "Round of 16", "Quarter-Finals", "Semi-Finals", "Runner-Up", "Winner"]) {
  const journey = generateNationalTeamJourneyService({ result, tourneyName: "UEFA Euro", playerNationality: nations[0].nationality, opponents: nations, randomSource: seededRandom(27) });
  assert.equal(journey.length, 1 + journeyRounds(result, false).length);
  assert(journey.every((line) => !line.includes(`ĐTQG ${nations[0].name} `)));
}
assert.deepEqual(drawJourneyOpponents([], [2, 3, 4, 5], clubJourneyStrength), []);
assert.deepEqual(generateNationalTeamJourneyService({ result: "Winner", tourneyName: "UEFA Euro", playerNationality: nations[0].nationality, opponents: [nations[0]] }), []);
assert.deepEqual(generateDomesticCupJourneyService({ result: "Winner", playerClubId: "x", playerClubPrestige: 3, opponents: [] }), []);
assert.deepEqual(drawJourneyOpponents([domestic[0]], [2, 3, 4, 5], clubJourneyStrength, seededRandom(3)).map((club) => club.id), Array(4).fill(domestic[0].id));

// A weak finalist stays possible, but is rare even when weak teams greatly outnumber favorites.
const synthetic = Array.from({ length: 30 }, (_, index) => ({ id: String(index), prestige: index < 3 ? 5 : 1, league: { prestige: index < 3 ? 5 : 1 } }));
const random = seededRandom(542);
let underdogs = 0;
for (let trial = 0; trial < 10000; trial++) {
  if (drawJourneyOpponents(synthetic, [2, 3, 4, 5], clubJourneyStrength, random)[3].prestige === 1) underdogs++;
}
assert(underdogs > 0 && underdogs < 200, `unexpected underdog final rate: ${underdogs}/10000`);
console.log(`Underdog finals: ${underdogs}/10000; competition-journey-check: ok`);
