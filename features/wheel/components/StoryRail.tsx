"use client";

import React from "react";
import { ChevronRight, Trophy } from "lucide-react";
import type { SeasonRecord } from "@/types/game";

interface ClubStintItem { clubName: string; leagueName?: string; startAge: number; endAge?: number; trophies?: string[]; }
interface StoryRailProps { clubStints?: ClubStintItem[]; seasonRecords?: Record<number, SeasonRecord>; currentAge: number; playerDebutAge: number; currentOvr: number; peakOvrValue?: number; onOpenTrophyCabinet?: () => void; className?: string; style?: React.CSSProperties; }

export function StoryRail({ clubStints = [], seasonRecords = {}, currentAge, playerDebutAge, currentOvr, peakOvrValue, onOpenTrophyCabinet, className = "hidden lg:flex", style = {} }: StoryRailProps) {
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
  return <aside className={`rtg-story-rail ${className}`.trim()} style={style}>
    <header className="rtg-story-rail__header"><span className="rtg-eyebrow">Nhật ký sự nghiệp</span><h2>{totalSeasons} mùa đã đi qua</h2></header>
    <section className="rtg-story-rail__summary" aria-label="Tóm tắt sự nghiệp">
      <div><span>OVR đỉnh cao</span><strong>{peakOvrValue ?? currentOvr}</strong></div>
      <div><span>Danh hiệu</span><strong>{totalTrophies}</strong></div>
    </section>
    <section className="rtg-story-rail__clubs">
      <span className="rtg-eyebrow">Các câu lạc bộ</span>
      {clubStints.length === 0 ? <p className="rtg-modal-note">Đang khởi đầu sự nghiệp.</p> : clubStints.map((stint, index) => {
        const isCurrent = index === clubStints.length - 1;
        return <div className={`rtg-story-rail__club${isCurrent ? " is-current" : ""}`} key={`${stint.clubName}-${index}`}>
          <i aria-hidden="true" />
          <div><strong>{stint.clubName}</strong><small>{stint.leagueName ?? ""} · tuổi {stint.startAge}{stint.endAge ? ` → ${stint.endAge}` : " · hiện tại"}</small></div>
        </div>;
      })}
    </section>
    <button type="button" className="rtg-story-rail__honours" onClick={onOpenTrophyCabinet}>
      <span><Trophy size={14} aria-hidden="true" /> Tủ danh hiệu</span>
      <strong>{totalTrophies}</strong><ChevronRight size={14} aria-hidden="true" />
      {ballonDorCount > 0 && <small>{ballonDorCount} QBV</small>}
    </button>
  </aside>;
}
