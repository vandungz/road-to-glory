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
}

export function StoryRail({
  clubStints = [],
  seasonRecords = {},
  currentAge,
  playerDebutAge,
  currentOvr,
}: StoryRailProps) {
  // Extract age vs OVR list for sparkline/timeline
  const ages: number[] = [];
  for (let a = playerDebutAge; a <= currentAge; a++) {
    ages.push(a);
  }

  // Count trophies
  let totalTrophies = 0;
  let ballonDorCount = 0;
  Object.values(seasonRecords).forEach((rec) => {
    if (rec.standing === 1) totalTrophies++;
    if (rec.domesticCup === "Winner") totalTrophies++;
    if (rec.continentalCup?.result === "Winner") totalTrophies++;
    if (rec.nationalTeam?.result === "Winner") totalTrophies++;
    if ((rec as any)?.ballonDor?.winner) ballonDorCount++;
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

      {/* OVR PROGRESSION SPARKLINE / LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
            <TrendingUp size={14} color="#266b3e" /> TĂNG TRƯỞNG OVR
          </span>
          <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.75rem", fontWeight: 700, color: "var(--coral)" }}>
            HIỆN TẠI: {currentOvr}
          </span>
        </div>

        {/* Mini Age-OVR track */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "4px",
            height: "44px",
            backgroundColor: "var(--cream)",
            border: "1px solid var(--cream-border)",
            borderRadius: "3px",
            padding: "4px 8px",
          }}
        >
          {ages.map((age) => {
            const rec = seasonRecords[age];
            const ovr = (rec as any)?.ovr ?? (age === currentAge ? currentOvr : 60);
            const heightPct = Math.min(100, Math.max(20, ((ovr - 45) / 50) * 100));

            return (
              <div
                key={age}
                title={`Tuổi ${age}: ${ovr} OVR`}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: "10px",
                    height: `${heightPct}%`,
                    backgroundColor: age === currentAge ? "var(--coral)" : "#266b3e",
                    borderRadius: "1px 1px 0 0",
                    transition: "height 0.3s ease",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* TROPHY CABINET */}
      <div
        style={{
          backgroundColor: "var(--cream-dark)",
          border: "1px solid var(--cream-border)",
          borderRadius: "3px",
          padding: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Trophy size={18} color="#D4960D" />
          <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.8rem", fontWeight: 700 }}>
            TỔNG DANH HIỆU
          </span>
        </div>
        <span style={{ fontFamily: "var(--font-headline)", fontSize: "1.1rem", fontWeight: 900, color: "#D4960D" }}>
          🏆 {totalTrophies} {ballonDorCount > 0 ? `· 🏅${ballonDorCount}` : ""}
        </span>
      </div>

      {/* CLUB STINTS */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
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
