import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shared/AppShell";
import { SquadDashboard } from "@/features/squad/components/SquadDashboard";
import { FORMATION_SLOTS } from "@/types/squad";
import type { ClientSafePlayer } from "@/types/squad";
import type { Formation } from "@/types/game";

interface Props {
  params: Promise<{ gameId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gameId } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { name: true },
  });
  return {
    title: session ? `${session.name} — Đội hình | Football Life` : "Đội hình | Football Life",
  };
}

export default async function SquadBoardPage({ params }: Props) {
  const { gameId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      name: true,
      formation: true,
      status: true,
      squadRating: true,
      userId: true,
      players: {
        where: { isRetired: true },
        orderBy: { slotIndex: "asc" },
        select: {
          id: true,
          slotIndex: true,
          name: true,
          nationality: true,
          position: true,
          peakOvr: true,
          cardRarity: true,
          height: true,
          weight: true,
          preferredFoot: true,
          debutAge: true,
          retireAge: true,
          careerLengthYears: true,
          statsTimeline: true,
          clubStints: true,
          achievements: true,
          honours: {
            orderBy: [{ age: "asc" }, { rank: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              seasonId: true,
              age: true,
              seasonLabel: true,
              category: true,
              awardKey: true,
              scope: true,
              scopeKey: true,
              slotKey: true,
              rank: true,
              result: true,
              label: true,
              clubName: true,
              metrics: true,
              source: true,
            },
          },
        },
      },
    },
  });

  if (!session || !user || session.userId !== user.id) notFound();

  const formation = (session.formation as Formation) ?? "4-3-3";
  const slots = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-3-3"];
  const allPlayers = session.players as unknown as ClientSafePlayer[];
  const inProgressPlayers = await prisma.careerPlayer.findMany({
    where: { gameSessionId: gameId, isRetired: false },
    select: { slotIndex: true },
  });

  return (
    <AppShell
      className="rtg-squad-board-shell"
      backHref="/classic"
      backLabel="Đội hình"
      userEmail={user.email}
      headerIdentityMeta={<span className="rtg-app-shell__season">Classic · {formation}</span>}
      headerMeta={<span className="rtg-app-shell__squad-formation">{formation}</span>}
    >
      <SquadDashboard
        gameId={gameId}
        formation={formation}
        status={session.status}
        squadRating={session.squadRating}
        sessionName={session.name}
        players={allPlayers}
        slots={slots}
        inProgressSlots={inProgressPlayers.map((player) => player.slotIndex)}
      />
    </AppShell>
  );
}
