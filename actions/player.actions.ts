"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateFictionalName } from "@/lib/name-gen";

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
}

export async function saveCareerPlayer(params: SavePlayerParams) {
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

  // 1. Sinh chiều cao & chân thuận
  const height = Math.floor(Math.random() * 26) + 170; // 170-195 cm
  const preferredFoot = Math.random() > 0.8 ? "Left" : "Right";
  const cardRarity = getCardRarity(peakOvr);

  // 2. Xóa cầu thủ cũ ở slot này (nếu có) để tránh lỗi trùng lặp Unique Index
  await prisma.careerPlayer.deleteMany({
    where: {
      gameSessionId: gameId,
      slotIndex,
    },
  });

  // 3. Lưu vào Database
  await prisma.careerPlayer.create({
    data: {
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
      statsTimeline,
      clubStints,
      events,
      hiddenStats,
      achievements: achievements ?? { ballonDor: 0, league: 0, cup: 0, continental: 0, international: 0 },
    },
  });

  // Revalidate cache và điều hướng về trang game session
  revalidatePath(`/${gameId}`);
  redirect(`/${gameId}`);
}
