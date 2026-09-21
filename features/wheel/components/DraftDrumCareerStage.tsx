"use client";

import type { ComponentProps } from "react";
import { SeasonStrip } from "./SeasonStrip";
import { StoryRail } from "./StoryRail";
import { CareerActionsPanel } from "./CareerActionsPanel";
import { SeasonProfile } from "./SeasonProfile";
import { PaniniSticker } from "./PaniniSticker";
import { SeasonSideSummary } from "./SeasonSideSummary";
import { MobileCareerContext } from "./MobileCareerContext";
import { TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { formatEuroThousands } from "@/lib/transfer-economy";
import type { ModalType } from "../hooks/useDraftDrum";
import type { CareerSubStep, ClubStint } from "@/types/domain";
import type { SeasonRecord } from "@/types/game";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";

type CareerWheelItems = ComponentProps<typeof CareerActionsPanel>["careerWheelItems"];
type CurrentClub = ComponentProps<typeof CareerActionsPanel>["currentClub"];
type EvolvedStats = ComponentProps<typeof PaniniSticker>["evolvedStatsThisYear"];
type CurrentStats = ComponentProps<typeof PaniniSticker>["currentStats"];

interface DraftDrumCareerStageProps {
  mobileSection: "action" | "story" | "panini";
  setMobileSection: (section: "action" | "story" | "panini") => void;
  rightTab: "panini" | "profile" | "transfer";
  setRightTab: (tab: "panini" | "profile" | "transfer") => void;
  wheelInteractionLocked: boolean;
  careerSubStep: CareerSubStep;
  isUnemployed: boolean;
  currentAge: number;
  currentOvr: number;
  currentClub: CurrentClub;
  currentContinentalCup: string;
  currentStats: CurrentStats;
  position: string;
  playerName: string;
  playerNationality: string;
  playerDebutAge: number;
  playerCareerLength: number;
  seasonRecords: Record<number, SeasonRecord>;
  selectedAgeForStats: number;
  setSelectedAgeForStats: (age: number) => void;
  clubStints: ClubStint[];
  peakOvrValue?: number;
  yearSimResult: SimulatedSeasonResult | null;
  yearEvolution: { count: number | null; direction: "increase" | "decrease" | "maintain" | null };
  evolvedStatsThisYear: EvolvedStats;
  careerWheelItems: CareerWheelItems;
  careerTargetIndex: number;
  careerSpinning: boolean;
  isProcessing: boolean;
  seasonTicketResolved: boolean;
  standingResult: number | null;
  domesticCupResult: string | null;
  continentalCupResult: string | null;
  nationalCallupResult: string | null;
  nationalTournamentResult: string | null;
  hasBallonDorWinner: boolean;
  selectorIndex: number;
  tempSelectedStat: string | null;
  contractYearsTotal: number;
  contractYearsRemaining: number;
  currentWageAnnual: number;
  marketValue: number;
  onOpenTrophyCabinet: () => void;
  onOpenTransferModal: () => void;
  onOpenShop?: () => void;
  onOpenModal: (type: ModalType) => void;
  handleCareerSpinComplete: () => void;
  handleCareerSpin: () => void;
  handleNextSeason: () => void;
}
 
export function DraftDrumCareerStage(props: DraftDrumCareerStageProps) {
  const {
    mobileSection, setMobileSection, rightTab, setRightTab, wheelInteractionLocked,
    careerSubStep, isUnemployed, currentAge, currentOvr, currentClub,
    currentContinentalCup, currentStats, position, playerName, playerNationality,
    playerDebutAge, playerCareerLength, seasonRecords, selectedAgeForStats,
    setSelectedAgeForStats, clubStints, peakOvrValue, yearSimResult, yearEvolution,
    evolvedStatsThisYear, careerWheelItems, careerTargetIndex, careerSpinning,
    isProcessing, seasonTicketResolved, standingResult, domesticCupResult,
    continentalCupResult, nationalCallupResult, nationalTournamentResult,
    hasBallonDorWinner, selectorIndex, tempSelectedStat, contractYearsTotal,
    contractYearsRemaining, currentWageAnnual, marketValue, onOpenTrophyCabinet,
    onOpenTransferModal, onOpenShop, onOpenModal, handleCareerSpinComplete,
    handleCareerSpin, handleNextSeason,
  } = props;

  return (
        <>
          <SeasonStrip
            careerSubStep={careerSubStep}
            isUnemployed={isUnemployed}
            hasBallonDorEligibility={yearSimResult?.ballonDor.eligible}
          />
          <main className="football-dashboard__main" style={{ maxWidth: "1440px", margin: "0 auto", padding: "12px 16px" }}>
            {/* MOBILE SECTION SWITCHER BAR (< 1024px) */}
            <TabsList className="football-dashboard__mobile-switcher">
              <TabsTrigger value="action" active={mobileSection === "action"} disabled={wheelInteractionLocked} onSelect={(value) => setMobileSection(value as "action" | "story" | "panini")}>Thao tác</TabsTrigger>
              <TabsTrigger value="story" active={mobileSection === "story"} disabled={wheelInteractionLocked} onSelect={(value) => setMobileSection(value as "action" | "story" | "panini")}>Nhật ký</TabsTrigger>
              <TabsTrigger value="panini" active={mobileSection === "panini"} disabled={wheelInteractionLocked} onSelect={(value) => setMobileSection(value as "action" | "story" | "panini")}>Thẻ</TabsTrigger>
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

            <div className="football-dashboard__grid">
              
              {/* CỘT 1 (TRÁI): STORY RAIL */}
              <div className={`football-dashboard__story ${mobileSection === "story" ? "" : "max-lg:hidden"}`}>
                <StoryRail
                  clubStints={clubStints}
                  seasonRecords={seasonRecords}
                  currentAge={currentAge}
                  playerDebutAge={playerDebutAge}
                  currentOvr={currentOvr}
                  peakOvrValue={peakOvrValue}
                  onOpenTrophyCabinet={onOpenTrophyCabinet}
                  className=""
                  style={{ width: "100%", height: "100%" }}
                />
              </div>

              {/* CỘT 2 (GIỮA): CAREER ACTIONS PANEL */}
              <div className={`football-dashboard__actions ${mobileSection === "action" ? "" : "max-lg:hidden"}`}>
                <CareerActionsPanel
                  careerSubStep={careerSubStep}
                  currentAge={currentAge}
                  playerDebutAge={playerDebutAge}
                  playerCareerLength={playerCareerLength}
                  currentClub={currentClub}
                  currentContinentalCup={currentContinentalCup}
                  seasonTicketResolved={seasonTicketResolved}
                  careerSpinning={careerSpinning}
                  isProcessing={isProcessing}
                  careerWheelItems={careerWheelItems}
                  careerTargetIndex={careerTargetIndex}
                  handleCareerSpinComplete={handleCareerSpinComplete}
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
                  onOpenTransferModal={onOpenTransferModal}
                  onOpenShop={onOpenShop}
                />
              </div>

              {/* CỘT 3 (PHẢI): TAB SWITCH (PANINI STICKER & SEASON PROFILE) */}
              <div className={`football-dashboard__dossier ${mobileSection === "panini" ? "" : "max-lg:hidden"}`}>
                
                {/* TAB SWITCH HEADER */}
                <TabsList className="football-tab-list">
                  <TabsTrigger value="panini" active={rightTab === "panini"} disabled={wheelInteractionLocked} onSelect={(value) => setRightTab(value as "panini" | "profile" | "transfer")}>Thẻ cầu thủ</TabsTrigger>
                  <TabsTrigger value="profile" active={rightTab === "profile"} disabled={wheelInteractionLocked} onSelect={(value) => setRightTab(value as "panini" | "profile" | "transfer")}>Mùa giải</TabsTrigger>
                  <TabsTrigger value="transfer" active={rightTab === "transfer"} disabled={wheelInteractionLocked} onSelect={(value) => setRightTab(value as "panini" | "profile" | "transfer")}>Hợp đồng</TabsTrigger>
                </TabsList>

                <div className="football-dossier-body">
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
                      onOpenModal={(type) => {
                        if (!wheelInteractionLocked) onOpenModal(type);
                      }}
                    />
                  ) : (
                    <section className="football-contract-summary">
                    <div className="football-contract-summary__heading">
                      <span className="football-eyebrow">Tổng quan chuyển nhượng</span>
                      <h2>Thông tin hợp đồng & thị trường</h2>
                    </div>
                    <div className="football-contract-summary__rows">
                      <DataRow label="CLB hiện tại" value={currentClub?.name || "Tự do (Thất nghiệp)"} />
                      <DataRow label="Thời hạn hợp đồng" value={isUnemployed ? "Tự do" : `${contractYearsRemaining}/${contractYearsTotal} năm còn lại`} />
                      <DataRow label="Lương hàng năm" value={`${formatEuroThousands(currentWageAnnual)} / năm`} />
                      <DataRow label="Giá trị thị trường" value={formatEuroThousands(marketValue)} className="football-data-row__value--accent" />
                    </div>
                    <p className="football-contract-summary__note">Mở cửa sổ để xem đề nghị chuyển nhượng, gia hạn hoặc tìm kiếm CLB mới.</p>
                    <Button fullWidth disabled={careerSubStep !== "transfer" || wheelInteractionLocked} onClick={onOpenTransferModal}>
                      {careerSubStep === "transfer" ? "Mở cửa sổ chuyển nhượng & hợp đồng" : "Cửa sổ mở ở cuối mùa"}
                    </Button>
                    </section>
                  )}
                </div>
              </div>

            </div>
          </main>
        </>
  );
}
