import type { PortraitReaction } from "@/features/player/lib/player-portraits";

export type PaniniReaction = PortraitReaction & { label: string };
export type PortraitCue = PaniniReaction & { surface: "panini" | "league" | "cup" | "continental" | "recap" };

const knockoutSurfaces = {
  domestic_cup: "cup", continental_cup: "continental", national_tournament: "recap",
} as const;
const defeats = new Set(["Runner-Up", "Semi-Finals", "Quarter-Finals", "Round of 16", "Round of 32", "Early Exit", "Group Stage"]);

export function getPortraitCue(step: string, value: number | string, key: string, leagueSize = 10): PortraitCue | null {
  if (step === "standing" && typeof value === "number" && value >= 1) {
    return { key, surface: "league", pose: value <= Math.ceil(leagueSize / 2) ? "celebrate" : "disappointed", label: value === 1 ? "Vô địch" : `Hạng ${value}` };
  }
  if (step === "national_callup") {
    if (value === "called_up") return { key, surface: "panini", pose: "celebrate", label: "Được triệu tập lên tuyển" };
    if (value === "missed") return { key, surface: "recap", pose: "disappointed", label: "Không được triệu tập lên tuyển" };
  }
  if (!(step in knockoutSurfaces) || typeof value !== "string") return null;
  const surface = knockoutSurfaces[step as keyof typeof knockoutSurfaces];
  if (value === "Winner") return { key, surface, pose: "celebrate", label: "Vô địch" };
  return defeats.has(value) ? { key, surface, pose: "disappointed", label: value === "Runner-Up" ? "Á quân" : "Bị loại" } : null;
}

export function getStatsPortraitCue(delta: number, key: string): PortraitCue | null {
  if (!delta) return null;
  return { key, surface: "panini", pose: delta > 0 ? "celebrate" : "disappointed", label: delta > 0 ? "Tăng chỉ số" : "Giảm chỉ số" };
}

type ClubPrestige = { id: string; prestige: number };

export function getTransferPortraitCue(from: ClubPrestige | null, to: ClubPrestige, key: string): PortraitCue | null {
  if (!from || from.id === to.id) return null;
  return transferPortraitCue(to.prestige >= from.prestige ? "celebrate" : "disappointed", key);
}

function transferPortraitCue(pose: PortraitReaction["pose"], key: string): PortraitCue {
  return { key, surface: "panini", pose, label: pose === "celebrate" ? "Đến CLB có danh tiếng tương đương hoặc cao hơn" : "Đến CLB có danh tiếng thấp hơn" };
}

export function saveTransferPortraitCue(playerId: string, cue: PortraitCue) {
  try {
    window.sessionStorage.setItem(`panini-transfer:${playerId}`, cue.pose);
  } catch { /* Storage is optional for this cosmetic effect. */ }
}

export function takeTransferPortraitCue(playerId: string): PortraitCue | null {
  try {
    const key = `panini-transfer:${playerId}`;
    const pose = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
    if (pose === "celebrate" || pose === "disappointed") return transferPortraitCue(pose, key);
  } catch { /* Storage is optional for this cosmetic effect. */ }
  return null;
}
