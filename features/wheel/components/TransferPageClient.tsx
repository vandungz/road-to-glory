"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { completeTransferAction, generateTransferMarketAction, resolveProactiveRenewalAction, resolveShortlistApproachAction, searchClubsForApproachAction } from "@/actions/season.actions";
import {
  completeTransferCommandAction,
  getTransferMarketCommandAction,
  resolveTransferNegotiationCommandAction,
  searchTransferClubsCommandAction,
} from "@/actions/career-transfer.actions";
import type { ContractOfferCard, ShortlistClubCard, TransferMarketResult } from "@/features/transfer/services/transfer.service";
import { applyWageDealChance, type WageDealOption } from "@/lib/salary-negotiation";
import type { ApproachRejectState } from "./TransferWindowPanel";
import { PersistentTransferSection } from "./PersistentTransferSection";
import { Button } from "@/components/ui/Button";
import { formatEuroThousands } from "@/lib/transfer-economy";

export interface TransferPageInput {
  gameId: string;
  slotIndex: number;
  playerId: string;
  seasonId: string | null;
  revision: number;
  checkpointVersion: number;
  playerName: string;
  position: string;
  currentClubId: string | null;
  currentClubName: string;
  currentClubLeagueId: string | null;
  currentClubLeagueName: string;
  currentClubPrestige: number;
  currentClubLeagueTier: number;
  currentAge: number;
  retireAge: number;
  currentOvr: number;
  currentStats: Record<string, number>;
  matchRating: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  contractYearsRemaining: number;
  contractYearsTotal: number;
  currentWageAnnual: number;
  marketValue: number;
  influenceScore: number;
  playerNation: string;
  shopHref: string;
}

interface TransferSuccess {
  clubName: string;
  leagueName: string;
  fee: number;
  contractYears: number;
  wageAnnual: number;
  age: number;
}

export function TransferPageClient({ input }: { input: TransferPageInput }) {
  const router = useRouter();
  const [market, setMarket] = useState<TransferMarketResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [willingToMove, setWillingToMove] = useState(true);
  const [approachRejects, setApproachRejects] = useState<ApproachRejectState>({});
  const [approachBanner, setApproachBanner] = useState<string | null>(null);
  const [finalizationError, setFinalizationError] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<ContractOfferCard | null>(null);
  const [deal, setDeal] = useState<WageDealOption>("standard");
  const [success, setSuccess] = useState<TransferSuccess | null>(null);
  const transferCommandKeyRef = useRef<string | null>(null);

  function transferCommandKey() {
    return transferCommandKeyRef.current ?? (
      transferCommandKeyRef.current = globalThis.crypto.randomUUID()
    );
  }

  useEffect(() => {
    let active = true;
    const marketRequest = input.checkpointVersion >= 2 && input.seasonId
      ? getTransferMarketCommandAction({
          playerId: input.playerId,
          seasonId: input.seasonId,
          expectedRevision: input.revision,
          willingToMove: true,
        })
      : generateTransferMarketAction({
          currentClubId: input.currentClubId,
          currentClubPrestige: input.currentClubPrestige,
          currentClubLeagueTier: input.currentClubLeagueTier,
          currentOvr: input.currentOvr,
          currentStats: input.currentStats,
          playerNation: input.playerNation,
          currentAge: input.currentAge,
          retireAge: input.retireAge,
          matchRating: input.matchRating,
          goals: input.goals,
          assists: input.assists,
          cleanSheets: input.cleanSheets,
          position: input.position,
          contractYearsRemaining: input.contractYearsRemaining,
          contractYearsTotal: input.contractYearsTotal,
          currentWageAnnual: input.currentWageAnnual,
          willingToMove: true,
          isUnemployed: !input.currentClubId,
          influenceScore: input.influenceScore,
        });
    marketRequest.then((result) => {
      if (active) setMarket(result);
    }).catch((error) => {
      console.error("Failed to load transfer market:", error);
      if (active) setApproachBanner("Không thể mở cửa sổ chuyển nhượng — thử tải lại trang.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [input]);

  async function commitOffer(offer: ContractOfferCard, wageOption?: WageDealOption) {
    if (isProcessing) return;
    if (input.checkpointVersion >= 2 && !input.seasonId) {
      setApproachBanner("Thiếu mùa giải hiện tại — hãy tải lại trang.");
      return;
    }
    setIsProcessing(true);
    const selectedWageOption = wageOption ?? deal;
    try {
      const result = input.checkpointVersion >= 2
        ? await completeTransferCommandAction({
            playerId: input.playerId,
            seasonId: input.seasonId,
            expectedRevision: input.revision,
            idempotencyKey: transferCommandKey(),
            kind: offer.kind,
            clubId: offer.clubId,
            wageOption: selectedWageOption,
          })
        : await completeTransferAction({
            gameId: input.gameId,
            playerId: input.playerId,
            slotIndex: input.slotIndex,
            kind: offer.kind,
            clubId: offer.clubId,
            wageAnnual: offer.wageAnnual,
            contractYears: offer.contractYears,
            transferFee: offer.transferFee,
          });
      if (offer.kind === "renewal") {
        router.push(input.shopHref);
      } else {
        setSuccess({
          clubName: result.clubName,
          leagueName: result.leagueName,
          fee: result.fee,
          contractYears: result.contractYears,
          wageAnnual: result.wageAnnual,
          age: "nextAge" in result ? result.nextAge : result.age,
        });
        setSelectedOffer(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể hoàn tất chuyển nhượng.";
      if (offer.kind === "renewal") {
        setApproachBanner(message);
      } else {
        setFinalizationError("Điều khoản này không còn hợp lệ hoặc đàm phán chưa hoàn tất. Hãy chọn lại mức lương hoặc quay lại lời đề nghị.");
      }
    } finally {
      setIsProcessing(false);
    }
  }

  async function acceptOffer(offer: ContractOfferCard, wageOption: WageDealOption = deal) {
    if (offer.kind === "renewal") {
      setIsProcessing(true);
      try {
        const result = input.checkpointVersion >= 2 && input.seasonId
          ? await resolveTransferNegotiationCommandAction({
              playerId: input.playerId,
              seasonId: input.seasonId,
              expectedRevision: input.revision,
              kind: "renewal",
              wageOption,
            })
          : await resolveProactiveRenewalAction({
              currentClubId: input.currentClubId,
              currentClubName: input.currentClubName,
              currentClubLeagueId: input.currentClubLeagueId,
              currentClubLeagueName: input.currentClubLeagueName,
              currentClubPrestige: input.currentClubPrestige,
              currentClubLeagueTier: input.currentClubLeagueTier,
              currentOvr: input.currentOvr,
              currentStats: input.currentStats,
              position: input.position,
              currentAge: input.currentAge,
              retireAge: input.retireAge,
              matchRating: input.matchRating,
              goals: input.goals,
              assists: input.assists,
              cleanSheets: input.cleanSheets,
              contractYearsRemaining: input.contractYearsRemaining,
              currentWageAnnual: input.currentWageAnnual,
              wageOption,
            });
        if (result.accepted) await commitOffer(result.offer, wageOption);
        else setApproachBanner(`Gia hạn bị từ chối — ${result.rejectReason}`);
      } catch (error) {
        setApproachBanner(error instanceof Error ? error.message : "Không thể đàm phán gia hạn.");
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    setFinalizationError(null);
    setApproachBanner(null);
    setDeal("standard");
    setSelectedOffer(offer);
  }

  async function approachClub(club: ShortlistClubCard, wageOption?: WageDealOption) {
    if (isProcessing || club.acceptChance == null) return false;
    setIsProcessing(true);
    setApproachBanner(null);
    const selectedDeal = wageOption ?? "standard";
    try {
      const result = input.checkpointVersion >= 2 && input.seasonId
        ? await resolveTransferNegotiationCommandAction({
            playerId: input.playerId,
            seasonId: input.seasonId,
            expectedRevision: input.revision,
            kind: "approach",
            clubId: club.clubId,
            wageOption: selectedDeal,
          })
        : await resolveShortlistApproachAction({
            clubId: club.clubId,
            clubName: club.clubName,
            leagueId: club.leagueId,
            leagueName: club.leagueName,
            prestige: club.prestige,
            leagueTier: club.leagueTier,
            previewFee: club.previewFee,
            previewWage: club.previewWage,
            previewYears: club.previewYears,
            wageOption: selectedDeal,
            clientAcceptChance: applyWageDealChance(club.acceptChance, selectedDeal),
            currentOvr: input.currentOvr,
            effPositionOvr: market?.valuation.effectivePositionOvr,
            currentAge: input.currentAge,
            matchRating: input.matchRating,
            contractYearsRemaining: input.contractYearsRemaining,
            isUnemployed: !input.currentClubId,
            influenceScore: input.influenceScore,
          });
      if (!result.accepted) {
        setApproachRejects((previous) => ({ ...previous, [club.clubId]: { chance: result.acceptChance, reason: result.rejectReason } }));
        setApproachBanner(`${club.clubName} đã từ chối — ${result.rejectReason}`);
        return false;
      }
      setFinalizationError(null);
      setSelectedOffer(result.offer);
      setDeal(selectedDeal);
      setApproachBanner(`${club.clubName} đã đồng ý mở đàm phán.`);
      return true;
    } catch (error) {
      setApproachBanner(error instanceof Error ? error.message : "Không thể ngỏ lời với CLB.");
      return false;
    } finally {
      setIsProcessing(false);
    }
  }

  async function searchClubs(params: { currentClubId?: string | null; query?: string; leagueId?: string; prestigeMin?: number; prestigeMax?: number; page: number }) {
    if (input.checkpointVersion >= 2 && input.seasonId) {
      return searchTransferClubsCommandAction({
        playerId: input.playerId,
        seasonId: input.seasonId,
        expectedRevision: input.revision,
        query: params.query,
        leagueId: params.leagueId,
        prestigeMin: params.prestigeMin,
        prestigeMax: params.prestigeMax,
        page: params.page,
        pageSize: 8,
      });
    }
    return searchClubsForApproachAction({
      ...params,
      currentClubId: input.currentClubId,
      currentOvr: input.currentOvr,
      currentStats: input.currentStats,
      currentAge: input.currentAge,
      retireAge: input.retireAge,
      matchRating: input.matchRating,
      position: input.position,
      contractYearsRemaining: input.contractYearsRemaining,
      isUnemployed: !input.currentClubId,
      influenceScore: input.influenceScore,
    });
  }

  async function stayAtCurrentClub() {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (input.checkpointVersion >= 2) {
        if (!input.seasonId) throw new Error("Thiếu mùa giải hiện tại");
        await completeTransferCommandAction({
          playerId: input.playerId,
          seasonId: input.seasonId,
          expectedRevision: input.revision,
          idempotencyKey: transferCommandKey(),
          kind: "stay",
        });
      }
      router.push(input.shopHref);
    } catch (error) {
      setApproachBanner(error instanceof Error ? error.message : "Không thể chốt lựa chọn hiện tại.");
    } finally {
      setIsProcessing(false);
    }
  }

  if (success) {
    return <main className="rtg-transfer-success"><span className="rtg-eyebrow">Kết quả chuyển nhượng · mùa {success.age}</span><h1>{input.playerName} đến {success.clubName}</h1><p>{success.leagueName} · Một chương mới trong sự nghiệp đã bắt đầu.</p><div className="rtg-transfer-success__facts"><span><small>Phí chuyển nhượng</small><strong>{success.fee ? formatEuroThousands(success.fee) : "Miễn phí"}</strong></span><span><small>Hợp đồng</small><strong>{success.contractYears} mùa</strong></span><span><small>Lương hàng năm</small><strong>{formatEuroThousands(success.wageAnnual)}</strong></span></div><Button size="lg" onClick={() => router.push(input.shopHref)}>Mở cửa hàng trước khi vào mùa mới <ArrowRightIcon /></Button></main>;
  }

  if (selectedOffer) {
    return <main className="rtg-transfer-negotiation"><button type="button" className="rtg-transfer-back" onClick={() => { setFinalizationError(null); setSelectedOffer(null); }}>← Quay lại lời đề nghị</button><span className="rtg-eyebrow">Đàm phán hợp đồng · {selectedOffer.clubName}</span><h1>Chốt điều khoản cuối cùng</h1><p>Chọn mức lương cuối cùng bạn muốn đề xuất cho {selectedOffer.contractYears} mùa giải.</p>{approachBanner && <p className="rtg-transfer-feedback is-banner" role="status">{approachBanner}</p>}{finalizationError && <p className="rtg-transfer-feedback is-error" role="alert">{finalizationError}</p>}<div className="rtg-transfer-negotiation__offer"><div><small>CLB mới</small><strong>{selectedOffer.clubName}</strong></div><div><small>Phí chuyển nhượng</small><strong>{selectedOffer.transferFee ? formatEuroThousands(selectedOffer.transferFee) : "Miễn phí"}</strong></div></div><div className="rtg-transfer-wage-options">{(["lower", "standard", "higher"] as WageDealOption[]).map((option) => { const multiplier = option === "lower" ? .8 : option === "higher" ? 1.15 : 1; const wage = Math.round(selectedOffer.wageAnnual * multiplier); return <button type="button" key={option} className={deal === option ? "is-active" : ""} onClick={() => { setFinalizationError(null); setDeal(option); }}><span>{option === "lower" ? "€ Lương an toàn" : option === "higher" ? "€ Yêu cầu cao" : "€ Đề nghị tiêu chuẩn"}</span><strong>{formatEuroThousands(wage)}/năm</strong><small>{option === "lower" ? "Tăng cơ hội được chấp nhận" : option === "higher" ? "Có thể giảm khả năng ký kết" : "Cân bằng giữa lương và cơ hội"}</small></button>; })}</div><Button size="lg" fullWidth loading={isProcessing} disabled={isProcessing} onClick={() => void commitOffer({ ...selectedOffer, wageAnnual: Math.round(selectedOffer.wageAnnual * (deal === "lower" ? .8 : deal === "higher" ? 1.15 : 1)) })}>Chốt điều khoản & chuyển đến {selectedOffer.clubName} <ArrowRightIcon /></Button></main>;
  }

  if (isLoading || !market) return <main className="rtg-transfer-loading"><span className="rtg-eyebrow">Cửa sổ chuyển nhượng</span><h1>Đang dò tìm cơ hội mới...</h1><p>Đang cập nhật các CLB phù hợp với hồ sơ của bạn.</p></main>;
  return <PersistentTransferSection market={market} currentClubId={input.currentClubId} currentClubName={input.currentClubName} willingToMove={willingToMove} setWillingToMove={setWillingToMove} isProcessing={isProcessing} onAcceptOffer={(offer) => void acceptOffer(offer)} onRejectAll={() => void stayAtCurrentClub()} onApproachShortlist={approachClub} onProactiveRenewal={(option) => { if (market.renewal) void acceptOffer(market.renewal, option); }} onSearchClubs={searchClubs} approachRejects={approachRejects} approachBanner={approachBanner} />;
}

function ArrowRightIcon() { return <ArrowRight aria-hidden="true" size={16} />; }
