import type { Formation } from "./game";

// ============================================================
// SLOT CONFIGURATION — Formation pitch positions
// ============================================================

export interface SlotConfig {
  index: number;
  position: string; // "GK" | "LB" | "CB" | "RB" | "CDM" | "CM" | "CAM" | "LW" | "RW" | "ST" | etc.
  x: number; // % from left edge of pitch container
  y: number; // % from top edge of pitch container
}

/**
 * Tactical view: attacking direction is UPWARD (low y = closer to opponent goal).
 * GK sits near bottom (high y). Forwards sit near top (low y).
 */
export const FORMATION_SLOTS: Record<Formation, SlotConfig[]> = {
  "4-3-3": [
    { index: 0,  position: "GK",  x: 50, y: 87 },
    { index: 1,  position: "LB",  x: 12, y: 71 },
    { index: 2,  position: "CB",  x: 35, y: 71 },
    { index: 3,  position: "CB",  x: 65, y: 71 },
    { index: 4,  position: "RB",  x: 88, y: 71 },
    { index: 5,  position: "CM",  x: 22, y: 50 },
    { index: 6,  position: "CM",  x: 50, y: 50 },
    { index: 7,  position: "CM",  x: 78, y: 50 },
    { index: 8,  position: "LW",  x: 14, y: 19 },
    { index: 9,  position: "ST",  x: 50, y: 14 },
    { index: 10, position: "RW",  x: 86, y: 19 },
  ],
  "4-4-2": [
    { index: 0,  position: "GK",  x: 50, y: 87 },
    { index: 1,  position: "LB",  x: 12, y: 71 },
    { index: 2,  position: "CB",  x: 35, y: 71 },
    { index: 3,  position: "CB",  x: 65, y: 71 },
    { index: 4,  position: "RB",  x: 88, y: 71 },
    { index: 5,  position: "LM",  x: 12, y: 50 },
    { index: 6,  position: "CM",  x: 38, y: 50 },
    { index: 7,  position: "CM",  x: 62, y: 50 },
    { index: 8,  position: "RM",  x: 88, y: 50 },
    { index: 9,  position: "ST",  x: 35, y: 17 },
    { index: 10, position: "ST",  x: 65, y: 17 },
  ],
  "3-5-2": [
    { index: 0,  position: "GK",  x: 50, y: 87 },
    { index: 1,  position: "CB",  x: 22, y: 71 },
    { index: 2,  position: "CB",  x: 50, y: 71 },
    { index: 3,  position: "CB",  x: 78, y: 71 },
    { index: 4,  position: "LM",  x: 10, y: 50 },
    { index: 5,  position: "CM",  x: 30, y: 50 },
    { index: 6,  position: "CM",  x: 50, y: 50 },
    { index: 7,  position: "CM",  x: 70, y: 50 },
    { index: 8,  position: "RM",  x: 90, y: 50 },
    { index: 9,  position: "ST",  x: 35, y: 17 },
    { index: 10, position: "ST",  x: 65, y: 17 },
  ],
};

// ============================================================
// CLIENT-SAFE PLAYER — excludes hiddenStats
// Never pass hiddenStats to client components or Zustand
// ============================================================

export interface ClientSafePlayer {
  id: string;
  slotIndex: number;
  name: string;
  nationality: string;
  position: string;
  peakOvr: number;
  cardRarity: string; // "bronze" | "silver" | "gold" | "rare_gold" | "epic" | "legendary"
  height?: number;
  preferredFoot?: string;
  debutAge?: number;
  retireAge?: number;
  careerLengthYears?: number;
  statsTimeline?: any[];
  clubStints?: any[];
  achievements?: any;
}

// ============================================================
// FLAG EMOJI UTILITY
// ============================================================

const FLAG_MAP: Record<string, string> = {
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "France": "🇫🇷",
  "Spain": "🇪🇸",
  "Germany": "🇩🇪",
  "Italy": "🇮🇹",
  "Portugal": "🇵🇹",
  "Netherlands": "🇳🇱",
  "Belgium": "🇧🇪",
  "Brazil": "🇧🇷",
  "Argentina": "🇦🇷",
  "Uruguay": "🇺🇾",
  "Colombia": "🇨🇴",
  "Chile": "🇨🇱",
  "Mexico": "🇲🇽",
  "USA": "🇺🇸",
  "Canada": "🇨🇦",
  "Japan": "🇯🇵",
  "South Korea": "🇰🇷",
  "Australia": "🇦🇺",
  "Croatia": "🇭🇷",
  "Poland": "🇵🇱",
  "Switzerland": "🇨🇭",
  "Denmark": "🇩🇰",
  "Sweden": "🇸🇪",
  "Norway": "🇳🇴",
  "Austria": "🇦🇹",
  "Serbia": "🇷🇸",
  "Turkey": "🇹🇷",
  "Greece": "🇬🇷",
  "Czech Republic": "🇨🇿",
  "Slovakia": "🇸🇰",
  "Hungary": "🇭🇺",
  "Romania": "🇷🇴",
  "Ukraine": "🇺🇦",
  "Nigeria": "🇳🇬",
  "Senegal": "🇸🇳",
  "Morocco": "🇲🇦",
  "Ghana": "🇬🇭",
  "Ivory Coast": "🇨🇮",
  "Cameroon": "🇨🇲",
  "Algeria": "🇩🇿",
  "Egypt": "🇪🇬",
  "Saudi Arabia": "🇸🇦",
  "Iran": "🇮🇷",
  "China": "🇨🇳",
  "Ecuador": "🇪🇨",
  "Paraguay": "🇵🇾",
  "Bolivia": "🇧🇴",
  "Ireland": "🇮🇪",
  "Tunisia": "🇹🇳",
  "Panama": "🇵🇦",
  "Bosnia and Herzegovina": "🇧🇦",
  "Qatar": "🇶🇦",
  "Haiti": "🇭🇹",
  "South Africa": "🇿🇦",
  "Cape Verde": "🇨🇻",
};

export function getFlagEmoji(nationality: string): string {
  return FLAG_MAP[nationality] ?? "🏳️";
}

// ============================================================
// RARITY COLORS
// ============================================================

export const RARITY_ACCENT: Record<string, string> = {
  bronze:     "#c67838",
  silver:     "#8fa0ad",
  gold:       "#d4960d",
  rare_gold:  "#c48500",
  epic:       "#7c42c4",
  legendary:  "#e8106e",
};
