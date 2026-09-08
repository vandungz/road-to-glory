import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shared/AppShell";
import { SquadDashboard } from "@/features/squad/components/SquadDashboard";
import { FORMATION_SLOTS } from "@/types/squad";
import type { ClientSafePlayer } from "@/types/squad";
import type { Formation } from "@/types/game";
import { recoverLegacyOvrByAge } from "@/features/career/services/career-summary.service";

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

export default async function ClassicSquadBoardPage({ params }: Props) {
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
          seasonHistory: true,
          achievements: true,
        },
      },
    },
  });

  if (!session || !user || session.userId !== user.id) notFound();

  const formation = (session.formation as Formation) ?? "4-3-3";
  const slots = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-3-3"];
  const allPlayers = session.players as unknown as ClientSafePlayer[];
  const playerIds = allPlayers.map((player) => player.id);
  const archiveSeasons = playerIds.length > 0
    ? await prisma.careerSeason.findMany({
        where: { careerPlayerId: { in: playerIds } },
        orderBy: { age: "asc" },
        select: { careerPlayerId: true, age: true, summary: true, runtimeState: true },
      })
    : [];
  const seasonsByPlayer = new Map<string, typeof archiveSeasons>();
  for (const season of archiveSeasons) {
    const seasons = seasonsByPlayer.get(season.careerPlayerId) ?? [];
    seasons.push(season);
    seasonsByPlayer.set(season.careerPlayerId, seasons);
  }
  const players = allPlayers.map((player) => {
    const archiveOvrByAge = recoverLegacyOvrByAge({
      position: player.position,
      debutAge: player.debutAge ?? 18,
      retireAge: player.retireAge ?? 35,
      seasonHistory: player.seasonHistory,
      statsTimeline: player.statsTimeline ?? [],
      seasons: seasonsByPlayer.get(player.id) ?? [],
    });
    return Object.keys(archiveOvrByAge).length > 0 ? { ...player, archiveOvrByAge } : player;
  });
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
        players={players}
        slots={slots}
        inProgressSlots={inProgressPlayers.map((player) => player.slotIndex)}
        draftBasePath={`/classic/${gameId}`}
      />
    </AppShell>
  );
}
