"use server";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { quickStateSchema } from "@/features/quick-mode/contracts/quick-input";
import { getQuickModeOptions } from "@/features/quick-mode/lib/quick-mode-options";
import { getQuickView, spinQuickMode } from "@/features/quick-mode/services/quick-simulation.service";
async function inputState(input: unknown) {
    const state = quickStateSchema.parse(input);
    const requestHeaders = await headers();
    const ip = requestHeaders.get("x-real-ip")?.trim() || requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await checkRateLimit(`quick:${ip.slice(0, 128)}`);
    return state;
}
export async function prepareQuickWheelAction(input: unknown) {
    const state = await inputState(input);
    const { leagues, clubs } = getQuickModeOptions();
    return getQuickView(state, leagues, clubs);
}
export async function spinQuickWheelAction(input: unknown) {
    const state = await inputState(input);
    const { leagues, clubs } = getQuickModeOptions();
    return spinQuickMode(state, leagues, clubs);
}
