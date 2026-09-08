"use server";

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
    const firstError = parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
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
  } catch (err) {
    console.error("[createGameSession] DB error:", err);
    return {
      success: false,
      error: "Không thể tạo squad. Vui lòng thử lại.",
    };
  }

  // 4. Redirect sang Squad Management Board
  // Note: redirect() throws a special Next.js error — must be called OUTSIDE try/catch
  redirect(`/${newSession.id}`);
}
