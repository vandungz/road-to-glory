import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy, securityHeaders } from "@/lib/security/headers";
import { appRouteAccess } from "@/lib/app-routes";
import { localeCookie, type Locale } from "@/i18n/locale";

const isProduction = process.env.NODE_ENV === "production";
const sessionCookieMaxAge = 60 * 60 * 24 * 7;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const policy = contentSecurityPolicy(nonce, isProduction);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-football-not-found");
  requestHeaders.delete("x-football-landing-locale");
  // Never trust a caller-supplied nonce or CSP: Next reads this header during rendering.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const next = () => NextResponse.next({ request: { headers: requestHeaders } });
  const localizedLanding = (locale: Locale, previous?: NextResponse) => {
    requestHeaders.set("x-football-landing-locale", locale);
    const response = next();
    previous?.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    response.cookies.set(localeCookie, locale, {
      path: "/", maxAge: 31536000, sameSite: "lax", secure: isProduction,
    });
    return response;
  };
  const withSecurityHeaders = (response: NextResponse): NextResponse => {
    securityHeaders.forEach(({ key, value }) => response.headers.set(key, value));
    response.headers.set("Content-Security-Policy", policy);
    response.headers.set("Cache-Control", "private, no-store");
    if (isProduction) response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    return response;
  };
  if (isProduction && request.headers.get("x-forwarded-proto") !== "https") {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https:";
    return withSecurityHeaders(NextResponse.redirect(httpsUrl, 308));
  }

  if (pathname === "/en") return withSecurityHeaders(localizedLanding("en"));

  if (["/privacy", "/terms", "/robots.txt", "/sitemap.xml"].includes(pathname)) {
    return withSecurityHeaders(next());
  }
  if (process.env.NEXT_PUBLIC_GAME_ANALYTICS === "1" && pathname.startsWith("/_vercel/insights/")) {
    return withSecurityHeaders(next());
  }
  if (isProduction && (pathname === "/dev" || pathname.startsWith("/dev/"))) {
    return withSecurityHeaders(NextResponse.redirect(new URL("/", request.url), 307));
  }

  const access = appRouteAccess(pathname);
  const isDevPreview = !isProduction && (pathname === "/dev" || pathname.startsWith("/dev/"));
  if (access === "missing" && !isDevPreview) {
    requestHeaders.set("x-football-not-found", "1");
    return withSecurityHeaders(NextResponse.rewrite(new URL("/404", request.url), {
      status: 404, request: { headers: requestHeaders },
    }));
  }

  let supabaseResponse = next();

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
          requestHeaders.set("cookie", request.cookies.toString());
          supabaseResponse = next();
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

  if (!user && access === "protected" && !isDevPreview) {
    const loginUrl = new URL("/login", request.url);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // User đã đăng nhập mà vào /login → redirect về lobby
  if (user && pathname === "/login") {
    return withSecurityHeaders(NextResponse.redirect(new URL("/", request.url)));
  }

  return withSecurityHeaders(pathname === "/" && !user ? localizedLanding("vi", supabaseResponse) : supabaseResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static/|_next/image(?:/|$)|favicon\\.ico$|media/).*)",
  ],
};
