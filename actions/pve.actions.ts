"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireGameOwnership } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import { secureRandom } from "@/lib/secure-random";
import { FORMATIONS, type Formation } from "@/types/game";
import { PVE_LINEUP_SIZE, type PveCatalogPlayer, type PvePlayerStats, type PveTournamentState } from "@/types/pve";
import { PVE_CLUBS } from "@/prisma/data/pve-clubs";
import {
  createPveTournamentState,
  isCurrentPveTournamentState,
  isPveTournamentState,
  resolvePveRound,
  type PveUserPlayerInput,
} from "@/features/pve/services/pve-engine.service";
import type { PveClubInput } from "@/types/pve";
import { z } from "zod/v4";

const pveInputSchema = z.object({ gameId: z.string().uuid() }).strict();

export type PveActionResult =
  | { success: true; state: PveTournamentState }
  | { success: false; error: string };

export type PveReadResult =
  | { success: true; state: PveTournamentState | null }
  | { success: false; error: string };

function readFormation(value: string): Formation {
  return (FORMATIONS as readonly string[]).includes(value) ? value as Formation : "4-3-3";
}

function stateFromDatabase(value: unknown): PveTournamentState {
  if (!isPveTournamentState(value)) throw new Error("Dữ liệu giải PvE không hợp lệ.");
  return value;
}

async function readPveInputs(gameId: string): Promise<{
  formation: Formation;
  players: PveUserPlayerInput[];
  catalog: PveCatalogPlayer[];
  clubs: PveClubInput[];
}> {
  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { formation: true, status: true },
  });
  if (!session || session.status !== "completed") throw new Error("Chỉ có thể đưa đội hình Classic đã hoàn thành vào PvE.");

  const [players, catalog] = await Promise.all([
    prisma.careerPlayer.findMany({
      where: { gameSessionId: gameId, isRetired: true },
      orderBy: { slotIndex: "asc" },
      select: { slotIndex: true, position: true, peakOvr: true, statsTimeline: true },
    }),
    prisma.pvePlayer.findMany({ where: { clubId: { not: "" } }, orderBy: { id: "asc" } }),
  ]);
  const clubs = PVE_CLUBS;
  if (players.length !== PVE_LINEUP_SIZE) throw new Error("Đội hình Classic cần đủ 11 cầu thủ đã hoàn thành.");
  const playableClubs = clubs.filter((club) => catalog.filter((player) => player.clubId === club.id).length >= PVE_LINEUP_SIZE);
  if (catalog.length < PVE_LINEUP_SIZE || playableClubs.length < 4) throw new Error("Dữ liệu PvE chưa được seed đủ CLB có đội hình 11 người.");

  return {
    formation: readFormation(session.formation),
    players,
    catalog: catalog.map((player) => ({
      id: player.id,
      clubId: player.clubId,
      clubName: player.clubName,
      name: player.name,
      nationality: player.nationality,
      position: player.position,
      eraStart: player.eraStart,
      eraEnd: player.eraEnd,
      overall: player.overall,
      stats: player.stats as unknown as PvePlayerStats,
    })),
    clubs,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function readExistingTournament(gameId: string): Promise<PveActionResult> {
  const existing = await prisma.pveTournament.findUnique({ where: { gameSessionId: gameId }, select: { state: true } });
  if (!existing) return { success: false, error: "Không thể tạo giải PvE. Vui lòng thử lại." };
  const state = stateFromDatabase(existing.state);
  if (!isCurrentPveTournamentState(state)) return { success: false, error: "Giải PvE cũ cần được khởi tạo lại." };
  return { success: true, state };
}

export async function getPveTournamentAction(input: unknown): Promise<PveReadResult> {
  const { gameId } = pveInputSchema.parse(input);
  const owner = await requireGameOwnership(gameId);
  await checkRateLimit(owner.id);
  const tournament = await prisma.pveTournament.findUnique({ where: { gameSessionId: gameId }, select: { id: true, state: true } });
  if (!tournament) return { success: true, state: null };
  const state = stateFromDatabase(tournament.state);
  if (!isCurrentPveTournamentState(state)) {
    await prisma.pveTournament.delete({ where: { id: tournament.id } });
    revalidatePath(`/pve/${gameId}`);
    revalidatePath("/pve");
    return { success: true, state: null };
  }
  return { success: true, state };
}

export async function startPveTournamentAction(input: unknown): Promise<PveActionResult> {
  const { gameId } = pveInputSchema.parse(input);
  const owner = await requireGameOwnership(gameId);
  await checkRateLimit(owner.id);
  const existing = await prisma.pveTournament.findUnique({ where: { gameSessionId: gameId }, select: { id: true, state: true } });
  if (existing) {
    const existingState = stateFromDatabase(existing.state);
    if (isCurrentPveTournamentState(existingState)) return { success: true, state: existingState };
    await prisma.pveTournament.delete({ where: { id: existing.id } });
  }

  const { formation, players, catalog, clubs } = await readPveInputs(gameId);
  const state = createPveTournamentState(formation, players, catalog, clubs, secureRandom);
  try {
    await prisma.pveTournament.create({
      data: {
        gameSessionId: gameId,
        userId: owner.id,
        status: state.status,
        state: state as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) return readExistingTournament(gameId);
    throw error;
  }
  revalidatePath(`/pve/${gameId}`);
  revalidatePath("/pve");
  return { success: true, state };
}

export async function playPveRoundAction(input: unknown): Promise<PveActionResult> {
  const { gameId } = pveInputSchema.parse(input);
  const owner = await requireGameOwnership(gameId);
  await checkRateLimit(owner.id);
  const tournament = await prisma.pveTournament.findUnique({
    where: { gameSessionId: gameId },
    select: { id: true, status: true, revision: true, state: true },
  });
  if (!tournament) return { success: false, error: "Giải PvE chưa được khởi tạo." };
  const state = stateFromDatabase(tournament.state);
  if (!isCurrentPveTournamentState(state)) return { success: false, error: "Giải PvE cũ đã hết hiệu lực. Hãy mở lại giải để bốc thăm dữ liệu mới." };
  if (tournament.status !== state.status) throw new Error("PvE tournament status mismatch.");
  const { players, catalog, clubs } = await readPveInputs(gameId);
  const nextState = resolvePveRound(state, players, catalog, clubs, secureRandom);
  const updated = await prisma.pveTournament.updateMany({
    where: { id: tournament.id, revision: tournament.revision, status: state.status },
    data: { revision: { increment: 1 }, status: nextState.status, state: nextState as unknown as Prisma.InputJsonValue },
  });
  if (updated.count === 0) {
    const current = await prisma.pveTournament.findUnique({ where: { id: tournament.id }, select: { state: true } });
    if (!current) return { success: false, error: "Không thể đọc lại kết quả PvE." };
    return { success: true, state: stateFromDatabase(current.state) };
  }
  revalidatePath(`/pve/${gameId}`);
  revalidatePath("/pve");
  return { success: true, state: nextState };
}

export async function replayPveTournamentAction(input: unknown): Promise<PveReadResult> {
  const { gameId } = pveInputSchema.parse(input);
  const owner = await requireGameOwnership(gameId);
  await checkRateLimit(owner.id);

  const tournament = await prisma.pveTournament.findUnique({
    where: { gameSessionId: gameId },
    select: { id: true, revision: true, status: true, state: true },
  });
  if (!tournament) return { success: false, error: "Giải PvE chưa được khởi tạo." };

  const state = stateFromDatabase(tournament.state);
  if (!isCurrentPveTournamentState(state)) return { success: false, error: "Giải PvE cũ đã hết hiệu lực. Hãy mở lại giải để tạo lại dữ liệu mới." };
  if (state.status !== "eliminated" && state.status !== "champion") {
    return { success: false, error: "Chỉ có thể chơi lại sau khi giải đã kết thúc." };
  }

  await readPveInputs(gameId);
  const reset = await prisma.pveTournament.deleteMany({
    where: { id: tournament.id, revision: tournament.revision, status: tournament.status },
  });
  if (reset.count === 0) return { success: false, error: "Giải PvE vừa được cập nhật. Vui lòng tải lại trang." };
  revalidatePath(`/pve/${gameId}`);
  revalidatePath("/pve");
  return { success: true, state: null };
}
