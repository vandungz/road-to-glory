import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { FORMATION_SLOTS } from "@/types/squad";
import type { Formation } from "@/types/game";
import { DraftDrumScreen } from "@/features/wheel/components/DraftDrumScreen";

// Clubs & leagues không đổi thường xuyên — cache 1 giờ, revalidate khi có seed mới
const getCachedLeaguesAndClubs = unstable_cache(
  async () => {
    const [leagues, clubs] = await Promise.all([
      prisma.league.findMany({
        select: { id: true, name: true, country: true, prestige: true },
        orderBy: { name: "asc" },
      }),
      prisma.club.findMany({
        select: { id: true, name: true, leagueId: true, prestige: true, continentalType: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return { leagues, clubs };
  },
  ["leagues-clubs-pool"],
  { revalidate: 3600 }
);

interface Props {
  params: Promise<{ gameId: string; slotIndex: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slotIndex } = await params;
  return { title: `Draft Vị Trí ${slotIndex} | Football Life` };
}

export default async function DraftSlotPage({ params }: Props) {
  const { gameId, slotIndex: slotStr } = await params;
  const slotIndex = parseInt(slotStr, 10);

  if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > 10) notFound();

  // 1. Fetch game session + verify ownership
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { id: true, name: true, formation: true, userId: true },
  });
  if (!session) notFound();
  if (session.userId !== user!.id) notFound();

  const formation = (session.formation as Formation) ?? "4-3-3";
  const slots     = FORMATION_SLOTS[formation];
  const slot      = slots[slotIndex];
  if (!slot) notFound();

  // 2. Fetch leagues and clubs (cached — data changes only on re-seed)
  const { leagues, clubs } = await getCachedLeaguesAndClubs();

  // 3. Check for in-progress career player at this slot (exclude retired players)
  const inProgressPlayer = await prisma.careerPlayer.findFirst({
    where: { gameSessionId: gameId, slotIndex, isRetired: false },
    select: { id: true, currentContinentalCup: true },
  });

  return (
    <DraftDrumScreen
      key={`${gameId}_${slotIndex}`}
      gameId={gameId}
      slotIndex={slotIndex}
      position={slot.position}
      leagues={leagues}
      clubs={clubs}
      savedPlayerId={inProgressPlayer?.id}
      savedContinentalCup={inProgressPlayer?.currentContinentalCup}
    />
  );
}
