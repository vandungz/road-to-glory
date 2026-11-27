"use client";

import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { FilterSelect } from "@/components/ui/FilterSelect";
import type { ModalType } from "../hooks/useDraftDrum";
import type { SeasonRecord } from "@/types/game";
import { getSeasonYearString } from "../lib/competition-display";
import { useCompetitionNames } from "./useCompetitionNames";
import { useCompetitionResult } from "./useCompetitionResult";

interface SeasonProfileProps {
  seasonRecords: Record<number, SeasonRecord>;
  currentAge: number;
  playerDebutAge: number;
  selectedAgeForStats: number;
  setSelectedAgeForStats: (age: number) => void;
  position: string;
  onOpenModal: (type: ModalType) => void;
}

export function SeasonProfile({ seasonRecords, currentAge, playerDebutAge, selectedAgeForStats, setSelectedAgeForStats, onOpenModal }: SeasonProfileProps) {
  const ui = useTranslations("ui");
  const t = useTranslations("career");
  const resultLabel = useCompetitionResult();
  const names = useCompetitionNames();
  const activeRecord = seasonRecords[selectedAgeForStats] ?? null;
  const ages = Object.keys(seasonRecords).map(Number).sort((a, b) => a - b);

  return (
    <section className="football-season-profile" data-mount="detail">
      <div className="football-season-profile__inner">
        <div className="football-section-header">
          <div><span className="football-section-header__label">{ui("season2")}</span><h2 className="football-section-header__title">{ui("seasonRecord")}</h2></div>
        </div>
        <FilterSelect label={ui("selectASeason")} value={String(selectedAgeForStats)} onChange={(value) => setSelectedAgeForStats(Number(value))} searchable={ages.length > 8} disabled={ages.length === 0}
          options={ages.map((age) => ({ value: String(age), label: t("seasonOption", { season: getSeasonYearString(age, playerDebutAge) }), description: t(age === currentAge ? "ageCurrent" : "ageOption", { age }) }))} />

        {activeRecord ? (
          <>
            <div className="football-season-profile__club"><span>{ui("club")}</span><strong>{names.clubName(activeRecord.clubName)}</strong><small>{names.leagueName(activeRecord.leagueName)}</small></div>
            <div className="football-season-profile__rows">
              <StatusRow label={names.leagueName(activeRecord.leagueName)} result={resultLabel(activeRecord.standing === 1 ? "Winner" : activeRecord.standing ? `Hạng ${activeRecord.standing}` : null, ui("awaitingSpin"))} hasResult={activeRecord.standing != null} isChampion={activeRecord.standing === 1} onClick={() => onOpenModal("league")} />
              <StatusRow label={names.domesticCupName(activeRecord.leagueName, activeRecord.leagueId)} result={resultLabel(activeRecord.domesticCup)} hasResult={!!activeRecord.domesticCup && activeRecord.domesticCup !== "Chờ quay"} isChampion={activeRecord.domesticCup === "Winner"} onClick={() => onOpenModal("cup")} />
              {activeRecord.continentalCup ? <StatusRow label={names.continentalCupName(activeRecord.continentalCup.type)} result={resultLabel(activeRecord.continentalCup.result)} hasResult={!!activeRecord.continentalCup.result && activeRecord.continentalCup.result !== "Chờ quay"} isChampion={activeRecord.continentalCup.result === "Winner"} onClick={() => onOpenModal("continental")} /> : <InactiveRow label={ui("continentalCup")} note={ui("didNotEnter")} />}
              {activeRecord.nationalTeam ? <StatusRow label={activeRecord.nationalTeam.type?.trim() || ui("nationalTeam")} result={activeRecord.nationalTeam.result ? resultLabel(activeRecord.nationalTeam.result) : activeRecord.nationalTeam.callup === "Được triệu tập" ? ui("calledUp") : activeRecord.nationalTeam.callup === "Không được gọi" ? ui("notCalledUp") : ui("awaitingSpin")} hasResult={activeRecord.nationalTeam.callup !== "Chờ gọi"} isChampion={activeRecord.nationalTeam.result === "Winner"} isNational onClick={() => onOpenModal("national")} /> : <InactiveRow label={ui("nationalTeam")} note={ui("noTournament")} />}
            </div>
          </>
        ) : <p className="football-empty-copy">{ui("noMatchData")}</p>}
      </div>
    </section>
  );
}

function StatusRow({ label, result, hasResult, isChampion, isNational, onClick }: { label: string; result: string; hasResult: boolean; isChampion?: boolean; isNational?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`football-season-profile__row ${isNational ? "is-national" : ""} ${isChampion ? "is-champion" : ""}`} onClick={hasResult ? onClick : undefined} disabled={!hasResult}>
      <span>{label}</span><span>{result}{hasResult && <ChevronRight aria-hidden="true" size={14} />}</span>
    </button>
  );
}

function InactiveRow({ label, note }: { label: string; note: string }) {
  return <div className="football-season-profile__row is-inactive"><span>{label}</span><span>{note}</span></div>;
}
