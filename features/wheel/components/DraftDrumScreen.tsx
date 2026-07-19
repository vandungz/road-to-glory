"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useDraftDrum } from "../hooks/useDraftDrum";
import { SetupStage } from "./SetupStage";
import { CareerActionsPanel } from "./CareerActionsPanel";
import { SeasonProfile } from "./SeasonProfile";
import { PaniniSticker } from "./PaniniSticker";
import { RetiredStage } from "./RetiredStage";
import { SeasonResultModal } from "./SeasonResultModal";
import { SeasonStatsModal } from "./SeasonStatsModal";

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
    handleNextSeason,
    handleSeasonStatsModalClose,
    handleSavePlayer,
    STEP_LABELS,
    selectorIndex,
  } = useDraftDrum(gameId, slotIndex, position, leagues, clubs, savedPlayerId, savedContinentalCup);

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
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 0 rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
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
                fontSize: "1.1rem",
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
        <main style={{ flex: 1, maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "24px 16px" }}>
          <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "24px", alignItems: "flex-start", justifyContent: "center" }}>

            {/* CỘT 1 (TRÁI): CAREER ACTIONS */}
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
              transferOffer={transferOffer}
              handleAcceptTransfer={handleAcceptTransfer}
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
            />

            {/* CỘT 2 (GIỮA): HỒ SƠ MÙA GIẢI */}
            <SeasonProfile
              seasonRecords={seasonRecords}
              currentAge={currentAge}
              playerDebutAge={playerDebutAge}
              selectedAgeForStats={selectedAgeForStats}
              setSelectedAgeForStats={setSelectedAgeForStats}
              position={position}
              onOpenModal={setActiveModal}
            />

            {/* CỘT 3 (PHẢI): STICKER PANINI */}
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

          </div>
        </main>
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

      {/* ── MODALS ── */}
      {activeModal && activeModal !== "season_stats" && activeRecord && (
        <SeasonResultModal
          type={activeModal as "league" | "cup" | "continental" | "national"}
          record={activeRecord}
          currentContinentalCup={currentContinentalCup}
          playerDebutAge={playerDebutAge}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === "season_stats" && yearSimResult && activeRecord && (
        <SeasonStatsModal
          record={activeRecord}
          yearSimResult={yearSimResult}
          currentContinentalCup={currentContinentalCup}
          onClose={handleSeasonStatsModalClose}
        />
      )}

    </div>
  );
}
