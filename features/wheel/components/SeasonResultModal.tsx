"use client";

import { X } from "lucide-react";
import type { SeasonRecord, CompetitionStats } from "@/types/game";
import { getDomesticCupName, getContinentalCupLabel } from "../lib/simulation-helpers";

interface Props {
  type: "league" | "cup" | "continental" | "national";
  record: SeasonRecord;
  currentContinentalCup: string;
  playerDebutAge: number;
  onClose: () => void;
}

function getCupResultLabel(result: string | null | undefined): string {
  if (!result || result === "Chờ quay") return "—";
  if (result === "Winner") return "🏆 VÔ ĐỊCH";
  if (result === "Runner-Up") return "Á QUÂN";
  if (result === "Semi-Finals") return "BÁN KẾT";
  return "VÒNG LOẠI";
}

function StatsBar({ stats, position }: { stats: CompetitionStats; position?: string }) {
  const showCS = stats.cleanSheets > 0;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: showCS ? "repeat(5, 1fr)" : "repeat(4, 1fr)",
      gap: "6px",
      padding: "8px",
      backgroundColor: "var(--cream-dark)",
      borderRadius: "3px",
      border: "1.5px solid var(--cream-border)",
      textAlign: "center",
    }}>
      {[
        { label: "APPS", value: stats.apps },
        { label: "GOALS", value: stats.goals },
        { label: "ASSISTS", value: stats.assists },
        ...(showCS ? [{ label: "CS", value: stats.cleanSheets, highlight: true }] : []),
        { label: "RATING", value: stats.rating.toFixed(2) },
      ].map(({ label, value, highlight }) => (
        <div key={label} style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.42rem", color: (highlight as boolean) ? "var(--coral)" : "var(--ink-gray)", fontWeight: 700 }}>
            {label}
          </span>
          <strong style={{ fontSize: "0.82rem", color: (highlight as boolean) ? "var(--coral)" : "var(--charcoal)" }}>
            {value}
          </strong>
        </div>
      ))}
    </div>
  );
}

export function SeasonResultModal({ type, record, currentContinentalCup, playerDebutAge, onClose }: Props) {
  let title = "";
  let result = "";
  let journey: string[] = [];
  let stats: CompetitionStats | undefined;
  let isChampion = false;

  if (type === "league") {
    title = record.leagueName || "Giải VĐQG";
    result = record.standing !== null && record.standing !== undefined
      ? record.standing === 1 ? "🏆 VÔ ĐỊCH" : `HẠNG #${record.standing}`
      : "—";
    isChampion = record.standing === 1;
    stats = record.leagueStats;
  } else if (type === "cup") {
    title = getDomesticCupName(record.leagueName);
    result = getCupResultLabel(record.domesticCup);
    journey = record.domesticCupJourney ?? [];
    isChampion = record.domesticCup === "Winner";
    stats = record.domesticCupStats;
  } else if (type === "continental") {
    title = getContinentalCupLabel(record.continentalCup?.type ?? currentContinentalCup);
    result = getCupResultLabel(record.continentalCup?.result);
    journey = record.continentalCupJourney ?? [];
    isChampion = record.continentalCup?.result === "Winner";
    stats = record.continentalStats;
  } else if (type === "national") {
    title = record.nationalTeam?.type ?? "ĐTQG";
    const nat = record.nationalTeam;
    result = nat?.result
      ? getCupResultLabel(nat.result)
      : nat?.callup === "Không được gọi" ? "KHÔNG ĐƯỢC GỌI" : "—";
    journey = record.nationalTeamJourney ?? [];
    isChampion = nat?.result === "Winner";
    stats = record.nationalStats;
  }

  const isNational = type === "national";
  const accentColor = isNational ? "var(--coral)" : "var(--charcoal)";

  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {type === "league" ? "GIẢI VĐQG" : type === "cup" ? "CÚP QUỐC GIA" : type === "continental" ? "CÚP CHÂU LỤC" : "ĐỘI TUYỂN QUỐC GIA"}
            </div>
            <h2 style={{ fontFamily: "var(--font-headline)", fontSize: "1rem", fontWeight: 900, textTransform: "uppercase", color: accentColor, margin: "2px 0 0" }}>
              {title}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
            <X size={18} color="var(--ink-gray)" />
          </button>
        </div>

        {/* Result badge */}
        <div style={{
          padding: "10px 14px",
          backgroundColor: isChampion ? "rgba(255,111,97,0.1)" : "var(--cream-dark)",
          border: `2px solid ${isChampion ? "var(--coral)" : "var(--cream-border)"}`,
          borderRadius: "4px",
          textAlign: "center",
        }}>
          <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.48rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>KẾT QUẢ</div>
          <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.1rem", fontWeight: 900, color: isChampion ? "var(--coral)" : "var(--charcoal)", marginTop: "2px" }}>
            {result}
          </div>
        </div>

        {/* Stats */}
        {stats ? (
          <div>
            <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.48rem", color: "var(--ink-gray)", textTransform: "uppercase", marginBottom: "6px" }}>
              THỐNG KÊ {type === "league" ? "GIẢI ĐẤU" : type === "cup" ? "CÚP QUỐC GIA" : type === "continental" ? "CHÂU LỤC" : "ĐTQG"}
            </div>
            <StatsBar stats={stats} />
          </div>
        ) : (
          <div style={{ padding: "8px 10px", backgroundColor: "var(--cream-dark)", border: "1px dashed var(--cream-border)", borderRadius: "3px" }}>
            <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-light)", fontStyle: "italic" }}>
              Thống kê chi tiết sẽ có sau khi kết thúc mùa giải
            </span>
          </div>
        )}

        {/* League table */}
        {type === "league" && record.leagueTable && record.leagueTable.length > 0 && (
          <div>
            <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.48rem", color: "var(--ink-gray)", textTransform: "uppercase", marginBottom: "6px" }}>BẢNG XẾP HẠNG</div>
            <div style={{ fontSize: "0.72rem", maxHeight: "220px", overflowY: "auto", border: "1px solid var(--cream-border)", borderRadius: "3px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 38px", fontWeight: 700, borderBottom: "1px solid var(--charcoal)", padding: "4px 8px", backgroundColor: "var(--cream-dark)" }}>
                <span>POS</span><span>CLUB</span><span style={{ textAlign: "right" }}>PTS</span>
              </div>
              {record.leagueTable.map((row: any, i: number) => {
                const isPlayer = row.name.toLowerCase() === record.clubName.toLowerCase();
                return (
                  <div key={i} style={{
                    display: "grid",
                    gridTemplateColumns: "28px 1fr 38px",
                    padding: "3px 8px",
                    backgroundColor: isPlayer ? "rgba(255,111,97,0.08)" : "transparent",
                    color: isPlayer ? "var(--coral)" : "var(--charcoal)",
                    fontWeight: isPlayer ? 800 : 400,
                  }}>
                    <span>{i + 1}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
                    <span style={{ textAlign: "right" }}>{row.points}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cup journey */}
        {journey.length > 0 && (
          <div>
            <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.48rem", color: "var(--ink-gray)", textTransform: "uppercase", marginBottom: "6px" }}>HÀNH TRÌNH</div>
            <ul style={{ paddingLeft: "14px", margin: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
              {journey.map((j, idx) => (
                <li key={idx} style={{ fontSize: "0.72rem", color: isNational ? "var(--coral)" : "var(--charcoal)" }}>{j}</li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </Overlay>
  );
}

// ── Shared overlay wrapper ──────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
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
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}
