"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { FORMATION_SLOTS } from "@/types/squad";
import type { MovePlayerSummary } from "@/types/squad";
import type { Formation } from "@/types/game";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser, requireGameOwnership } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import { deleteSquad, moveSquadPlayer, removeSquadPlayer, SquadManagementError } from "@/features/squad/services/squad-management.service";

const ids = { gameId: z.string().uuid(), playerId: z.string().uuid() };
function invalidate(ids: string[]) {
  for (const id of ids) { revalidatePath(`/classic/${id}`); revalidatePath(`/classic/${id}/draft`, "layout"); revalidatePath(`/${id}`); revalidatePath(`/pve/${id}`); }
  for (const path of ["/", "/classic", "/pve"]) revalidatePath(path);
}
async function failure(error: unknown) {
  const t = await getTranslations("squadManagement");
  return { success: false as const, error: t(error instanceof SquadManagementError ? error.message : "failed") };
}
export type ManageSquadPlayerResult = { success: true; slotIndex: number; mode: "replace" | "delete" } | { success: false; error: string };
export async function manageSquadPlayerAction(input: unknown): Promise<ManageSquadPlayerResult> {
  try {
    const { gameId, playerId, mode } = z.object({ ...ids, mode: z.enum(["replace", "delete"]) }).strict().parse(input);
    const owner = await requireGameOwnership(gameId); await checkRateLimit(owner.id);
    const slotIndex = await removeSquadPlayer(prisma, owner.id, gameId, playerId);
    invalidate([gameId]); return { success: true, slotIndex, mode };
  } catch (error) { return failure(error); }
}

export type MoveDestination = { id: string; name: string; formation: string; slots: { index: number; position: string; occupant?: MovePlayerSummary & { updatedAt: string } }[] };
export async function getPlayerMoveDestinationsAction(input: unknown): Promise<{ success: true; destinations: MoveDestination[] } | { success: false; error: string }> {
  try {
    const { gameId, playerId } = z.object(ids).strict().parse(input);
    const owner = await requireGameOwnership(gameId); await checkRateLimit(owner.id);
    const source = await prisma.gameSession.findFirst({ where: { id: gameId, userId: owner.id }, select: { playerMoveUsed: true } });
    if (!source || source.playerMoveUsed) throw new SquadManagementError("moveUsed");
    const player = await prisma.careerPlayer.findFirst({ where: { id: playerId, gameSessionId: gameId, isRetired: true }, select: { position: true } });
    if (!player) throw new SquadManagementError("playerMissing");
    const squads = await prisma.gameSession.findMany({ where: { userId: owner.id, id: { not: gameId }, status: { in: ["in_progress", "completed"] } }, select: { id: true, name: true, formation: true, players: { select: { id: true, slotIndex: true, name: true, updatedAt: true, position: true, peakOvr: true, nationality: true, portraitId: true } } }, orderBy: { createdAt: "desc" } });
    const destinations = squads.map((squad) => ({ id: squad.id, name: squad.name, formation: squad.formation, slots: (FORMATION_SLOTS[squad.formation as Formation] ?? []).filter((slot) => slot.position === player.position).map(({ index, position }) => {
      const occupant = squad.players.find((row) => row.slotIndex === index);
      return { index, position, ...(occupant ? { occupant: { id: occupant.id, name: occupant.name, updatedAt: occupant.updatedAt.toISOString(), position: occupant.position, peakOvr: occupant.peakOvr, nationality: occupant.nationality, portraitId: occupant.portraitId } } : {}) };
    }) })).filter((squad) => squad.slots.length > 0);
    return { success: true, destinations };
  } catch (error) { return failure(error); }
}

export async function moveSquadPlayerAction(input: unknown) {
  try {
    const parsed = z.object({ ...ids, targetId: z.string().uuid(), slotIndex: z.number().int().min(0).max(10), replacement: z.object({ id: z.string().uuid(), updatedAt: z.string().datetime(), confirmation: z.literal("DELETE") }).strict().nullable().optional() }).strict().parse(input);
    const owner = await requireAuthenticatedUser(); await checkRateLimit(owner.id);
    const result = await moveSquadPlayer(prisma, owner.id, parsed);
    invalidate([parsed.gameId, parsed.targetId]); return { success: true as const, ...result };
  } catch (error) { return failure(error); }
}

export async function deleteSquadAction(input: unknown) {
  try {
    const { gameId } = z.object({ gameId: z.string().uuid(), confirmation: z.literal("DELETE") }).strict().parse(input);
    const owner = await requireAuthenticatedUser(); await checkRateLimit(owner.id);
    await deleteSquad(prisma, owner.id, gameId); invalidate([gameId]); return { success: true as const };
  } catch (error) { return failure(error); }
}
