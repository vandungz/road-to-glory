import { calculateOvrByPosition } from "@/lib/wheel-engine/weight-calculator";

export interface StatEvolutionItem {
  stat: string;
  delta: number;
}

export interface PlayerStatsInput {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
}

export interface StatsEvolutionResult {
  nextStats: PlayerStatsInput;
  nextOvr: number;
}

export function evolvePlayerStatsService(params: {
  currentStats: PlayerStatsInput;
  position: string;
  evolutions: StatEvolutionItem[];
}): StatsEvolutionResult {
  const { currentStats, position, evolutions } = params;

  const nextStats = { ...currentStats };

  // Áp dụng các thay đổi điểm thuộc tính một cách an toàn trên server
  for (const evo of evolutions) {
    const key = evo.stat.toLowerCase() as keyof PlayerStatsInput;
    if (key in nextStats) {
      nextStats[key] = Math.min(99, Math.max(10, nextStats[key] + evo.delta));
    }
  }

  // Tính toán lại OVR chuẩn xác từ Backend
  const nextOvr = calculateOvrByPosition(position, nextStats);

  return {
    nextStats,
    nextOvr,
  };
}
