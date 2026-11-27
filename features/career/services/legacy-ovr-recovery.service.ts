import type { StatSnapshot } from "@/types/domain";
import { calculateOvrByPosition } from "@/lib/wheel-engine/weight-calculator";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

import type { CareerArchiveSeasonSource } from "./career-summary.service";
const FIELD_STAT_KEYS = ["pac", "sho", "pas", "dri", "def", "phy"] as const;
const GOALKEEPER_STAT_KEYS = ["div", "han", "kic", "ref", "spd", "pos"] as const;

function numericStats(value: unknown, position: string): Record<string, number> {
  const source = asRecord(value);
  const keys = position === "GK" ? GOALKEEPER_STAT_KEYS : FIELD_STAT_KEYS;
  const stats: Record<string, number> = {};
  for (const key of keys) {
    const number = finiteNumber(source[key]);
    if (number !== null) stats[key] = number;
  }
  return stats;
}

function latestSeasonTimeline(source: CareerArchiveSeasonSource): Record<string, unknown> {
  const summary = asRecord(source.summary);
  return asRecord(summary.latestTimeline);
}

function seasonDeltas(source: CareerArchiveSeasonSource): Array<{ stat: string; delta: number }> {
  const runtime = asRecord(source.runtimeState);
  return asArray(runtime.evolvedStatsThisYear)
    .map(asRecord)
    .map((entry) => ({ stat: entry.stat, delta: finiteNumber(entry.delta) }))
    .filter((entry): entry is { stat: string; delta: number } => typeof entry.stat === "string" && entry.delta !== null);
}

/**
 * Recovers per-age OVR for pre-projection careers. Older V2 rows kept the
 * season history and development deltas but lost the timeline append; the
 * recovery is server-side and sends only the derived public OVR values.
 */
export function recoverLegacyOvrByAge(params: {
  position: string;
  debutAge: number;
  retireAge: number;
  seasonHistory?: unknown;
  statsTimeline: readonly StatSnapshot[];
  seasons: readonly CareerArchiveSeasonSource[];
}): Record<number, number> {
  const history = asRecord(params.seasonHistory);
  const historyAges = Object.keys(history)
    .filter((age) => /^\d+$/.test(age))
    .map(Number)
    .filter((age) => age >= params.debutAge && age <= params.retireAge)
    .sort((left, right) => left - right);
  const timelineAges = params.statsTimeline
    .map((snapshot) => finiteNumber(snapshot.age))
    .filter((age): age is number => age !== null && age >= params.debutAge && age <= params.retireAge);
  if (historyAges.length <= new Set(timelineAges).size || params.seasons.length === 0) return {};

  const sources = [...params.seasons].sort((left, right) => left.age - right.age);
  const sourceByAge = new Map(sources.map((source) => [source.age, source]));
  const recovered: Record<number, number> = {};
  for (const snapshot of params.statsTimeline) {
    if (snapshot.age >= params.debutAge && snapshot.age <= params.retireAge && typeof snapshot.ovr === "number") {
      recovered[snapshot.age] = snapshot.ovr;
    }
  }

  const firstSource = sources.find((source) => Object.keys(latestSeasonTimeline(source)).length > 0);
  if (!firstSource) return recovered;
  let stats = numericStats(latestSeasonTimeline(firstSource), params.position);
  if (Object.keys(stats).length === 0) return recovered;

  for (const age of historyAges) {
    const season = asRecord(history[String(age)]);
    const sourceTimeline = latestSeasonTimeline(sourceByAge.get(age) ?? { age });
    const directOvr = finiteNumber(season.ovr) ?? finiteNumber(sourceTimeline.ovr);
    const sourceStats = numericStats(sourceTimeline, params.position);
    if (Object.keys(sourceStats).length > 0) stats = sourceStats;
    else if (age !== firstSource.age) {
      for (const change of seasonDeltas(sourceByAge.get(age) ?? { age })) stats[change.stat] = (stats[change.stat] ?? 60) + change.delta;
    }

    recovered[age] = directOvr ?? calculateOvrByPosition(params.position, stats);
  }
  return recovered;
}

/**
 * Repairs only the derived display boundaries of a stint. It preserves the
 * transfer metadata while using completed season history to extend a final
 * stint that was left at its one-season seed by an older server projection.
 */
