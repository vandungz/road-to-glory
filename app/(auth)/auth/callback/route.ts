import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCanonicalSiteUrl, getGoogleReturnPath } from "@/lib/auth/site-url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getCanonicalSiteUrl(new Headers(request.headers));
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const nextPath = next === "/auth/reset-password" ? next : getGoogleReturnPath(next);
  const cacheControl = { headers: { "Cache-Control": "no-store" } };

  if (code && !searchParams.has("error")) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      return NextResponse.redirect(new URL(nextPath, origin), cacheControl);
    }
  }

  const retry = new URL("/login", origin);
  retry.searchParams.set("error", nextPath === "/auth/reset-password" ? "link_expired" : "auth_callback");
  if (nextPath !== "/" && nextPath !== "/auth/reset-password") retry.searchParams.set("next", nextPath);
  return NextResponse.redirect(retry, cacheControl);
}
