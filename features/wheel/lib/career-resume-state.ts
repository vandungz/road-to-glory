/** Returns whether resume should reopen the season summary before growth. */
export function shouldResumeSeasonStatsModal(
  restoredStep: string | null,
  restoredYearResult: unknown,
  lastWheelStep: unknown,
): boolean {
  if (restoredStep === "season_stats") return true;
  const hasSeasonResult = restoredYearResult !== null
    && typeof restoredYearResult === "object"
    && !Array.isArray(restoredYearResult);
  return hasSeasonResult
    && ["ballon_dor_nomination", "dir_increase"].includes(restoredStep ?? "")
    && (lastWheelStep === null || lastWheelStep === "season_stats");
}
