import type { AuthActionResult } from "@/actions/auth.actions";

export type SessionOperation = "login" | "signup" | "verify" | "resend" | "logout";

export async function sessionRequest(operation: SessionOperation, input?: unknown): Promise<AuthActionResult> {
  // A JSON response completes cookie changes without a Flight re-render of the outgoing page.
  const response = await fetch("/auth/session", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, input }),
  });
  if (!response.ok && response.status !== 429) throw new Error("Session request failed");
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || !("success" in result)
    || (result.success !== true && (result.success !== false || !("error" in result) || typeof result.error !== "string"))) {
    throw new Error("Invalid session response");
  }
  return result as AuthActionResult;
}
