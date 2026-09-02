interface DraftProgressRailProps {
  currentStep: number;
  total?: number;
}

const CHAPTERS = [
  { label: "Xuất thân", start: 0, end: 2 },
  { label: "Chỉ số", start: 3, end: 8 },
  { label: "Thể chất", start: 9, end: 10 },
  { label: "Khởi đầu", start: 11, end: 12 },
] as const;

export function DraftProgressRail({ currentStep, total = 13 }: DraftProgressRailProps) {
  const completed = Math.min(Math.max(currentStep, 0), total);
  const activeChapter = CHAPTERS.findIndex(({ start, end }) => completed <= end && completed >= start);
  const chapterIndex = activeChapter === -1 ? CHAPTERS.length - 1 : activeChapter;

  return (
    <section className="rtg-draft-progress" aria-label={`Tiến trình draft ${completed} trên ${total}`}>
      <div className="rtg-draft-progress__chapters">
        {CHAPTERS.map((chapter, index) => (
          <span key={chapter.label} className={index === chapterIndex ? "is-active" : index < chapterIndex ? "is-complete" : ""}>
            {chapter.label}
          </span>
        ))}
      </div>
      <div className="rtg-draft-progress__footer">
        <div className="rtg-draft-progress__ticks" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed}>
          {Array.from({ length: total }, (_, index) => (
            <i key={index} className={index < completed ? "is-complete" : index === completed ? "is-active" : ""} />
          ))}
        </div>
        <span>Vòng {Math.min(completed + 1, total)} / {total}</span>
      </div>
    </section>
  );
}
