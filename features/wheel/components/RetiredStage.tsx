"use client";

import { EditorialRail } from "@/components/shared/EditorialArt";


import { RefreshCw, Trophy } from "lucide-react";
import { NationFlag } from "@/components/shared/NationFlag";
import type { AchievementRecord, ClubStint } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { ResultBanner } from "@/components/ui/ResultBanner";
import { PlayerPortrait } from "@/features/player/components/PlayerPortrait";

interface RetiredStageProps {
  portraitId?: string | null;
  position: string;
  playerNationality: string;
  peakOvrValue: number;
  playerName: string;
  careerTotalStats: { apps: number; goals: number; assists: number };
  clubStints: ClubStint[];
  achievements?: AchievementRecord;
  isSaving: boolean;
  handleSavePlayer: () => void;
}

export function RetiredStage({ position, playerNationality, peakOvrValue, playerName, careerTotalStats, clubStints, achievements, isSaving, handleSavePlayer, portraitId }: RetiredStageProps) {
  const ballonDorCount = achievements?.ballonDor ?? 0;
  return <main className="football-retired-stage">
    <header className="football-retired-stage__header"><div className="football-retired-stage__heading"><h1>Hành trình sự nghiệp</h1><p>Cầu thủ đã giải nghệ. Xem lại thành tích và lưu thẻ cầu thủ.</p></div></header>
    <div className="football-retired-stage__grid">
      <section className="football-hall-card" data-nation={playerNationality.replace(/\s+/g, "")}>
        <div className="football-hall-card__top"><span>Hall of fame</span><strong>{position}</strong></div>
        <div className="football-hall-card__portrait" data-has-portrait={Boolean(portraitId)}><PlayerPortrait portraitId={portraitId} animate={false} /><span><NationFlag nationality={playerNationality} /></span><strong>{peakOvrValue}</strong><small>OVR đỉnh cao</small></div>
        <div className="football-hall-card__name">{playerName}</div>
        <div className="football-hall-card__foot">Road to Glory · 2025/26</div>
      </section>
      <section className="football-retired-stage__details">
        <div className="football-retired-stage__section"><span className="football-eyebrow">Thống kê toàn bộ sự nghiệp</span><div className="football-retired-stage__stats" aria-label="Thống kê toàn bộ sự nghiệp">
          <div className="football-retired-stage__stat"><span>Trận ra sân</span><strong>{careerTotalStats.apps}</strong></div>
          <div className="football-retired-stage__stat"><span>Bàn thắng</span><strong>{careerTotalStats.goals}</strong></div>
          <div className="football-retired-stage__stat"><span>Kiến tạo</span><strong>{careerTotalStats.assists}</strong></div>
        </div></div>
        {ballonDorCount > 0 && <ResultBanner tone="honour"><Trophy size={16} aria-hidden="true" /> {ballonDorCount} Quả Bóng Vàng</ResultBanner>}
        <div className="football-retired-stage__section"><span className="football-eyebrow">Hành trình qua các câu lạc bộ</span><div className="football-retired-stage__clubs">{clubStints.length === 0 ? <p className="football-modal-note">Chưa có dữ liệu câu lạc bộ.</p> : clubStints.map((stint, index) => <div className="football-retired-stage__club" key={`${stint.clubName}-${index}`}><div><strong>{stint.clubName}</strong>{stint.leagueName && <small>{stint.leagueName}</small>}</div><span>Tuổi {stint.startAge}{stint.endAge ? ` → ${stint.endAge}` : " · hiện tại"}</span><b>{stint.yearsAtClub} mùa</b></div>)}</div></div>
      </section>
      <EditorialRail asset="heritage-touch" />
    </div>
    <footer className="football-retired-stage__footer"><Button size="lg" onClick={handleSavePlayer} disabled={isSaving} loading={isSaving} fullWidth><RefreshCw size={17} aria-hidden="true" /> {isSaving ? "Đang lưu dữ liệu cầu thủ" : "Lưu thẻ vào Hall of Fame"}</Button></footer>
  </main>;
}
