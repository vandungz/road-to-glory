"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import { googleAvatarUrl, profileAvatarChoices } from "@/features/settings/profile-avatar";
import type { AuthActionResult } from "./auth.actions";

export async function updateProfileAvatarAction(input: unknown): Promise<AuthActionResult> {
  const t = await getTranslations("accountSettings");
  const choice = z.enum(profileAvatarChoices).safeParse(input);
  if (!choice.success) return { success: false, error: t("avatarFailed") };
  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return { success: false, error: t("signInRequired") };
    await checkAuthRateLimit("account-profile", user.id);
    const google = user.identities?.find((identity) => identity.provider === "google");
    if (choice.data === "google" && !googleAvatarUrl(google?.identity_data?.avatar_url ?? google?.identity_data?.picture)) return { success: false, error: t("avatarFailed") };
    const updated = await client.auth.updateUser({ data: { profile_avatar: choice.data } });
    if (!updated.error) revalidatePath("/");
    return updated.error ? { success: false, error: t("avatarFailed") } : { success: true };
  } catch { return { success: false, error: t("avatarFailed") }; }
}
