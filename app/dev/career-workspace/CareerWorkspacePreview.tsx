"use client";

import { useRef, useState } from "react";
import { DraftDrumCareerStage } from "@/features/wheel/components/DraftDrumCareerStage";
import { WheelGameHeader } from "@/features/wheel/components/WheelGameHeader";
import { SeasonResultModal } from "@/features/wheel/components/SeasonResultModal";
import { SeasonRecapModal } from "@/features/wheel/components/SeasonRecapModal";
import { getPortraitCue, getStatsPortraitCue } from "@/features/wheel/lib/portrait-reactions";
import { usePaniniReaction } from "@/features/wheel/hooks/usePaniniReaction";
import { record, result } from "../design-preview/RecapPreview";
import type { SeasonRecord } from "@/types/game";

const club = { id: "brighton", name: "Brighton & Hove Albion", leagueId: "ENG1", leagueName: "Premier League", prestige: 4, continentalType: "none" };
const season: SeasonRecord = {
  ...record, age: 35, clubId: club.id, clubName: club.name, leagueId: club.leagueId, leagueName: club.leagueName,
  leagueTable: Array.from({ length: 20 }, (_, index) => ({ clubId: `preview-${index}`, name: index === 1 ? club.name : `CLB thử nghiệm ${index + 1}`, played: 38, won: 20, drawn: 10, lost: 8, points: 90 - index * 3 })),
  domesticCupJourney: ["Vòng 1/16: thắng 2–0", "Vòng 1/8: thắng 1–0", "Tứ kết: thắng 3–1", "Bán kết: thua 0–1"],
};

export function CareerWorkspacePreview({ cup, manyClubs, transfer = false, showPortrait = false, reactionStep }: { cup: boolean; manyClubs: boolean; transfer?: boolean; showPortrait?: boolean; reactionStep?: string }) {
  const [rightTab, setRightTab] = useState<"panini" | "profile" | "transfer">("panini");
  const [selectedAge, setSelectedAge] = useState(35);
  const [modal, setModal] = useState<"league" | "cup" | "recap" | null>(null);
  const [processing, setProcessing] = useState(false);
  const portraitId = showPortrait ? "p03" : null;
  const portrait = usePaniniReaction(setRightTab, Boolean(modal), processing, reactionStep === "transfer-reaction" ? "preview" : undefined);
  const sequence = useRef(0);
  const competition = cup ? "cup" : "league";

  function spin() {
    const key = String(++sequence.current);
    if (reactionStep === "continue" && sequence.current > 1) {
      setProcessing(true);
      portrait.queue(null);
      window.setTimeout(() => {
        portrait.queue(getStatsPortraitCue(-2, key));
        setProcessing(false);
      }, 900);
      return;
    }
    if (showPortrait && reactionStep === "drop") {
      portrait.queue(getStatsPortraitCue(-2, key));
      return;
    }
    if (showPortrait && (reactionStep === "called_up" || reactionStep === "missed")) {
      portrait.queue(getPortraitCue("national_callup", reactionStep, key));
      if (reactionStep === "missed") setModal("recap");
      return;
    }
    if (showPortrait && reactionStep === "recap") {
      portrait.queue(getPortraitCue("national_tournament", "Winner", key));
      setModal("recap");
      return;
    }
    if (showPortrait) portrait.queue(getPortraitCue(cup ? "domestic_cup" : "standing", cup ? "Semi-Finals" : 1, key));
    setModal(competition);
  }

  function close() {
    if (modal) portrait.release(modal);
    setModal(modal === "cup" && reactionStep === "chain" ? "recap" : null);
  }
  const modalSeason = showPortrait && !cup ? {
    ...season,
    standing: 1,
    leagueTable: season.leagueTable?.map((row, index) => index < 2 ? { ...row, name: index === 0 ? club.name : "CLB thử nghiệm 1" } : row),
  } : season;
  const stints = Array.from({ length: manyClubs ? 20 : 1 }, (_, index) => ({
    clubId: `preview-${index}`, clubName: manyClubs ? `CLB thử nghiệm ${index + 1}` : club.name,
    leagueId: club.leagueId, leagueName: club.leagueName, startAge: Math.min(18 + index, 35), endAge: Math.min(18 + index, 35),
    yearsAtClub: 1, ovrAtJoining: 75, ovrAtLeaving: 75,
  }));
  return <div className="football-dashboard football-wheel-shell football-career-shell">
    <WheelGameHeader mode="career" backHref="/dev/design-preview" gameName="Kiểm tra bố cục" position="ST" slotIndex={9} seasonLabel="2042/43" age={35} currentClubName={club.name} overall={75} onOpenTrophyCabinet={() => setModal("recap")} />
    <DraftDrumCareerStage
      mobileSection="action" setMobileSection={() => {}} rightTab={rightTab} setRightTab={setRightTab}
      wheelInteractionLocked={false} careerSubStep={transfer ? "transfer" : cup ? "domestic_cup" : "standing"}
      isUnemployed={false} currentAge={35} currentOvr={75} currentClub={club} currentContinentalCup="none"
      currentStats={{ pac: 72, sho: 78, pas: 70, dri: 74, def: 42, phy: 73 }} position="ST" playerName="Cầu thủ thử nghiệm"
      portraitId={portraitId} portraitReaction={portrait.reaction} onPortraitReactionEnd={portrait.clear}
      playerNationality="England" playerDebutAge={18} playerCareerLength={18}
      seasonRecords={{ 35: season }} selectedAgeForStats={selectedAge} setSelectedAgeForStats={setSelectedAge}
      clubStints={stints} peakOvrValue={75} yearSimResult={result} yearEvolution={{ count: null, direction: null }}
      evolvedStatsThisYear={[]} careerWheelItems={[{ label: "Vô địch", value: 1 }, { label: "Á quân", value: 2 }, { label: "Hạng 3", value: 3 }, { label: "Hạng 4", value: 4 }]}
      careerTargetIndex={0} careerSpinning={processing} isProcessing={processing} seasonTicketResolved={true}
      standingResult={modalSeason.standing} domesticCupResult="Semi-Finals" continentalCupResult={null} nationalCallupResult={null} nationalTournamentResult={null}
      hasBallonDorWinner={false} selectorIndex={0} tempSelectedStat={null} contractYearsTotal={2} contractYearsRemaining={1}
      currentWageAnnual={6000} marketValue={1300} onOpenTrophyCabinet={() => setModal("recap")} onOpenTransferModal={() => window.location.assign("/dev/transfer-window-preview")}
      onOpenModal={() => setModal(competition)} handleCareerSpinComplete={() => {}} handleCareerSpin={spin} handleNextSeason={() => {}}
    />
    {(modal === "league" || modal === "cup") && <SeasonResultModal type={modal} record={modalSeason} currentContinentalCup="none" playerDebutAge={18} onClose={close} />}
    {modal === "recap" && <SeasonRecapModal record={season} yearSimResult={result} currentContinentalCup="none" playerDebutAge={18} onClose={close} />}
  </div>;
}
