import { resolveWeightedOutcome, type RandomSource } from "@/lib/wheel-engine/spin-resolver";
import { generateSyntheticLeagueCandidates, type SyntheticAwardCandidate } from "./synthetic-league.service";

export interface GlobalAwardClub {
  id: string;
  name: string;
  prestige: number;
  leagueId: string;
  league: { prestige: number; tier: number };
}

/** Relative nomination weight, normalized to probabilities by the final weighted draw. */
export function globalAwardCandidateWeight(clubPrestige: number, leaguePrestige: number, seasonScore: number): number {
  return Math.pow(Math.max(1, Math.min(5, clubPrestige)), 5)
    * Math.pow(Math.max(1, Math.min(5, leaguePrestige)), 4)
    * Math.max(0.5, Math.min(2, Math.pow(Math.max(1, seasonScore) / 100, 2)));
}

/** Comparable season output: a weak league's raw totals do not carry elite-league value. */
export function globalAwardPrestigeFactor(clubPrestige: number, leaguePrestige: number): number {
  const strength = 0.35 * Math.max(1, Math.min(5, clubPrestige)) + 0.65 * Math.max(1, Math.min(5, leaguePrestige));
  return 0.55 + 0.45 * (strength - 1) / 4;
}

export function generateGlobalBallonRivals(clubs: GlobalAwardClub[], seasonId: string | undefined, source: RandomSource): SyntheticAwardCandidate[] {
  const leagues = new Map<string, GlobalAwardClub[]>();
  for (const club of clubs) {
    if (club.league.tier !== 1) continue;
    const group = leagues.get(club.leagueId) ?? [];
    if (!group.some((other) => other.id === club.id)) group.push(club);
    leagues.set(club.leagueId, group);
  }
  const candidates = [...leagues].flatMap(([leagueId, roster]) => {
    const byName = new Map(roster.map((club) => [club.name, club]));
    return generateSyntheticLeagueCandidates({ seasonId, leagueTier: 1, clubs: roster, balancedClubPositions: true, randomSource: source })
      .map((candidate) => {
        const club = byName.get(candidate.clubName)!;
        const stats = candidate.seasonStats;
        const score = stats.rating * 9 + stats.goals * 1.25 + stats.assists * 1.15 + candidate.teamSuccess * 0.85 + candidate.ovr * 0.14;
        return { candidate: { ...candidate, candidateKey: `${candidate.candidateKey}:${leagueId}`,
          ballonDorPrestigeFactor: globalAwardPrestigeFactor(club.prestige, club.league.prestige) }, club,
          weight: globalAwardCandidateWeight(club.prestige, club.league.prestige, score) };
      });
  });
  const selected: SyntheticAwardCandidate[] = [];
  const leagueCounts = new Map<string, number>();
  const clubCounts = new Map<string, number>();
  while (selected.length < 10 && candidates.length) {
    const available = candidates.filter(({ club }) => (leagueCounts.get(club.leagueId) ?? 0) < 4 && (clubCounts.get(club.id) ?? 0) < 2);
    if (!available.length) break;
    const picked = resolveWeightedOutcome(available.map((value) => ({ value, weight: value.weight })), source);
    selected.push(picked.candidate);
    leagueCounts.set(picked.club.leagueId, (leagueCounts.get(picked.club.leagueId) ?? 0) + 1);
    clubCounts.set(picked.club.id, (clubCounts.get(picked.club.id) ?? 0) + 1);
    candidates.splice(candidates.indexOf(picked), 1);
  }
  return selected;
}
