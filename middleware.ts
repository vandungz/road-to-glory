import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isProduction = process.env.NODE_ENV === "production";
const sessionCookieMaxAge = 60 * 60 * 24 * 7;

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  ].join("; "));
  if (isProduction) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

export async function middleware(request: NextRequest) {
  if (isProduction && request.headers.get("x-forwarded-proto") !== "https") {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https:";
    return withSecurityHeaders(NextResponse.redirect(httpsUrl, 308));
  }

  const pathname = request.nextUrl.pathname;
  if (isProduction && (pathname === "/dev" || pathname.startsWith("/dev/"))) {
    return withSecurityHeaders(NextResponse.redirect(new URL("/", request.url), 307));
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: isProduction,
              sameSite: "lax",
              path: "/",
              maxAge: typeof options?.maxAge === "number"
                ? Math.min(options.maxAge, sessionCookieMaxAge)
                : sessionCookieMaxAge,
            } as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  // QUAN TRỌNG: phải gọi getUser() để refresh session — không dùng getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = pathname === "/login" || pathname.startsWith("/auth/");
  const isPublicGameRoute = pathname === "/" || pathname === "/quick" || pathname === "/quick/play";
  const isDevPreview = process.env.NODE_ENV !== "production" && pathname.startsWith("/dev");

  if (!user && !isAuthRoute && !isPublicGameRoute && !isDevPreview) {
    const loginUrl = new URL("/login", request.url);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // User đã đăng nhập mà vào /login → redirect về lobby
  if (user && pathname === "/login") {
    return withSecurityHeaders(NextResponse.redirect(new URL("/", request.url)));
  }

  return withSecurityHeaders(supabaseResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
