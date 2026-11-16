import { track } from "@vercel/analytics";

const landingEntryKey = "football-life-landing-entry";
const quickStartedKey = "football-life-quick-started";

export function trackGameEntry(event: "landing_view" | "trailer_play" | "quick_click" | "quick_start" | "quick_first_spin" | "quick_complete") {
  if (process.env.NEXT_PUBLIC_GAME_ANALYTICS !== "1") return;

  const landingEvent = event === "landing_view" || event === "trailer_play" || event === "quick_click";
  let entry = landingEvent ? "landing" : "direct";

  try {
    if (event === "quick_click") sessionStorage.setItem(landingEntryKey, "1");
    if (!landingEvent && sessionStorage.getItem(landingEntryKey)) entry = "landing";
    if (event === "quick_start") {
      if (sessionStorage.getItem(quickStartedKey)) return;
      sessionStorage.setItem(quickStartedKey, "1");
    }
    if (event === "quick_complete") {
      sessionStorage.removeItem(landingEntryKey);
      sessionStorage.removeItem(quickStartedKey);
    }
  } catch {
    // Private browser storage restrictions must not block play.
  }

  track(event, { entry, viewport: matchMedia("(min-width: 1024px)").matches ? "playable" : "narrow" });
}
