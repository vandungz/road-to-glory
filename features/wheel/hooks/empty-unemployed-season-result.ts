import { AWARD_MODEL_VERSION, AWARD_RESOLUTION_VERSION } from "@/types/awards";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";

export function emptyUnemployedSeasonResult(): SimulatedSeasonResult {
  const zeroComp = { apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 6.0 };
  return {
    apps: 0,
    goals: 0,
    assists: 0,
    matchRating: 6.0,
    cleanSheets: 0,
    events: [{ type: "unemployed", label: "Mùa thất nghiệp — không CLB" }],
    leagueStats: zeroComp,
    domesticCupStats: zeroComp,
    ballonDor: { eligible: false, nominationWeight: 0, rankWeights: [] },
    awardSimulation: {
      modelVersion: AWARD_MODEL_VERSION,
      resolutionVersion: AWARD_RESOLUTION_VERSION,
      candidateUniverseSize: 0,
      snapshots: [],
      honours: [],
      ballonDor: { eligible: false, nominationWeight: 0, rankWeights: [], snapshotKey: "" },
    },
  };
}
