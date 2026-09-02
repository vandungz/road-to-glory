import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";

interface SeasonSideSummaryProps {
  result: SimulatedSeasonResult | null;
  playerDebutAge: number;
  playerCareerLength: number;
}

export function SeasonSideSummary({ result, playerDebutAge, playerCareerLength }: SeasonSideSummaryProps) {
  return (
    <section className="rtg-season-side-summary">
      <span className="rtg-eyebrow">Mùa này</span>
      <dl>
        <div><dt>Ra sân</dt><dd>{result?.apps ?? "—"}</dd></div>
        <div><dt>Bàn · kiến tạo</dt><dd>{result ? `${result.goals} · ${result.assists}` : "—"}</dd></div>
        <div><dt>Điểm phong độ</dt><dd>{result?.matchRating ?? "—"}</dd></div>
        <div><dt>Tuổi nghề dự kiến</dt><dd>{playerDebutAge + playerCareerLength}</dd></div>
      </dl>
    </section>
  );
}
