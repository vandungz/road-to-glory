"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// ============================================================
// TYPES
// ============================================================

interface PlayerUpdateInput {
  id: string;
  statsTimeline: any[];
  clubStints: any[];
  events: any[];
  slotIndex: number; // Nếu giải nghệ thì slotIndex = -1
}

interface SaveProgressParams {
  gameId: string;
  playersUpdate: PlayerUpdateInput[];
}

// ============================================================
// SERVER ACTION
// ============================================================

export async function saveSeasonProgress(params: SaveProgressParams) {
  const { gameId, playersUpdate } = params;

  console.log(`[saveSeasonProgress] Saving season progress for game: ${gameId}...`);

  // Thực hiện cập nhật hàng loạt qua transaction
  await prisma.$transaction(
    playersUpdate.map((player) =>
      prisma.careerPlayer.update({
        where: { id: player.id },
        data: {
          statsTimeline: player.statsTimeline,
          clubStints: player.clubStints,
          events: player.events,
          slotIndex: player.slotIndex,
        },
      })
    )
  );

  console.log(`[saveSeasonProgress] Successfully saved progression for ${playersUpdate.length} players.`);

  // Revalidate cache và điều hướng về trang Squad Board
  revalidatePath(`/${gameId}`);
  redirect(`/${gameId}`);
}

export async function completeGameSession(gameId: string) {
  console.log(`[completeGameSession] Completing game session: ${gameId}...`);

  const players = await prisma.careerPlayer.findMany({
    where: {
      gameSessionId: gameId,
      slotIndex: { gte: 0, lte: 10 },
    },
    select: { peakOvr: true },
  });

  const squadRating = players.length > 0 
    ? Math.round(players.reduce((sum, p) => sum + p.peakOvr, 0) / players.length)
    : 0;

  await prisma.gameSession.update({
    where: { id: gameId },
    data: {
      status: "completed",
      squadRating,
    },
  });

  revalidatePath(`/${gameId}`);
}
