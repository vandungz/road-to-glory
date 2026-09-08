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
    select: { runtimeState: true },
  });
  const result = season ? readResult(season.runtimeState) : null;
  if (!result) notFound();

  const isWinner = result.phase === "ranking" && result.rank === 1;
  const message = isWinner ? "Hạng #1 — Ballon d'Or!" : `Hạng #${result.rank} trong Top 10`;
  const tone = isWinner ? "honour" : "positive";

  return (
    <AppShell
      className="rtg-ballon-dor-page-shell"
      backHref={`/classic/${gameId}/draft/${slotIndex}`}
      backLabel="Sự nghiệp"
      headerMeta={(
        <div className="rtg-ballon-dor-page__header-meta">
          <span><small>Cầu thủ</small><strong>{player.name}</strong></span>
          <span><small>Vị trí</small><strong>{player.position}</strong></span>
          <span><small>Tuổi</small><strong>{player.currentAge}</strong></span>
        </div>
      )}
    >
      <section className="rtg-ballon-dor-page">
        <header className="rtg-ballon-dor-page__intro">
          <span className="rtg-eyebrow">Kết quả Ballon d&apos;Or</span>
          <h1>Quả Bóng Vàng</h1>
        </header>

        <article className={`rtg-ballon-dor-page__result${isWinner ? " is-winner" : ""}`}>
          <ResultBanner tone={tone} className="rtg-ballon-dor-page__banner">{message}</ResultBanner>
          <Link className="rtg-button rtg-button--primary rtg-button--lg" href={`/classic/${gameId}/draft/${slotIndex}`}>
            Tiếp tục hành trình <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </article>
      </section>
    </AppShell>
  );
}
