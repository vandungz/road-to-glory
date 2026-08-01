"use client";

import React from "react";
import { X, Trophy, Award, Globe, Star, Shield } from "lucide-react";
import type { SeasonRecord } from "@/types/game";
import { getDomesticCupName, getContinentalCupLabel, getSeasonYearString } from "../lib/simulation-helpers";

interface Props {
  seasonRecords: Record<number, SeasonRecord>;
  playerName: string;
  playerNationality: string;
  onClose: () => void;
}

interface TrophyItem {
  id: string;
  type: "league" | "cup" | "continental" | "award" | "national";
  title: string;
  seasonStr: string;
  age: number;
  clubName: string;
  icon: string;
}

export function TrophyCabinetModal({ seasonRecords, playerName, playerNationality, onClose }: Props) {
  const trophyList: TrophyItem[] = [];

  const ages = Object.keys(seasonRecords).map(Number).sort((a, b) => a - b);

  ages.forEach((age) => {
    const rec = seasonRecords[age];
    if (!rec) return;

    const seasonStr = `Tuổi ${age}`;
    const clubName = rec.clubName || "CLB";

    // 1. League Champions
    if (rec.standing === 1) {
      trophyList.push({
        id: `league_${age}`,
        type: "league",
        title: `Vô Địch ${rec.leagueName || "Giải VĐQG"}`,
        seasonStr,
        age,
        clubName,
        icon: "🏆",
      });
    }

    // 2. Domestic Cup Champions
    if (rec.domesticCup === "Winner") {
      trophyList.push({
        id: `cup_${age}`,
        type: "cup",
        title: `Vô Địch ${getDomesticCupName(rec.leagueName, rec.leagueId)}`,
        seasonStr,
        age,
        clubName,
        icon: "🍷",
      });
    }

    // 3. Continental Cup Champions
    if (rec.continentalCup?.result === "Winner") {
      trophyList.push({
        id: `continental_${age}`,
        type: "continental",
        title: `Vô Địch ${getContinentalCupLabel(rec.continentalCup.type)}`,
        seasonStr,
        age,
        clubName,
        icon: "🌟",
      });
    }

    // 4. Ballon d'Or / Individual Awards
    if (rec.ballonDorResult === 1 || rec.achievements?.ballonDor) {
      trophyList.push({
        id: `ballondor_${age}`,
        type: "award",
        title: "🏅 Quả Bóng Vàng (Ballon d'Or)",
        seasonStr,
        age,
        clubName,
        icon: "⚽",
      });
    }

    // 5. National Team Champions
    if (rec.nationalTeam?.result === "Winner") {
      trophyList.push({
        id: `national_${age}`,
        type: "national",
        title: `Vô Địch ${rec.nationalTeam.type || "Cúp Quốc Tế"}`,
        seasonStr,
        age,
        clubName: playerNationality || "Đội Tuyển Quốc Gia",
        icon: "👑",
      });
    }
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "560px",
          maxHeight: "85vh",
          backgroundColor: "#1f1a14",
          border: "2px solid #D4960D",
          borderRadius: "4px",
          boxShadow: "0 0 20px rgba(212,150,13,0.35), 6px 6px 0 var(--charcoal)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "var(--cream)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1.5px solid rgba(212,150,13,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#2a2218",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Trophy size={24} color="#D4960D" />
            <div>
              <span
                style={{
                  fontFamily: "var(--font-stamp)",
                  fontSize: "0.55rem",
                  color: "#D4960D",
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                TỦ DANH HIỆU SỰ NGHIỆP · {playerName.toUpperCase()}
              </span>
              <h2
                style={{
                  fontFamily: "var(--font-headline)",
                  fontSize: "1.25rem",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  margin: "2px 0 0",
                  color: "var(--cream)",
                }}
              >
                TỔNG DANH HIỆU ({trophyList.length})
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid rgba(212,150,13,0.4)",
              borderRadius: "3px",
              padding: "4px 8px",
              cursor: "pointer",
              color: "#D4960D",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* LIST CONTENT */}
        <div style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {trophyList.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 16px",
                border: "1px dashed rgba(212,150,13,0.3)",
                borderRadius: "4px",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <Trophy size={32} color="#D4960D" style={{ opacity: 0.5, margin: "0 auto 10px" }} />
              <p style={{ fontFamily: "var(--font-headline)", fontSize: "0.95rem", margin: 0 }}>
                Chưa mở khóa danh hiệu nào.
              </p>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                Hãy nỗ lực thi đấu các mùa giải để chinh phục cúp vô địch!
              </span>
            </div>
          ) : (
            trophyList.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  backgroundColor: "#2a2218",
                  border: "1px solid rgba(212,150,13,0.4)",
                  borderRadius: "3px",
                  boxShadow: "2px 2px 0 var(--charcoal)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "1.4rem" }}>{t.icon}</span>
                  <div>
                    <strong style={{ fontFamily: "var(--font-headline)", fontSize: "0.95rem", color: "var(--cream)" }}>
                      {t.title}
                    </strong>
                    <div style={{ fontSize: "0.72rem", color: "#D4960D", fontFamily: "var(--font-stamp)", marginTop: "2px" }}>
                      {t.clubName}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: "var(--font-stamp)",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    backgroundColor: "rgba(212,150,13,0.15)",
                    border: "1px solid #D4960D",
                    color: "#D4960D",
                    padding: "4px 10px",
                    borderRadius: "12px",
                  }}
                >
                  {t.seasonStr}
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER CLOSE */}
        <div style={{ padding: "14px 20px", borderTop: "1.5px solid rgba(212,150,13,0.4)", backgroundColor: "#2a2218" }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary"
            style={{
              width: "100%",
              fontSize: "0.95rem",
              padding: "10px",
              minHeight: "44px",
              backgroundColor: "#D4960D",
              color: "#1f1a14",
              fontWeight: 800,
            }}
          >
            ĐÓNG TỦ DANH HIỆU
          </button>
        </div>
      </div>
    </div>
  );
}
