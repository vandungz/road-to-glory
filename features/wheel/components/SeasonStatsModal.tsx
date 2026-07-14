"use client";

import { X, ChevronRight } from "lucide-react";
import type { SeasonRecord, CompetitionStats } from "@/types/game";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import { getDomesticCupName, getContinentalCupLabel } from "../lib/simulation-helpers";

interface Props {
  record: SeasonRecord;
  yearSimResult: SimulatedSeasonResult;
  currentContinentalCup: string;
  onClose: () => void;
}

function MiniStatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid var(--cream-border)" }}>
      <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>{label}</span>
      <strong style={{ fontSize: "0.82rem", color: highlight ? "var(--coral)" : "var(--charcoal)" }}>{value}</strong>
    </div>
  );
}

function CompRow({ icon, label, stats, result }: { icon: string; label: string; stats?: CompetitionStats; result?: string }) {
  if (!stats || stats.apps === 0) return null;
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "6px 8px",
      backgroundColor: "var(--cream-dark)",
      borderRadius: "3px",
      border: "1px solid var(--cream-border)",
    }}>
      <div>
        <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.68rem", fontWeight: 700, color: "var(--charcoal)" }}>
          {icon} {label}
        </span>
        {result && (
          <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.48rem", color: "var(--ink-gray)", display: "block" }}>
            {result}
          </span>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.52rem", color: "var(--ink-gray)" }}>
          {stats.apps}app {stats.goals}G {stats.assists}A
          {stats.cleanSheets > 0 ? ` ${stats.cleanSheets}CS` : ""} · {stats.rating.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function getCupResultShort(result: string | null | undefined): string {
  if (!result || result === "Chờ quay") return "";
  if (result === "Winner") return "🏆 Vô địch";
  if (result === "Runner-Up") return "Á quân";
  if (result === "Semi-Finals") return "Bán kết";
  return "Vòng loại";
}

export function SeasonStatsModal({ record, yearSimResult, currentContinentalCup, onClose }: Props) {
  const awards = yearSimResult.events.filter((e) => e.type === "individual_award");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--white)",
          border: "2.5px solid var(--charcoal)",
          borderRadius: "6px",
          boxShadow: "6px 6px 0 var(--charcoal)",
          padding: "20px",
          width: "100%",
          maxWidth: "440px",
          maxHeight: "85vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>THỐNG KÊ MÙA GIẢI</div>
            <h2 style={{ fontFamily: "var(--font-headline)", fontSize: "1rem", fontWeight: 900, textTransform: "uppercase", color: "var(--charcoal)", margin: "2px 0 0" }}>
              {record.clubName}
            </h2>
            <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)" }}>{record.leagueName}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
            <X size={18} color="var(--ink-gray)" />
          </button>
        </div>

        {/* Tổng mùa */}
        <div style={{ border: "1.5px solid var(--charcoal)", borderRadius: "4px", padding: "10px 12px" }}>
          <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.48rem", color: "var(--ink-gray)", textTransform: "uppercase", marginBottom: "8px" }}>TỔNG MÙA GIẢI</div>
          <MiniStatRow label="Trận ra sân (APPS)" value={yearSimResult.apps} />
          <MiniStatRow label="Bàn thắng (GOALS)" value={yearSimResult.goals} />
          <MiniStatRow label="Kiến tạo (ASSISTS)" value={yearSimResult.assists} />
          {yearSimResult.cleanSheets > 0 && (
            <MiniStatRow label="Sạch lưới (CS)" value={yearSimResult.cleanSheets} highlight />
          )}
          <MiniStatRow label="Rating trung bình" value={yearSimResult.matchRating.toFixed(2)} />
        </div>

        {/* Per-competition */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.48rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>THEO TỪNG GIẢI</div>

          <CompRow
            icon="🏆"
            label={record.leagueName || "Giải VĐQG"}
            stats={yearSimResult.leagueStats}
            result={record.standing !== null && record.standing !== undefined ? `Hạng #${record.standing}` : undefined}
          />
          <CompRow
            icon="🛡️"
            label={getDomesticCupName(record.leagueName)}
            stats={yearSimResult.domesticCupStats}
            result={getCupResultShort(record.domesticCup)}
          />
          {yearSimResult.continentalStats && (
            <CompRow
              icon="🌍"
              label={getContinentalCupLabel(record.continentalCup?.type ?? currentContinentalCup)}
              stats={yearSimResult.continentalStats}
              result={getCupResultShort(record.continentalCup?.result)}
            />
          )}
          {yearSimResult.nationalStats && (
            <CompRow
              icon="🌎"
              label={record.nationalTeam?.type ?? "ĐTQG"}
              stats={yearSimResult.nationalStats}
              result={getCupResultShort(record.nationalTeam?.result)}
            />
          )}
        </div>

        {/* Awards */}
        {awards.length > 0 && (
          <div style={{ borderTop: "1.5px solid var(--cream-border)", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.48rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>DANH HIỆU CÁ NHÂN</div>
            {awards.map((award, i) => (
              <div key={i} style={{
                padding: "6px 10px",
                backgroundColor: "rgba(254, 243, 199, 0.6)",
                border: "1px solid #fcd34d",
                borderRadius: "3px",
                fontFamily: "var(--font-stamp)",
                fontSize: "0.6rem",
                color: "var(--charcoal)",
              }}>
                ⭐ {award.label}
              </div>
            ))}
            {yearSimResult.hasBallonDorWinner && (
              <div style={{
                padding: "6px 10px",
                backgroundColor: "rgba(255, 111, 97, 0.1)",
                border: "1px solid var(--coral)",
                borderRadius: "3px",
                fontFamily: "var(--font-stamp)",
                fontSize: "0.6rem",
                color: "var(--coral)",
                fontWeight: 700,
              }}>
                🏅 BALLON D&apos;OR WINNER
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onClose}
          style={{
            fontFamily: "var(--font-headline)",
            fontSize: "0.82rem",
            fontWeight: 700,
            textTransform: "uppercase",
            border: "2px solid var(--charcoal)",
            borderRadius: "3px",
            padding: "10px",
            backgroundColor: "var(--charcoal)",
            color: "var(--white)",
            cursor: "pointer",
            letterSpacing: "0.05em",
            boxShadow: "2px 2px 0 rgba(0,0,0,0.3)",
          }}
        >
          TIẾP TỤC → PHÁT TRIỂN CHỈ SỐ
        </button>

      </div>
    </div>
  );
}
