"use client";

import { Calendar, ChevronRight } from "lucide-react";
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

function getLeagueResultLabel(standing: number | null): string {
  if (standing === null) return "Chờ quay...";
  if (standing === 1) return "🏆 Vô địch";
  if (standing <= 4) return `Top ${standing}`;
  return `Hạng #${standing}`;
}

function getCupResultLabel(result: string | null | undefined): string {
  if (!result || result === "Chờ quay") return "Chờ quay...";
  if (result === "Winner") return "🏆 Vô địch";
  if (result === "Runner-Up") return "Á quân";
  if (result === "Semi-Finals") return "Bán kết";
  return "Vòng loại";
}

export function SeasonProfile({
  seasonRecords,
  currentAge,
  playerDebutAge,
  selectedAgeForStats,
  setSelectedAgeForStats,
  position,
  onOpenModal,
}: SeasonProfileProps) {
  const activeRecord = seasonRecords[selectedAgeForStats] ?? null;
  const ages = Object.keys(seasonRecords).map(Number).sort((a, b) => a - b);

  return (
    <div style={{
      flex: 1,
      backgroundColor: "var(--white)",
      border: "2px solid var(--charcoal)",
      borderRadius: "4px",
      boxShadow: "3px 3px 0 var(--charcoal)",
      minHeight: "450px",
    }}>
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Header */}
        <div style={{ borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-headline)", fontSize: "0.92rem", fontWeight: 900, textTransform: "uppercase", color: "var(--charcoal)" }}>
            <Calendar size={16} color="var(--coral)" /> Hồ Sơ Mùa Giải
          </div>
        </div>

        {/* Dropdown mùa */}
        <select
          value={selectedAgeForStats}
          onChange={(e) => setSelectedAgeForStats(parseInt(e.target.value))}
          style={{
            width: "100%",
            fontFamily: "var(--font-headline)",
            fontSize: "0.82rem",
            fontWeight: 700,
            border: "2.5px solid var(--charcoal)",
            borderRadius: "3px",
            padding: "8px 10px",
            backgroundColor: "var(--cream)",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {ages.map((age) => (
            <option key={age} value={age}>
              MÙA {getSeasonYearString(age, playerDebutAge)} (TUỔI {age}) {age === currentAge ? "★" : ""}
            </option>
          ))}
        </select>

        {activeRecord ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

            {/* CLB info */}
            <div style={{ paddingBottom: "6px", borderBottom: "1px solid var(--cream-border)" }}>
              <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-light)", display: "block", textTransform: "uppercase" }}>Câu Lạc Bộ</span>
              <strong style={{ fontSize: "0.85rem", fontFamily: "var(--font-headline)", textTransform: "uppercase" }}>{activeRecord.clubName}</strong>
              <span style={{ color: "var(--ink-gray)", display: "block", fontSize: "0.72rem", marginTop: "1px" }}>{activeRecord.leagueName}</span>
            </div>

            {/* Status rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>

              {/* League */}
              <StatusRow
                icon="🏆"
                label={activeRecord.leagueName || "Giải VĐQG"}
                result={getLeagueResultLabel(activeRecord.standing ?? null)}
                hasResult={activeRecord.standing !== null && activeRecord.standing !== undefined}
                isChampion={activeRecord.standing === 1}
                onClick={() => onOpenModal("league")}
              />

              {/* Domestic Cup */}
              <StatusRow
                icon="🛡️"
                label={getDomesticCupName(activeRecord.leagueName)}
                result={getCupResultLabel(activeRecord.domesticCup)}
                hasResult={!!activeRecord.domesticCup && activeRecord.domesticCup !== "Chờ quay"}
                isChampion={activeRecord.domesticCup === "Winner"}
                onClick={() => onOpenModal("cup")}
              />

              {/* Continental */}
              {activeRecord.continentalCup ? (
                <StatusRow
                  icon="🌍"
                  label={getContinentalCupLabel(activeRecord.continentalCup.type)}
                  result={getCupResultLabel(activeRecord.continentalCup.result)}
                  hasResult={!!activeRecord.continentalCup.result && activeRecord.continentalCup.result !== "Chờ quay"}
                  isChampion={activeRecord.continentalCup.result === "Winner"}
                  onClick={() => onOpenModal("continental")}
                />
              ) : (
                <StatusRowInactive icon="🌍" label="Cúp Châu Lục CLB" note="Không tham gia" />
              )}

              {/* National */}
              {activeRecord.nationalTeam ? (
                <StatusRow
                  icon="🌎"
                  label={activeRecord.nationalTeam.type}
                  result={
                    activeRecord.nationalTeam.result
                      ? getCupResultLabel(activeRecord.nationalTeam.result)
                      : activeRecord.nationalTeam.callup === "Được triệu tập"
                        ? "Được triệu tập"
                        : activeRecord.nationalTeam.callup === "Không được gọi"
                          ? "Không được gọi"
                          : "Chờ quay..."
                  }
                  hasResult={activeRecord.nationalTeam.callup !== "Chờ gọi"}
                  isChampion={activeRecord.nationalTeam.result === "Winner"}
                  isNational
                  onClick={() => onOpenModal("national")}
                />
              ) : (
                <StatusRowInactive icon="🌎" label="ĐTQG Quốc Tế" note="Không có giải" />
              )}

            </div>
          </div>
        ) : (
          <p style={{ fontSize: "0.75rem", fontStyle: "italic", color: "var(--ink-light)" }}>Chưa có dữ liệu thi đấu...</p>
        )}

      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatusRow({
  icon,
  label,
  result,
  hasResult,
  isChampion,
  isNational,
  onClick,
}: {
  icon: string;
  label: string;
  result: string;
  hasResult: boolean;
  isChampion?: boolean;
  isNational?: boolean;
  onClick: () => void;
}) {
  const borderColor = isNational ? "var(--coral)" : "var(--charcoal)";
  const bgColor = isNational ? "rgba(255,111,97,0.06)" : "var(--cream-dark)";

  return (
    <button
      type="button"
      onClick={hasResult ? onClick : undefined}
      disabled={!hasResult}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        border: `1.5px solid ${hasResult ? borderColor : "var(--cream-border)"}`,
        borderRadius: "4px",
        padding: "8px 10px",
        backgroundColor: hasResult ? bgColor : "transparent",
        cursor: hasResult ? "pointer" : "default",
        width: "100%",
        textAlign: "left",
        opacity: hasResult ? 1 : 0.55,
        transition: "opacity 0.15s",
      }}
    >
      <span style={{
        fontFamily: "var(--font-headline)",
        fontSize: "0.72rem",
        fontWeight: 700,
        color: isNational ? "var(--coral)" : "var(--charcoal)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "140px",
      }}>
        {icon} {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
        <span style={{
          fontFamily: "var(--font-headline)",
          fontSize: "0.7rem",
          fontWeight: 800,
          color: isChampion ? "var(--coral)" : isNational ? "var(--coral)" : "var(--charcoal)",
        }}>
          {result}
        </span>
        {hasResult && <ChevronRight size={12} color={isNational ? "var(--coral)" : "var(--charcoal)"} />}
      </div>
    </button>
  );
}

function StatusRowInactive({ icon, label, note }: { icon: string; label: string; note: string }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      border: "1.5px dashed var(--cream-border)",
      borderRadius: "4px",
      padding: "8px 10px",
      opacity: 0.5,
    }}>
      <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.72rem", fontWeight: 500, color: "var(--ink-light)" }}>
        {icon} {label}
      </span>
      <span style={{ fontSize: "0.68rem", fontStyle: "italic", color: "var(--ink-light)" }}>{note}</span>
    </div>
  );
}
