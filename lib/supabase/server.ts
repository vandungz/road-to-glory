/* eslint-disable no-restricted-imports */
// Exception: Supabase server client requires next/headers by design — cannot be pure TS
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const isProduction = process.env.NODE_ENV === "production";
const sessionCookieMaxAge = 60 * 60 * 24 * 7;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true,
                secure: isProduction,
                sameSite: "lax",
                path: "/",
                maxAge: typeof options?.maxAge === "number"
                  ? Math.min(options.maxAge, sessionCookieMaxAge)
                  : sessionCookieMaxAge,
              } as Parameters<typeof cookieStore.set>[2])
            );
          } catch {
            // Server Component context — cookies can't be set, ignore
          }
        },
      },
    }
  );
}
