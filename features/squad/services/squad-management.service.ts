import type { PrismaClient } from "@/app/generated/prisma/client";
import { FORMATION_SLOTS } from "@/types/squad";
import type { Formation } from "@/types/game";

export class SquadManagementError extends Error {}

export function emptyMatchingSlots(formation: string, occupied: number[], position: string) {
  return (FORMATION_SLOTS[formation as Formation] ?? []).filter((slot) => slot.position === position && !occupied.includes(slot.index));
}

export async function moveSquadPlayer(db: PrismaClient, ownerId: string, input: { gameId: string; playerId: string; targetId: string; slotIndex: number; replacement?: { id: string; updatedAt: string; confirmation: "DELETE" } | null }) {
  if (input.gameId === input.targetId) throw new SquadManagementError("invalidTarget");
  return db.$transaction(async (tx) => {
    // Both squads are locked in ID order so competing moves cannot spend the same turn or slot.
    await tx.$queryRaw`SELECT "id" FROM "game_sessions" WHERE "id" IN (${input.gameId}::uuid, ${input.targetId}::uuid) ORDER BY "id" FOR UPDATE`;
    const squads = await tx.gameSession.findMany({ where: { id: { in: [input.gameId, input.targetId] }, userId: ownerId }, select: { id: true, formation: true, playerMoveUsed: true, status: true } });
    const source = squads.find((squad) => squad.id === input.gameId);
    const target = squads.find((squad) => squad.id === input.targetId);
    if (!source || !target || !["in_progress", "completed"].includes(target.status)) throw new SquadManagementError("invalidTarget");
    if (source.playerMoveUsed) throw new SquadManagementError("moveUsed");
    const player = await tx.careerPlayer.findFirst({ where: { id: input.playerId, gameSessionId: source.id, isRetired: true, slotIndex: { gte: 0, lte: 10 } }, select: { id: true, position: true } });
    if (!player) throw new SquadManagementError("playerMissing");
    if (!(FORMATION_SLOTS[target.formation as Formation] ?? []).some((slot) => slot.index === input.slotIndex && slot.position === player.position)) throw new SquadManagementError("slotUnavailable");
    // Lock the actual occupant as well: an active career may update while the form is open.
    await tx.$queryRaw`SELECT "id" FROM "career_players" WHERE "gameSessionId" = ${target.id}::uuid AND "slotIndex" = ${input.slotIndex} FOR UPDATE`;
    const occupant = await tx.careerPlayer.findUnique({ where: { gameSessionId_slotIndex: { gameSessionId: target.id, slotIndex: input.slotIndex } }, select: { id: true, updatedAt: true } });
    if (occupant) {
      if (!input.replacement || input.replacement.confirmation !== "DELETE") throw new SquadManagementError("replacementRequired");
      if (input.replacement.id !== occupant.id || input.replacement.updatedAt !== occupant.updatedAt.toISOString()) throw new SquadManagementError("destinationChanged");
    } else if (input.replacement) throw new SquadManagementError("destinationChanged");
    await tx.careerEvent.create({ data: { careerPlayerId: player.id, type: "squad_player_moved", label: "Squad player moved", payload: { sourceId: source.id, targetId: target.id, slotIndex: input.slotIndex, replacedPlayerId: occupant?.id ?? null } } });
    if (occupant) await tx.careerPlayer.delete({ where: { id: occupant.id } });
    await tx.careerPlayer.update({ where: { id: player.id }, data: { gameSessionId: target.id, slotIndex: input.slotIndex, revision: { increment: 1 } } });
    await tx.gameSession.update({ where: { id: source.id }, data: { playerMoveUsed: true, status: "in_progress", squadRating: null } });
    const rating = target.status === "completed" ? await tx.careerPlayer.aggregate({ where: { gameSessionId: target.id, isRetired: true }, _count: true, _avg: { peakOvr: true } }) : null;
    const completed = rating?._count === 11;
    await tx.gameSession.update({ where: { id: target.id }, data: { status: completed ? "completed" : "in_progress", squadRating: completed ? Math.round(rating!._avg.peakOvr!) : null } });
    await tx.pveTournament.deleteMany({ where: { gameSessionId: { in: [source.id, target.id] }, userId: ownerId } });
    return { targetId: target.id };
  });
}

export async function removeSquadPlayer(db: PrismaClient, ownerId: string, gameId: string, playerId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "game_sessions" WHERE "id" = ${gameId}::uuid FOR UPDATE`;
    const squad = await tx.gameSession.findFirst({ where: { id: gameId, userId: ownerId }, select: { id: true } });
    if (!squad) throw new SquadManagementError("playerMissing");
    const player = await tx.careerPlayer.findFirst({ where: { id: playerId, gameSessionId: gameId, isRetired: true, slotIndex: { gte: 0, lte: 10 } }, select: { id: true, slotIndex: true } });
    if (!player) throw new SquadManagementError("playerMissing");
    await tx.pveTournament.deleteMany({ where: { gameSessionId: gameId, userId: ownerId } });
    await tx.careerPlayer.delete({ where: { id: player.id } });
    await tx.gameSession.update({ where: { id: gameId }, data: { status: "in_progress", squadRating: null } });
    return player.slotIndex;
  });
}

export async function deleteSquad(db: PrismaClient, ownerId: string, gameId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "game_sessions" WHERE "id" = ${gameId}::uuid FOR UPDATE`;
    const result = await tx.gameSession.deleteMany({ where: { id: gameId, userId: ownerId } });
    if (!result.count) throw new SquadManagementError("squadMissing");
  });
}

export async function completeSquad(db: PrismaClient, ownerId: string, gameId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "game_sessions" WHERE "id" = ${gameId}::uuid FOR UPDATE`;
    const squad = await tx.gameSession.findFirst({ where: { id: gameId, userId: ownerId }, select: { formation: true } });
    if (!squad) throw new SquadManagementError("squadMissing");
    const players = await tx.careerPlayer.findMany({ where: { gameSessionId: gameId }, select: { slotIndex: true, position: true, isRetired: true, peakOvr: true } });
    const slots = FORMATION_SLOTS[squad.formation as Formation];
    if (!slots || players.length !== 11 || !slots.every((slot) => players.some((player) => player.slotIndex === slot.index && player.position === slot.position && player.isRetired))) throw new SquadManagementError("incomplete");
    const squadRating = Math.round(players.reduce((sum, player) => sum + player.peakOvr, 0) / 11);
    await tx.gameSession.update({ where: { id: gameId }, data: { status: "completed", squadRating } });
  });
}
