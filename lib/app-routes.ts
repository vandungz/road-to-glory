import { isGameId, parseSquadSlot } from "./route-params";

const publicPages = new Set([
  "/", "/quick", "/quick/play", "/login", "/settings", "/profile", "/privacy", "/terms",
  "/auth/google", "/auth/callback", "/auth/reset-password",
]);

/** Only real, syntactically valid game routes enter the authentication flow. */
export function appRouteAccess(pathname: string): "public" | "protected" | "missing" {
  if (publicPages.has(pathname)) return "public";
  if (pathname === "/classic" || pathname === "/pve") return "protected";
  const parts = pathname.split("/").slice(1);
  if (parts[0] === "pve") return parts.length === 2 && isGameId(parts[1]) ? "protected" : "missing";
  const classic = parts[0] === "classic";
  const [id, ...tail] = classic ? parts.slice(1) : parts;
  if (!isGameId(id ?? "")) return "missing";
  if (!tail.length) return "protected";
  if (parseSquadSlot(tail[1] ?? "") === null) return "missing";
  if (tail[0] === "draft" && (tail.length === 2 || (classic && tail.length === 3 && tail[2] === "ballon-dor"))) return "protected";
  if (classic && tail.length === 2 && ["shop", "transfer"].includes(tail[0])) return "protected";
  return "missing";
}
