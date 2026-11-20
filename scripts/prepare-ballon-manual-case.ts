import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/app/generated/prisma/client";
import { FORMATION_SLOTS } from "@/types/squad";
import type { Formation } from "@/types/game";
import { PORTRAIT_IDS } from "@/features/player/lib/player-portraits";
import { simulatePlayerSeasonService } from "@/features/season/services/season-simulator.service";
import { persistAwardSimulation } from "@/features/career/services/award-persistence.service";
import { z } from "zod";

const uiCase = process.argv.includes("--ui-case");
const fixtureName = uiCase ? "Bomba Ballon UI Test" : "Bomba Ballon Test";
const nominationWeight = uiCase ? 100 : 90;
const fixtureLabel = `Manual Ballon d’Or ${nominationWeight}% nomination case`;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

async function main() {
  const email = process.argv[process.argv.indexOf("--email") + 1];
  const squad = process.argv[process.argv.indexOf("--squad") + 1];
  if (!process.argv.includes("--email") || !process.argv.includes("--squad") || !email?.includes("@") || !squad) {
    throw new Error("Usage: tsx scripts/prepare-ballon-manual-case.ts --email <owner> --squad <name>");
  }
  const users = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM auth.users WHERE lower(email) = lower(${email})`;
  if (users.length !== 1) throw new Error("Expected exactly one matching account; no changes made.");
  const sessions = await prisma.gameSession.findMany({
    where: { userId: users[0].id, name: { equals: squad, mode: "insensitive" } },
    select: { id: true, name: true, formation: true, status: true,
      players: { select: { id: true, slotIndex: true, name: true, isRetired: true, currentStep: true }, orderBy: { slotIndex: "asc" } } },
  });
  if (sessions.length !== 1) throw new Error("Expected exactly one matching squad; no changes made.");
  const session = sessions[0];
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ mode: "inspect", squad: session }, null, 2));
    return;
  }
  const existing = session.players.find((player) => player.name === fixtureName);
  if (existing) { console.log(JSON.stringify({ mode: "already-exists", squadId: session.id, player: existing })); return; }
  const slot = FORMATION_SLOTS[session.formation as Formation]?.find((candidate) => candidate.position === "CM"
    && !session.players.some((player) => player.slotIndex === candidate.index));
  if (!slot || session.status !== "in_progress") throw new Error("No empty CM slot in an in-progress squad; no changes made.");
  const club = await prisma.club.findUnique({ where: { id: "real_madrid" }, include: { league: true } });
  if (!club) throw new Error("Real Madrid reference data is unavailable; no changes made.");
  const globalClubs = await prisma.club.findMany({ where: { league: { tier: 1 } },
    select: { id: true, name: true, prestige: true, leagueId: true, league: { select: { tier: true, prestige: true } } }, orderBy: { id: "asc" } });
  const leagueClubs = globalClubs.filter((candidate) => candidate.leagueId === club.leagueId);
  if (leagueClubs.length < 2 || new Set(globalClubs.map((candidate) => candidate.leagueId)).size < 3) {
    throw new Error("Reference rosters are incomplete; no changes made.");
  }
  const playerId = randomUUID();
  const seasonId = randomUUID();
  const age = 21;
  const stats = { pac: 92, sho: 94, pas: 98, dri: 96, def: 88, phy: 93 };
  let seed = 19092026;
  const simulated = simulatePlayerSeasonService({
    seasonId, playerId, playerName: fixtureName, formation: session.formation, age, ovr: 95, position: slot.position,
    luckRating: 20, professionalism: 20, clubPrestige: club.prestige, clubName: club.name, leagueName: club.league.name,
    leagueTier: club.league.tier, leaguePrestige: club.league.prestige, leagueClubsCount: leagueClubs.length, leagueClubs, globalClubs,
    hasContinentalCup: true, playerNationality: "France", currentStats: stats,
    standingResult: 1, domesticCupResult: "Winner", continentalCupResult: "Winner", continentalCupType: "UCL",
    nationalCallupResult: "missed", randomSource: () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; },
  });
  // Only this explicitly requested fixture overrides the nomination probability; normal game weights are untouched.
  simulated.ballonDor.nominationWeight = nominationWeight;
  simulated.awardSimulation.ballonDor.nominationWeight = nominationWeight;
  if (simulated.awardSimulation.snapshots.find((snapshot) => snapshot.awardKey === "ballon_dor")?.entries.length !== 10) {
    throw new Error("Fixture must have a full worldwide Top 10; no changes made.");
  }
  const runtime = { continentalCupType: "UCL", standingResult: 1, domesticCupResult: "Winner", continentalCupResult: "Winner",
    nationalCallupResult: "missed", yearSimResult: simulated, ballonDorNominationWeight: nominationWeight,
    ballonDorRankWeights: simulated.ballonDor.rankWeights, awardSimulationVersion: simulated.awardSimulation.modelVersion,
    lastWheel: { stepKey: "season_stats", result: "committed" } };
  const record = { age, clubId: club.id, clubName: club.name, leagueId: club.leagueId, leagueName: club.league.name,
    ovr: 95, standing: 1, domesticCup: "Winner", continentalCup: { type: "UCL", result: "Winner" },
    nationalTeam: null, apps: simulated.apps, goals: simulated.goals, assists: simulated.assists,
    cleanSheets: simulated.cleanSheets, matchRating: simulated.matchRating };
  await prisma.$transaction(async (tx) => {
    const current = await tx.gameSession.findUnique({ where: { id: session.id }, select: { userId: true, formation: true, status: true } });
    if (!current || current.userId !== users[0].id || current.formation !== session.formation || current.status !== "in_progress"
      || await tx.careerPlayer.findUnique({ where: { gameSessionId_slotIndex: { gameSessionId: session.id, slotIndex: slot.index } } })) {
      throw new Error("Squad changed while preparing fixture; no changes made.");
    }
    await tx.careerPlayer.create({ data: {
      id: playerId, gameSessionId: session.id, slotIndex: slot.index, name: fixtureName, position: slot.position,
      nationality: "France", portraitId: PORTRAIT_IDS[1], height: 180, weight: 75, preferredFoot: "Right",
      debutAge: age, retireAge: 31, careerLengthYears: 10, debutOvr: 95, peakOvr: 95, cardRarity: "legendary",
      currentContinentalCup: "UCL", contractYearsTotal: 3, contractYearsRemaining: 3, currentWageAnnual: 7200,
      marketValue: 120000, statsTimeline: json([{ age, ovr: 95, ...stats, apps: simulated.apps,
        goals: simulated.goals, assists: simulated.assists, cleanSheets: simulated.cleanSheets, matchRating: simulated.matchRating }]),
      clubStints: json([{ clubId: club.id, clubName: club.name, leagueId: club.leagueId, leagueName: club.league.name,
        startAge: age, endAge: age, yearsAtClub: 1, ovrAtJoining: 95, ovrAtLeaving: 95 }]),
      events: json([{ type: "test_fixture", label: fixtureLabel, age }]),
      hiddenStats: json({ luckRating: 20, professionalism: 20, personality: "Professional" }),
      achievements: json({ ballonDor: 0, trophies: [], seasonAwards: [] }), seasonHistory: json({ [age]: record }),
      isRetired: false, currentAge: age, currentStep: "ballon_dor_nomination", currentWheel: "career", checkpointVersion: 2,
    } });
    await tx.careerSeason.create({ data: { id: seasonId, careerPlayerId: playerId, age, seasonNumber: 1,
      clubId: club.id, clubName: club.name, leagueId: club.leagueId, leagueName: club.league.name, runtimeState: json(runtime) } });
    await persistAwardSimulation({ tx, playerId, seasonId, age, club: { id: club.id, name: club.name, leagueId: club.leagueId }, simulation: simulated.awardSimulation });
    await tx.careerEvent.create({ data: { careerPlayerId: playerId, seasonId, type: "test_fixture",
      label: fixtureLabel, payload: json({ nominationWeight, fixtureOnly: true }) } });
  });
  const stored = await prisma.careerSeason.findUniqueOrThrow({ where: { id: seasonId }, select: { runtimeState: true } });
  const saved = z.object({ ballonDorNominationWeight: z.number().refine((value) => value === nominationWeight), ballonDorRankWeights: z.array(z.number()),
    yearSimResult: z.object({ ballonDor: z.object({ nominationWeight: z.number().refine((value) => value === nominationWeight) }) }) }).parse(stored.runtimeState);
  console.log(JSON.stringify({ mode: "created", squadId: session.id, playerId, slotIndex: slot.index, position: slot.position,
    name: fixtureName, nominationWeight, rankWeights: saved.ballonDorRankWeights,
    path: `/classic/${session.id}/draft/${slot.index}` }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Fixture preparation failed"); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
