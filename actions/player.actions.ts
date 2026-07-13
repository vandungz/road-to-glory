"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { generateFictionalName } from "@/lib/name-gen";
import { resolveRandom, resolveRandomInt } from "@/lib/wheel-engine/spin-resolver";

// ============================================================
// HELPERS
// ============================================================

function getCardRarity(peak: number): string {
  if (peak < 65) return "bronze";
  if (peak < 75) return "silver";
  if (peak < 85) return "gold";
  if (peak < 90) return "rare_gold";
  if (peak < 95) return "epic";
  return "legendary";
}

// ============================================================
// SERVER ACTION
// ============================================================

interface InitCareerParams {
  gameId: string;
  slotIndex: number;
  position: string;
  name: string;
  nationality: string;
  debutAge: number;
  careerLength: number;
  debutOvr: number;
  currentContinentalCup: string;
  statsTimeline: any[];
  clubStints: any[];
  events: any[];
  hiddenStats: any;
}

interface SavePlayerParams {
  gameId: string;
  slotIndex: number;
  position: string;
  name: string;
  nationality: string;
  debutAge: number;
  retireAge: number;
  careerLength: number;
  peakOvr: number;
  statsTimeline: any[];
  clubStints: any[];
  events: any[];
  hiddenStats: any;
  achievements?: any;
  currentContinentalCup?: string;
}

async function verifyGameOwnership(gameId: string): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { userId: true },
  });
  if (session?.userId !== user.id) throw new Error("Forbidden");

  return user.id;
}

export async function initCareerPlayerAction(params: InitCareerParams): Promise<{ id: string }> {
  await verifyGameOwnership(params.gameId);

  const {
    gameId, slotIndex, position, name, nationality,
    debutAge, careerLength, debutOvr, currentContinentalCup,
    statsTimeline, clubStints, events, hiddenStats,
  } = params;

  const player = await prisma.careerPlayer.upsert({
    where: { gameSessionId_slotIndex: { gameSessionId: gameId, slotIndex } },
    create: {
      gameSessionId: gameId,
      slotIndex,
      name,
      nationality,
      position,
      height: 175,
      preferredFoot: "Right",
      debutAge,
      retireAge: debutAge + careerLength,
      careerLengthYears: careerLength,
      debutOvr,
      peakOvr: debutOvr,
      cardRarity: "bronze",
      currentContinentalCup,
      statsTimeline,
      clubStints,
      events,
      hiddenStats,
      achievements: { ballonDor: 0, leagues: {}, cups: {}, continentals: {}, internationals: {} },
    },
    update: {
      name,
      nationality,
      currentContinentalCup,
      statsTimeline,
      clubStints,
      events,
      hiddenStats,
    },
    select: { id: true },
  });

  return { id: player.id };
}

export async function getCareerPlayerAction(input: unknown) {
  const { playerId } = (input as any);
  if (!playerId || typeof playerId !== "string") throw new Error("Invalid playerId");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const player = await prisma.careerPlayer.findUnique({
    where: { id: playerId },
    select: {
      gameSession: { select: { userId: true } },
      name: true,
      nationality: true,
      debutAge: true,
      careerLengthYears: true,
      statsTimeline: true,
      clubStints: true,
      events: true,
      achievements: true,
      currentContinentalCup: true,
      // hiddenStats: không trả về client — invariant
    },
  });

  if (!player || player.gameSession.userId !== user.id) throw new Error("Forbidden");

  return player;
}

export async function saveCareerPlayer(params: SavePlayerParams) {
  await verifyGameOwnership(params.gameId);

  const {
    gameId,
    slotIndex,
    position,
    name,
    nationality,
    debutAge,
    retireAge,
    careerLength,
    peakOvr,
    statsTimeline,
    clubStints,
    events,
    hiddenStats,
    achievements,
  } = params;

  const height = resolveRandomInt(170, 195);
  const preferredFoot = resolveRandom() > 0.8 ? "Left" : "Right";
  const cardRarity = getCardRarity(peakOvr);

  await prisma.careerPlayer.upsert({
    where: { gameSessionId_slotIndex: { gameSessionId: gameId, slotIndex } },
    create: {
      gameSessionId: gameId,
      slotIndex,
      name,
      nationality,
      position,
      height,
      preferredFoot,
      debutAge,
      retireAge,
      careerLengthYears: careerLength,
      debutOvr: statsTimeline[0]?.ovr ?? 60,
      peakOvr,
      cardRarity,
      currentContinentalCup: params.currentContinentalCup ?? "none",
      statsTimeline,
      clubStints,
      events,
      hiddenStats,
      achievements: achievements ?? { ballonDor: 0, leagues: {}, cups: {}, continentals: {}, internationals: {} },
      isRetired: true,
    },
    update: {
      name,
      nationality,
      position,
      height,
      preferredFoot,
      debutAge,
      retireAge,
      careerLengthYears: careerLength,
      debutOvr: statsTimeline[0]?.ovr ?? 60,
      peakOvr,
      cardRarity,
      currentContinentalCup: params.currentContinentalCup ?? "none",
      statsTimeline,
      clubStints,
      events,
      hiddenStats,
      achievements: achievements ?? { ballonDor: 0, leagues: {}, cups: {}, continentals: {}, internationals: {} },
      isRetired: true,
    },
  });

  // Revalidate cache và điều hướng về trang game session
  revalidatePath(`/${gameId}`);
  redirect(`/${gameId}`);
}
