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
import { PersistentTransferSection } from "./PersistentTransferSection";

interface DraftDrumScreenProps {
  gameId: string;
  slotIndex: number;
  position: string;
  leagues: { id: string; name: string }[];
  clubs: { id: string; name: string; leagueId: string; prestige: number; continentalType: string }[];
  savedPlayerId?: string;
  savedContinentalCup?: string;
  initialMode?: "setup" | "career" | "retired";
}

export function DraftDrumScreen({ 
  gameId, 
  slotIndex, 
  position, 
  leagues, 
  clubs, 
  savedPlayerId, 
  savedContinentalCup, 
  initialMode = "setup" 
}: DraftDrumScreenProps) {
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
    handleProactiveRenewal,
    handleSearchClubs,
    handleSetWillingToMove,
    setShowShortlist,
    handleNextSeason,
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

  if (!isMounted) return null;

  const activeRecord = seasonRecords[selectedAgeForStats] ?? null;

  return (
    <div
      className="game-dashboard-wrapper"
      style={{
        backgroundColor: "var(--cream)",
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.018) 28px, rgba(0,0,0,0.018) 29px)",
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
          <main className="game-dashboard-main" style={{ maxWidth: "1440px", margin: "0 auto", padding: "12px 16px" }}>
            {/* MOBILE SECTION SWITCHER BAR (< 1024px) */}
            <div className="game-mobile-switcher" style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={() => setMobileSection("action")}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-headline)",
                  fontWeight: 700,
                  backgroundColor: mobileSection === "action" ? "var(--coral)" : "var(--white)",
                  color: mobileSection === "action" ? "var(--white)" : "var(--charcoal)",
                  border: "1.5px solid var(--charcoal)",
                  borderRadius: "3px",
                  boxShadow: "1.5px 1.5px 0 var(--charcoal)",
                  cursor: "pointer",
                }}
              >
                🎮 THAO TÁC
              </button>
              <button
                type="button"
                onClick={() => setMobileSection("story")}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-headline)",
                  fontWeight: 700,
                  backgroundColor: mobileSection === "story" ? "var(--coral)" : "var(--white)",
                  color: mobileSection === "story" ? "var(--white)" : "var(--charcoal)",
                  border: "1.5px solid var(--charcoal)",
                  borderRadius: "3px",
                  boxShadow: "1.5px 1.5px 0 var(--charcoal)",
                  cursor: "pointer",
                }}
              >
                📜 NHẬT KÝ
              </button>
              <button
                type="button"
                onClick={() => setMobileSection("panini")}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-headline)",
                  fontWeight: 700,
                  backgroundColor: mobileSection === "panini" ? "var(--coral)" : "var(--white)",
                  color: mobileSection === "panini" ? "var(--white)" : "var(--charcoal)",
                  border: "1.5px solid var(--charcoal)",
                  borderRadius: "3px",
                  boxShadow: "1.5px 1.5px 0 var(--charcoal)",
                  cursor: "pointer",
                }}
              >
                🎴 THẺ PANINI
              </button>
            </div>

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
                  yearEvolutionDirection={yearEvolution.direction}
                  tempSelectedStat={tempSelectedStat}
                  onOpenTransferModal={() => setActiveModal("transfer")}
                />
              </div>

              {/* CỘT 3 (PHẢI): TAB SWITCH (PANINI STICKER & SEASON PROFILE) */}
              <div className={`game-column-right ${mobileSection === "panini" ? "" : "max-lg:hidden"}`}>
                
                {/* TAB SWITCH HEADER */}
                <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--cream-dark)", padding: "4px", borderRadius: "4px", border: "1.5px solid var(--charcoal)", boxShadow: "2px 2px 0 var(--charcoal)" }}>
                  <button
                    type="button"
                    onClick={() => setRightTab("panini")}
                    style={{
                      flex: 1,
                      padding: "6px 4px",
                      fontSize: "0.7rem",
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
                      padding: "6px 4px",
                      fontSize: "0.7rem",
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
                    📊 HỒ SƠ
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightTab("transfer")}
                    style={{
                      flex: 1,
                      padding: "6px 4px",
                      fontSize: "0.7rem",
                      fontFamily: "var(--font-headline)",
                      fontWeight: 700,
                      backgroundColor: rightTab === "transfer" ? "#2d5a3d" : "transparent",
                      color: rightTab === "transfer" ? "#ffffff" : "var(--charcoal)",
                      border: rightTab === "transfer" ? "1.5px solid var(--charcoal)" : "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                      boxShadow: rightTab === "transfer" ? "1.5px 1.5px 0 var(--charcoal)" : "none",
                    }}
                  >
                    💼 CHUYỂN NHƯỢNG
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
                  <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", boxShadow: "3px 3px 0 var(--charcoal)", padding: "16px", display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
                      <div style={{ borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "8px" }}>
                        <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase", letterSpacing: "0.08em" }}>TỔNG QUAN CHUYỂN NHƯỢNG</span>
                        <h4 style={{ fontFamily: "var(--font-headline)", fontSize: "1rem", fontWeight: 900, margin: 0, color: "var(--charcoal)" }}>
                          THÔNG TIN HỢP ĐỒNG & THỊ TRƯỜNG
                        </h4>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "var(--cream)", border: "1.5px solid var(--charcoal)", borderRadius: "4px", padding: "12px", boxShadow: "2px 2px 0 var(--charcoal)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                          <span style={{ fontFamily: "var(--font-stamp)", color: "var(--ink-gray)" }}>CLB HIỆN TẠI</span>
                          <strong style={{ fontFamily: "var(--font-headline)" }}>{currentClub?.name || "Tự do (Thất nghiệp)"}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                          <span style={{ fontFamily: "var(--font-stamp)", color: "var(--ink-gray)" }}>THỜI HẠN HỢP ĐỒNG</span>
                          <strong style={{ fontFamily: "var(--font-headline)", color: "#10B981" }}>3/3 Năm còn lại</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                          <span style={{ fontFamily: "var(--font-stamp)", color: "var(--ink-gray)" }}>LƯƠNG HÀNG NĂM</span>
                          <strong style={{ fontFamily: "var(--font-headline)" }}>€720k / năm</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                          <span style={{ fontFamily: "var(--font-stamp)", color: "var(--ink-gray)" }}>GIÁ TRỊ THỊ TRƯỜNG</span>
                          <strong style={{ fontFamily: "var(--font-headline)", color: "var(--coral)" }}>€3.6M</strong>
                        </div>
                      </div>

                      <p style={{ fontSize: "0.78rem", color: "var(--ink-gray)", margin: "4px 0 0 0", textAlign: "center", lineHeight: 1.4 }}>
                        Bấm nút bên dưới để mở toàn bộ cửa sổ đàm phán hợp đồng, xem lời đề nghị chuyển nhượng hoặc tìm kiếm CLB mới.
                      </p>

                      <button
                        type="button"
                        onClick={() => setActiveModal("transfer")}
                        className="btn-primary"
                        style={{
                          width: "100%",
                          padding: "14px",
                          backgroundColor: "#2d5a3d",
                          color: "#ffffff",
                          fontSize: "0.92rem",
                          marginTop: "auto",
                        }}
                      >
                        💼 MỞ CỬA SỔ CHUYỂN NHƯỢNG & HỢP ĐỒNG →
                      </button>
                    </div>
                  </div>
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
