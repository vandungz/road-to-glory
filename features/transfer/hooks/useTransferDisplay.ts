"use client";
import { useEffect, useState } from "react";
import { getTransferDisplayBatchAction } from "@/actions/transfer-display.actions";
type Result = Awaited<ReturnType<typeof getTransferDisplayBatchAction>>[number];
type Input = {
    kind: "fee";
    baseFee: number;
    buyout: number;
    prestige: number;
    tier: number;
} | {
    kind: "wage";
    wage: number;
    prestige: number;
    tier: number;
    apps: number;
};
const cache = new Map<string, Result>();
let queued: {
    key: string;
    input: Input;
    resolve: (value: Result) => void;
    reject: (error: unknown) => void;
}[] = [];
let scheduled = false;
function request(input: Input): Promise<Result> {
    const key = JSON.stringify(input);
    const saved = cache.get(key);
    if (saved)
        return Promise.resolve(saved);
    return new Promise((resolve, reject) => {
        queued.push({ key, input, resolve, reject });
        if (scheduled)
            return;
        scheduled = true;
        queueMicrotask(() => {
            const batch = queued;
            queued = [];
            scheduled = false;
            // One request serves a visible shortlist, rather than one request per card.
            for (let offset = 0; offset < batch.length; offset += 30) {
                const group = batch.slice(offset, offset + 30);
                getTransferDisplayBatchAction(group.map(item => item.input)).then(results => {
                    group.forEach((item, index) => { const value = results[index]; if (!value) {
                        item.reject(new Error("Missing display result"));
                        return;
                    } cache.set(item.key, value); item.resolve(value); });
                    while (cache.size > 128)
                        cache.delete(cache.keys().next().value!);
                }).catch(error => group.forEach(item => item.reject(error)));
            }
        });
    });
}
export function useTransferDisplay(input: Input) {
    const key = JSON.stringify(input);
    const [result, setResult] = useState<{
        key: string;
        data: Result;
    } | null>(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => { let active = true; setError(false); request(JSON.parse(key)).then(data => { if (active)
        setResult({ key, data }); }).catch(() => { if (active)
        setError(true); }); return () => { active = false; }; }, [key, attempt]);
    return { data: result?.key === key ? result.data : null, error, retry: () => setAttempt(value => value + 1) };
}
