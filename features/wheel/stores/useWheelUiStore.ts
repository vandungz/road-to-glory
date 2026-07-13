import { create } from "zustand";
import { calculateOvrByPosition } from "@/lib/wheel-engine/weight-calculator";

// ============================================================
// TYPES
// ============================================================

export interface DraftData {
  nationality: string | null;
  debutAge: number | null;
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
  resolveStep: (step: number, value: any, position?: string) => void;
  resetDraft: () => void;
}

// ============================================================
// INITIAL STATE
// ============================================================

const initialDraftData: DraftData = {
  nationality: null,
  debutAge: null,
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
          if (position === "GK") updatedData.div = value as number;
          else updatedData.pac = value as number;
          break;
        case 3:
          if (position === "GK") updatedData.han = value as number;
          else updatedData.sho = value as number;
          break;
        case 4:
          if (position === "GK") updatedData.kic = value as number;
          else updatedData.pas = value as number;
          break;
        case 5:
          if (position === "GK") updatedData.ref = value as number;
          else updatedData.dri = value as number;
          break;
        case 6:
          if (position === "GK") updatedData.spd = value as number;
          else updatedData.def = value as number;
          break;
        case 7:
          if (position === "GK") {
            updatedData.pos = value as number;
            updatedData.debutOvr = calculateOvrByPosition("GK", {
              div: updatedData.div ?? 60,
              han: updatedData.han ?? 60,
              kic: updatedData.kic ?? 60,
              ref: updatedData.ref ?? 60,
              spd: updatedData.spd ?? 60,
              pos: value as number,
            });
          } else {
            updatedData.phy = value as number;
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
              const vals = [updatedData.pac ?? 0, updatedData.sho ?? 0, updatedData.pas ?? 0, updatedData.dri ?? 0, updatedData.def ?? 0, value as number];
              updatedData.debutOvr = Math.round(vals.reduce((a, b) => a + b, 0) / 6);
            }
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
