import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCanonicalSiteUrl, getGoogleReturnPath } from "@/lib/auth/site-url";

// OAuth starts with a document navigation so leaving the page cannot abort an action response.
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new NextResponse(null, { status: 403, headers });
  }

  const origin = getCanonicalSiteUrl(request.headers);
  let next = "/";
  try {
    const form = await request.formData();
    next = getGoogleReturnPath(form.get("next"));
    const callback = next === "/" ? `${origin}/auth/callback` : `${origin}/auth/callback?next=${next}`;
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback,
        queryParams: { prompt: "select_account" },
      },
    });
    if (!error && data.url) {
      return NextResponse.redirect(data.url, { status: 303, headers });
    }
  } catch {
    // Restart from the login page without exposing provider errors or credentials.
  }

  const retry = new URL("/login", origin);
  retry.searchParams.set("error", "auth_callback");
  if (next !== "/") retry.searchParams.set("next", next);
  return NextResponse.redirect(retry, { status: 303, headers });
}
