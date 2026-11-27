import { create } from "zustand";

// ============================================================
// TYPES
// ============================================================

export interface DraftData {
  nationality: string | null;
  debutAge: number | null;
  height: number | null; // cm
  weight: number | null; // kg
  // Field player stats
  pac: number | null;
  sho: number | null;
  pas: number | null;
  dri: number | null;
  def: number | null;
  phy: number | null;
  // GK stats
  div: number | null;
  han: number | null;
  kic: number | null;
  ref: number | null;
  spd: number | null;
  pos: number | null;
  debutOvr: number | null;
  careerLength: number | null;
  leagueId: string | null;
  leagueName: string | null;
  clubId: string | null;
  clubName: string | null;
}

interface WheelUiState {
  activeStep: number; // 0 to 10 (11 steps)
  isSpinning: boolean;
  draftData: DraftData;
  setStep: (step: number) => void;
  startSpin: () => void;
  stopSpin: () => void;
  setNationality: (value: string) => void;
  applyDraftResult: (draftData: DraftData, nextStep: number) => void;
  resetDraft: () => void;
}

// ============================================================
// INITIAL STATE
// ============================================================

const initialDraftData: DraftData = {
  nationality: null,
  debutAge: null,
  height: null,
  weight: null,
  pac: null, sho: null, pas: null, dri: null, def: null, phy: null,
  div: null, han: null, kic: null, ref: null, spd: null, pos: null,
  debutOvr: null,
  careerLength: null,
  leagueId: null,
  leagueName: null,
  clubId: null,
  clubName: null,
};

// ============================================================
// ZUSTAND STORE
// ============================================================

export const useWheelUiStore = create<WheelUiState>((set) => ({
  activeStep: 0,
  isSpinning: false,
  draftData: initialDraftData,

  setStep: (step) => set({ activeStep: step }),
  
  startSpin: () => set({ isSpinning: true }),
  
  stopSpin: () => set({ isSpinning: false }),

  setNationality: (value) => set(state => ({draftData:{...state.draftData,nationality:value}})),
  applyDraftResult: (draftData, activeStep) => set({draftData,activeStep,isSpinning:false}),

  resetDraft: () =>
    set({
      activeStep: 0,
      isSpinning: false,
      draftData: initialDraftData,
    }),
}));
