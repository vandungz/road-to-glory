"use client";

import React, { useState } from "react";
import { X, ChevronDown, ChevronUp, Trophy, Star, Shield, Award, Globe } from "lucide-react";
import type { SeasonRecord, CompetitionStats } from "@/types/game";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import { getDomesticCupName, getContinentalCupLabel, getSeasonYearString } from "../lib/simulation-helpers";

interface Props {
  record: SeasonRecord;
  yearSimResult: SimulatedSeasonResult;
  currentContinentalCup: string;
  playerDebutAge: number;
  onClose: () => void;
}

function MiniStatsBadge({ stats }: { stats?: CompetitionStats }) {
  if (!stats || stats.apps === 0) return <span style={{ color: "var(--ink-light)", fontSize: "0.7rem" }}>—</span>;
  return (
    <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.72rem", fontWeight: 700, color: "var(--charcoal)" }}>
      {stats.apps} apps · {stats.goals}G {stats.assists}A · ★{stats.rating.toFixed(1)}
    </span>
  );
}

export function SeasonRecapModal({ record, yearSimResult, currentContinentalCup, playerDebutAge, onClose }: Props) {
  const [expandedTile, setExpandedTile] = useState<string | null>(null);

  const toggleExpand = (tile: string) => {
    setExpandedTile((prev) => (prev === tile ? null : tile));
  };

  const seasonYearStr = getSeasonYearString(record.age, playerDebutAge);
  const awards = yearSimResult.events?.filter((e) => e.type === "individual_award") ?? [];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 50,
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
          maxWidth: "620px",
          maxHeight: "90vh",
          backgroundColor: "var(--white)",
          border: "2px solid var(--charcoal)",
          borderRadius: "4px",
          boxShadow: "6px 6px 0 var(--charcoal)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            backgroundColor: "var(--cream-dark)",
            borderBottom: "2px solid var(--charcoal)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "var(--font-stamp)",
                fontSize: "0.55rem",
                color: "var(--coral)",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              SEASON RECAP · MÙA GIẢI {seasonYearStr} (TUỔI {record.age})
            </span>
            <h2
              style={{
                fontFamily: "var(--font-headline)",
                fontSize: "1.35rem",
                fontWeight: 900,
                color: "var(--charcoal)",
                margin: "2px 0 0 0",
                textTransform: "uppercase",
              }}
            >
              TỔNG KẾT MÙA GIẢI {record.clubName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "1.5px solid var(--charcoal)",
              borderRadius: "3px",
              padding: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--white)",
            }}
          >
            <X size={18} color="var(--charcoal)" />
          </button>
        </div>

        {/* CONTENT BODY */}
        <div style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* OVERALL STATS GRID */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: yearSimResult.cleanSheets > 0 ? "repeat(5, 1fr)" : "repeat(4, 1fr)",
              gap: "8px",
              backgroundColor: "var(--cream)",
              border: "1.5px solid var(--charcoal)",
              borderRadius: "4px",
              padding: "12px 8px",
              textAlign: "center",
              boxShadow: "2px 2px 0 var(--charcoal)",
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)" }}>APPS</div>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 900 }}>{yearSimResult.apps}</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)" }}>GOALS</div>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 900 }}>{yearSimResult.goals}</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)" }}>ASSISTS</div>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 900 }}>{yearSimResult.assists}</div>
            </div>
            {yearSimResult.cleanSheets > 0 && (
              <div>
                <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--coral)" }}>CLEAN SHEETS</div>
                <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 900, color: "var(--coral)" }}>{yearSimResult.cleanSheets}</div>
              </div>
            )}
            <div>
              <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)" }}>RATING</div>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 900, color: "#266b3e" }}>
                ★ {yearSimResult.matchRating.toFixed(2)}
              </div>
            </div>
          </div>

          {/* COMPETITION TILES (SKIM -> DRILL DOWN) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.85rem", fontWeight: 700, color: "var(--charcoal)" }}>
              CHI TIẾT CÁC GIẢI ĐẤU
            </span>

            {/* LEAGUE TILE */}
            <div
              style={{
                border: "1.5px solid var(--charcoal)",
                borderRadius: "4px",
                backgroundColor: "var(--white)",
                overflow: "hidden",
                boxShadow: "2px 2px 0 var(--charcoal)",
              }}
            >
              <div
                onClick={() => toggleExpand("league")}
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  backgroundColor: expandedTile === "league" ? "var(--cream)" : "var(--white)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Shield size={16} color="#266b3e" />
                  <div>
                    <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.9rem", fontWeight: 700 }}>
                      BẢNG XẾP HẠNG VÔ ĐỊCH QUỐC GIA
                    </span>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--coral)" }}>
                      HẠNG #{record.standing ?? "—"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <MiniStatsBadge stats={record.leagueStats} />
                  {expandedTile === "league" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {expandedTile === "league" && record.leagueTable && (
                <div style={{ padding: "12px", borderTop: "1px solid var(--cream-border)", backgroundColor: "var(--cream)" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "8px" }}>BẢNG XẾP HẠNG CHI TIẾT</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "240px", overflowY: "auto" }}>
                    {record.leagueTable.map((row: any, idx: number) => {
                      const rank = idx + 1;
                      const clubName = row.name ?? row.clubName ?? "Unknown";
                      const isPlayer = clubName.toLowerCase() === record.clubName.toLowerCase();

                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: "0.75rem",
                            fontWeight: isPlayer ? 800 : 500,
                            backgroundColor: isPlayer ? "var(--cream-dark)" : "var(--white)",
                            color: isPlayer ? "var(--coral)" : "var(--charcoal)",
                            padding: "4px 8px",
                            borderRadius: "3px",
                            borderLeft: isPlayer ? "3px solid var(--coral)" : "1px solid var(--cream-border)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontFamily: "var(--font-stamp)", width: "24px", fontWeight: 700 }}>#{rank}</span>
                            <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.82rem" }}>
                              {clubName} {isPlayer ? "(BẠN)" : ""}
                            </span>
                          </div>
                          <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.72rem" }}>
                            <strong>{row.points} PTS</strong> · {row.played}P ({row.won}W {row.drawn}D {row.lost}L)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* DOMESTIC CUP TILE */}
            <div
              style={{
                border: "1.5px solid var(--charcoal)",
                borderRadius: "4px",
                backgroundColor: "var(--white)",
                overflow: "hidden",
                boxShadow: "2px 2px 0 var(--charcoal)",
              }}
            >
              <div
                onClick={() => toggleExpand("cup")}
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  backgroundColor: expandedTile === "cup" ? "var(--cream)" : "var(--white)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Trophy size={16} color="#D4960D" />
                  <div>
                    <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.9rem", fontWeight: 700 }}>
                      CÚP QUỐC GIA ({getDomesticCupName(record.leagueName)})
                    </span>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--charcoal)" }}>
                      {record.domesticCup === "Winner" ? "🏆 VÔ ĐỊCH" : record.domesticCup === "Runner-Up" ? "Á QUÂN" : record.domesticCup === "Semi-Finals" ? "BÁN KẾT" : "VÒNG LOẠI"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <MiniStatsBadge stats={record.domesticCupStats} />
                  {expandedTile === "cup" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {expandedTile === "cup" && record.domesticCupJourney && (
                <div style={{ padding: "12px", borderTop: "1px solid var(--cream-border)", backgroundColor: "var(--cream)" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "6px" }}>HÀNH TRÌNH THI ĐẤU CÚP QUỐC GIA</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {record.domesticCupJourney.map((j, i) => (
                      <div key={i} style={{ fontSize: "0.72rem", color: "var(--charcoal)" }}>• {j}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CONTINENTAL CUP TILE */}
            {currentContinentalCup !== "none" && (
              <div
                style={{
                  border: "1.5px solid var(--charcoal)",
                  borderRadius: "4px",
                  backgroundColor: "var(--white)",
                  overflow: "hidden",
                  boxShadow: "2px 2px 0 var(--charcoal)",
                }}
              >
                <div
                  onClick={() => toggleExpand("continental")}
                  style={{
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    backgroundColor: expandedTile === "continental" ? "var(--cream)" : "var(--white)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Star size={16} color="#3B82F6" />
                    <div>
                      <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.9rem", fontWeight: 700 }}>
                        {getContinentalCupLabel(currentContinentalCup)}
                      </span>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#3B82F6" }}>
                        {record.continentalCup?.result === "Winner" ? "🏆 VÔ ĐỊCH" : record.continentalCup?.result ?? "Tham gia"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <MiniStatsBadge stats={record.continentalStats} />
                    {expandedTile === "continental" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {expandedTile === "continental" && record.continentalCupJourney && (
                  <div style={{ padding: "12px", borderTop: "1px solid var(--cream-border)", backgroundColor: "var(--cream)" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "6px" }}>HÀNH TRÌNH CÚP LỤC ĐỊA</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {record.continentalCupJourney.map((j, i) => (
                        <div key={i} style={{ fontSize: "0.72rem", color: "var(--charcoal)" }}>• {j}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* NATIONAL TEAM TILE */}
            {record.nationalTeam && record.nationalTeam.callup !== "Không được gọi" && (
              <div
                style={{
                  border: "1.5px solid var(--charcoal)",
                  borderRadius: "4px",
                  backgroundColor: "var(--white)",
                  overflow: "hidden",
                  boxShadow: "2px 2px 0 var(--charcoal)",
                }}
              >
                <div
                  onClick={() => toggleExpand("national")}
                  style={{
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    backgroundColor: expandedTile === "national" ? "var(--cream)" : "var(--white)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Globe size={16} color="var(--coral)" />
                    <div>
                      <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.9rem", fontWeight: 700 }}>
                        {record.nationalTeam.type ?? "ĐỘI TUYỂN QUỐC GIA"}
                      </span>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--coral)" }}>
                        {record.nationalTeam.result === "Winner" ? "🏆 VÔ ĐỊCH QUỐC TẾ" : record.nationalTeam.result ?? record.nationalTeam.callup}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <MiniStatsBadge stats={record.nationalStats} />
                    {expandedTile === "national" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {expandedTile === "national" && record.nationalTeamJourney && (
                  <div style={{ padding: "12px", borderTop: "1px solid var(--cream-border)", backgroundColor: "var(--cream)" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "6px" }}>HÀNH TRÌNH ĐỘI TUYỂN QUỐC GIA</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {record.nationalTeamJourney.map((j, i) => (
                        <div key={i} style={{ fontSize: "0.72rem", color: "var(--charcoal)" }}>• {j}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AWARDS SECTION */}
            {awards.length > 0 && (
              <div style={{ backgroundColor: "var(--gold-light)", border: "1.5px solid #D4960D", borderRadius: "4px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <Award size={20} color="#D4960D" />
                <div>
                  <div style={{ fontFamily: "var(--font-headline)", fontSize: "0.85rem", fontWeight: 700, color: "#D4960D" }}>
                    DANH HIỆU CÁ NHÂN
                  </div>
                  {awards.map((a, i) => (
                    <div key={i} style={{ fontSize: "0.75rem", fontWeight: 600 }}>• {a.label}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PRIMARY CTA */}
          <button
            type="button"
            onClick={onClose}
            className="btn-primary"
            style={{
              width: "100%",
              fontSize: "1.05rem",
              padding: "12px",
              minHeight: "48px",
              backgroundColor: "var(--coral)",
              color: "var(--white)",
              marginTop: "8px",
            }}
          >
            TIẾP TỤC HÀNH TRÌNH →
          </button>
        </div>
      </div>
    </div>
  );
}
