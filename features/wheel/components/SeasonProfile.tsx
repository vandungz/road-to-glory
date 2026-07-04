"use client";

import { Calendar, ChevronUp, ChevronDown } from "lucide-react";

interface SeasonProfileProps {
  seasonRecords: Record<number, any>;
  currentAge: number;
  playerDebutAge: number;
  selectedAgeForStats: number;
  setSelectedAgeForStats: (age: number) => void;
  isLeagueOpen: boolean;
  setIsLeagueOpen: (open: boolean) => void;
  isDomesticOpen: boolean;
  setIsDomesticOpen: (open: boolean) => void;
  isContinentalOpen: boolean;
  setIsContinentalOpen: (open: boolean) => void;
  isNationalOpen: boolean;
  setIsNationalOpen: (open: boolean) => void;
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

export function SeasonProfile({
  seasonRecords,
  currentAge,
  playerDebutAge,
  selectedAgeForStats,
  setSelectedAgeForStats,
  isLeagueOpen,
  setIsLeagueOpen,
  isDomesticOpen,
  setIsDomesticOpen,
  isContinentalOpen,
  setIsContinentalOpen,
  isNationalOpen,
  setIsNationalOpen,
}: SeasonProfileProps) {
  const activeRecord = seasonRecords[selectedAgeForStats];

  return (
    <div style={{ flex: 1, backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", boxShadow: "3px 3px 0 var(--charcoal)", minHeight: "450px" }}>
      <div style={{
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "18px"
      }}>
        <div style={{ borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-headline)", fontSize: "0.92rem", fontWeight: 900, textTransform: "uppercase", color: "var(--charcoal)" }}>
            <Calendar size={16} color="var(--coral)" /> Hồ Sơ Mùa Giải
          </div>
          <p style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", marginTop: "2px" }}>
            CLICK VÀO CÁC DÒNG ĐỂ DROPDOWN LIST CHI TIẾT
          </p>
        </div>

        {/* Dropdown Selector Mùa Giải */}
        <div>
          <select
            value={selectedAgeForStats}
            onChange={(e) => setSelectedAgeForStats(parseInt(e.target.value))}
            style={{
              width: "100%",
              fontFamily: "var(--font-headline)",
              fontSize: "0.82rem",
              fontWeight: 700,
              border: "2.5px solid var(--charcoal)",
              borderRadius: "3px",
              padding: "8px 10px",
              backgroundColor: "var(--cream)",
              cursor: "pointer",
              outline: "none",
            }}
          >
            {Object.keys(seasonRecords).map((ageStr) => {
              const ageNum = parseInt(ageStr, 10);
              const isCurrent = ageNum === currentAge;
              return (
                <option key={ageNum} value={ageNum}>
                  MÙA {getSeasonYearString(ageNum, playerDebutAge)} (TUỔI {ageNum}) {isCurrent ? "★" : ""}
                </option>
              );
            })}
          </select>
        </div>

        {/* Labels có dropdown list (Accordion) xổ ra chi tiết lấy 100% từ DB */}
        {activeRecord ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            
            {/* CLB */}
            <div style={{ fontSize: "0.78rem", borderBottom: "1px solid var(--cream-border)", paddingBottom: "6px" }}>
              <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-light)", display: "block" }}>CÂU LẠC BỘ</span>
              <strong style={{ fontSize: "0.85rem" }}>{activeRecord.clubName.toUpperCase()}</strong>
              <span style={{ color: "var(--ink-gray)", display: "block", fontSize: "0.72rem", marginTop: "2px" }}>{activeRecord.leagueName}</span>
            </div>

            {/* Label 1: LEAGUE + DROPDOWN LIST BẢNG XẾP HẠNG CHI TIẾT */}
            <div style={{ display: "flex", flexDirection: "column", border: "2px solid var(--charcoal)", borderRadius: "4px", overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setIsLeagueOpen(!isLeagueOpen)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  backgroundColor: "var(--cream-dark)", padding: "10px 12px", width: "100%", textAlign: "left",
                  fontFamily: "var(--font-headline)", fontSize: "0.78rem", fontWeight: 700, border: "none", cursor: "pointer"
                }}
              >
                <span>🏆 Giải VĐQG</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <strong style={{ color: "var(--coral)" }}>
                    {activeRecord.standing !== null ? `Hạng #${activeRecord.standing}` : "Chờ quay..."}
                  </strong>
                  {isLeagueOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>
              
              {isLeagueOpen && (
                <div style={{ backgroundColor: "var(--white)", borderTop: "1.5px solid var(--charcoal)", padding: "8px" }}>
                  {activeRecord.leagueTable ? (
                    <div style={{ fontSize: "0.72rem", maxHeight: "260px", overflowY: "auto" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 40px", fontWeight: 700, borderBottom: "1px solid var(--charcoal)", paddingBottom: "3px", marginBottom: "4px" }}>
                        <span>POS</span>
                        <span>CLUB</span>
                        <span style={{ textAlign: "right" }}>PTS</span>
                      </div>
                      {activeRecord.leagueTable.map((row: any, i: number) => {
                        const isPlayer = row.name.toLowerCase() === activeRecord.clubName.toLowerCase();
                        return (
                          <div key={i} style={{ display: "grid", gridTemplateColumns: "30px 1fr 40px", padding: "3.5px 0", color: isPlayer ? "var(--coral)" : "var(--charcoal)", fontWeight: isPlayer ? 800 : 500 }}>
                            <span>{i + 1}</span>
                            <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{row.name}</span>
                            <span style={{ textAlign: "right" }}>{row.points}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.72rem", fontStyle: "italic", color: "var(--ink-light)", margin: 0 }}>Chưa có bảng xếp hạng...</p>
                  )}
                </div>
              )}
            </div>

            {/* Label 2: CUP QUỐC GIA + DROPDOWN HÀNH TRÌNH CHI TIẾT */}
            <div style={{ display: "flex", flexDirection: "column", border: "2px solid var(--charcoal)", borderRadius: "4px", overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setIsDomesticOpen(!isDomesticOpen)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  backgroundColor: "var(--cream-dark)", padding: "10px 12px", width: "100%", textAlign: "left",
                  fontFamily: "var(--font-headline)", fontSize: "0.78rem", fontWeight: 700, border: "none", cursor: "pointer"
                }}
              >
                <span>🛡️ Cúp Quốc Gia</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <strong style={{ color: "var(--charcoal)" }}>
                    {activeRecord.domesticCup === "Winner" ? "🏆 VÔ ĐỊCH" : activeRecord.domesticCup === "Runner-Up" ? "Á QUÂN" : activeRecord.domesticCup === "Semi-Finals" ? "BÁN KẾT" : activeRecord.domesticCup === "Early Exit" ? "LOẠI SỚM" : activeRecord.domesticCup || "Chờ quay..."}
                  </strong>
                  {isDomesticOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>
              
              {isDomesticOpen && (
                <div style={{ backgroundColor: "var(--white)", borderTop: "1.5px solid var(--charcoal)", padding: "8px", fontSize: "0.72rem" }}>
                  {activeRecord.domesticCupJourney ? (
                    <ul style={{ paddingLeft: "14px", margin: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
                      {activeRecord.domesticCupJourney.map((j: string, idx: number) => (
                        <li key={idx} style={{ listStyleType: "circle" }}>{j}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: "0.72rem", fontStyle: "italic", color: "var(--ink-light)", margin: 0 }}>Chưa đá vòng loại cúp...</p>
                  )}
                </div>
              )}
            </div>

            {/* Label 3: CUP CHÂU LỤC CLB + DROPDOWN HÀNH TRÌNH CHI TIẾT */}
            {activeRecord.continentalCup && activeRecord.continentalCup.type !== "none" ? (
              <div style={{ display: "flex", flexDirection: "column", border: "2px solid var(--charcoal)", borderRadius: "4px", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setIsContinentalOpen(!isContinentalOpen)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    backgroundColor: "var(--cream-dark)", padding: "10px 12px", width: "100%", textAlign: "left",
                    fontFamily: "var(--font-headline)", fontSize: "0.72rem", fontWeight: 700, border: "none", cursor: "pointer"
                  }}
                >
                  <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "160px" }}>
                    🌍 {getContinentalCupLabel(activeRecord.continentalCup.type)}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <strong style={{ color: "var(--charcoal)" }}>
                      {activeRecord.continentalCup.result === "Winner" ? "🏆 VÔ ĐỊCH" : activeRecord.continentalCup.result === "Runner-Up" ? "Á QUÂN" : activeRecord.continentalCup.result === "Semi-Finals" ? "BÁN KẾT" : activeRecord.continentalCup.result === "Group Stage" ? "VÒNG BẢNG" : activeRecord.continentalCup.result}
                    </strong>
                    {isContinentalOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>
                
                {isContinentalOpen && (
                  <div style={{ backgroundColor: "var(--white)", borderTop: "1.5px solid var(--charcoal)", padding: "8px", fontSize: "0.72rem" }}>
                    {activeRecord.continentalCupJourney ? (
                      <ul style={{ paddingLeft: "14px", margin: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
                        {activeRecord.continentalCupJourney.map((j: string, idx: number) => (
                          <li key={idx} style={{ listStyleType: "circle" }}>{j}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: "0.72rem", fontStyle: "italic", color: "var(--ink-light)", margin: 0 }}>Chưa đá vòng bảng châu lục...</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--cream-dark)", padding: "10px 12px", borderRadius: "4px", border: "1.5px dashed var(--cream-border)", opacity: 0.65 }}>
                <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.72rem", fontWeight: 500, color: "var(--ink-light)" }}>🌍 Cúp Châu Lục CLB</span>
                <span style={{ fontSize: "0.7rem", fontStyle: "italic", color: "var(--ink-light)" }}>Không tham gia</span>
              </div>
            )}

            {/* Label 4 & 5: ĐTQG + DROPDOWN LIST */}
            {activeRecord.nationalTeam ? (
              <div style={{ display: "flex", flexDirection: "column", border: "2px solid var(--coral)", borderRadius: "4px", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setIsNationalOpen(!isNationalOpen)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    backgroundColor: "rgba(255, 111, 97, 0.08)", padding: "10px 12px", width: "100%", textAlign: "left",
                    fontFamily: "var(--font-headline)", fontSize: "0.72rem", fontWeight: 700, border: "none", cursor: "pointer"
                  }}
                >
                  <span style={{ color: "var(--coral)" }}>🌎 ĐTQG ({activeRecord.nationalTeam.type})</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <strong style={{ color: "var(--coral)" }}>
                      {activeRecord.nationalTeam.result ? (activeRecord.nationalTeam.result === "Winner" ? "🏆 VÔ ĐỊCH" : activeRecord.nationalTeam.result === "Runner-Up" ? "Á QUÂN" : activeRecord.nationalTeam.result === "Semi-Finals" ? "BÁN KẾT" : "VÒNG BẢNG") : activeRecord.nationalTeam.callup}
                    </strong>
                    {isNationalOpen ? <ChevronUp size={14} color="var(--coral)" /> : <ChevronDown size={14} color="var(--coral)" />}
                  </div>
                </button>
                
                {isNationalOpen && (
                  <div style={{ backgroundColor: "var(--white)", borderTop: "1.5px solid var(--coral)", padding: "8px", fontSize: "0.72rem" }}>
                    {activeRecord.nationalTeamJourney ? (
                      <ul style={{ paddingLeft: "14px", margin: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
                        {activeRecord.nationalTeamJourney.map((j: string, idx: number) => (
                          <li key={idx} style={{ listStyleType: "square", color: "var(--coral)" }}>{j}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: "0.72rem", fontStyle: "italic", color: "var(--ink-light)", margin: 0 }}>Không có thông tin hành trình...</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--cream-dark)", padding: "10px 12px", borderRadius: "4px", border: "1.5px dashed var(--cream-border)", opacity: 0.65 }}>
                <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.72rem", fontWeight: 500, color: "var(--ink-light)" }}>🌎 ĐTQG Quốc Tế</span>
                <span style={{ fontSize: "0.7rem", fontStyle: "italic", color: "var(--ink-light)" }}>Không có giải</span>
              </div>
            )}

          </div>
        ) : (
          <p style={{ fontSize: "0.75rem", fontStyle: "italic", color: "var(--ink-light)" }}>Chưa có dữ liệu thi đấu...</p>
        )}

      </div>
    </div>
  );
}
