import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import type { CurrentClub } from "@/types/domain";
export interface CareerWheelPreviewInput {
    careerSubStep: string;
    isMounted: boolean;
    mode: string;
    currentContinentalCup: string;
    currentAge: number;
    playerDebutAge: number;
    playerCareerLength: number;
    playerNationality: string;
    currentClub: CurrentClub | null;
    currentOvr: number;
    leagueSize: number;
    priorClubStanding: number | null;
    standingResult?: number | null;
    selectedStatsList: string[];
    position: string;
    yearSimResult: SimulatedSeasonResult | null;
    selectorIndex: number;
    yearEvolutionDirection?: "increase" | "decrease" | "maintain" | null;
    currentStats: Record<string, number>;
    ballonDorNominationWeight: number;
    ballonDorRankWeights: number[];
    luckRating?: number;
    /** docs/core-currency-shop-design.md §6.2 — must equal the resolve's value (career-wheel-resolver.ts). */
    fitnessCoachActive?: boolean;
    nationalCallupBoostActive?: boolean;
    eliteDevelopmentActive?: boolean;
}
