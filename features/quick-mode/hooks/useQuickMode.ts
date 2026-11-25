"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { randomPortraitId } from "@/features/player/lib/player-portraits";
import { resolveWeightedOutcome, type WeightedItem } from "@/lib/wheel-engine/spin-resolver";
import { getFlagEmoji } from "@/types/squad";
import { applyTrait, getTraitPool } from "../lib/traits";
import { getQuickCountRanges, resolveQuickCountRange, type QuickCountRangeItem } from "../lib/quick-count-ranges";
import {
  DEBUT_AGE_POOL,
  getAppearancePool,
  getAssistPool,
  getBallonDorPool,
  getBoundedCountPool,
  getCleanSheetPool,
  getClubCountPool,
  getDomesticCupPool,
  getGoalPool,
  getImprovementGatePool,
  getImprovementCountPool,
  getIndividualAwardPool,
  getInternationalCountPool,
  getInternationalCupTypePool,
  getQuickOverall,
  getLeagueTitlePool,
  getQuickStatKeys,
  getQuickStatLabel,
  getSeasonCountPool,
  getQuickCareerLengthPool,
  getStatPool,
  getTraitGatePool,
  getTraitItems,
  isQuickClubEligible,
  isQuickLeagueEligible,
} from "../lib/quick-mode-engine";
import { clearQuickModeState, loadQuickModeState, saveQuickModeState } from "../lib/quick-mode-storage";
import type {
  QuickClubDraft,
  QuickClubJourney,
  QuickClubOption,
  QuickFinale,
  QuickLeagueOption,
  QuickModeState,
  QuickPlayer,
  QuickInternationalCupType,
  QuickStatKey,
  QuickStats,
} from "../types";

interface UseQuickModeProps {
  leagues: QuickLeagueOption[];
  clubs: QuickClubOption[];
}

export interface ActiveWheel {
  key: string;
  items: QuickWheelItem[];
  spinItems?: WeightedItem<unknown>[];
}

type QuickWheelItem = WeightedItem<unknown> & { active?: boolean; label?: string; range?: QuickCountRangeItem["range"] };

const INITIAL_PLAYER: QuickPlayer = {
  name: "",
  nationality: "England",
  position: "ST",
  debutAge: null,
  careerLength: null,
  stats: {},
  trait: null,
  clubCount: null,
};

const INITIAL_DRAFT: QuickClubDraft = {
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

const INITIAL_FINALE: QuickFinale = {
  appearances: null,
  goals: null,
  assists: null,
  cleanSheets: null,
  ballonDorWins: null,
  otherAwardCount: null,
  otherAwardTypes: [],
};

function createInitialState(): QuickModeState {
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

function draftToJourney(draft: QuickClubDraft, clubIndex: number): QuickClubJourney {
  return {
    clubIndex,
    leagueId: draft.leagueId ?? "unknown",
    leagueName: draft.leagueName ?? "Không rõ giải",
    clubId: draft.clubId ?? "unknown",
    clubName: draft.clubName ?? "Không rõ CLB",
    prestige: draft.prestige ?? 1,
    seasons: draft.seasons ?? 1,
    leagueTitles: draft.leagueTitles ?? 0,
    domesticCups: draft.domesticCups ?? 0,
    internationalCups: draft.internationalCups ?? 0,
    internationalCupTypes: draft.internationalCupTypes.slice(0, Math.max(0, draft.internationalCups ?? 0)),
    improvements: draft.improvements,
  };
}

function applyImprovements(stats: QuickStats, improvements: QuickClubJourney["improvements"]): QuickStats {
  const next = { ...stats };
  for (const improvement of improvements) {
    next[improvement.stat] = Math.min(10, (next[improvement.stat] ?? 5) + improvement.delta);
  }
  return next;
}

function getFinalTitles(state: QuickModeState): number {
  return state.clubs.reduce((sum, club) => sum + club.leagueTitles, 0);
}

function getCareerYearsSpent(state: QuickModeState): number {
  return state.clubs.reduce((sum, club) => sum + club.seasons, 0);
}

function needsCleanSheetSpin(state: QuickModeState): boolean {
  // Keep the existing finale step numbers so saved runs resume at the same award.
  return state.phase === "finale" && state.finaleStep >= 2 && state.finale.cleanSheets == null;
}

function getCareerSeasonPool(state: QuickModeState): WeightedItem<number>[] {
  const careerLength = state.player.careerLength ?? 1;
  const remainingYears = Math.max(1, careerLength - getCareerYearsSpent(state));
  const remainingClubs = Math.max(1, (state.player.clubCount ?? 1) - state.careerClubIndex);
  const maxThisClub = Math.max(1, remainingYears - (remainingClubs - 1));

  // The final club must absorb every remaining year. This keeps the career
  // length wheel authoritative even when the club-count wheel returns one.
  if (remainingClubs === 1) return [{ value: remainingYears, weight: 1 }];
  return getSeasonCountPool(maxThisClub);
}

function getImprovementStatPool(state: QuickModeState): QuickStatKey[] {
  return getQuickStatKeys(state.player.position).filter((key) => {
    const currentValue = state.player.stats[key] ?? 5;
    return currentValue < 10 && !state.clubDraft.improvements.some((item) => item.stat === key);
  });
}

function getImprovementValueWheel(currentValue: number): { items: QuickWheelItem[]; spinItems: WeightedItem<number>[] } {
  const allValues = getStatPool().map((item) => ({ ...item, active: item.value > currentValue, weight: 1 }));
  const spinItems = allValues.filter((item) => item.active).map((item) => ({ value: item.value, weight: item.weight }));
  return { items: allValues, spinItems };
}

function valueLabel(value: unknown): string {
  if (typeof value === "object" && value !== null && "name" in value) return String(value.name);
  return String(value);
}

export function useQuickMode({ leagues, clubs }: UseQuickModeProps) {
  const [state, setState] = useState<QuickModeState>(createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [targetIndex, setTargetIndex] = useState(-1);
  const pendingResultRef = useRef<unknown>(null);

  useEffect(() => {
    const saved = loadQuickModeState();
    if (saved) setState(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveQuickModeState(state);
  }, [hydrated, state]);

  const setIdentity = useCallback((values: Partial<Pick<QuickPlayer, "name" | "nationality" | "position">>) => {
    const portraitId = randomPortraitId();
    setState((current) => ({ ...current, player: { ...current.player, ...values, portraitId: current.player.portraitId ?? portraitId }, lastResult: null }));
  }, []);

  const reset = useCallback(() => {
    clearQuickModeState();
    setState(createInitialState());
    setIsSpinning(false);
    setTargetIndex(-1);
    pendingResultRef.current = null;
  }, []);

  const activeWheel = useMemo<ActiveWheel | null>(() => {
    if (!hydrated || state.phase === "complete") return null;
    const { player, clubDraft } = state;

    if (state.phase === "setup") {
      if (state.setupStep === 0) return { key: "debut-age", items: DEBUT_AGE_POOL };
      if (state.setupStep === 1) return { key: "career-length", items: getQuickCareerLengthPool() };
      if (state.setupStep >= 2 && state.setupStep <= 8) {
        const key = getQuickStatKeys(player.position)[state.setupStep - 2];
        if (!key) return null;
        return { key: `stat-${key}`, items: getStatPool() };
      }
      if (state.setupStep === 9) return { key: "trait-gate", items: getTraitGatePool() };
      if (state.setupStep === 10) {
        const traitItems = getTraitItems(player.position);
        return {
          key: "trait",
          items: traitItems,
          spinItems: traitItems.filter((item) => item.active !== false).map(({ value, weight }) => ({ value, weight })),
        };
      }
      return { key: "club-count", items: getClubCountPool() };
    }

    if (state.phase === "career") {
      if (state.careerStep === 0) {
        const usedLeagues = new Set(state.clubs.map((club) => club.leagueId));
        const pool = leagues.filter((league) => !usedLeagues.has(league.id) && isQuickLeagueEligible(league, player.stats, clubs));
        return { key: "league", items: pool.map((league) => ({ value: league, label: league.name, weight: Math.max(1, league.prestige) })) };
      }
      if (state.careerStep === 1) {
        const pool = clubs.filter((club) => club.leagueId === clubDraft.leagueId && !state.clubs.some((used) => used.clubId === club.id) && isQuickClubEligible(club, player.stats));
        return { key: "club", items: pool.map((club) => ({ value: club, label: club.name, weight: Math.max(1, club.prestige) })) };
      }
      if (state.careerStep === 2) {
        return { key: "club-seasons", items: getCareerSeasonPool(state) };
      }
      if (state.careerStep === 3) return { key: "league-titles", items: getLeagueTitlePool(clubDraft.seasons ?? 1, clubDraft.prestige ?? 1, player.stats) };
      if (state.careerStep === 4) return { key: "domestic-cups", items: getDomesticCupPool(clubDraft.seasons ?? 1, clubDraft.prestige ?? 1, player.stats) };
      if (state.careerStep === 5) {
        const yesWeight = (clubDraft.prestige ?? 1) >= 4 ? 55 : 25;
        return { key: "international-gate", items: [{ value: "yes", label: "CÓ", weight: yesWeight }, { value: "no", label: "KHÔNG", weight: 100 - yesWeight }] };
      }
      if (state.careerStep === 6) {
        const maxInternationalCups = Math.max(1, clubDraft.seasons ?? 1);
        return { key: "international-cups", items: getInternationalCountPool(maxInternationalCups) };
      }
      if (state.careerStep === 7) {
        const confederation = leagues.find((league) => league.id === clubDraft.leagueId)?.confederation ?? "UEFA";
        const forceHighest = (clubDraft.leagueTitles ?? 0) >= (clubDraft.seasons ?? 1);
        return { key: "international-cup-type", items: getInternationalCupTypePool(confederation, clubDraft.prestige ?? 1, forceHighest) };
      }
      if (state.careerStep === 8) return { key: "improvement-gate", items: getImprovementGatePool(getQuickOverall(player.stats)) };
      if (state.careerStep === 9) {
        const availableCount = Math.min(6, getImprovementStatPool(state).length);
        return { key: "improvement-count", items: getImprovementCountPool(availableCount) };
      }
      if (state.careerStep === 10) {
        const available = getImprovementStatPool(state);
        return { key: "improvement-stat", items: available.map((key) => ({ value: key, label: getQuickStatLabel(key), weight: 1 })) };
      }
      const target = state.clubDraft.improvementTarget;
      const currentValue = target ? state.player.stats[target] ?? 5 : 5;
      const valueWheel = getImprovementValueWheel(currentValue);
      return { key: "improvement-value", items: valueWheel.items, spinItems: valueWheel.spinItems };
    }

    const outcomeContext = {
      stats: player.stats,
      careerLength: player.careerLength ?? 1,
      leagueTitles: getFinalTitles(state),
      domesticCups: state.clubs.reduce((sum, club) => sum + club.domesticCups, 0),
      internationalCups: state.clubs.reduce((sum, club) => sum + club.internationalCups, 0),
    };
    const seasonsPlayed = getCareerYearsSpent(state) || outcomeContext.careerLength;
    if (state.finale.appearances == null) return { key: "career-appearances", items: getQuickCountRanges(getAppearancePool({ ...outcomeContext, careerLength: seasonsPlayed }, state.finale.cleanSheets ?? 0), Math.max(seasonsPlayed * 12, state.finale.cleanSheets ?? 0)) };
    if (state.finaleStep === 0) return { key: "career-goals", items: getQuickCountRanges(getGoalPool(player.position, outcomeContext)) };
    if (state.finaleStep === 1) return { key: "career-assists", items: getQuickCountRanges(getAssistPool(player.position, outcomeContext)) };
    if (needsCleanSheetSpin(state)) {
      const appearances = state.finale.appearances;
      const items = getCleanSheetPool(player.position, { ...outcomeContext, careerLength: seasonsPlayed });
      return { key: "career-clean-sheets", items: getQuickCountRanges(items, 0, appearances) };
    }
    if (state.finaleStep === 2) return { key: "ballon-dor", items: getBallonDorPool({ ...outcomeContext, position: player.position, goals: state.finale.goals, assists: state.finale.assists }) };
    if (state.finaleStep === 3) return { key: "other-awards-gate", items: [{ value: "yes", label: "CÓ", weight: 52 }, { value: "no", label: "KHÔNG", weight: 48 }] };
    if (state.finaleStep === 4) return { key: "other-awards-count", items: getBoundedCountPool(5).filter((item) => item.value > 0) };
    const awardItems = getIndividualAwardPool(player.position, state.finale.otherAwardTypes, state.finale.goals, state.finale.assists);
    return {
      key: "other-award-type",
      items: awardItems,
      spinItems: awardItems.filter((item) => item.active !== false).map(({ value, weight }) => ({ value, weight })),
    };
  }, [clubs, hydrated, leagues, state]);

  const spin = useCallback(() => {
    if (isSpinning || !activeWheel || activeWheel.items.length === 0) return;
    const spinItems = activeWheel.spinItems ?? activeWheel.items;
    if (spinItems.length === 0) return;
    const result = resolveWeightedOutcome(spinItems);
    const index = activeWheel.items.findIndex((item) => Object.is(item.value, result));
    const range = activeWheel.items[index]?.range;
    pendingResultRef.current = range ? resolveQuickCountRange(range) : result;
    setTargetIndex(index);
    setIsSpinning(true);
  }, [activeWheel, isSpinning]);

  const completeSpin = useCallback(() => {
    const result = pendingResultRef.current;
    if (result === null || result === undefined) return;
    setState((current) => {
      const player = { ...current.player, stats: { ...current.player.stats } };
      const next = { ...current, player, lastResult: valueLabel(result) };

      if (current.phase === "setup") {
        if (current.setupStep === 0) player.debutAge = result as number;
        else if (current.setupStep === 1) player.careerLength = result as number;
        else if (current.setupStep >= 2 && current.setupStep <= 8) {
          const key = getQuickStatKeys(player.position)[current.setupStep - 2];
          if (key) player.stats[key] = result as number;
        } else if (current.setupStep === 9) {
          next.setupStep = result === "yes" ? 10 : 11;
        } else if (current.setupStep === 10) {
          const trait = result as NonNullable<QuickPlayer["trait"]>;
          player.trait = trait;
          player.stats = applyTrait(player.stats as Record<QuickStatKey, number>, trait);
          next.setupStep = 11;
        } else if (current.setupStep === 11) {
          player.clubCount = result as number;
          next.phase = "career";
          next.careerStep = 0;
        } else next.setupStep = current.setupStep + 1;
        if (current.setupStep !== 9 && current.setupStep !== 10 && current.setupStep !== 11) next.setupStep = current.setupStep + 1;
        return next;
      }

      if (current.phase === "career") {
        const draft = {
          ...current.clubDraft,
          improvements: [...current.clubDraft.improvements],
          internationalCupTypes: [...current.clubDraft.internationalCupTypes],
        };
        if (current.careerStep === 0) {
          const league = result as QuickLeagueOption;
          draft.leagueId = league.id; draft.leagueName = league.name; draft.prestige = league.prestige; next.careerStep = 1;
        } else if (current.careerStep === 1) {
          const club = result as QuickClubOption;
          draft.clubId = club.id; draft.clubName = club.name; draft.prestige = club.prestige; next.careerStep = 2;
        } else if (current.careerStep === 2) { draft.seasons = result as number; next.careerStep = 3;
        } else if (current.careerStep === 3) { draft.leagueTitles = result as number; next.careerStep = 4;
        } else if (current.careerStep === 4) { draft.domesticCups = result as number; next.careerStep = 5;
        } else if (current.careerStep === 5) {
          if (result === "yes" && (draft.seasons ?? 0) > 0) next.careerStep = 6;
          else { draft.internationalCups = 0; draft.internationalCupTypes = []; next.careerStep = 8; }
        } else if (current.careerStep === 6) {
          draft.internationalCups = result as number;
          draft.internationalCupTypes = [];
          if (draft.internationalCups > 0) next.careerStep = 7;
          else next.careerStep = 8;
        } else if (current.careerStep === 7) {
          const internationalCupTypes = [...draft.internationalCupTypes, result as QuickInternationalCupType];
          draft.internationalCupTypes = internationalCupTypes;
          next.careerStep = internationalCupTypes.length < (draft.internationalCups ?? 0) ? 7 : 8;
        } else if (current.careerStep === 8) {
          if (result === "yes" && getImprovementStatPool(current).length > 0) next.careerStep = 9;
          else return finalizeClub(next, draft, player);
        } else if (current.careerStep === 9) {
          draft.improvementCount = result as number;
          next.careerStep = 10;
        } else if (current.careerStep === 10) {
          draft.improvementTarget = result as QuickStatKey;
          next.careerStep = 11;
        } else {
          const stat = draft.improvementTarget;
          const previousValue = stat ? player.stats[stat] ?? 5 : 5;
          const nextValue = Math.max(previousValue, result as number);
          if (stat) draft.improvements.push({ stat, delta: nextValue - previousValue });
          draft.improvementTarget = null;
          if (draft.improvements.length >= (draft.improvementCount ?? 1)) return finalizeClub(next, draft, player);
          next.careerStep = 10;
        }
        next.clubDraft = draft;
        return next;
      }

      if (current.finale.appearances == null) {
        return { ...next, finale: { ...current.finale, appearances: result as number } };
      }
      if (needsCleanSheetSpin(current)) {
        return { ...next, finale: { ...current.finale, cleanSheets: result as number } };
      }
      if (current.finaleStep === 0) next.finale = { ...current.finale, goals: result as QuickFinale["goals"] };
      else if (current.finaleStep === 1) next.finale = { ...current.finale, assists: result as QuickFinale["assists"] };
      else if (current.finaleStep === 2) next.finale = { ...current.finale, ballonDorWins: result as number };
      else if (current.finaleStep === 3) {
        if (result === "yes") next.finaleStep = 4;
        else { next.finale = { ...current.finale, otherAwardCount: 0, otherAwardTypes: [] }; next.phase = "complete"; }
      } else if (current.finaleStep === 4) {
        next.finale = { ...current.finale, otherAwardCount: result as number, otherAwardTypes: [] };
        next.finaleStep = 5;
      } else {
        const otherAwardTypes = [...current.finale.otherAwardTypes, result as string];
        next.finale = { ...current.finale, otherAwardTypes };
        if (otherAwardTypes.length >= (current.finale.otherAwardCount ?? 1)) next.phase = "complete";
      }
      if (next.phase === "finale" && current.finaleStep <= 2) next.finaleStep = current.finaleStep + 1;
      return next;
    });
    pendingResultRef.current = null;
    setTargetIndex(-1);
    setIsSpinning(false);
  }, []);

  const stats = applyImprovements(state.player.stats, state.clubDraft.improvements);

  return {
    state,
    hydrated,
    activeWheel,
    isSpinning,
    targetIndex,
    overall: getQuickOverall(stats),
    setIdentity,
    spin,
    completeSpin,
    reset,
    stats,
    statKeys: getQuickStatKeys(state.player.position),
    getQuickStatLabel,
    flag: getFlagEmoji(state.player.nationality),
    traitPool: getTraitPool(state.player.position),
  };
}

function finalizeClub(state: QuickModeState, draft: QuickClubDraft, player: QuickPlayer): QuickModeState {
  const journey = draftToJourney(draft, state.careerClubIndex);
  const nextPlayer = { ...player, stats: applyImprovements(player.stats, journey.improvements) };
  const nextClubs = [...state.clubs, journey];
  const yearsSpent = nextClubs.reduce((sum, club) => sum + club.seasons, 0);
  const lastClub = state.careerClubIndex + 1 >= (player.clubCount ?? 1)
    || yearsSpent >= (player.careerLength ?? 1);
  return {
    ...state,
    player: nextPlayer,
    clubs: nextClubs,
    clubDraft: { ...INITIAL_DRAFT, improvements: [] },
    careerClubIndex: state.careerClubIndex + 1,
    careerStep: 0,
    phase: lastClub ? "finale" : "career",
    finaleStep: 0,
  };
}
