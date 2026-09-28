"use server";

import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCareerHonoursSchema, type CareerHonoursView } from "@/features/career/contracts/career-honours.contract";
import { getCareerHonoursQuery } from "@/features/career/services/award-query.service";

export async function getCareerHonoursAction(input: unknown): Promise<CareerHonoursView> {
  const params = getCareerHonoursSchema.parse(input);
  const { id: userId } = await requireAuthenticatedUser();
  await checkRateLimit(userId);
  return getCareerHonoursQuery({ ...params, userId });
}
