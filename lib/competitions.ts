/**
 * Domestic + continental club competitions — display & gameplay labels.
 * Sourced from league seed (`domesticCupName` / confederation) + continental codes on Club.
 */

export type Confederation = "UEFA" | "CONMEBOL" | "CONCACAF" | "AFC" | "CAF";

export type ContinentalCupCode =
  | "UCL"
  | "UEL"
  | "UECL"
  | "Libertadores"
  | "Sudamericana"
  | "AFC_CL"
  | "CONCACAF_CC"
  | "CAF_CL"
  | "none";

/** leagueId → domestic cup (kept in sync with prisma/data/leagues.ts) */
export const DOMESTIC_CUP_BY_LEAGUE_ID: Record<string, string> = {
  ENG1: "FA Cup",
  ENG2: "FA Cup",
  ESP1: "Copa del Rey",
  ESP2: "Copa del Rey",
  ITA1: "Coppa Italia",
  ITA2: "Coppa Italia",
  GER1: "DFB-Pokal",
  GER2: "DFB-Pokal",
  FRA1: "Coupe de France",
  FRA2: "Coupe de France",
  POR1: "Taça de Portugal",
  NED1: "KNVB Beker",
  TUR1: "Turkish Cup",
  BEL1: "Belgian Cup",
  SCO1: "Scottish Cup",
  BRA1: "Copa do Brasil",
  BRA2: "Copa do Brasil",
  ARG1: "Copa Argentina",
  COL1: "Copa Colombia",
  ECU1: "Copa Ecuador",
  URU1: "Copa Uruguay",
  CHI1: "Copa Chile",
  USA1: "US Open Cup",
  MEX1: "Copa MX",
  MEX2: "Copa MX",
  JPN1: "Emperor's Cup",
  JPN2: "Emperor's Cup",
  KOR1: "Korean FA Cup",
  CHN1: "Chinese FA Cup",
  AUS1: "Australia Cup",
  IND1: "Super Cup",
  KSA1: "King's Cup",
  UAE1: "UAE President's Cup",
  QAT1: "Emir Cup",
  EGY1: "Egypt Cup",
  RSA1: "Nedbank Cup",
};

export const CONFEDERATION_BY_LEAGUE_ID: Record<string, Confederation> = {
  ENG1: "UEFA", ENG2: "UEFA", ESP1: "UEFA", ESP2: "UEFA",
  ITA1: "UEFA", ITA2: "UEFA", GER1: "UEFA", GER2: "UEFA",
  FRA1: "UEFA", FRA2: "UEFA", POR1: "UEFA", NED1: "UEFA",
  TUR1: "UEFA", BEL1: "UEFA", SCO1: "UEFA",
  BRA1: "CONMEBOL", BRA2: "CONMEBOL", ARG1: "CONMEBOL",
  COL1: "CONMEBOL", ECU1: "CONMEBOL", URU1: "CONMEBOL", CHI1: "CONMEBOL",
  USA1: "CONCACAF", MEX1: "CONCACAF", MEX2: "CONCACAF",
  JPN1: "AFC", JPN2: "AFC", KOR1: "AFC", CHN1: "AFC",
  AUS1: "AFC", IND1: "AFC", KSA1: "AFC", UAE1: "AFC", QAT1: "AFC",
  EGY1: "CAF", RSA1: "CAF",
};

export function getDomesticCupNameByLeagueId(leagueId: string | null | undefined): string {
  if (!leagueId) return "Cup Quốc Gia";
  return DOMESTIC_CUP_BY_LEAGUE_ID[leagueId.toUpperCase()] ?? "Cup Quốc Gia";
}

/** @deprecated Prefer getDomesticCupNameByLeagueId — name matching is fragile for Primera División etc. */
export function getDomesticCupNameFromLeagueName(leagueName: string | null | undefined): string {
  if (!leagueName) return "Cup Quốc Gia";
  const name = leagueName.toLowerCase();
  if (name.includes("premier league") || name.includes("championship")) return "FA Cup";
  if (name.includes("la liga") || name.includes("laliga") || name.includes("segunda")) return "Copa del Rey";
  if (name.includes("brasileirão") || name.includes("serie a") && name.includes("brazil")) return "Copa do Brasil";
  if (name.includes("serie a") || name.includes("serie b")) return "Coppa Italia";
  if (name.includes("ligue")) return "Coupe de France";
  if (name.includes("bundesliga")) return "DFB-Pokal";
  if (name.includes("portugal") || name.includes("liga portugal")) return "Taça de Portugal";
  if (name.includes("eredivisie")) return "KNVB Beker";
  if (name.includes("süper") || name.includes("super lig")) return "Turkish Cup";
  if (name.includes("jupiler") || name.includes("belgium")) return "Belgian Cup";
  if (name.includes("scottish")) return "Scottish Cup";
  if (name.includes("argentina") || name.includes("primera división")) return "Copa Argentina";
  if (name.includes("colombia")) return "Copa Colombia";
  if (name.includes("ecuador") || name.includes("ligapro")) return "Copa Ecuador";
  if (name.includes("uruguay")) return "Copa Uruguay";
  if (name.includes("chile")) return "Copa Chile";
  if (name.includes("saudi") || name.includes("king")) return "King's Cup";
  if (name.includes("mls") || name.includes("major league")) return "US Open Cup";
  if (name.includes("liga mx") || name.includes("expansión")) return "Copa MX";
  if (name.includes("j1") || name.includes("j2") || name.includes("j league")) return "Emperor's Cup";
  if (name.includes("k league")) return "Korean FA Cup";
  if (name.includes("chinese")) return "Chinese FA Cup";
  if (name.includes("a-league") || name.includes("a league")) return "Australia Cup";
  if (name.includes("indian")) return "Super Cup";
  if (name.includes("uae")) return "UAE President's Cup";
  if (name.includes("qatar") || name.includes("stars league")) return "Emir Cup";
  if (name.includes("egypt")) return "Egypt Cup";
  if (name.includes("south african") || name.includes("psl")) return "Nedbank Cup";
  return "Cup Quốc Gia";
}

export function getContinentalCupLabel(cupType: string): string {
  switch (cupType) {
    case "UCL": return "UEFA Champions League";
    case "UEL": return "UEFA Europa League";
    case "UECL": return "UEFA Conference League";
    case "Libertadores": return "Copa Libertadores";
    case "Sudamericana": return "Copa Sudamericana";
    case "AFC_CL": return "AFC Champions League Elite";
    case "CONCACAF_CC": return "CONCACAF Champions Cup";
    case "CAF_CL": return "CAF Champions League";
    default: return "Cúp Châu Lục CLB";
  }
}
