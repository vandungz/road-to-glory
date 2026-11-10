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
import { Toast } from "@/components/ui/Toast";
import { ClassicProfileSetup, type ClassicProfile } from "./ClassicProfileSetup";
import { useWheelUiStore } from "../stores/useWheelUiStore";
import { getPortraitCue, getStatsPortraitCue, getTransferPortraitCue } from "../lib/portrait-reactions";
import { usePaniniReaction } from "../hooks/usePaniniReaction";
import { resolveSavedPortraitId } from "@/features/player/lib/player-portraits";

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
  savedPortraitId?: string | null;
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
  position: slotPosition,
  leagues, 
  clubs, 
  savedPlayerId, 
  savedPortraitId,
  savedContinentalCup, 
  initialMode = "setup",
  backHref = `/${gameId}`,
  gameName,
  shopReturnAction,
  shopReturnToken,
  transferReturnAction,
}: DraftDrumScreenProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<ClassicProfile | null | undefined>(savedPlayerId || initialMode !== "setup" ? null : undefined);
  const [portraitId, setPortraitId] = useState<string | null>(
    savedPlayerId ? resolveSavedPortraitId(savedPortraitId, savedPlayerId) : null,
  );
  const position = profile?.position ?? slotPosition;
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
    approachRejects,
    approachBanner,
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
    retrySeasonStats,
    handleAcceptMarketOffer,
    clearPendingTransferOffer,
    handleRejectTransferWindow,
    handleApproachShortlist,
    handleSearchClubs,
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
  const portrait = usePaniniReaction(setRightTab, Boolean(activeModal || isTrophyCabinetOpen), isProcessing,
    isMounted && mode === "career" ? savedPlayerId : undefined);
  const [mobileSection, setMobileSection] = useState<"action" | "story" | "panini">("action");

  React.useEffect(() => {
    if (careerSubStep === "transfer" && transferMarket && !portrait.pending) {
      setRightTab("transfer");
    }
  }, [careerSubStep, transferMarket, portrait.pending]);

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
      className={`football-dashboard football-wheel-shell${mode === "retired" ? " football-retired-shell" : mode === "career" ? " football-career-shell" : ""}`}
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
      {mode === "setup" && profile === undefined && <ClassicProfileSetup slotPosition={slotPosition} onRandom={() => setProfile(null)}
        onContinue={(nextProfile) => {
          const draft = useWheelUiStore.getState();
          draft.resolveStep(0, nextProfile.nationality, nextProfile.position);
          draft.setStep(1);
          setProfile(nextProfile);
        }} />}
      {mode === "setup" && profile !== undefined && (
        <SetupStage
          profile={profile ?? undefined}
          slotIndex={slotIndex}
          activeStep={activeStep}
          isSpinning={isSpinning}
          wheelItems={wheelItems}
          targetIndex={targetIndex}
          handleSetupSpinComplete={handleSetupSpinComplete}
          tempValue={tempValue}
          handleSetupSpin={handleSetupSpin}
          handleStartCareer={async () => {
            const saved = await handleStartCareer(profile ?? undefined);
            if (saved !== undefined) setPortraitId(saved);
          }}
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
          portraitId={portraitId}
          portraitReaction={portrait.reaction}
          onPortraitReactionEnd={portrait.clear}
          mobileSection={mobileSection}
          setMobileSection={setMobileSection}
          rightTab={rightTab}
          setRightTab={(tab) => { if (tab !== "panini" && portrait.reaction) portrait.clear(); setRightTab(tab); }}
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
          handleCareerSpinComplete={() => {
            const result = handleCareerSpinComplete((delta) => {
              if (portraitId) portrait.queue(getStatsPortraitCue(delta, `${currentAge}:stats`));
            });
            if (!result || !portraitId) return;
            const leagueSize = clubs.filter((club) => club.leagueId === currentClub?.leagueId).length || 10;
            portrait.queue(getPortraitCue(result.step, result.value, `${currentAge}:${result.step}`, leagueSize));
          }}
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
          portraitId={portraitId}
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

      {mode === "career" && careerSubStep === "season_stats" && !yearSimResult && approachBanner && (
        <Toast
          title="Chưa thể chốt mùa giải"
          actionLabel="Thử lại"
          onAction={retrySeasonStats}
          actionBusy={isProcessing}
        >
          Thống kê mùa giải chưa được lưu. Bạn có thể thử lại ngay.
        </Toast>
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
          isProcessing={isProcessing}
          onAcceptOffer={async (offer, wageOption) => {
            const result = await handleAcceptMarketOffer(offer, wageOption);
            if (result.resolution === "accepted") {
              portrait.queue(getTransferPortraitCue(currentClub, { id: offer.clubId, prestige: offer.prestige }, `${currentAge}:transfer`));
              setActiveModal(null);
            }
            return result;
          }}
          onRejectAll={() => {
            void handleRejectTransferWindow().then(() => setActiveModal(null));
          }}
          onApproachShortlist={async (club, wageOption) => {
            const accepted = await handleApproachShortlist(club, wageOption);
            return accepted;
          }}
          onSearchClubs={handleSearchClubs}
          currentClubId={currentClub?.id ?? null}
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
          onClose={() => { portrait.release("recap"); handleSeasonStatsModalClose(); }}
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
          onClose={() => { portrait.release(activeModal); handleCompetitionResultModalClose(); }}
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
