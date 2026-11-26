"use client";
import { ScrollArea } from "@/components/ui/ScrollArea";


import { useTransferCopy } from "./useTransferCopy";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { completeTransferAction, generateTransferMarketAction, resolveShortlistApproachAction, searchClubsForApproachAction } from "@/actions/season.actions";
import {
  completeTransferCommandAction,
  dismissTransferNegotiationCommandAction,
  getTransferMarketCommandAction,
  resolveTransferNegotiationCommandAction,
  setTransferOfferSelectionCommandAction,
  searchTransferClubsCommandAction,
} from "@/actions/career-transfer.actions";
import type { TransferCommandResult } from "@/features/career/contracts/transfer-transition.contract";
import type { ContractOfferCard, PendingTransferNegotiation, ShortlistClubCard, TransferDealResolution, TransferMarketResult } from "@/features/transfer/services/transfer.service";
import { type WageDealOption } from "@/lib/salary-negotiation";
import type { ApproachRejectState } from "@/features/transfer/services/transfer.service";
import { PersistentTransferSection } from "./PersistentTransferSection";
import { TransferNegotiationPanel } from "./TransferNegotiationPanel";
import { ErrorState, RouteLoading } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { applyTransferFeeDealChance, formatEuroThousands, formatTransferFee, type TransferFeeDealOption } from "@/lib/transfer-economy";
import { getTransferPortraitCue, saveTransferPortraitCue } from "../lib/portrait-reactions";

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
  const ui = useTranslations("ui");
  const t = useTranslations("transfer");
  const copy = useTransferCopy();
  const router = useRouter();
  const [market, setMarket] = useState<TransferMarketResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [marketAttempt, setMarketAttempt] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [approachRejects, setApproachRejects] = useState<ApproachRejectState>({});
  const [approachBanner, setApproachBanner] = useState<string | null>(null);
  const [finalizationError, setFinalizationError] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<ContractOfferCard | null>(null);
  const [deal, setDeal] = useState<WageDealOption>("standard");
  const [failedWageOptions, setFailedWageOptions] = useState<WageDealOption[]>([]);
  const [cancelledOffer, setCancelledOffer] = useState<ContractOfferCard | null>(null);
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
      if (active) {
        const pendingRenewal = result.pendingNegotiation?.offer.kind === "renewal" ? result.pendingNegotiation.offer : null;
        setMarket(pendingRenewal && !result.renewal ? { ...result, renewal: pendingRenewal } : result);
        setSelectedOffer(result.pendingNegotiation?.offer.kind === "renewal" ? null : result.pendingNegotiation?.offer ?? null);
        setFailedWageOptions(result.pendingNegotiation?.failedWageOptions ?? []);
        setDeal("standard");
      }
    }).catch(() => {
      if (active) setMarket(null);
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [input, marketAttempt]);

  async function commitOffer(offer: ContractOfferCard, wageOption?: WageDealOption): Promise<TransferDealResolution> {
    if (isProcessing) return "error";
    if (input.checkpointVersion >= 2 && !input.seasonId) {
      setApproachBanner(t("missingSeason"));
      return "error";
    }
    setIsProcessing(true);
    const selectedWageOption = wageOption ?? deal;
    const wageMultiplier = selectedWageOption === "lower" ? 0.8 : selectedWageOption === "higher" ? 1.15 : 1;
    const finalizedWageAnnual = Math.round(offer.wageAnnual * wageMultiplier);
    try {
      let completion: {
        clubName: string;
        leagueName: string;
        fee: number;
        contractYears: number;
        wageAnnual: number;
        age?: number;
        nextAge?: number;
      };
      if (input.checkpointVersion >= 2) {
        const result: TransferCommandResult = await completeTransferCommandAction({
            playerId: input.playerId,
            seasonId: input.seasonId,
            expectedRevision: input.revision,
            idempotencyKey: transferCommandKey(),
            kind: offer.kind,
            clubId: offer.clubId,
            wageOption: selectedWageOption,
          });
        if (result.status !== "accepted") {
          if (result.status === "cancelled") {
            setCancelledOffer(offer);
            setSelectedOffer(null);
            setMarket((previous) => previous ? {
              ...previous,
              renewal: offer.kind === "renewal" ? null : previous.renewal,
              inbound: previous.inbound.filter((item) => item.clubId !== offer.clubId),
              shortlist: previous.shortlist.filter((item) => item.clubId !== offer.clubId),
            } : previous);
          } else {
            setFailedWageOptions(result.failedWageOptions);
            setFinalizationError(null);
            if (offer.kind === "renewal") {
              setMarket((previous) => previous ? { ...previous, renewal: null } : previous);
            }
            const nextOption = (["lower", "standard", "higher"] as WageDealOption[]).find((option) => !result.failedWageOptions.includes(option));
            if (nextOption) setDeal(nextOption);
          }
          return result.status === "cancelled" ? "cancelled" : "rejected";
        }
        completion = result.transfer;
      } else {
        const result = await completeTransferAction({
            gameId: input.gameId,
            playerId: input.playerId,
            slotIndex: input.slotIndex,
            kind: offer.kind,
            clubId: offer.clubId,
            wageAnnual: finalizedWageAnnual,
            contractYears: offer.contractYears,
            transferFee: offer.transferFee,
            wageOption: selectedWageOption,
          });
        if (result.status === "rejected") return "rejected";
        completion = result;
      }
      if (offer.kind === "renewal") {
        router.push(input.shopHref);
      } else {
        const from = input.currentClubId ? { id: input.currentClubId, prestige: input.currentClubPrestige } : null;
        const cue = getTransferPortraitCue(from, { id: offer.clubId, prestige: offer.prestige }, `${input.currentAge}:transfer`);
        if (cue) saveTransferPortraitCue(input.playerId, cue);
        setSuccess({
          clubName: completion.clubName,
          leagueName: completion.leagueName,
          fee: completion.fee,
          contractYears: completion.contractYears,
          wageAnnual: completion.wageAnnual,
          age: completion.nextAge ?? completion.age!,
        });
        setSelectedOffer(null);
      }
      setFailedWageOptions([]);
      return "accepted";
    } catch {
      if (offer.kind === "renewal") setApproachBanner(t("completionError"));
      else setFinalizationError(t("negotiationError"));
      return "error";
    } finally {
      setIsProcessing(false);
    }
  }

  async function persistOfferSelection(offer: ContractOfferCard): Promise<PendingTransferNegotiation | null> {
    if (input.checkpointVersion < 2 || !input.seasonId) return { offer, failedWageOptions: [] };
    setIsProcessing(true);
    try {
      return await setTransferOfferSelectionCommandAction({
        playerId: input.playerId,
        seasonId: input.seasonId,
        expectedRevision: input.revision,
        clubId: offer.clubId,
      });
    } catch {
      setApproachBanner(t("selectionError"));
      return null;
    } finally {
      setIsProcessing(false);
    }
  }

  async function clearPersistedOfferSelection(offer?: ContractOfferCard, state?: { failedWageOptions: WageDealOption[] }) {
    if (input.checkpointVersion < 2 || !input.seasonId) return;
    try {
      if (offer?.kind === "renewal" && (state?.failedWageOptions.length ?? failedWageOptions.length) > 0) {
        await dismissTransferNegotiationCommandAction({
          playerId: input.playerId,
          seasonId: input.seasonId,
          expectedRevision: input.revision,
          clubId: offer.clubId,
          offerKind: offer.kind,
        });
      } else {
        await setTransferOfferSelectionCommandAction({
          playerId: input.playerId,
          seasonId: input.seasonId,
          expectedRevision: input.revision,
          clubId: null,
        });
      }
    } catch {
    }
  }

  async function approachClub(club: ShortlistClubCard, feeOption?: TransferFeeDealOption) {
    if (isProcessing || club.acceptChance == null) return false;
    setIsProcessing(true);
    setApproachBanner(null);
    const selectedDeal = feeOption ?? "standard";
    try {
      const result = input.checkpointVersion >= 2 && input.seasonId
        ? await resolveTransferNegotiationCommandAction({
            playerId: input.playerId,
            seasonId: input.seasonId,
            expectedRevision: input.revision,
            kind: "approach",
            clubId: club.clubId,
            feeOption: selectedDeal,
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
            mandatoryBuyout: market?.mandatoryBuyout ?? 0,
            feeOption: selectedDeal,
            clientAcceptChance: applyTransferFeeDealChance(club.acceptChance, selectedDeal),
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
        setApproachBanner(t("declinedOffer", { club: club.clubName, reason: copy(result.rejectReason) }));
        return false;
      }
      setFinalizationError(null);
      setSelectedOffer(result.offer);
      setDeal("standard");
      setFailedWageOptions([]);
      return true;
    } catch {
      setApproachBanner(t("approachError"));
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
        if (!input.seasonId) {
          setApproachBanner(t("missingSeason"));
          return;
        }
        const result = await completeTransferCommandAction({
          playerId: input.playerId,
          seasonId: input.seasonId,
          expectedRevision: input.revision,
          idempotencyKey: transferCommandKey(),
          kind: "stay",
        });
        if (result.status !== "accepted") {
          setApproachBanner(t(result.code));
          return;
        }
      }
      router.push(input.shopHref);
    } catch {
      setApproachBanner(t("decisionError"));
    } finally {
      setIsProcessing(false);
    }
  }

  if (success) {
    return <main className="football-transfer-success"><span className="football-eyebrow">{ui("transferResultSeason")} {success.age}</span><h1>{input.playerName} {ui("to")} {success.clubName}</h1><p>{success.leagueName} {ui("contractSigned")}</p><div className="football-transfer-success__facts"><span><small>{ui("transferFee")}</small><strong>{success.fee ? formatTransferFee(success.fee) : ui("freeTransfer")}</strong></span><span><small>{ui("contract")}</small><strong>{success.contractYears} {ui("seasons")}</strong></span><span><small>{ui("annualWage")}</small><strong>{formatEuroThousands(success.wageAnnual)}</strong></span></div><Button size="lg" onClick={() => router.push(input.shopHref)}>{ui("openShopBeforeTheNextSeason")} <ArrowRightIcon /></Button></main>;
  }

  if (cancelledOffer) {
    return <ScrollArea as="main" className="football-transfer-negotiation football-transfer-negotiation--cancelled"><span className="football-eyebrow">{ui("talksEnded")}</span><h1>{t("moveCancelled", { club: cancelledOffer.clubName })}</h1><p>{ui("theClubRejectedTwoWageProposalsAndWithdrewItsOfferForThisSeason")}</p><Button size="lg" onClick={() => setCancelledOffer(null)}>{ui("backToClubs")}</Button></ScrollArea>;
  }

  if (selectedOffer) {
    return <TransferNegotiationPanel offer={selectedOffer} selected={deal} failed={failedWageOptions} processing={isProcessing}
      onBack={async () => { setFinalizationError(null); setSelectedOffer(null); await clearPersistedOfferSelection(selectedOffer); }}
      onSelect={(option) => { setFinalizationError(null); setDeal(option); }}
      onSubmit={async () => {
        const resolution = await commitOffer(selectedOffer, deal);
        if (resolution === "rejected") setFailedWageOptions((previous) => {
          const next = [...new Set([...previous, deal])];
          const nextOption = (["lower", "standard", "higher"] as WageDealOption[]).find((option) => !next.includes(option));
          if (nextOption) setDeal(nextOption);
          return next;
        });
      }}>
      {finalizationError && <p className="football-transfer-feedback is-error" role="alert">{finalizationError}</p>}
    </TransferNegotiationPanel>;
  }

  if (isLoading || !market) return <div className="football-transfer-loading">
    {isLoading ? <RouteLoading title={ui("transferMarket")} label={ui("loadingOffers")} layout="records" /> : (
      <ErrorState title={ui("couldNotOpenTheTransferMarket")}>
        <Button variant="outline" onClick={() => {
          setIsLoading(true);
          setMarketAttempt((attempt) => attempt + 1);
        }}>{ui("retry")}</Button>
      </ErrorState>
    )}
  </div>;
  return <PersistentTransferSection market={market} currentClubId={input.currentClubId} currentClubName={input.currentClubName} isProcessing={isProcessing} onAcceptOffer={async (offer, wageOption) => ({ resolution: await commitOffer(offer, wageOption) })} onRejectAll={() => void stayAtCurrentClub()} onApproachShortlist={approachClub} onSearchClubs={searchClubs} approachRejects={approachRejects} approachBanner={approachBanner} onSelectOffer={persistOfferSelection} onClearAcceptedOffer={clearPersistedOfferSelection} />;
}

function ArrowRightIcon() { return <ArrowRight aria-hidden="true" size={16} />; }
