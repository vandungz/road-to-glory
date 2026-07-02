import { prisma } from "../lib/prisma";

const LEAGUES = [
  // Europe (UEFA)
  { id: "ENG1", name: "Premier League", country: "England", tier: 1, prestige: 5 },
  { id: "ENG2", name: "Championship", country: "England", tier: 2, prestige: 2 },
  { id: "ESP1", name: "La Liga", country: "Spain", tier: 1, prestige: 5 },
  { id: "ESP2", name: "La Liga 2", country: "Spain", tier: 2, prestige: 2 },
  { id: "ITA1", name: "Serie A", country: "Italy", tier: 1, prestige: 5 },
  { id: "ITA2", name: "Serie B", country: "Italy", tier: 2, prestige: 2 },
  { id: "GER1", name: "Bundesliga", country: "Germany", tier: 1, prestige: 5 },
  { id: "GER2", name: "2. Bundesliga", country: "Germany", tier: 2, prestige: 2 },
  { id: "FRA1", name: "Ligue 1", country: "France", tier: 1, prestige: 4 },
  { id: "FRA2", name: "Ligue 2", country: "France", tier: 2, prestige: 2 },
  { id: "POR1", name: "Liga Portugal", country: "Portugal", tier: 1, prestige: 3 },
  { id: "NED1", name: "Eredivisie", country: "Netherlands", tier: 1, prestige: 3 },
  { id: "TUR1", name: "Süper Lig", country: "Turkey", tier: 1, prestige: 3 },
  { id: "BEL1", name: "Jupiler Pro League", country: "Belgium", tier: 1, prestige: 3 },
  { id: "SCO1", name: "Scottish Premiership", country: "Scotland", tier: 1, prestige: 2 },

  // South America (CONMEBOL)
  { id: "BRA1", name: "Brasileirão Série A", country: "Brazil", tier: 1, prestige: 4 },
  { id: "BRA2", name: "Brasileirão Série B", country: "Brazil", tier: 2, prestige: 2 },
  { id: "ARG1", name: "Primera División", country: "Argentina", tier: 1, prestige: 4 },
  { id: "COL1", name: "Categoría Primera A", country: "Colombia", tier: 1, prestige: 2 },
  { id: "ECU1", name: "LigaPro", country: "Ecuador", tier: 1, prestige: 2 },
  { id: "URU1", name: "Primera División", country: "Uruguay", tier: 1, prestige: 2 },
  { id: "CHI1", name: "Primera División", country: "Chile", tier: 1, prestige: 2 },

  // North America (CONCACAF)
  { id: "USA1", name: "MLS", country: "USA", tier: 1, prestige: 3 },
  { id: "MEX1", name: "Liga MX", country: "Mexico", tier: 1, prestige: 3 },
  { id: "MEX2", name: "Liga de Expansión MX", country: "Mexico", tier: 2, prestige: 1 },

  // Asia & Oceania (AFC)
  { id: "JPN1", name: "J1 League", country: "Japan", tier: 1, prestige: 3 },
  { id: "JPN2", name: "J2 League", country: "Japan", tier: 2, prestige: 1 },
  { id: "KOR1", name: "K League 1", country: "South Korea", tier: 1, prestige: 3 },
  { id: "CHN1", name: "Chinese Super League", country: "China", tier: 1, prestige: 2 },
  { id: "AUS1", name: "A-League", country: "Australia", tier: 1, prestige: 2 },
  { id: "IND1", name: "Indian Super League", country: "India", tier: 1, prestige: 2 },

  // Middle East (AFC)
  { id: "KSA1", name: "Saudi Pro League", country: "Saudi Arabia", tier: 1, prestige: 4 },
  { id: "UAE1", name: "UAE Pro League", country: "UAE", tier: 1, prestige: 2 },
  { id: "QAT1", name: "Qatar Stars League", country: "Qatar", tier: 1, prestige: 2 },

  // Africa (CAF)
  { id: "EGY1", name: "Egyptian Premier League", country: "Egypt", tier: 1, prestige: 3 },
  { id: "RSA1", name: "South African PSL", country: "South Africa", tier: 1, prestige: 2 },
];

const CLUBS = [
  // ==================== England Tier 1 (Premier League) ====================
  { id: "man_city", name: "Manchester City", leagueId: "ENG1", prestige: 5, leagueTitlesCount: 10, domesticCupsCount: 7, continentalTitlesCount: 1, continentalType: "UCL" },
  { id: "arsenal", name: "Arsenal", leagueId: "ENG1", prestige: 5, leagueTitlesCount: 13, domesticCupsCount: 14, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "liverpool", name: "Liverpool", leagueId: "ENG1", prestige: 5, leagueTitlesCount: 19, domesticCupsCount: 8, continentalTitlesCount: 6, continentalType: "UCL" },
  { id: "aston_villa", name: "Aston Villa", leagueId: "ENG1", prestige: 4, leagueTitlesCount: 7, domesticCupsCount: 7, continentalTitlesCount: 1, continentalType: "UCL" },
  { id: "tottenham", name: "Tottenham Hotspur", leagueId: "ENG1", prestige: 4, leagueTitlesCount: 2, domesticCupsCount: 8, continentalTitlesCount: 0, continentalType: "none" },
  { id: "chelsea", name: "Chelsea", leagueId: "ENG1", prestige: 4, leagueTitlesCount: 6, domesticCupsCount: 8, continentalTitlesCount: 2, continentalType: "UCL" },
  { id: "man_united", name: "Manchester United", leagueId: "ENG1", prestige: 4, leagueTitlesCount: 20, domesticCupsCount: 13, continentalTitlesCount: 3, continentalType: "UCL" },
  { id: "newcastle", name: "Newcastle United", leagueId: "ENG1", prestige: 4, leagueTitlesCount: 4, domesticCupsCount: 6, continentalTitlesCount: 0, continentalType: "none" },
  { id: "west_ham", name: "West Ham United", leagueId: "ENG1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "none" },
  { id: "everton", name: "Everton", leagueId: "ENG1", prestige: 3, leagueTitlesCount: 9, domesticCupsCount: 5, continentalTitlesCount: 0, continentalType: "none" },
  { id: "crystal_palace", name: "Crystal Palace", leagueId: "ENG1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "wolves", name: "Wolverhampton Wanderers", leagueId: "ENG1", prestige: 3, leagueTitlesCount: 3, domesticCupsCount: 4, continentalTitlesCount: 0, continentalType: "none" },
  { id: "brighton", name: "Brighton & Hove Albion", leagueId: "ENG1", prestige: 4, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "bournemouth", name: "Bournemouth", leagueId: "ENG1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "fulham", name: "Fulham", leagueId: "ENG1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "brentford", name: "Brentford", leagueId: "ENG1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "nottingham", name: "Nottingham Forest", leagueId: "ENG1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 2, continentalTitlesCount: 2, continentalType: "UCL" },
  { id: "leicester_tier1", name: "Leicester City", leagueId: "ENG1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "ipswich_tier1", name: "Ipswich Town", leagueId: "ENG1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "southampton_tier1", name: "Southampton", leagueId: "ENG1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== England Tier 2 (Championship) ====================
  { id: "leeds", name: "Leeds United", leagueId: "ENG2", prestige: 3, leagueTitlesCount: 3, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "west_brom", name: "West Bromwich Albion", leagueId: "ENG2", prestige: 2, leagueTitlesCount: 1, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "norwich", name: "Norwich City", leagueId: "ENG2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "sunderland", name: "Sunderland", leagueId: "ENG2", prestige: 2, leagueTitlesCount: 6, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "none" },
  { id: "coventry", name: "Coventry City", leagueId: "ENG2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "middlesbrough", name: "Middlesbrough", leagueId: "ENG2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "watford", name: "Watford", leagueId: "ENG2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "burnley", name: "Burnley", leagueId: "ENG2", prestige: 2, leagueTitlesCount: 2, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "sheffield_utd", name: "Sheffield United", leagueId: "ENG2", prestige: 2, leagueTitlesCount: 1, domesticCupsCount: 4, continentalTitlesCount: 0, continentalType: "none" },
  { id: "luton", name: "Luton Town", leagueId: "ENG2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Spain Tier 1 (La Liga) ====================
  { id: "real_madrid", name: "Real Madrid", leagueId: "ESP1", prestige: 5, leagueTitlesCount: 36, domesticCupsCount: 20, continentalTitlesCount: 15, continentalType: "UCL" },
  { id: "barcelona", name: "Barcelona", leagueId: "ESP1", prestige: 5, leagueTitlesCount: 27, domesticCupsCount: 31, continentalTitlesCount: 5, continentalType: "UCL" },
  { id: "atletico_madrid", name: "Atlético Madrid", leagueId: "ESP1", prestige: 4, leagueTitlesCount: 11, domesticCupsCount: 10, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "girona", name: "Girona", leagueId: "ESP1", prestige: 4, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "sevilla", name: "Sevilla", leagueId: "ESP1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 5, continentalTitlesCount: 0, continentalType: "none" },
  { id: "real_sociedad", name: "Real Sociedad", leagueId: "ESP1", prestige: 3, leagueTitlesCount: 2, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "athletic_bilbao", name: "Athletic Club", leagueId: "ESP1", prestige: 4, leagueTitlesCount: 8, domesticCupsCount: 24, continentalTitlesCount: 0, continentalType: "none" },
  { id: "villarreal", name: "Villarreal", leagueId: "ESP1", prestige: 4, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "real_betis", name: "Real Betis", leagueId: "ESP1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "none" },
  { id: "valencia", name: "Valencia", leagueId: "ESP1", prestige: 3, leagueTitlesCount: 6, domesticCupsCount: 8, continentalTitlesCount: 0, continentalType: "none" },
  { id: "osasuna", name: "Osasuna", leagueId: "ESP1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "getafe", name: "Getafe", leagueId: "ESP1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "celta_vigo", name: "Celta Vigo", leagueId: "ESP1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "mallorca", name: "Mallorca", leagueId: "ESP1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "rayo_vallecano", name: "Rayo Vallecano", leagueId: "ESP1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "las_palmas", name: "Las Palmas", leagueId: "ESP1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "alaves", name: "Deportivo Alavés", leagueId: "ESP1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "leganes", name: "Leganés", leagueId: "ESP1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "valladolid_tier1", name: "Real Valladolid", leagueId: "ESP1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "espanyol_tier1", name: "Espanyol", leagueId: "ESP1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 4, continentalTitlesCount: 0, continentalType: "none" },

  // Spain Tier 2 (La Liga 2)
  { id: "eibar", name: "Eibar", leagueId: "ESP2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "levante", name: "Levante", leagueId: "ESP2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "sporting_gijon", name: "Sporting Gijón", leagueId: "ESP2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "real_oviedo", name: "Real Oviedo", leagueId: "ESP2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "tenerife", name: "Tenerife", leagueId: "ESP2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "zaragoza", name: "Real Zaragoza", leagueId: "ESP2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 6, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Italy Tier 1 (Serie A) ====================
  { id: "inter_milan", name: "Inter Milan", leagueId: "ITA1", prestige: 5, leagueTitlesCount: 20, domesticCupsCount: 9, continentalTitlesCount: 3, continentalType: "UCL" },
  { id: "ac_milan", name: "AC Milan", leagueId: "ITA1", prestige: 4, leagueTitlesCount: 19, domesticCupsCount: 5, continentalTitlesCount: 7, continentalType: "UCL" },
  { id: "juventus", name: "Juventus", leagueId: "ITA1", prestige: 4, leagueTitlesCount: 36, domesticCupsCount: 15, continentalTitlesCount: 2, continentalType: "UCL" },
  { id: "roma", name: "AS Roma", leagueId: "ITA1", prestige: 4, leagueTitlesCount: 3, domesticCupsCount: 9, continentalTitlesCount: 0, continentalType: "none" },
  { id: "napoli", name: "Napoli", leagueId: "ITA1", prestige: 3, leagueTitlesCount: 3, domesticCupsCount: 6, continentalTitlesCount: 0, continentalType: "none" },
  { id: "atalanta", name: "Atalanta", leagueId: "ITA1", prestige: 4, leagueTitlesCount: 0, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "lazio", name: "Lazio", leagueId: "ITA1", prestige: 3, leagueTitlesCount: 2, domesticCupsCount: 7, continentalTitlesCount: 0, continentalType: "none" },
  { id: "fiorentina", name: "Fiorentina", leagueId: "ITA1", prestige: 3, leagueTitlesCount: 2, domesticCupsCount: 6, continentalTitlesCount: 0, continentalType: "none" },
  { id: "bologna", name: "Bologna", leagueId: "ITA1", prestige: 4, leagueTitlesCount: 7, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "torino", name: "Torino", leagueId: "ITA1", prestige: 3, leagueTitlesCount: 7, domesticCupsCount: 5, continentalTitlesCount: 0, continentalType: "none" },
  { id: "monza", name: "Monza", leagueId: "ITA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "genoa", name: "Genoa", leagueId: "ITA1", prestige: 3, leagueTitlesCount: 9, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "lecce", name: "Lecce", leagueId: "ITA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "verona", name: "Hellas Verona", leagueId: "ITA1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "cagliari", name: "Cagliari", leagueId: "ITA1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "empoli", name: "Empoli", leagueId: "ITA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "udinese", name: "Udinese", leagueId: "ITA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "parma_tier1", name: "Parma", leagueId: "ITA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "none" },
  { id: "como_tier1", name: "Como", leagueId: "ITA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "venezia_tier1", name: "Venezia", leagueId: "ITA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },

  // Italy Tier 2 (Serie B)
  { id: "palermo", name: "Palermo", leagueId: "ITA2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "sampdoria", name: "Sampdoria", leagueId: "ITA2", prestige: 2, leagueTitlesCount: 1, domesticCupsCount: 4, continentalTitlesCount: 0, continentalType: "none" },
  { id: "bari", name: "Bari", leagueId: "ITA2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "cremonese", name: "Cremonese", leagueId: "ITA2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Germany Tier 1 (Bundesliga) ====================
  { id: "bayer_leverkusen", name: "Bayer Leverkusen", leagueId: "GER1", prestige: 5, leagueTitlesCount: 1, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "bayern_munich", name: "Bayern Munich", leagueId: "GER1", prestige: 5, leagueTitlesCount: 33, domesticCupsCount: 20, continentalTitlesCount: 6, continentalType: "UCL" },
  { id: "stuttgart", name: "VfB Stuttgart", leagueId: "GER1", prestige: 4, leagueTitlesCount: 5, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "dortmund", name: "Borussia Dortmund", leagueId: "GER1", prestige: 4, leagueTitlesCount: 8, domesticCupsCount: 5, continentalTitlesCount: 1, continentalType: "UCL" },
  { id: "leipzig", name: "RB Leipzig", leagueId: "GER1", prestige: 4, leagueTitlesCount: 0, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "frankfurt", name: "Eintracht Frankfurt", leagueId: "GER1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 5, continentalTitlesCount: 0, continentalType: "none" },
  { id: "hoffenheim", name: "Hoffenheim", leagueId: "GER1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "freiburg", name: "SC Freiburg", leagueId: "GER1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "werder_bremen", name: "Werder Bremen", leagueId: "GER1", prestige: 3, leagueTitlesCount: 4, domesticCupsCount: 6, continentalTitlesCount: 0, continentalType: "none" },
  { id: "wolfsburg", name: "Wolfsburg", leagueId: "GER1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "augsburg", name: "Augsburg", leagueId: "GER1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "heidenheim", name: "Heidenheim", leagueId: "GER1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "gladbach", name: "Borussia Mönchengladbach", leagueId: "GER1", prestige: 3, leagueTitlesCount: 5, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "none" },
  { id: "mainz", name: "Mainz 05", leagueId: "GER1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "bochum", name: "Bochum", leagueId: "GER1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "union_berlin", name: "Union Berlin", leagueId: "GER1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "st_pauli_tier1", name: "St. Pauli", leagueId: "GER1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "holstein_kiel_tier1", name: "Holstein Kiel", leagueId: "GER1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },

  // Germany Tier 2 (2. Bundesliga)
  { id: "hamburg", name: "Hamburger SV", leagueId: "GER2", prestige: 2, leagueTitlesCount: 6, domesticCupsCount: 3, continentalTitlesCount: 1, continentalType: "none" },
  { id: "schalke", name: "Schalke 04", leagueId: "GER2", prestige: 2, leagueTitlesCount: 7, domesticCupsCount: 5, continentalTitlesCount: 0, continentalType: "none" },
  { id: "hertha", name: "Hertha BSC", leagueId: "GER2", prestige: 2, leagueTitlesCount: 2, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "koln", name: "FC Köln", leagueId: "GER2", prestige: 2, leagueTitlesCount: 3, domesticCupsCount: 4, continentalTitlesCount: 0, continentalType: "none" },
  { id: "hannover", name: "Hannover 96", leagueId: "GER2", prestige: 2, leagueTitlesCount: 2, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "dusseldorf", name: "Fortuna Düsseldorf", leagueId: "GER2", prestige: 2, leagueTitlesCount: 1, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== France Tier 1 (Ligue 1) ====================
  { id: "psg", name: "Paris Saint-Germain", leagueId: "FRA1", prestige: 5, leagueTitlesCount: 12, domesticCupsCount: 15, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "monaco", name: "AS Monaco", leagueId: "FRA1", prestige: 4, leagueTitlesCount: 8, domesticCupsCount: 5, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "marseille", name: "Marseille", leagueId: "FRA1", prestige: 3, leagueTitlesCount: 9, domesticCupsCount: 10, continentalTitlesCount: 1, continentalType: "none" },
  { id: "lyon", name: "Olympique Lyonnais", leagueId: "FRA1", prestige: 3, leagueTitlesCount: 7, domesticCupsCount: 5, continentalTitlesCount: 0, continentalType: "none" },
  { id: "lille", name: "Lille", leagueId: "FRA1", prestige: 3, leagueTitlesCount: 4, domesticCupsCount: 6, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "brest", name: "Brest", leagueId: "FRA1", prestige: 4, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "nice", name: "Nice", leagueId: "FRA1", prestige: 3, leagueTitlesCount: 4, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "none" },
  { id: "lens", name: "Lens", leagueId: "FRA1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "rennes", name: "Rennes", leagueId: "FRA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "none" },
  { id: "reims", name: "Reims", leagueId: "FRA1", prestige: 3, leagueTitlesCount: 6, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "none" },
  { id: "toulouse", name: "Toulouse", leagueId: "FRA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "none" },
  { id: "montpellier", name: "Montpellier", leagueId: "FRA1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "none" },
  { id: "strasbourg", name: "Strasbourg", leagueId: "FRA1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "none" },
  { id: "le_havre", name: "Le Havre", leagueId: "FRA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "nantes", name: "Nantes", leagueId: "FRA1", prestige: 3, leagueTitlesCount: 8, domesticCupsCount: 4, continentalTitlesCount: 0, continentalType: "none" },
  { id: "auxerre_tier1", name: "Auxerre", leagueId: "FRA1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 4, continentalTitlesCount: 0, continentalType: "none" },
  { id: "angers_tier1", name: "Angers", leagueId: "FRA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "saint_etienne_tier1", name: "Saint-Étienne", leagueId: "FRA1", prestige: 3, leagueTitlesCount: 10, domesticCupsCount: 6, continentalTitlesCount: 0, continentalType: "none" },

  // France Tier 2 (Ligue 2)
  { id: "bordeaux", name: "Bordeaux", leagueId: "FRA2", prestige: 2, leagueTitlesCount: 6, domesticCupsCount: 4, continentalTitlesCount: 0, continentalType: "none" },
  { id: "paris_fc", name: "Paris FC", leagueId: "FRA2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "caen", name: "Caen", leagueId: "FRA2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Portugal Tier 1 (Liga Portugal) ====================
  { id: "sporting_cp", name: "Sporting CP", leagueId: "POR1", prestige: 4, leagueTitlesCount: 20, domesticCupsCount: 17, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "benfica", name: "Benfica", leagueId: "POR1", prestige: 4, leagueTitlesCount: 38, domesticCupsCount: 26, continentalTitlesCount: 2, continentalType: "UCL" },
  { id: "porto", name: "FC Porto", leagueId: "POR1", prestige: 4, leagueTitlesCount: 30, domesticCupsCount: 20, continentalTitlesCount: 2, continentalType: "UCL" },
  { id: "braga", name: "Braga", leagueId: "POR1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "none" },
  { id: "guimaraes", name: "Vitória de Guimarães", leagueId: "POR1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "famalicao", name: "Famalicão", leagueId: "POR1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Netherlands Tier 1 (Eredivisie) ====================
  { id: "psv", name: "PSV Eindhoven", leagueId: "NED1", prestige: 4, leagueTitlesCount: 25, domesticCupsCount: 11, continentalTitlesCount: 1, continentalType: "UCL" },
  { id: "feyenoord", name: "Feyenoord", leagueId: "NED1", prestige: 3, leagueTitlesCount: 16, domesticCupsCount: 14, continentalTitlesCount: 1, continentalType: "UCL" },
  { id: "ajax", name: "Ajax", leagueId: "NED1", prestige: 3, leagueTitlesCount: 36, domesticCupsCount: 20, continentalTitlesCount: 4, continentalType: "none" },
  { id: "utrecht", name: "FC Utrecht", leagueId: "NED1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "none" },
  { id: "twente", name: "FC Twente", leagueId: "NED1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "none" },
  { id: "az_alkmaar", name: "AZ Alkmaar", leagueId: "NED1", prestige: 3, leagueTitlesCount: 2, domesticCupsCount: 4, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Turkey Tier 1 (Süper Lig) ====================
  { id: "galatasaray", name: "Galatasaray", leagueId: "TUR1", prestige: 4, leagueTitlesCount: 24, domesticCupsCount: 18, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "fenerbahce", name: "Fenerbahçe", leagueId: "TUR1", prestige: 4, leagueTitlesCount: 19, domesticCupsCount: 7, continentalTitlesCount: 0, continentalType: "none" },
  { id: "besiktas", name: "Beşiktaş", leagueId: "TUR1", prestige: 3, leagueTitlesCount: 16, domesticCupsCount: 11, continentalTitlesCount: 0, continentalType: "none" },
  { id: "trabzonspor", name: "Trabzonspor", leagueId: "TUR1", prestige: 3, leagueTitlesCount: 7, domesticCupsCount: 9, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Belgium Tier 1 (Jupiler Pro League) ====================
  { id: "club_brugge", name: "Club Brugge", leagueId: "BEL1", prestige: 3, leagueTitlesCount: 19, domesticCupsCount: 11, continentalTitlesCount: 0, continentalType: "UCL" },
  { id: "anderlecht", name: "Anderlecht", leagueId: "BEL1", prestige: 3, leagueTitlesCount: 34, domesticCupsCount: 9, continentalTitlesCount: 0, continentalType: "none" },
  { id: "union_sg", name: "Union SG", leagueId: "BEL1", prestige: 3, leagueTitlesCount: 11, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "none" },
  { id: "gent", name: "Gent", leagueId: "BEL1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 4, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Scotland Tier 1 (Scottish Premiership) ====================
  { id: "celtic", name: "Celtic", leagueId: "SCO1", prestige: 3, leagueTitlesCount: 54, domesticCupsCount: 42, continentalTitlesCount: 1, continentalType: "UCL" },
  { id: "rangers", name: "Rangers", leagueId: "SCO1", prestige: 3, leagueTitlesCount: 55, domesticCupsCount: 34, continentalTitlesCount: 0, continentalType: "none" },
  { id: "aberdeen", name: "Aberdeen", leagueId: "SCO1", prestige: 2, leagueTitlesCount: 4, domesticCupsCount: 7, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Brazil Tier 1 (Brasileirão Série A) ====================
  { id: "palmeiras", name: "Palmeiras", leagueId: "BRA1", prestige: 4, leagueTitlesCount: 12, domesticCupsCount: 4, continentalTitlesCount: 3, continentalType: "Libertadores" },
  { id: "flamengo", name: "Flamengo", leagueId: "BRA1", prestige: 4, leagueTitlesCount: 7, domesticCupsCount: 5, continentalTitlesCount: 3, continentalType: "Libertadores" },
  { id: "sao_paulo", name: "São Paulo", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 6, domesticCupsCount: 1, continentalTitlesCount: 3, continentalType: "Libertadores" },
  { id: "gremio", name: "Grêmio", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 2, domesticCupsCount: 5, continentalTitlesCount: 3, continentalType: "Libertadores" },
  { id: "botafogo", name: "Botafogo", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 2, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "Libertadores" },
  { id: "corinthians", name: "Corinthians", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 7, domesticCupsCount: 3, continentalTitlesCount: 1, continentalType: "Libertadores" },
  { id: "fortaleza", name: "Fortaleza", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "Libertadores" },
  { id: "cruzeiro", name: "Cruzeiro", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 4, domesticCupsCount: 6, continentalTitlesCount: 2, continentalType: "Libertadores" },
  { id: "bahia", name: "Bahia", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 2, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "Libertadores" },
  { id: "vasco", name: "Vasco da Gama", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 4, domesticCupsCount: 1, continentalTitlesCount: 1, continentalType: "Libertadores" },
  { id: "internacional", name: "Internacional", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 3, domesticCupsCount: 1, continentalTitlesCount: 2, continentalType: "Libertadores" },
  { id: "fluminense", name: "Fluminense", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 4, domesticCupsCount: 1, continentalTitlesCount: 1, continentalType: "Libertadores" },
  { id: "athletico_pr", name: "Athletico Paranaense", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "Libertadores" },
  { id: "juventude", name: "Juventude", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "Libertadores" },
  { id: "criciuma", name: "Criciúma", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "Libertadores" },
  { id: "atletico_go", name: "Atlético Goianiense", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "Libertadores" },
  { id: "vitoria", name: "Vitória", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "Libertadores" },
  { id: "bragantino", name: "Red Bull Bragantino", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "Libertadores" },
  { id: "cuiaba", name: "Cuiabá", leagueId: "BRA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "Libertadores" },
  { id: "atletico_mg", name: "Atlético Mineiro", leagueId: "BRA1", prestige: 4, leagueTitlesCount: 3, domesticCupsCount: 2, continentalTitlesCount: 1, continentalType: "Libertadores" },

  // Brazil Tier 2 (Brasileirão Série B)
  { id: "santos", name: "Santos", leagueId: "BRA2", prestige: 2, leagueTitlesCount: 8, domesticCupsCount: 1, continentalTitlesCount: 3, continentalType: "none" },
  { id: "sport_recife", name: "Sport Recife", leagueId: "BRA2", prestige: 2, leagueTitlesCount: 1, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "coritiba", name: "Coritiba", leagueId: "BRA2", prestige: 2, leagueTitlesCount: 1, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "america_mg", name: "América Mineiro", leagueId: "BRA2", prestige: 2, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Argentina Tier 1 (Primera División) ====================
  { id: "river_plate", name: "River Plate", leagueId: "ARG1", prestige: 4, leagueTitlesCount: 38, domesticCupsCount: 15, continentalTitlesCount: 4, continentalType: "Libertadores" },
  { id: "boca_juniors", name: "Boca Juniors", leagueId: "ARG1", prestige: 4, leagueTitlesCount: 35, domesticCupsCount: 17, continentalTitlesCount: 6, continentalType: "Libertadores" },
  { id: "racing_club", name: "Racing Club", leagueId: "ARG1", prestige: 3, leagueTitlesCount: 18, domesticCupsCount: 15, continentalTitlesCount: 1, continentalType: "Libertadores" },
  { id: "independiente", name: "Independiente", leagueId: "ARG1", prestige: 3, leagueTitlesCount: 16, domesticCupsCount: 9, continentalTitlesCount: 7, continentalType: "Libertadores" },
  { id: "san_lorenzo", name: "San Lorenzo", leagueId: "ARG1", prestige: 3, leagueTitlesCount: 15, domesticCupsCount: 2, continentalTitlesCount: 1, continentalType: "Libertadores" },
  { id: "estudiantes", name: "Estudiantes LP", leagueId: "ARG1", prestige: 3, leagueTitlesCount: 6, domesticCupsCount: 3, continentalTitlesCount: 4, continentalType: "Libertadores" },
  { id: "talleres", name: "Talleres Córdoba", leagueId: "ARG1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "Libertadores" },
  { id: "lanus", name: "Lanús", leagueId: "ARG1", prestige: 3, leagueTitlesCount: 2, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "Libertadores" },

  // ==================== Colombia Tier 1 (Categoría Primera A) ====================
  { id: "junior", name: "Junior Barranquilla", leagueId: "COL1", prestige: 3, leagueTitlesCount: 10, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "Libertadores" },
  { id: "millonarios", name: "Millonarios", leagueId: "COL1", prestige: 3, leagueTitlesCount: 16, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "Libertadores" },
  { id: "nacional_col", name: "Atlético Nacional", leagueId: "COL1", prestige: 3, leagueTitlesCount: 17, domesticCupsCount: 6, continentalTitlesCount: 2, continentalType: "Libertadores" },
  { id: "deportivo_cali", name: "Deportivo Cali", leagueId: "COL1", prestige: 2, leagueTitlesCount: 10, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "Libertadores" },

  // ==================== Ecuador Tier 1 (LigaPro) ====================
  { id: "ldu_quito", name: "LDU Quito", leagueId: "ECU1", prestige: 3, leagueTitlesCount: 12, domesticCupsCount: 1, continentalTitlesCount: 1, continentalType: "Libertadores" },
  { id: "ind_del_valle", name: "Independiente del Valle", leagueId: "ECU1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "Libertadores" },
  { id: "barcelona_sc", name: "Barcelona SC", leagueId: "ECU1", prestige: 3, leagueTitlesCount: 16, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "Libertadores" },

  // ==================== Uruguay Tier 1 (Primera División) ====================
  { id: "penarol", name: "Peñarol", leagueId: "URU1", prestige: 3, leagueTitlesCount: 51, domesticCupsCount: 0, continentalTitlesCount: 5, continentalType: "Libertadores" },
  { id: "nacional_uru", name: "Nacional de Montevideo", leagueId: "URU1", prestige: 3, leagueTitlesCount: 49, domesticCupsCount: 0, continentalTitlesCount: 3, continentalType: "Libertadores" },
  { id: "defensor_sporting", name: "Defensor Sporting", leagueId: "URU1", prestige: 2, leagueTitlesCount: 4, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "Libertadores" },

  // ==================== Chile Tier 1 (Primera División) ====================
  { id: "colo_colo", name: "Colo-Colo", leagueId: "CHI1", prestige: 3, leagueTitlesCount: 33, domesticCupsCount: 14, continentalTitlesCount: 1, continentalType: "Libertadores" },
  { id: "u_de_chile", name: "Universidad de Chile", leagueId: "CHI1", prestige: 3, leagueTitlesCount: 18, domesticCupsCount: 5, continentalTitlesCount: 0, continentalType: "Libertadores" },
  { id: "u_catolica", name: "Universidad Católica", leagueId: "CHI1", prestige: 3, leagueTitlesCount: 16, domesticCupsCount: 4, continentalTitlesCount: 0, continentalType: "Libertadores" },

  // ==================== USA Tier 1 (MLS) ====================
  { id: "inter_miami", name: "Inter Miami CF", leagueId: "USA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "columbus_crew", name: "Columbus Crew", leagueId: "USA1", prestige: 3, leagueTitlesCount: 3, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "lafc", name: "LAFC", leagueId: "USA1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "la_galaxy", name: "LA Galaxy", leagueId: "USA1", prestige: 3, leagueTitlesCount: 5, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "none" },
  { id: "ny_red_bulls", name: "New York Red Bulls", leagueId: "USA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "seattle_sounders", name: "Seattle Sounders", leagueId: "USA1", prestige: 3, leagueTitlesCount: 2, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "atlanta_utd", name: "Atlanta United", leagueId: "USA1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "cincinnati", name: "FC Cincinnati", leagueId: "USA1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Mexico Tier 1 (Liga MX) ====================
  { id: "club_america", name: "Club América", leagueId: "MEX1", prestige: 3, leagueTitlesCount: 15, domesticCupsCount: 6, continentalTitlesCount: 7, continentalType: "none" },
  { id: "cruz_azul", name: "Cruz Azul", leagueId: "MEX1", prestige: 3, leagueTitlesCount: 9, domesticCupsCount: 4, continentalTitlesCount: 6, continentalType: "none" },
  { id: "monterrey", name: "Monterrey", leagueId: "MEX1", prestige: 3, leagueTitlesCount: 5, domesticCupsCount: 3, continentalTitlesCount: 5, continentalType: "none" },
  { id: "tigres", name: "Tigres UANL", leagueId: "MEX1", prestige: 3, leagueTitlesCount: 8, domesticCupsCount: 3, continentalTitlesCount: 1, continentalType: "none" },
  { id: "chivas", name: "Guadalajara (Chivas)", leagueId: "MEX1", prestige: 3, leagueTitlesCount: 12, domesticCupsCount: 4, continentalTitlesCount: 2, continentalType: "none" },
  { id: "toluca", name: "Toluca", leagueId: "MEX1", prestige: 3, leagueTitlesCount: 10, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "none" },

  // Mexico Tier 2 (Liga de Expansión)
  { id: "atlante", name: "Atlante", leagueId: "MEX2", prestige: 1, leagueTitlesCount: 3, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "none" },
  { id: "leones_negros", name: "Leones Negros", leagueId: "MEX2", prestige: 1, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Japan Tier 1 (J1 League) ====================
  { id: "vissel_kobe", name: "Vissel Kobe", leagueId: "JPN1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "AFC_CL" },
  { id: "yokohama_marinos", name: "Yokohama F. Marinos", leagueId: "JPN1", prestige: 3, leagueTitlesCount: 5, domesticCupsCount: 7, continentalTitlesCount: 0, continentalType: "none" },
  { id: "urawa_reds", name: "Urawa Red Diamonds", leagueId: "JPN1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 8, continentalTitlesCount: 3, continentalType: "AFC_CL" },
  { id: "kawasaki_frontale", name: "Kawasaki Frontale", leagueId: "JPN1", prestige: 3, leagueTitlesCount: 4, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "none" },
  { id: "sanfrecce_hiroshima", name: "Sanfrecce Hiroshima", leagueId: "JPN1", prestige: 3, leagueTitlesCount: 3, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "nagoya_grampus", name: "Nagoya Grampus", leagueId: "JPN1", prestige: 3, leagueTitlesCount: 1, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "none" },

  // Japan Tier 2 (J2 League)
  { id: "shimizu_s_pulse", name: "Shimizu S-Pulse", leagueId: "JPN2", prestige: 1, leagueTitlesCount: 0, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },
  { id: "yokohama_fc", name: "Yokohama FC", leagueId: "JPN2", prestige: 1, leagueTitlesCount: 0, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== South Korea Tier 1 (K League 1) ====================
  { id: "ulsan_hd", name: "Ulsan HD FC", leagueId: "KOR1", prestige: 3, leagueTitlesCount: 4, domesticCupsCount: 1, continentalTitlesCount: 2, continentalType: "AFC_CL" },
  { id: "jeonbuk_motors", name: "Jeonbuk Hyundai Motors", leagueId: "KOR1", prestige: 3, leagueTitlesCount: 9, domesticCupsCount: 5, continentalTitlesCount: 2, continentalType: "AFC_CL" },
  { id: "pohang_steelers", name: "Pohang Steelers", leagueId: "KOR1", prestige: 3, leagueTitlesCount: 5, domesticCupsCount: 5, continentalTitlesCount: 3, continentalType: "none" },
  { id: "fc_seoul", name: "FC Seoul", leagueId: "KOR1", prestige: 3, leagueTitlesCount: 6, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== China Tier 1 (CSL) ====================
  { id: "shanghai_port", name: "Shanghai Port FC", leagueId: "CHN1", prestige: 2, leagueTitlesCount: 3, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "shanghai_shenhua", name: "Shanghai Shenhua", leagueId: "CHN1", prestige: 2, leagueTitlesCount: 1, domesticCupsCount: 6, continentalTitlesCount: 0, continentalType: "none" },
  { id: "shandong_taishan", name: "Shandong Taishan", leagueId: "CHN1", prestige: 2, leagueTitlesCount: 4, domesticCupsCount: 8, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Australia Tier 1 (A-League) ====================
  { id: "cc_mariners", name: "Central Coast Mariners", leagueId: "AUS1", prestige: 2, leagueTitlesCount: 3, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "melbourne_victory", name: "Melbourne Victory", leagueId: "AUS1", prestige: 2, leagueTitlesCount: 4, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "none" },
  { id: "sydney_fc", name: "Sydney FC", leagueId: "AUS1", prestige: 2, leagueTitlesCount: 5, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== India Tier 1 (ISL) ====================
  { id: "mohun_bagan", name: "Mohun Bagan SG", leagueId: "IND1", prestige: 2, leagueTitlesCount: 6, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "mumbai_city", name: "Mumbai City FC", leagueId: "IND1", prestige: 2, leagueTitlesCount: 2, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },
  { id: "bengaluru", name: "Bengaluru FC", leagueId: "IND1", prestige: 2, leagueTitlesCount: 1, domesticCupsCount: 0, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Saudi Arabia Tier 1 (Saudi Pro League) ====================
  { id: "al_hilal", name: "Al Hilal", leagueId: "KSA1", prestige: 4, leagueTitlesCount: 19, domesticCupsCount: 10, continentalTitlesCount: 4, continentalType: "AFC_CL" },
  { id: "al_nassr", name: "Al Nassr", leagueId: "KSA1", prestige: 4, leagueTitlesCount: 9, domesticCupsCount: 6, continentalTitlesCount: 0, continentalType: "none" },
  { id: "al_ittihad", name: "Al Ittihad", leagueId: "KSA1", prestige: 3, leagueTitlesCount: 9, domesticCupsCount: 9, continentalTitlesCount: 2, continentalType: "AFC_CL" },
  { id: "al_ahli", name: "Al Ahli Saudi", leagueId: "KSA1", prestige: 3, leagueTitlesCount: 3, domesticCupsCount: 13, continentalTitlesCount: 0, continentalType: "none" },
  { id: "al_ettifaq", name: "Al Ettifaq", leagueId: "KSA1", prestige: 3, leagueTitlesCount: 2, domesticCupsCount: 2, continentalTitlesCount: 0, continentalType: "none" },
  { id: "al_shabab", name: "Al Shabab", leagueId: "KSA1", prestige: 3, leagueTitlesCount: 6, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== UAE Tier 1 (UAE Pro League) ====================
  { id: "al_ain", name: "Al Ain", leagueId: "UAE1", prestige: 3, leagueTitlesCount: 14, domesticCupsCount: 7, continentalTitlesCount: 2, continentalType: "AFC_CL" },
  { id: "al_wasl", name: "Al Wasl", leagueId: "UAE1", prestige: 2, leagueTitlesCount: 8, domesticCupsCount: 3, continentalTitlesCount: 0, continentalType: "none" },
  { id: "shabab_al_ahli", name: "Shabab Al Ahli", leagueId: "UAE1", prestige: 3, leagueTitlesCount: 10, domesticCupsCount: 13, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Qatar Tier 1 (Qatar Stars League) ====================
  { id: "al_sadd", name: "Al Sadd", leagueId: "QAT1", prestige: 3, leagueTitlesCount: 17, domesticCupsCount: 18, continentalTitlesCount: 2, continentalType: "AFC_CL" },
  { id: "al_duhail", name: "Al Duhail", leagueId: "QAT1", prestige: 2, leagueTitlesCount: 8, domesticCupsCount: 4, continentalTitlesCount: 0, continentalType: "none" },
  { id: "al_rayyan", name: "Al Rayyan", leagueId: "QAT1", prestige: 2, leagueTitlesCount: 8, domesticCupsCount: 4, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== Egypt Tier 1 (Egyptian Premier League) ====================
  { id: "al_ahly_eg", name: "Al Ahly", leagueId: "EGY1", prestige: 3, leagueTitlesCount: 44, domesticCupsCount: 39, continentalTitlesCount: 12, continentalType: "CAF_CL" },
  { id: "zamalek", name: "Zamalek", leagueId: "EGY1", prestige: 3, leagueTitlesCount: 14, domesticCupsCount: 28, continentalTitlesCount: 5, continentalType: "CAF_CL" },
  { id: "pyramids", name: "Pyramids FC", leagueId: "EGY1", prestige: 3, leagueTitlesCount: 0, domesticCupsCount: 1, continentalTitlesCount: 0, continentalType: "none" },

  // ==================== South Africa Tier 1 (South African PSL) ====================
  { id: "mamelodi_sundowns", name: "Mamelodi Sundowns", leagueId: "RSA1", prestige: 2, leagueTitlesCount: 17, domesticCupsCount: 6, continentalTitlesCount: 1, continentalType: "CAF_CL" },
  { id: "orlando_pirates", name: "Orlando Pirates", leagueId: "RSA1", prestige: 2, leagueTitlesCount: 9, domesticCupsCount: 8, continentalTitlesCount: 1, continentalType: "CAF_CL" },
  { id: "kaizer_chiefs", name: "Kaizer Chiefs", leagueId: "RSA1", prestige: 2, leagueTitlesCount: 12, domesticCupsCount: 13, continentalTitlesCount: 0, continentalType: "none" },
];

async function main() {
  console.log("Cleaning existing reference data...");
  await prisma.club.deleteMany({});
  await prisma.league.deleteMany({});

  console.log("Seeding leagues...");
  for (const league of LEAGUES) {
    await prisma.league.upsert({
      where: { id: league.id },
      update: league,
      create: league,
    });
  }

  console.log("Seeding clubs...");
  for (const club of CLUBS) {
    await prisma.club.upsert({
      where: { id: club.id },
      update: club,
      create: club,
    });
  }

  console.log(`Database seeded successfully. Total Leagues: ${LEAGUES.length}, Total Clubs: ${CLUBS.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
