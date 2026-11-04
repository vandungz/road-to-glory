import type { Prisma } from "../app/generated/prisma/client";
import { prisma } from "../lib/prisma";
import { PVE_PLAYERS } from "../prisma/data/pve-players";

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.pvePlayer.deleteMany({});
    await tx.pvePlayer.createMany({
      data: PVE_PLAYERS.map((player) => ({ ...player, stats: player.stats as unknown as Prisma.InputJsonValue })),
    });
  });
  console.log(`Seeded ${PVE_PLAYERS.length} UEFA 2026/27 PvE players.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
