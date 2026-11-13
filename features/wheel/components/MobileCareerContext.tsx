"use client";

import { useTranslations } from "next-intl";
import type { CurrentClub } from "@/types/domain";

interface MobileCareerContextProps {
  currentAge: number;
  currentOvr: number;
  currentClub: CurrentClub | null;
  isUnemployed: boolean;
  careerSubStep: string;
  isProcessing: boolean;
  seasonApps?: number;
  seasonRating?: number;
}

export function MobileCareerContext({
  currentAge, currentOvr, currentClub, isUnemployed, careerSubStep,
  isProcessing, seasonApps, seasonRating,
}: MobileCareerContextProps) {
  const ui = useTranslations("ui");
  const t = useTranslations("career");
  const clubLabel = isUnemployed || !currentClub ? t("noClub") : currentClub.name;
  const stepLabel = t.has(careerSubStep) ? t(careerSubStep, { cup: ui("continentalCup") }) : t("progress");

  return (
    <section className="mobile-career-context" aria-label={ui("currentCareerSummary")} aria-live="polite">
      <div className="mobile-career-context__heading">
        <span className="mobile-career-context__eyebrow">{ui("age3")} {currentAge} · {stepLabel}</span>
        <span className={isProcessing ? "mobile-career-context__status is-processing" : "mobile-career-context__status"}>
          {isProcessing ? ui("inProgress") : ui("viewing")}
        </span>
      </div>
      <div className="mobile-career-context__stats">
        <div className="mobile-career-context__stat"><span>OVR</span><strong>{currentOvr}</strong></div>
        <div className="mobile-career-context__club"><span>{ui("currentClub2")}</span><strong title={clubLabel}>{clubLabel}</strong></div>
        {seasonApps !== undefined && seasonRating !== undefined && (
          <div className="mobile-career-context__season"><span>{ui("thisSeason2")}</span><strong>{seasonApps} {ui("appsRating")} {seasonRating.toFixed(1)}</strong></div>
        )}
      </div>
    </section>
  );
}
