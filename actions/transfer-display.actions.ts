"use server";
import { z } from "@/lib/validation/zod";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import { computeTransferFeeOptions, getBuyingPowerBand, applyTransferFeeDealChance, approachChancePercent } from "@/lib/transfer-economy";
import { computeWageOptions, computeWageAgreementChance } from "@/lib/salary-negotiation";
const money = z.number().finite().min(0).max(1000000000);
const fee = z.object({ kind: z.literal("fee"), baseFee: money, buyout: money, prestige: z.number().min(1).max(5), tier: z.number().min(1).max(2) }).strict();
const wage = z.object({ kind: z.literal("wage"), wage: money, prestige: z.number().min(1).max(5), tier: z.number().min(1).max(2), apps: z.number().min(0).max(100) }).strict();
export async function getTransferDisplayBatchAction(input: unknown) {
    const requests = z.array(z.discriminatedUnion("kind", [fee, wage])).min(1).max(30).parse(input);
    const user = await requireAuthenticatedUser();
    await checkRateLimit(`transfer-display:${user.id}`);
    return requests.map(p => {
        if (p.kind === "fee") {
            const options = computeTransferFeeOptions({ baseFee: p.baseFee, mandatoryBuyout: p.buyout, maxFee: getBuyingPowerBand(p.prestige, p.tier).maxFee });
            return { kind: "fee" as const, fees: { discount: options.discount.fee, standard: options.standard.fee, premium: options.premium.fee } };
        }
        const options = computeWageOptions({ baseWage: p.wage, minWage: Math.max(1, Math.round(p.wage * .7)), maxWage: Math.round(p.wage * 1.5) });
        return { kind: "wage" as const, options: Object.fromEntries((["lower", "standard", "higher"] as const).map(option => [option, { wage: options[option].wageAnnual, chance: approachChancePercent(computeWageAgreementChance({ option, baseWage: p.wage, clubPrestige: p.prestige, leagueTier: p.tier, expectedLeagueApps: p.apps })) }])) as Record<"lower" | "standard" | "higher", {
                wage: number;
                chance: number;
            }> };
    });
}
export async function getFeeChanceAction(input: unknown) {
    const p = z.object({ chance: z.number().min(0).max(1), option: z.enum(["discount", "standard", "premium"]) }).strict().parse(input);
    const user = await requireAuthenticatedUser();
    await checkRateLimit(`transfer-display:${user.id}`);
    return applyTransferFeeDealChance(p.chance, p.option);
}
