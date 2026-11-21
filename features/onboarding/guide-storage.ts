import { guideStorageKey, type GuideId } from "./guides";

const seenInMemory = new Set<string>();
type GuideStorage = Pick<Storage, "getItem" | "setItem">;

export function hasSeenGuide(id: GuideId, storage?: GuideStorage): boolean {
  const key = guideStorageKey(id);
  try { return seenInMemory.has(key) || storage?.getItem(key) === "seen"; }
  catch { return seenInMemory.has(key); }
}

export function markGuideSeen(id: GuideId, storage?: GuideStorage): void {
  const key = guideStorageKey(id);
  seenInMemory.add(key);
  try { storage?.setItem(key, "seen"); } catch { /* This tab still remembers a dismissed guide. */ }
}

export function browserGuideStorage(): GuideStorage | undefined {
  try { return window.localStorage; } catch { return undefined; }
}
