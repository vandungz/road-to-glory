"use client";

import { getFlagEmoji } from "@/types/squad";

interface PaniniStickerProps {
  playerName: string;
  position: string;
  playerNationality: string;
  currentOvr: number;
  currentAge: number;
  playerDebutAge: number;
  playerCareerLength: number;
  currentContinentalCup: string;
  standingResult: number | null;
  domesticCupResult: string | null;
  continentalCupResult: string | null;
  nationalCallupResult: string | null;
  nationalTournamentResult: string | null;
  hasBallonDorWinner: boolean;
  currentStats: Record<string, number>;
  evolvedStatsThisYear: Array<{ stat: string; delta: number }>;
  currentClubName?: string;
}

function getContinentalCupLabel(cupType: string): string {
  switch (cupType) {
    case "UCL": return "UEFA Champions League";
    case "UEL": return "UEFA Europa League";
    case "UECL": return "UEFA Conference League";
    case "Libertadores": return "Copa Libertadores";
    case "AFC_CL": return "AFC Champions League";
    case "CONCACAF_CC": return "CONCACAF Champions Cup";
    default: return "Cúp Châu Lục CLB";
  }
}

function getSeasonYearString(age: number, debutAge: number): string {
  const startYear = 2025 + (age - debutAge);
  const endYearShort = (startYear + 1) % 100;
  const endYearStr = endYearShort < 10 ? `0${endYearShort}` : `${endYearShort}`;
  return `${startYear}/${endYearStr}`;
}

export function PaniniSticker({
  playerName,
  position,
  playerNationality,
  currentOvr,
  currentAge,
  playerDebutAge,
  playerCareerLength,
  currentContinentalCup,
  standingResult,
  domesticCupResult,
  continentalCupResult,
  nationalCallupResult,
  nationalTournamentResult,
  hasBallonDorWinner,
  currentStats,
  evolvedStatsThisYear,
  currentClubName,
}: PaniniStickerProps) {
  const retirementAge = playerDebutAge + playerCareerLength;

  return (
    <div style={{ flex: "0 0 360px", width: "360px", display: "flex", flexDirection: "column", gap: "18px", margin: "0 auto" }}>
      <div style={{
        backgroundColor: "var(--white)",
        border: "2px solid var(--charcoal)",
        borderRadius: "4px",
        boxShadow: "3px 3px 0 var(--charcoal)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        aspectRatio: "2 / 3",
        position: "relative",
        overflow: "hidden"
      }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "6px", marginBottom: "12px" }}>
          <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.52rem", color: "var(--ink-gray)", letterSpacing: "0.08em", textTransform: "uppercase" }}>PANINI LIVE STICKER</span>
          <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.68rem", fontWeight: 700, color: "var(--coral)", textTransform: "uppercase" }}>{position}</span>
        </div>

        <div style={{ flex: "1 1 auto", backgroundColor: "var(--cream-dark)", border: "2px dashed var(--cream-border)", borderRadius: "3px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", marginBottom: "12px", position: "relative" }}>
          <div style={{ position: "absolute", top: "10px", right: "10px", fontSize: "1.75rem" }}>{getFlagEmoji(playerNationality)}</div>
          <div style={{ position: "absolute", bottom: "10px", left: "10px", fontFamily: "var(--font-headline)", fontSize: "2rem", fontWeight: 700 }}>{currentOvr}</div>
          <div style={{ position: "absolute", top: "10px", left: "10px", fontFamily: "var(--font-stamp)", fontSize: "0.48rem", border: "1px solid rgba(0,0,0,0.15)", padding: "2px 4px", borderRadius: "2px" }}>LIVE STAMP</div>
          
          {/* HÀNG STAMPS THÀNH TÍCH MÙA GIẢI HIỆN TẠI */}
          <div style={{
            position: "absolute",
            top: "38px",
            left: "10px",
            right: "10px",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            justifyContent: "flex-start",
            zIndex: 5,
          }}>
            {/* 1. Stamp Vé Dự Cúp Châu Lục Đầu Năm */}
            {currentContinentalCup !== "none" && (
              <span style={{
                fontFamily: "var(--font-stamp)",
                fontSize: "0.42rem",
                fontWeight: 900,
                backgroundColor: "var(--charcoal)",
                color: "var(--white)",
                padding: "2px 5px",
                borderRadius: "2px",
                border: "1px solid var(--white)",
                boxShadow: "1px 1.5px 0 rgba(0,0,0,0.3)",
                letterSpacing: "0.05em",
                textTransform: "uppercase"
              }} title={`Mùa này tham dự ${getContinentalCupLabel(currentContinentalCup)}`}>
                🎫 {currentContinentalCup}
              </span>
            )}

            {/* 2. Stamp Thứ Hạng League */}
            {standingResult !== null && (
              <span style={{
                fontFamily: "var(--font-headline)",
                fontSize: "0.55rem",
                fontWeight: 800,
                backgroundColor: standingResult === 1 ? "gold" : "var(--white)",
                color: "var(--charcoal)",
                padding: "2px 6px",
                borderRadius: "12px",
                border: "1px solid var(--charcoal)",
                boxShadow: "1px 1.5px 0 rgba(0,0,0,0.3)"
              }}>
                L: #{standingResult}
              </span>
            )}

            {/* 3. Stamp Cup Quốc Gia */}
            {domesticCupResult !== null && domesticCupResult !== "Early Exit" && (
              <span style={{
                fontFamily: "var(--font-headline)",
                fontSize: "0.52rem",
                fontWeight: 800,
                backgroundColor: "var(--white)",
                color: "var(--charcoal)",
                padding: "2px 5px",
                borderRadius: "3px",
                border: "1px solid var(--charcoal)",
                boxShadow: "1px 1.5px 0 rgba(0,0,0,0.3)"
              }}>
                🏆 Cup: {domesticCupResult === "Winner" ? "Win" : "RU"}
              </span>
            )}

            {/* 4. Stamp Continental Cup */}
            {continentalCupResult !== null && currentContinentalCup !== "none" && continentalCupResult !== "Group Stage" && (
              <span style={{
                fontFamily: "var(--font-headline)",
                fontSize: "0.52rem",
                fontWeight: 800,
                backgroundColor: continentalCupResult === "Winner" ? "gold" : "var(--charcoal)",
                color: continentalCupResult === "Winner" ? "var(--charcoal)" : "var(--white)",
                padding: "2px 5px",
                borderRadius: "3px",
                border: "1px solid var(--charcoal)",
                boxShadow: "1px 1.5px 0 rgba(0,0,0,0.3)"
              }}>
                🌍 {currentContinentalCup}: {continentalCupResult === "Winner" ? "Win" : "SF/RU"}
              </span>
            )}

            {/* 5. Stamp ĐTQG */}
            {nationalCallupResult === "called_up" && (
              <span style={{
                fontFamily: "var(--font-stamp)",
                fontSize: "0.45rem",
                fontWeight: 900,
                backgroundColor: "var(--coral)",
                color: "var(--white)",
                padding: "2px 5px",
                borderRadius: "2px",
                border: "1px solid var(--white)",
                boxShadow: "1px 1.5px 0 rgba(0,0,0,0.3)"
              }}>
                🇸🇬 NT {nationalTournamentResult ? (nationalTournamentResult === "Winner" ? "🏆" : "RU") : "Callup"}
              </span>
            )}

            {/* 6. Stamp Ballon d'Or */}
            {hasBallonDorWinner && (
              <span style={{
                fontFamily: "var(--font-headline)",
                fontSize: "0.5rem",
                fontWeight: 900,
                backgroundColor: "gold",
                color: "var(--charcoal)",
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1.5px solid var(--charcoal)",
                boxShadow: "1px 1.5px 0 rgba(0,0,0,0.4)"
              }}>
                👑 BALLON D'OR
              </span>
            )}
          </div>

          <div style={{ width: "66px", height: "80px", borderRadius: "50% 50% 0 0", backgroundColor: "var(--cream-border)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--cream-border)", paddingBottom: "3px" }}>
            <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>Cầu Thủ</span>
            <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", fontWeight: 700 }}>{playerName.toUpperCase()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--cream-border)", paddingBottom: "3px" }}>
            <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>Mùa & Tuổi Hiện Tại</span>
            <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", fontWeight: 700 }}>MÙA {getSeasonYearString(currentAge, playerDebutAge)} ({currentAge}T)</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", borderBottom: "1px solid var(--cream-border)", padding: "4px 0", textAlign: "center", backgroundColor: "var(--cream-dark)", borderRadius: "3px" }}>
            {[
              { label: "PAC", key: "pac", val: currentStats.pac },
              { label: "SHO", key: "sho", val: currentStats.sho },
              { label: "PAS", key: "pas", val: currentStats.pas },
              { label: "DRI", key: "dri", val: currentStats.dri },
              { label: "DEF", key: "def", val: currentStats.def },
              { label: "PHY", key: "phy", val: currentStats.phy },
            ].map((st) => {
              const ev = evolvedStatsThisYear.find(e => e.stat === st.key);
              return (
                <div key={st.label} style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.45rem", color: "var(--ink-gray)" }}>{st.label}</span>
                  <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "1px" }}>
                    {st.val}
                    {ev && (
                      <span style={{ fontSize: "0.55rem", color: ev.delta > 0 ? "#10B981" : "#EF4444", fontWeight: 900 }} title={ev.delta > 0 ? `Tăng +${ev.delta}` : `Giảm ${ev.delta}`}>
                        {ev.delta > 0 ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--cream-border)", paddingBottom: "3px" }}>
            <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>Mùa Giải Cuối</span>
            <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", fontWeight: 700 }}>{getSeasonYearString(retirementAge, playerDebutAge)} ({retirementAge}T)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "2px" }}>
            <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>CLB Đang Thi Đấu</span>
            <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", fontWeight: 700, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentClubName ? currentClubName.toUpperCase() : "CHƯA CÓ"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
