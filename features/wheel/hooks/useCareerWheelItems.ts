"use client";
import { useEffect, useState } from "react";
import { getCareerWheelPreviewAction } from "@/actions/wheel-preview.actions";
import type { CareerWheelPreviewInput } from "../contracts/career-preview";
export function useCareerWheelItems(input: CareerWheelPreviewInput) {
    const key = JSON.stringify({ ...input,
        currentClub: input.currentClub ? { prestige: input.currentClub.prestige } : null,
        yearSimResult: input.yearSimResult ? {
            matchRating: input.yearSimResult.matchRating, apps: input.yearSimResult.apps,
            goals: input.yearSimResult.goals, assists: input.yearSimResult.assists,
            cleanSheets: input.yearSimResult.cleanSheets,
        } : null,
    });
    const [preview, setPreview] = useState<{
        key: string;
        items: {
            label: string;
            value: string | number;
            weight?: number;
        }[];
    } | null>(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!input.isMounted || input.mode !== "career")
            return;
        let active = true;
        setError(false);
        getCareerWheelPreviewAction(JSON.parse(key)).then(items => { if (active)
            setPreview({ key, items }); })
            .catch(() => { if (active)
            setError(true); });
        return () => { active = false; };
    }, [key, input.isMounted, input.mode, attempt]);
    return { careerWheelItems: preview?.key === key ? preview.items : [], wheelPreviewError: error, retryCareerPreview: () => setAttempt(value => value + 1) };
}
