import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/shared/AppShell";
import { PveTournamentScreen } from "@/features/pve/components/PveTournamentScreen";
import { FORMATIONS, type Formation } from "@/types/game";
import { isPveTournamentState } from "@/features/pve/services/pve-engine.service";
import type { PveTournamentState } from "@/types/pve";

interface Props { params: Promise<{ gameId: string }> }

export async function generateMetadata(): Promise<Metadata> { return { title: "PvE Tournament | Football Life" }; }

export default async function PveTournamentPage({ params }: Props) {
  const { gameId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { id: true, name: true, formation: true, status: true, squadRating: true, userId: true, players: { where: { isRetired: true }, select: { id: true } }, pveTournament: { select: { state: true } } },
  });
  if (!user || !session || session.userId !== user.id || session.status !== "completed" || session.players.length !== 11) notFound();
  const formation = (FORMATIONS as readonly string[]).includes(session.formation) ? session.formation as Formation : "4-3-3";
  const initialState = session.pveTournament && isPveTournamentState(session.pveTournament.state) ? session.pveTournament.state as PveTournamentState : null;
  return <AppShell className="football-pve-tournament-shell" userEmail={user.email} headerIdentityMeta={<span>PvE · {formation}</span>}><PveTournamentScreen gameId={gameId} sessionName={session.name} formation={formation} squadRating={session.squadRating} initialState={initialState} /></AppShell>;
}
