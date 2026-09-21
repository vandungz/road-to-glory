"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDraftDrum } from "../hooks/useDraftDrum";
import { SetupStage } from "./SetupStage";
import { DraftDrumCareerStage } from "./DraftDrumCareerStage";
import { RetiredStage } from "./RetiredStage";
import { SeasonResultModal } from "./SeasonResultModal";
import { BallonDorNominationModal } from "./BallonDorNominationModal";
import { SeasonRecapModal } from "./SeasonRecapModal";
import { TrophyCabinetModal } from "./TrophyCabinetModal";
import { PersistentTransferSection } from "./PersistentTransferSection";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/Modal";
import { WheelGameHeader } from "./WheelGameHeader";
import { getSeasonYearString } from "../lib/simulation-helpers";

function consumeReturnQuery(param: "shopReturn" | "transferReturn") {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(param)) return;
  url.searchParams.delete(param);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

interface DraftDrumScreenProps {
  gameId: string;
  slotIndex: number;
  position: string;
  leagues: { id: string; name: string }[];
  clubs: { id: string; name: string; leagueId: string; prestige: number; continentalType: string }[];
  savedPlayerId?: string;
  savedContinentalCup?: string;
  initialMode?: "setup" | "career" | "retired";
  backHref?: string;
  gameName?: string;
  shopReturnAction?: "start" | "advance";
  shopReturnToken?: string;
  transferReturnAction?: "start" | "advance";
}

export function DraftDrumScreen({ 
  gameId, 
  slotIndex, 
  position, 
  leagues, 
  clubs, 
  savedPlayerId, 
  savedContinentalCup, 
  initialMode = "setup",
  backHref = `/${gameId}`,
  gameName,
  shopReturnAction,
  shopReturnToken,
  transferReturnAction,
}: DraftDrumScreenProps) {
  const router = useRouter();
  const {
    isMounted,
    isSaving,
    mode,
    wheelItems,
    targetIndex,
    tempValue,
    activeStep,
    isSpinning,
    draftData,
    playerName,
    playerNationality,
    playerDebutAge,
    playerCareerLength,
    currentAge,
    currentOvr,
    currentStats,
    currentClub,
    currentContinentalCup,
    seasonRecords,
    selectedAgeForStats,
    setSelectedAgeForStats,
    activeModal,
    setActiveModal,
    careerSubStep,
    isProcessing,
    isBallonDorTransitioning,
    seasonTicketResolved,
    startCareerError,
    careerSpinning,
    careerWheelItems,
    careerTargetIndex,
    yearEvolution,
    evolvedStatsThisYear,
    standingResult,
    domesticCupResult,
    continentalCupResult,
    hasBallonDorWinner,
    ballonDorResult,
    careerTotalStats,
    peakOvrValue,
    yearSimResult,
    transferOffer,
    transferMarket,
    willingToMove,
    approachRejects,
    approachBanner,
    proactiveRenewalRejected,
    isUnemployed,
    clubStints,
    nationalCallupResult,
    nationalTournamentResult,
    tempSelectedStat,
    shopTargetSeason,
    contractYearsTotal,
    contractYearsRemaining,
    currentWageAnnual,
    marketValue,
    handleSetupSpin,
    handleSetupSpinComplete,
    handleStartCareer,
    handleCareerSpin,
    handleCareerSpinComplete,
    handleAcceptMarketOffer,
    clearPendingTransferOffer,
    handleRejectTransferWindow,
    handleApproachShortlist,
    handleProactiveRenewal,
    handleSearchClubs,
    handleSetWillingToMove,
    handleNextSeason,
    handleShopReturn,
    handleTransferReturn,
    persistCurrentProgress,
    handleSeasonStatsModalClose,
    handleCompetitionResultModalClose,
    handleSavePlayer,
    STEP_LABELS,
    selectorIndex,
  } = useDraftDrum(gameId, slotIndex, position, leagues, clubs, savedPlayerId, savedContinentalCup, initialMode);

  const [isTrophyCabinetOpen, setIsTrophyCabinetOpen] = useState<boolean>(false);
  const [rightTab, setRightTab] = useState<"panini" | "profile" | "transfer">("panini");
  const [mobileSection, setMobileSection] = useState<"action" | "story" | "panini">("action");

  React.useEffect(() => {
    if (careerSubStep === "transfer" && transferMarket) {
      setRightTab("transfer");
    }
  }, [careerSubStep, transferMarket]);

  const ballonDorNavigationStartedRef = React.useRef(false);
  React.useEffect(() => {
    if (!ballonDorResult || ballonDorResult.phase !== "ranking") return;
    if (ballonDorNavigationStartedRef.current) return;
    ballonDorNavigationStartedRef.current = true;
    router.replace(`/classic/${gameId}/draft/${slotIndex}/ballon-dor`);
  }, [ballonDorResult, gameId, router, slotIndex]);

  const handledShopReturnRef = React.useRef<string | null>(null);
  const shopReturnKey = shopReturnAction
    ? `${shopReturnAction}:${shopReturnToken ?? "legacy"}`
    : null;
  React.useEffect(() => {
    if (
      !shopReturnAction ||
      !shopReturnKey ||
      handledShopReturnRef.current === shopReturnKey ||
      !isMounted ||
      mode !== "career" ||
      isProcessing
    ) return;
    handledShopReturnRef.current = shopReturnKey;
    consumeReturnQuery("shopReturn");
    handleShopReturn(shopReturnAction);
  }, [handleShopReturn, isMounted, isProcessing, mode, shopReturnAction, shopReturnKey]);

  const handledTransferReturnRef = React.useRef(false);
  React.useEffect(() => {
    if (
      !transferReturnAction ||
      handledTransferReturnRef.current ||
      !isMounted ||
      mode !== "career" ||
      isProcessing
    ) return;
    handledTransferReturnRef.current = true;
    consumeReturnQuery("transferReturn");
    handleTransferReturn(transferReturnAction);
  }, [handleTransferReturn, isMounted, isProcessing, mode, transferReturnAction]);

  if (!isMounted) return null;

  const activeRecord = seasonRecords[selectedAgeForStats] ?? null;
  const shopHref = shopTargetSeason === null
    ? undefined
    : `/classic/${gameId}/shop/${slotIndex}?season=${shopTargetSeason}&return=${careerSubStep === "resolved" ? "advance" : "start"}`;
  const transferHref = `/classic/${gameId}/transfer/${slotIndex}?return=${careerSubStep === "transfer" ? "advance" : "start"}`;
  const wheelInteractionLocked = isSpinning || careerSpinning || isProcessing;

  async function openModule(href: string, shouldPersist: boolean) {
    if (wheelInteractionLocked) return;
    if (shouldPersist && !(await persistCurrentProgress())) return;
    router.push(href);
  }

  return (
    <div
      className={`football-dashboard football-wheel-shell${mode === "retired" ? " football-retired-shell" : ""}`}
      onClickCapture={(event) => {
        // A wheel spin is a single gameplay transaction. Ignore stray clicks
        // on the dashboard while its server result is being animated; this
        // prevents a tab/profile/navigation handler from interrupting the
        // wheel session or exposing the result before its completion callback.
        if (!wheelInteractionLocked) return;
        // Modal content is rendered through a React portal. Portal events
        // still bubble through this component tree even though the modal is
        // outside the dashboard DOM; never swallow its action buttons.
        if (event.target instanceof Element && event.target.closest(".football-modal-overlay, [role=\"dialog\"]")) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      style={{
        backgroundColor: "var(--cream)",
        backgroundImage: "none",
      }}
    >
      <WheelGameHeader
        backHref={backHref}
        gameName={gameName}
        position={position}
        slotIndex={slotIndex}
        mode={mode}
        seasonLabel={mode === "setup" ? undefined : getSeasonYearString(currentAge, playerDebutAge)}
        age={mode === "setup" ? undefined : currentAge}
        currentClubName={mode === "setup" ? undefined : currentClub?.name}
        overall={mode === "setup" ? undefined : currentOvr}
        shopHref={shopHref}
        isBusy={wheelInteractionLocked}
        onOpenTrophyCabinet={() => {
          if (!wheelInteractionLocked) setIsTrophyCabinetOpen(true);
        }}
      />

      {/* ── MODE 1: SETUP WHEELS ── */}
      {mode === "setup" && (
        <SetupStage
          slotIndex={slotIndex}
          activeStep={activeStep}
          isSpinning={isSpinning}
          wheelItems={wheelItems}
          targetIndex={targetIndex}
          handleSetupSpinComplete={handleSetupSpinComplete}
          tempValue={tempValue}
          handleSetupSpin={handleSetupSpin}
          handleStartCareer={handleStartCareer}
          isProcessing={isProcessing}
          startCareerError={startCareerError}
          draftData={draftData}
          position={position}
          STEP_LABELS={STEP_LABELS}
        />
      )}

      {/* ── MODE 2: CAREER PLAYING LOOP ── */}
      {mode === "career" && (
        <DraftDrumCareerStage
          mobileSection={mobileSection}
          setMobileSection={setMobileSection}
          rightTab={rightTab}
          setRightTab={setRightTab}
          wheelInteractionLocked={wheelInteractionLocked}
          careerSubStep={careerSubStep}
          isUnemployed={isUnemployed}
          currentAge={currentAge}
          currentOvr={currentOvr}
          currentClub={currentClub}
          currentContinentalCup={currentContinentalCup}
          currentStats={currentStats}
          position={position}
          playerName={playerName}
          playerNationality={playerNationality}
          playerDebutAge={playerDebutAge}
          playerCareerLength={playerCareerLength}
          seasonRecords={seasonRecords}
          selectedAgeForStats={selectedAgeForStats}
          setSelectedAgeForStats={setSelectedAgeForStats}
          clubStints={clubStints}
          peakOvrValue={peakOvrValue}
          yearSimResult={yearSimResult}
          yearEvolution={yearEvolution}
          evolvedStatsThisYear={evolvedStatsThisYear}
          careerWheelItems={careerWheelItems}
          careerTargetIndex={careerTargetIndex}
          careerSpinning={careerSpinning}
          isProcessing={isProcessing}
          seasonTicketResolved={seasonTicketResolved}
          standingResult={standingResult}
          domesticCupResult={domesticCupResult}
          continentalCupResult={continentalCupResult}
          nationalCallupResult={nationalCallupResult}
          nationalTournamentResult={nationalTournamentResult}
          hasBallonDorWinner={hasBallonDorWinner}
          selectorIndex={selectorIndex}
          tempSelectedStat={tempSelectedStat}
          contractYearsTotal={contractYearsTotal}
          contractYearsRemaining={contractYearsRemaining}
          currentWageAnnual={currentWageAnnual}
          marketValue={marketValue}
          onOpenTrophyCabinet={() => {
            if (!wheelInteractionLocked) setIsTrophyCabinetOpen(true);
          }}
          onOpenTransferModal={() => void openModule(transferHref, true)}
          onOpenShop={shopHref ? () => void openModule(shopHref, careerSubStep === "resolved") : undefined}
          onOpenModal={(type) => {
            if (!wheelInteractionLocked) setActiveModal(type);
          }}
          handleCareerSpinComplete={handleCareerSpinComplete}
          handleCareerSpin={handleCareerSpin}
          handleNextSeason={handleNextSeason}
        />
      )}

      {/* ── TROPHY CABINET FLOATING MODAL ── */}
      {isTrophyCabinetOpen && (
        <TrophyCabinetModal
          seasonRecords={seasonRecords}
          playerName={playerName}
          playerNationality={playerNationality}
          onClose={() => setIsTrophyCabinetOpen(false)}
        />
      )}

      {/* ── MODE 3: RETIRED ── */}
      {mode === "retired" && (
        <RetiredStage
          position={position}
          playerNationality={playerNationality}
          peakOvrValue={peakOvrValue}
          playerName={playerName}
          careerTotalStats={careerTotalStats}
          clubStints={clubStints}
          isSaving={isSaving}
          handleSavePlayer={handleSavePlayer}
        />
      )}

      {/* ── TRANSFER DECISION FLOATING MODAL ── */}
      {activeModal === "transfer" && (
        <PersistentTransferSection
          market={transferMarket || {
            hasWindow: true,
            marketValue: 3600,
            contract: {
              currentWageAnnual: 720,
              marketValue: 3600,
              yearsRemaining: 3,
              yearsTotal: 3,
              seasonsLeftInCareer: 15,
            },
            renewal: null,
            inbound: [],
            shortlist: [],
            isUnemployedMarket: isUnemployed,
            mandatoryBuyout: 4500,
            valuation: {
              positionWeightedRating: currentOvr,
              effectivePositionOvr: currentOvr,
            },
          }}
          willingToMove={willingToMove}
          setWillingToMove={handleSetWillingToMove}
          isProcessing={isProcessing}
          onAcceptOffer={async (offer, wageOption) => {
            const resolution = await handleAcceptMarketOffer(offer, wageOption);
            if (resolution === "accepted") setActiveModal(null);
            return resolution;
          }}
          onRejectAll={() => {
            void handleRejectTransferWindow().then(() => setActiveModal(null));
          }}
          onApproachShortlist={async (club, wageOption) => {
            const accepted = await handleApproachShortlist(club, wageOption);
            return accepted;
          }}
          onProactiveRenewal={async (wageOption) => {
            const accepted = await handleProactiveRenewal(wageOption);
            return accepted;
          }}
          onSearchClubs={handleSearchClubs}
          currentClubId={currentClub?.id ?? null}
          proactiveRenewalRejected={proactiveRenewalRejected}
          approachRejects={approachRejects}
          approachBanner={approachBanner}
          acceptedOffer={transferOffer}
          onClearAcceptedOffer={clearPendingTransferOffer}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* ── UNIFIED SEASON RECAP MODAL ── */}
      {(activeModal === "season_stats" || activeModal === "season_recap") && yearSimResult && activeRecord && (
        <SeasonRecapModal
          record={activeRecord}
          yearSimResult={yearSimResult}
          currentContinentalCup={currentContinentalCup}
          playerDebutAge={playerDebutAge}
          onClose={handleSeasonStatsModalClose}
        />
      )}

      {activeModal === "ballon_dor_nomination" && ballonDorResult?.phase === "nomination" && (
        <BallonDorNominationModal
          nominated={ballonDorResult.nominated}
          age={currentAge}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Individual competition result modal, opened automatically after league/cup wheels or from the profile. */}
      {activeModal && !["season_stats", "season_recap", "ballon_dor_nomination", "transfer", "shop"].includes(activeModal) && activeRecord && (
        <SeasonResultModal
          type={activeModal as "league" | "cup" | "continental" | "national"}
          record={activeRecord}
          currentContinentalCup={currentContinentalCup}
          playerDebutAge={playerDebutAge}
          onClose={handleCompetitionResultModalClose}
        />
      )}

      {isBallonDorTransitioning && (
        <Modal
          open
          title="Đang mở kết quả Ballon d’Or"
          onClose={() => undefined}
          closeOnBackdrop={false}
          size="sm"
          className="football-ballon-dor-transition-modal"
        >
          <ModalHeader eyebrow="Quả Bóng Vàng · Xếp hạng chung cuộc">
            Đang mở kết quả…
          </ModalHeader>
          <ModalBody>
            <div className="football-ballon-dor-transition__status" role="status" aria-live="polite" aria-busy="true">
              <span className="football-ballon-dor-transition__spinner" aria-hidden="true" />
              <strong>Kết quả đã được ghi nhận</strong>
            </div>
            <p className="football-ballon-dor-transition__note">Vui lòng chờ trang kết quả hiển thị.</p>
          </ModalBody>
        </Modal>
      )}

    </div>
  );
}
