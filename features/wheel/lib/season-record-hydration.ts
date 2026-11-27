import type { SeasonRecord } from "@/types/game";
import { isDeprecatedAwardKey } from "@/types/awards";
import { getNationalContinentalCup } from "@/lib/football-nations";
import { getNationalTournamentName } from "./competition-display";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readSeasonCompetitionDetails(value: unknown): Pick<SeasonRecord, "leagueTable" | "domesticCupJourney" | "continentalCupJourney" | "nationalTeamJourney"> {
  const runtime = asRecord(value);
  const details: ReturnType<typeof readSeasonCompetitionDetails> = {};
  if (Array.isArray(runtime.leagueTable)) details.leagueTable = runtime.leagueTable as SeasonRecord["leagueTable"];
  for (const key of ["domesticCupJourney", "continentalCupJourney", "nationalTeamJourney"] as const) {
    const journey = runtime[key];
    if (Array.isArray(journey)) details[key] = journey.filter((item): item is string => typeof item === "string");
  }
  return details;
}

export function restoreArchivedCompetitionRecord(
  existing: SeasonRecord, nationality: string, debutAge: number, runtimeState?: unknown,
): SeasonRecord {
  const runtime = asRecord(runtimeState);
  const saved = existing.nationalTeam;
  const callup = asString(runtime.nationalCallupResult) ?? saved?.callup;
  const result = asString(runtime.nationalTournamentResult) ?? saved?.result ?? null;
  const nationalTeam = saved || callup || result ? {
    type: asString(runtime.nationalTournamentType)?.trim() || saved?.type?.trim()
      || getNationalTournamentName(nationality, existing.age, debutAge, getNationalContinentalCup),
    callup: callup === "called_up" ? "Được triệu tập"
      : callup === "missed" ? "Không được gọi"
        : callup || (result ? "Được triệu tập" : "Chờ gọi"),
    result,
  } : null;
  return { ...existing, ...readSeasonCompetitionDetails(runtime), nationalTeam };
}

/**
 * Rebuilds the in-progress UI record from the server's public runtime state.
 * Completed seasons still come from seasonHistory; this helper only fills the
 * current season so a refresh between two wheels does not erase prior results.
 */
export function hydrateCurrentSeasonRecord(params: {
  existing?: SeasonRecord;
  age: number;
  clubId?: string;
  clubName: string;
  leagueName: string;
  leagueId: string;
  continentalType: string;
  nationality: string;
  debutAge: number;
  runtimeState: unknown;
}): SeasonRecord {
  const existing = params.existing;
  const runtime = asRecord(params.runtimeState);
  const simulated = asRecord(runtime.yearSimResult);
  const existingNational = existing?.nationalTeam ?? null;
  const existingContinental = existing?.continentalCup ?? null;
  const nationalTeam = existingNational ?? (
    params.age % 2 === 0
      ? {
          type: getNationalTournamentName(
            params.nationality,
            params.age,
            params.debutAge,
            getNationalContinentalCup,
          ),
          callup: "Chờ gọi",
          result: null,
        }
      : null
  );
  const authoritativeContinentalType = asString(runtime.continentalCupType) ?? params.continentalType;
  const authoritativeContinentalResult = asString(runtime.continentalCupResult);
  const continentalCup = authoritativeContinentalType !== "none"
    ? {
        ...(existingContinental ?? {}),
        type: authoritativeContinentalType,
        result: authoritativeContinentalResult ?? "Chờ quay",
      }
    : null;

  const record: SeasonRecord = {
    ...(existing ?? {}),
    age: params.age,
    ...(params.clubId ? { clubId: params.clubId } : {}),
    clubName: params.clubName,
    leagueName: params.leagueName,
    leagueId: params.leagueId,
    standing: asNumber(runtime.standingResult) ?? existing?.standing ?? null,
    domesticCup: asString(runtime.domesticCupResult) ?? existing?.domesticCup ?? "Chờ quay",
    continentalCup,
    nationalTeam,
  };

  const apps = asNumber(simulated.apps);
  const goals = asNumber(simulated.goals);
  const assists = asNumber(simulated.assists);
  const cleanSheets = asNumber(simulated.cleanSheets);
  const matchRating = asNumber(simulated.matchRating);
  if (apps !== null) record.apps = apps;
  if (goals !== null) record.goals = goals;
  if (assists !== null) record.assists = assists;
  if (cleanSheets !== null) record.cleanSheets = cleanSheets;
  if (matchRating !== null) record.matchRating = matchRating;
  if (simulated.leagueStats) record.leagueStats = simulated.leagueStats as SeasonRecord["leagueStats"];
  if (simulated.domesticCupStats) record.domesticCupStats = simulated.domesticCupStats as SeasonRecord["domesticCupStats"];
  if (simulated.continentalStats) record.continentalStats = simulated.continentalStats as SeasonRecord["continentalStats"];
  if (simulated.nationalStats) record.nationalStats = simulated.nationalStats as SeasonRecord["nationalStats"];
  const awardSimulation = asRecord(simulated.awardSimulation);
  if (Array.isArray(awardSimulation.honours)) {
    record.honours = awardSimulation.honours.filter((honour) => {
      const item = asRecord(honour);
      return !isDeprecatedAwardKey(asString(item.awardKey) ?? "");
    }).map((honour) => {
      const item = asRecord(honour);
      return {
        awardKey: asString(item.awardKey) ?? "unknown",
        label: asString(item.label) ?? "Danh hiệu cá nhân",
        rank: asNumber(item.rank),
        slotKey: asString(item.slotKey),
        result: asString(item.result) ?? "winner",
        metrics: asRecord(item.metrics),
      };
    });
  }

  if (asNumber(runtime.ballonDorRank) !== null) {
    record.ballonDorResult = asNumber(runtime.ballonDorRank);
  }

  return restoreArchivedCompetitionRecord(record, params.nationality, params.debutAge, runtime);
}
