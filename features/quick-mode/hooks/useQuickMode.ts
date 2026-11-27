"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { prepareQuickWheelAction, spinQuickWheelAction } from "@/actions/quick-mode.actions";
import { randomPortraitId } from "@/features/player/lib/player-portraits";
import { getFlagEmoji } from "@/types/squad";
import { clearQuickModeState, loadQuickModeState, saveQuickModeState } from "../lib/quick-mode-storage";
import { createInitialState } from "../lib/quick-initial-state";
import { getQuickStatKeys, getQuickStatLabel } from "../lib/quick-presentation";
import type { QuickModeView } from "../contracts/quick-view";
import type { QuickModeState, QuickPlayer } from "../types";
export type { ActiveWheel } from "../contracts/quick-view";
export function useQuickMode() {
    const [state, setState] = useState<QuickModeState>(createInitialState);
    const [view, setView] = useState<QuickModeView | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [isSpinning, setIsSpinning] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [targetIndex, setTargetIndex] = useState(-1);
    const [error, setError] = useState(false);
    const pending = useRef<QuickModeView | null>(null);
    const requestVersion = useRef(0);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        const saved = loadQuickModeState() ?? createInitialState();
        setState(saved);
        setIsResolving(true);
        let active = true;
        prepareQuickWheelAction(saved).then(next => { if (active)
            setView(next); })
            .catch(() => { if (active)
            setError(true); })
            .finally(() => {
                if (active) { setIsResolving(false); setHydrated(true); }
            });
        return () => { active = false; mounted.current = false; };
    }, []);
    useEffect(() => { if (hydrated)
        saveQuickModeState(state); }, [hydrated, state]);
    const setIdentity = useCallback((values: Partial<Pick<QuickPlayer, "name" | "nationality" | "position">>) => {
        const portraitId = randomPortraitId();
        setState(current => ({ ...current, player: { ...current.player, ...values, portraitId: current.player.portraitId ?? portraitId }, lastResult: null }));
    }, []);
    const reset = useCallback(() => {
        requestVersion.current++;
        pending.current = null;
        clearQuickModeState();
        setState(createInitialState());
        setView(null);
        setError(false);
        setIsSpinning(false);
        setIsResolving(false);
        setTargetIndex(-1);
    }, []);
    const spin = useCallback(async () => {
        if (isSpinning || isResolving || state.phase === "complete")
            return;
        const version = ++requestVersion.current;
        setIsResolving(true);
        setError(false);
        try {
            const result = await spinQuickWheelAction(state);
            if (!mounted.current || version !== requestVersion.current)
                return;
            pending.current = result.view;
            setTargetIndex(result.targetIndex);
            setIsSpinning(true);
        }
        catch {
            if (mounted.current && version === requestVersion.current)
                setError(true);
        }
        finally {
            if (mounted.current && version === requestVersion.current)
                setIsResolving(false);
        }
    }, [isSpinning, isResolving, state]);
    const completeSpin = useCallback(() => {
        if (!pending.current)
            return;
        const next = pending.current;
        pending.current = null;
        setState(next.state);
        setView(next);
        setTargetIndex(-1);
        setIsSpinning(false);
    }, []);
    const retry = useCallback(async () => {
        setIsResolving(true);
        setError(false);
        try {
            setView(await prepareQuickWheelAction(state));
        }
        catch {
            setError(true);
        }
        finally {
            setIsResolving(false);
        }
    }, [state]);
    return { state, hydrated, activeWheel: view?.activeWheel ?? null, isSpinning, isResolving, error,
        targetIndex, overall: view?.overall ?? 55, setIdentity, spin, completeSpin, reset,
        stats: view?.stats ?? state.player.stats, statKeys: getQuickStatKeys(state.player.position), getQuickStatLabel,
        flag: getFlagEmoji(state.player.nationality), retry };
}
