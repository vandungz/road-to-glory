"use client";

interface TimelineHistoryProps {
  events: Array<{ age: number; label: string; [key: string]: any }>;
  playerDebutAge: number;
}

function getSeasonYearString(age: number, debutAge: number): string {
  const startYear = 2025 + (age - debutAge);
  const endYearShort = (startYear + 1) % 100;
  const endYearStr = endYearShort < 10 ? `0${endYearShort}` : `${endYearShort}`;
  return `${startYear}/${endYearStr}`;
}

export function TimelineHistory({ events, playerDebutAge }: TimelineHistoryProps) {
  return (
    <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", boxShadow: "3px 3px 0 var(--charcoal)", padding: "16px" }}>
      <h4 style={{ fontFamily: "var(--font-headline)", fontSize: "1rem", fontWeight: 700, borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "4px", margin: "0 0 10px" }}>
        Timeline Sự Nghiệp
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
        {[...events].reverse().map((ev, i) => (
          <div key={i} style={{ borderBottom: "1px dashed var(--cream-border)", paddingBottom: "4px" }}>
            <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.45rem", backgroundColor: "var(--cream-border)", padding: "1px 3px", borderRadius: "2px" }}>
              MÙA {getSeasonYearString(ev.age, playerDebutAge)} (TUỔI {ev.age})
            </span>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--charcoal)", margin: "2px 0 0" }}>{ev.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
