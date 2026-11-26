"use server";

import { z } from "@/lib/validation/zod";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import type { AuthActionResult } from "./auth.actions";

const credentials = z.object({ currentPassword: z.string().min(1).max(128), password: z.string().min(8).max(128) }).strict();

export async function changeAccountPasswordAction(input: unknown): Promise<AuthActionResult> {
  const t = await getTranslations("accountSettings");
  const parsed = credentials.safeParse(input);
  if (!parsed.success) return { success: false, error: t("passwordInvalid") };
  let passwordChanged = false;
  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user?.email) return { success: false, error: t("signInRequired") };
    await checkAuthRateLimit("account-security", user.id);
    const verified = await client.auth.signInWithPassword({ email: user.email, password: parsed.data.currentPassword });
    if (verified.error || verified.data.user?.id !== user.id) return { success: false, error: t("passwordIncorrect") };
    const updated = await client.auth.updateUser({ password: parsed.data.password, current_password: parsed.data.currentPassword });
    if (updated.error) return { success: false, error: t("passwordFailed") };
    passwordChanged = true;
    // Revoke other devices after changing the credential, retaining this session.
    const revoked = await client.auth.signOut({ scope: "others" });
    return revoked.error ? { success: false, error: t("passwordChangedSessionWarning") } : { success: true };
  } catch { return { success: false, error: t(passwordChanged ? "passwordChangedSessionWarning" : "tryLater") }; }
}

export async function deleteOwnAccountAction(input: unknown): Promise<AuthActionResult> {
  const t = await getTranslations("accountSettings");
  const parsed = z.object({ confirmation: z.literal("DELETE"), currentPassword: z.string().max(128) }).strict().safeParse(input);
  if (!parsed.success) return { success: false, error: t("deleteConfirmation") };
  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user?.email) return { success: false, error: t("signInRequired") };
    await checkAuthRateLimit("account-security", user.id);
    if (user.identities?.some((identity) => identity.provider === "email")) {
      if (!parsed.data.currentPassword) return { success: false, error: t("passwordIncorrect") };
      const verified = await client.auth.signInWithPassword({ email: user.email, password: parsed.data.currentPassword });
      if (verified.error || verified.data.user?.id !== user.id) return { success: false, error: t("passwordIncorrect") };
    }
    // No user ID is accepted: the database derives identity from the verified JWT.
    const removed = await client.rpc("delete_own_account");
    if (removed.error) return { success: false, error: t(removed.error.message.includes("reauth_required") ? "reauthRequired" : "deleteFailed") };
    await client.auth.signOut({ scope: "local" }).catch(() => {});
    return { success: true };
  } catch { return { success: false, error: t("deleteFailed") }; }
}
