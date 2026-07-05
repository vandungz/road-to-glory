"use client";

import { Trophy, RefreshCw } from "lucide-react";
import { getFlagEmoji } from "@/types/squad";

interface RetiredStageProps {
  position: string;
  playerNationality: string;
  peakOvrValue: number;
  playerName: string;
  careerTotalStats: { apps: number; goals: number; assists: number };
  clubStints: any[];
  events: any[];
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
  events,
  isSaving,
  handleSavePlayer,
}: RetiredStageProps) {
  return (
    <main style={{ flex: 1, maxWidth: "750px", width: "100%", margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", boxShadow: "4px 4px 0 var(--charcoal)", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        <div style={{ textAlign: "center", borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "12px" }}>
          <Trophy size={42} color="var(--coral)" style={{ margin: "0 auto 8px" }} />
          <h2 style={{ fontFamily: "var(--font-headline)", fontSize: "1.55rem", fontWeight: 900, textTransform: "uppercase", color: "var(--charcoal)", margin: 0 }}>
            TỔNG KẾT HÀNH TRÌNH SỰ NGHIỆP CẦU THỦ
          </h2>
          <p style={{ fontFamily: "var(--font-stamp)", fontSize: "0.6rem", color: "var(--ink-gray)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "4px" }}>
            🏁 CẦU THỦ CHÍNH THỨC GIẢI NGHỆ BÓNG ĐÁ CHUYÊN NGHIỆP
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
          
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: "220px", backgroundColor: "var(--cream)", border: "2.5px solid var(--charcoal)", borderRadius: "4px", padding: "12px", boxShadow: "3px 3px 0 var(--charcoal)", display: "flex", flexDirection: "column", aspectRatio: "2 / 3" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "4px", marginBottom: "8px" }}>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.45rem", textTransform: "uppercase" }}>RETRO ALBUM</span>
                <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.65rem", fontWeight: 700, color: "var(--coral)" }}>{position}</span>
              </div>

              <div style={{ flex: 1, backgroundColor: "var(--white)", border: "1.5px solid var(--charcoal)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: "8px", position: "relative" }}>
                <span style={{ position: "absolute", top: "6px", right: "6px", fontSize: "1.25rem" }}>{getFlagEmoji(playerNationality)}</span>
                <div style={{ fontFamily: "var(--font-headline)", fontSize: "2.4rem", fontWeight: 900, color: "var(--charcoal)" }}>{peakOvrValue}</div>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase", marginTop: "2px" }}>PEAK OVR</span>
              </div>

              <div style={{ fontFamily: "var(--font-headline)", fontSize: "0.8rem", fontWeight: 700, textAlign: "center", textTransform: "uppercase" }}>
                {playerName}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-light)" }}>THỐNG KÊ SỰ NGHIỆP XI</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "6px" }}>
                <div style={{ border: "1px solid var(--cream-border)", padding: "8px", borderRadius: "3px", backgroundColor: "var(--cream-dark)" }}>
                  <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.45rem", color: "var(--ink-light)" }}>TRẬN RA SÂN</span>
                  <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 700 }}>{careerTotalStats.apps}</div>
                </div>
                <div style={{ border: "1px solid var(--cream-border)", padding: "8px", borderRadius: "3px", backgroundColor: "var(--cream-dark)" }}>
                  <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.45rem", color: "var(--ink-light)" }}>G / A TỔNG</span>
                  <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 700 }}>{careerTotalStats.goals}G / {careerTotalStats.assists}A</div>
                </div>
              </div>
            </div>

            <div>
              <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-light)" }}>CÁC CÂU LẠC BỘ THI ĐẤU</span>
              <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {clubStints.map((st, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", borderBottom: "1px dashed var(--cream-border)", paddingBottom: "2px" }}>
                    <span>🏠 {st.clubName} ({st.leagueName})</span>
                    <span style={{ fontWeight: 700 }}>{st.yearsAtClub} Mùa</span>
                  </div>
                ))}
              </div>
            </div>

            {events.some(e => e.label.includes("BALLON D'OR")) && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", border: "1.5px solid var(--charcoal)", padding: "8px 12px", borderRadius: "3px", backgroundColor: "gold", boxShadow: "2px 2px 0 var(--charcoal)" }}>
                <Trophy size={20} color="var(--charcoal)" />
                <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.85rem", fontWeight: 900, textTransform: "uppercase" }}>ĐOẠT QUẢ BÓNG VÀNG BALLON D'OR!</span>
              </div>
            )}
          </div>

        </div>

        <div style={{ borderTop: "2px solid var(--charcoal)", paddingTop: "16px", display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            onClick={handleSavePlayer}
            disabled={isSaving}
            className="btn-primary"
            style={{
              fontSize: "1.1rem",
              padding: "14px 48px",
              backgroundColor: "var(--coral)",
              color: "var(--white)",
              opacity: isSaving ? 0.6 : 1,
              cursor: isSaving ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <RefreshCw size={18} className={isSaving ? "animate-spin" : ""} />
            {isSaving ? "ĐANG LƯU DỮ LIỆU..." : "LƯU THẺ CẦU THỦ & QUAY VỀ SQUAD BOARD"}
          </button>
        </div>

      </div>
    </main>
  );
}
