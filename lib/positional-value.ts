/**
 * Position-first player valuation primitives.
 *
 * Every supported position evaluates all six of its core attributes. The
 * weighted rating is the specialist signal; current OVR remains a stabilizer
 * so incomplete/legacy snapshots cannot create unreasonable values.
 */

export interface PositionalValueSnapshot {
  positionWeightedRating: number;
  effectivePositionOvr: number;
}

type AttributeWeights = Record<string, number>;

/** Full six-attribute matrix. Each row sums to 1.0. */
export function getPositionAttributeWeights(position: string): AttributeWeights {
  const pos = position.toUpperCase();
  if (pos === "GK") {
    return { ref: 0.28, pos: 0.24, div: 0.20, han: 0.16, kic: 0.08, spd: 0.04 };
  }
  if (pos === "ST" || pos === "CF") {
    return { sho: 0.35, pac: 0.20, dri: 0.15, phy: 0.15, pas: 0.10, def: 0.05 };
  }
  if (pos === "LW" || pos === "RW") {
    return { pac: 0.30, dri: 0.25, sho: 0.20, pas: 0.15, phy: 0.06, def: 0.04 };
  }
  if (pos === "CAM") {
    return { pas: 0.30, dri: 0.25, sho: 0.20, pac: 0.12, phy: 0.08, def: 0.05 };
  }
  if (pos === "CM") {
    return { pas: 0.30, dri: 0.20, phy: 0.18, def: 0.15, pac: 0.10, sho: 0.07 };
  }
  if (pos === "CDM") {
    return { def: 0.32, phy: 0.25, pas: 0.20, pac: 0.10, dri: 0.08, sho: 0.05 };
  }
  if (pos === "LM" || pos === "RM") {
    return { pac: 0.25, pas: 0.25, dri: 0.20, sho: 0.12, phy: 0.10, def: 0.08 };
  }
  if (pos === "LB" || pos === "RB") {
    return { def: 0.28, pac: 0.25, phy: 0.17, pas: 0.15, dri: 0.10, sho: 0.05 };
  }
  return { def: 0.40, phy: 0.30, pac: 0.12, pas: 0.10, dri: 0.05, sho: 0.03 };
}

/**
 * Calculates the specialist position rating and the shared game-wide value.
 * Missing attributes fall back to current OVR for legacy/incomplete saves.
 */
export function computePositionValueSnapshot(
  position: string,
  currentStats: Record<string, number> | undefined,
  currentOvr: number,
): PositionalValueSnapshot {
  if (!currentStats || Object.keys(currentStats).length === 0) {
    return { positionWeightedRating: currentOvr, effectivePositionOvr: currentOvr };
  }

  const weights = getPositionAttributeWeights(position);
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const value = currentStats[key] ?? currentOvr;
    weightedSum += value * weight;
    totalWeight += weight;
  }

  const positionWeightedRating = totalWeight > 0
    ? Math.round(weightedSum / totalWeight)
    : currentOvr;

  return {
    positionWeightedRating,
    effectivePositionOvr: Math.round(0.65 * positionWeightedRating + 0.35 * currentOvr),
  };
}

/** League strength is independent from individual club prestige. */
export function leagueCompetitivenessScore(leaguePrestige: number | undefined, leagueTier: number): number {
  const prestige = Math.min(5, Math.max(1, Math.round(leaguePrestige ?? (leagueTier <= 1 ? 3 : 2))));
  const tierScore = leagueTier <= 1 ? 5 : 3;
  return 0.7 * prestige + 0.3 * tierScore;
}
