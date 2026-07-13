"use client";

import { useEffect, useState } from "react";
import { getNationalContinentalCup, getNationalTier } from "@/lib/wheel-engine/weight-calculator";
import { getStandingWheelPool, getContinentalCupLabel } from "../lib/simulation-helpers";

interface UseCareerWheelItemsProps {
  careerSubStep: string;
  isMounted: boolean;
  mode: string;
  currentContinentalCup: string;
  currentAge: number;
  playerNationality: string;
  currentClub: any;
  currentOvr: number;
  leagueSize: number;
  selectedStatsList: string[];
  position: string;
  yearSimResult: any;
  selectorIndex: number;
  yearEvolutionDirection?: "increase" | "decrease" | "maintain" | null;
}

export function useCareerWheelItems({
  careerSubStep,
  isMounted,
  mode,
  currentContinentalCup,
  currentAge,
  playerNationality,
  currentClub,
  currentOvr,
  leagueSize,
  selectedStatsList,
  position,
  yearSimResult,
  selectorIndex,
  yearEvolutionDirection,
}: UseCareerWheelItemsProps) {
  const [careerWheelItems, setCareerWheelItems] = useState<{ label: string; value: any; weight?: number }[]>([]);

  useEffect(() => {
    if (!isMounted || mode !== "career") return;

    const rating = yearSimResult?.matchRating ?? 7.0;
    let items: { label: string; value: any; weight?: number }[] = [];

    switch (careerSubStep) {
      case "dir_increase": {
        let yesW = 40, noW = 60;
        if (rating >= 7.50)      { yesW = 80; noW = 20; }
        else if (rating >= 7.00) { yesW = 60; noW = 40; }
        else if (rating >= 6.40) { yesW = 40; noW = 60; }
        else                     { yesW = 5;  noW = 95; }
        if (currentAge <= 22)    { yesW = Math.min(95, yesW + 10); noW = Math.max(5, noW - 10); }
        else if (currentAge >= 30){ yesW = Math.max(5, yesW - 10); noW = Math.min(95, noW + 10); }
        items = [
          { label: "TĂNG CHỈ SỐ (YES)", value: "yes", weight: yesW },
          { label: "KHÔNG TĂNG (NO)",    value: "no",  weight: noW  },
        ];
        break;
      }
      case "dir_decrease": {
        let yesW = 30, noW = 70;
        if (rating <= 6.30)      { yesW = 70; noW = 30; }
        else if (rating < 6.80)  { yesW = 30; noW = 70; }
        else                     { yesW = 5;  noW = 95; }
        if (currentAge <= 22)    { yesW = Math.max(5, yesW - 20);  noW = Math.min(95, noW + 20); }
        else if (currentAge >= 30){ yesW = Math.min(95, yesW + 15); noW = Math.max(5, noW - 15); }
        items = [
          { label: "GIẢM CHỈ SỐ (YES)", value: "yes", weight: yesW },
          { label: "GIỮ NGUYÊN (NO)",   value: "no",  weight: noW  },
        ];
        break;
      }
      case "count":
        items = [
          { label: "1 Chỉ Số", value: 1, weight: 45 },
          { label: "2 Chỉ Số", value: 2, weight: 35 },
          { label: "3 Chỉ Số", value: 3, weight: 15 },
          { label: "4 Chỉ Số", value: 4, weight: 5  },
        ];
        break;
      case "magnitude": {
        const isInc = yearEvolutionDirection === "increase";
        let pool: { label: string; value: number; weight: number }[] = [];
        if (isInc) {
          if (rating >= 7.60) {
            pool = [
              { label: "1 Điểm", value: 1, weight: 3  },
              { label: "2 Điểm", value: 2, weight: 7  },
              { label: "3 Điểm", value: 3, weight: 15 },
              { label: "4 Điểm", value: 4, weight: 25 },
              { label: "5 Điểm", value: 5, weight: 35 },
              { label: "6 Điểm", value: 6, weight: 15 },
            ];
          } else if (rating >= 6.80) {
            pool = [
              { label: "1 Điểm", value: 1, weight: 10 },
              { label: "2 Điểm", value: 2, weight: 25 },
              { label: "3 Điểm", value: 3, weight: 35 },
              { label: "4 Điểm", value: 4, weight: 20 },
              { label: "5 Điểm", value: 5, weight: 8  },
              { label: "6 Điểm", value: 6, weight: 2  },
            ];
          } else {
            pool = [
              { label: "1 Điểm", value: 1, weight: 50 },
              { label: "2 Điểm", value: 2, weight: 30 },
              { label: "3 Điểm", value: 3, weight: 12 },
              { label: "4 Điểm", value: 4, weight: 5  },
              { label: "5 Điểm", value: 5, weight: 2  },
              { label: "6 Điểm", value: 6, weight: 1  },
            ];
          }
        } else {
          // decrease or maintain → same magnitude pools but inverse meaning
          if (rating <= 6.20) {
            pool = [
              { label: "1 Điểm", value: 1, weight: 3  },
              { label: "2 Điểm", value: 2, weight: 7  },
              { label: "3 Điểm", value: 3, weight: 15 },
              { label: "4 Điểm", value: 4, weight: 25 },
              { label: "5 Điểm", value: 5, weight: 35 },
              { label: "6 Điểm", value: 6, weight: 15 },
            ];
          } else if (rating < 6.80) {
            pool = [
              { label: "1 Điểm", value: 1, weight: 15 },
              { label: "2 Điểm", value: 2, weight: 30 },
              { label: "3 Điểm", value: 3, weight: 35 },
              { label: "4 Điểm", value: 4, weight: 15 },
              { label: "5 Điểm", value: 5, weight: 4  },
              { label: "6 Điểm", value: 6, weight: 1  },
            ];
          } else {
            pool = [
              { label: "1 Điểm", value: 1, weight: 60 },
              { label: "2 Điểm", value: 2, weight: 25 },
              { label: "3 Điểm", value: 3, weight: 10 },
              { label: "4 Điểm", value: 4, weight: 3  },
              { label: "5 Điểm", value: 5, weight: 1  },
              { label: "6 Điểm", value: 6, weight: 1  },
            ];
          }
        }
        items = pool;
        break;
      }
      case "selector": {
        const coreStats = position === "GK"
          ? [
              { key: "div", name: "Diving (DIV)" },
              { key: "han", name: "Handling (HAN)" },
              { key: "kic", name: "Kicking (KIC)" },
              { key: "ref", name: "Reflexes (REF)" },
              { key: "spd", name: "Speed (SPD)" },
              { key: "pos", name: "Positioning (POS)" },
            ]
          : [
              { key: "pac", name: "Pace (PAC)" },
              { key: "sho", name: "Shooting (SHO)" },
              { key: "pas", name: "Passing (PAS)" },
              { key: "dri", name: "Dribbling (DRI)" },
              { key: "def", name: "Defending (DEF)" },
              { key: "phy", name: "Physical (PHY)" },
            ];
        const currentSelectedList = selectorIndex === 0 ? [] : selectedStatsList;
        const available = coreStats.filter((c) => !currentSelectedList.includes(c.key));
        items = available.map((c) => {
          let w = 10;
          if (position === "GK") {
            if (["ref", "div"].includes(c.key)) w = 25;
          } else if (["ST", "LW", "RW"].includes(position)) {
            if (["sho", "pac", "dri"].includes(c.key)) w = 25;
          } else if (["CB", "LB", "RB"].includes(position)) {
            if (["def", "phy"].includes(c.key)) w = 25;
          } else {
            if (["pas", "dri"].includes(c.key)) w = 25;
          }
          return { value: c.key, label: c.name.toUpperCase(), weight: w };
        });
        break;
      }
      case "standing": {
        const standingPool = getStandingWheelPool(currentClub?.prestige ?? 3, currentOvr, leagueSize, yearSimResult?.apps ?? 38);
        items = standingPool.map((x) => ({
          label: x.value === 1 ? "🏆 VÔ ĐỊCH (HẠNG 1)" : x.value === 2 ? "🥈 Á QUÂN (HẠNG 2)" : `HẠNG ${x.value}`,
          value: x.value,
          weight: x.weight,
        }));
        break;
      }
      case "domestic_cup": {
        const prestige = currentClub?.prestige ?? 3;
        const wWin  = 5 + prestige * 3 + 2; // luckRating=10 default → floor(10/4)=2
        const wRun  = 8 + prestige * 3;
        const wSemi = 15 + prestige * 2;
        const wExit = Math.max(10, 72 - prestige * 8);
        items = [
          { label: "Vô Địch Cup",   value: "Winner",     weight: wWin  },
          { label: "Á Quân Cup",    value: "Runner-Up",  weight: wRun  },
          { label: "Vào Bán Kết",   value: "Semi-Finals", weight: wSemi },
          { label: "Bị Loại Sớm",  value: "Early Exit", weight: wExit },
        ];
        break;
      }
      case "continental_cup": {
        const nameLabel = getContinentalCupLabel(currentContinentalCup);
        const prestige  = currentClub?.prestige ?? 3;
        const wWin  = 3 + prestige * 3 + 2; // luck default=10
        const wRun  = 7 + prestige * 2;
        const wSemi = 15 + prestige * 2;
        const wGroup = Math.max(10, 75 - prestige * 7);
        items = [
          { label: `Vô Địch ${nameLabel}`,    value: "Winner",      weight: wWin   },
          { label: `Á Quân ${nameLabel}`,     value: "Runner-Up",   weight: wRun   },
          { label: `Bán Kết ${nameLabel}`,    value: "Semi-Finals", weight: wSemi  },
          { label: `Vòng Bảng ${nameLabel}`,  value: "Group Stage", weight: wGroup },
        ];
        break;
      }
      case "national_callup": {
        const tier   = getNationalTier(playerNationality);
        const midOvr = tier === 1 ? 80 : tier === 2 ? 75 : 70;
        const ovrDiff = currentOvr - midOvr;
        let wCall = Math.max(5, Math.min(90, 50 + ovrDiff * 2));
        if (rating >= 7.40)      wCall = Math.min(90, wCall + 20);
        else if (rating <= 6.50) wCall = Math.max(5,  wCall - 20);
        const wMiss = Math.max(5, 100 - wCall);
        items = [
          { label: "Được Triệu Tập Lên ĐTQG", value: "called_up", weight: wCall },
          { label: "Không Được Gọi",           value: "missed",    weight: wMiss },
        ];
        break;
      }
      case "national_tournament": {
        const nationCupName = getNationalContinentalCup(playerNationality);
        const tourneyName   = currentAge % 4 === 0 ? "FIFA World Cup" : nationCupName;
        const ovr   = currentOvr;
        const wWin  = Math.max(1, 3  + 2 + Math.floor((ovr - 70) * 0.2));  // luck default=10
        const wRun  = Math.max(1, 7  + Math.floor((ovr - 70) * 0.2));
        const wSemi = 20;
        const wGroup = Math.max(10, 70 - Math.floor((ovr - 70) * 0.4));
        items = [
          { label: `Vô Địch ${tourneyName} 🏆`, value: "Winner",      weight: wWin   },
          { label: `Á Quân ${tourneyName}`,      value: "Runner-Up",   weight: wRun   },
          { label: `Bán Kết ${tourneyName}`,     value: "Semi-Finals", weight: wSemi  },
          { label: `Vòng Bảng ${tourneyName}`,   value: "Group Stage", weight: wGroup },
        ];
        break;
      }
    }
    setCareerWheelItems(items);
  }, [careerSubStep, isMounted, mode, currentContinentalCup, currentAge, playerNationality, currentClub, currentOvr, leagueSize, selectedStatsList, position, yearSimResult, selectorIndex, yearEvolutionDirection]);

  return { careerWheelItems, setCareerWheelItems };
}
