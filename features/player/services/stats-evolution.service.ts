import { calculateOvrByPosition } from "@/lib/wheel-engine/weight-calculator";

export interface StatEvolutionItem {
  stat: string;
  delta: number;
}

export type PlayerStatsInput = Record<string, number>;

export interface StatsEvolutionResult {
  nextStats: Record<string, number>;
  nextOvr: number;
}

export function evolvePlayerStatsService(params: {
  currentStats: Record<string, number>;
  position: string;
  evolutions: StatEvolutionItem[];
}): StatsEvolutionResult {
  const { currentStats, position, evolutions } = params;

  const nextStats = { ...currentStats };

  for (const evo of evolutions) {
    const key = evo.stat.toLowerCase();
    if (key in nextStats) {
      nextStats[key] = Math.min(99, Math.max(10, nextStats[key] + evo.delta));
    }
  }

  const nextOvr = calculateOvrByPosition(position, nextStats);

  return {
    nextStats,
    nextOvr,
  };
}
