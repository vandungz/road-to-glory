import { appRouteAccess } from "@/lib/app-routes";

export function settingsReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x1f]/.test(value)) return "/";
  try {
    const url = new URL(value, "https://rtg.invalid");
    if (url.origin !== "https://rtg.invalid" || url.pathname === "/settings" || appRouteAccess(url.pathname) === "missing") return "/";
    return url.pathname + url.search;
  } catch { return "/"; }
}
