import { useLocale, useTranslations } from "next-intl";
import { AWARD_LABELS } from "@/types/awards";

const genericCompetitionLabels: Record<string, string> = {
  "giải quốc gia": "domesticLeague",
  "cúp quốc gia": "domesticCup",
  "cúp châu lục": "continentalCup",
  "giải quốc tế": "nationalTeam",
};

export function useAwardCopy() {
  const t = useTranslations("awards");
  const locale = useLocale();
  const ui = useTranslations("ui");

  return (label: string, key?: string) => {
    const savedKey = key ?? Object.entries(AWARD_LABELS).find(([, name]) => label === name || label.startsWith(name + " · "))?.[0];
    const rank = / · hạng (\d+)$/iu.exec(label)?.[1];
    const plain = rank ? label.slice(0, label.lastIndexOf(" · ")) : label;
    const rankText = rank ? locale === "en" ? ` · #${rank}` : ` · hạng ${rank}` : "";
    const officialName = /^(Vô địch|Á quân) (.+)$/iu.exec(plain);
    if (savedKey && t.has(savedKey) && (!officialName || label === AWARD_LABELS[savedKey as keyof typeof AWARD_LABELS])) {
      const metric = / · (\d+(?:[.,]\d+)?)$/.exec(label)?.[1];
      return t(savedKey) + (metric ? ` · ${metric}` : rankText);
    }
    if (locale === "en" && officialName) {
      const generic = genericCompetitionLabels[officialName[2].toLowerCase()];
      return t(officialName[1].toLowerCase() === "á quân" ? "runnerUp" : "winner", { name: generic ? ui(generic) : officialName[2] }) + rankText;
    }
    if (/^Quả Bóng Vàng(?: \(Ballon d'Or\))?$/iu.test(label)) return t("ballon_dor");
    return label;
  };
}
