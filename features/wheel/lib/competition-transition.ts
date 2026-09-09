import type { CareerSubStep } from "@/types/domain";

export type CompetitionStep = "domestic_cup" | "continental_cup";
export type CompetitionNextStep = "continental_cup" | "national_callup" | "season_stats";

const DOMESTIC_NEXT_STEPS = new Set<CompetitionNextStep>([
  "continental_cup",
  "national_callup",
  "season_stats",
]);

const CONTINENTAL_NEXT_STEPS = new Set<CompetitionNextStep>([
  "national_callup",
  "season_stats",
]);

/**
 * Selects the next competition step without allowing a V2 client to recreate
 * the old local-ticket bug. A server-authoritative response must be one of the
 * transitions allowed for the completed step; legacy callers may still use
 * their pre-V2 fallback.
 */
export function resolveCompetitionNextStep(params: {
  completedStep: CompetitionStep;
  authoritativeNextStep?: CareerSubStep;
  legacyNextStep: CompetitionNextStep;
  serverAuthoritative: boolean;
}): CompetitionNextStep | null {
  if (!params.serverAuthoritative) return params.legacyNextStep;

  const allowed = params.completedStep === "domestic_cup"
    ? DOMESTIC_NEXT_STEPS
    : CONTINENTAL_NEXT_STEPS;
  return params.authoritativeNextStep && allowed.has(params.authoritativeNextStep as CompetitionNextStep)
    ? params.authoritativeNextStep as CompetitionNextStep
    : null;
}

