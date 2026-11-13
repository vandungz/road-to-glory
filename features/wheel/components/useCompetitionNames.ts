import { useTranslations } from "next-intl";
import { getContinentalCupLabel, getDomesticCupName } from "../lib/simulation-helpers";

export function useCompetitionNames() {
  const ui = useTranslations("ui");
  const career = useTranslations("career");

  return {
    clubName: (name: string) => name === "Không CLB" ? career("noClub") : name,
    leagueName: (name: string) => name === "Thất nghiệp" ? ui("freeAgent") : name || ui("domesticLeague"),
    domesticCupName: (name: string, id?: string | null) => {
      const title = getDomesticCupName(name, id);
      return title === "Cup Quốc Gia" ? ui("domesticCup") : title;
    },
    continentalCupName: (type: string) => {
      const title = getContinentalCupLabel(type);
      return title === "Cúp Châu Lục CLB" ? ui("continentalCup") : title;
    },
  };
}
