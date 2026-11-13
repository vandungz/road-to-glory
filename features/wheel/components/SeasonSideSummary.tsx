import { useTranslations } from "next-intl";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";

interface SeasonSideSummaryProps {
  result: SimulatedSeasonResult | null;
  playerDebutAge: number;
  playerCareerLength: number;
}

export function SeasonSideSummary({ result, playerDebutAge, playerCareerLength }: SeasonSideSummaryProps) {
  const ui = useTranslations("ui");
  return (
    <section className="football-season-side-summary">
      <span className="football-eyebrow">{ui("thisSeason")}</span>
      <dl>
        <div><dt>{ui("appearances2")}</dt><dd>{result?.apps ?? "—"}</dd></div>
        <div><dt>{ui("goalsAssists")}</dt><dd>{result ? `${result.goals} · ${result.assists}` : "—"}</dd></div>
        <div><dt>{ui("matchRating")}</dt><dd>{result?.matchRating ?? "—"}</dd></div>
        <div><dt>{ui("expectedRetirementAge")}</dt><dd>{playerDebutAge + playerCareerLength}</dd></div>
      </dl>
    </section>
  );
}
