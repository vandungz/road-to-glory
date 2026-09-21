import { createHash } from "node:crypto";
import type { Prisma } from "@/app/generated/prisma/client";
import { secureRandom } from "@/lib/secure-random";
import {
  loadTransferWorkflowState,
  type TransferWorkflowState,
} from "@/features/career/services/transfer-workflow-state.service";
import {
  type ClubMarketInfo,
  type ContractOfferCard,
  type GenerateTransferMarketParams,
} from "@/features/transfer/services/transfer.service";
import type {
  GetTransferMarketInput,
  ResolveTransferNegotiationInput,
  SearchTransferClubsInput,
  SetTransferOfferSelectionInput,
} from "@/features/career/contracts/transfer-market.contract";
export type TransferAuthorityErrorCode =
  | "FORBIDDEN"
  | "CAREER_PROJECTION_UNAVAILABLE"
  | "SEASON_NOT_FOUND"
  | "INVALID_TRANSITION"
  | "STALE_REVISION"
  | "COMMAND_EXISTS"
  | "CLUB_NOT_FOUND"
  | "OFFER_NOT_FOUND";

export class TransferAuthorityError extends Error {
  constructor(public readonly code: TransferAuthorityErrorCode, message: string) {
    super(message);
    this.name = "TransferAuthorityError";
  }
}

const playerSelect = {
  id: true,
  revision: true,
  checkpointVersion: true,
  currentAge: true,
  currentStep: true,
  currentWheel: true,
  retireAge: true,
  position: true,
  nationality: true,
  peakOvr: true,
  statsTimeline: true,
  clubStints: true,
  currentWageAnnual: true,
  contractYearsTotal: true,
  contractYearsRemaining: true,
  marketValue: true,
  isUnemployed: true,
  influenceScore: true,
  gameSession: { select: { userId: true } },
} satisfies Prisma.CareerPlayerSelect;

const seasonSelect = {
  id: true,
  careerPlayerId: true,
  age: true,
  status: true,
  runtimeState: true,
} satisfies Prisma.CareerSeasonSelect;

type AuthorityPlayer = Prisma.CareerPlayerGetPayload<{ select: typeof playerSelect }>;
type AuthoritySeason = Prisma.CareerSeasonGetPayload<{ select: typeof seasonSelect }>;
type Tx = Prisma.TransactionClient;

export type AuthorityContext = {
  player: AuthorityPlayer;
  season: AuthoritySeason;
  transferWorkflow: TransferWorkflowState;
  currentClubId: string | null;
  currentClub: ClubMarketInfo | null;
  params: GenerateTransferMarketParams;
};

export type StoredNegotiationResult = {
  accepted: boolean;
  acceptChance: number;
  offer?: ContractOfferCard;
  rejectReason?: string;
};

export type TransferNegotiationResult =
  | { accepted: true; acceptChance: number; offer: ContractOfferCard; replayed: boolean }
  | { accepted: false; acceptChance: number; rejectReason: string; replayed: boolean };

export type NegotiationResult = Omit<
  Extract<TransferNegotiationResult, { accepted: true }>,
  "replayed"
> | Omit<Extract<TransferNegotiationResult, { accepted: false }>, "replayed">;

export type TransferNegotiationDto = TransferNegotiationResult;

function stableWageRandomSource(playerId: string, seasonId: string): (clubId: string) => number {
  return (clubId: string) => {
    const digest = createHash("sha256")
      .update(`transfer-wage:${playerId}:${seasonId}:${clubId}`)
      .digest();
    return digest.readUInt32BE(0) / 0x1_0000_0000;
  };
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStats(player: AuthorityPlayer): Record<string, number> {
  const snapshot = asRecord(asArray(player.statsTimeline).at(-1));
  const keys = player.position === "GK"
    ? ["div", "han", "kic", "ref", "spd", "pos"]
    : ["pac", "sho", "pas", "dri", "def", "phy"];
  return Object.fromEntries(keys.map((key) => [key, asNumber(snapshot[key], 60)]));
}

function clubInfo(row: {
  id: string;
  name: string;
  leagueId: string;
  prestige: number;
  league: {
    name: string;
    tier: number;
    prestige: number;
    country: string;
    confederation: string;
  };
}, leagueSize: number): ClubMarketInfo {
  return {
    id: row.id,
    name: row.name,
    leagueId: row.leagueId,
    prestige: row.prestige,
    leagueName: row.league.name,
    leagueTier: row.league.tier,
    leaguePrestige: row.league.prestige,
    leagueCountry: row.league.country,
    confederation: row.league.confederation,
    leagueSize,
  };
}

export async function loadAuthorityContext(
  tx: Tx,
  input: GetTransferMarketInput | SearchTransferClubsInput | SetTransferOfferSelectionInput | ResolveTransferNegotiationInput,
  userId: string,
  options: { includeClubPool?: boolean } = {},
): Promise<AuthorityContext> {
  const player = await tx.careerPlayer.findUnique({
    where: { id: input.playerId },
    select: playerSelect,
  });
  if (!player || player.gameSession.userId !== userId) {
    throw new TransferAuthorityError("FORBIDDEN", "Career không thuộc user hiện tại");
  }
  if (
    player.checkpointVersion < 2 ||
    player.currentAge === null ||
    player.currentStep === null
  ) {
    throw new TransferAuthorityError(
      "CAREER_PROJECTION_UNAVAILABLE",
      "Career chưa được khởi tạo projection checkpoint V2",
    );
  }
  if (player.currentStep !== "transfer") {
    throw new TransferAuthorityError("INVALID_TRANSITION", "Career chưa ở bước chuyển nhượng");
  }
  if (player.currentAge >= player.retireAge) {
    throw new TransferAuthorityError("INVALID_TRANSITION", "Mùa giải cuối không có cửa sổ chuyển nhượng");
  }
  if (player.revision !== input.expectedRevision) {
    throw new TransferAuthorityError("STALE_REVISION", "Career đã có thay đổi mới hơn");
  }

  const season = await tx.careerSeason.findUnique({
    where: { id: input.seasonId },
    select: seasonSelect,
  });
  if (
    !season ||
    season.careerPlayerId !== player.id ||
    season.age !== player.currentAge
  ) {
    throw new TransferAuthorityError("SEASON_NOT_FOUND", "Mùa giải hiện tại không tồn tại");
  }
  if (season.status !== "in_progress") {
    throw new TransferAuthorityError("INVALID_TRANSITION", "Mùa giải này đã được chốt");
  }

  const transferWorkflow = await loadTransferWorkflowState(tx, player.id, season.id);

  const rows = options.includeClubPool === false
    ? []
    : await tx.club.findMany({
        select: {
          id: true,
          name: true,
          leagueId: true,
          prestige: true,
          league: {
            select: {
              name: true,
              tier: true,
              prestige: true,
              country: true,
              confederation: true,
            },
          },
        },
      });
  const leagueIds = [...new Set(rows.map((row) => row.leagueId))];
  const leagueSizes = leagueIds.length
    ? await tx.club.groupBy({
        by: ["leagueId"],
        where: { leagueId: { in: leagueIds } },
        _count: { _all: true },
      })
    : [];
  const leagueSizeById = new Map(
    leagueSizes.map((row) => [row.leagueId, row._count._all] as const),
  );
  const clubs = rows.map((row) => clubInfo(row, leagueSizeById.get(row.leagueId) ?? 20));

  const stints = asArray(player.clubStints)
    .filter((value): value is Record<string, unknown> =>
      value !== null && typeof value === "object" && !Array.isArray(value),
    );
  const currentClubId = typeof stints.at(-1)?.clubId === "string"
    ? stints.at(-1)?.clubId as string
    : null;
  const currentClub = currentClubId
    ? clubs.find((club) => club.id === currentClubId) ?? null
    : null;
  if (options.includeClubPool !== false && currentClubId && !currentClub) {
    throw new TransferAuthorityError("CLUB_NOT_FOUND", "CLB hiện tại không tồn tại");
  }

  const snapshot = asRecord(asArray(player.statsTimeline).at(-1));
  const runtime = asRecord(season.runtimeState);
  const simulated = asRecord(runtime.yearSimResult);
  const currentOvr = asNumber(snapshot.ovr, player.peakOvr);
  const currentStats = asStats(player);
  const isUnemployed = player.isUnemployed || !currentClubId;
  const willingToMove = "willingToMove" in input ? input.willingToMove : true;
  const currentClubPrestige = currentClub?.prestige ?? 2;
  const currentClubLeagueTier = currentClub?.leagueTier ?? 1;
  const params: GenerateTransferMarketParams = {
    currentClubId,
    currentClubPrestige,
    currentClubLeagueTier,
    currentClubLeagueSize: currentClub ? currentClub.leagueSize : 20,
    currentOvr,
    currentStats,
    playerNation: player.nationality,
    currentAge: player.currentAge,
    retireAge: player.retireAge,
    matchRating: asNumber(simulated.matchRating, 6),
    goals: Math.max(0, Math.round(asNumber(simulated.goals, 0))),
    assists: Math.max(0, Math.round(asNumber(simulated.assists, 0))),
    cleanSheets: Math.max(0, Math.round(asNumber(simulated.cleanSheets, 0))),
    position: player.position,
    contractYearsRemaining: player.contractYearsRemaining,
    contractYearsTotal: player.contractYearsTotal,
    currentWageAnnual: player.currentWageAnnual,
    willingToMove,
    isUnemployed,
    influenceScore: player.influenceScore,
    clubs,
    randomSource: secureRandom,
    wageRandomSource: stableWageRandomSource(player.id, input.seasonId),
  };

  return { player, season, transferWorkflow, currentClubId, currentClub, params };
}
