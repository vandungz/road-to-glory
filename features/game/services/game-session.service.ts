import { prisma } from "@/lib/prisma";
import type { GameSessionSummary } from "@/types/game";

export async function getGameSessionsForUser(userId: string): Promise<GameSessionSummary[]> {
  const sessions = await prisma.gameSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { players: true } } },
  });

  return sessions.map((session) => ({
    id: session.id,
    name: session.name,
    formation: session.formation as GameSessionSummary["formation"],
    createdAt: session.createdAt,
    squadRating: session.squadRating,
    status: session.status === "completed" ? "completed" : "in_progress",
    playerCount: session._count.players,
  }));
}
