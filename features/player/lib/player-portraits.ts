export const PORTRAIT_IDS = ["p01", "p02", "p03", "p04", "p05", "p06"] as const;
export type PortraitId = (typeof PORTRAIT_IDS)[number];
export type PortraitPose = "idle" | "celebrate" | "disappointed";
export type PortraitReaction = { pose: Exclude<PortraitPose, "idle">; key: string };

export const PLAYER_PROFILE_POSITIONS = ["GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST", "LM", "RM"] as const;

export function isPortraitId(value: unknown): value is PortraitId {
  return PORTRAIT_IDS.some((id) => id === value);
}

export function randomPortraitId(): PortraitId {
  return PORTRAIT_IDS[Math.floor(Math.random() * PORTRAIT_IDS.length)];
}

export function resolveSavedPortraitId(portraitId: string | null | undefined, playerId: string): PortraitId {
  if (isPortraitId(portraitId)) return portraitId;
  // Older careers receive a stable visual identity without changing saved progress.
  const index = Array.from(playerId).reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0);
  return PORTRAIT_IDS[index % PORTRAIT_IDS.length];
}
