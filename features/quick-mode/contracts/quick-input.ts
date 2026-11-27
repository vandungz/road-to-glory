import { z } from "@/lib/validation/zod";
import { QUICK_POSITIONS } from "../types";
const text = z.string().max(100);
const integer = z.number().int().min(0).max(10000);
const nullableCount = integer.nullable();
const stat = z.enum(["pac", "sho", "dri", "pas", "str", "def", "iq", "div", "han", "kic", "ref", "spd", "pos"]);
const stats = z.partialRecord(stat, z.number().int().min(1).max(10));
const improvement = z.object({ stat, delta: z.number().int().min(0).max(9) }).strict();
const cups = z.array(z.enum(["Champions League", "Europa League", "Conference League", "Libertadores", "Sudamericana", "CONCACAF Champions Cup", "AFC Champions League", "CAF Champions League"])).max(30);
export const quickStateSchema = z.object({
    version: z.literal(5), phase: z.enum(["setup", "career", "finale", "complete"]),
    setupStep: z.number().int().min(0).max(11), careerClubIndex: z.number().int().min(0).max(5),
    careerStep: z.number().int().min(0).max(11), finaleStep: z.number().int().min(0).max(5),
    player: z.object({
        portraitId: text.optional(), name: z.string().max(40), nationality: text, position: z.enum(QUICK_POSITIONS),
        debutAge: z.number().int().min(10).max(40).nullable(), careerLength: z.number().int().min(1).max(30).nullable(),
        stats, trait: z.object({ id: text, name: text, description: z.string().max(300), modifiers: z.partialRecord(stat, z.number().int().min(-10).max(10)), preferredPositions: z.array(z.enum(QUICK_POSITIONS)).max(12).optional() }).strict().nullable(),
        clubCount: z.number().int().min(1).max(5).nullable(),
    }).strict(),
    clubDraft: z.object({
        leagueId: text.nullable(), leagueName: text.nullable(), clubId: text.nullable(), clubName: text.nullable(),
        prestige: z.number().int().min(1).max(5).nullable(), seasons: z.number().int().min(1).max(30).nullable(),
        leagueTitles: nullableCount, domesticCups: nullableCount, internationalCups: nullableCount, internationalCupTypes: cups,
        improvements: z.array(improvement).max(7), improvementCount: z.number().int().min(0).max(7).nullable(), improvementTarget: stat.nullable(),
    }).strict(),
    clubs: z.array(z.object({
        clubIndex: z.number().int().min(0).max(5), leagueId: text, leagueName: text, clubId: text, clubName: text,
        prestige: z.number().int().min(1).max(5), seasons: z.number().int().min(1).max(30),
        leagueTitles: integer, domesticCups: integer, internationalCups: integer, internationalCupTypes: cups, improvements: z.array(improvement).max(7),
    }).strict()).max(5),
    finale: z.object({
        appearances: nullableCount.optional(), cleanSheets: nullableCount.optional(), goals: z.union([integer, z.literal("1000+")]).nullable(), assists: z.union([integer, z.literal("1000+")]).nullable(),
        ballonDorWins: nullableCount, otherAwardCount: z.number().int().min(0).max(5).nullable(), otherAwardTypes: z.array(text).max(5),
    }).strict(), lastResult: z.string().max(300).nullable(),
}).strict();
