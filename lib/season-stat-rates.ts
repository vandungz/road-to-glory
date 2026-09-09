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

export function getEffectiveAttributeRating(
  position: string,
  metric: "goals" | "assists" | "cleanSheets",
  currentStats: Record<string, number>,
  defaultOvr: number
): number {
  const pos = position.toUpperCase();
  const getVal = (k: string) => currentStats[k] ?? defaultOvr;

  if (pos === "GK") {
    const div = getVal("div");
    const han = getVal("han");
    const kic = getVal("kic");
    const ref = getVal("ref");
    const spd = getVal("spd");
    const posGk = getVal("pos");

    if (metric === "cleanSheets") {
      return ref * 0.30 + posGk * 0.25 + div * 0.20 + han * 0.15 + spd * 0.08 + kic * 0.02;
    }
    if (metric === "assists") {
      return kic * 0.70 + posGk * 0.20 + spd * 0.10;
    }
    return defaultOvr;
  }

  const pac = getVal("pac");
  const sho = getVal("sho");
  const pas = getVal("pas");
  const dri = getVal("dri");
  const def = getVal("def");
  const phy = getVal("phy");

  if (pos === "ST") {
    if (metric === "goals") return sho * 0.45 + pac * 0.20 + phy * 0.15 + dri * 0.10 + pas * 0.05 + def * 0.05;
    if (metric === "assists") return pas * 0.40 + dri * 0.25 + phy * 0.15 + pac * 0.10 + sho * 0.05 + def * 0.05;
  } else if (pos === "LW" || pos === "RW") {
    if (metric === "goals") return sho * 0.35 + pac * 0.30 + dri * 0.20 + pas * 0.05 + phy * 0.05 + def * 0.05;
    if (metric === "assists") return pas * 0.35 + dri * 0.30 + pac * 0.20 + sho * 0.05 + phy * 0.05 + def * 0.05;
  } else if (pos === "CAM") {
    if (metric === "goals") return sho * 0.35 + pas * 0.25 + dri * 0.20 + pac * 0.10 + phy * 0.05 + def * 0.05;
    if (metric === "assists") return pas * 0.45 + dri * 0.25 + sho * 0.10 + pac * 0.10 + phy * 0.05 + def * 0.05;
  } else if (pos === "LM" || pos === "RM") {
    if (metric === "goals") return sho * 0.30 + pac * 0.25 + dri * 0.20 + pas * 0.15 + phy * 0.05 + def * 0.05;
    if (metric === "assists") return pas * 0.40 + pac * 0.25 + dri * 0.20 + sho * 0.05 + def * 0.05 + phy * 0.05;
  } else if (pos === "CM") {
    if (metric === "goals") return sho * 0.30 + pas * 0.25 + dri * 0.20 + phy * 0.15 + pac * 0.05 + def * 0.05;
    if (metric === "assists") return pas * 0.45 + dri * 0.20 + sho * 0.15 + phy * 0.10 + pac * 0.05 + def * 0.05;
    if (metric === "cleanSheets") return def * 0.35 + phy * 0.30 + pas * 0.15 + pac * 0.10 + dri * 0.05 + sho * 0.05;
  } else if (pos === "CDM") {
    if (metric === "goals") return sho * 0.35 + phy * 0.30 + pas * 0.15 + def * 0.10 + pac * 0.05 + dri * 0.05;
    if (metric === "assists") return pas * 0.50 + def * 0.20 + dri * 0.15 + phy * 0.10 + pac * 0.03 + sho * 0.02;
    if (metric === "cleanSheets") return def * 0.45 + phy * 0.30 + pas * 0.10 + pac * 0.10 + dri * 0.03 + sho * 0.02;
  } else if (pos === "LB" || pos === "RB") {
    if (metric === "goals") return sho * 0.35 + pac * 0.30 + dri * 0.15 + pas * 0.10 + phy * 0.05 + def * 0.05;
    if (metric === "assists") return pas * 0.40 + pac * 0.30 + dri * 0.15 + def * 0.10 + phy * 0.03 + sho * 0.02;
    if (metric === "cleanSheets") return def * 0.40 + pac * 0.30 + phy * 0.15 + pas * 0.10 + dri * 0.03 + sho * 0.02;
  } else if (pos === "CB") {
    if (metric === "goals") return phy * 0.50 + sho * 0.30 + def * 0.10 + pac * 0.05 + pas * 0.03 + dri * 0.02;
    if (metric === "assists") return pas * 0.55 + phy * 0.25 + def * 0.10 + pac * 0.05 + dri * 0.03 + sho * 0.02;
    if (metric === "cleanSheets") return def * 0.50 + phy * 0.30 + pac * 0.10 + pas * 0.05 + dri * 0.03 + sho * 0.02;
  }

  return defaultOvr;
}

/** Baseline rate bands at OVR~65 (low) and OVR~90 (high), then × competition factor. */
export function getPerAppRates(
  position: string,
  ovr: number,
  context: CompContext,
  currentStats?: Record<string, number>,
): PerAppRates {
  const f = COMP_FACTOR[context];
  const pos = position.toUpperCase();

  const ovrG = currentStats ? getEffectiveAttributeRating(position, "goals", currentStats, ovr) : ovr;
  const ovrA = currentStats ? getEffectiveAttributeRating(position, "assists", currentStats, ovr) : ovr;
  const ovrCs = currentStats ? getEffectiveAttributeRating(position, "cleanSheets", currentStats, ovr) : ovr;

  const tG = ovrT(ovrG);
  const tA = ovrT(ovrA);
  const tCs = ovrT(ovrCs);

  let gLow = 0; let gHigh = 0;
  let aLow = 0; let aHigh = 0;
  let csLow = 0; let csHigh = 0;

  if (pos === "GK") {
    aLow = 0; aHigh = 0.02;
    csLow = 0.28; csHigh = 0.4;
  } else if (pos === "CB") {
    gLow = 0.01; gHigh = 0.04;
    aLow = 0.01; aHigh = 0.04;
    csLow = 0.25; csHigh = 0.38;
  } else if (pos === "LB" || pos === "RB") {
    gLow = 0.02; gHigh = 0.08;
    aLow = 0.06; aHigh = 0.16;
    csLow = 0.22; csHigh = 0.35;
  } else if (pos === "CDM") {
    gLow = 0.02; gHigh = 0.08;
    aLow = 0.07; aHigh = 0.16;
    csLow = 0.18; csHigh = 0.3;
  } else if (pos === "CM") {
    gLow = 0.04; gHigh = 0.14;
    aLow = 0.1; aHigh = 0.22;
    csLow = 0.15; csHigh = 0.28;
  } else if (pos === "CAM") {
    gLow = 0.08; gHigh = 0.24;
    aLow = 0.15; aHigh = 0.32;
  } else if (pos === "LW" || pos === "RW") {
    gLow = 0.1; gHigh = 0.3;
    aLow = 0.1; aHigh = 0.25;
  } else if (pos === "LM" || pos === "RM") {
    gLow = 0.06; gHigh = 0.18;
    aLow = 0.12; aHigh = 0.25;
  } else if (pos === "ST") {
    gLow = 0.25; gHigh = 0.6;
    aLow = 0.07; aHigh = 0.18;
  } else {
    gLow = 0.05; gHigh = 0.12;
    aLow = 0.05; aHigh = 0.12;
  }

  // Prestige-ish bump for CS is applied by caller via clubPrestige on rate_cs
  return {
    goals: lerp(gLow, gHigh, tG) * f,
    assists: lerp(aLow, aHigh, tA) * f,
    cleanSheets: lerp(csLow, csHigh, tCs) * f,
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
