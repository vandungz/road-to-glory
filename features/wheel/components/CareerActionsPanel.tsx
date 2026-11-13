"use client";

import { useTranslations } from "next-intl";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import type { CurrentClub } from "@/types/domain";
import { LoadingState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { ResultBanner } from "@/components/ui/ResultBanner";
import { SpinnerWheel } from "./SpinnerWheel";
import type { SpinnerItem } from "./SpinnerWheel";
import { getSeasonYearString } from "../lib/simulation-helpers";
import { useCompetitionNames } from "./useCompetitionNames";
import { useCompetitionResult } from "./useCompetitionResult";

interface CareerActionsPanelProps {
  careerSubStep: string;
  currentAge: number;
  playerDebutAge: number;
  playerCareerLength?: number;
  currentClub: CurrentClub | null;
  currentContinentalCup: string;
  seasonTicketResolved: boolean;
  careerSpinning: boolean;
  isProcessing: boolean;
  careerWheelItems: SpinnerItem[];
  careerTargetIndex: number;
  handleCareerSpinComplete: () => void;
  handleCareerSpin: () => void;
  yearSimResult: SimulatedSeasonResult | null;
  standingResult: number | null;
  domesticCupResult: string | null;
  continentalCupResult: string | null;
  hasBallonDorWinner: boolean;
  handleNextSeason: () => void;
  selectorIndex: number;
  yearEvolutionCount?: number | null;
  yearEvolutionDirection?: "increase" | "decrease" | "maintain" | null;
  tempSelectedStat?: string | null;
  isUnemployed: boolean;
  onOpenTransferModal?: () => void;
  onOpenShop?: () => void;
}

const stageNumbers: Record<string, number> = {
  standing: 1, domestic_cup: 2, continental_cup: 2,
  national_callup: 3, national_tournament: 3, ballon_dor_nomination: 3, ballon_dor_ranking: 3,
  season_stats: 4, dir_increase: 4, dir_decrease: 4, count: 4, selector: 4, magnitude: 4,
  transfer: 5, resolved: 5,
};

export function CareerActionsPanel({
  careerSubStep, currentAge, playerDebutAge, playerCareerLength, currentClub, currentContinentalCup,
  seasonTicketResolved,
  careerSpinning, isProcessing, careerWheelItems, careerTargetIndex, handleCareerSpinComplete,
  handleCareerSpin, yearSimResult, standingResult, domesticCupResult, hasBallonDorWinner,
  handleNextSeason, selectorIndex, yearEvolutionCount, yearEvolutionDirection, tempSelectedStat,
  isUnemployed, onOpenTransferModal, onOpenShop,
}: CareerActionsPanelProps) {
  const ui = useTranslations("ui");
  const t = useTranslations("career");
  const wheel = useTranslations("wheel");
  const resultLabel = useCompetitionResult();
  const names = useCompetitionNames();
  const seasonLabel = getSeasonYearString(currentAge, playerDebutAge);
  const totalNeed = yearEvolutionCount ?? 1;
  const retireAge = playerDebutAge + (playerCareerLength ?? 15);
  const isFinalSeason = currentAge >= retireAge;
  const isNomination = careerSubStep === "ballon_dor_nomination";
  const isAward = isNomination || careerSubStep === "ballon_dor_ranking";
  const isHighStakes = ["national_callup", "national_tournament", "ballon_dor_nomination", "ballon_dor_ranking"].includes(careerSubStep);
  const isWheelStep = ["dir_increase", "dir_decrease", "count", "selector", "magnitude", "standing", "domestic_cup", "continental_cup", "national_callup", "national_tournament", "ballon_dor_nomination", "ballon_dor_ranking"].includes(careerSubStep);
  const isShopStage = careerSubStep === "idle";
  const clubLabel = isUnemployed || !currentClub ? t("noClub") : currentClub.name;
  const domesticCupName = currentClub ? names.domesticCupName(currentClub.leagueName, currentClub.leagueId) : t("domestic_cup");
  const cup = names.continentalCupName(currentContinentalCup);
  const decrease = yearEvolutionDirection === "decrease";
  const step = stageNumbers[careerSubStep];
  const selection = { index: selectorIndex + 1, total: totalNeed };
  let stageTitle = t.has(careerSubStep) ? t(careerSubStep, { cup }) : t("progress");
  if (careerSubStep === "domestic_cup") stageTitle = domesticCupName;
  if (careerSubStep === "count" && decrease) stageTitle = t("decreaseCount");
  if (careerSubStep === "selector") stageTitle = t(decrease ? "selectDown" : "selectUp", selection);
  if (careerSubStep === "magnitude") {
    stageTitle = t(decrease ? "magnitudeDown" : "magnitudeUp", { ...selection, stat: tempSelectedStat?.toUpperCase() ?? ui("stats") });
  }
  const stageContext = step === 4 ? ui("stats") : step === 5 ? ui("transferWindow") : ui("competition");

  const displayWheel = careerWheelItems.map((item) => {
    const value = item.value;
    let label = item.label;
    switch (careerSubStep) {
      case "dir_increase": label = wheel(value === "yes" ? "increase" : "noIncrease"); break;
      case "dir_decrease": label = wheel(value === "yes" ? "decrease" : "noDecrease"); break;
      case "count": label = wheel("statCount", { count: Number(value) }); break;
      case "magnitude": label = wheel("pointCount", { count: Number(value) }); break;
      case "standing": label = resultLabel(value === 1 ? "Winner" : value === 2 ? "Runner-Up" : `Hạng ${value}`); break;
      case "domestic_cup":
      case "continental_cup":
      case "national_tournament": label = resultLabel(String(value)); break;
      case "national_callup": label = ui(value === "called_up" ? "calledUp" : "notCalledUp"); break;
      case "ballon_dor_nomination": label = wheel(value === "yes" ? "awardYes" : "awardNo"); break;
      case "ballon_dor_ranking": label = `#${value}`; break;
    }
    return { ...item, label };
  });

  return (
    <section className={`football-action-panel${isHighStakes ? " football-action-panel--high-stakes" : ""}`}>
      {!isShopStage && (
        <header key={stageTitle} className="football-action-panel__header" data-mount="detail">
          {!isAward && <span className="football-eyebrow">{step ? t("step", { step, label: stageContext }) : t("progress")}</span>}
          <h2>{stageTitle}</h2>
          {isNomination && <p className="football-action-panel__description">{t("nominationChance", { chance: displayWheel[0]?.weight ?? 0 })}</p>}
          {careerSubStep === "domestic_cup" && <p className="football-action-panel__description">{t("cupDescription", { cup: domesticCupName })}</p>}
          {careerSubStep === "continental_cup" && <p className="football-action-panel__description">{t("cupDescription", { cup })}</p>}
          {isFinalSeason && <span className="football-action-panel__notice">{ui("finalSeason")}</span>}
        </header>
      )}

      <div className="football-action-panel__body">
        {careerSubStep === "idle" && (
          <div className="football-career-shop-entry">
            <span className="football-eyebrow">{ui("season2")} {seasonLabel} {ui("age2")} {currentAge} · {clubLabel}</span>
            <h2>{ui("preseasonShop")}</h2>
            <p>{ui("buySeasonBoostsBeforeSpinning")}</p>
            <Button size="lg" onClick={onOpenShop} disabled={isProcessing || !onOpenShop} className="football-action-panel__primary">
              {ui("openShop")}
            </Button>
          </div>
        )}

        {careerSubStep === "continental_cup" && careerWheelItems.length === 0 && (
          !seasonTicketResolved || isProcessing
            ? <LoadingState className="football-wheel-stage__processing" label={ui("checkingQualification")} />
            : <p className="football-wheel-stage__processing">{ui("yourClubDidNotQualifyForAContinentalCupThisSeason")}</p>
        )}

        {isWheelStep && careerWheelItems.length > 0 && (
          <div className="football-wheel-stage" data-ballon-dor={isAward || undefined} aria-busy={isProcessing}>
            <SpinnerWheel isSpinning={careerSpinning} items={displayWheel} targetIndex={careerTargetIndex} onSpinComplete={handleCareerSpinComplete} idleLabel={isAward ? null : undefined} stakes={isHighStakes ? "high" : ["standing", "domestic_cup", "continental_cup"].includes(careerSubStep) ? "mid" : "low"} />
            <Button size="lg" onClick={handleCareerSpin} disabled={careerSpinning || isProcessing} className="football-action-panel__primary">
              {careerSpinning ? ui("spinning") : isProcessing ? ui("resultRecorded2") : isHighStakes ? ui("spinForAward") : ui("spin")}
            </Button>
          </div>
        )}

        {careerSubStep === "transfer" && !isFinalSeason && (
          <div className="football-career-contract-entry">
            <p>{ui("stayOrFindANewClubForNextSeason")}</p>
            <Button size="lg" onClick={onOpenTransferModal} disabled={isProcessing} className="football-action-panel__primary">{ui("viewContractOptions")}</Button>
          </div>
        )}
        {(careerSubStep === "resolved" || (careerSubStep === "transfer" && isFinalSeason)) && yearSimResult && (
          <div className="football-season-report">
            <div className="football-season-report__heading"><span className="football-eyebrow">{ui("seasonResults2")}</span><h3>{ui("season2")} {seasonLabel}</h3></div>
            <div className="football-season-report__stats">
              <DataRow label={ui("domesticLeague")} value={standingResult ? ui("position2", { v0: String(standingResult) }) : ui("noData")} />
              <DataRow label={ui("domesticCup")} value={resultLabel(domesticCupResult)} />
              <DataRow label={ui("player2")} value={ui("appsGoalsAssists", { v0: String(yearSimResult.apps), v1: String(yearSimResult.goals), v2: String(yearSimResult.assists) })} />
              <DataRow label={ui("matchRating")} value={<span className="football-data-row__value--accent">{yearSimResult.matchRating}</span>} />
            </div>
            {hasBallonDorWinner && <ResultBanner tone="honour">{ui("ballonDorWinner")}</ResultBanner>}
              <Button size="lg" onClick={!isFinalSeason && careerSubStep === "resolved" && onOpenShop ? onOpenShop : handleNextSeason} disabled={isProcessing} className="football-action-panel__primary">{isFinalSeason ? ui("retireAndReviewCareer") : ui("startNextSeason")}</Button>
          </div>
        )}
      </div>

    </section>
  );
}
