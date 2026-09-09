import { resolveRandom, type RandomSource } from "@/lib/wheel-engine/spin-resolver";
import { applyPrestigeToCsRate, clampCompetitionStats, getPerAppRates, type CompContext } from "@/lib/season-stat-rates";

export type SyntheticCompetitionStats = {
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  rating: number;
};

export interface SyntheticLeagueClubInput {
  id: string;
  name: string;
  prestige: number;
}

export interface SyntheticLeagueInput {
  seasonId?: string;
  leagueTier?: number;
  clubs: SyntheticLeagueClubInput[];
  randomSource?: RandomSource;
}

export interface SyntheticAwardCandidate {
  candidateKey: string;
  name: string;
  position: string;
  clubName: string;
  ovr: number;
  leagueStats: SyntheticCompetitionStats;
  seasonStats: SyntheticCompetitionStats;
  teamSuccess: number;
}

interface SyntheticClub {
  name: string;
  strength: number;
  attack: number;
  defence: number;
  prestige: number;
  standing: number;
}

const FIRST_NAMES = [
  "Luka", "Noah", "Elias", "Milo", "Adrien", "Kenji", "Mateo", "Owen", "Sami", "Theo",
  "Marco", "Daniel", "Iker", "Jonas", "Rafael", "Kofi", "Julian", "Mats", "Nico", "Paolo",
  "Victor", "Ari", "Bruno", "Caio", "Dario", "Emil", "Felix", "Hugo", "Isaac", "Jamal",
  "Leon", "Marek", "Nabil", "Oscar", "Pavel", "Rui", "Stefan", "Tariq", "Yuto", "Zane",
];
const LAST_NAMES = [
  "Marin", "Silva", "Costa", "Hart", "Morel", "Ito", "Rossi", "Bell", "Diallo", "Martin",
  "Santos", "Kovac", "Nielsen", "Okafor", "Petrov", "Bennett", "Ferreira", "Tanaka", "Mendes", "Walker",
  "Alvarez", "Bauer", "Chen", "Duarte", "Eriksen", "Fischer", "Gomez", "Hassan", "Ivanov", "Jensen",
  "Keller", "Larsen", "Muller", "Novak", "Ortega", "Park", "Quinn", "Reyes", "Sato", "Varga",
];
const POSITION_ROTATION = [
  "GK", "GK", "GK", "GK", "LB", "LB", "RB", "RB", "CB", "CB", "CB", "CB", "CB", "CB",
  "CDM", "CDM", "CDM", "CM", "CM", "CM", "CM", "CAM", "CAM", "LM", "LM", "RM", "RM",
  "LW", "LW", "RW", "RW", "ST", "ST", "ST", "ST", "ST", "ST", "CM", "CB", "LB", "RW",
];
const DEFENSIVE_POSITIONS = new Set(["GK", "CB", "LB", "RB", "CDM", "CM"]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function normal(source: RandomSource, mean = 0, deviation = 1): number {
  const u1 = Math.max(0.0001, source());
  const u2 = source();
  return mean + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * deviation;
}

function poisson(mean: number, source: RandomSource): number {
  if (mean <= 0) return 0;
  if (mean > 28) return Math.max(0, Math.round(normal(source, mean, Math.sqrt(mean))));
  const limit = Math.exp(-mean);
  let product = 1;
  let count = 0;
  do {
    count += 1;
    product *= Math.max(0.0001, source());
  } while (product > limit && count < 80);
  return Math.max(0, count - 1);
}

function binomial(trials: number, probability: number, source: RandomSource): number {
  let successes = 0;
  for (let index = 0; index < trials; index += 1) {
    if (source() < probability) successes += 1;
  }
  return successes;
}

function combineStats(statsList: SyntheticCompetitionStats[]): SyntheticCompetitionStats {
  const apps = statsList.reduce((sum, stats) => sum + stats.apps, 0);
  if (apps <= 0) return { apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 0 };
  return {
    apps,
    goals: statsList.reduce((sum, stats) => sum + stats.goals, 0),
    assists: statsList.reduce((sum, stats) => sum + stats.assists, 0),
    cleanSheets: statsList.reduce((sum, stats) => sum + stats.cleanSheets, 0),
    rating: round(statsList.reduce((sum, stats) => sum + stats.rating * stats.apps, 0) / apps),
  };
}

function buildClubs(input: SyntheticLeagueInput, source: RandomSource): SyntheticClub[] {
  const clubs = input.clubs.filter((club) => club.name.trim().length > 0);
  if (clubs.length === 0) {
    throw new Error("Cannot simulate league awards without the current league club set");
  }
  const leagueTier = input.leagueTier ?? (clubs.length >= 18 ? 1 : 2);
  const leagueBase = leagueTier <= 1 ? 3.65 : 2.65;
  const rawClubs = clubs.map((club) => {
    const prestigeBaseline = clamp(club.prestige, 1, 5);
    const strength = clamp(
      (prestigeBaseline * 0.7) + (leagueBase * 0.3) + normal(source, 0, 0.35),
      1.2,
      4.9,
    );
    return {
      name: club.name,
      strength,
      attack: clamp(strength + normal(source, 0, 0.22), 1, 5),
      defence: clamp(strength + normal(source, 0, 0.22), 1, 5),
    };
  }).sort((left, right) => right.strength - left.strength);

  return rawClubs.map((club, index) => ({
    ...club,
    prestige: clamp(Math.round(club.strength), 1, 5),
    standing: 1 + Math.round((index / Math.max(1, rawClubs.length - 1)) * Math.max(1, rawClubs.length - 1)),
  }));
}

function positionUsage(position: string, metric: "goals" | "assists"): number {
  if (metric === "goals") {
    if (position === "ST") return 1.08;
    if (["LW", "RW", "CAM"].includes(position)) return 0.9;
    if (["LM", "RM"].includes(position)) return 0.72;
    if (position === "CM") return 0.55;
    return 0.3;
  }
  if (["CAM", "LM", "RM"].includes(position)) return 1.1;
  if (["LW", "RW", "CM"].includes(position)) return 0.95;
  if (position === "ST") return 0.72;
  if (["LB", "RB", "CDM"].includes(position)) return 0.6;
  return 0.25;
}

function buildAttributes(position: string, ovr: number, source: RandomSource): Record<string, number> {
  const offsets: Record<string, number> = position === "GK"
    ? { div: 3, han: 2, kic: 0, ref: 4, spd: -2, pos: 4 }
    : position === "ST"
      ? { pac: 2, sho: 5, pas: -2, dri: 2, def: -14, phy: 3 }
      : ["LW", "RW"].includes(position)
        ? { pac: 4, sho: 2, pas: 1, dri: 4, def: -12, phy: -1 }
        : position === "CAM"
          ? { pac: 0, sho: 1, pas: 5, dri: 4, def: -7, phy: -2 }
          : ["LM", "RM"].includes(position)
            ? { pac: 3, sho: 0, pas: 3, dri: 2, def: -2, phy: 0 }
            : position === "CM"
              ? { pac: -1, sho: 0, pas: 4, dri: 1, def: 2, phy: 1 }
              : position === "CDM"
                ? { pac: -3, sho: -3, pas: 2, dri: -2, def: 6, phy: 5 }
                : ["LB", "RB"].includes(position)
                  ? { pac: 3, sho: -2, pas: 1, dri: 1, def: 5, phy: 1 }
                  : { pac: -2, sho: -4, pas: -1, dri: -3, def: 7, phy: 5 };
  return Object.fromEntries(Object.entries(offsets).map(([key, offset]) => [
    key,
    Math.round(clamp(ovr + offset + normal(source, 0, 2.5), 35, 99)),
  ]));
}

function generateStats(
  position: string,
  ovr: number,
  apps: number,
  club: SyntheticClub,
  attributes: Record<string, number>,
  context: CompContext,
  source: RandomSource,
): SyntheticCompetitionStats {
  if (apps <= 0) return { apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 0 };
  const rates = getPerAppRates(position, ovr, context, attributes);
  const attackFactor = clamp(0.84 + (club.attack - 1) * 0.075, 0.84, 1.14);
  const creationFactor = clamp(0.86 + (club.attack - 1) * 0.06, 0.86, 1.1);
  const qualityFactor = clamp(0.86 + (ovr - 60) * 0.006, 0.86, 1.08);
  const goalsMean = apps * rates.goals * attackFactor * qualityFactor * positionUsage(position, "goals");
  const assistsMean = apps * rates.assists * creationFactor * qualityFactor * positionUsage(position, "assists");
  const cleanSheetChance = clamp(applyPrestigeToCsRate(rates.cleanSheets, club.prestige) * (0.86 + club.defence * 0.045), 0, 0.78);
  const goals = poisson(goalsMean, source);
  const assists = poisson(assistsMean, source);
  const cleanSheets = DEFENSIVE_POSITIONS.has(position) ? binomial(apps, cleanSheetChance, source) : 0;
  const bounded = clampCompetitionStats(position, apps, goals, assists, cleanSheets);
  const contributionRate = (bounded.goals + bounded.assists) / Math.max(1, apps);
  const defensiveRate = cleanSheets / Math.max(1, apps);
  const rating = clamp(
    6.25 + (ovr - 70) * 0.038 + (club.strength - 3) * 0.12 + contributionRate * 1.05 + defensiveRate * 0.72 + normal(source, 0, 0.13),
    5.9,
    8.9,
  );
  return { ...bounded, apps, rating: round(rating) };
}

function seasonStats(
  position: string,
  ovr: number,
  leagueStats: SyntheticCompetitionStats,
  club: SyntheticClub,
  attributes: Record<string, number>,
  leagueClubsCount: number,
  squadRole: "starter" | "rotation" | "backup",
  source: RandomSource,
): SyntheticCompetitionStats {
  const cupApps = clamp(Math.round(leagueStats.apps * (squadRole === "starter" ? 0.16 : 0.1)), 0, 6);
  const continentalQualified = club.standing <= Math.max(4, Math.ceil(leagueClubsCount * 0.3));
  const continentalApps = continentalQualified
    ? clamp(Math.round(leagueStats.apps * (squadRole === "starter" ? 0.25 : 0.14)), 0, 13)
    : 0;
  return combineStats([
    leagueStats,
    generateStats(position, ovr, cupApps, club, attributes, "domestic_cup", source),
    ...(continentalApps > 0 ? [generateStats(position, ovr, continentalApps, club, attributes, "continental", source)] : []),
  ]);
}

function teamSuccess(standing: number, prestige: number): number {
  if (standing === 1) return 18 + prestige;
  if (standing <= 4) return 12 + Math.max(0, prestige - 3);
  if (standing <= 10) return 7;
  return 3;
}

export function generateSyntheticLeagueCandidates(input: SyntheticLeagueInput): SyntheticAwardCandidate[] {
  const source = input.randomSource ?? resolveRandom;
  const clubs = buildClubs(input, source);
  const leagueClubsCount = clubs.length;
  const leagueTier = input.leagueTier ?? (leagueClubsCount >= 18 ? 1 : 2);
  const leagueBaseOvr = leagueTier <= 1 ? 78 : 72;
  const leagueMatches = Math.max(18, (Math.max(2, leagueClubsCount) - 1) * 2);

  return POSITION_ROTATION.map((position, index) => {
    const club = clubs[index % clubs.length];
    const age = 19 + Math.floor(source() * 16);
    const ageModifier = age >= 23 && age <= 29 ? 2 : age >= 30 ? -1 : -2;
    const positionModifier = position === "ST" || position === "CAM" ? 1 : 0;
    const ovr = Math.round(clamp(
      leagueBaseOvr + (club.strength - (leagueTier <= 1 ? 3.65 : 2.65)) * 2.4 + ageModifier + positionModifier + normal(source, 0, 3.3),
      58,
      95,
    ));
    const referenceOvr = 48 + club.strength * 7.3;
    const starterProbability = clamp(0.42 + (ovr - referenceOvr) * 0.035, 0.24, 0.9);
    const roleRoll = source();
    const squadRole: "starter" | "rotation" | "backup" = roleRoll < starterProbability
      ? "starter"
      : roleRoll < starterProbability + 0.25 ? "rotation" : "backup";
    const availabilityBase = squadRole === "starter" ? 0.82 : squadRole === "rotation" ? 0.56 : 0.28;
    const availability = clamp(availabilityBase + normal(source, 0, 0.07), 0.08, 0.98);
    const apps = Math.round(leagueMatches * availability);
    const attributes = buildAttributes(position, ovr, source);
    const leagueStats = generateStats(position, ovr, apps, club, attributes, "league", source);
    return {
      candidateKey: `generated:${input.seasonId ?? "season"}:${index}`,
      name: `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[index % LAST_NAMES.length]}`,
      position,
      clubName: club.name,
      ovr,
      leagueStats,
      seasonStats: seasonStats(position, ovr, leagueStats, club, attributes, leagueClubsCount, squadRole, source),
      teamSuccess: teamSuccess(club.standing, club.prestige),
    };
  });
}
