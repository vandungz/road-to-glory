import type { ClubStint, StatSnapshot } from "@/types/domain";
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

const CAREER_STAT_KEYS = ["apps", "goals", "assists"] as const;
const ARCHIVE_NUMERIC_KEYS = [
  "ovr",
  "apps",
  "goals",
  "assists",
  "cleanSheets",
  "matchRating",
  "marketValue",
  "positionWeightedRating",
  "effectivePositionOvr",
] as const;

export interface CareerArchiveSnapshot {
  age: number;
  ovr?: number;
  apps?: number;
  goals?: number;
  assists?: number;
  cleanSheets?: number;
  matchRating?: number;
  [stat: string]: number | undefined;
}

export interface CareerArchiveSeasonSource {
  age: number;
  summary?: unknown;
  runtimeState?: unknown;
}

/**
 * Aggregates one value per season. Season history is authoritative because a
 * timeline snapshot describes player attributes and may also contain only the
 * current season's optional stats for backward compatibility.
 */
export function aggregateCareerStats(params: {
  seasonHistory?: unknown;
  statsTimeline: readonly CareerArchiveSnapshot[];
}): { apps: number; goals: number; assists: number } {
  const history = asRecord(params.seasonHistory);
  const timelineByAge = new Map<number, CareerArchiveSnapshot>();
  for (const snapshot of params.statsTimeline) {
    const age = finiteNumber(snapshot.age);
    if (age !== null) timelineByAge.set(age, snapshot);
  }

  const ages = new Set<number>(timelineByAge.keys());
  for (const age of Object.keys(history)) {
    if (/^\d+$/.test(age)) ages.add(Number(age));
  }

  return [...ages].sort((left, right) => left - right).reduce(
    (totals, age) => {
      const season = asRecord(history[String(age)]);
      const snapshot = timelineByAge.get(age);
      for (const key of CAREER_STAT_KEYS) {
        const value = finiteNumber(season[key]) ?? finiteNumber(snapshot?.[key]);
        totals[key] += value ?? 0;
      }
      return totals;
    },
    { apps: 0, goals: 0, assists: 0 },
  );
}

/**
 * Materializes one archive row per played season. New rows prefer the
 * end-of-season OVR stored in seasonHistory; older rows fall back to the
 * matching timeline snapshot while still restoring their season statistics.
 */
export function buildCareerArchiveTimeline(params: {
  seasonHistory?: unknown;
  statsTimeline: readonly StatSnapshot[];
  debutAge: number;
  retireAge: number;
  legacyOvrByAge?: Record<number, number>;
}): CareerArchiveSnapshot[] {
  const history = asRecord(params.seasonHistory);
  const timelineByAge = new Map<number, StatSnapshot>();
  for (const snapshot of params.statsTimeline) {
    const age = finiteNumber(snapshot.age);
    if (age !== null) timelineByAge.set(age, snapshot);
  }

  const ages = new Set<number>();
  for (const age of Object.keys(history)) {
    if (/^\d+$/.test(age)) ages.add(Number(age));
  }
  for (const age of timelineByAge.keys()) ages.add(age);

  return [...ages]
    .filter((age) => age >= params.debutAge && age <= params.retireAge)
    .sort((left, right) => left - right)
    .map((age) => {
      const historySnapshot = asRecord(history[String(age)]);
      const timelineSnapshot = timelineByAge.get(age);
      const snapshot: CareerArchiveSnapshot = { age };

      for (const [key, value] of Object.entries(timelineSnapshot ?? {})) {
        if (typeof value === "number" && Number.isFinite(value)) snapshot[key] = value;
      }
      for (const key of ARCHIVE_NUMERIC_KEYS) {
        const value = finiteNumber(historySnapshot[key]);
        if (value !== null) snapshot[key] = value;
      }
      const legacyOvr = finiteNumber(params.legacyOvrByAge?.[age]);
      if (legacyOvr !== null && finiteNumber(historySnapshot.ovr) === null) snapshot.ovr = legacyOvr;
      return snapshot;
    });
}

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
export function normalizeClubStints(
  stints: readonly ClubStint[],
  seasonHistory?: unknown,
): ClubStint[] {
  const historyEntries = Object.values(asRecord(seasonHistory))
    .map(asRecord)
    .map((record) => ({ age: finiteNumber(record.age), clubName: record.clubName }))
    .filter((entry): entry is { age: number; clubName: unknown } => entry.age !== null);

  return stints.map((stint, index) => {
    const nextStartAge = finiteNumber(stints[index + 1]?.startAge);
    const historyEndAge = historyEntries
      .filter((entry) => entry.clubName === stint.clubName && entry.age >= stint.startAge)
      .reduce<number | null>((latest, entry) => Math.max(latest ?? entry.age, entry.age), null);
    const candidateEndAge = Math.max(
      stint.startAge,
      stint.endAge,
      historyEndAge ?? stint.startAge,
    );
    const endAge = nextStartAge === null
      ? candidateEndAge
      : Math.min(candidateEndAge, nextStartAge - 1);

    return {
      ...stint,
      endAge: Math.max(stint.startAge, endAge),
      yearsAtClub: Math.max(stint.startAge, endAge) - stint.startAge + 1,
    };
  });
}

export function calculatePeakOvr(
  statsTimeline: readonly StatSnapshot[],
  persistedPeakOvr?: number,
): number {
  const timelinePeak = statsTimeline.reduce(
    (peak, snapshot) => Math.max(peak, finiteNumber(snapshot.ovr) ?? 0),
    0,
  );
  return Math.max(1, timelinePeak, persistedPeakOvr ?? 0);
}
