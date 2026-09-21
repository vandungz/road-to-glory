import { z } from "zod";
import type { ClubStint, SeasonHistory, StatSnapshot, AchievementRecord } from "@/types/domain";

export interface PlayerUpdateInput {
  id: string;
  statsTimeline: StatSnapshot[];
  clubStints: ClubStint[];
  events: Array<Record<string, string | number>>;
  slotIndex: number;
  currentContinentalCup?: string;
  contractYearsTotal?: number;
  contractYearsRemaining?: number;
  currentWageAnnual?: number;
  marketValue?: number;
  isUnemployed?: boolean;
}

export interface SaveProgressParams {
  gameId: string;
  playersUpdate: PlayerUpdateInput[];
}

export interface SeasonProgressUpdate {
  playerId: string;
  statsTimeline: StatSnapshot[];
  clubStints: ClubStint[];
  achievements: AchievementRecord;
  currentContinentalCup: string;
  seasonHistory: SeasonHistory;
  contractYearsTotal?: number;
  contractYearsRemaining?: number;
  currentWageAnnual?: number;
  marketValue?: number;
  isUnemployed?: boolean;
  // Wallet & Influence (docs/core-currency-shop-design.md §4/§3)
  currentAge: number;
  peakOvr: number;
  debutAge: number;
  careerLength: number;
  clubPrestige: number;
  matchRatingThisSeason: number;
  /** € thousands, GROSS fee — only set in the season a real transfer completed. */
  transferFeeThisSeason?: number;
}

export const seasonProgressUpdateSchema = z.object({
  playerId: z.string().uuid(),
  statsTimeline: z.array(
    z.object({
      age: z.number().int().min(10).max(70),
      ovr: z.number().int().min(1).max(99),
    }).catchall(z.number()),
  ),
  clubStints: z.array(z.object({
    clubId: z.string(),
    clubName: z.string(),
    leagueId: z.string(),
    leagueName: z.string(),
    startAge: z.number().int(),
    endAge: z.number().int(),
    yearsAtClub: z.number().int(),
    ovrAtJoining: z.number().int(),
    ovrAtLeaving: z.number().int(),
    wageAtJoining: z.number().int().optional(),
    feePaid: z.number().int().optional(),
  })),
  achievements: z.unknown(),
  currentContinentalCup: z.string(),
  seasonHistory: z.record(z.string(), z.any()),
  contractYearsTotal: z.number().int().min(0).max(10).optional(),
  contractYearsRemaining: z.number().int().min(0).max(10).optional(),
  currentWageAnnual: z.number().int().min(0).optional(),
  marketValue: z.number().int().min(0).optional(),
  isUnemployed: z.boolean().optional(),
  currentAge: z.number().int().min(15).max(70),
  peakOvr: z.number().int().min(1).max(99),
  debutAge: z.number().int().min(10).max(35),
  careerLength: z.number().int().min(1).max(30),
  clubPrestige: z.number().int().min(1).max(5),
  matchRatingThisSeason: z.number().min(0).max(10),
  transferFeeThisSeason: z.number().int().min(0).optional(),
});

export const simulatePlayerSeasonSchema = z.object({
  playerId: z.string().optional().nullable(),
  age: z.number().int().min(15).max(50),
  ovr: z.number().int().min(10).max(99),
  position: z.string(),
  luckRating: z.number().int().min(1).max(20),
  clubPrestige: z.number().int().min(1).max(5),
  clubName: z.string(),
  leagueName: z.string(),
  leagueId: z.string(),
  hasContinentalCup: z.boolean(),
  playerNationality: z.string(),
  currentStats: z.record(z.string(), z.number()).optional(),
  // Outcomes từ wheels — optional, truyền sau khi tất cả wheels xong
  standingResult: z.number().int().min(1).max(30).nullable().optional(),
  domesticCupResult: z.string().nullable().optional(),
  continentalCupResult: z.string().nullable().optional(),
  continentalCupType: z.string().nullable().optional(),
  nationalCallupResult: z.string().nullable().optional(),
  nationalTournamentResult: z.string().nullable().optional(),
  nationalTournamentType: z.string().nullable().optional(),
  trainingCampActive: z.boolean().optional().default(false),
});

export const generateLeagueTableSchema = z.object({
  leagueId: z.string(),
  playerClubId: z.string(),
  playerClubName: z.string(),
  playerStanding: z.number().int().min(1),
});

export const startPlayerCareerSchema = z.object({
  gameId: z.string().uuid(),
  slotIndex: z.number().int().min(0).max(10),
  nationality: z.string(),
  debutAge: z.number().int(),
  /** Optional / ignored — server recomputes from stats. */
  debutOvr: z.number().int().optional(),
  careerLength: z.number().int(),
  height: z.number().int().min(100).max(230),
  weight: z.number().int().min(30).max(200),
  clubId: z.string(),
  clubName: z.string(),
  leagueId: z.string(),
  leagueName: z.string(),
  position: z.string(),
  // Field player stats (null for GK, undefined never sent)
  pac: z.number().int().nullish(),
  sho: z.number().int().nullish(),
  pas: z.number().int().nullish(),
  dri: z.number().int().nullish(),
  def: z.number().int().nullish(),
  phy: z.number().int().nullish(),
  // GK stats (null for field players, undefined never sent)
  div: z.number().int().nullish(),
  han: z.number().int().nullish(),
  kic: z.number().int().nullish(),
  ref: z.number().int().nullish(),
  spd: z.number().int().nullish(),
  pos: z.number().int().nullish(),
}).strict();

export const generateTransferMarketSchema = z.object({
  currentClubId: z.string().nullable(),
  currentClubPrestige: z.number().int(),
  currentClubLeagueTier: z.number().int().min(1).max(2).default(1),
  currentOvr: z.number().int(),
  currentStats: z.record(z.string(), z.number()).optional(),
  potential: z.number().int().optional(),
  playerNation: z.string().optional(),
  currentAge: z.number().int().min(14).max(50),
  retireAge: z.number().int().min(15).max(60),
  matchRating: z.number().min(0),
  goals: z.number().int(),
  assists: z.number().int(),
  cleanSheets: z.number().int(),
  position: z.string(),
  contractYearsRemaining: z.number().int().min(0).max(10),
  contractYearsTotal: z.number().int().min(0).max(10),
  currentWageAnnual: z.number().int().min(0),
  willingToMove: z.boolean().optional().default(false),
  isUnemployed: z.boolean().optional().default(false),
  influenceScore: z.number().min(0).max(100).optional(),
});

export const resolveProactiveRenewalSchema = z.object({
  currentClubId: z.string(),
  currentClubName: z.string(),
  currentClubLeagueId: z.string(),
  currentClubLeagueName: z.string(),
  currentClubPrestige: z.number().int().min(1).max(5),
  currentClubLeagueTier: z.number().int().min(1).max(2).default(1),
  currentOvr: z.number().int(),
  currentStats: z.record(z.string(), z.number()).optional(),
  position: z.string(),
  currentAge: z.number().int(),
  retireAge: z.number().int(),
  matchRating: z.number(),
  goals: z.number().int(),
  assists: z.number().int(),
  cleanSheets: z.number().int(),
  contractYearsRemaining: z.number().int(),
  currentWageAnnual: z.number().int(),
  wageOption: z.enum(["lower", "standard", "higher"]).optional(),
});

export const searchClubsForApproachSchema = z.object({
  currentClubId: z.string().nullable().optional(),
  query: z.string().optional(),
  leagueId: z.string().optional(),
  prestigeMin: z.number().int().optional(),
  prestigeMax: z.number().int().optional(),
  page: z.number().int().default(1),
  pageSize: z.number().int().default(8),
  currentOvr: z.number().int(),
  currentStats: z.record(z.string(), z.number()).optional(),
  currentAge: z.number().int(),
  retireAge: z.number().int(),
  matchRating: z.number(),
  position: z.string(),
  contractYearsRemaining: z.number().int(),
  isUnemployed: z.boolean().optional(),
  influenceScore: z.number().min(0).max(100).optional(),
});

export const resolveShortlistApproachSchema = z.object({
  clubId: z.string(),
  clubName: z.string(),
  leagueId: z.string(),
  leagueName: z.string(),
  prestige: z.number().int().min(1).max(5),
  leagueTier: z.number().int().min(1).max(2),
  leagueSize: z.number().int().min(2).max(40).optional(),
  previewFee: z.number().int().min(0),
  previewWage: z.number().int().min(0),
  previewYears: z.number().int().min(0).max(10),
  mandatoryBuyout: z.number().int().min(0).optional().default(0),
  feeOption: z.enum(["discount", "standard", "premium"]).optional().default("standard"),
  clientAcceptChance: z.number().min(0).max(1),
  currentOvr: z.number().int().min(10).max(99),
  effPositionOvr: z.number().optional(),
  currentAge: z.number().int().min(14).max(50),
  matchRating: z.number().min(0).max(10),
  contractYearsRemaining: z.number().int().min(0).max(10),
  isUnemployed: z.boolean().optional().default(false),
  influenceScore: z.number().min(0).max(100).optional(),
});

export const completeTransferSchema = z.object({
  gameId: z.string().uuid(),
  playerId: z.string().uuid(),
  slotIndex: z.number().int().min(0).max(10),
  kind: z.enum(["transfer", "free_agent", "renewal"]),
  clubId: z.string(),
  wageAnnual: z.number().int().min(0),
  contractYears: z.number().int().min(0).max(10),
  transferFee: z.number().int().min(0),
  wageOption: z.enum(["lower", "standard", "higher"]).default("standard"),
});

export const generateCupJourneySchema = z.object({
  type: z.enum(["domestic", "continental", "national"]),
  result: z.string(),
  playerClubId: z.string(),
  playerClubPrestige: z.number().int(),
  cupName: z.string().optional(),
  cupType: z.string().optional(), // e.g. "UCL", "Libertadores" — the game-state cup, not DB club field
  playerNationality: z.string().optional(),
});

export const evolvePlayerStatsSchema = z.object({
  currentStats: z.record(z.string(), z.number().int().min(10).max(99)),
  position: z.string(),
  evolutions: z.array(z.object({
    stat: z.string(),
    delta: z.number().int(),
  })),
});


