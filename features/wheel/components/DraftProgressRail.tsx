import { useTranslations } from "next-intl";
interface DraftProgressRailProps {
  currentStep: number;
  total?: number;
}

export const DRAFT_CHAPTERS = [
  { key: "origins", start: 0, end: 2 },
  { key: "stats", start: 3, end: 8 },
  { key: "physical", start: 9, end: 10 },
  { key: "start", start: 11, end: 12 },
] as const;

export function DraftProgressRail({ currentStep, total = 13 }: DraftProgressRailProps) {
  const t = useTranslations("draft");
  const ui = useTranslations("ui");
  const completed = Math.min(Math.max(currentStep, 0), total);
  const activeChapter = DRAFT_CHAPTERS.findIndex(({ start, end }) => completed <= end && completed >= start);
  const chapterIndex = activeChapter === -1 ? DRAFT_CHAPTERS.length - 1 : activeChapter;

  return (
    <section className="football-draft-progress" aria-label={ui("draftStepOf", { v0: String(completed), v1: String(total) })}>
      <div className="football-draft-progress__chapters">
        {DRAFT_CHAPTERS.map((chapter, index) => (
          <span key={chapter.key} className={index === chapterIndex ? "is-active" : index < chapterIndex ? "is-complete" : ""}>
            {t(chapter.key)}
          </span>
        ))}
      </div>
      <div className="football-draft-progress__footer">
        <div className="football-draft-progress__ticks" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed}>
          {Array.from({ length: total }, (_, index) => (
            <i key={index} className={index < completed ? "is-complete" : index === completed ? "is-active" : ""} />
          ))}
        </div>
        <span>{ui("round2")} {Math.min(completed + 1, total)} / {total}</span>
      </div>
    </section>
  );
}
