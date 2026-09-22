import type { QuickModeState } from "../types";

export const QUICK_MODE_STORAGE_KEY = "football-life:quick-mode:v4";

export function loadQuickModeState(): QuickModeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(QUICK_MODE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuickModeState;
    return parsed?.version === 4 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveQuickModeState(state: QuickModeState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(QUICK_MODE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be blocked in private browsing. The run remains playable in memory.
  }
}

export function clearQuickModeState(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(QUICK_MODE_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures; the in-memory reset still works.
  }
}
