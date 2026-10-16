"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/rate-limit";
import { getCanonicalSiteUrl } from "@/lib/auth/site-url";

const loginCredentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

const signUpCredentialsSchema = loginCredentialsSchema.extend({
  password: z.string().min(8).max(128),
});

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export type AuthActionResult =
  | { success: true; requiresEmailConfirmation?: boolean }
  | {
      success: false;
      error: string;
      code?: "rate_limited";
      retryAfterSeconds?: number;
    };

function getClientIp(requestHeaders: Headers): string {
  const trustedProxyIp = requestHeaders.get("x-real-ip")?.trim();
  if (trustedProxyIp) return trustedProxyIp.slice(0, 128);

  const forwardedIp = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwardedIp || "unknown").slice(0, 128);
}

async function checkCredentialRateLimit(email: string): Promise<void> {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);
  await checkAuthRateLimit(`ip:${ip}`);
  await checkAuthRateLimit(`email:${email}`);
}

function genericAuthError(): AuthActionResult {
  return {
    success: false,
    error: "Không thể hoàn tất yêu cầu xác thực. Vui lòng kiểm tra thông tin hoặc thử lại sau.",
  };
}

function authActionError(error: unknown): AuthActionResult {
  if (error instanceof AuthRateLimitError) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((error.resetAt - Date.now()) / 1000),
    );
    const retryAfterMinutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));

    return {
      success: false,
      code: "rate_limited",
      retryAfterSeconds,
      error: `Bạn đã thử quá nhiều lần. Vui lòng thử lại sau khoảng ${retryAfterMinutes} phút.`,
    };
  }

  return genericAuthError();
}

export async function loginAction(input: unknown): Promise<AuthActionResult> {
  const parsed = loginCredentialsSchema.safeParse(input);
  if (!parsed.success) return genericAuthError();

  try {
    await checkCredentialRateLimit(parsed.data.email);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    return error ? genericAuthError() : { success: true };
  } catch (error) {
    return authActionError(error);
  }
}

export async function signUpAction(input: unknown): Promise<AuthActionResult> {
  const parsed = signUpCredentialsSchema.safeParse(input);
  if (!parsed.success) return genericAuthError();

  try {
    await checkCredentialRateLimit(parsed.data.email);
    const supabase = await createClient();
    const siteUrl = getCanonicalSiteUrl(await headers());
    const { data, error } = await supabase.auth.signUp({
      ...parsed.data,
      options: siteUrl ? { emailRedirectTo: `${siteUrl}/auth/callback` } : undefined,
    });
    if (error) return genericAuthError();
    return { success: true, requiresEmailConfirmation: !data.session };
  } catch (error) {
    return authActionError(error);
  }
}

export async function requestPasswordResetAction(input: unknown): Promise<AuthActionResult> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return genericAuthError();

  try {
    await checkCredentialRateLimit(parsed.data);
    const supabase = await createClient();
    const siteUrl = getCanonicalSiteUrl(await headers());
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
    });
    return error ? genericAuthError() : { success: true };
  } catch (error) {
    return authActionError(error);
  }
}

export async function resendSignupAction(input: unknown): Promise<AuthActionResult> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return genericAuthError();

  try {
    await checkCredentialRateLimit(parsed.data);
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email: parsed.data });
    return error ? genericAuthError() : { success: true };
  } catch (error) {
    return authActionError(error);
  }
}

export async function updatePasswordAction(password: string): Promise<AuthActionResult> {
  const parsed = z.string().min(8).max(128).safeParse(password);
  if (!parsed.success) return genericAuthError();

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    return error ? genericAuthError() : { success: true };
  } catch {
    return genericAuthError();
  }
}

export async function logoutAction(): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    return error ? genericAuthError() : { success: true };
  } catch {
    return genericAuthError();
  }
}
