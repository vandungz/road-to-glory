import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCanonicalSiteUrl, getGoogleReturnPath } from "@/lib/auth/site-url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getCanonicalSiteUrl(new Headers(request.headers));
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const nextPath = next === "/auth/reset-password" ? next : getGoogleReturnPath(next);
  const cookieStore = await cookies();
  const accountReturn = cookieStore.get("rtg-account-return")?.value === "security" && nextPath === "/profile";
  const cacheControl = { headers: { "Cache-Control": "no-store" } };

  if (code && !searchParams.has("error")) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const response = NextResponse.redirect(new URL(accountReturn ? "/settings?tab=security" : nextPath, origin), cacheControl);
      response.cookies.set("rtg-account-return", "", { path: "/auth/callback", maxAge: 0 });
      return response;
    }
  }

  const retry = new URL("/login", origin);
  retry.searchParams.set("error", nextPath === "/auth/reset-password" ? "link_expired" : "auth_callback");
  if (nextPath !== "/" && nextPath !== "/auth/reset-password") retry.searchParams.set("next", nextPath);
  return NextResponse.redirect(retry, cacheControl);
}
