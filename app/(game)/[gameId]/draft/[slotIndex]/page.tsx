import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { FORMATION_SLOTS } from "@/types/squad";
import type { Formation } from "@/types/game";
import { DraftDrumScreen } from "@/features/wheel/components/DraftDrumScreen";

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

  // 1. Fetch game session
  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { id: true, name: true, formation: true },
  });
  if (!session) notFound();

  const formation = (session.formation as Formation) ?? "4-3-3";
  const slots     = FORMATION_SLOTS[formation];
  const slot      = slots[slotIndex];
  if (!slot) notFound();

  // 2. Fetch leagues and clubs for the lottery pools
  const leagues = await prisma.league.findMany({
    select: { id: true, name: true, country: true, prestige: true },
    orderBy: { name: "asc" },
  });

  const clubs = await prisma.club.findMany({
    select: { id: true, name: true, leagueId: true, prestige: true, continentalType: true },
    orderBy: { name: "asc" },
  });

  return (
    <DraftDrumScreen
      key={`${gameId}_${slotIndex}`}
      gameId={gameId}
      slotIndex={slotIndex}
      position={slot.position}
      leagues={leagues}
      clubs={clubs}
    />
  );
}
