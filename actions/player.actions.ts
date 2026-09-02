"use server";

import { z } from "zod";
import type { Prisma } from "@/app/generated/prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { computeSeasonWalletIncome, buildWalletLedgerEntries, type WalletLedgerEntry } from "@/lib/wallet";
import { computeLegacyScore, computeCurrentFormIndex, computeInfluenceScore } from "@/lib/influence-score";

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
  contractYearsTotal: z.number().int().min(1).max(10).optional(),
  contractYearsRemaining: z.number().int().min(0).max(10).optional(),
  currentWageAnnual: z.number().int().min(0).optional(),
  marketValue: z.number().int().min(0).optional(),
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
  // Client resume không có hiddenStats (server-only invariant) → null khi save thẻ
  hiddenStats: hiddenStatsSchema.nullish(),
  achievements: z.any().optional(),
  currentContinentalCup: z.string().optional(),
  contractYearsTotal: z.number().int().min(0).max(10).optional(),
  contractYearsRemaining: z.number().int().min(0).max(10).optional(),
  currentWageAnnual: z.number().int().min(0).optional(),
  marketValue: z.number().int().min(0).optional(),
  isUnemployed: z.boolean().optional(),
  // Wallet & Influence, final season (docs/core-currency-shop-design.md §4/§3) —
  // was previously entirely missing from this action, so the retirement season's
  // seasonHistory (and now wallet/influence) never got persisted at all.
  seasonHistory: z.record(z.string(), z.any()).optional(),
  clubPrestige: z.number().int().min(1).max(5).optional(),
  matchRatingThisSeason: z.number().min(0).max(10).optional(),
  transferFeeThisSeason: z.number().int().min(0).optional(),
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
    contractYearsTotal = 3,
    contractYearsRemaining = 3,
    currentWageAnnual = 0,
    marketValue = 0,
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
      contractYearsTotal,
      contractYearsRemaining,
      currentWageAnnual,
      marketValue,
    },
    update: {
      name,
      nationality,
      currentContinentalCup,
      statsTimeline,
      clubStints,
      hiddenStats,
      contractYearsTotal,
      contractYearsRemaining,
      currentWageAnnual,
      marketValue,
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
      contractYearsTotal: true,
      contractYearsRemaining: true,
      currentWageAnnual: true,
      marketValue: true,
      isUnemployed: true,
      walletBalance: true,
      influenceScore: true,
      shopInventory: true,
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
    contractYearsTotal,
    contractYearsRemaining,
    currentWageAnnual,
    marketValue,
    isUnemployed,
    seasonHistory,
    clubPrestige,
    matchRatingThisSeason,
    transferFeeThisSeason,
  } = params;

  // Server-derived peak — ignore client peakOvr (integrity)
  const peakOvr = Math.max(
    1,
    ...statsTimeline.map((s) => (typeof s?.ovr === "number" ? s.ovr : 0)),
  );
  const cardRarity = getCardRarity(peakOvr);

  const contractData = {
    ...(contractYearsTotal !== undefined ? { contractYearsTotal } : {}),
    ...(contractYearsRemaining !== undefined ? { contractYearsRemaining } : {}),
    ...(currentWageAnnual !== undefined ? { currentWageAnnual } : {}),
    ...(marketValue !== undefined ? { marketValue } : {}),
    ...(isUnemployed !== undefined ? { isUnemployed } : {}),
  };

  // Giữ hiddenStats + walletLedger trong DB nếu client không gửi lại (resume/retire path)
  const existing = await prisma.careerPlayer.findUnique({
    where: { gameSessionId_slotIndex: { gameSessionId: gameId, slotIndex } },
    select: { hiddenStats: true, walletLedger: true },
  });
  let resolvedHiddenStats = hiddenStats ?? null;
  if (!resolvedHiddenStats) {
    resolvedHiddenStats = (existing?.hiddenStats as z.infer<typeof hiddenStatsSchema> | null) ?? {
      luckRating: 10,
      professionalism: 10,
      personality: "Balanced",
    };
  }

  // Wallet — final season's income (retirement checkpoint), server-authoritative.
  const income = computeSeasonWalletIncome({
    currentWageAnnual: currentWageAnnual ?? 0,
    transferFeeThisSeason,
  });
  const nextWalletLedger: WalletLedgerEntry[] = [
    ...((existing?.walletLedger as unknown as WalletLedgerEntry[] | undefined) ?? []),
    ...buildWalletLedgerEntries(retireAge, income),
  ];

  // Influence Score — final derive at retirement.
  const legacyScore = computeLegacyScore({
    trophies: achievements?.trophies,
    seasonHistory,
    ballonDorWins: achievements?.ballonDor,
    statsTimeline,
  });
  const currentFormIndex = computeCurrentFormIndex({
    currentOvr: statsTimeline.at(-1)?.ovr ?? peakOvr,
    peakOvr,
    matchRating: matchRatingThisSeason ?? 6.0,
    clubPrestige: clubPrestige ?? 2,
  });
  const influenceScore = computeInfluenceScore({
    legacyScore,
    currentFormIndex,
    currentAge: retireAge,
    debutAge,
    careerLength,
  });

  await prisma.careerPlayer.upsert({
    where: { gameSessionId_slotIndex: { gameSessionId: gameId, slotIndex } },
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
      hiddenStats: resolvedHiddenStats,
      achievements: achievements ?? { ballonDor: 0, trophies: [], seasonAwards: [] },
      seasonHistory: seasonHistory ?? {},
      isRetired: true,
      contractYearsTotal: contractYearsTotal ?? 1,
      contractYearsRemaining: contractYearsRemaining ?? 0,
      currentWageAnnual: currentWageAnnual ?? 0,
      marketValue: marketValue ?? 0,
      isUnemployed: isUnemployed ?? false,
      // No prior row to increment from in this branch — literal value.
      walletBalance: income.totalIncome,
      walletLedger: nextWalletLedger as unknown as Prisma.InputJsonValue,
      influenceScore,
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
      ...(hiddenStats ? { hiddenStats } : {}),
      achievements: achievements ?? { ballonDor: 0, trophies: [], seasonAwards: [] },
      ...(seasonHistory !== undefined ? { seasonHistory } : {}),
      isRetired: true,
      ...contractData,
      walletBalance: { increment: income.totalIncome },
      walletLedger: nextWalletLedger as unknown as Prisma.InputJsonValue,
      influenceScore,
    },
  });

  // Revalidate cache và điều hướng về trang game session
  revalidatePath(`/${gameId}`);
  redirect(`/${gameId}`);
}
