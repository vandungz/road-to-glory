const POSITION_NUMBERS: Record<string, number> = {
  GK: 1,
  RB: 2,
  LB: 3,
  CB: 5,
  CDM: 6,
  LW: 7,
  LM: 7,
  CM: 8,
  ST: 9,
  CAM: 10,
  RW: 11,
  RM: 11,
};

/** Standard role number used when candidate names are intentionally anonymized. */
export function getPositionNumber(position: string): number {
  return POSITION_NUMBERS[position.toUpperCase()] ?? 8;
}
