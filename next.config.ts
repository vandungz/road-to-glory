import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack's mutable dev artifacts separate from production builds.
  // Running `next build` while a dev server is open otherwise lets both
  // processes write `.next/static/development`, which can remove a manifest
  // temp file while the dev server is still trying to rename it on Windows.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
