"use server";

import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { z } from "@/lib/validation/zod";
import { createClient } from "@/lib/supabase/server";
import {
  AuthRateLimitError,
  checkAuthRateLimit,
} from "@/lib/rate-limit";
import { getCanonicalSiteUrl } from "@/lib/auth/site-url";
import { classifySignupError } from "@/lib/auth/signup-error";

const loginCredentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

const signUpCredentialsSchema = loginCredentialsSchema.extend({
  password: z.string().min(8).max(128),
});

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const signupCodeSchema = z.object({
  email: emailSchema,
  token: z.string().trim().regex(/^[0-9]{6}$/),
}).strict();

export type AuthActionResult =
  | { success: true }
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

async function checkAuthOperationRateLimit(
  operation: "login" | "signup" | "verify-signup" | "password-reset" | "resend-confirmation",
  email: string,
): Promise<{ ip: string }> {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);
  await Promise.all([
    checkAuthRateLimit(operation, `ip:${ip}`),
    checkAuthRateLimit(operation, `email:${email}`),
    ...(operation === "login" ? [
      checkAuthRateLimit("login-failure", `ip:${ip}`, { consume: false }),
      checkAuthRateLimit("login-failure", `email:${email}`, { consume: false }),
    ] : []),
  ]);
  return { ip };
}

async function recordLoginFailureRateLimit(ip: string, email: string): Promise<void> {
  await Promise.all([
    checkAuthRateLimit("login-failure", `ip:${ip}`),
    checkAuthRateLimit("login-failure", `email:${email}`),
  ]);
}

async function genericAuthError(): Promise<AuthActionResult> {
  const t = await getTranslations("auth");
  return {
    success: false,
    error: t("genericError"),
  };
}

async function authActionError(error: unknown): Promise<AuthActionResult> {
  if (error instanceof AuthRateLimitError) {
    const t = await getTranslations("auth");
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((error.resetAt - Date.now()) / 1000),
    );
    const retryAfterMinutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));

    return {
      success: false,
      code: "rate_limited",
      retryAfterSeconds,
      error: t("rateLimited", { minutes: retryAfterMinutes }),
    };
  }

  return genericAuthError();
}

export async function loginAction(input: unknown): Promise<AuthActionResult> {
  const parsed = loginCredentialsSchema.safeParse(input);
  if (!parsed.success) return genericAuthError();

  try {
    const { ip } = await checkAuthOperationRateLimit("login", parsed.data.email);
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      // Only invalid-credential responses count toward the stricter failure
      // budget. Provider/network failures must not lock out real users.
      if (error.status === 400 || error.status === 401) {
        await recordLoginFailureRateLimit(ip, parsed.data.email);
      }
      return genericAuthError();
    }
    return data.session ? { success: true } : genericAuthError();
  } catch (error) {
    return authActionError(error);
  }
}

export async function signUpAction(input: unknown): Promise<AuthActionResult> {
  const parsed = signUpCredentialsSchema.safeParse(input);
  if (!parsed.success) {
    const t = await getTranslations("auth");
    return { success: false, error: t("signupInputInvalid") };
  }

  let stage: "rate-limit" | "provider" | "confirmation" = "rate-limit";
  try {
    await checkAuthOperationRateLimit("signup", parsed.data.email);
    stage = "provider";
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp(parsed.data);
    if (error) return signupFailure(error, stage);
    if (data.session) {
      stage = "confirmation";
      await supabase.auth.signOut({ scope: "local" });
      return signupFailure({ code: "confirmation_disabled" }, stage);
    }
    return { success: true };
  } catch (error) {
    if (error instanceof AuthRateLimitError) return authActionError(error);
    return signupFailure(error, stage);
  }
}

async function signupFailure(error: unknown, stage: string): Promise<AuthActionResult> {
  const { code, status, messageKey } = classifySignupError(error);
  console.error("auth.signup.failed", { stage, code, status });
  const t = await getTranslations("auth");
  return { success: false, error: t(messageKey) };
}

export async function verifySignupCodeAction(input: unknown): Promise<AuthActionResult> {
  const t = await getTranslations("auth");
  const parsed = signupCodeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: t("invalidSignupCode") };

  try {
    await checkAuthOperationRateLimit("verify-signup", parsed.data.email);
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ ...parsed.data, type: "email" });
    if (error || !data.session) return { success: false, error: t("invalidSignupCode") };
    return { success: true };
  } catch (error) {
    return authActionError(error);
  }
}

export async function requestPasswordResetAction(input: unknown): Promise<AuthActionResult> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return genericAuthError();

  try {
    await checkAuthOperationRateLimit("password-reset", parsed.data);
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
    await checkAuthOperationRateLimit("resend-confirmation", parsed.data);
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email: parsed.data });
    return error ? signupFailure(error, "resend") : { success: true };
  } catch (error) {
    if (error instanceof AuthRateLimitError) return authActionError(error);
    return signupFailure(error, "resend");
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
    const { error } = await supabase.auth.signOut({ scope: "local" });
    return error ? genericAuthError() : { success: true };
  } catch {
    return genericAuthError();
  }
}

export async function updateDisplayNameAction(input: unknown): Promise<AuthActionResult> {
  const t = await getTranslations("auth");
  const name = z.string().trim().min(1).max(40).safeParse(input);
  if (!name.success) return { success: false, error: t("displayNameInvalid") };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: t("sessionExpired") };
    const { error } = await supabase.auth.updateUser({ data: { display_name: name.data } });
    return error ? { success: false, error: t("nameSaveError") } : { success: true };
  } catch {
    return { success: false, error: t("nameSaveError") };
  }
}
