"use client";
import { useEffect, useRef, useState } from "react";
import { getSetupWheelPreviewAction, spinSetupWheelAction } from "@/actions/wheel-preview.actions";
import { useWheelUiStore, type DraftData } from "../stores/useWheelUiStore";
import type { ClubSummary, LeagueSummary } from "@/types/domain";
interface UseSetupStageProps {
    position: string;
    leagues: LeagueSummary[];
    clubs: ClubSummary[];
    isMounted: boolean;
    mode: "setup" | "career" | "retired";
}
type Value = string | number | {
    id: string;
    name: string;
};
export function useSetupStage({ position, isMounted, mode }: UseSetupStageProps) {
    const { activeStep, isSpinning, draftData, startSpin, stopSpin, applyDraftResult } = useWheelUiStore();
    const [preview, setPreview] = useState<{
        key: string;
        items: {
            label: string;
            value: Value;
        }[];
    } | null>(null);
    const [targetIndex, setTargetIndex] = useState(-1);
    const [tempValue, setTempValue] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const pending = useRef<DraftData | null>(null);
    const snapshot = JSON.stringify({ step: activeStep, position, draft: draftData });
    const snapshotRef = useRef(snapshot);
    snapshotRef.current = snapshot;
    const mounted = useRef(true);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => {
        if (!isMounted || mode !== "setup" || activeStep > 12)
            return;
        let active = true;
        setError(false);
        getSetupWheelPreviewAction(JSON.parse(snapshot)).then(items => { if (active)
            setPreview({ key: snapshot, items }); }).catch(() => { if (active)
            setError(true); });
        return () => { active = false; };
    }, [snapshot, isMounted, mode, activeStep, attempt]);
    const wheelItems = preview?.key === snapshot ? preview.items : [];
    async function handleSetupSpin() {
        if (isSpinning || resolving || !wheelItems.length)
            return;
        setResolving(true);
        setError(false);
        try {
            const result = await spinSetupWheelAction(JSON.parse(snapshot));
            if (!mounted.current || snapshotRef.current !== snapshot) return;
            pending.current = result.draftData;
            setTargetIndex(result.targetIndex);
            setTempValue(result.tempValue);
            startSpin();
        }
        catch {
            setError(true);
            stopSpin();
        }
        finally {
            setResolving(false);
        }
    }
    function handleSetupSpinComplete() { if (!pending.current)
        return; applyDraftResult(pending.current, activeStep + 1); pending.current = null; setTargetIndex(-1); setTempValue(null); }
    return { wheelItems, targetIndex, tempValue, activeStep, isSpinning, draftData, isResolving: resolving || (activeStep < 13 && preview?.key !== snapshot), setupPreviewError: error, retrySetupPreview: () => setAttempt(value => value + 1), handleSetupSpin, handleSetupSpinComplete };
}
