import { useLocale, useTranslations } from "next-intl";
import { resolveArchivedNationName } from "@/features/squad/lib/nation-flags";

const rounds: Record<string, string> = {
  "vòng 1/32": "round32",
  "vòng 1/16": "round16",
  "vòng 1/8": "round8",
  "tứ kết": "quarter",
  "bán kết": "semi",
  "chung kết": "final",
  "vòng bảng": "group",
};

// Season records store plain text. Recognize the formats produced by the
// simulators and preserve the original for entries from older formats.
export function useCompetitionJourney() {
  const locale = useLocale();
  const t = useTranslations("journey");

  return (entry: string, isNational: boolean) => {
    const original = entry.replace(/[🏆🥈🥉⚡⚽❌🛡️]/gu, "").replace(/\s{2,}/g, " ").trim();
    if (locale === "vi") return original;
    const [, phase, competition, detail] = /^(Vòng 1\/(?:32|16|8)|Tứ kết|Bán kết|Chung kết|Vòng bảng)(?: ([^:]+))?: (.+)$/iu.exec(original) ?? [];
    if (!phase) return original;
    const round = [t(rounds[phase.toLowerCase()]), competition].filter(Boolean).join(" ");
    if (/vượt qua vòng bảng/i.test(detail)) return t("roundAndResult", { round, result: t("groupQualified") });
    if (/xếp hạng 4\/4/i.test(detail)) return t("roundAndResult", { round, result: t("groupFourth") });
    if (/bị loại sau vòng bảng/i.test(detail)) return t("roundAndResult", { round, result: t("groupExit") });

    const [, outcome, score, opponent] = /^(Thắng|Thua|Hòa) (\d+[-–]\d+)(?: trước (?:(?:CLB|ĐTQG) )?(.+?))?(?= \(| — |$)/iu.exec(detail) ?? [];
    if (!outcome) return original;
    const kind = outcome.toLowerCase();
    const scoreResult = t(kind === "thắng" ? "won" : kind === "thua" ? "lost" : "drew", { score });
    const result = opponent ? t("vs", { result: scoreResult, team: isNational ? resolveArchivedNationName(opponent) : opponent }) : scoreResult;
    const status = /— vô địch/i.test(detail) ? "champion" : /— á quân/i.test(detail) ? "runnerUp"
      : /huy chương đồng/i.test(detail) ? "third" : /dừng bước|bị loại sớm/i.test(detail) ? "eliminated" : null;
    return t("roundAndResult", { round, result: status ? t("resultAndStatus", { result, status: t(status) }) : result });
  };
}
