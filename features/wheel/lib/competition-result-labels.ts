const COMPETITION_RESULT_LABELS: Record<string, string> = {
  Winner: "Vô địch",
  "Runner-Up": "Á quân",
  "Semi-Finals": "Bán kết",
  "Quarter-Finals": "Tứ kết",
  "Round of 16": "Vòng 1/8",
  "Round of 32": "Vòng 1/16",
  "Early Exit": "Vòng loại sớm",
  "Group Stage": "Vòng bảng",
};

export function getCompetitionResultLabel(
  result: string | null | undefined,
  pendingLabel: string,
): string {
  if (!result || result === "Chờ quay") return pendingLabel;
  return COMPETITION_RESULT_LABELS[result] ?? result;
}
