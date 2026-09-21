import { estimateAppsRatio, getClubThreshold } from "@/lib/club-fit";
import { getBuyingPowerBand } from "@/lib/transfer-economy-core";

export function wantsRenewal(params: {
  seasonsLeft: number;
  contractYearsRemaining: number;
  appsRatio: number;
  matchRating: number;
  ovr: number;
  clubPrestige: number;
  proposedWage: number;
  leagueTier: number;
  isDistressSale: boolean;
}): boolean {
  const {
    seasonsLeft,
    contractYearsRemaining: rem,
    appsRatio,
    matchRating,
    ovr,
    clubPrestige,
    proposedWage,
    leagueTier,
    isDistressSale,
  } = params;

  if (seasonsLeft < 1) return false;
  if (isDistressSale) return false;

  const band = getBuyingPowerBand(clubPrestige, leagueTier);
  if (proposedWage > band.maxWage) return false;

  const threshold = getClubThreshold(clubPrestige);
  const fitOk = appsRatio >= 0.45 || ovr >= threshold;
  const formOk = matchRating >= 6.4 || (appsRatio < 0.45 && ovr >= threshold && rem === 1);
  if (!fitOk || !formOk) return false;

  if (rem >= 2) {
    return matchRating >= 7.2 && ovr >= threshold + 2;
  }
  // rem 0 or 1 — priority renew
  return true;
}

export function isDistressSale(matchRating: number, appsRatio: number): boolean {
  return matchRating < 6.2 && appsRatio < 0.4;
}

/** Format € thousands for UI. */
export function formatEuroThousands(k: number): string {
  const euros = k * 1000;
  if (euros >= 1_000_000) {
    const m = euros / 1_000_000;
    return `€${m >= 10 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (euros >= 1_000) {
    return `€${Math.round(euros / 1000)}k`;
  }
  return `€${euros}`;
}

/** Transfer quotes keep two decimals below €10M so club-specific differences remain visible. */
export function formatTransferFee(k: number): string {
  const euros = k * 1000;
  if (euros >= 1_000_000) {
    const millions = euros / 1_000_000;
    return `€${millions >= 10 ? millions.toFixed(1) : millions.toFixed(2)}M`;
  }
  return formatEuroThousands(k);
}

export function expectedAppsAtClub(ovr: number, prestige: number, leagueSize = 20): number {
  const ratio = estimateAppsRatio(ovr, prestige);
  const fixtures = Math.max(1, (Math.max(2, leagueSize) - 1) * 2);
  return Math.max(1, Math.round(fixtures * ratio));
}

/** Expected club prestige band from OVR (1–5). */
export function expectedPrestigeFromOvr(ovr: number): number {
  return Math.min(5, Math.max(1, Math.round((ovr - 50) / 8)));
}

/**
 * P(CLB nhận approach outbound). Pure — no Math.random.
 * Clamp [0.08, 0.85]. SoT plan approach odds.
 * @param effPositionOvr — if provided, used for prestige/fit evaluation (SoT §12.1).
 *   Falls back to `ovr` when absent (e.g., legacy callers).
 * @param influenceScore — Player Influence Score (docs/core-currency-shop-design.md §5),
 *   applied as a small capped top-up INSIDE this function (not by callers) so every call
 *   site (shortlist builder, resolveApproachService, searchClubsForApproachAction) stays
 *   in sync — a mismatch between call sites would trip the client/server drift-check.
 */
