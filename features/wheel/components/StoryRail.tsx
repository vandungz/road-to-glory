"use client";

import React from "react";
import { Shield, Trophy, TrendingUp } from "lucide-react";
import type { SeasonRecord } from "@/types/game";

interface ClubStintItem {
  clubName: string;
  leagueName?: string;
  startAge: number;
  endAge?: number;
  trophies?: string[];
}

interface StoryRailProps {
  clubStints?: ClubStintItem[];
  seasonRecords?: Record<number, SeasonRecord>;
  currentAge: number;
  playerDebutAge: number;
  currentOvr: number;
  peakOvrValue?: number;
  onOpenTrophyCabinet?: () => void;
}

export function StoryRail({
  clubStints = [],
  seasonRecords = {},
  currentAge,
  playerDebutAge,
  currentOvr,
  peakOvrValue,
  onOpenTrophyCabinet,
}: StoryRailProps) {
  // Count trophies
  let totalTrophies = 0;
  let ballonDorCount = 0;
  const displayPeakOvr = peakOvrValue ?? currentOvr;

  Object.values(seasonRecords).forEach((rec) => {
    if (rec.standing === 1) totalTrophies++;
    if (rec.domesticCup === "Winner") totalTrophies++;
    if (rec.continentalCup?.result === "Winner") totalTrophies++;
    if (rec.nationalTeam?.result === "Winner") totalTrophies++;
    if (rec.ballonDorResult === 1 || rec.achievements?.ballonDor) ballonDorCount++;
  });

  return (
    <aside
      className="hidden lg:flex"
      style={{
        flex: "0 0 260px",
        flexDirection: "column",
        gap: "16px",
        backgroundColor: "var(--white)",
        border: "2px solid var(--charcoal)",
        borderRadius: "4px",
        boxShadow: "3px 3px 0 var(--charcoal)",
        padding: "16px",
        height: "100%",
        maxHeight: "100%",
        overflowY: "auto",
      }}
    >
      {/* HEADER */}
      <div style={{ borderBottom: "2px solid var(--charcoal)", paddingBottom: "8px" }}>
        <span
          style={{
            fontFamily: "var(--font-stamp)",
            fontSize: "0.55rem",
            color: "var(--ink-gray)",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          NHẬT KÝ SỰ NGHIỆP
        </span>
        <h3
          style={{
            fontFamily: "var(--font-headline)",
            fontSize: "1.1rem",
            fontWeight: 900,
            color: "var(--charcoal)",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          STORY RAIL
        </h3>
      </div>

      {/* OVR BADGE CARD */}
      <div
        style={{
          backgroundColor: "var(--cream)",
          border: "1.5px solid var(--charcoal)",
          borderRadius: "4px",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "2px 2px 0 var(--charcoal)",
        }}
      >
        <div>
          <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.52rem", color: "var(--ink-gray)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            OVR HIỆN TẠI
          </span>
          <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.6rem", fontWeight: 900, color: "var(--coral)", lineHeight: 1 }}>
            {currentOvr}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.52rem", color: "var(--ink-gray)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            PEAK OVR
          </span>
          <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 800, color: "#266b3e", lineHeight: 1.2 }}>
            ⚡ {displayPeakOvr}
          </div>
        </div>
      </div>

      {/* CLICKABLE TROPHY CABINET CARD */}
      <div
        onClick={onOpenTrophyCabinet}
        style={{
          backgroundColor: "#1f1a14",
          border: "1.5px solid #D4960D",
          borderRadius: "4px",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "2px 2px 0 var(--charcoal)",
          cursor: "pointer",
          transition: "transform 0.15 ease, boxShadow 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Trophy size={20} color="#D4960D" />
          <div>
            <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "#D4960D", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              TỦ DANH HIỆU
            </span>
            <div style={{ fontFamily: "var(--font-headline)", fontSize: "0.85rem", fontWeight: 800, color: "var(--cream)" }}>
              XEM CHI TIẾT →
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 900, color: "#D4960D" }}>
            🏆 {totalTrophies}
          </div>
          {ballonDorCount > 0 && (
            <span style={{ fontSize: "0.68rem", color: "var(--cream)", opacity: 0.9 }}>🏅 {ballonDorCount} QBV</span>
          )}
        </div>
      </div>

      {/* CLUB STINTS */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, overflow: "hidden" }}>
        <span
          style={{
            fontFamily: "var(--font-headline)",
            fontSize: "0.8rem",
            fontWeight: 700,
            color: "var(--charcoal)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Shield size={14} color="var(--charcoal)" /> CÁC CLB ĐÃ THI ĐẤU
        </span>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", flex: 1 }}>
          {clubStints.length === 0 ? (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-gray)", margin: 0 }}>
              Đang khởi đầu sự nghiệp...
            </p>
          ) : (
            clubStints.map((stint, idx) => (
              <div
                key={idx}
                style={{
                  padding: "6px 8px",
                  borderLeft: "3px solid #266b3e",
                  backgroundColor: "var(--cream)",
                  fontSize: "0.75rem",
                  borderRadius: "0 3px 3px 0",
                }}
              >
                <div style={{ fontWeight: 700, fontFamily: "var(--font-headline)", fontSize: "0.82rem" }}>
                  {stint.clubName}
                </div>
                <div style={{ color: "var(--ink-gray)", fontSize: "0.68rem", fontFamily: "var(--font-stamp)" }}>
                  Tuổi {stint.startAge} {stint.endAge ? `→ ${stint.endAge}` : "(Hiện tại)"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
