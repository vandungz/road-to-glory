import {
  aggregateCareerStats,
  buildCareerArchiveTimeline,
  recoverLegacyOvrByAge,
  calculatePeakOvr,
  normalizeClubStints,
} from "@/features/career/services/career-summary.service";
import type { ClubStint, StatSnapshot } from "@/types/domain";

const timeline: StatSnapshot[] = [{ age: 17, ovr: 88, apps: 20, goals: 8, assists: 1 }];
const stints: ClubStint[] = [
  { clubId: "newcastle", clubName: "Newcastle United", leagueId: "ENG1", leagueName: "Premier League", startAge: 17, endAge: 24, yearsAtClub: 8, ovrAtJoining: 72, ovrAtLeaving: 86 },
  { clubId: "ac-milan", clubName: "AC Milan", leagueId: "ITA1", leagueName: "Serie A", startAge: 25, endAge: 27, yearsAtClub: 3, ovrAtJoining: 86, ovrAtLeaving: 87 },
  { clubId: "arsenal", clubName: "Arsenal", leagueId: "ENG1", leagueName: "Premier League", startAge: 28, endAge: 28, yearsAtClub: 1, ovrAtJoining: 87, ovrAtLeaving: 87 },
];
const history = Object.fromEntries(
  Array.from({ length: 17 }, (_, index) => {
    const age = 17 + index;
    return [String(age), { age, clubName: age < 25 ? "Newcastle United" : age < 28 ? "AC Milan" : "Arsenal", apps: age === 17 ? 20 : 30, goals: age === 17 ? 8 : 10, assists: 1 }];
  }),
);

const totals = aggregateCareerStats({ seasonHistory: history, statsTimeline: timeline });
if (totals.apps !== 500 || totals.goals !== 168 || totals.assists !== 17) {
  throw new Error(`Unexpected career totals: ${JSON.stringify(totals)}`);
}
const archiveTimeline = buildCareerArchiveTimeline({ seasonHistory: history, statsTimeline: timeline, debutAge: 17, retireAge: 33 });
if (archiveTimeline.length !== 17 || archiveTimeline[0]?.apps !== 20 || archiveTimeline.at(-1)?.goals !== 10) {
  throw new Error(`Archive timeline was not materialized: ${JSON.stringify(archiveTimeline)}`);
}
const legacyDevelopment: Record<number, Array<[string, number]>> = {
  17: [["dri", 4], ["sho", 3], ["pac", 5], ["def", 1]],
  18: [["sho", 3]], 19: [["sho", 2], ["pac", 2]], 20: [["dri", 2], ["sho", 2]],
  21: [["sho", 4], ["dri", 2], ["pas", 4], ["pac", 3], ["phy", 2]], 22: [["sho", -1]],
  23: [["def", 2], ["sho", 2], ["dri", 5]], 24: [["sho", 2], ["pac", 5], ["dri", 2]],
  25: [["dri", 3], ["pas", 3]], 26: [["dri", 3]], 27: [], 28: [["pac", 2]],
  29: [], 30: [["sho", 2], ["phy", 2]], 31: [], 32: [], 33: [["sho", -1]],
};
const legacyOvrByAge = recoverLegacyOvrByAge({
  position: "ST",
  debutAge: 17,
  retireAge: 33,
  seasonHistory: history,
  statsTimeline: [{ age: 17, ovr: 88, pac: 89, sho: 92, pas: 64, dri: 98, def: 33, phy: 64 }],
  seasons: Array.from({ length: 17 }, (_, index) => {
    const age = 17 + index;
    return {
      age,
      ...(age === 17 ? { summary: { latestTimeline: { age: 17, ovr: 75, pac: 77, sho: 77, pas: 57, dri: 81, def: 31, phy: 60 } } } : {}),
      runtimeState: { evolvedStatsThisYear: (legacyDevelopment[age] ?? []).map(([stat, delta]) => ({ stat, delta })) },
    };
  }),
});
const expectedLegacyOvr = [75, 76, 78, 79, 82, 82, 83, 86, 87, 87, 87, 88, 88, 89, 89, 89, 88];
if (expectedLegacyOvr.some((ovr, index) => legacyOvrByAge[17 + index] !== ovr)) {
  throw new Error(`Legacy OVR recovery failed: ${JSON.stringify(legacyOvrByAge)}`);
}
if (calculatePeakOvr(timeline, 89) !== 89) throw new Error("Peak OVR did not use persisted projection");

const normalized = normalizeClubStints(stints, history);
const finalStint = normalized.at(-1);
if (finalStint?.endAge !== 33 || finalStint.yearsAtClub !== 6) {
  throw new Error(`Final club stint was not extended: ${JSON.stringify(finalStint)}`);
}

console.log("career-summary-check: passed");
