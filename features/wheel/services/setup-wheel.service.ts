import { NATIONALITY_POOL, DEBUT_AGE_POOL, CAREER_LENGTH_POOL, getHeightWeights, getWeightWeights, getDebutStatWeights, getLeagueWeights, getClubWeights } from "@/lib/wheel-engine/weight-calculator";
import { resolveWeightedOutcome } from "@/lib/wheel-engine/spin-resolver";
import { getFlagEmoji } from "@/types/squad";
import type { ClubSummary, LeagueSummary } from "@/types/domain";
import type { DraftData } from "../stores/useWheelUiStore";
import { applySetupResult } from "./setup-result.service";
export interface SetupWheelInput {
    step: number;
    position: string;
    draft: DraftData;
}
type Value = string | number | (ClubSummary | {
    id: string;
    name: string;
});
export function getSetupPool(input: SetupWheelInput, leagues: LeagueSummary[], clubs: ClubSummary[]) {
    const { step, position, draft } = input;
    let pool: {
        value: Value;
        weight: number;
    }[];
    if (step === 0)
        pool = NATIONALITY_POOL;
    else if (step === 1)
        pool = DEBUT_AGE_POOL;
    else if (step === 2)
        pool = getHeightWeights(position);
    else if (step === 3)
        pool = getWeightWeights(draft.height ?? 180);
    else if (step >= 4 && step <= 9) {
        const keys = position === "GK" ? ["div", "han", "kic", "ref", "spd", "pos"] : ["pac", "sho", "pas", "dri", "def", "phy"];
        pool = getDebutStatWeights(position, keys[step - 4]);
    }
    else if (step === 10)
        pool = CAREER_LENGTH_POOL;
    else if (step === 11)
        pool = getLeagueWeights(leagues, draft.nationality);
    else {
        const eligible = clubs.filter(club => club.leagueId === draft.leagueId);
        pool = eligible.length ? getClubWeights(eligible) : [{ value: { id: "", name: "Không có CLB" }, weight: 1 }];
    }
    return pool.map(item => ({ ...item, label: typeof item.value === "object" ? item.value.name
            : step === 0 ? `${getFlagEmoji(String(item.value))} ${item.value}`
                : `${item.value}${step === 1 ? " Tuổi" : step === 2 ? " cm" : step === 3 ? " kg" : step === 10 ? " Năm" : ""}` }));
}
export function spinSetupWheel(input: SetupWheelInput, leagues: LeagueSummary[], clubs: ClubSummary[]) {
    const pool = getSetupPool(input, leagues, clubs);
    const result = resolveWeightedOutcome(pool);
    const targetIndex = pool.findIndex(item => Object.is(item.value, result));
    return { targetIndex, tempValue: pool[targetIndex]?.label ?? null, draftData: applySetupResult(input.draft, input.step, result, input.position) };
}
