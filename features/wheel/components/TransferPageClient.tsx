"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { completeTransferAction, generateTransferMarketAction, resolveProactiveRenewalAction, resolveShortlistApproachAction, searchClubsForApproachAction } from "@/actions/season.actions";
import type { ContractOfferCard, ShortlistClubCard, TransferMarketResult } from "@/features/transfer/services/transfer.service";
import type { WageDealOption } from "@/lib/salary-negotiation";
import type { ApproachRejectState } from "./TransferWindowPanel";
import { PersistentTransferSection } from "./PersistentTransferSection";
import { Button } from "@/components/ui/Button";
import { formatEuroThousands } from "@/lib/transfer-economy";

export interface TransferPageInput {
  gameId: string;
  slotIndex: number;
  playerId: string;
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
  const [selectedOffer, setSelectedOffer] = useState<ContractOfferCard | null>(null);
  const [deal, setDeal] = useState<WageDealOption>("standard");
  const [success, setSuccess] = useState<TransferSuccess | null>(null);

  useEffect(() => {
    let active = true;
    generateTransferMarketAction({
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
    }).then((result) => {
      if (active) setMarket(result);
    }).catch((error) => {
      console.error("Failed to load transfer market:", error);
      if (active) setApproachBanner("Không thể mở cửa sổ chuyển nhượng — thử tải lại trang.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [input]);

  async function commitOffer(offer: ContractOfferCard) {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await completeTransferAction({ gameId: input.gameId, playerId: input.playerId, slotIndex: input.slotIndex, kind: offer.kind, clubId: offer.clubId, wageAnnual: offer.wageAnnual, contractYears: offer.contractYears, transferFee: offer.transferFee });
      if (offer.kind === "renewal") {
        router.push(input.shopHref);
      } else {
        setSuccess(result);
        setSelectedOffer(null);
      }
    } catch (error) {
      setApproachBanner(error instanceof Error ? error.message : "Không thể hoàn tất chuyển nhượng.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function acceptOffer(offer: ContractOfferCard, wageOption: WageDealOption = deal) {
    if (offer.kind === "renewal") {
      setIsProcessing(true);
      try {
        const result = await resolveProactiveRenewalAction({ currentClubId: input.currentClubId, currentClubName: input.currentClubName, currentClubLeagueId: input.currentClubLeagueId, currentClubLeagueName: input.currentClubLeagueName, currentClubPrestige: input.currentClubPrestige, currentClubLeagueTier: input.currentClubLeagueTier, currentOvr: input.currentOvr, currentStats: input.currentStats, position: input.position, currentAge: input.currentAge, retireAge: input.retireAge, matchRating: input.matchRating, goals: input.goals, assists: input.assists, cleanSheets: input.cleanSheets, contractYearsRemaining: input.contractYearsRemaining, currentWageAnnual: input.currentWageAnnual, wageOption });
        if (result.accepted) await commitOffer(result.offer);
        else setApproachBanner(`Gia hạn bị từ chối — ${result.rejectReason}`);
      } catch (error) {
        setApproachBanner(error instanceof Error ? error.message : "Không thể đàm phán gia hạn.");
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    setDeal("standard");
    setSelectedOffer(offer);
  }

  async function approachClub(club: ShortlistClubCard, wageOption?: WageDealOption) {
    if (isProcessing || club.acceptChance == null) return false;
    setIsProcessing(true);
    setApproachBanner(null);
    const selectedDeal = wageOption ?? "standard";
    try {
      const result = await resolveShortlistApproachAction({ clubId: club.clubId, clubName: club.clubName, leagueId: club.leagueId, leagueName: club.leagueName, prestige: club.prestige, leagueTier: club.leagueTier, previewFee: club.previewFee, previewWage: club.previewWage, previewYears: club.previewYears, wageOption: selectedDeal, clientAcceptChance: club.acceptChance, currentOvr: input.currentOvr, effPositionOvr: market?.valuation.effectivePositionOvr, currentAge: input.currentAge, matchRating: input.matchRating, contractYearsRemaining: input.contractYearsRemaining, isUnemployed: !input.currentClubId, influenceScore: input.influenceScore });
      if (!result.accepted) {
        setApproachRejects((previous) => ({ ...previous, [club.clubId]: { chance: result.acceptChance, reason: result.rejectReason } }));
        setApproachBanner(`${club.clubName} đã từ chối — ${result.rejectReason}`);
        return false;
      }
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
    return searchClubsForApproachAction({ ...params, currentClubId: input.currentClubId, currentOvr: input.currentOvr, currentStats: input.currentStats, currentAge: input.currentAge, retireAge: input.retireAge, matchRating: input.matchRating, position: input.position, contractYearsRemaining: input.contractYearsRemaining, isUnemployed: !input.currentClubId, influenceScore: input.influenceScore });
  }

  if (success) {
    return <main className="rtg-transfer-success"><span className="rtg-eyebrow">Kết quả chuyển nhượng · mùa {success.age}</span><h1>{input.playerName} đến {success.clubName}</h1><p>{success.leagueName} · Một chương mới trong sự nghiệp đã bắt đầu.</p><div className="rtg-transfer-success__facts"><span><small>Phí chuyển nhượng</small><strong>{success.fee ? formatEuroThousands(success.fee) : "Miễn phí"}</strong></span><span><small>Hợp đồng</small><strong>{success.contractYears} mùa</strong></span><span><small>Lương tuần</small><strong>{formatEuroThousands(Math.round(success.wageAnnual / 52))}</strong></span></div><Button size="lg" onClick={() => router.push(input.shopHref)}>Mở cửa hàng trước khi vào mùa mới <ArrowRightIcon /></Button></main>;
  }

  if (selectedOffer) {
    return <main className="rtg-transfer-negotiation"><button type="button" className="rtg-transfer-back" onClick={() => setSelectedOffer(null)}>← Quay lại lời đề nghị</button><span className="rtg-eyebrow">Đàm phán hợp đồng · {selectedOffer.clubName}</span><h1>Chốt điều khoản cuối cùng</h1><p>Chọn mức lương bạn muốn đề xuất cho {selectedOffer.contractYears} mùa giải.</p><div className="rtg-transfer-negotiation__offer"><div><small>CLB mới</small><strong>{selectedOffer.clubName}</strong></div><div><small>Phí chuyển nhượng</small><strong>{selectedOffer.transferFee ? formatEuroThousands(selectedOffer.transferFee) : "Miễn phí"}</strong></div></div><div className="rtg-transfer-wage-options">{(["lower", "standard", "higher"] as WageDealOption[]).map((option) => { const multiplier = option === "lower" ? .8 : option === "higher" ? 1.15 : 1; const wage = Math.round(selectedOffer.wageAnnual * multiplier); return <button type="button" key={option} className={deal === option ? "is-active" : ""} onClick={() => setDeal(option)}><span>{option === "lower" ? "€ Lương an toàn" : option === "higher" ? "€ Yêu cầu cao" : "€ Đề nghị tiêu chuẩn"}</span><strong>{formatEuroThousands(wage)}/năm</strong><small>{option === "lower" ? "Tăng cơ hội được chấp nhận" : option === "higher" ? "Có thể giảm khả năng ký kết" : "Cân bằng giữa lương và cơ hội"}</small></button>; })}</div><Button size="lg" fullWidth loading={isProcessing} disabled={isProcessing} onClick={() => void commitOffer({ ...selectedOffer, wageAnnual: Math.round(selectedOffer.wageAnnual * (deal === "lower" ? .8 : deal === "higher" ? 1.15 : 1)) })}>Xác nhận chuyển đến {selectedOffer.clubName} <ArrowRightIcon /></Button></main>;
  }

  if (isLoading || !market) return <main className="rtg-transfer-loading"><span className="rtg-eyebrow">Cửa sổ chuyển nhượng</span><h1>Đang dò tìm cơ hội mới...</h1><p>Đang cập nhật các CLB phù hợp với hồ sơ của bạn.</p></main>;
  return <PersistentTransferSection market={market} currentClubId={input.currentClubId} currentClubName={input.currentClubName} willingToMove={willingToMove} setWillingToMove={setWillingToMove} isProcessing={isProcessing} onAcceptOffer={(offer) => void acceptOffer(offer)} onRejectAll={() => router.push(input.shopHref)} onApproachShortlist={approachClub} onProactiveRenewal={(option) => { if (market.renewal) void acceptOffer(market.renewal, option); }} onSearchClubs={searchClubs} approachRejects={approachRejects} approachBanner={approachBanner} />;
}

function ArrowRightIcon() { return <ArrowRight aria-hidden="true" size={16} />; }
