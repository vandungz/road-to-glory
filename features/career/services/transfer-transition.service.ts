import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { computeEffectivePositionOvr, computeMandatoryBuyout, computeMarketValue, clampWageAnnual, proposeContractYears, proposeWageAnnual } from "@/lib/transfer-economy";
import { appendMissingSeasonIncomeEntries, type WalletLedgerEntry } from "@/lib/wallet";
import { completeTransferWorkflow, lockTransferWorkflow, recordTransferWageFailure } from "@/features/career/services/transfer-workflow-state.service";
import { randomUUID } from "node:crypto";
import { computeWageAgreementChance } from "@/lib/salary-negotiation";
import { secureRandom } from "@/lib/secure-random";
import type { CompleteTransferCommand, TransferCompletionDto } from "@/features/career/contracts/transfer-transition.contract";
import { TransferTransitionError, playerSelect, seasonSelect, asRecord, asArray, asNumber, currentSnapshot, currentStats, seasonMatchRating, wageAttemptState, issuedWageMultiplier, parseReplayResult, transferResult, assertServerIssuedOffer, renewalWageMultiplier, wageMultiplier, type TransferCommandOutcome } from "./transfer-transition-helpers";

export async function completeTransferCommand(params: {
  input: CompleteTransferCommand;
  userId: string;
}): Promise<TransferCompletionDto> {
  const { input, userId } = params;

  const outcome: TransferCommandOutcome = await prisma.$transaction(async (tx): Promise<TransferCommandOutcome> => {
    const player = await tx.careerPlayer.findUnique({
      where: { id: input.playerId },
      select: playerSelect,
    });
    if (!player || player.gameSession.userId !== userId) {
      throw new TransferTransitionError("FORBIDDEN", "Career không thuộc user hiện tại");
    }

    const replay = await tx.careerCommand.findUnique({
      where: {
        careerPlayerId_idempotencyKey: {
          careerPlayerId: player.id,
          idempotencyKey: input.idempotencyKey,
        },
      },
      select: { commandType: true, input: true, result: true },
    });
    if (replay) {
      const replayInput = replay.input as { seasonId?: string; kind?: string; clubId?: string | null } | null;
      if (
        replay.commandType !== "transfer_complete" ||
        replayInput?.seasonId !== input.seasonId ||
        replayInput.kind !== input.kind ||
        replayInput.clubId !== (input.clubId ?? null)
      ) {
        throw new TransferTransitionError("COMMAND_EXISTS", "Idempotency key đã được dùng cho command khác");
      }
      return { kind: "success", result: parseReplayResult(replay.result, player.walletBalance) };
    }

    if (
      player.checkpointVersion < 2 ||
      player.currentAge === null ||
      player.currentStep === null
    ) {
      throw new TransferTransitionError(
        "CAREER_PROJECTION_UNAVAILABLE",
        "Career chưa được khởi tạo projection checkpoint V2",
      );
    }
    if (player.currentStep !== "transfer") {
      throw new TransferTransitionError("INVALID_TRANSITION", "Career chưa ở bước chuyển nhượng");
    }
    if (player.currentAge >= player.retireAge) {
      throw new TransferTransitionError("INVALID_TERMS", "Mùa giải cuối không có cửa sổ chuyển nhượng");
    }
    if (player.revision !== input.expectedRevision) {
      throw new TransferTransitionError("STALE_REVISION", "Career đã có thay đổi mới hơn");
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
      throw new TransferTransitionError("SEASON_NOT_FOUND", "Mùa giải hiện tại không tồn tại");
    }
    if (season.status !== "in_progress") {
      throw new TransferTransitionError("INVALID_TRANSITION", "Mùa giải này đã được chốt");
    }
    const transferWorkflow = await lockTransferWorkflow(tx, player.id, season.id);

    const stints = asArray(player.clubStints).filter((value): value is Record<string, unknown> =>
      value !== null && typeof value === "object" && !Array.isArray(value),
    );
    const lastStint = stints.at(-1);
    const currentClubId = typeof lastStint?.clubId === "string" ? lastStint.clubId : null;
    const currentClub = currentClubId
      ? await tx.club.findUnique({
          where: { id: currentClubId },
          select: { id: true, name: true, prestige: true, leagueId: true, league: { select: { name: true, tier: true } } },
        })
      : null;
    const negotiationClubId = input.clubId ?? currentClubId;
    if (input.kind !== "stay" && negotiationClubId) {
      const attempts = wageAttemptState(season.runtimeState, negotiationClubId, transferWorkflow);
      if (attempts.cancelled) {
        throw new TransferTransitionError("TRANSFER_DEAL_CANCELLED", "Thương vụ với CLB này đã bị hủy");
      }
      if (attempts.failedWageOptions.includes(input.wageOption)) {
        throw new TransferTransitionError("WAGE_OPTION_UNAVAILABLE", "Mức lương này đã bị CLB từ chối");
      }
    }
    const destination = input.clubId
      ? await tx.club.findUnique({
          where: { id: input.clubId },
          select: { id: true, name: true, prestige: true, leagueId: true, continentalType: true, league: { select: { name: true, tier: true } } },
        })
      : null;
    if (input.kind !== "stay" && !destination) {
      throw new TransferTransitionError("CLUB_NOT_FOUND", "CLB đích không tồn tại");
    }
    if (input.kind === "renewal" && (!destination || destination.id !== currentClubId)) {
      throw new TransferTransitionError("INVALID_TERMS", "Gia hạn phải thuộc CLB hiện tại");
    }
    if ((input.kind === "transfer" || input.kind === "free_agent") && destination?.id === currentClubId) {
      throw new TransferTransitionError("INVALID_TERMS", "Không thể chuyển đến chính CLB hiện tại");
    }
    const issuedOffer = await assertServerIssuedOffer({
      tx,
      playerId: player.id,
      seasonId: season.id,
      revision: input.expectedRevision,
      kind: input.kind,
      clubId: input.clubId,
      wageOption: input.wageOption,
    });
    if (input.kind === "transfer" && player.isUnemployed) {
      throw new TransferTransitionError("INVALID_TERMS", "Cầu thủ tự do không cần phí chuyển nhượng");
    }
    if (input.kind === "free_agent" && !player.isUnemployed && player.contractYearsRemaining > 0) {
      throw new TransferTransitionError("INVALID_TERMS", "Hợp đồng hiện tại chưa hết hạn");
    }

    const snapshot = currentSnapshot(player);
    const stats = currentStats(player);
    const ovr = asNumber(snapshot.ovr, player.peakOvr);
    const matchRating = seasonMatchRating(season);
    const effectiveOvr = computeEffectivePositionOvr(player.position, stats, ovr);
    const currentValue = computeMarketValue({
      ovr,
      age: player.currentAge,
      matchRating,
      contractYearsRemaining: player.contractYearsRemaining,
      position: player.position,
      currentStats: stats,
    });
    const transferFee = input.kind === "transfer"
      ? issuedOffer?.offer.transferFee ?? computeMandatoryBuyout(currentValue, player.contractYearsRemaining)
      : 0;
    const contractYears = input.kind === "stay"
      ? player.contractYearsTotal
      : issuedOffer?.offer.contractYears ?? proposeContractYears({
          currentAge: player.currentAge,
          retireAge: player.retireAge,
          matchRating,
          isRenewal: input.kind === "renewal",
        });
    const wageBase = input.kind === "stay"
      ? player.currentWageAnnual
      : issuedOffer
        ? Math.max(1, Math.round(
            issuedOffer.offer.wageAnnual / issuedWageMultiplier(input.kind, issuedOffer.wageOption),
          ))
        : proposeWageAnnual({
            ovr: effectiveOvr,
            age: player.currentAge,
            currentWage: player.currentWageAnnual,
            prestige: destination?.prestige ?? currentClub?.prestige ?? 2,
            leagueTier: destination?.league.tier ?? currentClub?.league.tier ?? 1,
            matchRating,
            stepUpPrestige: (destination?.prestige ?? currentClub?.prestige ?? 2) - (currentClub?.prestige ?? 2),
            acceptLowerWage: input.kind !== "renewal",
          });
    const wageAnnual = input.kind === "stay"
      ? Math.max(0, Math.round(wageBase))
      : clampWageAnnual(
          Math.round(wageBase * (input.kind === "renewal"
            ? renewalWageMultiplier(input.wageOption)
            : wageMultiplier(input.wageOption))),
          destination?.prestige ?? currentClub?.prestige ?? 2,
          destination?.league.tier ?? currentClub?.league.tier ?? 1,
        );
    if (input.kind !== "stay" && issuedOffer) {
      const wageChance = computeWageAgreementChance({
        option: input.wageOption,
        baseWage: issuedOffer.offer.wageAnnual,
        clubPrestige: destination?.prestige ?? currentClub?.prestige ?? 2,
        leagueTier: destination?.league.tier ?? currentClub?.league.tier ?? 1,
        expectedLeagueApps: issuedOffer.offer.expectedLeagueApps,
      });
      if (secureRandom() >= wageChance) {
        const negotiationClubId = input.clubId ?? currentClubId;
        if (negotiationClubId) {
          const workflowResult = await recordTransferWageFailure(tx, {
            playerId: player.id,
            seasonId: season.id,
            clubId: negotiationClubId,
            offerKind: input.kind === "renewal" ? "renewal" : input.kind === "free_agent" ? "free_agent" : "transfer",
            wageOption: input.wageOption,
          });
          return {
            kind: "failure",
            code: workflowResult.cancelled ? "TRANSFER_DEAL_CANCELLED" : "WAGE_NEGOTIATION_FAILED",
            message: workflowResult.cancelled
              ? "CLB đã mất kiên nhẫn — thương vụ chuyển nhượng bị hủy."
              : "CLB không chấp nhận mức lương này — hãy chọn một phương án khác.",
          };
        }
        throw new TransferTransitionError(
          "WAGE_NEGOTIATION_FAILED",
          "CLB không chấp nhận mức lương này — hãy chọn một phương án khác.",
        );
      }
    }
    if (input.kind !== "stay" && (contractYears <= 0 || wageAnnual <= 0)) {
      throw new TransferTransitionError("INVALID_TERMS", "Điều khoản hợp đồng không hợp lệ");
    }

    const nextStints = stints.map((stint) => ({ ...stint }));
    if (input.kind === "transfer" || input.kind === "free_agent") {
      if (nextStints.length > 0) {
        const previous = nextStints[nextStints.length - 1];
        previous.endAge = player.currentAge;
        previous.yearsAtClub = Math.max(1, player.currentAge - asNumber(previous.startAge, player.currentAge) + 1);
        previous.ovrAtLeaving = ovr;
      }
      if (destination) {
        nextStints.push({
          clubId: destination.id,
          clubName: destination.name,
          leagueId: destination.leagueId,
          leagueName: destination.league.name,
          startAge: player.currentAge + 1,
          endAge: player.currentAge + 1,
          yearsAtClub: 1,
          ovrAtJoining: ovr,
          ovrAtLeaving: ovr,
          wageAtJoining: wageAnnual,
          feePaid: transferFee,
        });
      }
    }

    const commandId = randomUUID();
    const nextRevision = input.expectedRevision + 1;
    const destinationName = destination?.name ?? currentClub?.name ?? "Cầu thủ tự do";
    const destinationLeague = destination?.league.name ?? currentClub?.league.name ?? "Không có giải đấu";
    // The transfer/stay decision opens the off-season Shop for `currentAge + 1`.
    // Credit the new season's salary (and a real transfer fee, if applicable)
    // before the Shop page is rendered so its server header has the correct
    // balance. The ledger helper makes this safe if a later transition retries.
    const wallet = appendMissingSeasonIncomeEntries({
      age: player.currentAge + 1,
      currentWageAnnual: input.kind === "stay" && player.isUnemployed ? 0 : wageAnnual,
      transferFeeThisSeason: transferFee,
      ledger: Array.isArray(player.walletLedger)
        ? player.walletLedger as unknown as WalletLedgerEntry[]
        : [],
    });

    const result = transferResult({
      commandId,
      revision: nextRevision,
      age: player.currentAge,
      kind: input.kind,
      clubId: destination?.id ?? currentClubId,
      clubName: destinationName,
      leagueName: destinationLeague,
      fee: transferFee,
      contractYears,
      wageAnnual,
      walletBalance: player.walletBalance + wallet.creditedIncome,
    });

    const updated = await tx.careerPlayer.updateMany({
      where: {
        id: player.id,
        revision: input.expectedRevision,
        currentStep: "transfer",
      },
      data: {
        revision: { increment: 1 },
        currentStep: "resolved",
        currentWheel: "career",
        ...(input.kind === "transfer" || input.kind === "free_agent"
          ? {
              clubStints: nextStints as unknown as Prisma.InputJsonValue,
              currentContinentalCup: destination?.continentalType ?? "none",
              contractYearsTotal: contractYears,
              contractYearsRemaining: contractYears,
              currentWageAnnual: wageAnnual,
              isUnemployed: false,
            }
          : {}),
        ...(input.kind === "renewal"
          ? {
              contractYearsTotal: contractYears,
              contractYearsRemaining: contractYears,
              currentWageAnnual: wageAnnual,
              isUnemployed: false,
            }
          : {}),
        ...(input.kind === "stay" && (player.isUnemployed || player.contractYearsRemaining <= 0)
          ? {
              contractYearsRemaining: 0,
              isUnemployed: true,
            }
          : {}),
        walletBalance: { increment: wallet.creditedIncome },
        walletLedger: wallet.ledger as unknown as Prisma.InputJsonValue,
      },
    });
    if (updated.count !== 1) {
      throw new TransferTransitionError("STALE_REVISION", "Không thể commit chuyển nhượng đồng thời");
    }

    await completeTransferWorkflow(tx, {
      playerId: player.id,
      seasonId: season.id,
      clubId: input.clubId ?? currentClubId,
      offerKind: input.kind === "stay" ? "renewal" : input.kind,
    });

    const runtime = asRecord(season.runtimeState);
    await tx.careerSeason.update({
      where: { id: season.id },
      data: {
        runtimeState: {
          ...runtime,
          transferResolution: {
            kind: input.kind,
            clubId: result.clubId,
            clubName: result.clubName,
            leagueName: result.leagueName,
            fee: result.fee,
            contractYears: result.contractYears,
            wageAnnual: result.wageAnnual,
          },
        } as Prisma.InputJsonValue,
      },
    });

    await tx.careerCommand.create({
      data: {
        id: commandId,
        careerPlayerId: player.id,
        seasonId: season.id,
        commandType: "transfer_complete",
        idempotencyKey: input.idempotencyKey,
        input: {
          seasonId: input.seasonId,
          kind: input.kind,
          clubId: input.clubId ?? null,
          wageOption: input.wageOption,
        } as Prisma.InputJsonValue,
        result: result as unknown as Prisma.InputJsonValue,
        revisionBefore: input.expectedRevision,
        revisionAfter: nextRevision,
      },
    });
    await tx.careerEvent.create({
      data: {
        careerPlayerId: player.id,
        seasonId: season.id,
        type: input.kind === "stay" ? "transfer_stayed" : "transfer_completed",
        label: input.kind === "stay"
          ? "Tiếp tục ở lại CLB hiện tại"
          : "Đã chốt chuyển đến " + result.clubName,
        payload: {
          commandId,
          kind: input.kind,
          clubId: result.clubId,
          revisionBefore: input.expectedRevision,
          revisionAfter: nextRevision,
        },
      },
    });

    return { kind: "success", result: { ...result, replayed: false } };
  });

  if (outcome.kind === "failure") {
    throw new TransferTransitionError(outcome.code, outcome.message);
  }
  return outcome.result;
}
