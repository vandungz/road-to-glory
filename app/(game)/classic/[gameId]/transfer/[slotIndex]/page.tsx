import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { ClubStint, StatSnapshot } from "@/types/domain";
import { formatEuroThousands } from "@/lib/transfer-economy";
import { TransferPageClient } from "@/features/wheel/components/TransferPageClient";

interface Props {
  params: Promise<{ gameId: string; slotIndex: string }>;
  searchParams: Promise<{ return?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gameId, slotIndex } = await params;
  const player = await prisma.careerPlayer.findUnique({ where: { gameSessionId_slotIndex: { gameSessionId: gameId, slotIndex: Number(slotIndex) } }, select: { name: true } });
  return { title: player ? `Chuyển nhượng — ${player.name} | Football Life` : "Chuyển nhượng | Football Life" };
}

export default async function ClassicTransferPage({ params, searchParams }: Props) {
  const { gameId, slotIndex: slotParam } = await params;
  const { return: returnAction } = await searchParams;
  const slotIndex = Number(slotParam);
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 10) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const player = await prisma.careerPlayer.findUnique({
    where: { gameSessionId_slotIndex: { gameSessionId: gameId, slotIndex } },
    select: {
      id: true, name: true, position: true, nationality: true, debutAge: true, retireAge: true,
      statsTimeline: true, clubStints: true, currentWageAnnual: true, contractYearsTotal: true,
      contractYearsRemaining: true, marketValue: true, influenceScore: true, isUnemployed: true,
      isRetired: true, gameSession: { select: { userId: true } },
    },
  });
  if (!player || player.gameSession.userId !== user.id || player.isRetired) notFound();

  const normalizedReturnAction = returnAction === "advance" ? "advance" : "start";

  const timeline = (player.statsTimeline as unknown as StatSnapshot[]) ?? [];
  const currentSnapshot = timeline.at(-1);
  if (!currentSnapshot || typeof currentSnapshot.age !== "number") notFound();
  const stints = (player.clubStints as unknown as ClubStint[]) ?? [];
  const currentStint = stints.at(-1);
  const currentClub = currentStint?.clubId
    ? await prisma.club.findUnique({ where: { id: currentStint.clubId }, select: { id: true, name: true, leagueId: true, prestige: true, continentalType: true, league: { select: { name: true, tier: true } } } })
    : null;
  const currentStats = Object.fromEntries(Object.entries(currentSnapshot).filter(([key, value]) => key !== "age" && typeof value === "number")) as Record<string, number>;

  return (
    <AppShell className="rtg-transfer-shell" backHref={`/classic/${gameId}/draft/${slotIndex}`} backLabel="Sự nghiệp" headerMeta={(
      <div className="rtg-transfer-shell__header-meta"><span><small>Cầu thủ</small><strong>{player.name}</strong></span><span><small>Vị trí</small><strong>{player.position}</strong></span><span><small>Giá trị</small><strong>{formatEuroThousands(player.marketValue)}</strong></span></div>
    )}>
      <TransferPageClient input={{
        gameId, slotIndex, playerId: player.id, playerName: player.name, position: player.position,
        currentClubId: currentClub?.id ?? currentStint?.clubId ?? null,
        currentClubName: currentClub?.name ?? currentStint?.clubName ?? "Cầu thủ tự do",
        currentClubLeagueId: currentClub?.leagueId ?? currentStint?.leagueId ?? null,
        currentClubLeagueName: currentClub?.league.name ?? currentStint?.leagueName ?? "Không có giải đấu",
        currentClubPrestige: currentClub?.prestige ?? 2, currentClubLeagueTier: currentClub?.league.tier ?? 1,
        currentAge: currentSnapshot.age, retireAge: player.retireAge, currentOvr: currentSnapshot.ovr,
        currentStats, matchRating: currentSnapshot.matchRating ?? 6, goals: currentSnapshot.goals ?? 0,
        assists: currentSnapshot.assists ?? 0, cleanSheets: currentSnapshot.cleanSheets ?? 0,
        contractYearsRemaining: player.contractYearsRemaining, contractYearsTotal: player.contractYearsTotal,
        currentWageAnnual: player.currentWageAnnual, marketValue: player.marketValue,
        influenceScore: player.influenceScore, playerNation: player.nationality,
        shopHref: `/classic/${gameId}/shop/${slotIndex}?season=${normalizedReturnAction === "advance" ? currentSnapshot.age + 1 : currentSnapshot.age}&return=${normalizedReturnAction}`,
      }} />
    </AppShell>
  );
}
