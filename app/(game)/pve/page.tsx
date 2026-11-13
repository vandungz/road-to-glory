import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/shared/AppShell";
import { PveLobby } from "@/features/pve/components/PveLobby";
import { FORMATIONS, type Formation } from "@/types/game";
import { PVE_ROUNDS, type PveStatus } from "@/types/pve";
import { isCurrentPveTournamentState } from "@/features/pve/services/pve-engine.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "PvE Tournament | Football Life" };

export default async function PveLobbyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const sessions = await prisma.gameSession.findMany({
    where: { userId: user.id, status: "completed" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, formation: true, squadRating: true, players: { where: { isRetired: true }, select: { id: true } }, pveTournament: { select: { state: true } } },
  });
  const cards = sessions.filter((session) => session.players.length === 11).map((session) => {
    const formation = (FORMATIONS as readonly string[]).includes(session.formation) ? session.formation as Formation : "4-3-3";
    const state = session.pveTournament?.state;
    const tournamentStatus = isCurrentPveTournamentState(state) && ([...PVE_ROUNDS, "champion", "eliminated"] as string[]).includes(state.status) ? state.status as PveStatus : null;
    return { gameId: session.id, name: session.name, formation, squadRating: session.squadRating, playerCount: session.players.length, tournamentStatus };
  });
  return <AppShell className="football-pve-lobby-shell" headerIdentityMeta={<span>PvE Tournament</span>}><PveLobby sessions={cards} /></AppShell>;
}
