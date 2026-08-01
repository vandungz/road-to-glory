"use client";

import React from "react";
import { Check } from "lucide-react";

interface SeasonStripProps {
  careerSubStep: string;
  isUnemployed?: boolean;
}

interface StageInfo {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  subSteps: string[];
}

const STAGES: StageInfo[] = [
  {
    id: "growth",
    label: "PHÁT TRIỂN",
    shortLabel: "STATS",
    icon: "📈",
    subSteps: ["dir_increase", "dir_decrease", "count", "selector", "magnitude"],
  },
  {
    id: "league",
    label: "XẾP HẠNG",
    shortLabel: "BXH",
    icon: "⚽",
    subSteps: ["standing"],
  },
  {
    id: "cups",
    label: "CÚP QUỐC GIA & LỤC ĐỊA",
    shortLabel: "CÚP",
    icon: "🏆",
    subSteps: ["domestic_cup", "continental_cup"],
  },
  {
    id: "awards",
    label: "ĐTQG & QUẢ BÓNG VÀNG",
    shortLabel: "AWARDS",
    icon: "🏅",
    subSteps: ["national_callup", "national_tournament", "ballon_dor_nomination", "ballon_dor_ranking"],
  },
  {
    id: "market",
    label: "RECAP & THỊ TRƯỜNG",
    shortLabel: "MARKET",
    icon: "💼",
    subSteps: ["season_stats", "transfer", "resolved"],
  },
];

function getActiveStageIndex(subStep: string): number {
  if (subStep === "idle") return 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (STAGES[i].subSteps.includes(subStep)) {
      return i;
    }
  }
  return 0;
}

export function SeasonStrip({ careerSubStep, isUnemployed }: SeasonStripProps) {
  const activeStageIndex = getActiveStageIndex(careerSubStep);

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "var(--white)",
        borderBottom: "2px solid var(--charcoal)",
        padding: "8px 16px",
        boxShadow: "0 2px 0 rgba(0,0,0,0.03)",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < activeStageIndex;
          const isActive = idx === activeStageIndex;
          const isUpcoming = idx > activeStageIndex;

          return (
            <React.Fragment key={stage.id}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  minHeight: "44px",
                  borderRadius: "3px",
                  border: isActive
                    ? "2px solid var(--charcoal)"
                    : isCompleted
                    ? "1px solid var(--cream-border)"
                    : "1px dashed var(--cream-border)",
                  backgroundColor: isActive
                    ? "var(--cream)"
                    : isCompleted
                    ? "var(--cream-dark)"
                    : "transparent",
                  boxShadow: isActive ? "2px 2px 0 var(--charcoal)" : "none",
                  opacity: isUpcoming ? 0.6 : 1,
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: isCompleted
                      ? "#266b3e"
                      : isActive
                      ? "var(--coral)"
                      : "var(--cream-border)",
                    color: "var(--white)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-stamp)",
                  }}
                >
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : idx + 1}
                </div>

                <span
                  style={{
                    fontFamily: "var(--font-headline)",
                    fontSize: "0.78rem",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive
                      ? "var(--charcoal)"
                      : isCompleted
                      ? "#266b3e"
                      : "var(--ink-gray)",
                    letterSpacing: "0.03em",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ marginRight: "4px" }}>{stage.icon}</span>
                  <span className="hidden sm:inline">{stage.label}</span>
                  <span className="inline sm:hidden">{stage.shortLabel}</span>
                </span>
              </div>

              {idx < STAGES.length - 1 && (
                <div
                  style={{
                    flex: "1 1 12px",
                    minWidth: "8px",
                    height: "2px",
                    backgroundColor: idx < activeStageIndex ? "#266b3e" : "var(--cream-border)",
                    transition: "background-color 0.2s ease",
                    flexShrink: 1,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
