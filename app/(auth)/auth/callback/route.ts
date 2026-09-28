import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCanonicalSiteUrl } from "@/lib/auth/site-url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getCanonicalSiteUrl(new Headers(request.headers));
  const code = searchParams.get("code");
  const nextPath = searchParams.get("next") === "/auth/reset-password"
    ? "/auth/reset-password"
    : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=link_expired`);
    }
  }

  return NextResponse.redirect(`${origin}${nextPath}`);
}
