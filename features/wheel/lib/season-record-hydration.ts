import type { SeasonRecord } from "@/types/game";
import { getNationalContinentalCup } from "@/lib/wheel-engine/weight-calculator";
import { getNationalTournamentName } from "./simulation-helpers";

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

/**
 * Rebuilds the in-progress UI record from the server's public runtime state.
 * Completed seasons still come from seasonHistory; this helper only fills the
 * current season so a refresh between two wheels does not erase prior results.
 */
export function hydrateCurrentSeasonRecord(params: {
  existing?: SeasonRecord;
  age: number;
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
  const continentalCup = existingContinental ?? (
    params.continentalType !== "none"
      ? { type: params.continentalType, result: "Chờ quay" }
      : null
  );

  const record: SeasonRecord = {
    ...(existing ?? {}),
    age: params.age,
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

  if (record.continentalCup && asString(runtime.continentalCupResult)) {
    record.continentalCup = {
      ...record.continentalCup,
      result: asString(runtime.continentalCupResult) ?? record.continentalCup.result,
    };
  }
  if (record.nationalTeam) {
    const callup = asString(runtime.nationalCallupResult);
    const result = asString(runtime.nationalTournamentResult);
    record.nationalTeam = {
      ...record.nationalTeam,
      ...(callup ? { callup: callup === "called_up" ? "Được triệu tập" : "Không được gọi" } : {}),
      ...(result ? { result } : {}),
    };
  }
  if (asNumber(runtime.ballonDorRank) !== null) {
    record.ballonDorResult = asNumber(runtime.ballonDorRank);
  }

  return record;
}
