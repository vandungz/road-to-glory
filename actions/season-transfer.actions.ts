"use server";

import type { Prisma } from "@/app/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser, requireGameOwnership } from "@/lib/auth/guards";
import { generateTransferMarketService, resolveApproachService, resolveProactiveRenewalService, type TransferMarketResult, type ResolveApproachResult, type ResolveProactiveRenewalResult, type ShortlistClubCard } from "@/features/transfer/services/transfer.service";
import { clubCanAffordBuyout, computeClubTransferFee, computeApproachAcceptChance, computeEffectivePositionOvr, computeMandatoryBuyout, computeMarketValue, expectedAppsAtClub, proposeContractYears, proposeWageAnnual, randomizeWageAnnual } from "@/lib/transfer-economy";
import { secureRandom } from "@/lib/secure-random";
import { computeWageAgreementChance } from "@/lib/salary-negotiation";
import { estimateAppsRatio } from "@/lib/club-fit";
import { generateTransferMarketSchema, resolveProactiveRenewalSchema, searchClubsForApproachSchema, resolveShortlistApproachSchema, completeTransferSchema } from "./season-action-contracts";
import type { ClubStint, StatSnapshot } from "@/types/domain";

async function verifyGameOwnership(gameId: string) { return requireGameOwnership(gameId); }
async function requireAuth() { return requireAuthenticatedUser(); }

export async function generateTransferMarketAction(input: unknown): Promise<TransferMarketResult> {
  await requireAuth();
  const validated = generateTransferMarketSchema.parse(input);
  const isUnemployed = validated.isUnemployed || !validated.currentClubId;

  const dbClubs = await prisma.club.findMany({
    select: {
      id: true,
      name: true,
      leagueId: true,
      prestige: true,
      league: { select: { name: true, tier: true, prestige: true, country: true, confederation: true } },
    },
  });

  const leagueIds = [...new Set(dbClubs.map((c) => c.leagueId))];
  const leagueSizes = leagueIds.length
    ? await prisma.club.groupBy({
        by: ["leagueId"],
        where: { leagueId: { in: leagueIds } },
        _count: { _all: true },
      })
    : [];
  const leagueSizeById = new Map(
    leagueSizes.map((row) => [row.leagueId, row._count._all] as const),
  );

  const currentClubRow = validated.currentClubId
    ? dbClubs.find((c) => c.id === validated.currentClubId)
    : undefined;
  const currentClubLeagueSize =
    (currentClubRow && leagueSizeById.get(currentClubRow.leagueId)) || 20;

  return generateTransferMarketService({
    currentClubId: validated.currentClubId,
    currentClubPrestige: validated.currentClubPrestige,
    currentClubLeagueTier: validated.currentClubLeagueTier,
    currentClubLeagueSize,
    currentOvr: validated.currentOvr,
    currentStats: validated.currentStats,
    potential: validated.potential,
    playerNation: validated.playerNation,
    currentAge: validated.currentAge,
    retireAge: validated.retireAge,
    matchRating: validated.matchRating,
    goals: validated.goals,
    assists: validated.assists,
    cleanSheets: validated.cleanSheets,
    position: validated.position,
    contractYearsRemaining: validated.contractYearsRemaining,
    contractYearsTotal: validated.contractYearsTotal,
    currentWageAnnual: validated.currentWageAnnual,
    willingToMove: validated.willingToMove,
    isUnemployed,
    influenceScore: validated.influenceScore,
    randomSource: secureRandom,
    clubs: dbClubs.map((c) => ({
      id: c.id,
      name: c.name,
      leagueId: c.leagueId,
      prestige: c.prestige,
      leagueName: c.league?.name,
      leagueTier: c.league?.tier ?? 1,
      leaguePrestige: c.league?.prestige,
      leagueCountry: c.league?.country,
      confederation: c.league?.confederation,
      leagueSize: leagueSizeById.get(c.leagueId) ?? 20,
    })),
  });
}

export async function resolveProactiveRenewalAction(input: unknown): Promise<ResolveProactiveRenewalResult> {
  await requireAuth();
  const validated = resolveProactiveRenewalSchema.parse(input);
  return resolveProactiveRenewalService({ ...validated, randomSource: secureRandom });
}

export async function searchClubsForApproachAction(input: unknown): Promise<{
  clubs: ShortlistClubCard[];
  totalCount: number;
  leagues: Array<{ id: string; name: string; tier: number }>;
}> {
  await requireAuth();
  const validated = searchClubsForApproachSchema.parse(input);

  const where: Prisma.ClubWhereInput = {};
  if (validated.query && validated.query.trim().length > 0) {
    where.name = { contains: validated.query.trim(), mode: "insensitive" };
  }
  if (validated.leagueId && validated.leagueId !== "all") {
    where.leagueId = validated.leagueId;
  }
  if (validated.prestigeMin || validated.prestigeMax) {
    where.prestige = {
      gte: validated.prestigeMin ?? 1,
      lte: validated.prestigeMax ?? 5,
    };
  }
  if (validated.currentClubId) {
    where.id = { not: validated.currentClubId };
  }

  const [dbClubs, totalCount, allLeagues] = await Promise.all([
    prisma.club.findMany({
      where,
      skip: (validated.page - 1) * validated.pageSize,
      take: validated.pageSize,
      select: {
        id: true,
        name: true,
        leagueId: true,
        prestige: true,
      league: { select: { name: true, tier: true, prestige: true, country: true, confederation: true } },
      },
      orderBy: [{ prestige: "desc" }, { name: "asc" }],
    }),
    prisma.club.count({ where }),
    prisma.league.findMany({
      select: { id: true, name: true, tier: true },
      orderBy: [{ tier: "asc" }, { prestige: "desc" }],
    }),
  ]);

  const marketVal = computeMarketValue({
    ovr: validated.currentOvr,
    age: validated.currentAge,
    matchRating: validated.matchRating,
    contractYearsRemaining: validated.contractYearsRemaining,
    position: validated.position,
    currentStats: validated.currentStats,
  });
  const mandatoryBuyout = computeMandatoryBuyout(marketVal, validated.contractYearsRemaining);
  const canApproachGate = validated.contractYearsRemaining <= 1 || validated.isUnemployed;
  const effPositionOvr = computeEffectivePositionOvr(
    validated.position,
    validated.currentStats,
    validated.currentOvr,
  );

  const clubs: ShortlistClubCard[] = dbClubs.map((club) => {
    const apps = expectedAppsAtClub(effPositionOvr, club.prestige, 20);
    const fit = estimateAppsRatio(effPositionOvr, club.prestige);
    const transferFee = computeClubTransferFee({
      marketValue: marketVal,
      mandatoryBuyout,
      prestige: club.prestige,
      leagueTier: club.league?.tier ?? 1,
      leaguePrestige: club.league?.prestige,
      expectedAppsRatio: fit,
      clubIdentity: club.id,
    });
    const canAfford = clubCanAffordBuyout(club.prestige, club.league?.tier ?? 1, transferFee);
    const years = proposeContractYears({
      currentAge: validated.currentAge,
      retireAge: validated.retireAge,
      matchRating: validated.matchRating,
    });
    const wage = randomizeWageAnnual({
      proposedWage: proposeWageAnnual({
      ovr: effPositionOvr,
      age: validated.currentAge,
      currentWage: 500,
      prestige: club.prestige,
      leagueTier: club.league?.tier ?? 1,
      matchRating: validated.matchRating,
      stepUpPrestige: 0,
      acceptLowerWage: true,
      }),
      prestige: club.prestige,
      leagueTier: club.league?.tier ?? 1,
      randomSource: secureRandom,
    });

    const acceptChance =
      canApproachGate && canAfford && years > 0
        ? computeApproachAcceptChance({
            ovr: validated.currentOvr,
            effPositionOvr,
            age: validated.currentAge,
            matchRating: validated.matchRating,
            destPrestige: club.prestige,
            destLeagueTier: club.league?.tier ?? 1,
            expectedAppsRatio: fit,
            influenceScore: validated.influenceScore,
          })
        : null;

    let blockReason: string | null = null;
    if (!canApproachGate) {
      blockReason = "Chỉ chủ động ngỏ lời khi còn ≤1 năm HĐ hoặc hết hạn";
    } else if (!canAfford) {
      blockReason = "Phí phá HĐ vượt ngân sách CLB — không thể tự giảm";
    } else if (years <= 0) {
      blockReason = "Không còn mùa nghề để ký HĐ";
    }

    return {
      clubId: club.id,
      clubName: club.name,
      leagueId: club.leagueId,
      leagueName: club.league?.name ?? "Giải đấu",
      prestige: club.prestige,
      leagueTier: club.league?.tier ?? 1,
      expectedLeagueApps: apps,
      canApproach: Boolean(canApproachGate && canAfford && years > 0),
      canAffordBuyout: canAfford,
      previewFee: validated.contractYearsRemaining <= 0 || validated.isUnemployed ? 0 : transferFee,
      mandatoryBuyout,
      previewWage: wage,
      previewYears: years,
      blockReason,
      acceptChance,
    };
  });

  return { clubs, totalCount, leagues: allLeagues };
}

export async function resolveShortlistApproachAction(input: unknown): Promise<ResolveApproachResult> {
  await requireAuth();
  const validated = resolveShortlistApproachSchema.parse(input);
  return resolveApproachService({ ...validated, randomSource: secureRandom });
}

/** Persist the selected destination after the transfer UI has resolved an offer. */
export async function completeTransferAction(input: unknown): Promise<{
  clubName: string;
  leagueName: string;
  fee: number;
  contractYears: number;
  wageAnnual: number;
  age: number;
}> {
  const validated = completeTransferSchema.parse(input);
  await verifyGameOwnership(validated.gameId);

  const player = await prisma.careerPlayer.findFirst({
      where: { id: validated.playerId, gameSessionId: validated.gameId, slotIndex: validated.slotIndex, isRetired: false },
    select: { id: true, checkpointVersion: true, statsTimeline: true, clubStints: true },
  });
  if (!player) throw new Error("Cầu thủ không tồn tại hoặc không thuộc game này");
  if (player.checkpointVersion >= 2) {
    throw new Error("Legacy transfer completion không được phép ghi Career V2.");
  }

  const destination = await prisma.club.findUnique({
    where: { id: validated.clubId },
    select: { id: true, name: true, leagueId: true, prestige: true, continentalType: true, league: { select: { name: true, tier: true } } },
  });
  if (!destination) throw new Error("CLB đích không tồn tại");

  const timeline = (player.statsTimeline as unknown as StatSnapshot[]) ?? [];
  const snapshot = timeline.at(-1);
  if (!snapshot || typeof snapshot.age !== "number") throw new Error("Thiếu mốc mùa giải hiện tại");
  const currentAge = snapshot.age;

  const wageMultiplier = validated.wageOption === "lower"
    ? 0.8
    : validated.wageOption === "higher" ? 1.15 : 1;
  const wageChance = computeWageAgreementChance({
    option: validated.wageOption,
    baseWage: Math.max(1, Math.round(validated.wageAnnual / wageMultiplier)),
    clubPrestige: destination.prestige,
    leagueTier: destination.league.tier,
    expectedLeagueApps: 20,
  });
  if (secureRandom() >= wageChance) {
    throw new Error("CLB không chấp nhận mức lương này — hãy chọn một phương án khác.");
  }

  const stints = [...((player.clubStints as unknown as ClubStint[]) ?? [])];
  const lastStint = stints.at(-1);
  if (validated.kind === "renewal") {
    if (!lastStint || lastStint.clubId !== destination.id) throw new Error("CLB gia hạn không khớp trạng thái hiện tại");
  } else {
    if (lastStint?.clubId === destination.id) throw new Error("Không thể chuyển đến chính CLB hiện tại");
    if (lastStint) {
      lastStint.endAge = currentAge;
      lastStint.yearsAtClub = Math.max(1, currentAge - lastStint.startAge + 1);
      lastStint.ovrAtLeaving = snapshot.ovr;
    }
    stints.push({
      clubId: destination.id,
      clubName: destination.name,
      leagueId: destination.leagueId,
      leagueName: destination.league.name,
      startAge: currentAge + 1,
      endAge: currentAge + 1,
      yearsAtClub: 1,
      ovrAtJoining: snapshot.ovr,
      ovrAtLeaving: snapshot.ovr,
      wageAtJoining: validated.wageAnnual,
      feePaid: validated.transferFee,
    });
  }

  await prisma.careerPlayer.update({
    where: { id: player.id },
    data: {
      clubStints: stints as unknown as Prisma.InputJsonValue,
      currentContinentalCup: destination.continentalType,
      contractYearsTotal: validated.contractYears,
      contractYearsRemaining: validated.contractYears,
      currentWageAnnual: validated.wageAnnual,
      isUnemployed: false,
    },
  });
  revalidatePath(`/classic/${validated.gameId}/draft/${validated.slotIndex}`);
  return { clubName: destination.name, leagueName: destination.league.name, fee: validated.transferFee, contractYears: validated.contractYears, wageAnnual: validated.wageAnnual, age: currentAge + 1 };
}

/** @deprecated Prefer generateTransferMarketAction */
export async function generateTransferOfferAction(input: unknown): Promise<TransferMarketResult> {
  return generateTransferMarketAction(input);
}
