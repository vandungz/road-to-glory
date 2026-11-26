"use client";
import { ScrollArea } from "@/components/ui/ScrollArea";


import { PageGuide } from "@/features/onboarding/GuideProvider";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type ComponentProps } from "react";
import { StoryRail } from "./StoryRail";
import { CareerActionsPanel } from "./CareerActionsPanel";
import { SeasonProfile } from "./SeasonProfile";
import { PaniniSticker } from "./PaniniSticker";
import { SeasonSideSummary } from "./SeasonSideSummary";
import { MobileCareerContext } from "./MobileCareerContext";
import { TabsList, TabsTrigger } from "@/components/ui/Tabs";
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
  portraitId?: ComponentProps<typeof PaniniSticker>["portraitId"];
  portraitReaction?: ComponentProps<typeof PaniniSticker>["portraitReaction"];
  onPortraitReactionEnd?: () => void;
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
  const ui = useTranslations("ui");
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

  const dossier = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (props.portraitReaction && rightTab === "panini" && dossier.current) dossier.current.scrollTop = 0;
  }, [props.portraitReaction, rightTab]);

  return (
        <>
          <PageGuide id="career" paused={wheelInteractionLocked || careerSpinning || isProcessing} />
          <main className="football-dashboard__main" data-mount="page" style={{ maxWidth: "1440px", margin: "0 auto", padding: "12px 16px" }}>
            {/* MOBILE SECTION SWITCHER BAR (< 1024px) */}
            <TabsList className="football-dashboard__mobile-switcher">
              <TabsTrigger value="action" active={mobileSection === "action"} disabled={wheelInteractionLocked} onSelect={(value) => setMobileSection(value as "action" | "story" | "panini")}>{ui("actions")}</TabsTrigger>
              <TabsTrigger value="story" active={mobileSection === "story"} disabled={wheelInteractionLocked} onSelect={(value) => setMobileSection(value as "action" | "story" | "panini")}>{ui("journal")}</TabsTrigger>
              <TabsTrigger value="panini" active={mobileSection === "panini"} disabled={wheelInteractionLocked} onSelect={(value) => setMobileSection(value as "action" | "story" | "panini")}>{ui("card")}</TabsTrigger>
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
              <div data-guide="career-timeline" className={`football-dashboard__story ${mobileSection === "story" ? "" : "max-lg:hidden"}`}>
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
              <ScrollArea data-guide="career-wheel" className={`football-dashboard__actions ${mobileSection === "action" ? "" : "max-lg:hidden"}`}>
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
              </ScrollArea>

              {/* CỘT 3 (PHẢI): TAB SWITCH (PANINI STICKER & SEASON PROFILE) */}
              <div className={`football-dashboard__dossier ${mobileSection === "panini" ? "" : "max-lg:hidden"}`}>
                
                {/* TAB SWITCH HEADER */}
                <TabsList className="football-tab-list" data-guide="career-tabs">
                  <TabsTrigger value="panini" active={rightTab === "panini"} disabled={wheelInteractionLocked} onSelect={(value) => setRightTab(value as "panini" | "profile" | "transfer")}>{ui("playerCard")}</TabsTrigger>
                  <TabsTrigger value="profile" active={rightTab === "profile"} disabled={wheelInteractionLocked} onSelect={(value) => setRightTab(value as "panini" | "profile" | "transfer")}>{ui("season2")}</TabsTrigger>
                  <TabsTrigger value="transfer" active={rightTab === "transfer"} disabled={wheelInteractionLocked} onSelect={(value) => setRightTab(value as "panini" | "profile" | "transfer")}>{ui("contract")}</TabsTrigger>
                </TabsList>

                <ScrollArea className="football-dossier-body" ref={dossier}>
                    <div className="football-panini-panel" data-mount="panel" hidden={rightTab !== "panini"}>
                    <PaniniSticker
                      portraitId={props.portraitId}
                      portraitReaction={props.portraitReaction}
                      onPortraitReactionEnd={props.onPortraitReactionEnd}
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
                    </div>
                  {rightTab === "panini" ? null : rightTab === "profile" ? (
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
                    <section className="football-contract-summary" data-mount="detail">
                    <div className="football-contract-summary__heading">
                      <span className="football-eyebrow">{ui("transferOverview")}</span>
                      <h2>{ui("contractAndMarketValue")}</h2>
                    </div>
                    <div className="football-contract-summary__rows">
                      <DataRow label={ui("currentClub3")} value={currentClub?.name || ui("freeAgent3")} />
                      <DataRow label={ui("contractTerm")} value={isUnemployed ? ui("freeAgent") : ui("yearsLeft", { v0: String(contractYearsRemaining), v1: String(contractYearsTotal) })} />
                      <DataRow label={ui("annualWage")} value={ui("yr2", { v0: String(formatEuroThousands(currentWageAnnual)) })} />
                      <DataRow label={ui("marketValue")} value={formatEuroThousands(marketValue)} className="football-data-row__value--accent" />
                    </div>
                    </section>
                  )}
                </ScrollArea>
              </div>

            </div>
          </main>
        </>
  );
}
