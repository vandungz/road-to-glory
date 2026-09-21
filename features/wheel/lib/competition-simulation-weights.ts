// features/wheel/lib/simulation-helpers.ts

import {
  getContinentalCupLabel,
  getDomesticCupNameByLeagueId,
  getDomesticCupNameFromLeagueName,
} from "@/lib/competitions";

export {
  getContinentalCupLabel,
  getDomesticCupNameByLeagueId,
  getDomesticCupNameFromLeagueName,
};

export function calculateContinentalQualification(
  leagueId: string,
  standing: number,
  continentalCupResult?: string | null,
  currentContinentalCup?: string,
): string {
  if (!leagueId) return "none";

  // Vô địch cúp châu lục → tự động có vé mùa sau (bất kể hạng mấy)
  if (continentalCupResult === "Winner" && currentContinentalCup && currentContinentalCup !== "none") {
    // UEFA pathway: thắng UEL → UCL, thắng UECL → UEL
    if (currentContinentalCup === "UEL") return "UCL";
    if (currentContinentalCup === "UECL") return "UEL";
    return currentContinentalCup;
  }

  const id = leagueId.toUpperCase();

  // 1. Nhóm giải siêu cấp châu Âu (Top 4 leagues: Anh, Tây Ban Nha, Đức, Ý)
  if (["ENG1", "ESP1", "GER1", "ITA1"].includes(id)) {
    if (standing <= 4) return "UCL";
    if (standing <= 6) return "UEL";
    if (standing === 7) return "UECL";
  }
  
  // 2. Nhóm giải cấp 2 châu Âu (Pháp, Bồ Đào Nha, Hà Lan, Thổ Nhĩ Kỳ, Bỉ)
  if (["FRA1", "POR1", "NED1", "TUR1", "BEL1"].includes(id)) {
    if (standing <= 2) return "UCL";
    if (standing <= 4) return "UEL";
    if (standing === 5) return "UECL";
  }
  
  // 3. Nhóm giải cấp 3 châu Âu (Scotland...)
  if (["SCO1"].includes(id)) {
    if (standing === 1) return "UCL";
    if (standing === 2) return "UEL";
    if (standing === 3) return "UECL";
  }
  
  // 4. Nhóm Nam Mỹ (Brazil, Argentina) — Libertadores + Sudamericana
  if (["BRA1", "ARG1"].includes(id)) {
    if (standing <= 6) return "Libertadores";
    if (standing <= 12) return "Sudamericana";
  }
  if (["COL1", "ECU1", "URU1", "CHI1"].includes(id)) {
    if (standing <= 2) return "Libertadores";
    if (standing <= 6) return "Sudamericana";
  }
  
  // 5. Nhóm Châu Á (Nhật Bản, Hàn Quốc, Saudi Arabia...)
  if (["JPN1", "KOR1", "KSA1"].includes(id)) {
    if (standing <= 3) return "AFC_CL";
  }
  if (["QAT1", "UAE1", "AUS1", "IND1", "CHN1"].includes(id)) {
    if (standing === 1) return "AFC_CL";
  }
  
  // 6. Nhóm Bắc Mỹ (Mỹ, Mexico)
  if (["USA1", "MEX1"].includes(id)) {
    if (standing <= 3) return "CONCACAF_CC";
  }

  // 7. Nhóm Châu Phi (Egypt, South Africa...)
  if (["EGY1", "RSA1"].includes(id)) {
    if (standing <= 2) return "CAF_CL";
  }

  return "none";
}

/** Resolve domestic cup label — prefer leagueId when available. */
export function getDomesticCupName(
  leagueNameOrId: string,
  leagueId?: string | null,
): string {
  if (leagueId) {
    const byId = getDomesticCupNameByLeagueId(leagueId);
    if (byId !== "Cup Quốc Gia") return byId;
  }
  const asId = getDomesticCupNameByLeagueId(leagueNameOrId);
  if (asId !== "Cup Quốc Gia") return asId;
  return getDomesticCupNameFromLeagueName(leagueNameOrId);
}

/** Calendar year of a career season (debutAge → 2026). Shared by preview + resolve. */
export function getSeasonCalendarYear(currentAge: number, debutAge: number): number {
  return 2026 + (currentAge - debutAge);
}

/**
 * National tournament display name for a season.
 * World Cup years: calendarYear % 4 === 2 (2026, 2030, …) — matches sim/journey.
 */
export function getNationalTournamentName(
  nationality: string,
  currentAge: number,
  debutAge: number,
  getContinentalCup: (nationality: string) => string,
): string {
  const year = getSeasonCalendarYear(currentAge, debutAge);
  return year % 4 === 2 ? "FIFA World Cup" : getContinentalCup(nationality);
}

import { getClubThreshold, estimateAppsRatio, estimateExpectedLeagueApps } from "@/lib/club-fit";

export { getClubThreshold, estimateAppsRatio, estimateExpectedLeagueApps };

/**
 * Influence proxy ∈ [0.35, 1] — bench stars pull less than nailed-on starters.
 * Prefer known apps when present; else expected league apps from OVR×threshold, adjusted by standingResult if available (SoT §7.5.3).
 */
export function getInfluenceProxy(
  ovr: number,
  clubPrestige: number,
  leagueSize: number,
  knownApps?: number | null,
  standingResult?: number | null,
): number {
  let apps: number;
  if (knownApps != null && knownApps > 0) {
    apps = knownApps;
  } else {
    const baseApps = estimateExpectedLeagueApps(ovr, clubPrestige, leagueSize);
    if (standingResult != null && standingResult > 0) {
      const standingBonus = standingResult === 1 ? 0.12 : standingResult <= 4 ? 0.06 : standingResult >= Math.round(leagueSize * 0.7) ? -0.12 : 0;
      const leagueMatches = Math.max(1, (Math.max(2, leagueSize) - 1) * 2);
      apps = Math.max(1, Math.round(leagueMatches * Math.min(0.95, Math.max(0.05, (baseApps / leagueMatches) + standingBonus))));
    } else {
      apps = baseApps;
    }
  }
  return Math.min(1, Math.max(0.35, apps / 55));
}

export function getDomesticCupWeights(
  prestige: number,
  luckRating: number,
  ovr: number,
  influenceProxy: number,
) {
  const luck = Math.floor(luckRating / 4);
  const diff = ovr - getClubThreshold(prestige);
  const pull = Math.round(Math.max(-10, Math.min(10, diff * 0.75 * influenceProxy)));

  return {
    wWin: Math.max(1, 4 + prestige * 2 + luck + Math.max(0, pull)),
    wRun: Math.max(1, 6 + prestige * 2 + Math.max(0, Math.round(pull * 0.6))),
    wSemi: Math.max(2, 10 + prestige * 2 + Math.round(pull * 0.4)),
    wQF: Math.max(5, 15 + prestige * 2 + Math.round(pull * 0.2)),
    wR16: Math.max(8, 20 + prestige * 1),
    wR32: Math.max(10, 22 - prestige * 2 - Math.round(pull * 0.3)),
    wExit: Math.max(10, 35 - prestige * 5 - pull),
  };
}

export function getContinentalCupWeights(
  prestige: number,
  luckRating: number,
  ovr: number,
  influenceProxy: number,
) {
  const luck = Math.floor(luckRating / 4);
  const diff = ovr - (getClubThreshold(prestige) + 4);
  const pull = Math.round(Math.max(-8, Math.min(8, diff * 0.55 * influenceProxy)));

  return {
    wWin: Math.max(1, 2 + prestige * 2 + luck + Math.max(0, pull)),
    wRun: Math.max(1, 5 + prestige * 2 + Math.max(0, Math.round(pull * 0.5))),
    wSemi: Math.max(2, 10 + prestige * 2 + Math.round(pull * 0.3)),
    wQF: Math.max(5, 16 + prestige * 2 + Math.round(pull * 0.2)),
    wR16: Math.max(8, 22 + prestige * 1),
    wGroup: Math.max(12, 45 - prestige * 6 - pull),
  };
}

export function getNationalTournamentWeights(
  ovr: number,
  luckRating: number,
  midOvr: number,
  influenceProxy = 1,
) {
  const luck = Math.floor(luckRating / 4);
  const diff = ovr - midOvr;
  const pull = Math.round(Math.max(-10, Math.min(14, diff * 0.4 * influenceProxy)));

  return {
    wWin: Math.max(1, 2 + luck + Math.max(0, pull)),
    wRun: Math.max(1, 5 + Math.max(0, Math.round(pull * 0.6))),
    wSemi: Math.max(3, 10 + Math.round(pull * 0.4)),
    wQF: Math.max(6, 18 + Math.round(pull * 0.3)),
    wR16: Math.max(10, 25 + Math.round(pull * 0.1)),
    wGroup: Math.max(12, 40 - pull * 1.5),
  };
}

/** Position depth modifier for National Team call-up threshold (SoT §7.5.3). */
export function getPositionMidOvrModifier(position?: string): number {
  if (!position) return 0;
  const pos = position.toUpperCase();
  if (["LB", "RB", "CDM", "GK"].includes(pos)) return -2; // lower depth threshold
  if (["ST", "LW", "RW", "CAM"].includes(pos)) return 1; // higher competition threshold
  return 0;
}

/** Call-up weights — form from this-season standing (not yearSimResult). */
export function getNationalCallupWeights(
  ovr: number,
  baseMidOvr: number,
  standingResult: number | null | undefined,
  leagueSize: number,
  position?: string,
): { wCall: number; wMiss: number } {
  const midOvr = baseMidOvr + getPositionMidOvrModifier(position);
  const ovrDiff = ovr - midOvr;
  let wCall = Math.max(5, Math.min(90, 50 + ovrDiff * 2));

  if (standingResult != null && standingResult > 0 && leagueSize > 0) {
    const topCut = Math.max(1, Math.round(leagueSize * 0.25));
    const upperMid = Math.max(1, Math.round(leagueSize * 0.4));
    const lowerMid = Math.max(1, Math.round(leagueSize * 0.55));
    const botCut = Math.max(1, Math.round(leagueSize * 0.7));
    if (standingResult <= topCut) wCall = Math.min(90, wCall + 18);
    else if (standingResult <= upperMid) wCall = Math.min(90, wCall + 10);
    else if (standingResult >= botCut) wCall = Math.max(5, wCall - 18);
    else if (standingResult >= lowerMid) wCall = Math.max(5, wCall - 10);
  }

  const wMiss = Math.max(5, 100 - wCall);
  return { wCall, wMiss };
}

export function getSeasonYearString(age: number, debutAge: number): string {
  const startYear = 2025 + (age - debutAge);
  const endYearShort = (startYear + 1) % 100;
  const endYearStr = endYearShort < 10 ? `0${endYearShort}` : `${endYearShort}`;
  return `${startYear}/${endYearStr}`;
}

export function getStandingWheelPool(
  clubPrestige: number,
  ovr: number,
  leagueSize: number,
  appsOrNull: number | null | undefined = null,
  priorClubStanding?: number | null,
) {
  const targetOvr = getClubThreshold(clubPrestige);
  const diff = ovr - targetOvr;
  const influenceFactor = getInfluenceProxy(ovr, clubPrestige, leagueSize, appsOrNull);

  const prestigeExpectedPos = Math.max(1, Math.min(leagueSize, Math.round(leagueSize - clubPrestige * (leagueSize / 5) + 1)));
  // Club continuity is deliberately a light signal: prestige remains the
  // primary baseline, while the immediately preceding same-club season adds
  // context without letting an old career history dominate after a transfer.
  const expectedPos = priorClubStanding
    ? Math.max(1, Math.min(leagueSize, Math.round(prestigeExpectedPos * 0.8 + priorClubStanding * 0.2)))
    : prestigeExpectedPos;
  const prestigeTier = Math.max(1, Math.min(5, Math.round(clubPrestige)));
  const prestigeTopModifier = (prestigeTier - 3) * 4;
  const prestigeBottomModifier = -(prestigeTier - 3) * 3;

  const pool = Array.from({ length: leagueSize }, (_, i) => {
    const pos = i + 1;
    const dist = Math.abs(pos - expectedPos);
    const baseWeight = Math.max(1, 40 - dist * (35 / leagueSize));

    let ovrModifier = 0;
    let prestigeModifier = 0;
    if (pos <= Math.round(leagueSize * 0.25)) prestigeModifier = prestigeTopModifier;
    if (pos >= Math.round(leagueSize * 0.7)) prestigeModifier = prestigeBottomModifier;
    if (diff > 0) {
      if (pos <= Math.round(leagueSize * 0.25)) ovrModifier = diff * 1.5 * influenceFactor;
      if (pos >= Math.round(leagueSize * 0.7)) ovrModifier = -diff * 1.2 * influenceFactor;
    } else if (diff < 0) {
      if (pos <= Math.round(leagueSize * 0.25)) ovrModifier = diff * 1.2 * influenceFactor;
      if (pos >= Math.round(leagueSize * 0.7)) ovrModifier = -diff * 1.5 * influenceFactor;
    }

    const finalWeight = Math.max(1, Math.round(baseWeight + prestigeModifier + ovrModifier));
    return {
      value: pos,
      weight: finalWeight,
    };
  });

  return pool;
}

