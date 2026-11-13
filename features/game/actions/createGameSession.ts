"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import { createGameSchema, type CreateGameResult } from "@/types/game";

/**
 * Server Action: Tạo một GameSession mới.
 *
 * - Validate input bằng Zod
 * - Ghi vào DB qua Prisma singleton
 * - Redirect sang trang Squad Management Board
 *
 */
export async function createGameSession(
  formData: FormData
): Promise<CreateGameResult> {
  // 1. Parse & validate input
  const rawInput = {
    name: formData.get("name"),
    formation: formData.get("formation"),
  };

  const parsed = createGameSchema.safeParse(rawInput);

  if (!parsed.success) {
    const ui = await getTranslations("ui");
    const firstError = ui(parsed.error.issues[0]?.path[0] === "formation" ? "squadFormationError" : "squadNameError");
    return { success: false, error: firstError };
  }

  const { name, formation } = parsed.data;

  // 2. Require an authenticated owner before creating durable game state.
  const user = await requireAuthenticatedUser();
  await checkRateLimit(user.id);

  // 3. Tạo GameSession trong DB
  let newSession;
  try {
    newSession = await prisma.gameSession.create({
      data: {
        name: name.trim(),
        formation,
        userId: user.id,
        status: "in_progress",
      },
    });
  } catch {
    const ui = await getTranslations("ui");
    return {
      success: false,
      error: ui("squadCreateError"),
    };
  }

  // 4. Redirect sang Squad Management Board
  // Note: redirect() throws a special Next.js error — must be called OUTSIDE try/catch
  redirect(`/${newSession.id}`);
}
