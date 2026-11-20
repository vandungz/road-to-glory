import { TOP_TEN_LIMIT, type AwardRankingEntry } from "@/types/awards";

/** The final wheel owns the career player's rank; rivals retain their saved order. */
export function placeBallonDorPlayer(entries: AwardRankingEntry[], rank: number, player: {
  candidateKey: string; name: string; position: string; clubName: string;
}): AwardRankingEntry[] {
  const current = entries.find((entry) => entry.isCareerPlayer);
  const rivals = entries.filter((entry) => !entry.isCareerPlayer).map((entry) => ({ ...entry }));
  const playerEntry: AwardRankingEntry = {
    score: 0, weight: 0, metrics: {}, ...current, ...player,
    isCareerPlayer: true, rank, result: rank === 1 ? "winner" : rank === 2 ? "runner_up" : "nominee",
  };
  rivals.splice(Math.min(rank - 1, rivals.length), 0, playerEntry);
  return rivals.slice(0, TOP_TEN_LIMIT).map((entry, index) => ({ ...entry, rank: index + 1,
    result: entry.isCareerPlayer ? (index === 0 ? "winner" : index === 1 ? "runner_up" : "nominee") : "ranked" }));
}
