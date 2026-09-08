"use server";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  commitSeasonStatsCommandSchema,
  type SeasonStatsCommitDto,
} from "@/features/career/contracts/season-stats.contract";
import { commitSeasonStatsCommand } from "@/features/career/services/season-stats.service";
import { withCareerCommandLogging } from "@/lib/observability/career-command-log";

/** Commits the server-owned season simulation after all competition wheels resolve. */
export async function commitSeasonStatsAction(input: unknown): Promise<SeasonStatsCommitDto> {
  const params = commitSeasonStatsCommandSchema.parse(input);
  const { id: userId } = await requireAuthenticatedUser();
  await checkRateLimit(userId);
  return withCareerCommandLogging(
    {
      command: "season.stats_commit",
      actorId: userId,
      careerId: params.playerId,
      seasonId: params.seasonId,
    },
    () => commitSeasonStatsCommand({ input: params, userId }),
  );
}
