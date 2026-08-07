"use client";

import { getFlagEmoji } from "@/types/squad";
import { getContinentalCupLabel } from "@/lib/competitions";

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
  cleanSheets?: number;
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
  cleanSheets,
}: PaniniStickerProps) {
  const retirementAge = playerDebutAge + playerCareerLength;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "var(--white)",
        border: "2px solid var(--charcoal)",
        borderRadius: "4px",
        boxShadow: "3px 3px 0 var(--charcoal)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "12px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "6px" }}>
        <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.52rem", color: "var(--ink-gray)", letterSpacing: "0.08em", textTransform: "uppercase" }}>PANINI LIVE STICKER</span>
        <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.68rem", fontWeight: 700, color: "var(--coral)", textTransform: "uppercase" }}>{position}</span>
      </div>

      <div style={{ flex: "1 1 auto", backgroundColor: "var(--cream-dark)", border: "2px dashed var(--cream-border)", borderRadius: "3px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", position: "relative", minHeight: "140px" }}>
        <div style={{ position: "absolute", top: "10px", right: "10px", fontSize: "1.75rem" }}>{getFlagEmoji(playerNationality)}</div>
        <div style={{ position: "absolute", bottom: "10px", left: "10px", fontFamily: "var(--font-headline)", fontSize: "2rem", fontWeight: 700 }}>{currentOvr}</div>
        <div style={{ position: "absolute", top: "10px", left: "10px", fontFamily: "var(--font-stamp)", fontSize: "0.48rem", border: "1px solid rgba(0,0,0,0.15)", padding: "2px 4px", borderRadius: "2px" }}>LIVE STAMP</div>
        
        <div style={{ width: "66px", height: "80px", borderRadius: "50% 50% 0 0", backgroundColor: "var(--cream-border)" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ textAlign: "center", borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "4px" }}>
          <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.9rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {playerName}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", border: "1.5px solid var(--charcoal)", padding: "6px 2px", textAlign: "center", backgroundColor: "var(--cream)", borderRadius: "4px", boxShadow: "2px 2px 0 var(--charcoal)" }}>
          {(position === "GK"
            ? [
                { label: "DIV", key: "div", val: currentStats.div },
                { label: "HAN", key: "han", val: currentStats.han },
                { label: "KIC", key: "kic", val: currentStats.kic },
                { label: "REF", key: "ref", val: currentStats.ref },
                { label: "SPD", key: "spd", val: currentStats.spd },
                { label: "POS", key: "pos", val: currentStats.pos },
              ]
            : [
                { label: "PAC", key: "pac", val: currentStats.pac },
                { label: "SHO", key: "sho", val: currentStats.sho },
                { label: "PAS", key: "pas", val: currentStats.pas },
                { label: "DRI", key: "dri", val: currentStats.dri },
                { label: "DEF", key: "def", val: currentStats.def },
                { label: "PHY", key: "phy", val: currentStats.phy },
              ]
          ).map((st) => {
            const ev = evolvedStatsThisYear.find(e => e.stat === st.key);
            return (
              <div key={st.label} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.48rem", color: "var(--ink-gray)", fontWeight: 700 }}>{st.label}</span>
                <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.82rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: "1px" }}>
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

        {["GK", "CB", "LB", "RB", "CDM"].includes(position) && cleanSheets !== undefined && (
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--cream-border)", paddingBottom: "3px" }}>
            <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>Trận giữ sạch lưới</span>
            <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", fontWeight: 700, color: "var(--coral)" }}>{cleanSheets} Trận</span>
          </div>
        )}
      </div>

      {/* FOOTER BAR */}
      <div
        style={{
          borderTop: "1.5px dashed var(--charcoal)",
          paddingTop: "10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.72rem",
          fontFamily: "var(--font-stamp)",
          opacity: 0.85,
        }}
      >
        <span>MÙA GIẢI: <strong>{getSeasonYearString(currentAge, playerDebutAge)} ({currentAge}T)</strong></span>
        <span>GIẢI NGHỆ: <strong>{retirementAge}T</strong></span>
      </div>
    </div>
  );
}
