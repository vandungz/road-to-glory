import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

async function main(): Promise<void> {
  const testDatabaseUrl = process.env.CAREER_TEST_DATABASE_URL?.trim();
  if (!testDatabaseUrl) {
    console.log(
      "career-persistence-integration-check: skipped — set CAREER_TEST_DATABASE_URL to an isolated database copy.",
    );
    return;
  }

  // Import the Prisma singleton only after selecting the explicit test
  // database. The script refuses to use normal DATABASE_URL to avoid mutating
  // a live development/production database during concurrency checks.
  process.env.DATABASE_URL = testDatabaseUrl;
  const { prisma } = await import("@/lib/prisma");
  const { startCareerSeasonCommand, resolveWheelCheckpointCommand } = await import(
    "@/features/career/services/checkpoint.service"
  );
  const userId = `integration-user-${randomUUID()}`;
  const otherUserId = `integration-other-${randomUUID()}`;

  async function createFixture() {
    const club = await prisma.club.findFirst({
      select: { id: true, name: true, leagueId: true, league: { select: { name: true } } },
    });
    if (!club) throw new Error("Test database has no club reference data.");

    const game = await prisma.gameSession.create({
      data: { name: "checkpoint integration", formation: "4-3-3", userId },
    });
    const player = await prisma.careerPlayer.create({
      data: {
        gameSessionId: game.id,
        slotIndex: 0,
        name: "Integration Player",
        nationality: "England",
        position: "CM",
        height: 180,
        weight: 75,
        preferredFoot: "Right",
        debutAge: 18,
        retireAge: 28,
        careerLengthYears: 10,
        debutOvr: 60,
        peakOvr: 60,
        cardRarity: "bronze",
        currentContinentalCup: "none",
        statsTimeline: [{ age: 18, ovr: 60, pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60 }],
        clubStints: [{
          clubId: club.id,
          clubName: club.name,
          leagueId: club.leagueId,
          leagueName: club.league.name,
          startAge: 18,
          endAge: 18,
          yearsAtClub: 1,
          ovrAtJoining: 60,
          ovrAtLeaving: 60,
        }],
        events: [],
        hiddenStats: { luckRating: 10, professionalism: 10, personality: "Balanced" },
        achievements: { ballonDor: 0, trophies: [], seasonAwards: [] },
        seasonHistory: {},
        walletLedger: [],
        shopInventory: [],
        currentAge: 18,
        currentStep: "idle",
        currentWheel: "career",
        checkpointVersion: 2,
        revision: 0,
      },
    });
    return { gameId: game.id, playerId: player.id };
  }

  async function resolveInput(
    playerId: string,
    seasonId: string,
    stepKey: string,
    revision: number,
    key: string,
    nextStep = "domestic_cup",
    wheelType = "competition",
  ) {
    return resolveWheelCheckpointCommand({
      input: {
        playerId,
        seasonId,
        stepKey,
        wheelType,
        expectedRevision: revision,
        idempotencyKey: key,
      },
      userId,
      resolve: () => ({
        outcome: "integration-result",
        publicResult: "integration-result",
        nextStep,
      }),
    });
  }

  const fixtures: Array<{ gameId: string }> = [];
  try {
    const fixture = await createFixture();
    fixtures.push(fixture);
    const started = await startCareerSeasonCommand({
      playerId: fixture.playerId,
      expectedRevision: 0,
      userId,
    });
    assert.equal(started.revision, 1);

    const key = randomUUID();
    const [first, concurrentReplay] = await Promise.all([
      resolveInput(fixture.playerId, started.seasonId, "standing", 1, key),
      resolveInput(fixture.playerId, started.seasonId, "standing", 1, key),
    ]);
    assert.equal(first.checkpointId, concurrentReplay.checkpointId);
    assert.equal(first.outcome, concurrentReplay.outcome);
    assert.equal(concurrentReplay.replayed, true);

    const counts = await prisma.wheelCheckpoint.count({ where: { careerPlayerId: fixture.playerId } });
    assert.equal(counts, 1);
    await assert.rejects(
      () => resolveInput(fixture.playerId, started.seasonId, "domestic_cup", 1, randomUUID()),
      (error: unknown) => error && typeof error === "object" && "code" in error && error.code === "STALE_REVISION",
    );
    await assert.rejects(
      () => resolveWheelCheckpointCommand({
        input: {
          playerId: fixture.playerId,
          seasonId: started.seasonId,
          stepKey: "domestic_cup",
          wheelType: "competition",
          expectedRevision: 2,
          idempotencyKey: randomUUID(),
        },
        userId: otherUserId,
        resolve: () => ({ outcome: "must-not-run", nextStep: "season_stats" }),
      }),
      (error: unknown) => error && typeof error === "object" && "code" in error && error.code === "FORBIDDEN",
    );

    const repeatableFixture = await createFixture();
    fixtures.push(repeatableFixture);
    const repeatableSeason = await startCareerSeasonCommand({
      playerId: repeatableFixture.playerId,
      expectedRevision: 0,
      userId,
    });
    const repeatableSteps: Array<[string, string]> = [
      ["standing", "domestic_cup"],
      ["domestic_cup", "dir_increase"],
      ["dir_increase", "count"],
      ["count", "selector"],
      ["selector", "magnitude"],
      ["magnitude", "selector"],
      ["selector", "magnitude"],
      ["magnitude", "transfer"],
    ];
    let repeatableRevision = repeatableSeason.revision;
    for (const [stepKey, nextStep] of repeatableSteps) {
      await resolveInput(
        repeatableFixture.playerId,
        repeatableSeason.seasonId,
        stepKey,
        repeatableRevision,
        randomUUID(),
        nextStep,
        stepKey === "selector" || stepKey === "magnitude" ? "growth" : "competition",
      );
      repeatableRevision += 1;
    }
    assert.equal(
      await prisma.wheelCheckpoint.count({
        where: { careerPlayerId: repeatableFixture.playerId, stepKey: "selector" },
      }),
      2,
    );
    assert.equal(
      await prisma.wheelCheckpoint.count({
        where: { careerPlayerId: repeatableFixture.playerId, stepKey: "magnitude" },
      }),
      2,
    );

    const rollbackFixture = await createFixture();
    fixtures.push(rollbackFixture);
    const rollbackSeason = await startCareerSeasonCommand({
      playerId: rollbackFixture.playerId,
      expectedRevision: 0,
      userId,
    });
    await assert.rejects(() => resolveWheelCheckpointCommand({
      input: {
        playerId: rollbackFixture.playerId,
        seasonId: rollbackSeason.seasonId,
        stepKey: "standing",
        wheelType: "competition",
        expectedRevision: 1,
        idempotencyKey: randomUUID(),
      },
      userId,
      resolve: () => { throw new Error("forced resolver failure"); },
    }));
    const [rollbackPlayer, rollbackCheckpoints, rollbackEvents] = await Promise.all([
      prisma.careerPlayer.findUnique({ where: { id: rollbackFixture.playerId }, select: { revision: true } }),
      prisma.wheelCheckpoint.count({ where: { careerPlayerId: rollbackFixture.playerId } }),
      prisma.careerEvent.count({ where: { careerPlayerId: rollbackFixture.playerId } }),
    ]);
    assert.equal(rollbackPlayer?.revision, 1);
    assert.equal(rollbackCheckpoints, 0);
    assert.equal(rollbackEvents, 1); // season_started only; resolver event rolled back

    console.log("career-persistence-integration-check: passed");
  } finally {
    await prisma.gameSession.deleteMany({ where: { id: { in: fixtures.map((fixture) => fixture.gameId) } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("career-persistence-integration-check: failed", error);
  process.exitCode = 1;
});
