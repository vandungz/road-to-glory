"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDraftDrum } from "../hooks/useDraftDrum";
import { SeasonStrip } from "./SeasonStrip";
import { StoryRail } from "./StoryRail";
import { SetupStage } from "./SetupStage";
import { CareerActionsPanel } from "./CareerActionsPanel";
import { SeasonProfile } from "./SeasonProfile";
import { PaniniSticker } from "./PaniniSticker";
import { RetiredStage } from "./RetiredStage";
import { SeasonResultModal } from "./SeasonResultModal";
import { SeasonRecapModal } from "./SeasonRecapModal";
import { TrophyCabinetModal } from "./TrophyCabinetModal";
import { PersistentTransferSection } from "./PersistentTransferSection";
import { MobileCareerContext } from "./MobileCareerContext";
import { TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { formatEuroThousands } from "@/lib/transfer-economy";
import { WheelGameHeader } from "./WheelGameHeader";
import { SeasonSideSummary } from "./SeasonSideSummary";
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
    startCareerError,
    careerSpinning,
    careerWheelItems,
    careerTargetIndex,
    careerTempValue,
    yearEvolution,
    evolvedStatsThisYear,
    standingResult,
    domesticCupResult,
    continentalCupResult,
    hasBallonDorWinner,
    careerTotalStats,
    peakOvrValue,
    yearSimResult,
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

  const handledShopReturnRef = React.useRef(false);
  React.useEffect(() => {
    if (
      !shopReturnAction ||
      handledShopReturnRef.current ||
      !isMounted ||
      mode !== "career" ||
      isProcessing
    ) return;
    handledShopReturnRef.current = true;
    consumeReturnQuery("shopReturn");
    handleShopReturn(shopReturnAction);
  }, [handleShopReturn, isMounted, isProcessing, mode, shopReturnAction]);

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

  async function openModule(href: string, shouldPersist: boolean) {
    if (shouldPersist && !(await persistCurrentProgress())) return;
    router.push(href);
  }

  return (
    <div
      className="game-dashboard-wrapper rtg-wheel-shell"
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
        onOpenTrophyCabinet={() => setIsTrophyCabinetOpen(true)}
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
        <>
          <SeasonStrip careerSubStep={careerSubStep} isUnemployed={isUnemployed} />
          <main className="game-dashboard-main" style={{ maxWidth: "1440px", margin: "0 auto", padding: "12px 16px" }}>
            {/* MOBILE SECTION SWITCHER BAR (< 1024px) */}
            <TabsList className="game-mobile-switcher">
              <TabsTrigger value="action" active={mobileSection === "action"} onSelect={(value) => setMobileSection(value as "action" | "story" | "panini")}>Thao tác</TabsTrigger>
              <TabsTrigger value="story" active={mobileSection === "story"} onSelect={(value) => setMobileSection(value as "action" | "story" | "panini")}>Nhật ký</TabsTrigger>
              <TabsTrigger value="panini" active={mobileSection === "panini"} onSelect={(value) => setMobileSection(value as "action" | "story" | "panini")}>Thẻ</TabsTrigger>
            </TabsList>

            <MobileCareerContext
              currentAge={currentAge}
              currentOvr={currentOvr}
              currentClub={currentClub}
              isUnemployed={isUnemployed}
              careerSubStep={careerSubStep}
              isProcessing={isProcessing}
              seasonApps={yearSimResult?.apps}
              seasonRating={yearSimResult?.matchRating}
            />

            <div className="game-dashboard-grid">
              
              {/* CỘT 1 (TRÁI): STORY RAIL */}
              <div className={`game-column-left ${mobileSection === "story" ? "" : "max-lg:hidden"}`}>
                <StoryRail
                  clubStints={clubStints}
                  seasonRecords={seasonRecords}
                  currentAge={currentAge}
                  playerDebutAge={playerDebutAge}
                  currentOvr={currentOvr}
                  peakOvrValue={peakOvrValue}
                  onOpenTrophyCabinet={() => setIsTrophyCabinetOpen(true)}
                  className=""
                  style={{ width: "100%", height: "100%" }}
                />
              </div>

              {/* CỘT 2 (GIỮA): CAREER ACTIONS PANEL */}
              <div className={`game-column-center ${mobileSection === "action" ? "" : "max-lg:hidden"}`}>
                <CareerActionsPanel
                  careerSubStep={careerSubStep}
                  currentAge={currentAge}
                  playerDebutAge={playerDebutAge}
                  playerCareerLength={playerCareerLength}
                  currentClub={currentClub}
                  currentContinentalCup={currentContinentalCup}
                  careerSpinning={careerSpinning}
                  isProcessing={isProcessing}
                  careerWheelItems={careerWheelItems}
                  careerTargetIndex={careerTargetIndex}
                  handleCareerSpinComplete={handleCareerSpinComplete}
                  careerTempValue={careerTempValue}
                  handleCareerSpin={handleCareerSpin}
                  isUnemployed={isUnemployed}
                  yearSimResult={yearSimResult}
                  standingResult={standingResult}
                  domesticCupResult={domesticCupResult}
                  continentalCupResult={continentalCupResult}
                  hasBallonDorWinner={hasBallonDorWinner}
                  handleNextSeason={handleNextSeason}
                  selectorIndex={selectorIndex}
                  yearEvolutionCount={yearEvolution.count}
                  yearEvolutionDirection={yearEvolution.direction}
                  tempSelectedStat={tempSelectedStat}
                  onOpenTransferModal={() => void openModule(transferHref, true)}
                  onOpenShop={shopHref ? () => void openModule(shopHref, careerSubStep === "resolved") : undefined}
                />
              </div>

              {/* CỘT 3 (PHẢI): TAB SWITCH (PANINI STICKER & SEASON PROFILE) */}
              <div className={`game-column-right ${mobileSection === "panini" ? "" : "max-lg:hidden"}`}>
                
                {/* TAB SWITCH HEADER */}
                <TabsList className="rtg-tab-list">
                  <TabsTrigger value="panini" active={rightTab === "panini"} onSelect={(value) => setRightTab(value as "panini" | "profile" | "transfer")}>Thẻ cầu thủ</TabsTrigger>
                  <TabsTrigger value="profile" active={rightTab === "profile"} onSelect={(value) => setRightTab(value as "panini" | "profile" | "transfer")}>Mùa giải</TabsTrigger>
                  <TabsTrigger value="transfer" active={rightTab === "transfer"} onSelect={(value) => setRightTab(value as "panini" | "profile" | "transfer")}>Hợp đồng</TabsTrigger>
                </TabsList>

                <div className="rtg-dossier-body">
                  {rightTab === "panini" ? (
                    <>
                    <PaniniSticker
                      playerName={playerName}
                      position={position}
                      playerNationality={playerNationality}
                      currentOvr={currentOvr}
                      currentAge={currentAge}
                      playerDebutAge={playerDebutAge}
                      currentContinentalCup={currentContinentalCup}
                      standingResult={standingResult}
                      domesticCupResult={domesticCupResult}
                      continentalCupResult={continentalCupResult}
                      nationalCallupResult={nationalCallupResult}
                      nationalTournamentResult={nationalTournamentResult}
                      hasBallonDorWinner={hasBallonDorWinner}
                      currentStats={currentStats}
                      evolvedStatsThisYear={evolvedStatsThisYear}
                    />
                    <SeasonSideSummary
                      result={yearSimResult}
                      playerDebutAge={playerDebutAge}
                      playerCareerLength={playerCareerLength}
                    />
                    </>
                  ) : rightTab === "profile" ? (
                    <SeasonProfile
                      seasonRecords={seasonRecords}
                      currentAge={currentAge}
                      playerDebutAge={playerDebutAge}
                      selectedAgeForStats={selectedAgeForStats}
                      setSelectedAgeForStats={setSelectedAgeForStats}
                      position={position}
                      onOpenModal={setActiveModal}
                    />
                  ) : (
                    <section className="rtg-contract-summary">
                    <div className="rtg-contract-summary__heading">
                      <span className="rtg-eyebrow">Tổng quan chuyển nhượng</span>
                      <h2>Thông tin hợp đồng & thị trường</h2>
                    </div>
                    <div className="rtg-contract-summary__rows">
                      <DataRow label="CLB hiện tại" value={currentClub?.name || "Tự do (Thất nghiệp)"} />
                      <DataRow label="Thời hạn hợp đồng" value={isUnemployed ? "Tự do" : `${contractYearsRemaining}/${contractYearsTotal} năm còn lại`} />
                      <DataRow label="Lương hàng năm" value={`${formatEuroThousands(currentWageAnnual)} / năm`} />
                      <DataRow label="Giá trị thị trường" value={formatEuroThousands(marketValue)} className="rtg-data-row__value--accent" />
                    </div>
                    <p className="rtg-contract-summary__note">Mở cửa sổ để xem đề nghị chuyển nhượng, gia hạn hoặc tìm kiếm CLB mới.</p>
                    <Button fullWidth disabled={careerSubStep !== "transfer"} onClick={() => router.push(transferHref)}>
                      {careerSubStep === "transfer" ? "Mở cửa sổ chuyển nhượng & hợp đồng" : "Cửa sổ mở ở cuối mùa"}
                    </Button>
                    </section>
                  )}
                </div>
              </div>

            </div>
          </main>
        </>
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
                  onAcceptOffer={(offer) => {
            handleAcceptMarketOffer(offer);
            setActiveModal(null);
          }}
          onRejectAll={() => {
            handleRejectTransferWindow();
            setActiveModal(null);
          }}
          onApproachShortlist={async (club, wageOption) => {
            const accepted = await handleApproachShortlist(club, wageOption);
            if (accepted) {
              setActiveModal(null);
            }
            return accepted;
          }}
          onProactiveRenewal={async (wageOption) => {
            const accepted = await handleProactiveRenewal(wageOption);
            if (accepted) {
              setActiveModal(null);
            }
            return accepted;
          }}
          onSearchClubs={handleSearchClubs}
          currentClubId={currentClub?.id ?? null}
          proactiveRenewalRejected={proactiveRenewalRejected}
          approachRejects={approachRejects}
          approachBanner={approachBanner}
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
          hasBallonDorWinner={hasBallonDorWinner}
          onClose={handleSeasonStatsModalClose}
        />
      )}

      {/* LEGACY INDIVIDUAL COMPETITION MODALS (fallback if activeRecord modal opened manually from profile) */}
      {activeModal && !["season_stats", "season_recap", "transfer", "shop"].includes(activeModal) && activeRecord && (
        <SeasonResultModal
          type={activeModal as "league" | "cup" | "continental" | "national"}
          record={activeRecord}
          currentContinentalCup={currentContinentalCup}
          playerDebutAge={playerDebutAge}
          onClose={() => setActiveModal(null)}
        />
      )}

    </div>
  );
}
