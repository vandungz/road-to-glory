"use client";

import { useState, useEffect } from "react";
import { useWheelUiStore } from "../stores/useWheelUiStore";
import { resolveWeightedOutcome } from "@/lib/wheel-engine/spin-resolver";
import { getFlagEmoji } from "@/types/squad";
import {
  NATIONALITY_POOL,
  DEBUT_AGE_POOL,
  CAREER_LENGTH_POOL,
  getLeagueWeights,
  getClubWeights,
  getDebutStatWeights,
} from "@/lib/wheel-engine/weight-calculator";

interface UseSetupStageProps {
  position: string;
  leagues: any[];
  clubs: any[];
  isMounted: boolean;
  mode: "setup" | "career" | "retired";
}

export function useSetupStage({ position, leagues, clubs, isMounted, mode }: UseSetupStageProps) {
  const [wheelItems, setWheelItems] = useState<{ label: string; value: any }[]>([]);
  const [targetIndex, setTargetIndex] = useState<number>(-1);
  const [tempValue, setTempValue] = useState<string | number | null>(null);

  const {
    activeStep,
    isSpinning,
    draftData,
    startSpin,
    resolveStep,
    setStep,
  } = useWheelUiStore();

  const filteredClubs = clubs.filter((c) => c.leagueId === draftData.leagueId);

  // ── THIẾT LẬP MÚI BÁNH XE SETUP ──
  useEffect(() => {
    if (!isMounted || mode !== "setup") return;

    let items: { label: string; value: any }[] = [];
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
        items = getDebutStatWeights(position, position === "GK" ? "div" : "pac").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 3:
        items = getDebutStatWeights(position, position === "GK" ? "han" : "sho").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 4:
        items = getDebutStatWeights(position, position === "GK" ? "kic" : "pas").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 5:
        items = getDebutStatWeights(position, position === "GK" ? "ref" : "dri").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 6:
        items = getDebutStatWeights(position, position === "GK" ? "spd" : "def").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 7:
        items = getDebutStatWeights(position, position === "GK" ? "pos" : "phy").map((x) => ({ label: `${x.value}`, value: x.value }));
        break;
      case 8:
        items = CAREER_LENGTH_POOL.map((x) => ({
          label: `${x.value} Năm`,
          value: x.value,
        }));
        break;
      case 9:
        const leagueWeights = getLeagueWeights(leagues);
        items = leagueWeights.map((x) => ({
          label: x.value.name,
          value: x.value,
        }));
        break;
      case 10:
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
    setWheelItems(items);
  }, [activeStep, isMounted, leagues, filteredClubs.length, mode, position]);

  // ── SETUP WHEELS SPIN RESOLVER ──
  function handleSetupSpin() {
    if (isSpinning || activeStep >= 11 || wheelItems.length === 0) return;

    let result: any = null;
    let idx = -1;

    switch (activeStep) {
      case 0:
        result = resolveWeightedOutcome(NATIONALITY_POOL);
        idx = NATIONALITY_POOL.findIndex((x) => x.value === result);
        setTempValue(`${getFlagEmoji(result)} ${result}`);
        break;
      case 1:
        result = resolveWeightedOutcome(DEBUT_AGE_POOL);
        idx = DEBUT_AGE_POOL.findIndex((x) => x.value === result);
        setTempValue(`${result} Tuổi`);
        break;
      case 2: case 3: case 4: case 5: case 6: case 7: {
        const statKeyMap = position === "GK"
          ? ["div", "han", "kic", "ref", "spd", "pos"]
          : ["pac", "sho", "pas", "dri", "def", "phy"];
        const statKey = statKeyMap[activeStep - 2];
        const statWeights = getDebutStatWeights(position, statKey);
        result = resolveWeightedOutcome(statWeights);
        idx = statWeights.findIndex((x) => x.value === result);
        setTempValue(`${result}`);
        break;
      }
      case 8:
        result = resolveWeightedOutcome(CAREER_LENGTH_POOL);
        idx = CAREER_LENGTH_POOL.findIndex((x) => x.value === result);
        setTempValue(`${result} Năm`);
        break;
      case 9:
        const leagueWeights = getLeagueWeights(leagues);
        result = resolveWeightedOutcome(leagueWeights);
        idx = leagueWeights.findIndex((x) => x.value.id === result.id);
        setTempValue(result.name);
        break;
      case 10:
        if (filteredClubs.length === 0) {
          result = { id: "", name: "Không có CLB", prestige: 3, continentalType: "none" };
          idx = 0;
        } else {
          const clubWeights = getClubWeights(filteredClubs);
          result = resolveWeightedOutcome(clubWeights);
          idx = clubWeights.findIndex((x) => x.value.id === result.id);
          const fullClub = filteredClubs.find((c) => c.id === result.id);
          if (fullClub) {
            result = { id: fullClub.id, name: fullClub.name, prestige: fullClub.prestige, continentalType: fullClub.continentalType };
          }
        }
        setTempValue(result.name);
        break;
    }

    setTargetIndex(idx);
    startSpin();
    (window as any)._tempDraftResult = result;
  }

  function handleSetupSpinComplete() {
    const result = (window as any)._tempDraftResult;
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
