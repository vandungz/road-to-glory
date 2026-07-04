import { create } from "zustand";
import { calculateOvrByPosition } from "@/lib/wheel-engine/weight-calculator";

// ============================================================
// TYPES
// ============================================================

export interface DraftData {
  nationality: string | null;
  debutAge: number | null;
  pac: number | null;
  sho: number | null;
  pas: number | null;
  dri: number | null;
  def: number | null;
  phy: number | null;
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
  resolveStep: (step: number, value: any, position?: string) => void;
  resetDraft: () => void;
}

// ============================================================
// INITIAL STATE
// ============================================================

const initialDraftData: DraftData = {
  nationality: null,
  debutAge: null,
  pac: null,
  sho: null,
  pas: null,
  dri: null,
  def: null,
  phy: null,
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

  resolveStep: (step, value, position) =>
    set((state) => {
      const updatedData = { ...state.draftData };

      switch (step) {
        case 0:
          updatedData.nationality = value as string;
          break;
        case 1:
          updatedData.debutAge = value as number;
          break;
        case 2:
          updatedData.pac = value as number;
          break;
        case 3:
          updatedData.sho = value as number;
          break;
        case 4:
          updatedData.pas = value as number;
          break;
        case 5:
          updatedData.dri = value as number;
          break;
        case 6:
          updatedData.def = value as number;
          break;
        case 7:
          updatedData.phy = value as number;
          // Tự động tính debutOvr có trọng số theo vị trí thi đấu thực tế
          if (position) {
            updatedData.debutOvr = calculateOvrByPosition(position, {
              pac: updatedData.pac ?? 60,
              sho: updatedData.sho ?? 60,
              pas: updatedData.pas ?? 60,
              dri: updatedData.dri ?? 60,
              def: updatedData.def ?? 60,
              phy: value as number,
            });
          } else {
            // Fallback trung bình cộng nếu không có vị trí
            const stats = [
              updatedData.pac ?? 0,
              updatedData.sho ?? 0,
              updatedData.pas ?? 0,
              updatedData.dri ?? 0,
              updatedData.def ?? 0,
              value as number,
            ];
            updatedData.debutOvr = Math.round(stats.reduce((a, b) => a + b, 0) / 6);
          }
          break;
        case 8:
          updatedData.careerLength = value as number;
          break;
        case 9:
          updatedData.leagueId = (value as { id: string; name: string }).id;
          updatedData.leagueName = (value as { id: string; name: string }).name;
          // Reset club khi giải đấu thay đổi
          updatedData.clubId = null;
          updatedData.clubName = null;
          break;
        case 10:
          updatedData.clubId = (value as { id: string; name: string }).id;
          updatedData.clubName = (value as { id: string; name: string }).name;
          break;
      }

      return {
        draftData: updatedData,
        isSpinning: false,
      };
    }),

  resetDraft: () =>
    set({
      activeStep: 0,
      isSpinning: false,
      draftData: initialDraftData,
    }),
}));
