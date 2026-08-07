"use client";

import React from "react";
import { Trophy, RefreshCw, Shield } from "lucide-react";
import { getFlagEmoji } from "@/types/squad";

interface RetiredStageProps {
  position: string;
  playerNationality: string;
  peakOvrValue: number;
  playerName: string;
  careerTotalStats: { apps: number; goals: number; assists: number };
  clubStints: any[];
  achievements?: any;
  isSaving: boolean;
  handleSavePlayer: () => void;
}

export function RetiredStage({
  position,
  playerNationality,
  peakOvrValue,
  playerName,
  careerTotalStats,
  clubStints,
  achievements,
  isSaving,
  handleSavePlayer,
}: RetiredStageProps) {
  const ballonDorCount = achievements?.ballonDor ?? 0;

  return (
    <main
      style={{
        flex: 1,
        maxWidth: "1050px",
        width: "100%",
        margin: "0 auto",
        padding: "24px 20px 40px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--white)",
          border: "2.5px solid var(--charcoal)",
          borderRadius: "6px",
          boxShadow: "6px 6px 0 var(--charcoal)",
          padding: "28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        {/* HEADER BAR */}
        <div style={{ textAlign: "center", borderBottom: "2px solid var(--charcoal)", paddingBottom: "16px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Trophy size={36} color="#D4960D" />
            <h2
              style={{
                fontFamily: "var(--font-headline)",
                fontSize: "1.75rem",
                fontWeight: 900,
                textTransform: "uppercase",
                color: "var(--charcoal)",
                margin: 0,
                letterSpacing: "0.02em",
              }}
            >
              HÀNH TRÌNH SỰ NGHIỆP — VỀ HƯU HUYỀN THOẠI
            </h2>
          </div>
          <p
            style={{
              fontFamily: "var(--font-stamp)",
              fontSize: "0.65rem",
              color: "var(--ink-gray)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: "4px 0 0",
            }}
          >
            🏁 CẦU THỦ CHÍNH THỨC GIẢI NGHỆ BÓNG ĐÁ CHUYÊN NGHIỆP · TỔNG KẾT THÀNH TÍCH TOÀN BỘ SỰ NGHIỆP
          </p>
        </div>

        {/* 2-COLUMN MAIN LAYOUT */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: "32px",
            alignItems: "start",
          }}
        >
          {/* LEFT: RETRO PANINI HALL OF FAME CARD */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: "100%",
                maxWidth: "280px",
                backgroundColor: "#1f1a14",
                border: "2.5px solid #D4960D",
                borderRadius: "6px",
                padding: "16px",
                boxShadow: "4px 4px 0 var(--charcoal)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                position: "relative",
              }}
            >
              {/* STICKER TOP BAR */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #D4960D", paddingBottom: "6px" }}>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "#D4960D", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  HALL OF FAME
                </span>
                <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.85rem", fontWeight: 800, color: "var(--coral)" }}>
                  {position}
                </span>
              </div>

              {/* CARD BADGE BODY */}
              <div
                style={{
                  backgroundColor: "var(--white)",
                  border: "2px solid var(--charcoal)",
                  borderRadius: "4px",
                  padding: "28px 16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  boxShadow: "inset 0 0 12px rgba(0,0,0,0.05)",
                }}
              >
                <span style={{ position: "absolute", top: "8px", right: "10px", fontSize: "1.85rem" }}>
                  {getFlagEmoji(playerNationality)}
                </span>
                <div style={{ fontFamily: "var(--font-headline)", fontSize: "3.4rem", fontWeight: 900, color: "var(--charcoal)", lineHeight: 1 }}>
                  {peakOvrValue}
                </div>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.6rem", color: "#D4960D", textTransform: "uppercase", marginTop: "6px", fontWeight: 700, letterSpacing: "0.06em" }}>
                  OVR ĐỈNH CAO ⚡
                </span>
              </div>

              {/* PLAYER NAME */}
              <div style={{ textAlign: "center", borderTop: "1.5px solid #D4960D", paddingTop: "8px" }}>
                <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.05rem", fontWeight: 900, textTransform: "uppercase", color: "var(--cream)", letterSpacing: "0.04em" }}>
                  {playerName}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: DETAILED STATS & CLUB TIMELINE */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* 3 STAT CARDS ROW */}
            <div>
              <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.6rem", color: "var(--ink-gray)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>
                📊 THỐNG KÊ TOÀN BỘ SỰ NGHIỆP (CAREER TOTALS)
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                <div
                  style={{
                    backgroundColor: "var(--cream-dark)",
                    border: "2px solid var(--charcoal)",
                    borderRadius: "4px",
                    padding: "12px 14px",
                    boxShadow: "2px 2px 0 var(--charcoal)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    TRẬN RA SÂN
                  </span>
                  <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.45rem", fontWeight: 900, color: "var(--charcoal)", whiteSpace: "nowrap" }}>
                    {careerTotalStats.apps} <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Trận</span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--cream-dark)",
                    border: "2px solid var(--charcoal)",
                    borderRadius: "4px",
                    padding: "12px 14px",
                    boxShadow: "2px 2px 0 var(--charcoal)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    BÀN THẮNG
                  </span>
                  <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.45rem", fontWeight: 900, color: "var(--coral)", whiteSpace: "nowrap" }}>
                    {careerTotalStats.goals} <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Bàn</span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--cream-dark)",
                    border: "2px solid var(--charcoal)",
                    borderRadius: "4px",
                    padding: "12px 14px",
                    boxShadow: "2px 2px 0 var(--charcoal)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    KIẾN TẠO
                  </span>
                  <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.45rem", fontWeight: 900, color: "#10B981", whiteSpace: "nowrap" }}>
                    {careerTotalStats.assists} <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Kiến tạo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BALLON D'OR HIGHLIGHT BANNER */}
            {ballonDorCount > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  border: "2px solid var(--charcoal)",
                  padding: "12px 16px",
                  borderRadius: "4px",
                  backgroundColor: "gold",
                  boxShadow: "3px 3px 0 var(--charcoal)",
                }}
              >
                <Trophy size={24} color="var(--charcoal)" />
                <div>
                  <div style={{ fontFamily: "var(--font-headline)", fontSize: "0.95rem", fontWeight: 900, textTransform: "uppercase", color: "var(--charcoal)" }}>
                    🏆 ĐOẠT {ballonDorCount} QUẢ BÓNG VÀNG (BALLON D'OR)!
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "var(--charcoal)", opacity: 0.9, fontWeight: 600 }}>
                    Thành tựu cá nhân cao quý nhất trong sự nghiệp bóng đá chuyên nghiệp.
                  </span>
                </div>
              </div>
            )}

            {/* CLUB STINTS TABLE */}
            <div>
              <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.6rem", color: "var(--ink-gray)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>
                🏠 HÀNH TRÌNH QUA CÁC CÂU LẠC BỘ
              </span>
              <div
                style={{
                  border: "2px solid var(--charcoal)",
                  borderRadius: "4px",
                  overflow: "hidden",
                  boxShadow: "2px 2px 0 var(--charcoal)",
                  backgroundColor: "var(--white)",
                }}
              >
                {clubStints.map((st, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.82rem",
                      padding: "10px 14px",
                      backgroundColor: idx % 2 === 0 ? "var(--cream)" : "var(--white)",
                      borderBottom: idx < clubStints.length - 1 ? "1px solid var(--cream-border)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Shield size={16} color="var(--coral)" />
                      <strong style={{ fontFamily: "var(--font-headline)", fontSize: "0.88rem" }}>
                        {st.clubName}
                      </strong>
                      {st.leagueName && (
                        <span style={{ fontSize: "0.75rem", color: "var(--ink-gray)" }}>
                          ({st.leagueName})
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.68rem", color: "var(--ink-gray)" }}>
                        Tuổi {st.startAge} {st.endAge ? `→ ${st.endAge}` : ""}
                      </span>
                      <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.82rem", fontWeight: 800, color: "var(--charcoal)", minWidth: "55px", textAlign: "right" }}>
                        {st.yearsAtClub} Mùa
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER ACTION BUTTON */}
        <div style={{ borderTop: "2px solid var(--charcoal)", paddingTop: "20px", display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            onClick={handleSavePlayer}
            disabled={isSaving}
            className="btn-primary"
            style={{
              fontSize: "1.05rem",
              padding: "14px 40px",
              backgroundColor: "var(--coral)",
              color: "var(--white)",
              opacity: isSaving ? 0.6 : 1,
              cursor: isSaving ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "4px 4px 0 var(--charcoal)",
            }}
          >
            <RefreshCw size={20} className={isSaving ? "animate-spin" : ""} />
            {isSaving ? "ĐANG LƯU DỮ LIỆU CẦU THỦ..." : "✨ LƯU THẺ CẦU THỦ VÀO HALL OF FAME & QUAY VỀ SQUAD BOARD"}
          </button>
        </div>

      </div>
    </main>
  );
}
