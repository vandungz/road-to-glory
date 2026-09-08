/** Shared, client-safe mapping between the visible career step and its wheel type. */
export const WHEEL_TYPE_BY_STEP = {
  standing: "competition",
  domestic_cup: "competition",
  continental_cup: "competition",
  national_callup: "competition",
  national_tournament: "competition",
  ballon_dor_nomination: "award",
  ballon_dor_ranking: "award",
  dir_increase: "growth",
  dir_decrease: "growth",
  count: "growth",
  selector: "growth",
  magnitude: "growth",
} as const;

export type CareerWheelStep = keyof typeof WHEEL_TYPE_BY_STEP;

export function getWheelTypeForStep(stepKey: string): string | null {
  return WHEEL_TYPE_BY_STEP[stepKey as CareerWheelStep] ?? null;
}
