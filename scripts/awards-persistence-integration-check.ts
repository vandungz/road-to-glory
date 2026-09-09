import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { persistAwardSimulation, syncAchievementCache } from "@/features/career/services/award-persistence.service";
import { simulateAwardSeason } from "@/features/season/services/award-simulator.service";

const rollbackMarker = "__AWARDS_INTEGRATION_ROLLBACK__";

async function main() {
  const playerId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.gameSession.create({ data: { id: sessionId, name: "Awards integration fixture", formation: "4-3-3", userId: `test-${sessionId}` } });
      await tx.careerPlayer.create({
        data: {
          id: playerId,
          gameSessionId: sessionId,
          slotIndex: 0,
          name: "Integration Player",
          nationality: "England",
          position: "CAM",
          height: 180,
          preferredFoot: "Right",
          debutAge: 18,
          retireAge: 35,
          careerLengthYears: 17,
          debutOvr: 80,
          peakOvr: 90,
          cardRarity: "rare_gold",
          statsTimeline: [{ age: 25, ovr: 90 }],
          clubStints: [],
          events: [],
          hiddenStats: { luckRating: 10, professionalism: 15, personality: "Balanced" },
        },
      });
      const season = await tx.careerSeason.create({ data: { careerPlayerId: playerId, seasonNumber: 1, age: 25, clubId: "integration-club", clubName: "Integration Club", leagueId: "TEST1", leagueName: "Test League" } });
      const simulation = simulateAwardSeason({
        seasonId: season.id,
        age: 25,
        randomSource: () => 0.5,
        player: {
          id: playerId,
          name: "Integration Player",
          position: "CAM",
          ovr: 90,
          clubName: "Integration Club",
          leagueName: "Test League",
          leaguePrestige: 4,
          leagueClubsCount: 8,
          leagueClubs: [
            { id: "integration-club", name: "Integration Club", prestige: 4 },
            { id: "integration-rival-1", name: "Integration Rival 1", prestige: 4 },
            { id: "integration-rival-2", name: "Integration Rival 2", prestige: 3 },
            { id: "integration-rival-3", name: "Integration Rival 3", prestige: 3 },
            { id: "integration-rival-4", name: "Integration Rival 4", prestige: 3 },
            { id: "integration-rival-5", name: "Integration Rival 5", prestige: 3 },
            { id: "integration-rival-6", name: "Integration Rival 6", prestige: 2 },
            { id: "integration-rival-7", name: "Integration Rival 7", prestige: 2 },
          ],
          standing: 1,
          leagueStats: { apps: 34, goals: 10, assists: 20, cleanSheets: 4, rating: 8.2 },
          domesticCupStats: { apps: 5, goals: 2, assists: 1, cleanSheets: 0, rating: 7.4 },
        },
      });
      await persistAwardSimulation({ tx, playerId, seasonId: season.id, age: 25, club: { id: "integration-club", name: "Integration Club", leagueId: "TEST1" }, simulation });
      await persistAwardSimulation({ tx, playerId, seasonId: season.id, age: 25, club: { id: "integration-club", name: "Integration Club", leagueId: "TEST1" }, simulation });
      const [honourCount, rankingCount] = await Promise.all([
        tx.careerHonour.count({ where: { careerPlayerId: playerId } }),
        tx.careerAwardRankingSnapshot.count({ where: { careerPlayerId: playerId } }),
      ]);
      assert.ok(rankingCount > 0, "ranking snapshots must persist");
      assert.equal(honourCount, new Set(simulation.honours.map((honour) => honour.awardInstanceKey)).size, "honours must be idempotent");
      const cache = await syncAchievementCache(tx, playerId);
      assert.equal(cache.seasonAwards.length, honourCount, "derived cache must reflect canonical honours");
      throw new Error(rollbackMarker);
    });
  } catch (error) {
    if (error instanceof Error && error.message === rollbackMarker) {
      console.log("awards persistence integration checks passed (transaction rolled back)");
      return;
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
