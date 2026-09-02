"use client";

import React, { useMemo } from "react";
import { X } from "lucide-react";
import type { AchievementRecord, SeasonAwardRecord, StatSnapshot } from "@/types/domain";
import type { ClientSafePlayer } from "@/types/squad";
import { Modal } from "@/components/ui/Modal";
import { PlayerOvrChart } from "./PlayerOvrChart";
import { PlayerStickerCard } from "./PlayerStickerCard";

interface PlayerCareerDialogProps {
  player: ClientSafePlayer | null;
  isOpen: boolean;
  onClose: () => void;
}

interface SeasonRow {
  age: number;
  clubName: string;
  leagueName: string;
  snap: StatSnapshot;
  awards: SeasonAwardRecord[];
  isDebut: boolean;
  isTransfer: boolean;
  isFinal: boolean;
}

interface HonourRow {
  label: string;
  count: number;
  accent?: boolean;
}

function getHonourRows(achievements?: AchievementRecord): HonourRow[] {
  if (!achievements) return [];
  const rows: HonourRow[] = [];
  if (achievements.ballonDor > 0) rows.push({ label: "Quả bóng vàng", count: achievements.ballonDor, accent: true });

  const grouped = new Map<string, HonourRow>();
  for (const trophy of achievements.trophies ?? []) {
    const label = trophy.type === "league" ? `Vô địch ${trophy.name}` : trophy.name;
    const key = `${trophy.type}:${label}`;
    const current = grouped.get(key);
    grouped.set(key, current ? { ...current, count: current.count + 1 } : { label, count: 1 });
  }
  rows.push(...grouped.values());
  return rows;
}

export function PlayerCareerDialog({ player, isOpen, onClose }: PlayerCareerDialogProps) {
  const statsTimeline = useMemo(() => player?.statsTimeline ?? [], [player?.statsTimeline]);
  const clubStints = useMemo(() => player?.clubStints ?? [], [player?.clubStints]);
  const debutAge = player?.debutAge ?? 18;
  const retireAge = player?.retireAge ?? 35;
  const careerLength = player?.careerLengthYears ?? Math.max(1, retireAge - debutAge);

  const summaryStats = useMemo(() => {
    let apps = 0;
    let goals = 0;
    let assists = 0;
    let ratingSum = 0;
    let ratingCount = 0;
    for (const snap of statsTimeline) {
      if (snap.age < debutAge || snap.age > retireAge) continue;
      apps += snap.apps ?? 0;
      goals += snap.goals ?? 0;
      assists += snap.assists ?? 0;
      if (snap.matchRating != null) {
        ratingSum += snap.matchRating;
        ratingCount += 1;
      }
    }
    return { apps, goals, assists, avgRating: ratingCount > 0 ? (ratingSum / ratingCount).toFixed(2) : "—" };
  }, [statsTimeline, debutAge, retireAge]);

  const minOvr = useMemo(() => {
    const played = statsTimeline.filter((snap) => snap.age >= debutAge && snap.age <= retireAge);
    return played.length > 0 ? Math.min(...played.map((snap) => snap.ovr)) : player?.peakOvr ?? 0;
  }, [statsTimeline, debutAge, retireAge, player?.peakOvr]);

  const finalClub = clubStints.at(-1)?.clubName ?? "Tự do";
  const honours = useMemo(() => getHonourRows(player?.achievements), [player?.achievements]);

  const seasonRows = useMemo<SeasonRow[]>(() => {
    const seasonAwards = player?.achievements?.seasonAwards ?? [];
    return statsTimeline
      .filter((snap) => snap.age >= debutAge && snap.age <= retireAge)
      .map((snap) => {
        const stint = clubStints.find((item) => snap.age >= item.startAge && snap.age <= item.endAge);
        const previousStint = clubStints.find((item) => snap.age - 1 >= item.startAge && snap.age - 1 <= item.endAge);
        return {
          age: snap.age,
          clubName: stint?.clubName ?? "—",
          leagueName: stint?.leagueName ?? "—",
          snap,
          awards: seasonAwards.filter((award) => award.age === snap.age),
          isDebut: snap.age === debutAge,
          isTransfer: Boolean(stint && previousStint && stint.clubId !== previousStint.clubId),
          isFinal: snap.age === retireAge,
        };
      })
      .sort((a, b) => a.age - b.age);
  }, [statsTimeline, clubStints, player?.achievements, debutAge, retireAge]);

  if (!isOpen || !player) return null;

  return (
    <Modal
      open={isOpen}
      title={`Hồ sơ sự nghiệp của ${player.name}`}
      onClose={onClose}
      className="rtg-career-modal"
      mobileSheet={false}
      style={{ width: "min(1056px, calc(100vw - 32px))", maxWidth: "1056px", height: "min(700px, calc(100dvh - 40px))", padding: 0, overflow: "hidden" }}
    >
      <div className="rtg-career-dialog">
        <aside className="rtg-career-dialog__sidebar">
          <PlayerStickerCard player={player} finalClub={finalClub} debutAge={debutAge} retireAge={retireAge} careerLength={careerLength} />

          <section className="rtg-career-dialog__section" aria-labelledby="career-total-title">
            <h3 id="career-total-title">Trọn đời sự nghiệp</h3>
            <div className="rtg-career-dialog__metric"><span>Ra sân</span><strong>{summaryStats.apps}</strong></div>
            <div className="rtg-career-dialog__metric"><span>Bàn thắng</span><strong>{summaryStats.goals}</strong></div>
            <div className="rtg-career-dialog__metric"><span>Kiến tạo</span><strong>{summaryStats.assists}</strong></div>
            <div className="rtg-career-dialog__metric"><span>Phong độ trung bình</span><strong className="is-positive">{summaryStats.avgRating}</strong></div>
          </section>

          <section className="rtg-career-dialog__section" aria-labelledby="honours-title">
            <h3 id="honours-title">Danh hiệu</h3>
            {honours.length === 0 ? <p className="rtg-career-dialog__empty">Chưa đạt danh hiệu nào</p> : honours.map((honour) => (
              <div className="rtg-career-dialog__metric" key={honour.label}>
                <span className={honour.accent ? "is-honour" : undefined}>{honour.label}</span>
                <strong className={honour.accent ? "is-honour" : undefined}>{honour.count}</strong>
              </div>
            ))}
          </section>
        </aside>

        <main className="rtg-career-dialog__main">
          <header className="rtg-career-dialog__heading">
            <div>
              <span className="rtg-career-dialog__eyebrow">Hồ sơ lưu trữ · vị trí {player.position} · đội hình {finalClub}</span>
              <h2>Tiến trình sự nghiệp</h2>
            </div>
            <button type="button" className="rtg-career-dialog__close" onClick={onClose} aria-label="Đóng hồ sơ sự nghiệp"><X size={18} strokeWidth={1.5} aria-hidden="true" /></button>
          </header>

          <section className="rtg-career-dialog__chart" aria-labelledby="ovr-chart-title">
            <div className="rtg-career-dialog__section-heading"><h3 id="ovr-chart-title">Đường phát triển OVR</h3><span>thấp nhất {minOvr} · đỉnh cao {player.peakOvr}</span></div>
            <PlayerOvrChart statsTimeline={statsTimeline} debutAge={debutAge} retireAge={retireAge} />
          </section>

          <section className="rtg-career-dialog__seasons" aria-labelledby="season-stats-title">
            <h3 id="season-stats-title">Thống kê từng mùa</h3>
            <div className="rtg-career-dialog__table-wrap">
              <table>
                <thead><tr><th>Tuổi</th><th>Câu lạc bộ</th><th>Giải</th><th>OVR</th><th>Trận</th><th>Bàn</th><th>K.tạo</th><th>Phong độ</th></tr></thead>
                <tbody>
                  {seasonRows.length === 0 ? <tr><td className="rtg-career-dialog__empty" colSpan={8}>Chưa có dữ liệu mùa giải.</td></tr> : seasonRows.map((row) => (
                    <React.Fragment key={row.age}>
                      <tr>
                        <td className={row.isDebut ? "is-debut" : undefined}>{row.age}</td>
                        <td>{row.clubName} <small>{row.isDebut ? "ra mắt" : row.isTransfer ? "chuyển nhượng" : row.isFinal ? "mùa cuối" : ""}</small></td>
                        <td>{row.leagueName}</td>
                        <td className={row.snap.ovr === player.peakOvr ? "is-peak" : undefined}>{row.snap.ovr}</td>
                        <td>{row.snap.apps ?? "—"}</td><td>{row.snap.goals ?? "—"}</td><td>{row.snap.assists ?? "—"}</td>
                        <td className={(row.snap.matchRating ?? 0) >= 7.8 ? "is-positive" : undefined}>{row.snap.matchRating != null ? row.snap.matchRating.toFixed(2) : "—"}</td>
                      </tr>
                      {row.awards.length > 0 && <tr className="rtg-career-dialog__award-row"><td colSpan={8}>{row.awards.map((award) => award.label).join(" · ")}</td></tr>}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </Modal>
  );
}
