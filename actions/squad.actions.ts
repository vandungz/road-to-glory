"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { requireGameOwnership } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";

const managePlayerSchema = z.object({
  gameId: z.string().uuid(),
  playerId: z.string().uuid(),
  mode: z.enum(["replace", "delete"]),
}).strict();

export type ManageSquadPlayerResult =
  | { success: true; slotIndex: number; mode: "replace" | "delete" }
  | { success: false; error: string };

/**
 * Reopens a completed squad slot by removing its retired career record.
 * The delete is intentional: CareerPlayer owns the immutable career history,
 * so replacing a player must not leave an orphaned history in the squad.
 */
export async function manageSquadPlayerAction(input: unknown): Promise<ManageSquadPlayerResult> {
  const { gameId, playerId, mode } = managePlayerSchema.parse(input);
  const owner = await requireGameOwnership(gameId);
  await checkRateLimit(owner.id);

  const player = await prisma.careerPlayer.findFirst({
    where: { id: playerId, gameSessionId: gameId, isRetired: true, slotIndex: { gte: 0, lte: 10 } },
    select: { id: true, slotIndex: true },
  });
  if (!player) return { success: false, error: "Không tìm thấy cầu thủ trong đội hình này." };

  await prisma.$transaction([
    prisma.pveTournament.deleteMany({ where: { gameSessionId: gameId, userId: owner.id } }),
    prisma.careerPlayer.delete({ where: { id: player.id } }),
    prisma.gameSession.update({ where: { id: gameId }, data: { status: "in_progress", squadRating: null } }),
  ]);

  revalidatePath(`/classic/${gameId}`);
  revalidatePath(`/classic/${gameId}/draft/${player.slotIndex}`);
  revalidatePath(`/pve/${gameId}`);
  revalidatePath("/classic");
  revalidatePath("/pve");

  return { success: true, slotIndex: player.slotIndex, mode };
}
