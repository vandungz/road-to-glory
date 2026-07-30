"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { generateFictionalName } from "@/lib/name-gen";
import { checkRateLimit } from "@/lib/rate-limit";

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
// ZOD SCHEMAS — chặn payload sai kiểu/vượt biên gửi thẳng vào Server Action
// (không phải qua UI). Không thay thế được các wheel weight ở server tính
// đúng giá trị — chỉ chặn giá trị vô lý/injection, không chặn client "nói dối"
// trong biên hợp lệ (statsTimeline/hiddenStats vốn đã round-trip qua client).
// ============================================================

const POSITIONS = ["GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST", "LM", "RM"] as const;

const statSnapshotSchema = z.object({
  age: z.number().int().min(10).max(60),
  ovr: z.number().int().min(1).max(99),
}).catchall(z.number());

const clubStintSchema = z.object({
  clubId: z.string(),
  clubName: z.string(),
  leagueId: z.string(),
  leagueName: z.string(),
  startAge: z.number().int(),
  endAge: z.number().int(),
  yearsAtClub: z.number().int(),
  ovrAtJoining: z.number().int(),
  ovrAtLeaving: z.number().int(),
});

const hiddenStatsSchema = z.object({
  luckRating: z.number().int().min(1).max(20),
  professionalism: z.number().int().min(1).max(20),
  personality: z.string(),
});

const initCareerPlayerSchema = z.object({
  gameId: z.string().uuid(),
  slotIndex: z.number().int().min(0).max(10),
  position: z.enum(POSITIONS),
  name: z.string().min(1).max(60),
  nationality: z.string().min(1).max(60),
  debutAge: z.number().int().min(10).max(35),
  careerLength: z.number().int().min(1).max(30),
  debutOvr: z.number().int().min(1).max(99),
  height: z.number().int().min(100).max(230),
  weight: z.number().int().min(30).max(200),
  preferredFoot: z.enum(["Left", "Right", "Both"]),
  currentContinentalCup: z.string(),
  statsTimeline: z.array(statSnapshotSchema),
  clubStints: z.array(clubStintSchema),
  hiddenStats: hiddenStatsSchema,
});
type InitCareerParams = z.infer<typeof initCareerPlayerSchema>;

const saveCareerPlayerSchema = z.object({
  gameId: z.string().uuid(),
  slotIndex: z.number().int().min(0).max(10),
  position: z.enum(POSITIONS),
  name: z.string().min(1).max(60),
  nationality: z.string().min(1).max(60),
  debutAge: z.number().int().min(10).max(35),
  retireAge: z.number().int().min(10).max(70),
  careerLength: z.number().int().min(1).max(30),
  peakOvr: z.number().int().min(1).max(99).optional(),
  statsTimeline: z.array(statSnapshotSchema),
  clubStints: z.array(clubStintSchema),
  hiddenStats: hiddenStatsSchema,
  achievements: z.any().optional(),
  currentContinentalCup: z.string().optional(),
});
type SavePlayerParams = z.infer<typeof saveCareerPlayerSchema>;

const getCareerPlayerSchema = z.object({
  playerId: z.string().uuid(),
});

async function verifyGameOwnership(gameId: string): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await checkRateLimit(user.id);

  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { userId: true },
  });
  if (session?.userId !== user.id) throw new Error("Forbidden");

  return user.id;
}

export async function initCareerPlayerAction(input: unknown): Promise<{ id: string }> {
  const params: InitCareerParams = initCareerPlayerSchema.parse(input);
  await verifyGameOwnership(params.gameId);

  const {
    gameId, slotIndex, position, name, nationality,
    debutAge, careerLength, debutOvr, height, weight, preferredFoot,
    currentContinentalCup, statsTimeline, clubStints, hiddenStats,
  } = params;

  const player = await prisma.careerPlayer.upsert({
    where: { gameSessionId_slotIndex: { gameSessionId: gameId, slotIndex } },
    create: {
      gameSessionId: gameId,
      slotIndex,
      name,
      nationality,
      position,
      height,
      weight,
      preferredFoot,
      debutAge,
      retireAge: debutAge + careerLength,
      careerLengthYears: careerLength,
      debutOvr,
      peakOvr: debutOvr,
      cardRarity: "bronze",
      currentContinentalCup,
      statsTimeline,
      clubStints,
      events: [],
      hiddenStats,
      achievements: { ballonDor: 0, trophies: [], seasonAwards: [] },
    },
    update: {
      name,
      nationality,
      currentContinentalCup,
      statsTimeline,
      clubStints,
      hiddenStats,
    },
    select: { id: true },
  });

  return { id: player.id };
}

export async function getCareerPlayerAction(input: unknown) {
  const { playerId } = getCareerPlayerSchema.parse(input);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await checkRateLimit(user.id);

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
      achievements: true,
      seasonHistory: true,
      currentContinentalCup: true,
      // hiddenStats: không trả về client — invariant
    },
  });

  if (!player || player.gameSession.userId !== user.id) throw new Error("Forbidden");

  return player;
}

export async function saveCareerPlayer(input: unknown) {
  const params: SavePlayerParams = saveCareerPlayerSchema.parse(input);
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
    statsTimeline,
    clubStints,
    hiddenStats,
    achievements,
  } = params;

  // Server-derived peak — ignore client peakOvr (integrity)
  const peakOvr = Math.max(
    1,
    ...statsTimeline.map((s) => (typeof s?.ovr === "number" ? s.ovr : 0)),
  );
  const cardRarity = getCardRarity(peakOvr);

  await prisma.careerPlayer.upsert({
    where: { gameSessionId_slotIndex: { gameSessionId: gameId, slotIndex } },
    // height/weight/preferredFoot KHÔNG được set lại ở đây — đã roll đúng lúc
    // debut qua initCareerPlayerAction. Nhánh `create` dưới đây chỉ là fallback
    // phòng khi upsert chưa từng insert row (không nên xảy ra ở flow bình thường).
    create: {
      gameSessionId: gameId,
      slotIndex,
      name,
      nationality,
      position,
      height: 180,
      weight: 75,
      preferredFoot: "Right",
      debutAge,
      retireAge,
      careerLengthYears: careerLength,
      debutOvr: statsTimeline[0]?.ovr ?? 60,
      peakOvr,
      cardRarity,
      currentContinentalCup: params.currentContinentalCup ?? "none",
      statsTimeline,
      clubStints,
      events: [],
      hiddenStats,
      achievements: achievements ?? { ballonDor: 0, trophies: [], seasonAwards: [] },
      isRetired: true,
    },
    update: {
      name,
      nationality,
      position,
      debutAge,
      retireAge,
      careerLengthYears: careerLength,
      debutOvr: statsTimeline[0]?.ovr ?? 60,
      peakOvr,
      cardRarity,
      currentContinentalCup: params.currentContinentalCup ?? "none",
      statsTimeline,
      clubStints,
      hiddenStats,
      achievements: achievements ?? { ballonDor: 0, trophies: [], seasonAwards: [] },
      isRetired: true,
    },
  });

  // Revalidate cache và điều hướng về trang game session
  revalidatePath(`/${gameId}`);
  redirect(`/${gameId}`);
}
