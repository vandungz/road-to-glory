"use server";

import {
  advanceCareerSeasonCommandSchema,
  type CareerSeasonAdvanceDto,
} from "@/features/career/contracts/season-transition.contract";
import { advanceCareerSeasonCommand } from "@/features/career/services/season-transition.service";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import { withCareerCommandLogging } from "@/lib/observability/career-command-log";

/** Server-only transition; existing FE flow is intentionally untouched. */
export async function advanceCareerSeasonAction(
  input: unknown,
): Promise<CareerSeasonAdvanceDto> {
  const validated = advanceCareerSeasonCommandSchema.parse(input);
  const { id: userId } = await requireAuthenticatedUser();
  await checkRateLimit(userId);
  return withCareerCommandLogging(
    {
      command: "season.advance",
      actorId: userId,
      careerId: validated.playerId,
      seasonId: validated.seasonId,
    },
    () => advanceCareerSeasonCommand({ input: validated, userId }),
  );
}
