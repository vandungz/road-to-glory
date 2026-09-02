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
  subSteps: string[];
}

const STAGES: StageInfo[] = [
  {
    id: "league",
    label: "XẾP HẠNG GIẢI",
    shortLabel: "BXH",
    subSteps: ["standing"],
  },
  {
    id: "cups",
    label: "CÚP QUỐC GIA & LỤC ĐỊA",
    shortLabel: "CÚP",
    subSteps: ["domestic_cup", "continental_cup"],
  },
  {
    id: "awards",
    label: "ĐTQG & QUẢ BÓNG VÀNG",
    shortLabel: "DANH HIỆU",
    subSteps: ["national_callup", "national_tournament", "ballon_dor_nomination", "ballon_dor_ranking"],
  },
  {
    id: "growth",
    label: "PHÁT TRIỂN CHỈ SỐ",
    shortLabel: "CHỈ SỐ",
    subSteps: ["dir_increase", "dir_decrease", "count", "selector", "magnitude"],
  },
  {
    id: "market",
    label: "TỔNG KẾT & CHUYỂN NHƯỢNG",
    shortLabel: "CHUYỂN NHƯỢNG",
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
    <div className="rtg-season-strip" data-unemployed={isUnemployed ? "true" : "false"}>
      <div className="rtg-season-strip__inner">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < activeStageIndex;
          const isActive = idx === activeStageIndex;
          const isUpcoming = idx > activeStageIndex;

          return (
            <React.Fragment key={stage.id}>
              <div className={`rtg-season-strip__stage ${isActive ? "is-active" : ""} ${isCompleted ? "is-complete" : ""} ${isUpcoming ? "is-upcoming" : ""}`}>
                <span className="rtg-season-strip__stage-number">
                  {isCompleted ? <Check aria-hidden="true" size={13} strokeWidth={2.5} /> : String(idx + 1).padStart(2, "0")}
                </span>
                <span className="rtg-season-strip__label">
                  <span className="hidden sm:inline">{stage.label}</span>
                  <span className="inline sm:hidden">{stage.shortLabel}</span>
                </span>
              </div>

              {idx < STAGES.length - 1 && (
                <div className={`rtg-season-strip__connector ${idx < activeStageIndex ? "is-complete" : ""}`} aria-hidden="true" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
