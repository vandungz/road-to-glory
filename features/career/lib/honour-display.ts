import { getContinentalCupLabel, getDomesticCupNameByLeagueId, getDomesticCupNameFromLeagueName } from "@/lib/competitions";

export type HonourDisplayCategory = "club" | "individual";

export interface HonourDisplayContext {
  leagueId?: string | null;
  leagueName?: string | null;
  continentalType?: string | null;
  nationalTeamType?: string | null;
}

const TEAM_HONOUR_KEYS = new Set([
  "league_title",
  "domestic_cup_title",
  "continental_title",
  "national_team_title",
]);

export function getHonourDisplayCategory(awardKey: string, category?: string | null): HonourDisplayCategory {
  return category === "team_trophy" || TEAM_HONOUR_KEYS.has(awardKey) ? "club" : "individual";
}

function fallbackAfterVictoryPrefix(label: string): string {
  return label.replace(/^vô địch\s+/i, "").trim();
}

export function getSpecificHonourLabel(
  awardKey: string,
  fallbackLabel: string,
  context: HonourDisplayContext = {},
): string {
  if (awardKey === "league_title") {
    return context.leagueName
      ? `Vô địch ${context.leagueName}`
      : fallbackLabel || "Vô địch giải quốc gia";
  }

  if (awardKey === "domestic_cup_title") {
    const cupName = context.leagueId
      ? getDomesticCupNameByLeagueId(context.leagueId)
      : getDomesticCupNameFromLeagueName(context.leagueName);
    return cupName !== "Cup Quốc Gia"
      ? `Vô địch ${cupName}`
      : fallbackLabel || "Vô địch Cúp quốc gia";
  }

  if (awardKey === "continental_title") {
    const cupName = context.continentalType ? getContinentalCupLabel(context.continentalType) : "";
    return cupName && cupName !== "Cúp Châu Lục CLB"
      ? `Vô địch ${cupName}`
      : fallbackLabel || "Vô địch cúp châu lục";
  }

  if (awardKey === "national_team_title" && context.nationalTeamType) {
    return `Vô địch ${context.nationalTeamType}`;
  }

  return fallbackLabel || fallbackAfterVictoryPrefix(awardKey);
}

export function getHonourIdentity(
  awardKey: string,
  _label: string,
  slotKey?: string | null,
): string {
  return `${awardKey}:${slotKey ?? "winner"}`;
}
