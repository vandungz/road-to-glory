import type { RandomSource } from "@/lib/wheel-engine/spin-resolver";
import type { WageDealOption } from "@/lib/salary-negotiation";

export interface ClubMarketInfo {
  id: string;
  name: string;
  leagueId: string;
  prestige: number;
  leagueName?: string | null;
  leagueTier: number;
  /** League quality is separate from the club's own prestige. */
  leaguePrestige?: number;
  leagueCountry?: string | null;
  confederation?: string | null;
  leagueSize?: number;
}

export type ContractOfferKind = "transfer" | "free_agent" | "renewal";

export type TransferDealResolution = "accepted" | "rejected" | "cancelled" | "error";

export type PendingTransferNegotiation = {
  offer: ContractOfferCard;
  failedWageOptions: WageDealOption[];
};

export interface ContractOfferCard {
  kind: ContractOfferKind;
  clubId: string;
  clubName: string;
  leagueId: string;
  leagueName: string;
  prestige: number;
  leagueTier: number;
  transferFee: number;
  wageAnnual: number;
  contractYears: number;
  expectedLeagueApps: number;
  reason: string;
  canAffordBuyout: boolean;
}

export interface ShortlistClubCard {
  clubId: string;
  clubName: string;
  leagueId: string;
  leagueName: string;
  prestige: number;
  leagueTier: number;
  expectedLeagueApps: number;
  canApproach: boolean;
  canAffordBuyout: boolean;
  previewFee: number;
  mandatoryBuyout?: number;
  previewWage: number;
  previewYears: number;
  blockReason: string | null;
  /** 0–1; only meaningful when canApproach. UI shows as %. */
  acceptChance: number | null;
}

export interface TransferMarketResult {
  hasWindow: boolean;
  marketValue: number;
  mandatoryBuyout: number;
  valuation: {
    positionWeightedRating: number;
    effectivePositionOvr: number;
  };
  isUnemployedMarket: boolean;
  contract: {
    yearsRemaining: number;
    yearsTotal: number;
    currentWageAnnual: number;
    marketValue: number;
    seasonsLeftInCareer: number;
  };
  renewal: ContractOfferCard | null;
  inbound: ContractOfferCard[];
  shortlist: ShortlistClubCard[];
  pendingNegotiation?: PendingTransferNegotiation | null;
}

export interface GenerateTransferMarketParams {
  currentClubId: string | null;
  currentClubPrestige: number;
  currentClubLeagueTier: number;
  currentClubLeagueSize?: number;
  currentOvr: number;
  currentStats?: Record<string, number>;
  potential?: number;
  playerNation?: string;
  currentAge: number;
  retireAge: number;
  matchRating: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  position: string;
  contractYearsRemaining: number;
  contractYearsTotal: number;
  currentWageAnnual: number;
  willingToMove?: boolean;
  isUnemployed?: boolean;
  clubs: ClubMarketInfo[];
  /** Player Influence Score (docs/core-currency-shop-design.md §5) — optional small top-up on scout/approach. */
  influenceScore?: number;
  /** Server may inject a cryptographically secure source; legacy callers keep resolveRandom. */
  randomSource?: RandomSource;
  /** Stable server-owned quote source; keeps one club's wage unchanged across search/replay. */
  wageRandomSource?: (clubId: string) => number;
}
