"use client";

import React, { useMemo } from "react";
import { X } from "lucide-react";
import type { AchievementRecord, SeasonAwardRecord } from "@/types/domain";
import type { ClientSafePlayer } from "@/types/squad";
import { Modal } from "@/components/ui/Modal";
import {
  aggregateCareerStats,
  buildCareerArchiveTimeline,
  normalizeClubStints,
  type CareerArchiveSnapshot,
} from "@/features/career/services/career-summary.service";
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
  snap: CareerArchiveSnapshot;
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

function getHonourRows(achievements?: AchievementRecord, seasonHistory?: unknown): HonourRow[] {
  const rows: HonourRow[] = [];
  if (achievements?.ballonDor && achievements.ballonDor > 0) {
    rows.push({ label: "Quả bóng vàng", count: achievements.ballonDor, accent: true });
  }

  const grouped = new Map<string, HonourRow>();
  const persistedLabels = new Set<string>();
  for (const trophy of achievements?.trophies ?? []) {
    const label = trophy.type === "league" ? `Vô địch ${trophy.name}` : trophy.name;
    const key = `${trophy.type}:${label}`;
    const current = grouped.get(key);
    persistedLabels.add(label);
    grouped.set(key, current ? { ...current, count: current.count + 1 } : { label, count: 1 });
  }

  const history = seasonHistory && typeof seasonHistory === "object" && !Array.isArray(seasonHistory)
    ? seasonHistory as Record<string, unknown>
    : {};
  const addDerived = (label: string) => {
    if (persistedLabels.has(label)) return;
    const key = `history:${label}`;
    const current = grouped.get(key);
    grouped.set(key, current ? { ...current, count: current.count + 1 } : { label, count: 1 });
  };
  for (const value of Object.values(history)) {
    const record = value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
    if (record.standing === 1 && typeof record.leagueName === "string") addDerived(`Vô địch ${record.leagueName}`);
    if (record.domesticCup === "Winner") addDerived("Vô địch Cúp quốc gia");
    const continental = record.continentalCup && typeof record.continentalCup === "object"
      ? record.continentalCup as Record<string, unknown>
      : {};
    if (continental.result === "Winner") {
      const names: Record<string, string> = { UCL: "Champions League", UEL: "Europa League", UECL: "Conference League" };
      addDerived(`Vô địch ${names[typeof continental.type === "string" ? continental.type : ""] ?? "cúp châu lục"}`);
    }
    const national = record.nationalTeam && typeof record.nationalTeam === "object"
      ? record.nationalTeam as Record<string, unknown>
      : {};
    if (national.result === "Winner") {
      addDerived(`Vô địch ${typeof national.type === "string" ? national.type : "đội tuyển quốc gia"}`);
    }
  }
  rows.push(...grouped.values());
  return rows;
}

export function PlayerCareerDialog({ player, isOpen, onClose }: PlayerCareerDialogProps) {
  const debutAge = player?.debutAge ?? 18;
  const retireAge = player?.retireAge ?? 35;
  const statsTimeline = useMemo(() => buildCareerArchiveTimeline({
    seasonHistory: player?.seasonHistory,
    statsTimeline: player?.statsTimeline ?? [],
    debutAge,
    retireAge,
    legacyOvrByAge: player?.archiveOvrByAge,
  }), [player?.seasonHistory, player?.statsTimeline, player?.archiveOvrByAge, debutAge, retireAge]);
  const clubStints = useMemo(
    () => normalizeClubStints(player?.clubStints ?? [], player?.seasonHistory),
    [player?.clubStints, player?.seasonHistory],
  );
  const careerLength = statsTimeline.length || player?.careerLengthYears || Math.max(1, retireAge - debutAge + 1);

  const summaryStats = useMemo(() => {
    let ratingSum = 0;
    let ratingCount = 0;
    for (const snap of statsTimeline) {
      if (snap.age < debutAge || snap.age > retireAge) continue;
      if (snap.matchRating != null) {
        ratingSum += snap.matchRating;
        ratingCount += 1;
      }
    }
    const totals = aggregateCareerStats({ seasonHistory: player?.seasonHistory, statsTimeline });
    return { ...totals, avgRating: ratingCount > 0 ? (ratingSum / ratingCount).toFixed(2) : "—" };
  }, [player?.seasonHistory, statsTimeline, debutAge, retireAge]);

  const minOvr = useMemo(() => {
    const knownOvr = statsTimeline
      .filter((snap) => snap.age >= debutAge && snap.age <= retireAge)
      .map((snap) => snap.ovr)
      .filter((ovr): ovr is number => typeof ovr === "number");
    return knownOvr.length > 0 ? Math.min(...knownOvr) : player?.peakOvr ?? 0;
  }, [statsTimeline, debutAge, retireAge, player?.peakOvr]);

  const finalClub = clubStints.at(-1)?.clubName ?? "Tự do";
  const honours = useMemo(
    () => getHonourRows(player?.achievements, player?.seasonHistory),
    [player?.achievements, player?.seasonHistory],
  );

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
                        <td className={row.snap.ovr === player.peakOvr ? "is-peak" : undefined}>{row.snap.ovr ?? "—"}</td>
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
