/**
 * Per-appearance G/A/CS rates by position (SoT: docs/core-growth-balance.md §7.0).
 * Pure lib — usable from season simulator (server) without React/Prisma.
 */

export type CompContext = "league" | "domestic_cup" | "continental" | "national";

const COMP_FACTOR: Record<CompContext, number> = {
  league: 1.0,
  domestic_cup: 0.97,
  continental: 0.85,
  national: 0.9,
};

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

/** OVR 65 → 0, OVR 90 → 1 (soft-cap above 92). */
function ovrT(ovr: number): number {
  return clamp01((Math.min(ovr, 92) - 65) / 25);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface PerAppRates {
  goals: number;
  assists: number;
  cleanSheets: number;
}

/** Baseline rate bands at OVR~65 (low) and OVR~90 (high), then × competition factor. */
export function getPerAppRates(
  position: string,
  ovr: number,
  context: CompContext,
): PerAppRates {
  const t = ovrT(ovr);
  const f = COMP_FACTOR[context];
  const pos = position.toUpperCase();

  let gLow = 0;
  let gHigh = 0;
  let aLow = 0;
  let aHigh = 0;
  let csLow = 0;
  let csHigh = 0;

  if (pos === "GK") {
    aLow = 0; aHigh = 0.02;
    csLow = 0.28; csHigh = 0.4;
  } else if (pos === "CB") {
    gLow = 0.02; gHigh = 0.06;
    aLow = 0.01; aHigh = 0.04;
    csLow = 0.25; csHigh = 0.38;
  } else if (pos === "LB" || pos === "RB") {
    gLow = 0.02; gHigh = 0.07;
    aLow = 0.05; aHigh = 0.12;
    csLow = 0.22; csHigh = 0.35;
  } else if (pos === "CDM") {
    gLow = 0.02; gHigh = 0.06;
    aLow = 0.04; aHigh = 0.1;
    csLow = 0.18; csHigh = 0.3;
  } else if (pos === "CM") {
    gLow = 0.05; gHigh = 0.12;
    aLow = 0.08; aHigh = 0.16;
  } else if (pos === "CAM") {
    gLow = 0.1; gHigh = 0.22;
    aLow = 0.12; aHigh = 0.24;
  } else if (pos === "LW" || pos === "RW") {
    gLow = 0.12; gHigh = 0.28;
    aLow = 0.08; aHigh = 0.2;
  } else if (pos === "LM" || pos === "RM") {
    gLow = 0.08; gHigh = 0.18;
    aLow = 0.1; aHigh = 0.2;
  } else if (pos === "ST") {
    gLow = 0.35; gHigh = 0.65;
    aLow = 0.05; aHigh = 0.15;
  } else {
    gLow = 0.05; gHigh = 0.12;
    aLow = 0.05; aHigh = 0.12;
  }

  // Prestige-ish bump for CS is applied by caller via clubPrestige on rate_cs
  return {
    goals: lerp(gLow, gHigh, t) * f,
    assists: lerp(aLow, aHigh, t) * f,
    cleanSheets: lerp(csLow, csHigh, t) * f,
  };
}

/** Slight CS bump from club defensive quality (prestige 1–5 → up to +0.04). */
export function applyPrestigeToCsRate(rateCs: number, clubPrestige: number): number {
  return rateCs + (clubPrestige - 3) * 0.01;
}

export function clampCompetitionStats(
  position: string,
  apps: number,
  goals: number,
  assists: number,
  cleanSheets: number,
): { goals: number; assists: number; cleanSheets: number } {
  if (apps <= 0) return { goals: 0, assists: 0, cleanSheets: 0 };

  let g = Math.max(0, Math.min(apps, goals));
  let a = Math.max(0, Math.min(apps, assists));
  const cs = Math.max(0, Math.min(apps, cleanSheets));

  const isSt = position.toUpperCase() === "ST";
  const gaCap = isSt ? Math.floor(apps * 1.5) : Math.max(apps, Math.floor(apps * 1.25));
  if (g + a > gaCap) {
    const scale = gaCap / (g + a);
    g = Math.floor(g * scale);
    a = Math.max(0, gaCap - g);
  }

  return { goals: g, assists: a, cleanSheets: cs };
}
