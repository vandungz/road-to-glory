import { prisma } from "../lib/prisma";

async function main() {
  try {
    const players = await prisma.careerPlayer.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        achievements: true,
      }
    });
    console.log("Success:", players);
  } catch (error) {
    console.error("Prisma error:", error);
  }
}

main();
