"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useWheelUiStore } from "../stores/useWheelUiStore";
import { resolveWeightedOutcome } from "@/lib/wheel-engine/spin-resolver";
import { getFlagEmoji } from "@/types/squad";
import type { ClubSummary, LeagueSummary } from "@/types/domain";
import {
  NATIONALITY_POOL,
  DEBUT_AGE_POOL,
  CAREER_LENGTH_POOL,
  getLeagueWeights,
  getClubWeights,
  getDebutStatWeights,
  getHeightWeights,
  getWeightWeights,
} from "@/lib/wheel-engine/weight-calculator";

interface UseSetupStageProps {
  position: string;
  leagues: LeagueSummary[];
  clubs: ClubSummary[];
  isMounted: boolean;
  mode: "setup" | "career" | "retired";
}

type ClubWheelValue = {
  id: string;
  name: string;
  leagueId?: string;
  leagueName?: string;
  prestige?: number;
  continentalType?: string;
};
type SetupWheelValue = string | number | ClubWheelValue;

export function useSetupStage({ position, leagues, clubs, isMounted, mode }: UseSetupStageProps) {
  const [wheelItems, setWheelItems] = useState<{ label: string; value: SetupWheelValue }[]>([]);
  const [targetIndex, setTargetIndex] = useState<number>(-1);
  const [tempValue, setTempValue] = useState<string | number | null>(null);
  const setupResultRef = useRef<SetupWheelValue | null>(null);

  const {
    activeStep,
    isSpinning,
    draftData,
    startSpin,
    resolveStep,
    setStep,
  } = useWheelUiStore();

  const filteredClubs = useMemo(
    () => clubs.filter((c) => c.leagueId === draftData.leagueId),
    [clubs, draftData.leagueId],
  );

  // ── THIẾT LẬP MÚI BÁNH XE SETUP ──
  useEffect(() => {
    if (!isMounted || mode !== "setup") return;

    let items: { label: string; value: SetupWheelValue }[] = [];
    switch (activeStep) {
      case 0:
        items = NATIONALITY_POOL.map((x) => ({
          label: `${getFlagEmoji(x.value)} ${x.value}`,
          value: x.value,
        }));
        break;
      case 1:
        items = DEBUT_AGE_POOL.map((x) => ({
          label: `${x.value} Tuổi`,
          value: x.value,
        }));
        break;
      case 2:
        items = getHeightWeights(position).map((x) => ({ label: `${x.value} cm`, value: x.value }));
        break;
      case 3:
        items = getWeightWeights(draftData.height ?? 180).map((x) => ({ label: `${x.value} kg`, value: x.value }));
        break;
      case 4:
        items = getDebutStatWeights(position, position === "GK" ? "div" : "pac").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 5:
        items = getDebutStatWeights(position, position === "GK" ? "han" : "sho").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 6:
        items = getDebutStatWeights(position, position === "GK" ? "kic" : "pas").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 7:
        items = getDebutStatWeights(position, position === "GK" ? "ref" : "dri").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 8:
        items = getDebutStatWeights(position, position === "GK" ? "spd" : "def").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 9:
        items = getDebutStatWeights(position, position === "GK" ? "pos" : "phy").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 10:
        items = CAREER_LENGTH_POOL.map((x) => ({
          label: `${x.value} Năm`,
          value: x.value,
        }));
        break;
      case 11:
        const leagueWeights = getLeagueWeights(leagues, draftData.nationality);
        items = leagueWeights.map((x) => ({
          label: x.value.name,
          value: x.value,
        }));
        break;
      case 12:
        if (filteredClubs.length === 0) {
          items = [{ label: "Không có CLB", value: { id: "", name: "Không có CLB" } }];
        } else {
          const clubWeights = getClubWeights(filteredClubs);
          items = clubWeights.map((x) => ({
            label: x.value.name,
            value: x.value,
          }));
        }
        break;
    }
    setWheelItems((currentItems) => {
      const isSamePool = currentItems.length === items.length
        && currentItems.every((item, index) => item.label === items[index]?.label);
      return isSamePool ? currentItems : items;
    });
  }, [activeStep, isMounted, leagues, filteredClubs, mode, position, draftData.height, draftData.nationality]);

  // ── SETUP WHEELS SPIN RESOLVER ──
  function handleSetupSpin() {
    if (isSpinning || activeStep >= 13 || wheelItems.length === 0) return;

    let result: SetupWheelValue | null = null;
    let idx = -1;

    switch (activeStep) {
      case 0:
        result = resolveWeightedOutcome(NATIONALITY_POOL);
        idx = NATIONALITY_POOL.findIndex((x) => x.value === result);
        setTempValue(typeof result === "string" ? `${getFlagEmoji(result)} ${result}` : null);
        break;
      case 1:
        result = resolveWeightedOutcome(DEBUT_AGE_POOL);
        idx = DEBUT_AGE_POOL.findIndex((x) => x.value === result);
        setTempValue(`${result} Tuổi`);
        break;
      case 2: {
        const heightWeights = getHeightWeights(position);
        result = resolveWeightedOutcome(heightWeights);
        idx = heightWeights.findIndex((x) => x.value === result);
        setTempValue(`${result} cm`);
        break;
      }
      case 3: {
        const weightWeights = getWeightWeights(draftData.height ?? 180);
        result = resolveWeightedOutcome(weightWeights);
        idx = weightWeights.findIndex((x) => x.value === result);
        setTempValue(`${result} kg`);
        break;
      }
      case 4: case 5: case 6: case 7: case 8: case 9: {
        const statKeyMap = position === "GK"
          ? ["div", "han", "kic", "ref", "spd", "pos"]
          : ["pac", "sho", "pas", "dri", "def", "phy"];
        const statKey = statKeyMap[activeStep - 4];
        const statWeights = getDebutStatWeights(position, statKey);
        result = resolveWeightedOutcome(statWeights);
        idx = statWeights.findIndex((x) => x.value === result);
        setTempValue(`${result}`);
        break;
      }
      case 10:
        result = resolveWeightedOutcome(CAREER_LENGTH_POOL);
        idx = CAREER_LENGTH_POOL.findIndex((x) => x.value === result);
        setTempValue(`${result} Năm`);
        break;
      case 11:
        const leagueWeights = getLeagueWeights(leagues, draftData.nationality);
        result = resolveWeightedOutcome(leagueWeights);
        const leagueResult = result;
        if (leagueResult && typeof leagueResult !== "string" && typeof leagueResult !== "number") {
          idx = leagueWeights.findIndex((x) => x.value.id === leagueResult.id);
          setTempValue(leagueResult.name);
        }
        break;
      case 12:
        if (filteredClubs.length === 0) {
          result = { id: "", name: "Không có CLB", leagueId: "", prestige: 3, continentalType: "none" };
          idx = 0;
        } else {
          const clubWeights = getClubWeights(filteredClubs);
          result = resolveWeightedOutcome(clubWeights);
          const clubResult = result && typeof result === "object" ? result : null;
          idx = clubWeights.findIndex((x) => x.value.id === clubResult?.id);
          const fullClub = filteredClubs.find((c) => c.id === clubResult?.id);
          if (fullClub) {
            result = { ...fullClub };
          }
        }
        setTempValue(typeof result === "object" && result !== null ? result.name : null);
        break;
    }

    setTargetIndex(idx);
    startSpin();
    setupResultRef.current = result;
  }

  function handleSetupSpinComplete() {
    const result = setupResultRef.current;
    resolveStep(activeStep, result, position);
    setStep(activeStep + 1);
    setTargetIndex(-1);
    setTempValue(null);
  }

  return {
    wheelItems,
    targetIndex,
    tempValue,
    activeStep,
    isSpinning,
    draftData,
    handleSetupSpin,
    handleSetupSpinComplete,
  };
}
