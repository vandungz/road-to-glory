"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireGameOwnership } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import { secureRandom } from "@/lib/secure-random";
import { FORMATIONS, type Formation } from "@/types/game";
import { PVE_LINEUP_SIZE, type PveCatalogPlayer, type PvePlayerStats, type PveTournamentState } from "@/types/pve";
import {
  createPveTournamentState,
  isPveTournamentState,
  resolvePveRound,
  type PveClubInput,
  type PveUserPlayerInput,
} from "@/features/pve/services/pve-engine.service";
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

  const [players, catalog, clubs] = await Promise.all([
    prisma.careerPlayer.findMany({
      where: { gameSessionId: gameId, isRetired: true },
      orderBy: { slotIndex: "asc" },
      select: { slotIndex: true, position: true, peakOvr: true, statsTimeline: true },
    }),
    prisma.pvePlayer.findMany({ orderBy: { id: "asc" } }),
    prisma.club.findMany({ where: { league: { tier: { in: [1, 2] } } }, select: { id: true, name: true, prestige: true }, orderBy: { id: "asc" } }),
  ]);
  if (players.length !== PVE_LINEUP_SIZE) throw new Error("Đội hình Classic cần đủ 11 cầu thủ đã hoàn thành.");
  if (catalog.length < PVE_LINEUP_SIZE || clubs.length < 4) throw new Error("Dữ liệu PvE chưa được seed đầy đủ.");

  return {
    formation: readFormation(session.formation),
    players,
    catalog: catalog.map((player) => ({
      id: player.id,
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
  return { success: true, state: stateFromDatabase(existing.state) };
}

export async function getPveTournamentAction(input: unknown): Promise<PveReadResult> {
  const { gameId } = pveInputSchema.parse(input);
  const owner = await requireGameOwnership(gameId);
  await checkRateLimit(owner.id);
  const tournament = await prisma.pveTournament.findUnique({ where: { gameSessionId: gameId }, select: { state: true } });
  return { success: true, state: tournament ? stateFromDatabase(tournament.state) : null };
}

export async function startPveTournamentAction(input: unknown): Promise<PveActionResult> {
  const { gameId } = pveInputSchema.parse(input);
  const owner = await requireGameOwnership(gameId);
  await checkRateLimit(owner.id);
  const existing = await prisma.pveTournament.findUnique({ where: { gameSessionId: gameId }, select: { state: true } });
  if (existing) return { success: true, state: stateFromDatabase(existing.state) };

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
