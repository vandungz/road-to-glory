import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { ResultBanner } from "@/components/ui/ResultBanner";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ gameId: string; slotIndex: string }>;
}

type BallonResult = { phase: "ranking"; rank: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readResult(runtimeState: unknown): BallonResult | null {
  if (!isRecord(runtimeState) || !isRecord(runtimeState.lastWheel)) return null;
  const { stepKey, result } = runtimeState.lastWheel;
  if (stepKey === "ballon_dor_ranking" && typeof result === "number" && result >= 1 && result <= 10) {
    return { phase: "ranking", rank: result };
  }
  return null;
}

function readSnapshotResult(value: unknown): BallonResult | null {
  if (!isRecord(value) || !isRecord(value.resolution)) return null;
  const rank = value.resolution.selectedRank;
  return typeof rank === "number" && rank >= 1 && rank <= 10 ? { phase: "ranking", rank } : null;
}

function snapshotEntries(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.slice(0, 10).filter(isRecord) : [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gameId, slotIndex } = await params;
  const player = await prisma.careerPlayer.findUnique({
    where: { gameSessionId_slotIndex: { gameSessionId: gameId, slotIndex: Number(slotIndex) } },
    select: { name: true },
  });
  return { title: player ? `Quả Bóng Vàng — ${player.name} | Football Life` : "Quả Bóng Vàng | Football Life" };
}

export default async function BallonDorResultPage({ params }: Props) {
  const { gameId, slotIndex: slotParam } = await params;
  const slotIndex = Number(slotParam);
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 10) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const player = await prisma.careerPlayer.findUnique({
    where: { gameSessionId_slotIndex: { gameSessionId: gameId, slotIndex } },
    select: {
      id: true,
      name: true,
      position: true,
      currentAge: true,
      isRetired: true,
      gameSession: { select: { userId: true } },
    },
  });
  if (!player || player.gameSession.userId !== user.id || player.isRetired || player.currentAge === null) notFound();

  const season = await prisma.careerSeason.findFirst({
    where: { careerPlayerId: player.id, age: player.currentAge, status: "in_progress" },
    select: { id: true, runtimeState: true },
  });
  const snapshot = season
    ? await prisma.careerAwardRankingSnapshot.findFirst({
        where: { careerPlayerId: player.id, seasonId: season.id, awardKey: "ballon_dor" },
        select: { entries: true, resolution: true, status: true },
      })
    : null;
  const result = (snapshot ? readSnapshotResult(snapshot) : null) ?? (season ? readResult(season.runtimeState) : null);
  if (!result) notFound();

  const isWinner = result.phase === "ranking" && result.rank === 1;
  const message = isWinner ? "Hạng #1 — Ballon d'Or!" : `Hạng #${result.rank} trong Top 10`;
  const tone = isWinner ? "honour" : "positive";

  return (
    <AppShell
      className="football-ballon-dor-page-shell"
      backHref={`/classic/${gameId}/draft/${slotIndex}`}
      backLabel="Sự nghiệp"
      headerMeta={(
        <div className="football-ballon-dor-page__header-meta">
          <span><small>Cầu thủ</small><strong>{player.name}</strong></span>
          <span><small>Vị trí</small><strong>{player.position}</strong></span>
          <span><small>Tuổi</small><strong>{player.currentAge}</strong></span>
        </div>
      )}
    >
      <section className="football-ballon-dor-page">
        <header className="football-ballon-dor-page__intro">
          <span className="football-eyebrow">Kết quả Ballon d&apos;Or</span>
          <h1>Quả Bóng Vàng</h1>
        </header>

        <article className={`football-ballon-dor-page__result${isWinner ? " is-winner" : ""}`}>
          <ResultBanner tone={tone} className="football-ballon-dor-page__banner">{message}</ResultBanner>
          {snapshot && snapshotEntries(snapshot.entries).length > 0 && (
            <section className="football-ballon-dor-page__ranking" aria-labelledby="ballon-ranking-title">
              <h2 id="ballon-ranking-title">Danh sách ứng viên</h2>
              <ol>
                {snapshotEntries(snapshot.entries).map((entry) => (
                  <li key={`${String(entry.candidateKey)}-${String(entry.rank)}`} className={entry.isCareerPlayer === true ? "is-player" : undefined}>
                    <strong>{String(entry.rank ?? "—")}</strong>
                    <span><b>{String(entry.name ?? "Ứng viên")}</b><small>{String(entry.clubName ?? "—")} · {String(entry.position ?? "—")}</small></span>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <Link className="football-button football-button--primary football-button--lg" href={`/classic/${gameId}/draft/${slotIndex}`}>
            Tiếp tục hành trình <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </article>
      </section>
    </AppShell>
  );
}
