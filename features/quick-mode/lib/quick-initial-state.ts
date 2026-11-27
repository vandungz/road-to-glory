import type { QuickPlayer, QuickClubDraft, QuickFinale, QuickModeState } from "../types";
export const INITIAL_PLAYER: QuickPlayer = {
    name: "",
    nationality: "England",
    position: "ST",
    debutAge: null,
    careerLength: null,
    stats: {},
    trait: null,
    clubCount: null,
};
export const INITIAL_DRAFT: QuickClubDraft = {
    leagueId: null,
    leagueName: null,
    clubId: null,
    clubName: null,
    prestige: null,
    seasons: null,
    leagueTitles: null,
    domesticCups: null,
    internationalCups: null,
    internationalCupTypes: [],
    improvements: [],
    improvementCount: null,
    improvementTarget: null,
};
export const INITIAL_FINALE: QuickFinale = {
    appearances: null,
    goals: null,
    assists: null,
    cleanSheets: null,
    ballonDorWins: null,
    otherAwardCount: null,
    otherAwardTypes: [],
};
export function createInitialState(): QuickModeState {
    return {
        version: 5,
        phase: "setup",
        setupStep: 0,
        careerClubIndex: 0,
        careerStep: 0,
        finaleStep: 0,
        player: { ...INITIAL_PLAYER, stats: {} },
        clubDraft: { ...INITIAL_DRAFT, improvements: [] },
        clubs: [],
        finale: { ...INITIAL_FINALE, otherAwardTypes: [] },
        lastResult: null,
    };
}
