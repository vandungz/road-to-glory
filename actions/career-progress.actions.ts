"use server";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import {
  getCareerProgressSchema,
  type CareerProgressDto,
} from "@/features/career/contracts/career-progress.contract";
import { getCareerProgressQuery } from "@/features/career/services/career-progress.service";

/** Returns only public career progress required by resume/query consumers. */
export async function getCareerProgressAction(input: unknown): Promise<CareerProgressDto> {
  const { playerId } = getCareerProgressSchema.parse(input);
  const { id: userId } = await requireAuthenticatedUser();
  return getCareerProgressQuery({ playerId, userId });
}
