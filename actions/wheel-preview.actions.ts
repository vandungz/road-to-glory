"use server";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { careerPreviewSchema, setupPreviewSchema } from "@/features/wheel/contracts/preview-input";
import { buildCareerWheelPreview } from "@/features/wheel/services/career-preview.service";
import { getSetupPool, spinSetupWheel, type SetupWheelInput } from "@/features/wheel/services/setup-wheel.service";
import type { CareerWheelPreviewInput } from "@/features/wheel/contracts/career-preview";
import { z } from "@/lib/validation/zod";
import { calculateContinentalQualification } from "@/features/wheel/lib/simulation-helpers";
import { applyTransferFeeDealChance, computeEffectivePositionOvr } from "@/lib/transfer-economy";
import { getCareerWheelPoolAndValue } from "@/features/wheel/lib/career-wheel-resolver";
const catalog = unstable_cache(async () => {
    const [leagues, clubs] = await Promise.all([
        prisma.league.findMany({ select: { id: true, name: true, country: true, prestige: true }, orderBy: { name: "asc" } }),
        prisma.club.findMany({ select: { id: true, name: true, leagueId: true, prestige: true, continentalType: true, league: { select: { tier: true, name: true } } }, orderBy: { name: "asc" } }),
    ]);
    return { leagues, clubs: clubs.map(c => ({ ...c, leagueName: c.league.name, leagueTier: c.league.tier })) };
}, ["private-setup-catalog-v1"], { revalidate: 3600 });
async function guard() { const user = await requireAuthenticatedUser(); await checkRateLimit(`wheel-preview:${user.id}`); }
export async function getCareerWheelPreviewAction(input: unknown) {
    const parsed = careerPreviewSchema.parse(input);
    await guard();
    return buildCareerWheelPreview(parsed as CareerWheelPreviewInput);
}
export async function getSetupWheelPreviewAction(input: unknown) {
    const parsed = setupPreviewSchema.parse(input);
    await guard();
    const { leagues, clubs } = await catalog();
    return getSetupPool(parsed as unknown as SetupWheelInput, leagues, clubs).map(({ label, value }) => ({ label, value }));
}
export async function spinSetupWheelAction(input: unknown) {
    const parsed = setupPreviewSchema.parse(input);
    await guard();
    const { leagues, clubs } = await catalog();
    return spinSetupWheel(parsed as unknown as SetupWheelInput, leagues, clubs);
}
export async function getQualificationPreviewAction(input: unknown) {
    const p = z.object({ leagueId: z.string().max(100), standing: z.number().int().min(1).max(100), result: z.string().max(50).nullable(), cup: z.string().max(50) }).strict().parse(input);
    await guard();
    return calculateContinentalQualification(p.leagueId, p.standing, p.result, p.cup);
}
export async function getApproachPreviewAction(input: unknown) {
    const p = z.object({ chance: z.number().min(0).max(100), option: z.enum(["standard", "premium", "discount"]), position: z.string().max(8), stats: z.record(z.string().max(8), z.number().min(0).max(100)).refine(v => Object.keys(v).length <= 14), ovr: z.number().min(0).max(100) }).strict().parse(input);
    await guard();
    return { adjustedChance: applyTransferFeeDealChance(p.chance, p.option), effPosOvr: computeEffectivePositionOvr(p.position, p.stats, p.ovr) };
}
export async function resolveLegacyWheelAction(input: unknown) {
    const schema = careerPreviewSchema.omit({ isMounted: true, mode: true, luckRating: true }).extend({ hiddenStats: z.object({ luckRating: z.number().min(0).max(100) }).passthrough().nullable() });
    const p = schema.parse(input);
    await guard();
    return getCareerWheelPoolAndValue(p.careerSubStep, p as unknown as Parameters<typeof getCareerWheelPoolAndValue>[1]);
}
