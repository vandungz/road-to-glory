import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCanonicalSiteUrl, getGoogleReturnPath } from "@/lib/auth/site-url";
import { checkAuthRateLimit } from "@/lib/rate-limit";

// OAuth starts with a document navigation so leaving the page cannot abort an action response.
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new NextResponse(null, { status: 403, headers });
  }

  const origin = getCanonicalSiteUrl(request.headers);
  let next = "/";
  let linking = false;
  try {
    const form = await request.formData();
    linking = form.get("intent") === "link";
    const accountReauth = form.get("next") === "/settings?tab=security";
    next = accountReauth || linking ? "/profile" : getGoogleReturnPath(form.get("next"));
    // Reuse the already allowlisted callback; the cookie only selects a local tab.
    const cookieStore = await cookies();
    cookieStore.set("rtg-account-return", accountReauth ? "security" : "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/auth/callback", maxAge: accountReauth ? 600 : 0 });
    const callback = next === "/" ? `${origin}/auth/callback` : `${origin}/auth/callback?next=${next}`;
    const supabase = await createClient();
    if (linking) {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return NextResponse.redirect(new URL("/login?next=/profile", origin), { status: 303, headers });
      await checkAuthRateLimit("account-security", user.id);
    }
    const options = {
      provider: "google",
      options: {
        redirectTo: callback,
        queryParams: { prompt: "select_account" },
      },
    } as const;
    const { data, error } = linking ? await supabase.auth.linkIdentity(options) : await supabase.auth.signInWithOAuth(options);
    if (!error && data.url) {
      return NextResponse.redirect(data.url, { status: 303, headers });
    }
  } catch {
    // Restart from the login page without exposing provider errors or credentials.
  }

  if (linking) return NextResponse.redirect(new URL("/settings?tab=profile&error=google_link", origin), { status: 303, headers });
  const retry = new URL("/login", origin);
  retry.searchParams.set("error", "auth_callback");
  if (next !== "/") retry.searchParams.set("next", next);
  return NextResponse.redirect(retry, { status: 303, headers });
}
