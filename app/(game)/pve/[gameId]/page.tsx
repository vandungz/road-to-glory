import { notFound } from "next/navigation";
import { isGameId } from "@/lib/route-params";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/shared/AppShell";
import { PveTournamentScreen } from "@/features/pve/components/PveTournamentScreen";
import { FORMATIONS, type Formation } from "@/types/game";
import { isCurrentPveTournamentState } from "@/features/pve/services/pve-engine.service";
import type { PveTournamentState } from "@/types/pve";

interface Props { params: Promise<{ gameId: string }> }

export async function generateMetadata(): Promise<Metadata> { return { title: "PvE Tournament | Football Life" }; }

export default async function PveTournamentPage({ params }: Props) {
  const { gameId } = await params;
  if (!isGameId(gameId)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { id: true, name: true, formation: true, status: true, squadRating: true, userId: true, players: { where: { isRetired: true }, select: { id: true, slotIndex: true, name: true, position: true, peakOvr: true } }, pveTournament: { select: { state: true } } },
  });
  if (!session || session.userId !== user.id || session.status !== "completed" || session.players.length !== 11) notFound();
  const formation = (FORMATIONS as readonly string[]).includes(session.formation) ? session.formation as Formation : "4-3-3";
  const initialState = session.pveTournament && isCurrentPveTournamentState(session.pveTournament.state) ? session.pveTournament.state as PveTournamentState : null;
  return <AppShell className="football-pve-tournament-shell" headerIdentityMeta={<span>PvE Tournament</span>}><PveTournamentScreen gameId={gameId} sessionName={session.name} formation={formation} squadRating={session.squadRating} userPlayers={session.players.map((player) => ({ ...player, overall: player.peakOvr }))} initialState={initialState} /></AppShell>;
}
