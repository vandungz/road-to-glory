"use server";

import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveWheelCommandSchema, type WheelCheckpointDto } from "@/features/career/contracts/checkpoint.contract";
import {
  resolveWheelCheckpointCommand,
  startCareerSeasonCommand,
  type CareerSeasonStartDto,
} from "@/features/career/services/checkpoint.service";
import {
  resolveServerCareerWheel,
} from "@/features/career/services/server-wheel-resolver.service";
import { getWheelTypeForStep } from "@/features/career/contracts/wheel-step.contract";
import { withCareerCommandLogging } from "@/lib/observability/career-command-log";

const startCareerSeasonSchema = z.object({
  playerId: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative(),
}).strict();

/**
 * Creates the durable season row before the first wheel. The command is
 * intentionally separate from UI navigation so refresh/back cannot invent a
 * new season or move the projection without a revision check.
 */
export async function startCareerSeasonAction(input: unknown): Promise<CareerSeasonStartDto> {
  const params = startCareerSeasonSchema.parse(input);
  const { id: userId } = await requireAuthenticatedUser();
  await checkRateLimit(userId);

  return withCareerCommandLogging(
    { command: "season.start", actorId: userId, careerId: params.playerId },
    () => startCareerSeasonCommand({
      playerId: params.playerId,
      expectedRevision: params.expectedRevision,
      userId,
    }),
  );
}

/** Resolves one wheel on the server and commits its durable checkpoint. */
export async function resolveWheelCheckpointAction(input: unknown): Promise<WheelCheckpointDto> {
  const params = resolveWheelCommandSchema.parse(input);
  const expectedWheelType = getWheelTypeForStep(params.stepKey);
  if (!expectedWheelType || params.wheelType !== expectedWheelType) {
    throw new Error("Invalid wheel step");
  }

  const { id: userId } = await requireAuthenticatedUser();
  await checkRateLimit(userId);
  return withCareerCommandLogging(
    {
      command: "wheel.resolve",
      actorId: userId,
      careerId: params.playerId,
      seasonId: params.seasonId,
      stepKey: params.stepKey,
      resolverVersion: "career-v2",
    },
    () => resolveWheelCheckpointCommand({
      input: params,
      userId,
      resolve: (context) => resolveServerCareerWheel(context, params.stepKey),
    }),
  );
}
