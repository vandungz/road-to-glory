"use client";
import { ScrollArea } from "@/components/ui/ScrollArea";


import { useTranslations } from "next-intl";
import React from "react";
import { ChevronRight, Trophy } from "lucide-react";
import type { SeasonRecord } from "@/types/game";

interface ClubStintItem { clubName: string; leagueName?: string; startAge: number; endAge?: number; trophies?: string[]; }
interface StoryRailProps { clubStints?: ClubStintItem[]; seasonRecords?: Record<number, SeasonRecord>; currentAge: number; playerDebutAge: number; currentOvr: number; peakOvrValue?: number; onOpenTrophyCabinet?: () => void; className?: string; style?: React.CSSProperties; }

export function StoryRail({ clubStints = [], seasonRecords = {}, currentAge, playerDebutAge, currentOvr, peakOvrValue, onOpenTrophyCabinet, className = "hidden lg:flex", style = {} }: StoryRailProps) {
  const ui = useTranslations("ui");
  let totalTrophies = 0;
  let ballonDorCount = 0;
  Object.values(seasonRecords).forEach((record) => {
    if (record.honours && record.honours.length > 0) {
      const seen = new Set<string>();
      for (const honour of record.honours) {
        if (honour.result !== "winner" && honour.result !== "selected") continue;
        const identity = `${honour.awardKey}:${honour.slotKey ?? "winner"}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        totalTrophies += 1;
        if (honour.awardKey === "ballon_dor" && honour.rank === 1) ballonDorCount += 1;
      }
    } else {
      totalTrophies += Number(record.standing === 1) + Number(record.domesticCup === "Winner") + Number(record.continentalCup?.result === "Winner") + Number(record.nationalTeam?.result === "Winner");
      // `achievements.ballonDor` is a career-level cumulative counter, so it
      // cannot identify a Ballon d'Or won in this season.
      ballonDorCount += Number(record.ballonDorResult === 1);
    }
  });
  const totalSeasons = Math.max(1, currentAge - playerDebutAge + 1);
  return <ScrollArea as="aside" className={`football-story-rail ${className}`.trim()} style={style}>
    <header className="football-story-rail__header"><span className="football-eyebrow">{ui("careerJournal")}</span><h2>{ui("careerSeasonCount", { count: totalSeasons })}</h2></header>
    <section className="football-story-rail__summary" aria-label={ui("careerOverview")}>
      <div><span>{ui("peakOvr")}</span><strong>{peakOvrValue ?? currentOvr}</strong></div>
      <div><span>{ui("honours")}</span><strong>{totalTrophies}</strong></div>
    </section>
    <section className="football-story-rail__clubs">
      <span className="football-eyebrow">{ui("clubs")}</span>
      <ScrollArea className="football-story-rail__club-list" role="region" aria-label={ui("careerClubs")} tabIndex={0}>
      {clubStints.length === 0 ? <p className="football-modal-note">{ui("noClubHistoryYet")}</p> : clubStints.map((stint, index) => {
        const isCurrent = index === clubStints.length - 1;
        return <div className={`football-story-rail__club${isCurrent ? " is-current" : ""}`} key={`${stint.clubName}-${index}`}>
          <i aria-hidden="true" />
          <div><strong>{stint.clubName}</strong><small>{stint.leagueName ?? ""} {ui("age2")} {stint.startAge}{stint.endAge ? ` → ${stint.endAge}` : ui("current")}</small></div>
        </div>;
      })}
      </ScrollArea>
    </section>
    <button type="button" className="football-story-rail__honours" data-guide="career-honours" onClick={onOpenTrophyCabinet}>
      <span><Trophy size={14} aria-hidden="true" /> {ui("trophyCabinet")}</span>
      <strong>{totalTrophies}</strong><ChevronRight size={14} aria-hidden="true" />
      {ballonDorCount > 0 && <small>{ballonDorCount} Ballon d’Or</small>}
    </button>
  </ScrollArea>;
}
