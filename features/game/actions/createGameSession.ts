"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createGameSchema, type CreateGameResult } from "@/types/game";

/**
 * Server Action: Tạo một GameSession mới.
 *
 * - Validate input bằng Zod
 * - Ghi vào DB qua Prisma singleton
 * - Redirect sang trang Squad Management Board
 *
 * NOTE: Phase 1 chưa có Auth — userId tạm thời là "anonymous".
 * Phase 2 sẽ tích hợp Supabase Auth và lấy userId thực.
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

  // 2. Tạo GameSession trong DB
  let newSession;
  try {
    newSession = await prisma.gameSession.create({
      data: {
        name: name.trim(),
        formation,
        userId: "anonymous", // TODO: Replace with real Supabase Auth userId in Phase 2
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

  // 3. Redirect sang Squad Management Board
  // Note: redirect() throws a special Next.js error — must be called OUTSIDE try/catch
  redirect(`/${newSession.id}`);
}
