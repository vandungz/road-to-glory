import assert from "node:assert/strict";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { completeTransferCommand } from "@/features/career/services/transfer-transition.service";
import { commandKey } from "@/features/career/services/transfer-market-authority.shared";
import { generateTransferMarketService } from "@/features/transfer/services/transfer.service";
import { secureRandom } from "@/lib/secure-random";

async function main() {
  const owner = crypto.randomUUID();
  const game = await prisma.gameSession.create({ data: { userId: owner, name: "Isolated renewal acceptance check" } });
  const originalRandomInt = crypto.randomInt;
  try {
    const club = await prisma.club.findUniqueOrThrow({ where: { id: "brighton" }, include: { league: true } });
    const stats = { age: 25, ovr: 80, pac: 80, sho: 80, pas: 80, dri: 80, def: 80, phy: 80 };
    const stints = [{ clubId: club.id, clubName: club.name, leagueId: club.leagueId, leagueName: club.league.name, startAge: 18, endAge: 25, yearsAtClub: 8 }];
    const player = await prisma.careerPlayer.create({ data: {
      gameSessionId: game.id, slotIndex: 0, name: "Renewal fixture", nationality: "England", position: "ST",
      height: 180, preferredFoot: "Right", debutAge: 18, retireAge: 36, careerLengthYears: 18,
      debutOvr: 80, peakOvr: 80, cardRarity: "gold", statsTimeline: [stats], clubStints: stints,
      events: [], hiddenStats: {}, currentAge: 25, currentStep: "transfer", currentWheel: "career", checkpointVersion: 2,
      contractYearsTotal: 3, contractYearsRemaining: 1, currentWageAnnual: 2000,
    } });
    const season = await prisma.careerSeason.create({ data: { careerPlayerId: player.id, seasonNumber: 1, age: 25, clubId: club.id, runtimeState: { yearSimResult: { matchRating: 7.5 } } } });
    const market = generateTransferMarketService({ currentClubId: club.id, currentClubPrestige: club.prestige,
      currentClubLeagueTier: club.league.tier, currentOvr: 80, currentStats: stats, currentAge: 25, retireAge: 36,
      matchRating: 7.5, goals: 20, assists: 10, cleanSheets: 0, position: "ST", contractYearsRemaining: 1,
      contractYearsTotal: 3, currentWageAnnual: 2000, randomSource: () => .1, wageRandomSource: () => .5,
      clubs: [{ id: club.id, name: club.name, prestige: club.prestige, leagueId: club.leagueId, leagueName: club.league.name, leagueTier: club.league.tier }],
    });
    assert.ok(market.renewal, "Fixture must contain a real generated renewal offer.");
    const marketCommand = await prisma.careerCommand.create({ data: { careerPlayerId: player.id, seasonId: season.id,
      commandType: "transfer_market", idempotencyKey: commandKey(player.id, season.id, "market:yes"),
      input: {}, result: market as unknown as Prisma.InputJsonValue, revisionBefore: 0, revisionAfter: 0 } });
    const input = { playerId: player.id, seasonId: season.id, expectedRevision: 0, idempotencyKey: crypto.randomUUID(), kind: "renewal" as const, clubId: club.id, wageOption: "standard" as const };
    await assert.rejects(completeTransferCommand({ input, userId: crypto.randomUUID() }), /không thuộc/);
    await assert.rejects(completeTransferCommand({ input: { ...input, wageOption: "higher" }, userId: owner }), /cố định/);
    await prisma.careerCommand.update({ where: { id: marketCommand.id }, data: { result: { ...market, renewal: null } as unknown as Prisma.InputJsonValue } });
    await assert.rejects(completeTransferCommand({ input, userId: owner }), /Chưa có offer gia hạn/);
    await prisma.careerCommand.update({ where: { id: marketCommand.id }, data: { result: market as unknown as Prisma.InputJsonValue } });
    await prisma.careerSeason.update({ where: { id: season.id }, data: { runtimeState: { yearSimResult: { matchRating: 7.5 }, transferNegotiation: { [club.id]: { failedWageOptions: ["standard", "higher"], cancelled: true } } } } });
    crypto.randomInt = () => { throw new Error("Published renewal acceptance must never draw randomness"); };
    assert.throws(() => secureRandom(), /must never draw randomness/, "The randomness probe must intercept the real resolver.");
    const result = await completeTransferCommand({ input, userId: owner });
    assert.equal(result.status, "accepted");
    if (result.status !== "accepted") throw new Error("Renewal was unexpectedly rejected");
    assert.equal(result.transfer.wageAnnual, market.renewal.wageAnnual);
    assert.equal(result.transfer.contractYears, market.renewal.contractYears);
    const after = await prisma.careerPlayer.findUniqueOrThrow({ where: { id: player.id } });
    assert.equal(after.currentStep, "resolved");
    assert.equal(after.revision, 1);
    assert.deepEqual(after.clubStints, stints);
    assert.equal(after.currentWageAnnual, market.renewal.wageAnnual);
    const replay = await completeTransferCommand({ input, userId: owner });
    assert.equal(replay.status, "accepted");
    if (replay.status === "accepted") assert.equal(replay.transfer.replayed, true);
    const afterReplay = await prisma.careerPlayer.findUniqueOrThrow({ where: { id: player.id } });
    assert.equal(afterReplay.walletBalance, after.walletBalance);
    assert.equal(afterReplay.revision, 1);
    assert.equal(await prisma.careerCommand.count({ where: { careerPlayerId: player.id, commandType: "transfer_complete" } }), 1);
    console.log("renewal-acceptance-check: passed (fixed terms, no RNG, ownership, missing offer, replay, wallet)");
  } finally {
    crypto.randomInt = originalRandomInt;
    await prisma.gameSession.delete({ where: { id: game.id } });
    await prisma.$disconnect();
    await (globalThis as unknown as { pool: { end: () => Promise<void> } }).pool.end();
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
