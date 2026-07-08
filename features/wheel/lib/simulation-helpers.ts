// features/wheel/lib/simulation-helpers.ts

export function calculateContinentalQualification(leagueId: string, standing: number): string {
  if (!leagueId) return "none";
  
  const id = leagueId.toUpperCase();
  
  // 1. Nhóm giải siêu cấp châu Âu (Top 4 leagues: Anh, Tây Ban Nha, Đức, Ý)
  if (["ENG1", "ESP1", "GER1", "ITA1"].includes(id)) {
    if (standing <= 4) return "UCL";
    if (standing <= 6) return "UEL";
    if (standing === 7) return "UECL";
  }
  
  // 2. Nhóm giải cấp 2 châu Âu (Pháp, Bồ Đào Nha, Hà Lan, Thổ Nhĩ Kỳ, Bỉ)
  if (["FRA1", "POR1", "NED1", "TUR1", "BEL1"].includes(id)) {
    if (standing <= 2) return "UCL";
    if (standing <= 4) return "UEL";
    if (standing === 5) return "UECL";
  }
  
  // 3. Nhóm giải cấp 3 châu Âu (Scotland...)
  if (["SCO1"].includes(id)) {
    if (standing === 1) return "UCL";
    if (standing === 2) return "UEL";
    if (standing === 3) return "UECL";
  }
  
  // 4. Nhóm Nam Mỹ (Brazil, Argentina)
  if (["BRA1", "ARG1"].includes(id)) {
    if (standing <= 6) return "Libertadores";
  }
  if (["COL1", "ECU1", "URU1", "CHI1"].includes(id)) {
    if (standing <= 2) return "Libertadores";
  }
  
  // 5. Nhóm Châu Á (Nhật Bản, Hàn Quốc, Saudi Arabia...)
  if (["JPN1", "KOR1", "KSA1"].includes(id)) {
    if (standing <= 3) return "AFC_CL";
  }
  if (["QAT1", "UAE1", "AUS1", "IND1", "CHN1"].includes(id)) {
    if (standing === 1) return "AFC_CL";
  }
  
  // 6. Nhóm Bắc Mỹ (Mỹ, Mexico)
  if (["USA1", "MEX1"].includes(id)) {
    if (standing <= 3) return "CONCACAF_CC";
  }
  
  return "none";
}

export function getContinentalCupLabel(cupType: string): string {
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

export function getSeasonYearString(age: number, debutAge: number): string {
  const startYear = 2025 + (age - debutAge);
  const endYearShort = (startYear + 1) % 100;
  const endYearStr = endYearShort < 10 ? `0${endYearShort}` : `${endYearShort}`;
  return `${startYear}/${endYearStr}`;
}

export function getStandingWheelPool(clubPrestige: number, ovr: number, leagueSize: number, apps: number = 38) {
  const targetOvr = 55 + clubPrestige * 6;
  const diff = ovr - targetOvr;
  const influenceFactor = Math.min(1.0, Math.max(0.0, apps / 55));

  const pool = Array.from({ length: leagueSize }, (_, i) => {
    const pos = i + 1;
    let baseWeight = 10;

    const expectedPos = Math.max(1, Math.min(leagueSize, Math.round(leagueSize - clubPrestige * (leagueSize / 5) + 1)));
    const dist = Math.abs(pos - expectedPos);
    baseWeight = Math.max(1, 40 - dist * (35 / leagueSize));

    let ovrModifier = 0;
    if (diff > 0) {
      if (pos <= Math.round(leagueSize * 0.25)) ovrModifier = diff * 1.5 * influenceFactor;
      if (pos >= Math.round(leagueSize * 0.7)) ovrModifier = -diff * 1.2 * influenceFactor;
    } else if (diff < 0) {
      if (pos <= Math.round(leagueSize * 0.25)) ovrModifier = diff * 1.2 * influenceFactor;
      if (pos >= Math.round(leagueSize * 0.7)) ovrModifier = -diff * 1.5 * influenceFactor;
    }

    const finalWeight = Math.max(1, Math.round(baseWeight + ovrModifier));
    return {
      value: pos,
      weight: finalWeight,
    };
  });

  return pool;
}

export function getDomesticCupName(leagueName: string): string {
  if (!leagueName) return "Cup Quốc Gia";
  const name = leagueName.toLowerCase();
  if (name.includes("premier league") || name.includes("championship")) return "FA Cup";
  if (name.includes("laliga") || name.includes("segunda")) return "Copa del Rey";
  if (name.includes("serie a") || name.includes("serie b")) {
    if (name.includes("brazil") || name.includes("brasileirão")) return "Copa do Brasil";
    return "Coppa Italia";
  }
  if (name.includes("ligue")) return "Coupe de France";
  if (name.includes("bundesliga")) return "DFB-Pokal";
  if (name.includes("portugal")) return "Taça de Portugal";
  if (name.includes("eredivisie")) return "KNVB Beker";
  if (name.includes("primera") || name.includes("argentina")) return "Copa Argentina";
  if (name.includes("saudi") || name.includes("pro league")) return "King Cup";
  if (name.includes("mls") || name.includes("major league")) return "US Open Cup";
  return "Cup Quốc Gia";
}
