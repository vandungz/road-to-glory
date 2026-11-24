import { AppShell } from "./AppShell";
import { RouteLoading, type LoadingLayout } from "@/components/ui/States";

/** Loading uses the destination shell so viewport, gutters and grid stay stable. */
export function GameRouteLoading({ title, label, layout }: { title: string; label: string; layout: LoadingLayout }) {
  const career = layout === "career";
  const quick = layout === "quick";
  const match = layout === "match";
  const className = career ? "football-dashboard football-wheel-shell football-career-shell football-loading-career"
    : quick ? "football-quick-mode-shell football-quick-session-shell"
    : match ? "football-pve-tournament-shell"
    : layout === "lobby" ? "football-pve-lobby-shell" : undefined;
  return <AppShell className={className} backHref={career ? "/classic" : quick ? "/quick" : match ? "/pve" : "/"}
    backLabel={career ? "squads" : quick ? "setup" : match ? "pve" : "home"}>
    <RouteLoading title={title} label={label} layout={layout} />
  </AppShell>;
}
