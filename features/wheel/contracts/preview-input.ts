import { z } from "@/lib/validation/zod";
const short = z.string().max(100);
const number = z.number().finite().min(-1000).max(100000);
const stats = z.record(z.string().max(8), z.number().finite().min(0).max(100)).refine(v => Object.keys(v).length <= 14);
export const careerPreviewSchema = z.object({
    careerSubStep: short, isMounted: z.boolean(), mode: z.enum(["setup", "career", "retired"]), currentContinentalCup: short,
    currentAge: number, playerDebutAge: number, playerCareerLength: number, playerNationality: short,
    currentClub: z.object({ prestige: z.number().min(1).max(5) }).nullable(), currentOvr: number, leagueSize: number, priorClubStanding: number.nullable(), standingResult: number.nullable().optional(),
    selectedStatsList: z.array(z.string().max(8)).max(14), position: short,
    yearSimResult: z.object({ matchRating: number, apps: number, goals: number, assists: number, cleanSheets: number.optional() }).nullable(),
    selectorIndex: number, yearEvolutionDirection: z.enum(["increase", "decrease", "maintain"]).nullable().optional(), currentStats: stats,
    ballonDorNominationWeight: number, ballonDorRankWeights: z.array(number).max(10), luckRating: number.optional(),
    fitnessCoachActive: z.boolean().optional(), nationalCallupBoostActive: z.boolean().optional(), eliteDevelopmentActive: z.boolean().optional(),
}).strict();
const draftValue = z.union([short, z.number().finite().min(0).max(250), z.null()]);
export const setupPreviewSchema = z.object({ step: z.number().int().min(0).max(12), position: z.enum(["GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LW", "RW", "LM", "RM", "ST"]),
    draft: z.record(z.string().max(20), draftValue).refine(v => Object.keys(v).length <= 25) }).strict();
