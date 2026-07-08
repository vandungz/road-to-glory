"use client";

import React, { useMemo } from "react";
import { X, Milestone, Sparkles } from "lucide-react";
import type { ClientSafePlayer } from "@/types/squad";
import { RARITY_ACCENT } from "@/types/squad";
import { PlayerOvrChart } from "./PlayerOvrChart";
import { PlayerStickerCard } from "./PlayerStickerCard";
import { getDomesticCupName } from "../../wheel/lib/simulation-helpers";

interface PlayerCareerDialogProps {
  player: ClientSafePlayer | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerCareerDialog({ player, isOpen, onClose }: PlayerCareerDialogProps) {
  // Trích xuất các dữ liệu lịch sử an toàn
  const statsTimeline = player?.statsTimeline ?? [];
  const events = player?.events ?? [];
  const clubStints = player?.clubStints ?? [];
  const debutAge = player?.debutAge ?? 18;
  const retireAge = player?.retireAge ?? 35;
  const careerLength = player?.careerLengthYears ?? 15;

  // Tính toán các chỉ số tích lũy trọn đời sự nghiệp
  const summaryStats = useMemo(() => {
    let apps = 0;
    let goals = 0;
    let assists = 0;
    let cleanSheets = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    statsTimeline.forEach((snap: any) => {
      apps += snap.apps ?? 0;
      goals += snap.goals ?? 0;
      assists += snap.assists ?? 0;
      cleanSheets += snap.cleanSheets ?? 0;
      if (snap.matchRating) {
        ratingSum += snap.matchRating;
        ratingCount++;
      }
    });

    const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(2) : "0.00";

    return { apps, goals, assists, cleanSheets, avgRating };
  }, [statsTimeline]);

  // Lấy câu lạc bộ hiện tại/cuối cùng
  const finalClub = useMemo(() => {
    if (clubStints.length === 0) return "Tự do";
    const lastStint = clubStints[clubStints.length - 1];
    return lastStint ? `${lastStint.clubName}` : "Tự do";
  }, [clubStints]);

  // Gom dữ liệu timeline theo từng tuổi từ debutAge đến retireAge
  const timelineYears = useMemo(() => {
    const years = [];
    for (let age = debutAge; age <= retireAge; age++) {
      const snap = statsTimeline.find((s: any) => s.age === age);
      const yearEvents = events.filter((e: any) => e.age === age);
      
      // Tìm câu lạc bộ ở độ tuổi này dựa trên stints
      const stint = clubStints.find((st: any) => age >= st.startAge && age <= st.endAge);
      const clubName = stint ? stint.clubName : "Tự do";

      if (snap || yearEvents.length > 0) {
        years.push({
          age,
          snap,
          events: yearEvents,
          clubName
        });
      }
    }
    return years.sort((a, b) => a.age - b.age);
  }, [debutAge, retireAge, statsTimeline, events, clubStints]);

  const trophiesList = useMemo(() => {
    const list: { type: string; name: string; count: number; icon: string }[] = [];

    if (player?.achievements && typeof player.achievements === "object") {
      const dbAch = player.achievements as any;
      if (dbAch.ballonDor > 0) {
        list.push({ type: "ballonDor", name: "Quả bóng Vàng", count: dbAch.ballonDor, icon: "🌟" });
      }
      
      const addDbTrophies = (obj: any, type: string, icon: string, prefix: string = "") => {
        if (!obj) return;
        Object.entries(obj).forEach(([name, count]) => {
          if ((count as number) > 0) {
            list.push({ type, name: `${prefix}${name}`, count: count as number, icon });
          }
        });
      };

      addDbTrophies(dbAch.leagues, "league", "🏆", "VĐQG: ");
      addDbTrophies(dbAch.cups, "cup", "🥛");
      addDbTrophies(dbAch.continentals, "continental", "🌍");
      addDbTrophies(dbAch.internationals, "international", "🎖️");

      // Fallback cho cầu thủ cũ nếu lưu dạng đếm cúp tĩnh
      if (!dbAch.leagues && dbAch.league > 0) list.push({ type: "league", name: "Giải VĐQG", count: dbAch.league, icon: "🏆" });
      if (!dbAch.cups && dbAch.cup > 0) list.push({ type: "cup", name: "Cúp Quốc Gia", count: dbAch.cup, icon: "🥛" });
      if (!dbAch.continentals && dbAch.continental > 0) list.push({ type: "continental", name: "Cúp Châu Lục", count: dbAch.continental, icon: "🌍" });
      if (!dbAch.internationals && dbAch.international > 0) list.push({ type: "international", name: "Cúp ĐTQG", count: dbAch.international, icon: "🎖️" });
    } else {
      let ballonDorCount = 0;
      const leaguesMap: Record<string, number> = {};
      const cupsMap: Record<string, number> = {};
      const continentalsMap: Record<string, number> = {};
      const internationalsMap: Record<string, number> = {};

      events.forEach((evt: any) => {
        const label = evt.label ?? "";
        const upperLabel = label.toUpperCase();

        if (upperLabel.includes("BALLON D'OR") || upperLabel.includes("QUẢ BÓNG VÀNG")) {
          ballonDorCount++;
        } else if (evt.type === "trophy" || label.includes("Vô Địch giải đấu vô địch quốc gia")) {
          const m = label.match(/Vô Địch giải đấu vô địch quốc gia cùng CLB (.*?) ở/);
          const clubName = m ? m[1] : "";
          const stint = clubStints.find((st: any) => evt.age >= st.startAge && evt.age <= st.endAge);
          const leagueName = stint ? stint.leagueName : "Giải VĐQG";
          const key = clubName ? `${leagueName} (${clubName})` : leagueName;
          leaguesMap[key] = (leaguesMap[key] || 0) + 1;
        } else if (label.includes("Vô Địch Cup Quốc Gia")) {
          const m = label.match(/Vô Địch Cup Quốc Gia cùng CLB (.*?) ở/);
          const clubName = m ? m[1] : "";
          const stint = clubStints.find((st: any) => evt.age >= st.startAge && evt.age <= st.endAge);
          const leagueName = stint ? stint.leagueName : "";
          const cupName = getDomesticCupName(leagueName);
          const key = clubName ? `${cupName} (${clubName})` : cupName;
          cupsMap[key] = (cupsMap[key] || 0) + 1;
        } else if (label.includes("Vô Địch") && (label.includes("Copa Libertadores") || label.includes("Champions League") || label.includes("Europa League") || label.includes("Conference League") || label.includes("AFC Champions League"))) {
          const m = label.match(/Vô Địch (.*?) cùng CLB (.*?) ở/);
          const cupName = m ? m[1].replace(/🏆/g, "").trim() : "Cúp Châu Lục";
          const clubName = m ? m[2].trim() : "";
          const key = clubName ? `${cupName} (${clubName})` : cupName;
          continentalsMap[key] = (continentalsMap[key] || 0) + 1;
        } else if (label.includes("VÔ ĐỊCH") && label.includes("ĐTQG")) {
          const m = label.match(/VÔ ĐỊCH (.*?) cùng ĐTQG/);
          const tourneyName = m ? m[1].trim() : "Cúp ĐTQG";
          const nation = player?.nationality ?? "ĐTQG";
          const key = `${tourneyName} (${nation})`;
          internationalsMap[key] = (internationalsMap[key] || 0) + 1;
        }
      });

      if (ballonDorCount > 0) list.push({ type: "ballonDor", name: "Quả bóng Vàng", count: ballonDorCount, icon: "🌟" });
      
      const maps = [
        { data: leaguesMap, type: "league", icon: "🏆" },
        { data: cupsMap, type: "cup", icon: "🥛" },
        { data: continentalsMap, type: "continental", icon: "🌍" },
        { data: internationalsMap, type: "international", icon: "🎖️" },
      ];
      maps.forEach(({ data, type, icon }) => {
        Object.entries(data).forEach(([name, count]) => {
          list.push({ type, name, count, icon });
        });
      });
    }

    return list;
  }, [player?.achievements, events]);

  // Ngăn render khi chưa mở hoặc không có player
  if (!isOpen || !player) return null;

  const rarityColor = RARITY_ACCENT[player.cardRarity] ?? "#71717a";

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(3px)",
        padding: "20px",
      }}
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
        {/* Nút Close X màu sắc nổi bật ở góc phải */}
        <button
          onClick={onClose}
          aria-label="Đóng bảng xem sự nghiệp"
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "30px",
            height: "30px",
            border: "2px solid var(--charcoal)",
            borderRadius: "3px",
            backgroundColor: "var(--white)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "2px 2px 0 var(--charcoal)",
            zIndex: 10,
            transition: "transform 80ms ease, box-shadow 80ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translate(1px, 1px)";
            e.currentTarget.style.boxShadow = "1px 1px 0 var(--charcoal)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "2px 2px 0 var(--charcoal)";
          }}
        >
          <X size={16} strokeWidth={2.5} color="var(--charcoal)" />
        </button>

        <div
          style={{
            flex: "0 0 350px",
            height: "100%",
            borderRight: "2px solid var(--charcoal)",
            backgroundColor: "var(--cream-dark)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            overflowY: "auto",
          }}
        >
          <PlayerStickerCard
            player={player}
            finalClub={finalClub}
            debutAge={debutAge}
            retireAge={retireAge}
            careerLength={careerLength}
            rarityColor={rarityColor}
          />

          {/* Trophy Cabinet */}
          <div style={{ border: "2px solid var(--charcoal)", borderRadius: "3px", backgroundColor: "var(--white)", padding: "12px 14px", boxShadow: "2px 2px 0 var(--charcoal)" }}>
            <h4 style={{ fontFamily: "var(--font-headline)", fontSize: "0.8rem", color: "var(--charcoal)", borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "4px", marginBottom: "8px" }}>
              BỘ SƯU TẬP DANH HIỆU
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "130px", overflowY: "auto", paddingRight: "4px" }}>
              {trophiesList.length > 0 ? (
                trophiesList.map((tr, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "4px 8px",
                      backgroundColor: tr.type === "ballonDor" ? "#fef3c7" : "var(--cream-dark)",
                      border: tr.type === "ballonDor" ? "1px solid #d97706" : "1px solid var(--cream-border)",
                      borderRadius: "3px",
                      fontSize: "0.78rem",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "1rem" }}>{tr.icon}</span>
                      <span style={{ fontWeight: 600, color: "var(--charcoal)" }}>{tr.name}</span>
                    </div>
                    <span style={{
                      fontFamily: "var(--font-headline)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      backgroundColor: tr.type === "ballonDor" ? "#d97706" : "var(--charcoal)",
                      color: "var(--white)",
                      padding: "1px 6px",
                      borderRadius: "2px",
                      lineHeight: 1.1
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

          {/* Lifetime Career Stats Summary */}
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

        <div
          style={{
            flex: "1 1 auto",
            height: "100%",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            overflowY: "auto",
          }}
        >
          {/* Header Title */}
          <div>
            <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.58rem", color: "var(--ink-gray)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Player Evolution & History
            </span>
            <h2 style={{ fontFamily: "var(--font-headline)", fontSize: "1.6rem", fontWeight: 700, color: "var(--charcoal)", marginTop: "2px", lineHeight: 1.1 }}>
              TIẾN TRÌNH SỰ NGHIỆP CẦU THỦ
            </h2>
          </div>

          {/* OVR Chart Card Section */}
          <div style={{ border: "2px solid var(--charcoal)", borderRadius: "3px", backgroundColor: "var(--white)", padding: "14px 16px", boxShadow: "3px 3px 0 var(--charcoal)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ fontFamily: "var(--font-headline)", fontSize: "0.85rem", color: "var(--charcoal)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={14} color="var(--coral)" /> BIỂU ĐỒ PHÁT TRIỂN CHỈ SỐ OVR THEO TUỔI
              </h3>
              <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)" }}>
                MIN {Math.min(...statsTimeline.map((s: any) => s.ovr), 50)} · PEAK {player.peakOvr}
              </span>
            </div>
            
            <PlayerOvrChart
              statsTimeline={statsTimeline}
              debutAge={debutAge}
              retireAge={retireAge}
              peakOvr={player.peakOvr}
            />
          </div>

          {/* Career Timeline Section */}
          <div style={{ border: "2px solid var(--charcoal)", borderRadius: "3px", backgroundColor: "var(--white)", padding: "14px 16px", boxShadow: "3px 3px 0 var(--charcoal)", display: "flex", flexDirection: "column", flex: 1 }}>
            <h3 style={{ fontFamily: "var(--font-headline)", fontSize: "0.85rem", color: "var(--charcoal)", borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "6px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Milestone size={14} color="var(--coral)" /> BIÊN NIÊN SỰ KIỆN NỔI BẬT
            </h3>

            {/* Timeline scroll container */}
            <div
              style={{
                overflowY: "auto",
                maxHeight: "260px",
                paddingRight: "8px",
                flex: 1,
              }}
            >
              {timelineYears.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "var(--ink-light)", fontFamily: "var(--font-body)", fontStyle: "italic", fontSize: "0.85rem" }}>
                  Không có cột mốc sự nghiệp nào được ghi nhận.
                </div>
              ) : (
                <div style={{ position: "relative", paddingLeft: "20px", borderLeft: "2px solid var(--cream-border)" }}>
                  
                  {timelineYears.map((year, idx) => {
                    const isRetired = year.age === retireAge;
                    const isDebut = year.age === debutAge;
                    
                    return (
                      <div key={idx} style={{ position: "relative", marginBottom: "20px" }}>
                        {/* Timeline node point */}
                        <div
                          style={{
                            position: "absolute",
                            left: "-27px",
                            top: "3px",
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            border: "2px solid var(--charcoal)",
                            backgroundColor: isRetired
                              ? "var(--charcoal)"
                              : isDebut
                              ? "var(--coral)"
                              : "var(--white)",
                            zIndex: 2,
                          }}
                        />

                        {/* Timeline Year Block Content */}
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "6px 12px" }}>
                          {/* Age Badge */}
                          <span style={{
                            fontFamily: "var(--font-headline)",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: "var(--white)",
                            backgroundColor: "var(--charcoal)",
                            padding: "1px 6px",
                            borderRadius: "2px",
                          }}>
                            TUỔI {year.age}
                          </span>

                          {/* Club & OVR Status */}
                          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", fontWeight: 700, color: "var(--charcoal)" }}>
                            {year.clubName}
                          </span>
                          
                          {year.snap && (
                            <span style={{
                              fontFamily: "var(--font-headline)",
                              fontSize: "0.72rem",
                              color: "var(--ink-gray)",
                              fontWeight: 600,
                              backgroundColor: "var(--cream-dark)",
                              padding: "0px 6px",
                              borderRadius: "2px",
                              border: "1px solid var(--cream-border)"
                            }}>
                              OVR {year.snap.ovr}
                            </span>
                          )}
                        </div>

                        {/* Season stats snapshot text */}
                        {year.snap && year.snap.apps !== undefined && (
                          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-gray)", marginTop: "4px" }}>
                            Mùa giải: {year.snap.apps} Trận · {year.snap.goals} Bàn · {year.snap.assists} Kiến tạo · MR {year.snap.matchRating?.toFixed(2) ?? "—"}
                          </div>
                        )}

                        {/* Events list for this age */}
                        {year.events.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                            {year.events.map((evt: any, eIdx: number) => {
                              const isBallonDor = evt.label.includes("Ballon d'Or") || evt.label.includes("Quả bóng Vàng");
                              const isTransfer = evt.type === "transfer" || evt.label.includes("chuyển nhượng") || evt.label.includes("Chuyển nhượng");
                              const isNational = evt.type === "national" || evt.label.includes("triệu tập") || evt.label.includes("TQG");
                              
                              return (
                                <div
                                  key={eIdx}
                                  style={{
                                    fontFamily: "var(--font-body)",
                                    fontSize: "0.78rem",
                                    padding: "4px 8px",
                                    borderRadius: "2px",
                                    border: "1px solid var(--cream-border)",
                                    backgroundColor: isBallonDor 
                                      ? "#fef3c7"
                                      : isTransfer 
                                      ? "#eff6ff"
                                      : isNational
                                      ? "#fef2f2"
                                      : "var(--cream-dark)",
                                    borderLeft: `3px solid ${
                                      isBallonDor 
                                        ? "#d97706" 
                                        : isTransfer 
                                        ? "#3b82f6" 
                                        : isNational
                                        ? "var(--coral)"
                                        : "var(--charcoal)"
                                    }`,
                                    color: "var(--charcoal)",
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {isBallonDor && "🌟 "}
                                  {evt.label}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
