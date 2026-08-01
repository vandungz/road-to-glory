"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useDraftDrum } from "../hooks/useDraftDrum";
import { SeasonStrip } from "./SeasonStrip";
import { StoryRail } from "./StoryRail";
import { SetupStage } from "./SetupStage";
import { CareerActionsPanel } from "./CareerActionsPanel";
import { SeasonProfile } from "./SeasonProfile";
import { PaniniSticker } from "./PaniniSticker";
import { RetiredStage } from "./RetiredStage";
import { SeasonResultModal } from "./SeasonResultModal";
import { SeasonStatsModal } from "./SeasonStatsModal";
import { SeasonRecapModal } from "./SeasonRecapModal";
import { TransferDecisionModal } from "./TransferDecisionModal";
import { TrophyCabinetModal } from "./TrophyCabinetModal";

interface Props {
  gameId: string;
  slotIndex: number;
  position: string;
  leagues: { id: string; name: string }[];
  clubs: { id: string; name: string; leagueId: string; prestige: number; continentalType: string }[];
  savedPlayerId?: string;
  savedContinentalCup?: string;
}

export function DraftDrumScreen({ gameId, slotIndex, position, leagues, clubs, savedPlayerId, savedContinentalCup }: Props) {
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
    transferOffer,
    transferMarket,
    willingToMove,
    showShortlist,
    approachRejects,
    approachBanner,
    isUnemployed,
    clubStints,
    nationalCallupResult,
    nationalTournamentResult,
    tempSelectedStat,
    handleSetupSpin,
    handleSetupSpinComplete,
    handleStartCareer,
    handleStartSeason,
    handleCareerSpin,
    handleCareerSpinComplete,
    handleAcceptTransfer,
    handleAcceptMarketOffer,
    handleRejectTransferWindow,
    handleApproachShortlist,
    handleSetWillingToMove,
    setShowShortlist,
    handleNextSeason,
    handleSeasonStatsModalClose,
    handleSavePlayer,
    STEP_LABELS,
    selectorIndex,
  } = useDraftDrum(gameId, slotIndex, position, leagues, clubs, savedPlayerId, savedContinentalCup);

  const [isTrophyCabinetOpen, setIsTrophyCabinetOpen] = useState<boolean>(false);
  const [rightTab, setRightTab] = useState<"panini" | "profile">("panini");

  if (!isMounted) return null;

  const activeRecord = seasonRecords[selectedAgeForStats] ?? null;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--cream)",
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.018) 28px, rgba(0,0,0,0.018) 29px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── HEADER NAVIGATION BAR ── */}
      <header
        style={{
          borderBottom: "2px solid var(--charcoal)",
          backgroundColor: "var(--white)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          boxShadow: "0 2px 0 rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <Link
            href={`/${gameId}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "var(--font-headline)",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "var(--ink-light)",
              textDecoration: "none",
              border: "1.5px solid var(--charcoal)",
              padding: "6px 12px",
              borderRadius: "3px",
              backgroundColor: "var(--white)",
              boxShadow: "1.5px 1.5px 0 var(--charcoal)",
              transition: "transform 0.1s ease",
              minHeight: "36px",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "translate(1.5px, 1.5px)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "translate(0, 0)")}
          >
            <ArrowLeft size={16} /> TRỞ VỀ SQUAD
          </Link>
          <div>
            <h1
              style={{
                fontFamily: "var(--font-headline)",
                fontSize: "1.05rem",
                fontWeight: 900,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                color: "var(--charcoal)",
                margin: 0,
              }}
            >
              VÒNG QUAY SỰ NGHIỆP (ROAD TO GLORY)
            </h1>
            <div
              style={{
                fontFamily: "var(--font-stamp)",
                fontSize: "0.5rem",
                color: "var(--ink-gray)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginTop: "2px",
              }}
            >
              {mode === "setup" ? "1. GIAI ĐOẠN SETUP" : mode === "career" ? "2. GIAI ĐOẠN THI ĐẤU" : "3. GIẢI NGHỆ"}
            </div>
          </div>
        </div>
      </header>

      {/* ── MODE 1: SETUP WHEELS ── */}
      {mode === "setup" && (
        <SetupStage
          activeStep={activeStep}
          isSpinning={isSpinning}
          wheelItems={wheelItems}
          targetIndex={targetIndex}
          handleSetupSpinComplete={handleSetupSpinComplete}
          tempValue={tempValue}
          handleSetupSpin={handleSetupSpin}
          handleStartCareer={handleStartCareer}
          isProcessing={isProcessing}
          draftData={draftData}
          position={position}
          STEP_LABELS={STEP_LABELS}
        />
      )}

      {/* ── MODE 2: CAREER PLAYING LOOP ── */}
      {mode === "career" && (
        <>
          <SeasonStrip careerSubStep={careerSubStep} isUnemployed={isUnemployed} />
          <main style={{ flex: 1, maxWidth: "1440px", width: "100%", margin: "0 auto", padding: "12px 16px" }}>
            <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "16px", alignItems: "stretch", justifyContent: "center", height: "100%" }}>
              
              {/* CỘT 1 (TRÁI): STORY RAIL (READ-ONLY TIMELINE) */}
              <StoryRail
                clubStints={clubStints}
                seasonRecords={seasonRecords}
                currentAge={currentAge}
                playerDebutAge={playerDebutAge}
                currentOvr={currentOvr}
                peakOvrValue={peakOvrValue}
                onOpenTrophyCabinet={() => setIsTrophyCabinetOpen(true)}
              />

              {/* CỘT 2 (GIỮA): WHEEL SECTION ONLY */}
              <CareerActionsPanel
                careerSubStep={careerSubStep}
                currentAge={currentAge}
                playerDebutAge={playerDebutAge}
                currentClub={currentClub}
                currentContinentalCup={currentContinentalCup}
                careerSpinning={careerSpinning}
                isProcessing={isProcessing}
                careerWheelItems={careerWheelItems}
                careerTargetIndex={careerTargetIndex}
                handleCareerSpinComplete={handleCareerSpinComplete}
                careerTempValue={careerTempValue}
                handleCareerSpin={handleCareerSpin}
                handleStartSeason={handleStartSeason}
                transferMarket={transferMarket}
                willingToMove={willingToMove}
                setWillingToMove={handleSetWillingToMove}
                showShortlist={showShortlist}
                setShowShortlist={setShowShortlist}
                handleAcceptMarketOffer={handleAcceptMarketOffer}
                handleRejectTransferWindow={handleRejectTransferWindow}
                handleApproachShortlist={handleApproachShortlist}
                approachRejects={approachRejects}
                approachBanner={approachBanner}
                isUnemployed={isUnemployed}
                yearSimResult={yearSimResult}
                standingResult={standingResult}
                domesticCupResult={domesticCupResult}
                continentalCupResult={continentalCupResult}
                hasBallonDorWinner={hasBallonDorWinner}
                handleNextSeason={handleNextSeason}
                position={position}
                selectorIndex={selectorIndex}
                yearEvolutionCount={yearEvolution.count}
                tempSelectedStat={tempSelectedStat}
                onOpenTransferModal={() => setActiveModal("transfer")}
              />

              {/* CỘT 3 (PHẢI): TAB SWITCH (PANINI STICKER & SEASON PROFILE) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: "0 0 330px", maxWidth: "340px", width: "100%", height: "100%", maxHeight: "100%" }}>
                
                {/* TAB SWITCH HEADER */}
                <div style={{ display: "flex", gap: "6px", backgroundColor: "var(--cream-dark)", padding: "4px", borderRadius: "4px", border: "1.5px solid var(--charcoal)", boxShadow: "2px 2px 0 var(--charcoal)" }}>
                  <button
                    type="button"
                    onClick={() => setRightTab("panini")}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-headline)",
                      fontWeight: 700,
                      backgroundColor: rightTab === "panini" ? "var(--white)" : "transparent",
                      color: rightTab === "panini" ? "var(--coral)" : "var(--charcoal)",
                      border: rightTab === "panini" ? "1.5px solid var(--charcoal)" : "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                      boxShadow: rightTab === "panini" ? "1.5px 1.5px 0 var(--charcoal)" : "none",
                    }}
                  >
                    🎴 THẺ PANINI
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightTab("profile")}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-headline)",
                      fontWeight: 700,
                      backgroundColor: rightTab === "profile" ? "var(--white)" : "transparent",
                      color: rightTab === "profile" ? "var(--coral)" : "var(--charcoal)",
                      border: rightTab === "profile" ? "1.5px solid var(--charcoal)" : "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                      boxShadow: rightTab === "profile" ? "1.5px 1.5px 0 var(--charcoal)" : "none",
                    }}
                  >
                    📊 HỒ SƠ MÙA
                  </button>
                </div>

                {rightTab === "panini" ? (
                  <PaniniSticker
                    playerName={playerName}
                    position={position}
                    playerNationality={playerNationality}
                    currentOvr={currentOvr}
                    currentAge={currentAge}
                    playerDebutAge={playerDebutAge}
                    playerCareerLength={playerCareerLength}
                    currentContinentalCup={currentContinentalCup}
                    standingResult={standingResult}
                    domesticCupResult={domesticCupResult}
                    continentalCupResult={continentalCupResult}
                    nationalCallupResult={nationalCallupResult}
                    nationalTournamentResult={nationalTournamentResult}
                    hasBallonDorWinner={hasBallonDorWinner}
                    currentStats={currentStats}
                    evolvedStatsThisYear={evolvedStatsThisYear}
                    currentClubName={currentClub?.name}
                    cleanSheets={yearSimResult?.cleanSheets}
                  />
                ) : (
                  <SeasonProfile
                    seasonRecords={seasonRecords}
                    currentAge={currentAge}
                    playerDebutAge={playerDebutAge}
                    selectedAgeForStats={selectedAgeForStats}
                    setSelectedAgeForStats={setSelectedAgeForStats}
                    position={position}
                    onOpenModal={setActiveModal}
                  />
                )}
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
      {(activeModal === "transfer" || (careerSubStep === "transfer" && activeModal !== null)) && transferMarket && (
        <TransferDecisionModal
          market={transferMarket}
          willingToMove={willingToMove}
          setWillingToMove={handleSetWillingToMove}
          isProcessing={isProcessing}
          onAcceptOffer={handleAcceptMarketOffer}
          onRejectAll={handleRejectTransferWindow}
          onApproachShortlist={handleApproachShortlist}
          showShortlist={showShortlist}
          setShowShortlist={setShowShortlist}
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
          onClose={handleSeasonStatsModalClose}
        />
      )}

      {/* LEGACY INDIVIDUAL COMPETITION MODALS (fallback if activeRecord modal opened manually from profile) */}
      {activeModal && !["season_stats", "season_recap", "transfer"].includes(activeModal) && activeRecord && (
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
