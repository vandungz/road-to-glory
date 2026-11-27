import type { ClubStint, StatSnapshot } from "@/types/domain";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
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
