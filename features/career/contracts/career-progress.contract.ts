import { z } from "zod";

export const getCareerProgressSchema = z.object({
  playerId: z.string().uuid(),
}).strict();

export type GetCareerProgressInput = z.infer<typeof getCareerProgressSchema>;

export interface PublicCareerSeasonDto {
  seasonId: string;
  seasonNumber: number;
  age: number;
  status: string;
  clubId: string | null;
  clubName: string | null;
  leagueId: string | null;
  leagueName: string | null;
  startedAt: string;
  completedAt: string | null;
  checkpointCount: number;
  /** Public outcomes needed to resume the visible wheel flow. */
  checkpoints: Array<{
    stepKey: string;
    outcome: unknown;
    publicResult: unknown;
    revision: number;
    createdAt: string;
  }>;
  /** Sanitized runtime only; hidden stats and server-only inputs never cross this boundary. */
  runtimeState: unknown;
}

export interface CareerProgressDto {
  player: {
    id: string;
    name: string;
    nationality: string;
    position: string;
    debutAge: number;
    careerLengthYears: number;
    currentAge: number | null;
    currentStep: string | null;
    currentWheel: string | null;
    checkpointVersion: number;
    revision: number;
    isRetired: boolean;
    isUnemployed: boolean;
    currentContinentalCup: string;
    currentStats: Record<string, number>;
    currentClub: {
      id: string;
      name: string;
      leagueId: string;
      leagueName: string;
    } | null;
    walletBalance: number;
    shopInventory: unknown[];
  };
  currentSeason: PublicCareerSeasonDto | null;
  seasons: PublicCareerSeasonDto[];
  latestCheckpoint: {
    checkpointId: string;
    stepKey: string;
    revision: number;
    publicResult: unknown;
    outcome: unknown;
    createdAt: string;
  } | null;
}
