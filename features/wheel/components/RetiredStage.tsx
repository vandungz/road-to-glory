"use client";

import { RefreshCw, Trophy } from "lucide-react";
import { getFlagEmoji } from "@/types/squad";
import type { AchievementRecord, ClubStint } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { ResultBanner } from "@/components/ui/ResultBanner";

interface RetiredStageProps {
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

export function RetiredStage({ position, playerNationality, peakOvrValue, playerName, careerTotalStats, clubStints, achievements, isSaving, handleSavePlayer }: RetiredStageProps) {
  const ballonDorCount = achievements?.ballonDor ?? 0;
  return <main className="rtg-retired-stage">
    <header className="rtg-retired-stage__header"><span className="rtg-eyebrow">Career archive · final record</span><h1>Hành trình sự nghiệp</h1><p>Cầu thủ chính thức giải nghệ. Đây là bản ghi cuối cùng của một career run.</p></header>
    <div className="rtg-retired-stage__grid">
      <section className="rtg-hall-card">
        <div className="rtg-hall-card__top"><span>Hall of fame</span><strong>{position}</strong></div>
        <div className="rtg-hall-card__portrait"><span>{getFlagEmoji(playerNationality)}</span><strong>{peakOvrValue}</strong><small>OVR đỉnh cao</small></div>
        <div className="rtg-hall-card__name">{playerName}</div>
        <div className="rtg-hall-card__foot">Road to Glory · 2025/26</div>
      </section>
      <section className="rtg-retired-stage__details">
        <div className="rtg-retired-stage__section"><span className="rtg-eyebrow">Thống kê toàn bộ sự nghiệp</span><div className="rtg-retired-stage__stats"><DataRow label="Trận ra sân" value={careerTotalStats.apps} /><DataRow label="Bàn thắng" value={careerTotalStats.goals} /><DataRow label="Kiến tạo" value={careerTotalStats.assists} /></div></div>
        {ballonDorCount > 0 && <ResultBanner tone="honour"><Trophy size={16} aria-hidden="true" /> {ballonDorCount} Quả Bóng Vàng</ResultBanner>}
        <div className="rtg-retired-stage__section"><span className="rtg-eyebrow">Hành trình qua các câu lạc bộ</span><div className="rtg-retired-stage__clubs">{clubStints.length === 0 ? <p className="rtg-modal-note">Chưa có dữ liệu câu lạc bộ.</p> : clubStints.map((stint, index) => <div className="rtg-retired-stage__club" key={`${stint.clubName}-${index}`}><div><strong>{stint.clubName}</strong>{stint.leagueName && <small>{stint.leagueName}</small>}</div><span>Tuổi {stint.startAge}{stint.endAge ? ` → ${stint.endAge}` : " · hiện tại"}</span><b>{stint.yearsAtClub} mùa</b></div>)}</div></div>
      </section>
    </div>
    <footer className="rtg-retired-stage__footer"><Button size="lg" onClick={handleSavePlayer} disabled={isSaving} loading={isSaving} fullWidth><RefreshCw size={17} aria-hidden="true" /> {isSaving ? "Đang lưu dữ liệu cầu thủ" : "Lưu thẻ vào Hall of Fame"}</Button></footer>
  </main>;
}
