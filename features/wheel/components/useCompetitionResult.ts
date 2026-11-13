import { useTranslations } from "next-intl";
import { getCompetitionResultLabel } from "../lib/competition-result-labels";

const resultKeys: Record<string, string> = {
  "Vô địch": "winner",
  "Á quân": "runnerUp",
  "Bán kết": "semiFinals",
  "Tứ kết": "quarterFinals",
  "Vòng 1/8": "roundOf16",
  "Vòng 1/16": "roundOf32",
  "Vòng loại sớm": "earlyExit",
  "Vòng bảng": "groupStage",
  "Được triệu tập": "calledUp",
  "Không được gọi": "notCalledUp",
};

export function useCompetitionResult() {
  const t = useTranslations("competition");

  return (result: string | null | undefined, fallback = t("pending")) => {
    const label = getCompetitionResultLabel(result, "");
    if (!label) return fallback;
    const rank = /^Hạng #?(\d+)$/.exec(label)?.[1];
    if (rank) return t("rank", { rank });
    const key = resultKeys[label];
    return key ? t(key) : label;
  };
}
