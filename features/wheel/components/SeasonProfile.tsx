"use client";

import { ChevronRight } from "lucide-react";
import type { ModalType } from "../hooks/useDraftDrum";
import type { SeasonRecord } from "@/types/game";
import { getDomesticCupName, getContinentalCupLabel, getSeasonYearString } from "../lib/simulation-helpers";

interface SeasonProfileProps {
  seasonRecords: Record<number, SeasonRecord>;
  currentAge: number;
  playerDebutAge: number;
  selectedAgeForStats: number;
  setSelectedAgeForStats: (age: number) => void;
  position: string;
  onOpenModal: (type: ModalType) => void;
}

function leagueResult(standing: number | null): string {
  if (standing === null) return "Chờ quay";
  if (standing === 1) return "Vô địch";
  if (standing <= 4) return `Top ${standing}`;
  return `Hạng #${standing}`;
}

function cupResult(result: string | null | undefined): string {
  if (!result || result === "Chờ quay") return "Chờ quay";
  if (result === "Winner") return "Vô địch";
  if (result === "Runner-Up") return "Á quân";
  if (result === "Semi-Finals") return "Bán kết";
  return "Vòng loại";
}

export function SeasonProfile({ seasonRecords, currentAge, playerDebutAge, selectedAgeForStats, setSelectedAgeForStats, onOpenModal }: SeasonProfileProps) {
  const activeRecord = seasonRecords[selectedAgeForStats] ?? null;
  const ages = Object.keys(seasonRecords).map(Number).sort((a, b) => a - b);

  return (
    <section className="rtg-season-profile">
      <div className="rtg-season-profile__inner">
        <div className="rtg-section-header">
          <div><span className="rtg-section-header__label">Mùa giải</span><h2 className="rtg-section-header__title">Hồ sơ mùa giải</h2></div>
        </div>
        <select className="rtg-season-profile__select" value={selectedAgeForStats} onChange={(event) => setSelectedAgeForStats(parseInt(event.target.value, 10))} aria-label="Chọn mùa giải">
          {ages.map((age) => <option key={age} value={age}>Mùa {getSeasonYearString(age, playerDebutAge)} · Tuổi {age}{age === currentAge ? " · hiện tại" : ""}</option>)}
        </select>

        {activeRecord ? (
          <>
            <div className="rtg-season-profile__club"><span>Câu lạc bộ</span><strong>{activeRecord.clubName}</strong><small>{activeRecord.leagueName}</small></div>
            <div className="rtg-season-profile__rows">
              <StatusRow label={activeRecord.leagueName || "Giải VĐQG"} result={leagueResult(activeRecord.standing ?? null)} hasResult={activeRecord.standing != null} isChampion={activeRecord.standing === 1} onClick={() => onOpenModal("league")} />
              <StatusRow label={getDomesticCupName(activeRecord.leagueName, activeRecord.leagueId)} result={cupResult(activeRecord.domesticCup)} hasResult={!!activeRecord.domesticCup && activeRecord.domesticCup !== "Chờ quay"} isChampion={activeRecord.domesticCup === "Winner"} onClick={() => onOpenModal("cup")} />
              {activeRecord.continentalCup ? <StatusRow label={getContinentalCupLabel(activeRecord.continentalCup.type)} result={cupResult(activeRecord.continentalCup.result)} hasResult={!!activeRecord.continentalCup.result && activeRecord.continentalCup.result !== "Chờ quay"} isChampion={activeRecord.continentalCup.result === "Winner"} onClick={() => onOpenModal("continental")} /> : <InactiveRow label="Cúp châu lục CLB" note="Không tham gia" />}
              {activeRecord.nationalTeam ? <StatusRow label={activeRecord.nationalTeam.type} result={activeRecord.nationalTeam.result ? cupResult(activeRecord.nationalTeam.result) : activeRecord.nationalTeam.callup === "Được triệu tập" ? "Được triệu tập" : activeRecord.nationalTeam.callup === "Không được gọi" ? "Không được gọi" : "Chờ quay"} hasResult={activeRecord.nationalTeam.callup !== "Chờ gọi"} isChampion={activeRecord.nationalTeam.result === "Winner"} isNational onClick={() => onOpenModal("national")} /> : <InactiveRow label="Đội tuyển quốc gia" note="Không có giải" />}
            </div>
          </>
        ) : <p className="rtg-empty-copy">Chưa có dữ liệu thi đấu.</p>}
      </div>
    </section>
  );
}

function StatusRow({ label, result, hasResult, isChampion, isNational, onClick }: { label: string; result: string; hasResult: boolean; isChampion?: boolean; isNational?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`rtg-season-profile__row ${isNational ? "is-national" : ""} ${isChampion ? "is-champion" : ""}`} onClick={hasResult ? onClick : undefined} disabled={!hasResult}>
      <span>{label}</span><span>{result}{hasResult && <ChevronRight aria-hidden="true" size={14} />}</span>
    </button>
  );
}

function InactiveRow({ label, note }: { label: string; note: string }) {
  return <div className="rtg-season-profile__row is-inactive"><span>{label}</span><span>{note}</span></div>;
}
