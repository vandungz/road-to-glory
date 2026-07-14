"use client";

import React, { useMemo } from "react";
import { X, CalendarDays, Sparkles } from "lucide-react";
import type { ClientSafePlayer } from "@/types/squad";
import { RARITY_ACCENT } from "@/types/squad";
import { PlayerOvrChart } from "./PlayerOvrChart";
import { PlayerStickerCard } from "./PlayerStickerCard";

interface PlayerCareerDialogProps {
  player: ClientSafePlayer | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerCareerDialog({ player, isOpen, onClose }: PlayerCareerDialogProps) {
  const statsTimeline = player?.statsTimeline ?? [];
  const clubStints = player?.clubStints ?? [];
  const debutAge = player?.debutAge ?? 18;
  const retireAge = player?.retireAge ?? 35;
  const careerLength = player?.careerLengthYears ?? 15;

  // Tính thống kê trọn đời từ statsTimeline
  const summaryStats = useMemo(() => {
    let apps = 0, goals = 0, assists = 0, cleanSheets = 0, ratingSum = 0, ratingCount = 0;
    statsTimeline.forEach((snap: any) => {
      apps += snap.apps ?? 0;
      goals += snap.goals ?? 0;
      assists += snap.assists ?? 0;
      cleanSheets += snap.cleanSheets ?? 0;
      if (snap.matchRating) { ratingSum += snap.matchRating; ratingCount++; }
    });
    const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(2) : "0.00";
    return { apps, goals, assists, cleanSheets, avgRating };
  }, [statsTimeline]);

  const finalClub = useMemo(() => {
    if (clubStints.length === 0) return "Tự do";
    return clubStints[clubStints.length - 1]?.clubName ?? "Tự do";
  }, [clubStints]);

  // Danh hiệu từ schema mới: achievements.trophies[]
  const trophiesList = useMemo(() => {
    if (!player?.achievements || typeof player.achievements !== "object") return [];
    const ach = player.achievements as any;
    const grouped = new Map<string, { type: string; name: string; icon: string; count: number }>();

    if ((ach.ballonDor ?? 0) > 0) {
      grouped.set("ballonDor", { type: "ballonDor", name: "Quả Bóng Vàng", icon: "🌟", count: ach.ballonDor });
    }

    (ach.trophies ?? []).forEach((t: any) => {
      const icon = t.type === "league" ? "🏆" : t.type === "cup" ? "🥛" : t.type === "continental" ? "🌍" : "🎖️";
      const displayName = t.club ? `${t.name} (${t.club})` : t.name;
      const key = `${t.type}-${t.name}-${t.club ?? ""}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.count++;
      } else {
        grouped.set(key, { type: t.type, name: displayName, icon, count: 1 });
      }
    });

    return Array.from(grouped.values());
  }, [player?.achievements]);

  // Per-season data: statsTimeline + clubStints + seasonAwards
  const seasonRows = useMemo(() => {
    const ach = (player?.achievements as any) ?? {};
    const seasonAwards: any[] = ach.seasonAwards ?? [];
    const rows = [];

    for (const snap of statsTimeline) {
      const age = snap.age;
      if (age >= retireAge) continue;
      const stint = clubStints.find((st: any) => age >= st.startAge && age <= st.endAge);
      const prevSnap = statsTimeline.find((s: any) => s.age === age - 1);
      const prevStint = prevSnap
        ? clubStints.find((st: any) => (age - 1) >= st.startAge && (age - 1) <= st.endAge)
        : null;
      const isTransfer = prevStint && stint && prevStint.clubId !== stint.clubId;

      rows.push({
        age,
        clubName: stint?.clubName ?? "—",
        leagueName: stint?.leagueName ?? "",
        snap,
        awards: seasonAwards.filter((a: any) => a.age === age),
        isTransfer,
      });
    }

    return rows.sort((a, b) => a.age - b.age);
  }, [statsTimeline, clubStints, player?.achievements, retireAge]);

  if (!isOpen || !player) return null;

  const rarityColor = RARITY_ACCENT[player.cardRarity] ?? "#71717a";

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(3px)", padding: "20px" }}
    >
      <div
        className="card-retro"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--cream)",
          width: "100%",
          maxWidth: "940px",
          height: "90vh",
          maxHeight: "680px",
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          overflow: "hidden",
          position: "relative",
          boxShadow: "8px 8px 0px var(--charcoal)",
          border: "3px solid var(--charcoal)",
          borderRadius: "4px",
          transform: "none",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Đóng bảng xem sự nghiệp"
          style={{
            position: "absolute", top: "12px", right: "12px",
            width: "30px", height: "30px",
            border: "2px solid var(--charcoal)", borderRadius: "3px",
            backgroundColor: "var(--white)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", boxShadow: "2px 2px 0 var(--charcoal)", zIndex: 10,
            transition: "transform 80ms ease, box-shadow 80ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(1px, 1px)"; e.currentTarget.style.boxShadow = "1px 1px 0 var(--charcoal)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "2px 2px 0 var(--charcoal)"; }}
        >
          <X size={16} strokeWidth={2.5} color="var(--charcoal)" />
        </button>

        {/* ── CỘT TRÁI ── */}
        <div style={{
          flex: "0 0 350px", height: "100%",
          borderRight: "2px solid var(--charcoal)",
          backgroundColor: "var(--cream-dark)",
          padding: "24px", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto",
        }}>
          <PlayerStickerCard
            player={player} finalClub={finalClub}
            debutAge={debutAge} retireAge={retireAge}
            careerLength={careerLength} rarityColor={rarityColor}
          />

          {/* Trophy Cabinet */}
          <div style={{ border: "2px solid var(--charcoal)", borderRadius: "3px", backgroundColor: "var(--white)", padding: "12px 14px", boxShadow: "2px 2px 0 var(--charcoal)" }}>
            <h4 style={{ fontFamily: "var(--font-headline)", fontSize: "0.8rem", color: "var(--charcoal)", borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "4px", marginBottom: "8px" }}>
              BỘ SƯU TẬP DANH HIỆU
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "130px", overflowY: "auto", paddingRight: "4px" }}>
              {trophiesList.length > 0 ? (
                trophiesList.map((tr, idx) => (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "4px 8px",
                    backgroundColor: tr.type === "ballonDor" ? "#fef3c7" : "var(--cream-dark)",
                    border: tr.type === "ballonDor" ? "1px solid #d97706" : "1px solid var(--cream-border)",
                    borderRadius: "3px", fontSize: "0.78rem", fontFamily: "var(--font-body)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "1rem" }}>{tr.icon}</span>
                      <span style={{ fontWeight: 600, color: "var(--charcoal)" }}>{tr.name}</span>
                    </div>
                    <span style={{
                      fontFamily: "var(--font-headline)", fontSize: "0.78rem", fontWeight: 700,
                      backgroundColor: tr.type === "ballonDor" ? "#d97706" : "var(--charcoal)",
                      color: "var(--white)", padding: "1px 6px", borderRadius: "2px", lineHeight: 1.1,
                    }}>
                      x{tr.count}
                    </span>
                  </div>
                ))
              ) : (
                <span style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--ink-light)", fontStyle: "italic", textAlign: "center", padding: "10px 0", width: "100%" }}>
                  Chưa đạt danh hiệu nào
                </span>
              )}
            </div>
          </div>

          {/* Lifetime Stats */}
          <div style={{ border: "2px solid var(--charcoal)", borderRadius: "3px", backgroundColor: "var(--white)", padding: "12px 14px", boxShadow: "2px 2px 0 var(--charcoal)" }}>
            <h4 style={{ fontFamily: "var(--font-headline)", fontSize: "0.8rem", color: "var(--charcoal)", borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "4px", marginBottom: "8px" }}>
              THỐNG KÊ TRỌN ĐỜI SỰ NGHIỆP
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                { label: "Trận đấu (Apps)", value: summaryStats.apps },
                { label: "Bàn thắng", value: summaryStats.goals },
                { label: "Kiến tạo", value: summaryStats.assists },
                { label: "Giữ sạch lưới", value: summaryStats.cleanSheets },
              ].map((stat, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", padding: "4px 8px", backgroundColor: "var(--cream-dark)", borderRadius: "2px", border: "1px solid var(--cream-border)" }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--ink-gray)", textTransform: "uppercase", fontWeight: 600 }}>{stat.label}</span>
                  <span style={{ fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 700, color: "var(--charcoal)" }}>{stat.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed var(--cream-border)" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--ink-gray)", fontWeight: 500 }}>Điểm Match Rating TB</span>
              <span style={{ fontFamily: "var(--font-headline)", fontSize: "1.25rem", fontWeight: 700, color: "var(--coral)" }}>{summaryStats.avgRating}</span>
            </div>
          </div>
        </div>

        {/* ── CỘT PHẢI ── */}
        <div style={{
          flex: "1 1 auto", height: "100%", padding: "24px",
          display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto",
        }}>
          <div>
            <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.58rem", color: "var(--ink-gray)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Player Evolution & History
            </span>
            <h2 style={{ fontFamily: "var(--font-headline)", fontSize: "1.6rem", fontWeight: 700, color: "var(--charcoal)", marginTop: "2px", lineHeight: 1.1 }}>
              TIẾN TRÌNH SỰ NGHIỆP CẦU THỦ
            </h2>
          </div>

          {/* OVR Chart */}
          <div style={{ border: "2px solid var(--charcoal)", borderRadius: "3px", backgroundColor: "var(--white)", padding: "14px 16px", boxShadow: "3px 3px 0 var(--charcoal)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ fontFamily: "var(--font-headline)", fontSize: "0.85rem", color: "var(--charcoal)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={14} color="var(--coral)" /> BIỂU ĐỒ PHÁT TRIỂN CHỈ SỐ OVR THEO TUỔI
              </h3>
              <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)" }}>
                MIN {Math.min(...statsTimeline.map((s: any) => s.ovr), 50)} · PEAK {player.peakOvr}
              </span>
            </div>
            <PlayerOvrChart statsTimeline={statsTimeline} debutAge={debutAge} retireAge={retireAge} peakOvr={player.peakOvr} />
          </div>

          {/* Per-season stats */}
          <div style={{ border: "2px solid var(--charcoal)", borderRadius: "3px", backgroundColor: "var(--white)", padding: "14px 16px", boxShadow: "3px 3px 0 var(--charcoal)", display: "flex", flexDirection: "column", flex: 1 }}>
            <h3 style={{ fontFamily: "var(--font-headline)", fontSize: "0.85rem", color: "var(--charcoal)", borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "6px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <CalendarDays size={14} color="var(--coral)" /> THỐNG KÊ TỪNG MÙA GIẢI
            </h3>

            <div style={{ overflowY: "auto", maxHeight: "260px", paddingRight: "8px", flex: 1 }}>
              {seasonRows.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "var(--ink-light)", fontFamily: "var(--font-body)", fontStyle: "italic", fontSize: "0.85rem" }}>
                  Chưa có dữ liệu mùa giải.
                </div>
              ) : (
                <div style={{ position: "relative", paddingLeft: "20px", borderLeft: "2px solid var(--cream-border)" }}>
                  {seasonRows.map((row, idx) => (
                    <div key={idx} style={{ position: "relative", marginBottom: "18px" }}>
                      {/* Timeline node */}
                      <div style={{
                        position: "absolute", left: "-27px", top: "3px",
                        width: "12px", height: "12px", borderRadius: "50%",
                        border: "2px solid var(--charcoal)",
                        backgroundColor: row.age === debutAge ? "var(--coral)" : "var(--white)",
                        zIndex: 2,
                      }} />

                      {/* Age + club + OVR */}
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "6px 10px" }}>
                        <span style={{
                          fontFamily: "var(--font-headline)", fontSize: "0.8rem", fontWeight: 700,
                          color: "var(--white)", backgroundColor: "var(--charcoal)",
                          padding: "1px 6px", borderRadius: "2px",
                        }}>
                          TUỔI {row.age}
                        </span>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", fontWeight: 700, color: "var(--charcoal)" }}>
                          {row.clubName}
                          {row.leagueName ? <span style={{ fontWeight: 400, color: "var(--ink-gray)", fontSize: "0.78rem" }}> · {row.leagueName}</span> : null}
                        </span>
                        {row.isTransfer && (
                          <span style={{ fontSize: "0.7rem", color: "#3b82f6", fontFamily: "var(--font-stamp)", letterSpacing: "0.05em" }}>
                            ✈ Chuyển nhượng
                          </span>
                        )}
                        {row.snap && (
                          <span style={{
                            fontFamily: "var(--font-headline)", fontSize: "0.72rem", color: "var(--ink-gray)", fontWeight: 600,
                            backgroundColor: "var(--cream-dark)", padding: "0px 6px", borderRadius: "2px", border: "1px solid var(--cream-border)",
                          }}>
                            OVR {row.snap.ovr}
                          </span>
                        )}
                      </div>

                      {/* Season stats */}
                      {row.snap && row.snap.apps !== undefined && (
                        <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-gray)", marginTop: "4px" }}>
                          {row.snap.apps} Trận · {row.snap.goals} Bàn · {row.snap.assists} Kiến tạo · MR {row.snap.matchRating?.toFixed(2) ?? "—"}
                        </div>
                      )}

                      {/* Individual awards */}
                      {row.awards.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "5px" }}>
                          {row.awards.map((award: any, aIdx: number) => (
                            <div key={aIdx} style={{
                              fontFamily: "var(--font-body)", fontSize: "0.75rem",
                              padding: "3px 8px", borderRadius: "2px",
                              border: "1px solid #d97706",
                              backgroundColor: "#fef3c7",
                              color: "var(--charcoal)",
                              borderLeft: "3px solid #d97706",
                            }}>
                              🥇 {award.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
