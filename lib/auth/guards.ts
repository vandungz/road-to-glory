import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export interface AuthenticatedUser {
  id: string;
}

/**
 * Strict server-side authentication boundary for actions that read or mutate
 * career data. Guest/local fallback is intentionally not supported here:
 * production game truth must always be owned by an authenticated user.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return { id: user.id };
}

export async function requireGameOwnership(gameId: string): Promise<AuthenticatedUser> {
  const user = await requireAuthenticatedUser();
  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { userId: true },
  });

  if (!session || session.userId !== user.id) {
    throw new Error("Forbidden");
  }

  return user;
}

export async function requirePlayerOwnership(playerId: string): Promise<AuthenticatedUser> {
  const user = await requireAuthenticatedUser();
  const player = await prisma.careerPlayer.findUnique({
    where: { id: playerId },
    select: { gameSession: { select: { userId: true } } },
  });

  if (!player || player.gameSession.userId !== user.id) {
    throw new Error("Forbidden");
  }

  return user;
}
