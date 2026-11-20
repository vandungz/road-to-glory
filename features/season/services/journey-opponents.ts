import { resolveRandom, resolveWeightedOutcome, type RandomSource } from "@/lib/wheel-engine/spin-resolver";

export function clubJourneyStrength(club: { prestige: number; league?: { prestige: number } }): number {
  return 0.8 * club.prestige + 0.2 * (club.league?.prestige ?? club.prestige);
}

/** Round 0 = last 64; round 5 = final. Weight calculation contains no randomness. */
export function journeyOpponentWeight(strength: number, round: number): number {
  const boundedStrength = Number.isFinite(strength) ? Math.min(5, Math.max(1, strength)) : 3;
  return Math.exp((boundedStrength - 3) * (0.12 + 0.35 * Math.min(5, Math.max(0, round))));
}

export function journeyRounds(result: string, domestic: boolean): number[] {
  const lastRound = ({ "Early Exit": 0, "Round of 32": 1, "Round of 16": 2,
    "Quarter-Finals": 3, "Semi-Finals": 4, "Runner-Up": 5, Winner: 5 } as Record<string, number>)[result];
  const firstRound = domestic ? 0 : 2;
  return lastRound == null || lastRound < firstRound ? []
    : Array.from({ length: lastRound - firstRound + 1 }, (_, index) => firstRound + index);
}

export function drawJourneyOpponents<T extends { id: string }>(
  pool: T[], rounds: number[], strength: (team: T) => number,
  randomSource: RandomSource = resolveRandom,
): T[] {
  if (!pool.length) return [];
  const uniquePool = [...new Map(pool.map((team) => [team.id, team])).values()];
  const used = new Set<string>();
  const selected: T[] = [];
  // Reserve finalists first so early draws cannot exhaust a small pool's strongest teams.
  for (let index = rounds.length - 1; index >= 0; index--) {
    const available = uniquePool.filter((team) => !used.has(team.id));
    // shortcut: undersized reference pools may repeat; replace with season rosters when available.
    const candidates = available.length ? available : uniquePool;
    const team = resolveWeightedOutcome(candidates.map((value) => ({
      value, weight: journeyOpponentWeight(strength(value), rounds[index]),
    })), randomSource);
    used.add(team.id);
    selected[index] = team;
  }
  return selected;
}
