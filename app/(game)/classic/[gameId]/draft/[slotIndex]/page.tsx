import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { FORMATION_SLOTS } from "@/types/squad";
import type { Formation } from "@/types/game";
import { DraftDrumScreen } from "@/features/wheel/components/DraftDrumScreen";

const getCachedLeaguesAndClubs = unstable_cache(
  async () => {
    const [leagues, clubs] = await Promise.all([
      prisma.league.findMany({
        select: { id: true, name: true, country: true, prestige: true },
        orderBy: { name: "asc" },
      }),
      prisma.club.findMany({
        select: {
          id: true,
          name: true,
          leagueId: true,
          prestige: true,
          continentalType: true,
          league: { select: { tier: true, name: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);
    return { leagues, clubs };
  },
  ["leagues-clubs-pool-v2"],
  { revalidate: 3600 },
);

interface Props {
  params: Promise<{ gameId: string; slotIndex: string }>;
  searchParams: Promise<{ shopReturn?: string; transferReturn?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slotIndex } = await params;
  return { title: `Draft Vị Trí ${slotIndex} | Football Life` };
}

export default async function ClassicDraftSlotPage({ params, searchParams }: Props) {
  const { gameId, slotIndex: slotStr } = await params;
  const { shopReturn, transferReturn } = await searchParams;
  const slotIndex = parseInt(slotStr, 10);
  if (Number.isNaN(slotIndex) || slotIndex < 0 || slotIndex > 10) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { id: true, name: true, formation: true, userId: true },
  });
  if (!session || !user || session.userId !== user.id) notFound();

  const formation = (session.formation as Formation) ?? "4-3-3";
  const slot = (FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-3-3"])[slotIndex];
  if (!slot) notFound();

  const { leagues, clubs } = await getCachedLeaguesAndClubs();
  const inProgressPlayer = await prisma.careerPlayer.findFirst({
    where: { gameSessionId: gameId, slotIndex, isRetired: false },
    select: { id: true, currentContinentalCup: true },
  });

  return (
    <DraftDrumScreen
      key={`${gameId}_${slotIndex}`}
      gameId={gameId}
      slotIndex={slotIndex}
      gameName={session.name}
      position={slot.position}
      leagues={leagues}
      clubs={clubs}
      savedPlayerId={inProgressPlayer?.id}
      savedContinentalCup={inProgressPlayer?.currentContinentalCup}
      backHref={`/classic/${gameId}`}
      shopReturnAction={shopReturn === "advance" ? "advance" : shopReturn === "start" ? "start" : undefined}
      transferReturnAction={transferReturn === "advance" ? "advance" : transferReturn === "start" ? "start" : undefined}
    />
  );
}
