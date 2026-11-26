import { NextResponse } from "next/server";
import { loginAction, logoutAction, resendSignupAction, signUpAction, verifySignupCodeAction } from "@/actions/auth.actions";
import { z } from "@/lib/validation/zod";

const operations = { login: loginAction, signup: signUpAction, verify: verifySignupCodeAction, resend: resendSignupAction, logout: logoutAction };
const payloadSchema = z.object({
  operation: z.enum(["login", "signup", "verify", "resend", "logout"]),
  input: z.unknown().optional(),
}).strict();
const headers = { "Cache-Control": "private, no-store" };
const maxBytes = 4096;

// Auth transport only: validation, quotas and provider calls remain in the existing actions.
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new NextResponse(null, { status: 403, headers });
  }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return new NextResponse(null, { status: 415, headers });
  }
  if (Number(request.headers.get("content-length")) > maxBytes) {
    return new NextResponse(null, { status: 413, headers });
  }
  const reader = request.body?.getReader();
  if (!reader) return new NextResponse(null, { status: 400, headers });
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return new NextResponse(null, { status: 413, headers });
      }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    const parsed = payloadSchema.safeParse(JSON.parse(new TextDecoder().decode(body)));
    if (!parsed.success) return new NextResponse(null, { status: 400, headers });
    const result = await operations[parsed.data.operation](parsed.data.input);
    const limited = !result.success && result.code === "rate_limited";
    return NextResponse.json(result, {
      status: limited ? 429 : 200,
      headers: limited ? { ...headers, "Retry-After": String(result.retryAfterSeconds ?? 60) } : headers,
    });
  } catch {
    return new NextResponse(null, { status: 400, headers });
  } finally {
    reader.releaseLock();
  }
}
