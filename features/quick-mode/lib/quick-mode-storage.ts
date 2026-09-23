import type { QuickModeState } from "../types";

export const QUICK_MODE_STORAGE_KEY = "football-life:quick-mode:v5";

function normalizeInternationalCupTypes(state: QuickModeState): QuickModeState {
  const draftInternationalCupTypes = state.clubDraft.internationalCupTypes.slice(0, Math.max(0, state.clubDraft.internationalCups ?? 0));
  return {
    ...state,
    careerStep: state.phase === "career"
      && state.careerStep === 7
      && (state.clubDraft.internationalCups ?? 0) > 0
      && draftInternationalCupTypes.length >= (state.clubDraft.internationalCups ?? 0)
      ? 8
      : state.careerStep,
    clubs: state.clubs.map((club) => ({
      ...club,
      internationalCupTypes: club.internationalCupTypes.slice(0, Math.max(0, club.internationalCups)),
    })),
    clubDraft: {
      ...state.clubDraft,
      internationalCupTypes: draftInternationalCupTypes,
    },
  };
}

export function loadQuickModeState(): QuickModeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(QUICK_MODE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuickModeState;
    return parsed?.version === 5 ? normalizeInternationalCupTypes(parsed) : null;
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
