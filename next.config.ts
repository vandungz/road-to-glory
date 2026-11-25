import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      ...securityHeaders,
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
    ] }, { source: "/media/audio/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
  // Keep Turbopack's mutable dev artifacts separate from production builds.
  // Running `next build` while a dev server is open otherwise lets both
  // processes write `.next/static/development`, which can remove a manifest
  // temp file while the dev server is still trying to rename it on Windows.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default createNextIntlPlugin("./i18n/request.ts")(nextConfig);
